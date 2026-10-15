import api from '@/lib/axios';
import { documentChangeRequestService } from '../document-change-request.service';

jest.mock('@/lib/axios', () => ({ __esModule: true, default: { get: jest.fn(), post: jest.fn() } }));

describe('document change request transport', () => {
  beforeEach(() => { jest.clearAllMocks(); (api.get as jest.Mock).mockResolvedValue({ data: {} }); (api.post as jest.Mock).mockResolvedValue({ data: {} }); });
  it('requires explicit boolean sharing confirmation in the creation payload', async () => {
    await documentChangeRequestService.create(1, { recipientId: 'recipient', message: 'Corregir', confirmShare: true });
    expect(api.post).toHaveBeenCalledWith('/documents/1/change-requests', { recipientId: 'recipient', message: 'Corregir', confirmShare: true });
  });
  it('uploads with the observed revision, without using ordinary replaceFile', async () => {
    const file = new File(['file'], 'correction.txt');
    await documentChangeRequestService.submit(1, 8, 3, file);
    const [url, body] = (api.post as jest.Mock).mock.calls[0];
    expect(url).toBe('/documents/1/change-requests/8/correction');
    expect(body.get('revision')).toBe('3'); expect(body.get('file')).toBe(file);
  });
  it('uses authenticated blob downloads and revision-aware decisions', async () => {
    await documentChangeRequestService.download(1, 8);
    expect(api.get).toHaveBeenCalledWith('/documents/1/change-requests/8/correction', { responseType: 'blob' });
    await documentChangeRequestService.decide(1, 8, { action: 'cancel', revision: 3 });
    expect(api.post).toHaveBeenCalledWith('/documents/1/change-requests/8/decision', { action: 'cancel', revision: 3 });
  });
});
