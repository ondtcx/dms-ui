import api from '@/lib/axios';
import type { SharingRecipient } from './document-sharing.service';

export type ChangeRequestStatus = 'PENDING' | 'IN_PROGRESS' | 'CORRECTION_SUBMITTED' | 'ACCEPTED' | 'CANCELLED';
export interface DocumentChangeRequest {
  id: number;
  documentId: number;
  requestedById: string;
  recipientId: string;
  status: ChangeRequestStatus;
  revision: number;
  message: string;
  filename: string | null;
  hasCorrection: boolean;
}
export interface ChangeRequestSnapshot {
  request: DocumentChangeRequest | null;
  capabilities: { create: boolean; manage: boolean; submit: boolean };
}
const path = (id: number) => `/documents/${id}/change-requests`;

export const documentChangeRequestService = {
  async get(id: number): Promise<ChangeRequestSnapshot> {
    return (await api.get<ChangeRequestSnapshot>(path(id))).data;
  },
  async recipients(id: number, query: string): Promise<SharingRecipient[]> {
    return (await api.get<SharingRecipient[]>(`${path(id)}/recipients`, { params: { query } })).data;
  },
  async access(id: number, recipientId: string): Promise<{ hasAccess: boolean }> {
    return (await api.get<{ hasAccess: boolean }>(`${path(id)}/recipient-access`, { params: { recipientId } })).data;
  },
  async create(id: number, input: { recipientId: string; message: string; confirmShare?: boolean }): Promise<DocumentChangeRequest> {
    return (await api.post<DocumentChangeRequest>(path(id), input)).data;
  },
  async submit(id: number, requestId: number, revision: number, file: File): Promise<DocumentChangeRequest> {
    const form = new FormData(); form.append('file', file); form.append('revision', String(revision));
    return (await api.post<DocumentChangeRequest>(`${path(id)}/${requestId}/correction`, form, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
  },
  async decide(id: number, requestId: number, input: { revision: number; action: 'accept' | 'cancel' | 'further'; message?: string }): Promise<DocumentChangeRequest> {
    return (await api.post<DocumentChangeRequest>(`${path(id)}/${requestId}/decision`, input)).data;
  },
  async download(id: number, requestId: number): Promise<Blob> {
    return (await api.get<Blob>(`${path(id)}/${requestId}/correction`, { responseType: 'blob' })).data;
  },
};
