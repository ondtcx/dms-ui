import api from '@/lib/axios';
import { permissionsService } from '../permissions.service';

jest.mock('@/lib/axios', () => ({ __esModule: true, default: { get: jest.fn() } }));

it('requests bounded effective access pages without selecting an individual user', async () => {
  const page = { documentId: 7, users: [], nextCursor: 'next' };
  (api.get as jest.Mock).mockResolvedValue({ data: page });
  await expect((permissionsService as any).getEffectiveAccess(7, 'after')).resolves.toEqual(page);
  expect(api.get).toHaveBeenCalledWith('/permissions/documents/7/effective-access', { params: { cursor: 'after' } });
});
