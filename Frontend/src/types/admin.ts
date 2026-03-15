export interface DashboardTotals {
  students: number;
  managers: number;
  activeActivities: number;
  documents: number;
}

export interface DashboardTrends {
  months: Array<{ label: string; activities: number; interactions: number; submissions: number }>;
  logs: Array<{ message: string; timestamp: string }>;
}

export interface DashboardOverview {
  totals: DashboardTotals;
  trends: DashboardTrends;
}

export type UserRole = "student" | "manager" | "admin";
export type UserStatus = "active" | "locked";

export interface AdminUser {
  _id: string;
  displayName: string;
  fullName?: string; // alias for displayName
  username?: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface ActivityParticipant {
  displayName: string;
  email: string;
  status: string;
  registeredAt: string;
}

export interface AdminActivity {
  _id: string;
  title: string;
  description?: string;
  location?: string;
  type?: string;
  status: string;
  startTime: string;
  endTime: string;
  maxParticipants?: number;
  coverImage?: string;
  documentUrl?: string;
  participantCount?: number;
  createdBy?: {
    displayName: string;
    email: string;
  };
  participants?: ActivityParticipant[];
}

export interface StudentProfile {
  studentId: string;
  fullName: string;
  faculty: string;
  activityStatus: string;
  progressPercent: number;
}

export interface NotificationMessage {
  _id: string;
  title: string;
  message: string;
  targetRoles: string[];
  scheduleAt: string;
  status: "draft" | "scheduled" | "sent";
}

export interface AdminDocument {
  _id: string;
  title: string;
  fileUrl: string;
  mimeType?: string;
  accessScope: "admin" | "manager" | "student" | "public";
  description?: string;
  activity?: {
    _id: string;
    title: string;
  };
  uploadedBy?: {
    _id: string;
    displayName: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface ReportSummary {
  label: string;
  value: string;
}

export interface AdvancedFeature {
  key: string;
  title: string;
  description: string;
  status?: boolean;
  [key: string]: any;
}

export interface SystemWidget {
  key: string;
  title: string;
  description: string;
  status?: boolean;
  enabled?: boolean;
  [key: string]: any;
}

export interface SecurityLogEntry {
  _id: string;
  action: string;
  target?: string;
  ipAddress?: string;
  metadata?: Record<string, string>;
  createdAt: string;
  user?: {
    displayName: string;
    email: string;
    role: UserRole;
  };
}

