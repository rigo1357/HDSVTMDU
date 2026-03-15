// @ts-nocheck
import bcrypt from "bcrypt";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import Session from "../models/Session.js";
import { sendVerificationEmail, sendPasswordResetEmail } from "../services/emailService.js";
import SystemLog from "../models/SystemLog.js";

const ACCESS_TOKEN_TTL = "30d"; // ~1 tháng để phù hợp yêu cầu mới
const REFRESH_TOKEN_TTL = 14 * 24 * 60 * 60 * 1000; // 14 ngày
const EMAIL_VERIFICATION_TTL = 15 * 60 * 1000; // 15 phút
const UNVERIFIED_ACCOUNT_TTL = 24 * 60 * 60 * 1000; // 24h
const PASSWORD_RESET_TTL = 15 * 60 * 1000; // 15 phút

const generateRandomToken = () => crypto.randomBytes(32).toString("hex");
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

export const signUp = async (req, res) => {
  try {
    const { username, password, email, firstName, lastName } = req.body;

    if (!username || !password || !email || !firstName || !lastName) {
      return res.status(400).json({
        message: "Không thể thiếu username, password, email, firstName, và lastName",
      });
    }

    // kiểm tra username tồn tại chưa
    const duplicate = await User.findOne({ username });

    if (duplicate) {
      return res.status(409).json({ message: "username đã tồn tại" });
    }

    const duplicateEmail = await User.findOne({ email });
    if (duplicateEmail) {
      return res.status(409).json({ message: "Email đã tồn tại" });
    }

    // mã hoá password
    const hashedPassword = await bcrypt.hash(password, 10); // salt = 10

    const verificationToken = generateRandomToken();
    const verificationTokenHash = hashToken(verificationToken);
    const verificationExpires = new Date(Date.now() + EMAIL_VERIFICATION_TTL);
    const cleanupExpires = new Date(Date.now() + UNVERIFIED_ACCOUNT_TTL);

    // tạo user mới với role mặc định là guest
    const user = await User.create({
      username,
      hashedPassword,
      email,
      displayName: `${firstName} ${lastName}`.trim(),
      role: "guest", // Mặc định là guest cho tài khoản đăng ký bên ngoài
      emailVerified: false,
      isActive: false,
      emailVerifyToken: verificationTokenHash,
      emailVerifyTokenExpiresAt: verificationExpires,
      unverifiedExpiresAt: cleanupExpires,
    });

    try {
      await sendVerificationEmail(user, verificationToken);
    } catch (error) {
      console.error("Không thể gửi email xác thực:", error);
    }

    // return
    return res.status(201).json({ message: "Đăng ký thành công. Vui lòng kiểm tra email để xác thực tài khoản." });
  } catch (error) {
    console.error("Lỗi khi gọi signUp", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const signIn = async (req, res) => {
  try {
    // lấy inputs
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "Thiếu username hoặc password." });
    }

    // lấy hashedPassword trong db để so với password input
    const user = await User.findOne({ username });

    if (!user) {
      return res
        .status(401)
        .json({ message: "username hoặc password không chính xác" });
    }

    // kiểm tra password
    const passwordCorrect = await bcrypt.compare(password, user.hashedPassword);

    if (!passwordCorrect) {
      return res
        .status(401)
        .json({ message: "username hoặc password không chính xác" });
    }

    if (user.emailVerified === false) {
      return res.status(403).json({ message: "Email chưa được xác thực. Vui lòng kiểm tra hộp thư." });
    }

    if (user.isActive === false) {
      return res.status(403).json({ message: "Tài khoản chưa được kích hoạt." });
    }

    const tokenPayload = {
      id: user._id.toString(),
      role: user.role,
    };

    // nếu khớp, tạo accessToken với JWT
    const accessToken = jwt.sign(
      tokenPayload,
      // @ts-ignore
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL }
    );

    // tạo refresh token
    const refreshToken = crypto.randomBytes(64).toString("hex");

    // tạo session mới để lưu refresh token
    await Session.create({
      userId: user._id,
      refreshToken,
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL),
    });

    // trả refresh token về trong cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none", //backend, frontend deploy riêng
      maxAge: REFRESH_TOKEN_TTL,
    });

    // ghi log đăng nhập thành công
    await SystemLog.create({
      user: user._id,
      action: "LOGIN_SUCCESS",
      target: "auth/signin",
      metadata: { username: user.username },
      ipAddress: req.ip,
    });

    // trả access token về trong res
    return res.status(200).json({
      message: `User ${user.displayName} đã logged in!`,
      accessToken,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Lỗi khi gọi signIn", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const signOut = async (req, res) => {
  try {
    // lấy refresh token từ cookie
    const token = req.cookies?.refreshToken;

    if (token) {
      // xoá refresh token trong Session
      await Session.deleteOne({ refreshToken: token });

      // xoá cookie
      res.clearCookie("refreshToken");
    }

    return res.sendStatus(204);
  } catch (error) {
    console.error("Lỗi khi gọi signOut", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

// tạo access token mới từ refresh token
export const refreshToken = async (req, res) => {
  try {
    // lấy refresh token từ cookie
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ message: "Token không tồn tại." });
    }

    // so với refresh token trong db
    const session = await Session.findOne({ refreshToken: token });

    if (!session) {
      return res.status(403).json({ message: "Token không hợp lệ hoặc đã hết hạn" });
    }

    // kiểm tra hết hạn chưa
    if (session.expiresAt < new Date()) {
      return res.status(403).json({ message: "Token đã hết hạn." });
    }

    const user = await User.findById(session.userId);

    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    const tokenPayload = {
      id: user._id.toString(),
      role: user.role,
    };

    // tạo access token mới
    const accessToken = jwt.sign(
      tokenPayload,
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: ACCESS_TOKEN_TTL }
    );

    // return
    return res.status(200).json({
      accessToken,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Lỗi khi gọi refreshToken", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Vui lòng cung cấp mật khẩu hiện tại và mật khẩu mới" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Người dùng không tồn tại" });
    }

    // Verify current password
    const passwordCorrect = await bcrypt.compare(currentPassword, user.hashedPassword);
    if (!passwordCorrect) {
      return res.status(401).json({ message: "Mật khẩu hiện tại không chính xác" });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.hashedPassword = hashedPassword;
    await user.save();

    return res.json({ message: "Đổi mật khẩu thành công" });
  } catch (error) {
    console.error("Lỗi khi đổi mật khẩu", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ message: "Liên kết không hợp lệ" });
    }

    const hashedToken = hashToken(token);
    const user = await User.findOne({
      emailVerifyToken: hashedToken,
      emailVerifyTokenExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: "Liên kết không hợp lệ hoặc đã hết hạn" });
    }

    user.emailVerified = true;
    user.isActive = true;
    user.emailVerifyToken = undefined;
    user.emailVerifyTokenExpiresAt = undefined;
    user.unverifiedExpiresAt = undefined;
    await user.save();

    return res.json({ message: "Xác thực email thành công. Bạn có thể đăng nhập ngay bây giờ." });
  } catch (error) {
    console.error("Lỗi khi xác thực email", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const requestPasswordReset = async (req, res) => {
  try {
    const { identifier } = req.body; // email hoặc username
    if (!identifier) {
      return res.status(400).json({ message: "Vui lòng cung cấp email hoặc username" });
    }

    const query = identifier.includes("@") ? { email: identifier } : { username: identifier };
    const user = await User.findOne(query);

    if (!user) {
      return res.status(404).json({ message: "Không tìm thấy tài khoản" });
    }

    if (!user.emailVerified) {
      return res.status(400).json({ message: "Email chưa được xác thực. Không thể đặt lại mật khẩu." });
    }

    const resetToken = generateRandomToken();
    const resetTokenHash = hashToken(resetToken);

    user.passwordResetToken = resetTokenHash;
    user.passwordResetTokenExpiresAt = new Date(Date.now() + PASSWORD_RESET_TTL);
    await user.save();

    try {
      await sendPasswordResetEmail(user, resetToken);
    } catch (error) {
      console.error("Không thể gửi email reset password:", error);
    }

    return res.json({ message: "Đã gửi hướng dẫn đặt lại mật khẩu. Vui lòng kiểm tra email." });
  } catch (error) {
    console.error("Lỗi khi yêu cầu đặt lại mật khẩu", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: "Thiếu token hoặc mật khẩu mới" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Mật khẩu mới phải có ít nhất 6 ký tự" });
    }

    const hashedToken = hashToken(token);
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetTokenExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ message: "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.hashedPassword = hashedPassword;
    user.passwordResetToken = undefined;
    user.passwordResetTokenExpiresAt = undefined;
    await user.save();

    return res.json({ message: "Đặt lại mật khẩu thành công" });
  } catch (error) {
    console.error("Lỗi khi đặt lại mật khẩu", error);
    return res.status(500).json({ message: "Lỗi hệ thống" });
  }
};