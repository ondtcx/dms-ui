import api from "@/lib/axios";
import { Document, DocumentsResponse, UploadDocumentDto, DocumentVersion } from "@/lib/types";

export const documentsService = {
  async getAll(params?: {
    search?: string;
    categoryId?: number;
    sectionId?: number;
    isPublic?: boolean;
    page?: number;
    limit?: number;
    includeDeleted?: boolean;
  }): Promise<DocumentsResponse> {
    const response = await api.get<DocumentsResponse>("/documents", { params });
    return response.data;
  },

  async getOne(id: number): Promise<Document> {
    const response = await api.get<Document>(`/documents/${id}`);
    return response.data;
  },

  async upload(file: File, data: UploadDocumentDto): Promise<Document> {
    const formData = new FormData();
    formData.append("file", file);

    if (data.description) formData.append("description", data.description);
    if (data.categoryId) formData.append("categoryId", String(data.categoryId));
    if (data.sectionId) formData.append("sectionId", String(data.sectionId));

    if (data.isPublic !== undefined) {
      formData.append("isPublic", String(data.isPublic));
    }

    const response = await api.post<Document>("/documents/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  },

  async uploadMultiple(
    files: File[],
    data: UploadDocumentDto
  ): Promise<Document[]> {
    const formData = new FormData();

    files.forEach((file) => {
      formData.append("files", file);
    });

    if (data.description) formData.append("description", data.description);
    if (data.categoryId) formData.append("categoryId", String(data.categoryId));
    if (data.sectionId) formData.append("sectionId", String(data.sectionId));

    if (data.isPublic !== undefined) {
      formData.append("isPublic", String(data.isPublic));
    }

    const response = await api.post<Document[]>(
      "/documents/upload-multiple",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    return response.data;
  },

  async update(
    id: number,
    data: Partial<UploadDocumentDto>
  ): Promise<Document> {
    const response = await api.patch<Document>(`/documents/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/documents/${id}`);
  },

  async download(id: number): Promise<Blob> {
    const response = await api.get(`/documents/${id}/download`, {
      responseType: "blob",
    });
    return response.data;
  },

  async view(id: number): Promise<Blob> {
    const response = await api.get(`/documents/${id}/view`, {
      responseType: "blob",
    });
    return response.data;
  },

  async getThumbnail(id: number): Promise<Blob> {
    const response = await api.get(`/documents/${id}/thumbnail`, {
      responseType: "blob",
    });
    return response.data;
  },

  async getStats(): Promise<{
    totalDocuments: number;
    totalSize: number;
    totalSizeMB: string;
  }> {
    const response = await api.get("/documents/stats");
    return response.data;
  },

  // Versionado
  async getVersions(id: number): Promise<DocumentVersion[]> {
    const response = await api.get<DocumentVersion[]>(`/documents/${id}/versions`);
    return response.data;
  },

  async restoreVersion(id: number, version: number): Promise<Document> {
    const response = await api.post<Document>(`/documents/${id}/versions/${version}/restore`);
    return response.data;
  },

  async replaceFile(id: number, file: File, comment?: string): Promise<Document> {
    const formData = new FormData();
    formData.append("file", file);

    if (comment) {
      formData.append("comment", comment);
    }

    const response = await api.patch<Document>(`/documents/${id}/replace`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  },

  // Soft Delete & Restore
  async restore(id: number): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(`/documents/${id}/restore`);
    return response.data;
  },

  async permanentDelete(id: number): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/documents/${id}/permanent`);
    return response.data;
  },

};
