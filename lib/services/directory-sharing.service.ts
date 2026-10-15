import api from '@/lib/axios';
import type { ResourceSharing, SharingPermissions, SharingRecipient } from './document-sharing.service';

export interface DirectorySharing extends ResourceSharing { directoryId: number }

const path = (id: number) => `/directories/${id}/sharing`;
export const directorySharingService = {
  async get(id: number): Promise<DirectorySharing> {
    return (await api.get<DirectorySharing>(path(id))).data;
  },
  async search(id: number, query: string): Promise<SharingRecipient[]> {
    return (await api.get<SharingRecipient[]>(`${path(id)}/recipients`, { params: { q: query } })).data;
  },
  async grant(id: number, userId: string, permissions: SharingPermissions = {}) {
    const { canEdit, canUploadVersion, canShare, expiresAt } = permissions;
    // El contrato de carpetas no admite comentarios de documentos.
    return (await api.post(path(id), { userId,
      ...(canEdit === undefined ? {} : { canEdit }),
      ...(canUploadVersion === undefined ? {} : { canUploadVersion }),
      ...(canShare === undefined ? {} : { canShare }),
      ...(expiresAt === undefined ? {} : { expiresAt }),
    })).data;
  },
  async revoke(id: number, grantId: string | number) {
    return (await api.delete(`${path(id)}/grants/${encodeURIComponent(String(grantId))}`)).data;
  },
  async setVisibility(id: number, isPublic: boolean) {
    return (await api.patch(`${path(id)}/visibility`, { isPublic })).data;
  },
};
