import api from '@/lib/axios';
import { documentSharingService } from '../document-sharing.service';

jest.mock('@/lib/axios', () => ({ get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() }));

describe('document sharing transport', () => {
  it('sends the selected grant ID alongside its recipient and permissions', async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: {} });
    await documentSharingService.grant(12, 'reader', { grantId: 42, canEdit: false });
    expect(api.post).toHaveBeenCalledWith('/permissions/documents/12/sharing', { userId: 'reader', grantId: 42, canEdit: false });
  });
  beforeEach(() => jest.clearAllMocks());
  it('revokes numeric grant identifiers without replacing them with recipient ids', async () => {
    (api.delete as jest.Mock).mockResolvedValue({ data: { revoked: true } });
    await documentSharingService.revoke(12, 42);
    expect(api.delete).toHaveBeenCalledWith('/permissions/documents/12/sharing/grants/42');
  });
  it('reads sharing and searches bounded recipients through the manager API', async () => {
    (api.get as jest.Mock).mockResolvedValue({ data: { recipients: [] } });
    await documentSharingService.get(12);
    await documentSharingService.search(12, 'Ana');
    expect(api.get).toHaveBeenCalledWith('/permissions/documents/12/sharing');
    expect(api.get).toHaveBeenCalledWith('/permissions/documents/12/sharing/recipients', { params: { query: 'Ana' } });
  });
  it('sends independent permissions without enabling omitted flags', async () => {
    (api.post as jest.Mock).mockResolvedValue({ data: {} });
    await documentSharingService.grant(12, 'reader', { canUploadVersion: true, canShare: false });
    expect(api.post).toHaveBeenCalledWith('/permissions/documents/12/sharing', { userId: 'reader', canUploadVersion: true, canShare: false });
  });
  it('grants read access, revokes the selected recipient and updates visibility', async () => {
    for (const method of ['post', 'delete', 'patch'] as const) (api[method] as jest.Mock).mockResolvedValue({ data: {} });
    await documentSharingService.grant(12, 'user/a');
    await documentSharingService.revoke(12, 'user/a');
    await documentSharingService.setVisibility(12, false);
    expect(api.post).toHaveBeenCalledWith('/permissions/documents/12/sharing', { userId: 'user/a' });
    expect(api.delete).toHaveBeenCalledWith('/permissions/documents/12/sharing/grants/user%2Fa');
    expect(api.patch).toHaveBeenCalledWith('/permissions/documents/12/sharing/visibility', { isPublic: false });
  });
});
