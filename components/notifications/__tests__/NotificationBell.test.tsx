import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { NotificationBell } from '../NotificationBell';
import { notificationsService } from '@/lib/services/notifications.service';

jest.mock('@/lib/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'actor' } }) }));
jest.mock('@/lib/services/notifications.service', () => ({ notificationsService: { list: jest.fn(), read: jest.fn() } }));
describe('notifications bell', () => {
  it('shows unread count, renders plain text and rejects unsafe action links', async () => {
    (notificationsService.list as jest.Mock).mockResolvedValue({ data: [{ id: 4, title: '<b>Compartido</b>', message: '<script>unsafe</script>', status: 'UNREAD', actionUrl: 'javascript:alert(1)' }], unreadCount: 1 });
    (notificationsService.read as jest.Mock).mockResolvedValue({});
    render(<NotificationBell />);
    fireEvent.click(await screen.findByRole('button', { name: 'Notificaciones, 1 sin leer' }));
    expect(screen.getByText('<script>unsafe</script>')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Marcar como leída' }));
    await waitFor(() => expect(notificationsService.read).toHaveBeenCalledWith(4));
  });
});
