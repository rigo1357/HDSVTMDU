import bcrypt from "bcrypt";
import User from "../models/User.js";
import Activity, { ACTIVITY_STATUSES } from "../models/Activity.js";
import Notification from "../models/Notification.js";
import Document from "../models/Document.js";
import AdvancedFeature from "../models/AdvancedFeature.js";
import SystemWidget from "../models/SystemWidget.js";
import Report from "../models/Report.js";
import ActivityRegistration from "../models/ActivityRegistration.js";
import { sendEmail } from "../services/emailService.js";
import SystemLog from "../models/SystemLog.js";

const formatSearchRegex = (value) => new RegExp(value, "i");
const ACTIVE_STATUSES = ["Approved", "ApprovedWithCondition", "Open"];
const REVIEW_STATUSES = ["Pending", "NeedEdit"];
const COMPLETED_STATUSES = ["Completed"];
const STATUS_FILTER_MAP = {
  draft: ["Draft"],
  pending: ["Pending"],
  approved: ["Approved"],
  approvedwithcondition: ["ApprovedWithCondition"],
  neededit: ["NeedEdit"],
  rejected: ["Rejected"],
  active: ACTIVE_STATUSES,
  open: ["Open"],
  completed: COMPLETED_STATUSES,
  cancelled: ["Cancelled"],
};

const resolveStatusFilter = (value) => {
  if (!value || value === "all") return null;
  const normalized = value.toLowerCase();
  if (STATUS_FILTER_MAP[normalized]) {
    return STATUS_FILTER_MAP[normalized];
  }
  if (ACTIVITY_STATUSES.includes(value)) {
    return [value];
  }
  return null;
};

const sanitizeStatusInput = (status) => {
  if (!status) return undefined;
  if (ACTIVITY_STATUSES.includes(status)) return status;
  return undefined;
};

const notifyManagerOfReview = async (activity, { title, message }) => {
  const manager = await User.findById(activity.createdBy).select("email displayName");
  if (!manager) return;

  await Notification.create({
    title,
    message,
    targetRoles: ["manager"],
    relatedActivity: activity._id,
    createdBy: activity.lastReviewedBy || activity.createdBy,
    metadata: {
      managerId: activity.createdBy.toString(),
      activityId: activity._id.toString(),
    },
  });

  if (manager.email) {
    await sendEmail({
      to: manager.email,
      subject: `[STU Leader] ${title}`,
      html: `<p>Xin chào ${manager.displayName || "Quản lý"},</p>
        <p>${message}</p>
        <p>Hoạt động: <strong>${activity.title}</strong></p>`,
    });
  }
};

export const getDashboardOverview = async (_req, res) => {
  const [students, managers, activeActivities, documents] = await Promise.all([
    User.countDocuments({ role: "student" }),
    User.countDocuments({ role: { $in: ["manager", "admin"] } }),
    Activity.countDocuments({ status: { $in: ACTIVE_STATUSES } }),
    Document.countDocuments(),
  ]);

  return res.json({
    totals: {
      students,
      managers,
      activeActivities,
      documents,
    },
    trends: {
      months: [
        { label: "T1", activities: 6, interactions: 48, submissions: 32 },
        { label: "T2", activities: 9, interactions: 64, submissions: 41 },
        { label: "T3", activities: 12, interactions: 78, submissions: 55 },
        { label: "T4", activities: 10, interactions: 72, submissions: 60 },
        { label: "T5", activities: 15, interactions: 90, submissions: 74 },
        { label: "T6", activities: 18, interactions: 110, submissions: 88 },
      ],
      logs: [
        { message: "12 sinh viên nộp báo cáo mới", timestamp: "1h trước" },
        { message: "Hoạt động Robotics được phê duyệt", timestamp: "2h trước" },
        { message: "Admin cập nhật 4 tài liệu", timestamp: "3h trước" },
        { message: "Quản lý Khoa CNTT gửi thông báo", timestamp: "4h trước" },
      ],
    },
  });
};

// Users
export const listUsers = async (req, res) => {
  const { search, role, status } = req.query;
  const filter = {};
  if (search) {
    filter.$or = [
      { displayName: formatSearchRegex(search) },
      { email: formatSearchRegex(search) },
      { username: formatSearchRegex(search) },
    ];
  }
  if (role) filter.role = role;
  if (status) filter.status = status;

  const users = await User.find(filter).select("-hashedPassword");
  res.json({ users });
};

