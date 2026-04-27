import api from "@/lib/axios";
import { normalizeUser } from "@/lib/auth/normalizers";
import { User } from "@/lib/types";

export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
  roleId?: string;
}

function sanitizeUserPayload<T extends Partial<CreateUserDto>>(data: T): T {
  const payload = { ...data };

  if (typeof payload.roleId === "string" && payload.roleId.trim() === "") {
    delete payload.roleId;
  }

  return payload;
}

export const usersService = {
  async getAll(): Promise<User[]> {
    const response = await api.get<User[]>("/users");
    return response.data.map((user) => normalizeUser(user));
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
    return normalizeUser(response.data);
  },

  async create(data: CreateUserDto): Promise<User> {
    const response = await api.post<User>("/users", sanitizeUserPayload(data));
    return normalizeUser(response.data);
  },

  async update(id: string, data: Partial<CreateUserDto>): Promise<User> {
    const response = await api.patch<User>(
      `/users/${id}`,
      sanitizeUserPayload(data),
    );
    return normalizeUser(response.data);
  },

  async delete(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  },
};
