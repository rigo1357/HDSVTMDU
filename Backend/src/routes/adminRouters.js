import express from "express";
import {
  createActivity,
  createDocument,
  createNotification,
  createUser,
  deleteActivity,
  deleteDocument,
  deleteNotification,
  deleteUser,
  exportReports,
  exportStudents,
  getDashboardOverview,
  getReportSummary,
  listActivities,
  listAdvancedFeatures,
  listDocuments,
  listNotifications,
  listStudents,
  listSystemWidgets,
  listUsers,
  scheduleNotification,
  updateActivity,
  updateAdvancedFeature,
  updateNotification,
  updateSystemWidget,
  updateUser,
  approveActivity,
  approveActivityWithCondition,
  requestActivityEdit,
  rejectActivity,
  listSecurityLogs,
} from "../controllers/adminControllers.js";
import { upload, uploadMultiple } from "../utils/uploadMiddleware.js";
import { uploadFile, uploadMultipleFiles } from "../controllers/uploadControllers.js";

const router = express.Router();

router.get("/dashboard/overview", getDashboardOverview);

router
  .route("/users")
  .get(listUsers)
  .post(createUser);
router.route("/users/:id").put(updateUser).delete(deleteUser);

router
  .route("/activities")
  .get(listActivities)
  .post(createActivity);
router.route("/activities/:id").put(updateActivity).delete(deleteActivity);
router.post("/activities/:id/approve", approveActivity);
router.post("/activities/:id/approve-with-condition", approveActivityWithCondition);
router.post("/activities/:id/request-edit", requestActivityEdit);
router.post("/activities/:id/reject", rejectActivity);

router.get("/students", listStudents);
router.get("/students/export", exportStudents);

router
  .route("/notifications")
  .get(listNotifications)
  .post(createNotification);
router.route("/notifications/:id").put(updateNotification).delete(deleteNotification);
router.post("/notifications/:id/schedule", scheduleNotification);

router
  .route("/documents")
  .get(listDocuments)
  .post(upload.single("file"), createDocument);
router.delete("/documents/:id", deleteDocument);

router.get("/reports/summary", getReportSummary);
router.get("/reports/export", exportReports);

// Security logs
router.get("/logs/security", listSecurityLogs);

router.get("/advanced/features", listAdvancedFeatures);
router.put("/advanced/features/:key", updateAdvancedFeature);

router.get("/system/widgets", listSystemWidgets);
router.put("/system/widgets/:key", updateSystemWidget);

// Upload routes
router.post("/upload", upload.single("file"), uploadFile);
router.post("/upload/multiple", uploadMultiple.array("files", 10), uploadMultipleFiles);

export default router;

