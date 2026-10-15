import api from '@/lib/axios';
import type { ResourceCapabilities, SharingProvenance } from '@/lib/types';

export interface SharingRecipient { id: string; name: string | null; email: string }
export interface SharingPermissions {
  grantId?: number;
  comment?: string;
  canEdit?: boolean;
  canUploadVersion?: boolean;
  canShare?: boolean;
  expiresAt?: string;
}
export interface SharingGrant extends SharingPermissions {
  id: string | number;
  user: SharingRecipient;
  grantedBy: SharingRecipient;
  canRevoke: boolean;
  effective: boolean;
  inherited?: boolean;
  legacy?: boolean;
  sourceDirectory?: { id: number; name: string } | null;
  authoritySource?: SharingProvenance['authoritySource'];
}
export interface ResourceSharing {
  isPublic: boolean;
  canManageSharing: boolean;
  recipients: SharingRecipient[];
  canSetVisibility?: boolean;
  grants?: SharingGrant[];
  capabilities?: ResourceCapabilities;
  inheritedGrants?: SharingGrant[];
  legacyGrants?: SharingGrant[];
  provenance?: SharingProvenance[];
}
export interface DocumentSharing extends ResourceSharing { documentId: number }

const path = (id: number) => `/permissions/documents/${id}/sharing`;
export const documentSharingService = {
  async get(id: number): Promise<DocumentSharing> {
    return (await api.get<DocumentSharing>(path(id))).data;
  },
  async search(id: number, query: string): Promise<SharingRecipient[]> {
    return (await api.get<SharingRecipient[]>(`${path(id)}/recipients`, { params: { query } })).data;
  },
  async grant(id: number, userId: string, permissions: SharingPermissions = {}) {
    return (await api.post(`${path(id)}`, { userId, ...permissions })).data;
  },
  async revoke(id: number, grantId: string | number) {
    return (await api.delete(`${path(id)}/grants/${encodeURIComponent(String(grantId))}`)).data;
  },
  async setVisibility(id: number, isPublic: boolean) {
    return (await api.patch(`${path(id)}/visibility`, { isPublic })).data;
  },
};
