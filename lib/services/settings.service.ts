import api from "@/lib/axios";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InstitutionSettings {
  name: string;
  logoPath: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
}

export interface SchoolYearSettings {
  name: string;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
}

export interface AppearanceSettings {
  primaryColor: string;
  secondaryColor: string;
  theme: "light" | "dark" | "system";
}

export interface DocumentSettings {
  maxFileSizeMb: number;
  allowedMimeTypes: string[];
  trashRetentionDays: number;
  maxVersionsPerDocument: number;
}

export interface NotificationSettings {
  emailEnabled: boolean;
  senderEmail: string | null;
  senderName: string | null;
}

export interface SecuritySettings {
  sessionTimeoutMinutes: number;
  maxLoginAttempts: number;
  require2FA: boolean;
}

export interface SystemSettings {
  id: number;
  institution: InstitutionSettings;
  schoolYear: SchoolYearSettings;
  appearance: AppearanceSettings;
  documents: DocumentSettings;
  notifications: NotificationSettings;
  security: SecuritySettings;
  createdAt: string;
  updatedAt: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export const settingsService = {
  async get(): Promise<SystemSettings> {
    const res = await api.get<SystemSettings>("/settings");
    return res.data;
  },

  async updateInstitution(data: Partial<InstitutionSettings>): Promise<SystemSettings> {
    const res = await api.patch<SystemSettings>("/settings/institution", data);
    return res.data;
  },

  async updateLogo(file: File): Promise<{ logoPath: string }> {
    const form = new FormData();
    form.append("file", file);
    const res = await api.post<{ logoPath: string }>("/settings/institution/logo", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  async updateSchoolYear(data: Partial<SchoolYearSettings>): Promise<SystemSettings> {
    const res = await api.patch<SystemSettings>("/settings/school-year", data);
    return res.data;
  },

  async updateAppearance(data: Partial<AppearanceSettings>): Promise<SystemSettings> {
    const res = await api.patch<SystemSettings>("/settings/appearance", data);
    return res.data;
  },

  async updateDocuments(data: Partial<DocumentSettings>): Promise<SystemSettings> {
    const res = await api.patch<SystemSettings>("/settings/documents", data);
    return res.data;
  },

  async updateNotifications(data: Partial<NotificationSettings>): Promise<SystemSettings> {
    const res = await api.patch<SystemSettings>("/settings/notifications", data);
    return res.data;
  },

  async updateSecurity(data: Partial<SecuritySettings>): Promise<SystemSettings> {
    const res = await api.patch<SystemSettings>("/settings/security", data);
    return res.data;
  },
};
