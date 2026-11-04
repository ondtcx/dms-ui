import api from '@/lib/axios';

export type NotificationFilter = 'all' | 'unread' | 'read';

export interface AppNotification {
  id: number;
  type: string;
  status: 'UNREAD' | 'READ' | 'ARCHIVED';
  title: string;
  message: string;
  documentId: number | null;
  actionUrl: string | null;
  createdAt: string;
  readAt: string | null;
  actorId: string | null;
  actorName: string | null;
  actorRole: string | null;
  document?: { id: number; name: string | null } | null;
}

export interface NotificationPage {
  data: AppNotification[];
  unreadCount: number;
  page: number;
  limit: number;
  filter: NotificationFilter;
}

export interface NotificationPreferences {
  inAppEnabled: boolean;
}

export const notificationsService = {
  async list(
    page = 1,
    filter: NotificationFilter = 'all',
  ): Promise<NotificationPage> {
    return (
      await api.get<NotificationPage>('/notifications', {
        params: { page, limit: 20, filter },
      })
    ).data;
  },
  async read(id: number) {
    return (await api.patch(`/notifications/${id}/read`)).data;
  },
  async unread(id: number) {
    return (await api.patch(`/notifications/${id}/unread`)).data;
  },
  async archive(id: number) {
    return (await api.delete(`/notifications/${id}`)).data;
  },
  async archiveRead() {
    return (await api.delete('/notifications/read')).data;
  },
  async readAll() {
    return (await api.patch('/notifications/read-all')).data;
  },
  async getPreferences(): Promise<NotificationPreferences> {
    return (await api.get<NotificationPreferences>('/notifications/preferences'))
      .data;
  },
  async updatePreferences(
    inAppEnabled: boolean,
  ): Promise<NotificationPreferences> {
    return (
      await api.patch<NotificationPreferences>('/notifications/preferences', {
        inAppEnabled,
      })
    ).data;
  },
};
