import api from "@/lib/axios";
import {
  DocumentTemplate,
  DocumentTemplatesResponse,
  CreateDocumentTemplateDto,
  UpdateDocumentTemplateDto,
  CreateDocumentFromTemplateDto,
  CreateBatchFromTemplateDto,
  CreateBatchResult,
  TemplateType,
  Document,
} from "@/lib/types";

export const templatesService = {
  /**
   * Listar plantillas con filtros y paginación
   */
  async getAll(params?: {
    search?: string;
    type?: string;
    categoryId?: number;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<DocumentTemplatesResponse> {
    const response = await api.get<DocumentTemplatesResponse>(
      "/document-templates",
      { params }
    );
    return response.data;
  },

  /**
   * Obtener una plantilla específica por ID
   */
  async getOne(id: number): Promise<DocumentTemplate> {
    const response = await api.get<DocumentTemplate>(
      `/document-templates/${id}`
    );
    return response.data;
  },

  /**
   * Obtener tipos de plantillas disponibles
   */
  async getTypes(): Promise<TemplateType[]> {
    const response = await api.get<TemplateType[]>(
      "/document-templates/types"
    );
    return response.data;
  },

  /**
   * Crear una nueva plantilla
   */
  async create(
    data: CreateDocumentTemplateDto
  ): Promise<DocumentTemplate> {
    const response = await api.post<DocumentTemplate>(
      "/document-templates",
      data
    );
    return response.data;
  },

  /**
   * Actualizar una plantilla existente
   */
  async update(
    id: number,
    data: UpdateDocumentTemplateDto
  ): Promise<DocumentTemplate> {
    const response = await api.patch<DocumentTemplate>(
      `/document-templates/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Eliminar una plantilla
   */
  async delete(id: number): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(
      `/document-templates/${id}`
    );
    return response.data;
  },

  /**
   * Crear un documento desde una plantilla
   */
  async createDocumentFromTemplate(
    data: CreateDocumentFromTemplateDto
  ): Promise<Document> {
    const response = await api.post<Document>(
      "/documents/from-template",
      data
    );
    return response.data;
  },

  /**
   * Generar documentos en lote desde una plantilla
   */
  async createBatchFromTemplate(data: CreateBatchFromTemplateDto): Promise<CreateBatchResult> {
    const response = await api.post<CreateBatchResult>("/documents/batch-from-template", data, {
      timeout: 300000,
    });
    return response.data;
  },

  /**
   * Obtener vista previa de una plantilla como PDF
   */
  async preview(id: number): Promise<Blob> {
    const response = await api.get(`/document-templates/${id}/preview`, {
      responseType: "blob",
    });
    return response.data;
  },

  /**
   * Obtener thumbnail de una plantilla
   */
  async getThumbnail(id: number): Promise<Blob> {
    const response = await api.get(`/document-templates/${id}/thumbnail`, {
      responseType: "blob",
      timeout: 60000, // Puppeteer puede tardar bastante en generar el PDF
      silentErrors: [404, 503],
    });
    return response.data;
  },
};
