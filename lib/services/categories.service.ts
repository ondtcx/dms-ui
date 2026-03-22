import api from "@/lib/axios";
import { Category, CreateCategoryDto, UpdateCategoryDto } from "@/lib/types";

export const categoriesService = {
  /** Todas las categorías — usar solo en la página de administración */
  async getAll(): Promise<Category[]> {
    const response = await api.get<Category[]>("/categories");
    return response.data;
  },

  /** Solo categorías activas — usar en todos los dropdowns y selectores */
  async getActive(): Promise<Category[]> {
    const response = await api.get<Category[]>("/categories/active");
    return response.data;
  },

  async getOne(id: number): Promise<Category> {
    const response = await api.get<Category>(`/categories/${id}`);
    return response.data;
  },

  async create(data: CreateCategoryDto): Promise<Category> {
    const response = await api.post<Category>("/categories", data);
    return response.data;
  },

  async update(id: number, data: UpdateCategoryDto): Promise<Category> {
    const response = await api.patch<Category>(`/categories/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<{ message: string }> {
    const response = await api.delete<{ message: string }>(`/categories/${id}`);
    return response.data;
  },
};