export const createUser = async (req, res) => {
  const { 
    username, 
    email, 
    password, 
    displayName, 
    role = "student", 
    status = "active",
    studentCode,
    phoneNumber,
    department,
    class: userClass,
    dateOfBirth,
    address
  } = req.body;

  if (!username || !email || !password || !displayName) {
    return res.status(400).json({ message: "Thiếu thông tin tạo người dùng" });
  }

  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: "Email không đúng định dạng" });
  }

  // Check if username or email already exists
  const existingUser = await User.findOne({ 
    $or: [{ username }, { email }] 
  });
  if (existingUser) {
    return res.status(409).json({ message: "Username hoặc email đã tồn tại" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({ 
    username, 
    email, 
    hashedPassword, 
    displayName, 
    role, 
    status,
    emailVerified: true,
    isActive: true,
    studentCode,
    phoneNumber,
    department,
    class: userClass,
    dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
    address
  });
  
  // Remove password from response
  const userResponse = user.toObject();
  delete userResponse.hashedPassword;
  // Ghi log cho admin tạo tài khoản
  try {
    await SystemLog.create({
      user: req.user?._id,
      action: "ADMIN_CREATE_USER",
      target: "admin/users",
      metadata: { createdUserId: String(user._id), username },
      ipAddress: req.ip,
    });
  } catch (_) {
    // tránh làm hỏng flow nếu log lỗi
  }
  
  res.status(201).json(userResponse);
};

export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { displayName, email, role, status, password } = req.body;
  const user = await User.findById(id);

  if (!user) return res.status(404).json({ message: "User không tồn tại" });

  if (displayName) user.displayName = displayName;
  if (email) user.email = email;
  if (role) user.role = role;
  if (status) {
    user.status = status;
    // Khi admin đặt trạng thái active, coi như kích hoạt và xác thực tài khoản
    if (status === "active") {
      user.isActive = true;
      user.emailVerified = true;
    }
    if (status === "locked") {
      user.isActive = false;
    }
  }
  if (password) user.hashedPassword = await bcrypt.hash(password, 10);

  await user.save();
  res.json(user);
};

export const listSecurityLogs = async (req, res) => {
  const { limit = 100 } = req.query;
  const parsedLimit = Math.max(1, Math.min(Number(limit) || 100, 500));

  const logs = await SystemLog.find()
    .populate("user", "displayName email role")
    .sort({ createdAt: -1 })
    .limit(parsedLimit);

  res.json({ logs });
};

export const deleteUser = async (req, res) => {
  const { id } = req.params;
  await User.findByIdAndDelete(id);
  res.sendStatus(204);
};

// Activities
export const listActivities = async (req, res) => {
  const { search, status, type } = req.query;
  const filter = {};
  if (search) filter.title = formatSearchRegex(search);
  const statusFilter = resolveStatusFilter(status);
  if (statusFilter) {
    filter.status = statusFilter.length === 1 ? statusFilter[0] : { $in: statusFilter };
  }
  if (type) filter.type = type;

  const activities = await Activity.find(filter)
    .populate("createdBy", "displayName email role")
    .sort({ startTime: -1 });
  res.json({ activities });
};

export const createActivity = async (req, res) => {
  const status = sanitizeStatusInput(req.body.status) || "Approved";
  const payload = {
    title: req.body.title,
    description: req.body.description,
    location: req.body.location,
    type: req.body.type || "general",
    status,
    isDraft: status === "Draft",
    startTime: req.body.startTime ? new Date(req.body.startTime) : undefined,
    endTime: req.body.endTime ? new Date(req.body.endTime) : undefined,
    maxParticipants: req.body.maxParticipants ? Number(req.body.maxParticipants) : 0,
    coverImage: req.body.coverImage,
    meta: req.body.meta,
    createdBy: req.user?._id || req.body.createdBy,
  };

  const activity = await Activity.create(payload);
  res.status(201).json(activity);
};

export const updateActivity = async (req, res) => {
  const { id } = req.params;
  const updates = {};
  const fields = ["title", "description", "location", "type", "coverImage"];
  fields.forEach((field) => {
    if (req.body[field] !== undefined) {
      updates[field] = req.body[field];
    }
  });

  if (req.body.status !== undefined) {
    const sanitized = sanitizeStatusInput(req.body.status);
    if (sanitized) {
      updates.status = sanitized;
      updates.isDraft = sanitized === "Draft";
    }
  }

  if (req.body.startTime !== undefined) {
    updates.startTime = req.body.startTime ? new Date(req.body.startTime) : undefined;
  }
  if (req.body.endTime !== undefined) {
    updates.endTime = req.body.endTime ? new Date(req.body.endTime) : undefined;
  }
  if (req.body.maxParticipants !== undefined) {
    updates.maxParticipants = Number(req.body.maxParticipants) || 0;
  }
  if (req.body.meta !== undefined) {
    updates.meta = req.body.meta;
  }

  const activity = await Activity.findByIdAndUpdate(id, updates, { new: true });
  if (!activity) return res.status(404).json({ message: "Hoạt động không tồn tại" });
  res.json(activity);
};

export const deleteActivity = async (req, res) => {
  const { id } = req.params;
  await Activity.findByIdAndDelete(id);
  res.sendStatus(204);
};

export const approveActivity = async (req, res) => {
  const { id } = req.params;
  const note = req.body.note || req.body.message;
  const activity = await Activity.findById(id);
  if (!activity) return res.status(404).json({ message: "Hoạt động không tồn tại" });

  activity.status = "Approved";
  activity.isDraft = false;
  activity.lastReviewedBy = req.user?._id;
  activity.approvalNotes = note;
  activity.conditionNote = undefined;
  activity.editRequestNote = undefined;
  await activity.save();

  await notifyManagerOfReview(activity, {
    title: "Hoạt động đã được phê duyệt",
    message: note ? `Hoạt động đã được phê duyệt. Ghi chú: ${note}` : "Hoạt động đã được phê duyệt.",
  });

  res.json({ message: "Đã phê duyệt hoạt động", activity });
};

export const approveActivityWithCondition = async (req, res) => {
  const { id } = req.params;
  const condition = req.body.condition || req.body.note;
  if (!condition) {
    return res.status(400).json({ message: "Vui lòng nhập điều kiện phê duyệt" });
  }
  const activity = await Activity.findById(id);
  if (!activity) return res.status(404).json({ message: "Hoạt động không tồn tại" });

  activity.status = "ApprovedWithCondition";
  activity.isDraft = false;
  activity.lastReviewedBy = req.user?._id;
  activity.conditionNote = condition;
  activity.approvalNotes = undefined;
  activity.editRequestNote = undefined;
  await activity.save();

  await notifyManagerOfReview(activity, {
    title: "Hoạt động được phê duyệt có điều kiện",
    message: `Hoạt động được phê duyệt với điều kiện: ${condition}`,
  });

  res.json({ message: "Đã phê duyệt hoạt động kèm điều kiện", activity });
};

export const requestActivityEdit = async (req, res) => {
  const { id } = req.params;
  const feedback = req.body.feedback || req.body.note || req.body.message;
  if (!feedback) {
    return res.status(400).json({ message: "Vui lòng nhập nội dung yêu cầu chỉnh sửa" });
  }
  const activity = await Activity.findById(id);
  if (!activity) return res.status(404).json({ message: "Hoạt động không tồn tại" });

  activity.status = "NeedEdit";
  activity.isDraft = false;
  activity.lastReviewedBy = req.user?._id;
  activity.editRequestNote = feedback;
  await activity.save();

  await notifyManagerOfReview(activity, {
    title: "Hoạt động cần chỉnh sửa",
    message: `Hoạt động cần chỉnh sửa với phản hồi: ${feedback}`,
  });

  res.json({ message: "Đã yêu cầu chỉnh sửa", activity });
};

export const rejectActivity = async (req, res) => {
  const { id } = req.params;
  const reason = req.body.reason || req.body.note || req.body.message;
  if (!reason) {
    return res.status(400).json({ message: "Vui lòng nhập lý do từ chối" });
  }
  const activity = await Activity.findById(id);
  if (!activity) return res.status(404).json({ message: "Hoạt động không tồn tại" });

  activity.status = "Rejected";
  activity.isDraft = false;
  activity.lastReviewedBy = req.user?._id;
  activity.approvalNotes = reason;
  activity.conditionNote = undefined;
  activity.editRequestNote = undefined;
  await activity.save();

  await notifyManagerOfReview(activity, {
    title: "Hoạt động bị từ chối",
    message: `Hoạt động đã bị từ chối. Lý do: ${reason}`,
  });

  res.json({ message: "Đã từ chối hoạt động", activity });
};

// Students
const fetchStudents = async (query) => {
  const { search, faculty } = query;
  const filter = { role: "student" };
  if (search) {
    filter.$or = [
      { displayName: formatSearchRegex(search) },
      { email: formatSearchRegex(search) },
    ];
  }
  if (faculty) {
    filter.faculty = faculty;
  }

  const students = await User.find(filter).select("displayName email department createdAt studentCode");
  return students.map((student) => ({
    studentId: student.studentCode || student._id.toString(),
    fullName: student.displayName,
    faculty: student.department || "Chưa cập nhật",
    activityStatus: "Đang cập nhật",
    progressPercent: 70,
  }));
};

export const listStudents = async (req, res) => {
  const students = await fetchStudents(req.query);
  res.json({ students });
};

export const exportStudents = async (req, res) => {
  const students = await fetchStudents(req.query);
  const csv = ["studentId,fullName,faculty"]
    .concat(students.map((s) => `${s.studentId},${s.fullName},${s.faculty}`))
    .join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=students.csv");
  res.send(csv);
};

// Notifications
export const listNotifications = async (_req, res) => {
  const notifications = await Notification.find()
    .sort({ createdAt: -1 })
    .populate("createdBy", "displayName role");
  res.json({ notifications });
};

export const createNotification = async (req, res) => {
  const payload = {
    title: req.body.title,
    message: req.body.message || req.body.content,
    targetRoles: req.body.targetRoles || (req.body.targetGroup ? [req.body.targetGroup] : ["student"]),
    scheduleAt: req.body.scheduleAt || req.body.schedule || new Date(),
    status: req.body.status ?? "draft",
    createdBy: req.user?._id || req.body.createdBy,
    relatedActivity: req.body.activityId,
    metadata: req.body.metadata,
  };

  if (!payload.message) {
    return res.status(400).json({ message: "Nội dung thông báo không được bỏ trống" });
  }

  const notification = await Notification.create(payload);
  res.status(201).json(notification);
};

export const updateNotification = async (req, res) => {
  const { id } = req.params;
  const updates = {
    title: req.body.title,
    message: req.body.message || req.body.content,
    targetRoles: req.body.targetRoles || (req.body.targetGroup ? [req.body.targetGroup] : undefined),
    scheduleAt: req.body.scheduleAt || req.body.schedule,
    status: req.body.status,
    relatedActivity: req.body.activityId,
    metadata: req.body.metadata,
  };

  const notification = await Notification.findByIdAndUpdate(id, updates, { new: true });
  if (!notification) return res.status(404).json({ message: "Thông báo không tồn tại" });
  res.json(notification);
};

export const scheduleNotification = async (req, res) => {
  const { id } = req.params;
  const { scheduleAt } = req.body;
  const notification = await Notification.findByIdAndUpdate(
    id,
    { scheduleAt: scheduleAt || new Date(), status: "scheduled" },
    { new: true }
  );
  if (!notification) return res.status(404).json({ message: "Thông báo không tồn tại" });
  res.json(notification);
};

export const deleteNotification = async (req, res) => {
  const { id } = req.params;
  await Notification.findByIdAndDelete(id);
  res.sendStatus(204);
};

// Documents
export const listDocuments = async (_req, res) => {
  const documents = await Document.find()
    .populate("uploadedBy", "displayName email role")
    .populate("activity", "title startTime");
  res.json({ documents });
};

export const createDocument = async (req, res) => {
  // Nếu có file upload, sử dụng file đã upload
  let fileUrl = req.body.fileUrl;
  let mimeType = req.body.mimeType;

  if (req.file) {
    // File đã được upload qua multer
    const { getFileUrl } = await import("../utils/uploadMiddleware.js");
    fileUrl = getFileUrl(req.file.filename);
    mimeType = req.file.mimetype;
  }

  const payload = {
    title: req.body.title,
    fileUrl: fileUrl,
    activity: req.body.activity || undefined,
    mimeType: mimeType,
    accessScope: req.body.accessScope || "admin",
    description: req.body.description,
    uploadedBy: req.user?._id || req.body.uploadedBy,
    updatedBy: req.user?._id || req.body.uploadedBy,
  };

  if (!payload.title || !payload.fileUrl) {
    return res.status(400).json({ message: "Thiếu tiêu đề hoặc đường dẫn file" });
  }

  const document = await Document.create(payload);
  res.status(201).json(document);
};

export const deleteDocument = async (req, res) => {
  const { id } = req.params;
  await Document.findByIdAndDelete(id);
  res.sendStatus(204);
};

// Reports
export const getReportSummary = async (req, res) => {
  const { period = "month", year, month, quarter } = req.query;
  
  // Tính toán khoảng thời gian
  let startDate = new Date();
  let endDate = new Date();
  
  if (period === "month" && month && year) {
    startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
  } else if (period === "quarter" && quarter && year) {
    const quarterStartMonth = (parseInt(quarter) - 1) * 3;
    startDate = new Date(parseInt(year), quarterStartMonth, 1);
    endDate = new Date(parseInt(year), quarterStartMonth + 3, 0, 23, 59, 59);
  } else if (period === "year" && year) {
    startDate = new Date(parseInt(year), 0, 1);
    endDate = new Date(parseInt(year), 11, 31, 23, 59, 59);
  } else {
    // Mặc định: tháng hiện tại
    startDate = new Date();
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0);
    endDate.setHours(23, 59, 59);
  }

  const [totalActivities, totalStudents, approvedActivities, pendingActivities, rejectedActivities, activitiesInPeriod] = await Promise.all([
    Activity.countDocuments(),
    User.countDocuments({ role: "student" }),
    Activity.countDocuments({ status: { $in: ACTIVE_STATUSES } }),
    Activity.countDocuments({ status: { $in: REVIEW_STATUSES } }),
    Activity.countDocuments({ status: "Cancelled" }),
    Activity.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),
  ]);

  // Đếm số sinh viên tham gia trong khoảng thời gian
  const studentRegistrations = await ActivityRegistration.distinct("user", {
    registeredAt: { $gte: startDate, $lte: endDate },
  });

  const summary = [
    { label: "Tổng số hoạt động", value: String(totalActivities) },
    { label: "Tổng số sinh viên", value: String(totalStudents) },
    { label: "Hoạt động đã duyệt", value: String(approvedActivities) },
    { label: "Hoạt động chờ duyệt", value: String(pendingActivities) },
    { label: "Hoạt động bị từ chối", value: String(rejectedActivities) },
    { label: `Hoạt động trong kỳ (${period})`, value: String(activitiesInPeriod) },
    { label: "Sinh viên tham gia trong kỳ", value: String(studentRegistrations.length) },
  ];
  res.json(summary);
};

