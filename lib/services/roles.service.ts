import api from "@/lib/axios";
import { CatalogRole, RoleMutationDto } from "@/lib/types";

export type Role = CatalogRole;

export const rolesService = {
  async getAll(): Promise<Role[]> {
    return (await api.get<Role[]>("/roles")).data;
  },
  async create(data: Pick<RoleMutationDto, "key" | "label"> & Pick<RoleMutationDto, "permissionKeys">): Promise<Role> {
    return (await api.post<Role>("/roles", data)).data;
  },
  async update(id: number, data: Omit<RoleMutationDto, "key">): Promise<Role> {
    return (await api.patch<Role>(`/roles/${id}`, data)).data;
  },
  async deactivate(id: number): Promise<Role> {
    return (await api.post<Role>(`/roles/${id}/deactivate`)).data;
  },
};
