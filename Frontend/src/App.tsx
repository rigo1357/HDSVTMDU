import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/UseAuth/AuthContext";
import DashboardPage from "@/pages/DashboardPage";
import NotFoundPage from "@/pages/NotFound";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import SignUp from "@/pages/SignUp";
import ActivityPage from "@/pages/ActivityPage";
import ActivityDetailPage from "@/pages/ActivityDetailPage";
import ContactPage from "@/pages/ContactPage";
import NotificationsPage from "@/pages/NotificationsPage";
import PersonalInfoPage from "@/pages/PersonalInfoPage";
import RegisteredActivitiesPage from "@/pages/RegisteredActivitiesPage";
import CompletedActivitiesPage from "@/pages/CompletedActivitiesPage";
import ChangePasswordPage from "@/pages/ChangePasswordPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import ResetPasswordPage from "@/pages/ResetPasswordPage";
import { Toaster } from "@/components/ui/toaster";
import AdminDashboardPage from "@/Admin/pages/AdminDashboardPage";
import AdminUsersPage from "@/Admin/pages/AdminUsersPage";
import AdminActivitiesPage from "@/Admin/pages/AdminActivitiesPage";
import AdminStudentsPage from "@/Admin/pages/AdminStudentsPage";
import AdminNotificationsPage from "@/Admin/pages/AdminNotificationsPage";
import AdminDocumentsPage from "@/Admin/pages/AdminDocumentsPage";
import AdminReportsPage from "@/Admin/pages/AdminReportsPage";
import AdminAdvancedPage from "@/Admin/pages/AdminAdvancedPage";
import AdminSystemPage from "@/Admin/pages/AdminSystemPage";
import AdminRoute from "@/components/auth/AdminRoute";
import ManagerDashboardPage from "@/Manager/pages/ManagerDashboardPage";
import ManagerActivitiesPage from "@/Manager/pages/ManagerActivitiesPage";
import ManagerActivityCreatePage from "@/Manager/pages/ManagerActivityCreatePage";
import ManagerActivityRegistrationsPage from "@/Manager/pages/ManagerActivityRegistrationsPage";
import ManagerEvidenceApprovalPage from "@/Manager/pages/ManagerEvidenceApprovalPage";
import ManagerNotificationsPage from "@/Manager/pages/ManagerNotificationsPage";
import ManagerNotificationCreatePage from "@/Manager/pages/ManagerNotificationCreatePage";
import ManagerStudentsPage from "@/Manager/pages/ManagerStudentsPage";
import ManagerReportsPage from "@/Manager/pages/ManagerReportsPage";
import ManagerFeedbackPage from "@/Manager/pages/ManagerFeedbackPage";
import ManagerRoute from "@/components/auth/ManagerRoute";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider> {/* moved inside BrowserRouter */}
        <Routes>
          {/* PUBLIC PAGES */}
          <Route path="/" element={<HomePage />} />
          <Route path="/sukien" element={<ActivityPage />} />
          <Route path="/ActivityPage" element={<ActivityPage />} />
          <Route path="/activities/:id" element={<ActivityDetailPage />} />
          <Route path="/ContactPage" element={<ContactPage />} />
          <Route path="/DashboardPage" element={<DashboardPage />} />
          <Route path="/NotificationsPage" element={<NotificationsPage />} />
          <Route path="/LoginPage" element={<LoginPage />} />
          <Route path="/SignUp" element={<SignUp />} />
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />

          {/* USER PAGES */}
          <Route path="/user/profile" element={<PersonalInfoPage />} />
          <Route path="/user/registered-activities" element={<RegisteredActivitiesPage />} />
          <Route path="/user/completed-activities" element={<CompletedActivitiesPage />} />
          <Route path="/user/change-password" element={<ChangePasswordPage />} />

          {/* ADMIN */}
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route
            path="/admin/dashboard"
            element={
              <AdminRoute>
                <AdminDashboardPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <AdminRoute>
                <AdminUsersPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/activities"
            element={
              <AdminRoute>
                <AdminActivitiesPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/students"
            element={
              <AdminRoute>
                <AdminStudentsPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/notifications"
            element={
              <AdminRoute>
                <AdminNotificationsPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/documents"
            element={
              <AdminRoute>
                <AdminDocumentsPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/reports"
            element={
              <AdminRoute>
                <AdminReportsPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/advanced"
            element={
              <AdminRoute>
                <AdminAdvancedPage />
              </AdminRoute>
            }
          />
          <Route
            path="/admin/system"
            element={
              <AdminRoute>
                <AdminSystemPage />
              </AdminRoute>
            }
          />

          {/* MANAGER */}
          <Route path="/manager" element={<Navigate to="/manager/dashboard" replace />} />
          <Route
            path="/manager/dashboard"
            element={
              <ManagerRoute>
                <ManagerDashboardPage />
              </ManagerRoute>
            }
          />
          <Route
            path="/manager/activities"
            element={
              <ManagerRoute>
                <ManagerActivitiesPage />
              </ManagerRoute>
            }
          />
          <Route
            path="/manager/activities/create"
            element={
              <ManagerRoute>
                <ManagerActivityCreatePage />
              </ManagerRoute>
            }
          />
          <Route
            path="/manager/activities/:id/registrations"
            element={
              <ManagerRoute>
                <ManagerActivityRegistrationsPage />
              </ManagerRoute>
            }
          />
          <Route
            path="/manager/activities/:id/evidence"
            element={
              <ManagerRoute>
                <ManagerEvidenceApprovalPage />
              </ManagerRoute>
            }
          />
          <Route
            path="/manager/notifications"
            element={
              <ManagerRoute>
                <ManagerNotificationsPage />
              </ManagerRoute>
            }
          />
          <Route
            path="/manager/notifications/create"
            element={
              <ManagerRoute>
                <ManagerNotificationCreatePage />
              </ManagerRoute>
            }
          />
          <Route
            path="/manager/students"
            element={
              <ManagerRoute>
                <ManagerStudentsPage />
              </ManagerRoute>
            }
          />
          <Route
            path="/manager/reports"
            element={
              <ManagerRoute>
                <ManagerReportsPage />
              </ManagerRoute>
            }
          />
          <Route
            path="/manager/feedback"
            element={
              <ManagerRoute>
                <ManagerFeedbackPage />
              </ManagerRoute>
            }
          />

          {/* 404 */}
          <Route path="/404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