export const exportReports = async (_req, res) => {
  const reports = await Report.find().populate("generatedBy", "displayName email");
  const header = "title,generatedBy,status,createdAt";
  const rows = reports.map(
    (report) =>
      `${report.title},${report.generatedBy?.displayName || "N/A"},${report.status},${report.createdAt.toISOString()}`
  );

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=reports.csv");
  res.send([header, ...rows].join("\n"));
};

// Advanced features
export const listAdvancedFeatures = async (_req, res) => {
  const features = await AdvancedFeature.find();
  if (!features.length) {
    const defaults = [
      { key: "permissions", title: "Quản lý phân quyền", description: "Tuỳ chỉnh vai trò" },
      { key: "audit", title: "Theo dõi log bảo mật", description: "Ghi nhận hành động" },
      { key: "security", title: "Cài đặt bảo mật", description: "2FA, IP whitelist" },
      { key: "backup", title: "Backup / Restore", description: "Sao lưu định kỳ" },
    ];
    await AdvancedFeature.insertMany(defaults);
    return res.json(defaults);
  }
  res.json(features);
};

export const updateAdvancedFeature = async (req, res) => {
  const { key } = req.params;
  const feature = await AdvancedFeature.findOneAndUpdate({ key }, req.body, {
    new: true,
    upsert: true,
  });
  res.json(feature);
};

// System widgets
export const listSystemWidgets = async (_req, res) => {
  const widgets = await SystemWidget.find();
  if (!widgets.length) {
    const defaults = [
      { key: "site", title: "Cấu hình trang web", description: "Logo, domain, SEO" },
      { key: "api", title: "Quản lý API Key", description: "Sinh / thu hồi khoá" },
      { key: "cluster", title: "Server / Cluster", description: "Theo dõi node backend" },
      { key: "logs", title: "Logs realtime", description: "Stream cảnh báo" },
    ];
    await SystemWidget.insertMany(defaults);
    return res.json(defaults);
  }
  res.json(widgets);
};

export const updateSystemWidget = async (req, res) => {
  const { key } = req.params;
  const widget = await SystemWidget.findOneAndUpdate({ key }, req.body, {
    new: true,
    upsert: true,
  });
  res.json(widget);
};

