import api from "@/lib/axios";
import {
  Document,
  DocumentsResponse,
  UploadDocumentDto,
  DocumentVersion,
  ArchiveStats,
  DashboardSummary,
  Directory,
  CreateDirectoryDto,
  UpdateDirectoryDto,
  AccessibleDirectoriesResponse,
  DirectoryNavigationSummary,
} from "@/lib/types";

export const directoryQueryKeys = {
  summary: ["directory-navigation-summary"] as const,
  accessible: ["directory-accessible"] as const,
};

export const documentsService = {
  async getAll(params?: {
    search?: string;
    categoryId?: number;
    isPublic?: boolean;
    page?: number;
    limit?: number;
    includeDeleted?: boolean;
    onlyMine?: boolean;
    excludeBatched?: boolean;
    batchId?: string;
    academicYearId?: number;
    excludeComposites?: boolean;
    directoryId?: number | null;
  }): Promise<DocumentsResponse> {
    const response = await api.get<DocumentsResponse>("/documents", { params });
    return response.data;
  },

  async getOne(id: number): Promise<Document> {
    const response = await api.get<Document>(`/documents/${id}`);
    return response.data;
  },

  async getDashboardSummary(): Promise<DashboardSummary> {
    const response = await api.get<DashboardSummary>("/documents/dashboard-summary");
    return response.data;
  },

  async upload(file: File, data: UploadDocumentDto): Promise<Document> {
    const formData = new FormData();
    formData.append("file", file);

    if (data.description) formData.append("description", data.description);
    if (data.categoryId) formData.append("categoryId", String(data.categoryId));
    if (data.directoryId !== undefined && data.directoryId !== null) formData.append("directoryId", String(data.directoryId));
    
    // Group academic fields into a nested object and stringify it
    if (data.courseId || data.subjectId || data.academicYearId) {
      formData.append("academic", JSON.stringify({
        ...(data.courseId && { courseId: data.courseId }),
        ...(data.subjectId && { subjectId: data.subjectId }),
        ...(data.academicYearId && { academicYearId: data.academicYearId }),
      }));
    }

    if (data.isPublic !== undefined) {
      formData.append("isPublic", String(data.isPublic));
    }

    const response = await api.post<Document>("/documents/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 60000,
    });

    return response.data;
  },

  async uploadMultiple(
    files: File[],
    data: UploadDocumentDto,
  ): Promise<Document[]> {
    const formData = new FormData();

    files.forEach((file) => {
      formData.append("files", file);
    });

    if (data.description) formData.append("description", data.description);
    if (data.categoryId) formData.append("categoryId", String(data.categoryId));
    if (data.directoryId !== undefined && data.directoryId !== null) formData.append("directoryId", String(data.directoryId));

    if (data.courseId || data.subjectId || data.academicYearId) {
      formData.append("academic", JSON.stringify({
        ...(data.courseId && { courseId: data.courseId }),
        ...(data.subjectId && { subjectId: data.subjectId }),
        ...(data.academicYearId && { academicYearId: data.academicYearId }),
      }));
    }

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
      },
    );

    return response.data;
  },

  async update(
    id: number,
    data: Partial<UploadDocumentDto>,
  ): Promise<Document> {
    const payload: any = { ...data };
    
    if (data.courseId !== undefined || data.subjectId !== undefined || data.academicYearId !== undefined) {
      payload.academic = {
        ...(data.courseId !== undefined && { courseId: data.courseId }),
        ...(data.subjectId !== undefined && { subjectId: data.subjectId }),
        ...(data.academicYearId !== undefined && { academicYearId: data.academicYearId }),
      };
      delete payload.courseId;
      delete payload.subjectId;
      delete payload.academicYearId;
    }

    const response = await api.patch<Document>(`/documents/${id}`, payload);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/documents/${id}`);
  },

  async listDirectories(parentId?: number | null): Promise<Directory[]> {
    const response = await api.get<Directory[]>("/directories", {
      params: parentId === undefined ? undefined : { parentId },
    });
    return response.data;
  },

  async getDirectoryNavigationSummary(): Promise<DirectoryNavigationSummary> {
    const response = await api.get<DirectoryNavigationSummary>("/directories/summary");
    return response.data;
  },

  async getAccessibleDirectories(params?: { page?: number; limit?: number }): Promise<AccessibleDirectoriesResponse> {
    const response = await api.get<AccessibleDirectoriesResponse>("/directories/accessible", { params });
    return response.data;
  },

  async recordDirectoryVisit(id: number, eventId: string): Promise<void> {
    await api.post<void>(`/directories/${id}/visits`, { eventId });
  },

  async getDirectoryBreadcrumb(id: number): Promise<Directory[]> {
    const response = await api.get<Directory[]>(`/directories/${id}/breadcrumb`);
    return response.data;
  },

  async createDirectory(data: CreateDirectoryDto): Promise<Directory> {
    const response = await api.post<Directory>("/directories", data);
    return response.data;
  },

  async updateDirectory(id: number, data: UpdateDirectoryDto): Promise<Directory> {
    const response = await api.patch<Directory>(`/directories/${id}`, data);
    return response.data;
  },

  async deleteDirectory(id: number): Promise<void> {
    await api.delete(`/directories/${id}`);
  },

  async moveToDirectory(id: number, directoryId: number | null): Promise<Document> {
    const response = await api.patch<Document>(`/documents/${id}/directory`, { directoryId });
    return response.data;
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

  async saveContent(id: number, content: string): Promise<Document> {
    const response = await api.put<Document>(`/documents/${id}/content`, { content });
    return response.data;
  },

  async getThumbnail(id: number, updatedAt?: string): Promise<Blob> {
    const response = await api.get(`/documents/${id}/thumbnail`, {
      responseType: "blob",
      params: updatedAt ? { v: new Date(updatedAt).getTime() } : undefined,
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
    const response = await api.get<DocumentVersion[]>(
      `/documents/${id}/versions`,
    );
    return response.data;
  },

  async restoreVersion(id: number, version: number): Promise<Document> {
    const response = await api.post<Document>(
      `/documents/${id}/versions/${version}/restore`,
    );
    return response.data;
  },

  async replaceFile(
    id: number,
    file: File,
    comment?: string,
  ): Promise<Document> {
    const formData = new FormData();
    formData.append("file", file);

    if (comment) {
      formData.append("comment", comment);
    }

    const response = await api.patch<Document>(
      `/documents/${id}/replace`,
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );

    return response.data;
  },

  async updateFromTemplate(
    id: number,
    data: {
      formData: Record<string, unknown>;
      filename?: string;
      description?: string;
      categoryId?: number;
      isPublic?: boolean;
    },
  ): Promise<Document> {
    const response = await api.patch<Document>(`/documents/${id}/from-template`, data);
    return response.data;
  },

  // Soft Delete & Restore
  async restore(id: number): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(
      `/documents/${id}/restore`,
    );
    return response.data;
  },

  async permanentDelete(id: number): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(
      `/documents/${id}/permanent`,
    );
    return response.data;
  },

  // Archivo histórico
  async getArchived(params?: {
    search?: string;
    categoryId?: number;
    page?: number;
    limit?: number;
  }): Promise<DocumentsResponse> {
    const response = await api.get<DocumentsResponse>("/documents/archive", { params });
    return response.data;
  },

  async getArchiveStats(): Promise<ArchiveStats> {
    const response = await api.get<ArchiveStats>("/documents/archive/stats");
    return response.data;
  },

  async restoreFromArchive(id: number): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>(
      `/documents/${id}/restore-from-archive`,
    );
    return response.data;
  },
};
