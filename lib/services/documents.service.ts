import api from "@/lib/axios";
import type { AxiosProgressEvent } from "axios";
import { validOriginDate } from "@/lib/upload-date";
import {
  Document,
  DocumentsResponse,
  UploadDocumentDto,
  UpdateDocumentDto,
  DocumentVersion,
  VersionRetentionUpdate,
  ArchiveStats,
  DashboardSummary,
  DocumentListView,
  DocumentAuditPage,
  DocumentAuditPageWire,
  DocumentAuditQuery,
  Directory,
  CreateDirectoryDto,
  UpdateDirectoryDto,
  AccessibleDirectoriesResponse,
  DirectoryNavigationSummary,
  ReceptionSettings,
  ConfigureReception,
  DirectoryMembership,
  DirectoryParticipantInput,
  DirectoryUserParticipant,
  DirectoryRoleParticipant,
  DirectoryDelegate,
  DirectoryRecipientUser,
  DirectoryRecipientRole,
} from "@/lib/types";
import {
  delegatePayload,
  isNonEmptyString,
  isPositiveInt,
  participantPayload,
  roleRecipientParams,
  userRecipientParams,
  type DelegateFlagsInput,
} from "@/lib/reception-membership";

export const directoryQueryKeys = {
  summary: ["directory-navigation-summary"] as const,
  accessible: ["directory-accessible"] as const,
  reception: ["directory-reception"] as const,
};

function uploadFields(data: UploadDocumentDto) {
  for (const value of [data.name, data.documentNumber]) {
    if (value !== undefined && typeof value !== "string") {
      throw new Error("El nombre y el número institucional deben ser texto");
    }
  }
  if (
    (data.documentTypeId !== undefined &&
      data.documentTypeId !== null &&
      (!Number.isInteger(data.documentTypeId) || data.documentTypeId < 1)) ||
    (data.originDate !== undefined && !validOriginDate(data.originDate))
  ) {
    throw new Error(
      "Verifica el tipo de documento y la fecha de origen",
    );
  }
  return {
    ...(data.name?.trim() ? { name: data.name.trim() } : {}),
    ...(data.documentNumber?.trim() ? { documentNumber: data.documentNumber.trim() } : {}),
    ...(data.description?.trim() ? { description: data.description.trim() } : {}),
    // `null`/omitido representa el tipo genérico: el contrato de creación
    // normaliza la omisión a null, así que no se serializa un id 0/"null".
    ...(data.documentTypeId === undefined || data.documentTypeId === null
      ? {}
      : { documentTypeId: data.documentTypeId }),
    ...(data.originDate === undefined ? {} : { originDate: data.originDate }),
    ...(data.categoryId === undefined ? {} : { categoryId: data.categoryId }),
    ...(data.isPublic === undefined ? {} : { isPublic: data.isPublic }),
  };
}

function uploadProgress(onProgress?: (percentage: number) => void) {
  return (event: AxiosProgressEvent) => {
    if (event.total && event.total > 0)
      onProgress?.(
        Math.min(
          100,
          Math.max(0, Math.round((event.loaded * 100) / event.total)),
        ),
      );
  };
}

