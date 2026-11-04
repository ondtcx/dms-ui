import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NotificationBell } from '../NotificationBell';
import { notificationsService } from '@/lib/services/notifications.service';

jest.mock('@/lib/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'actor' } }),
}));
jest.mock('@/lib/services/notifications.service', () => ({
  notificationsService: {
    list: jest.fn(),
    read: jest.fn(),
    unread: jest.fn(),
    archive: jest.fn(),
    archiveRead: jest.fn(),
    readAll: jest.fn(),
  },
}));

const unreadItem = {
  id: 4,
  type: 'APPROVAL_REQUESTED',
  title: '<b>Compartido</b>',
  message: '<script>unsafe</script>',
  status: 'UNREAD',
  actionUrl: 'javascript:alert(1)',
  createdAt: '2026-11-04T09:15:00.000Z',
  readAt: null,
  actorId: 'u2',
  actorName: 'Erika Ramirez',
  actorRole: 'rector',
  document: { id: 10, name: 'Acta de consejo' },
};

const readItem = {
  ...unreadItem,
  id: 5,
  status: 'READ',
  title: 'Documento aprobado',
  readAt: '2026-11-04T09:20:00.000Z',
};

describe('notifications bell', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (notificationsService.list as jest.Mock).mockResolvedValue({
      data: [unreadItem],
      unreadCount: 1,
      page: 1,
      limit: 20,
      filter: 'all',
    });
    (notificationsService.read as jest.Mock).mockResolvedValue({});
    (notificationsService.unread as jest.Mock).mockResolvedValue({});
    (notificationsService.archive as jest.Mock).mockResolvedValue({});
    (notificationsService.archiveRead as jest.Mock).mockResolvedValue({});
    (notificationsService.readAll as jest.Mock).mockResolvedValue({});
  });

  it('shows unread count, useful metadata and rejects unsafe action links', async () => {
    render(<NotificationBell />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Notificaciones, 1 sin leer' }),
    );

    expect(screen.getByText('<script>unsafe</script>')).toBeInTheDocument();
    expect(screen.getByText('Documento: Acta de consejo')).toBeInTheDocument();
    expect(screen.getByText(/Erika Ramirez · Rector/)).toBeInTheDocument();
    expect(screen.getByText(/04\/11\/2026/)).toBeInTheDocument();
    expect(screen.getByText('No leída')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('marks a notification as read', async () => {
    render(<NotificationBell />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Notificaciones, 1 sin leer' }),
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: /^Marcar como leída: <b>Compartido<\/b>$/,
      }),
    );
    await waitFor(() =>
      expect(notificationsService.read).toHaveBeenCalledWith(4),
    );
  });

  it('marks a read notification as unread', async () => {
    (notificationsService.list as jest.Mock).mockResolvedValue({
      data: [readItem],
      unreadCount: 0,
      page: 1,
      limit: 20,
      filter: 'all',
    });
    render(<NotificationBell />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Notificaciones, 0 sin leer' }),
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: /^Marcar como no leída: Documento aprobado$/,
      }),
    );
    await waitFor(() =>
      expect(notificationsService.unread).toHaveBeenCalledWith(5),
    );
  });

  it('filters and deletes notifications', async () => {
    render(<NotificationBell />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Notificaciones, 1 sin leer' }),
    );

    fireEvent.click(screen.getByRole('button', { name: 'No leídas' }));
    await waitFor(() =>
      expect(notificationsService.list).toHaveBeenLastCalledWith(1, 'unread'),
    );

    fireEvent.click(screen.getByRole('button', { name: /Borrar notificación/ }));
    await waitFor(() =>
      expect(notificationsService.archive).toHaveBeenCalledWith(4),
    );
  });

  it('marks all as read and deletes read notifications', async () => {
    render(<NotificationBell />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Notificaciones, 1 sin leer' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Marcar todas como leídas' }),
    );
    await waitFor(() =>
      expect(notificationsService.readAll).toHaveBeenCalled(),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Borrar leídas' }));
    await waitFor(() =>
      expect(notificationsService.archiveRead).toHaveBeenCalled(),
    );
  });
});
