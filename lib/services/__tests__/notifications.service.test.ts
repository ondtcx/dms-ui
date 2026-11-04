import api from '@/lib/axios';
import { notificationsService } from '../notifications.service';

jest.mock('@/lib/axios', () => ({
  __esModule: true,
  default: { get: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));
describe('notification transport', () => {
  it('does not accept a recipient identity override', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { data: [], unreadCount: 0 } });
    await notificationsService.list(2);
    expect(api.get).toHaveBeenCalledWith('/notifications', {
      params: { page: 2, limit: 20, filter: 'all' },
    });
    (api.patch as jest.Mock).mockResolvedValue({ data: {} });
    (api.delete as jest.Mock).mockResolvedValue({ data: {} });
    await notificationsService.read(4);
    expect(api.patch).toHaveBeenCalledWith('/notifications/4/read');
    await notificationsService.unread(4);
    expect(api.patch).toHaveBeenCalledWith('/notifications/4/unread');
    await notificationsService.archive(4);
    expect(api.delete).toHaveBeenCalledWith('/notifications/4');
    await notificationsService.archiveRead();
    expect(api.delete).toHaveBeenCalledWith('/notifications/read');
  });
});
