import api from '@/lib/axios';

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
  async explainPermission(data: ExplainPermissionDto): Promise<ExplainPermissionResult> {
    const response = await api.post<ExplainPermissionResult>('/permissions/explain', data);
    return response.data;
  },
};
