import nodemailer from "nodemailer";

const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_SECURE,
  EMAIL_FROM,
  APP_URL,
} = process.env;

let transporter = null;

if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === "true",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
} else {
  console.warn("[emailService] SMTP credentials are not fully configured. Emails will not be sent.");
}

const getAppUrl = () => {
  const base = APP_URL || "http://localhost:5173";
  return base.endsWith("/") ? base.slice(0, -1) : base;
};

export const sendEmail = async ({ to, subject, html }) => {
  if (!transporter) {
    console.warn("[emailService] Attempted to send email without transporter. To:", to);
    return;
  }

  await transporter.sendMail({
    from: EMAIL_FROM || SMTP_USER,
    to,
    subject,
    html,
  });
};

export const sendVerificationEmail = async (user, token) => {
  const verifyUrl = `${getAppUrl()}/auth/verify-email?token=${token}`;
  const html = `
    <p>Xin chào ${user.displayName || user.username},</p>
    <p>Vui lòng xác nhận email của bạn bằng cách nhấn vào liên kết bên dưới (hết hạn trong 15 phút):</p>
    <p><a href="${verifyUrl}" target="_blank">Xác nhận email</a></p>
    <p>Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.</p>
  `;

  await sendEmail({
    to: user.email,
    subject: "[STU Leader] Xác nhận email của bạn",
    html,
  });
};

export const sendPasswordResetEmail = async (user, token) => {
  const resetUrl = `${getAppUrl()}/auth/reset-password?token=${token}`;
  const html = `
    <p>Xin chào ${user.displayName || user.username},</p>
    <p>Bạn đã yêu cầu đặt lại mật khẩu. Nhấn vào liên kết dưới đây để tiếp tục (hết hạn trong 15 phút):</p>
    <p><a href="${resetUrl}" target="_blank">Đặt lại mật khẩu</a></p>
    <p>Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
  `;

  await sendEmail({
    to: user.email,
    subject: "[STU Leader] Đặt lại mật khẩu",
    html,
  });
};

