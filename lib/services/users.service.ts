import api from "@/lib/axios";
import { User } from "@/lib/types";

export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
  role?: string;
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

  async getOne(id: number): Promise<User> {
    const response = await api.get<User>(`/users/${id}`);
    return response.data;
  },

  async create(data: CreateUserDto): Promise<User> {
    const response = await api.post<User>("/users", data);
    return response.data;
  },

  async update(id: number, data: Partial<CreateUserDto>): Promise<User> {
    const response = await api.patch<User>(`/users/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/users/${id}`);
  },
};
