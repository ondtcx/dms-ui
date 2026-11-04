import api from '@/lib/axios';
import type {
  AuthoringDocument,
  AuthoringTemplateActivity,
  AuthoringTemplate,
  AuthoringUser,
  AuthoringFieldsSchema,
  PageFrame,
  SignatureBlock,
} from '@/lib/types/authoring';

export interface AuthoringListResponse {
  data: AuthoringDocument[];
  total: number;
  page: number;
  limit: number;
}

export const authoringService = {
  async listTemplates(includeDrafts = false): Promise<AuthoringTemplate[]> {
    const response = await api.get<AuthoringTemplate[]>('/authoring/templates', {
      params: { includeDrafts },
    });
    return response.data;
  },

  async getTemplate(id: number): Promise<AuthoringTemplate> {
    const response = await api.get<AuthoringTemplate>(`/authoring/templates/${id}`);
    return response.data;
  },

  async createTemplate(payload: {
    name: string;
    description?: string;
    bodyHtml: string;
    styles?: string;
    headerHtml?: string;
    footerHtml?: string;
    marginTop?: string;
    marginBottom?: string;
    marginLeft?: string;
    marginRight?: string;
    pageFrame?: PageFrame;
    signatures?: SignatureBlock;
    fields: AuthoringFieldsSchema;
    pageSize?: string;
    orientation?: string;
    numberPrefix: string;
    duplicatedFromId?: number;
  }): Promise<AuthoringTemplate> {
    const response = await api.post<AuthoringTemplate>('/authoring/templates', payload);
    return response.data;
  },

  async createVersion(
    templateId: number,
    payload: {
      bodyHtml?: string;
      styles?: string;
      headerHtml?: string;
      footerHtml?: string;
      marginTop?: string;
      marginBottom?: string;
      marginLeft?: string;
      marginRight?: string;
      pageFrame?: PageFrame;
      signatures?: SignatureBlock;
      fields?: AuthoringFieldsSchema;
      pageSize?: string;
      orientation?: string;
      numberPrefix?: string;
    },
  ) {
    const response = await api.post(
      `/authoring/templates/${templateId}/versions`,
      payload,
    );
    return response.data;
  },

  async uploadAsset(
    file: File,
  ): Promise<{
    url: string;
    filename: string;
    mimeType: string;
    size: number;
  }> {
    const form = new FormData();
    form.append('file', file);
    const response = await api.post<{
      url: string;
      filename: string;
      mimeType: string;
      size: number;
    }>('/authoring/assets', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    });
    return response.data;
  },

  async cleanupAssets(): Promise<{
    scanned: number;
    deleted: number;
    kept: number;
  }> {
    const response = await api.post<{
      scanned: number;
      deleted: number;
      kept: number;
    }>('/authoring/assets/cleanup');
    return response.data;
  },

  async cropAsset(payload: {
    url: string;
    x: number;
    y: number;
    width: number;
    height: number;
  }): Promise<{
    url: string;
    filename: string;
    mimeType: string;
    size: number;
  }> {
    const response = await api.post<{
      url: string;
      filename: string;
      mimeType: string;
      size: number;
    }>('/authoring/assets/crop', payload);
    return response.data;
  },

  async listTemplateActivity(
    templateId: number,
  ): Promise<AuthoringTemplateActivity[]> {
    const response = await api.get<AuthoringTemplateActivity[]>(
      `/authoring/templates/${templateId}/activity`,
    );
    return response.data;
  },

  async publishVersion(templateId: number, versionId: number) {
    const response = await api.post(
      `/authoring/templates/${templateId}/versions/${versionId}/publish`,
    );
    return response.data;
  },

  async deactivateTemplate(templateId: number) {
    const response = await api.post(`/authoring/templates/${templateId}/deactivate`);
    return response.data;
  },

  async previewTemplate(templateId: number, versionId?: number): Promise<Blob> {
    const response = await api.get(`/authoring/templates/${templateId}/preview`, {
      params: versionId ? { versionId } : undefined,
      responseType: 'blob',
    });
    return response.data;
  },

  async listDocuments(params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<AuthoringListResponse> {
    const response = await api.get<AuthoringListResponse>('/authoring/documents', {
      params,
    });
    return response.data;
  },

  async pendingDocuments(): Promise<AuthoringDocument[]> {
    const response = await api.get<AuthoringDocument[]>('/authoring/documents/pending');
    return response.data;
  },

  async getDocument(id: number): Promise<AuthoringDocument> {
    const response = await api.get<AuthoringDocument>(`/authoring/documents/${id}`);
    return response.data;
  },

  async createDocument(payload: {
    templateVersionId: number;
    formData?: Record<string, any>;
  }): Promise<AuthoringDocument> {
    const response = await api.post<AuthoringDocument>('/authoring/documents', payload);
    return response.data;
  },

  async saveDraft(
    id: number,
    payload: {
      formData: Record<string, any>;
      createVersion?: boolean;
      pageFrame?: PageFrame;
    },
  ): Promise<AuthoringDocument> {
    const response = await api.put<AuthoringDocument>(
      `/authoring/documents/${id}/draft`,
      payload,
    );
    return response.data;
  },

  async submit(
    id: number,
    payload: { reviewerId?: string; reviewerName?: string } = {},
  ): Promise<AuthoringDocument> {
    const response = await api.post<AuthoringDocument>(
      `/authoring/documents/${id}/submit`,
      payload,
    );
    return response.data;
  },

  async approve(
    id: number,
    payload: { observation?: string } = {},
  ): Promise<AuthoringDocument> {
    const response = await api.post<AuthoringDocument>(
      `/authoring/documents/${id}/approve`,
      payload,
    );
    return response.data;
  },

  async returnDocument(
    id: number,
    payload: { observation: string },
  ): Promise<AuthoringDocument> {
    const response = await api.post<AuthoringDocument>(
      `/authoring/documents/${id}/return`,
      payload,
    );
    return response.data;
  },

  async emit(id: number): Promise<AuthoringDocument> {
    const response = await api.post<AuthoringDocument>(`/authoring/documents/${id}/emit`);
    return response.data;
  },

  async archive(id: number): Promise<AuthoringDocument> {
    const response = await api.post<AuthoringDocument>(`/authoring/documents/${id}/archive`);
    return response.data;
  },

  async previewDocument(id: number): Promise<Blob> {
    const response = await api.get(`/authoring/documents/${id}/preview`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async downloadDocument(id: number): Promise<Blob> {
    const response = await api.get(`/authoring/documents/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async batch(payload: {
    templateVersionId: number;
    commonFormData?: Record<string, any>;
    recipients: Array<{ formData: Record<string, any> }>;
  }) {
    const response = await api.post('/authoring/documents/batch', payload);
    return response.data;
  },

  async listUsers(): Promise<AuthoringUser[]> {
    const response = await api.get<AuthoringUser[]>('/authoring/users');
    return response.data;
  },
};
