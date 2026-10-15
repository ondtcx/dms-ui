import api from '@/lib/axios';
import { Permission } from '@/lib/types';

export interface ExplainPermissionDto {
  documentId: number;
  userId: string;
}

export interface ExplainPermissionResult {
  hasAccess: boolean;
  role: string;
  reasons: string[];
}

export interface EffectiveAccessPage {
  documentId: number;
  users: Array<{
    id: string;
    name: string | null;
    email: string;
    role: string;
  }>;
  nextCursor: string | null;
}

export const permissionsService = {
  async getEffectiveAccess(
    documentId: number,
    cursor?: string,
  ): Promise<EffectiveAccessPage> {
    return (await api.get<EffectiveAccessPage>(
      `/permissions/documents/${documentId}/effective-access`,
      { params: { cursor } },
    )).data;
  },
  async getCatalog(): Promise<Permission[]> {
    return (await api.get<Permission[]>('/permissions/catalog')).data;
  },
  async explainPermission(data: ExplainPermissionDto): Promise<ExplainPermissionResult> {
    const response = await api.post<ExplainPermissionResult>('/permissions/explain', data);
    return response.data;
  },
};
