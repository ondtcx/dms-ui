import api from '@/lib/axios';

export interface AppNotification {
  id: number;
  status: 'UNREAD' | 'READ';
  title: string;
  message: string;
  documentId: number | null;
  actionUrl: string | null;
  createdAt: string;
}
export interface NotificationPage { data: AppNotification[]; unreadCount: number; page: number; limit: number }
export interface NotificationPreferences { inAppEnabled: boolean }

export const notificationsService = {
  async list(page = 1): Promise<NotificationPage> {
    return (await api.get<NotificationPage>('/notifications', { params: { page, limit: 20 } })).data;
  },
  async read(id: number) {
    return (await api.patch(`/notifications/${id}/read`)).data;
  },
  async readAll() {
    return (await api.patch('/notifications/read-all')).data;
  },
  async getPreferences(): Promise<NotificationPreferences> {
    return (await api.get<NotificationPreferences>('/notifications/preferences')).data;
  },
  async updatePreferences(inAppEnabled: boolean): Promise<NotificationPreferences> {
    return (await api.patch<NotificationPreferences>('/notifications/preferences', {
      inAppEnabled,
    })).data;
  },
};
