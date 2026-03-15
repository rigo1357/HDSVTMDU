import api from "@/lib/axios";
import type {
  AdminActivity,
  AdminDocument,
  AdminUser,
  AdvancedFeature,
  DashboardOverview,
  NotificationMessage,
  ReportSummary,
  StudentProfile,
  SystemWidget,
  SecurityLogEntry,
} from "@/types/admin";
export interface UserQuery {
  search?: string;
  role?: string;
  status?: string;
}

export interface ActivityQuery {
  search?: string;
  status?: string;
  type?: string;
}

export interface StudentQuery {
  search?: string;
  faculty?: string;
  activityStatus?: string;
}

export const adminService = {
  async getActivityDetail(id: string) {
    const res = await api.get(`/activities/${id}`);
    return res.data;
  },
  async getDashboardOverview() {
    const res = await api.get<DashboardOverview>("/admin/dashboard/overview");
    return res.data;
  },

  async getUsers(params?: UserQuery) {
    const res = await api.get<{ users: AdminUser[] }>("/admin/users", { params });
    return res.data.users;
  },

  async createUser(payload: Partial<AdminUser> & { password?: string }) {
    const res = await api.post<AdminUser>("/admin/users", payload);
    return res.data;
  },

  async updateUser(id: string, payload: Partial<AdminUser>) {
    const res = await api.put<AdminUser>(`/admin/users/${id}`, payload);
    return res.data;
  },

  async deleteUser(id: string) {
    await api.delete(`/admin/users/${id}`);
  },

  async getActivities(params?: ActivityQuery) {
    const res = await api.get<{ activities: AdminActivity[] }>("/admin/activities", {
      params,
    });
    return res.data.activities;
  },

  async createActivity(payload: Partial<AdminActivity>) {
    const res = await api.post<AdminActivity>("/admin/activities", payload);
    return res.data;
  },

  async updateActivity(id: string, payload: Partial<AdminActivity>) {
    const res = await api.put<AdminActivity>(`/admin/activities/${id}`, payload);
    return res.data;
  },

  async approveActivity(id: string, payload?: { note?: string }) {
    const res = await api.post<AdminActivity>(`/admin/activities/${id}/approve`, payload);
    return res.data;
  },

  async approveActivityWithCondition(id: string, payload: { condition: string }) {
    const res = await api.post<AdminActivity>(`/admin/activities/${id}/approve-with-condition`, payload);
    return res.data;
  },

  async requestActivityEdit(id: string, payload: { feedback: string }) {
    const res = await api.post<AdminActivity>(`/admin/activities/${id}/request-edit`, payload);
    return res.data;
  },

  async rejectActivity(id: string, payload: { reason: string }) {
    const res = await api.post<AdminActivity>(`/admin/activities/${id}/reject`, payload);
    return res.data;
  },

  async deleteActivity(id: string) {
    await api.delete(`/admin/activities/${id}`);
  },

  async getStudents(params?: StudentQuery) {
    const res = await api.get<{ students: StudentProfile[] }>("/admin/students", {
      params,
    });
    return res.data.students;
  },

  async exportStudents(params?: StudentQuery) {
    const res = await api.get("/admin/students/export", {
      params,
      responseType: "blob",
    });
    return res.data;
  },

  async getNotifications() {
    const res = await api.get<{ notifications: NotificationMessage[] }>("/admin/notifications");
    return res.data.notifications;
  },

  async createNotification(payload: Partial<NotificationMessage>) {
    const res = await api.post<NotificationMessage>("/admin/notifications", payload);
    return res.data;
  },

  async updateNotification(id: string, payload: Partial<NotificationMessage>) {
    const res = await api.put<NotificationMessage>(`/admin/notifications/${id}`, payload);
    return res.data;
  },

  async scheduleNotification(id: string, scheduleAt: string) {
    const res = await api.post<NotificationMessage>(`/admin/notifications/${id}/schedule`, {
      scheduleAt,
    });
    return res.data;
  },

  async deleteNotification(id: string) {
    await api.delete(`/admin/notifications/${id}`);
  },

  async getDocuments() {
    const res = await api.get<{ documents: AdminDocument[] }>("/admin/documents");
    return res.data.documents;
  },

  async createDocument(payload: Partial<AdminDocument> | FormData) {
    const res = await api.post<AdminDocument>("/admin/documents", payload, {
      headers: payload instanceof FormData ? { "Content-Type": "multipart/form-data" } : undefined,
    });
    return res.data;
  },

  async deleteDocument(id: string) {
    await api.delete(`/admin/documents/${id}`);
  },

  async getReportSummaries(params?: Record<string, any>) {
    const res = await api.get<ReportSummary[]>("/admin/reports/summary", { params });
    return res.data;
  },

  async exportReports(params?: Record<string, string>) {
    const res = await api.get("/admin/reports/export", {
      params,
      responseType: "blob",
    });
    return res.data;
  },

  async getAdvancedFeatures() {
    const res = await api.get<AdvancedFeature[]>("/admin/advanced/features");
    return res.data;
  },

  async updateAdvancedFeature(key: string, payload: Partial<AdvancedFeature>) {
    const res = await api.put<AdvancedFeature>(`/admin/advanced/features/${key}`, payload);
    return res.data;
  },

  async getSystemWidgets() {
    const res = await api.get<SystemWidget[]>("/admin/system/widgets");
    return res.data;
  },

  async updateSystemWidget(key: string, payload: Partial<SystemWidget>) {
    const res = await api.put<SystemWidget>(`/admin/system/widgets/${key}`, payload);
    return res.data;
  },

  async uploadFile(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post<{ success: boolean; fileUrl: string; fileName: string; fileSize: number; mimeType: string }>("/admin/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  async getSecurityLogs(limit = 100) {
    const res = await api.get<{ logs: SecurityLogEntry[] }>("/admin/logs/security", {
      params: { limit },
    });
    return res.data.logs;
  },
};

