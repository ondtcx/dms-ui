import api from "@/lib/axios";
import {
  Section,
  SectionsResponse,
  CreateSectionDto,
  UpdateSectionDto,
  SectionStats,
} from "@/lib/types";

export const sectionsService = {
  /**
   * Listar secciones con filtros y paginación
   */
  async getAll(params?: {
    search?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<SectionsResponse> {
    const response = await api.get<SectionsResponse>("/sections", { params });
    return response.data;
  },

  /**
   * Obtener una sección específica por ID
   */
  async getOne(id: number): Promise<Section> {
    const response = await api.get<Section>(`/sections/${id}`);
    return response.data;
  },

  /**
   * Obtener estadísticas de secciones (para cards de acceso rápido)
   */
  async getStats(): Promise<SectionStats[]> {
    const response = await api.get<SectionStats[]>("/sections/stats");
    return response.data;
  },

  /**
   * Crear una nueva sección (solo admin)
   */
  async create(data: CreateSectionDto): Promise<Section> {
    const response = await api.post<Section>("/sections", data);
    return response.data;
  },

  /**
   * Actualizar una sección existente (solo admin)
   */
  async update(id: number, data: UpdateSectionDto): Promise<Section> {
    const response = await api.patch<Section>(`/sections/${id}`, data);
    return response.data;
  },

  /**
   * Eliminar una sección (solo admin)
   */
  async delete(id: number): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/sections/${id}`);
    return response.data;
  },
};
