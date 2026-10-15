import api from '@/lib/axios';
import { directorySharingService } from '../directory-sharing.service';

jest.mock('@/lib/axios', () => ({ get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  for (const method of ['get', 'post', 'patch', 'delete'] as const) (api[method] as jest.Mock).mockResolvedValue({ data: {} });
});

it('reads folder sharing and uses the folder-specific recipient search parameter', async () => {
  await directorySharingService.get(7);
  await directorySharingService.search(7, 'Ana');
  expect(api.get).toHaveBeenCalledWith('/directories/7/sharing');
  expect(api.get).toHaveBeenCalledWith('/directories/7/sharing/recipients', { params: { q: 'Ana' } });
});

it('sends independent grant flags, revokes a concrete grant and changes local visibility', async () => {
  await directorySharingService.grant(7, 'reader', { canEdit: false, canUploadVersion: true, canShare: false, comment: 'Not supported' });
  await directorySharingService.revoke(7, 23);
  await directorySharingService.setVisibility(7, false);
  expect(api.post).toHaveBeenCalledWith('/directories/7/sharing', { userId: 'reader', canEdit: false, canUploadVersion: true, canShare: false });
  expect(api.delete).toHaveBeenCalledWith('/directories/7/sharing/grants/23');
  expect(api.patch).toHaveBeenCalledWith('/directories/7/sharing/visibility', { isPublic: false });
});

it('does not enable omitted capabilities', async () => {
  await directorySharingService.grant(7, 'reader');
  expect(api.post).toHaveBeenCalledWith('/directories/7/sharing', { userId: 'reader' });
});
