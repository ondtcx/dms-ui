import api from "@/lib/axios";
import { type RoleSummary } from "@/lib/types";

export const rolesService = {
  async getAll(): Promise<RoleSummary[]> {
    const response = await api.get<RoleSummary[]>("/role");
    return response.data;
  },
};
