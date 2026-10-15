import api from "@/lib/axios";
import { ResetTokenResponse, User } from "@/lib/types";

export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
  role?: string;
  catalogRoleId?: number;
}

export const usersService = {
  async getAll(): Promise<User[]> {
    const response = await api.get<User[]>("/users");
    return response.data;
  },

  async getAllForSelection(): Promise<
    { id: string; name: string; email: string }[]
  > {
    const response =
      await api.get<{ id: string; name: string; email: string }[]>(
        `/users/for-selection`,
      );
    return response.data;
  },

  async getOne(id: string): Promise<User> {
    const response = await api.get<User>(`/users/${id}`);
    return response.data;
  },

  async create(data: CreateUserDto): Promise<User> {
    const response = await api.post<User>("/users", data);
    return response.data;
  },

  async update(id: string, data: Partial<CreateUserDto>): Promise<User> {
    const response = await api.patch<User>(`/users/${id}`, data);
    return response.data;
  },

  async assignRole(userId: string, roleId: number): Promise<User> {
    const response = await api.post<User>(`/roles/${roleId}/assign/${userId}`);
    return response.data;
  },

  async unassignRole(userId: string, roleId: number): Promise<User> {
    const response = await api.post<User>(`/roles/${roleId}/unassign/${userId}`);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  },

  async generateResetToken(userId: string): Promise<ResetTokenResponse> {
    const response = await api.post<ResetTokenResponse>(
      "/auth/admin/generate-reset-token",
      { userId },
    );
    return response.data;
  },
};
