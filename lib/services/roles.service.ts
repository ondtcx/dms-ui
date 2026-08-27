import api from "@/lib/axios";

export interface Role {
  id: number;
  key: string;
  label: string;
  isActive: boolean;
}

export const rolesService = {
  async getAll(): Promise<Role[]> {
    return (await api.get<Role[]>("/roles")).data;
  },
  async create(data: Pick<Role, "key" | "label">): Promise<Role> {
    return (await api.post<Role>("/roles", data)).data;
  },
};
