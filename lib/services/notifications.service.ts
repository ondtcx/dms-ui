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

export const notificationsService = {
  async list(page = 1): Promise<NotificationPage> {
    return (await api.get<NotificationPage>('/notifications', { params: { page, limit: 20 } })).data;
  },
  async read(id: number) {
    return (await api.patch(`/notifications/${id}/read`)).data;
  },
};
