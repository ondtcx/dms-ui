import api from "@/lib/axios";
import {
  DocumentType,
  CreateDocumentTypeDto,
  UpdateDocumentTypeDto,
} from "@/lib/types";

export const documentTypesService = {
  /** Todos los subtipos — usar en la página de administración */
  async getAll(categoryId?: number): Promise<DocumentType[]> {
    const response = await api.get<DocumentType[]>("/document-types", {
      params: categoryId ? { categoryId } : undefined,
    });
    return response.data;
  },

  /** Solo subtipos activos — usar en dropdowns y selectores */
  async getActive(categoryId?: number): Promise<DocumentType[]> {
    const response = await api.get<DocumentType[]>("/document-types/active", {
      params: categoryId ? { categoryId } : undefined,
    });
    return response.data;
  },

  async getOne(id: number): Promise<DocumentType> {
    const response = await api.get<DocumentType>(`/document-types/${id}`);
    return response.data;
  },

  async create(data: CreateDocumentTypeDto): Promise<DocumentType> {
    const response = await api.post<DocumentType>("/document-types", data);
    return response.data;
  },

  async update(id: number, data: UpdateDocumentTypeDto): Promise<DocumentType> {
    const response = await api.patch<DocumentType>(`/document-types/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/document-types/${id}`);
    return response.data;
  },
};
