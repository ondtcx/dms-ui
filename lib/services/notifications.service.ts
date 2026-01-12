import api from '../axios';
import {
  Notification,
  NotificationPreference,
  NotificationStatus,
} from '../types';

export const notificationsService = {
  // Obtener notificaciones del usuario
  async getAll(status?: NotificationStatus): Promise<Notification[]> {
    const params = status ? { status } : {};
    const response = await api.get('/notifications', { params });
    return response.data;
  },

  // Obtener notificaciones no leídas
  async getUnread(): Promise<Notification[]> {
    const response = await api.get('/notifications/unread');
    return response.data;
  },

  // Contar notificaciones no leídas
  async getUnreadCount(): Promise<number> {
    const response = await api.get('/notifications/unread/count');
    return response.data.count;
  },

  // Marcar notificación como leída
  async markAsRead(notificationId: number): Promise<Notification> {
    const response = await api.patch(`/notifications/${notificationId}/read`);
    return response.data;
  },

  // Marcar todas como leídas
  async markAllAsRead(): Promise<{ updated: number }> {
    const response = await api.patch('/notifications/read-all');
    return response.data;
  },

  // Archivar notificación
  async archive(notificationId: number): Promise<Notification> {
    const response = await api.patch(`/notifications/${notificationId}/archive`);
    return response.data;
  },

  // Eliminar notificación
  async delete(notificationId: number): Promise<void> {
    await api.delete(`/notifications/${notificationId}`);
  },

  // Obtener preferencias de notificaciones
  async getPreferences(): Promise<NotificationPreference> {
    const response = await api.get('/notifications/preferences');
    return response.data;
  },

  // Actualizar preferencias
  async updatePreferences(
    preferences: Partial<NotificationPreference>
  ): Promise<NotificationPreference> {
    const response = await api.patch('/notifications/preferences', preferences);
    return response.data;
  },
};