export const documentsService = {
  async getAll(params?: {
    search?: string;
    categoryId?: number;
    documentTypeId?: number;
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
    view?: DocumentListView;
  }): Promise<DocumentsResponse> {
    const response = await api.get<DocumentsResponse>("/documents", {
      params: params?.directoryId === null ? { ...params, directoryId: "null" } : params,
    });
    return response.data;
  },

  async getOne(id: number): Promise<Document> {
    const response = await api.get<Document>(`/documents/${id}`);
    return response.data;
  },

  async getAudit(
    id: number,
    params?: DocumentAuditQuery,
  ): Promise<DocumentAuditPage> {
    const response = await api.get<DocumentAuditPageWire>(
      `/documents/${id}/audit`,
      { params },
    );
    const result = response.data;
    return {
      ...result,
      totalPages: result.totalPages ?? Math.ceil(result.total / result.limit),
    };
  },

  async getDashboardSummary(): Promise<DashboardSummary> {
    const response = await api.get<DashboardSummary>(
      "/documents/dashboard-summary",
    );
    return response.data;
  },

  async upload(
    file: File,
    data: UploadDocumentDto,
    onProgress?: (percentage: number) => void,
  ): Promise<Document> {
    const fields = uploadFields(data);
    const formData = new FormData();
    formData.append("file", file);

    Object.entries(fields).forEach(([key, value]) =>
      formData.append(key, String(value)),
    );
    if (data.directoryId !== undefined && data.directoryId !== null)
      formData.append("directoryId", String(data.directoryId));

    const response = await api.post<Document>("/documents/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      timeout: 60000,
      onUploadProgress: uploadProgress(onProgress),
    });

    return response.data;
  },

  async uploadMultiple(
    files: File[],
    data: UploadDocumentDto[],
    directoryId?: number | null,
    onProgress?: (percentage: number) => void,
  ): Promise<Document[]> {
    if (!files.length || files.length > 10 || data.length !== files.length)
      throw new Error(
        "Debe existir un conjunto de metadatos por archivo, con un máximo de 10 archivos",
      );
    const metadata = data.map(uploadFields);
    const formData = new FormData();

    files.forEach((file) => {
      formData.append("files", file);
    });

    formData.append("metadata", JSON.stringify(metadata));
    if (directoryId !== undefined && directoryId !== null)
      formData.append("directoryId", String(directoryId));

    const response = await api.post<Document[]>(
      "/documents/upload-multiple",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        timeout: 60000,
        onUploadProgress: uploadProgress(onProgress),
      },
    );

    return response.data;
  },

  async update(id: number, data: UpdateDocumentDto): Promise<Document> {
    const payload: any = { ...data };

    if (
      data.courseId !== undefined ||
      data.subjectId !== undefined ||
      data.academicYearId !== undefined
    ) {
      payload.academic = {
        ...(data.courseId !== undefined && { courseId: data.courseId }),
        ...(data.subjectId !== undefined && { subjectId: data.subjectId }),
        ...(data.academicYearId !== undefined && {
          academicYearId: data.academicYearId,
        }),
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
    const response = await api.get<DirectoryNavigationSummary>(
      "/directories/summary",
    );
    return response.data;
  },

  async getAccessibleDirectories(params?: {
    page?: number;
    limit?: number;
  }): Promise<AccessibleDirectoriesResponse> {
    const response = await api.get<AccessibleDirectoriesResponse>(
      "/directories/accessible",
      { params },
    );
    return response.data;
  },

  async recordDirectoryVisit(id: number, eventId: string): Promise<void> {
    await api.post<void>(`/directories/${id}/visits`, { eventId });
  },

  async getDirectoryBreadcrumb(id: number): Promise<Directory[]> {
    const response = await api.get<Directory[]>(
      `/directories/${id}/breadcrumb`,
    );
    const location = response.data.find((directory) => directory.id === id);
    if (!location) throw new Error("No se pudo consultar la carpeta.");
    // Los antecesores siguen siendo solo navegación; el nivel actual recibe
    // metadatos y capacidades vigentes, incluido el estado de recepción.
    const siblings = await documentsService.listDirectories(location.parentId);
    const current = siblings.find((directory) => directory.id === id);
    if (!current) throw new Error("La carpeta ya no está disponible.");
    return response.data.map((directory) => directory.id === id ? current : directory);
  },

  async getDirectoryContext(id: number): Promise<{ directory: Directory; breadcrumb: Directory[]; reception?: ReceptionSettings }> {
    const breadcrumb = await documentsService.getDirectoryBreadcrumb(id);
    const location = breadcrumb.find((directory) => directory.id === id);
    if (!location) throw new Error("No se pudo consultar la carpeta.");
    const directory = location;
    const reception = directory.receptionEnabled
      ? await documentsService.getReception(id)
      : undefined;
    return { directory, breadcrumb, reception };
  },

  async createDirectory(data: CreateDirectoryDto): Promise<Directory> {
    const response = await api.post<Directory>("/directories", data);
    return response.data;
  },

  async updateDirectory(
    id: number,
    data: UpdateDirectoryDto,
  ): Promise<Directory> {
    const response = await api.patch<Directory>(`/directories/${id}`, data);
    return response.data;
  },

  async deleteDirectory(id: number): Promise<void> {
    await api.delete(`/directories/${id}`);
  },

  async getReception(id: number): Promise<ReceptionSettings> {
    const response = await api.get<ReceptionSettings>(
      `/directories/${id}/reception`,
    );
    return response.data;
  },

  async configureReception(
    id: number,
    data: ConfigureReception,
  ): Promise<ReceptionSettings> {
    const payload: ConfigureReception = { enabled: data.enabled };
    if (data.singleDocumentPerParticipant !== undefined)
      payload.singleDocumentPerParticipant = data.singleDocumentPerParticipant;
    const response = await api.patch<ReceptionSettings>(
      `/directories/${id}/reception`,
      payload,
    );
    return response.data;
  },

  async getReceptionMembership(id: number): Promise<DirectoryMembership> {
    if (!isPositiveInt(id)) throw new Error("Identificador de carpeta no válido");
    const response = await api.get<DirectoryMembership>(
      `/directories/${id}/reception/membership`,
    );
    return response.data;
  },

  async setReceptionParticipant(
    id: number,
    data: DirectoryParticipantInput,
  ): Promise<DirectoryUserParticipant | DirectoryRoleParticipant> {
    if (!isPositiveInt(id)) throw new Error("Identificador de carpeta no válido");
    const payload = participantPayload(data);
    const response = await api.post<
      DirectoryUserParticipant | DirectoryRoleParticipant
    >(`/directories/${id}/reception/participants`, payload);
    return response.data;
  },

  async removeReceptionUserParticipant(
    id: number,
    userId: string,
  ): Promise<{ removed: true }> {
    if (!isPositiveInt(id)) throw new Error("Identificador de carpeta no válido");
    if (!isNonEmptyString(userId))
      throw new Error("Identificador de usuario no válido");
    const response = await api.delete<{ removed: true }>(
      `/directories/${id}/reception/participants/users/${encodeURIComponent(userId)}`,
    );
    return response.data;
  },

  async removeReceptionRoleParticipant(
    id: number,
    roleId: number,
  ): Promise<{ removed: true }> {
    if (!isPositiveInt(id) || !isPositiveInt(roleId))
      throw new Error("Identificador de rol no válido");
    const response = await api.delete<{ removed: true }>(
      `/directories/${id}/reception/participants/roles/${roleId}`,
    );
    return response.data;
  },

  async setReceptionDelegate(
    id: number,
    userId: string,
    flags: DelegateFlagsInput,
  ): Promise<DirectoryDelegate> {
    if (!isPositiveInt(id)) throw new Error("Identificador de carpeta no válido");
    if (!isNonEmptyString(userId))
      throw new Error("Identificador de usuario no válido");
    const payload = delegatePayload(flags);
    const response = await api.patch<DirectoryDelegate>(
      `/directories/${id}/reception/delegates/${encodeURIComponent(userId)}`,
      payload,
    );
    return response.data;
  },

  async removeReceptionDelegate(
    id: number,
    userId: string,
  ): Promise<{ removed: true }> {
    if (!isPositiveInt(id)) throw new Error("Identificador de carpeta no válido");
    if (!isNonEmptyString(userId))
      throw new Error("Identificador de usuario no válido");
    const response = await api.delete<{ removed: true }>(
      `/directories/${id}/reception/delegates/${encodeURIComponent(userId)}`,
    );
    return response.data;
  },

  async searchReceptionUserRecipients(
    id: number,
    q: string,
    limit = 20,
  ): Promise<DirectoryRecipientUser[]> {
    if (!isPositiveInt(id)) throw new Error("Identificador de carpeta no válido");
    const params = userRecipientParams(q, limit);
    const response = await api.get<DirectoryRecipientUser[]>(
      `/directories/${id}/reception/recipients/users`,
      { params },
    );
    return response.data;
  },

  async searchReceptionRoleRecipients(
    id: number,
    q?: string,
    limit = 20,
  ): Promise<DirectoryRecipientRole[]> {
    if (!isPositiveInt(id)) throw new Error("Identificador de carpeta no válido");
    const params = roleRecipientParams(q, limit);
    const response = await api.get<DirectoryRecipientRole[]>(
      `/directories/${id}/reception/recipients/roles`,
      { params },
    );
    return response.data;
  },

  async moveToDirectory(
    id: number,
    directoryId: number | null,
  ): Promise<Document> {
    const response = await api.patch<Document>(`/documents/${id}/directory`, {
      directoryId,
    });
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
    const response = await api.put<Document>(`/documents/${id}/content`, {
      content,
    });
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

  async updateVersionRetention(id: number, version: number, data: VersionRetentionUpdate): Promise<DocumentVersion> {
    const payload = data.mode === "until"
      ? { mode: data.mode, preserveUntil: data.preserveUntil }
      : { mode: data.mode };
    const response = await api.patch<DocumentVersion>(`/documents/${id}/versions/${version}/retention`, payload);
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
    const response = await api.patch<Document>(
      `/documents/${id}/from-template`,
      data,
    );
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
    const response = await api.get<DocumentsResponse>("/documents/archive", {
      params,
    });
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
