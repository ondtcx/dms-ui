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

export const permissionsService = {
  async getCatalog(): Promise<Permission[]> {
    return (await api.get<Permission[]>('/permissions/catalog')).data;
  },
  async explainPermission(data: ExplainPermissionDto): Promise<ExplainPermissionResult> {
    const response = await api.post<ExplainPermissionResult>('/permissions/explain', data);
    return response.data;
  },
};
