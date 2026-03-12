import api from "@/lib/axios";

// Types
export interface Department {
  id: number;
  name: string;
  code: string;
  description?: string;
  color: string;
  icon: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    users: number;
    courses: number;
  };
}

export interface DepartmentsResponse {
  data: Department[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface DepartmentStats {
  total: number;
  active: number;
  inactive: number;
}

export interface CreateDepartmentDto {
  name: string;
  code: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive?: boolean;
}

export interface UpdateDepartmentDto {
  name?: string;
  code?: string;
  description?: string;
  color?: string;
  icon?: string;
  isActive?: boolean;
}

export interface AssignUserDto {
  userId: number;
}

export const departmentsService = {
  async getAll(params?: {
    search?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
  }): Promise<DepartmentsResponse> {
    const response = await api.get<DepartmentsResponse>("/departments", { params });
    return response.data;
  },

  async getOne(id: number): Promise<Department> {
    const response = await api.get<Department>(`/departments/${id}`);
    return response.data;
  },

  async getStats(): Promise<DepartmentStats> {
    const response = await api.get<DepartmentStats>("/departments/stats");
    return response.data;
  },

  async create(data: CreateDepartmentDto): Promise<Department> {
    const response = await api.post<Department>("/departments", data);
    return response.data;
  },

  async update(id: number, data: UpdateDepartmentDto): Promise<Department> {
    const response = await api.patch<Department>(`/departments/${id}`, data);
    return response.data;
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/departments/${id}`);
  },

  async assignUser(departmentId: number, userId: string): Promise<void> {
    await api.post(`/departments/${departmentId}/users`, { userId });
  },

  async removeUser(departmentId: number, userId: string): Promise<void> {
    await api.delete(`/departments/${departmentId}/users/${userId}`);
  },

  async getUsers(
    departmentId: number,
  ): Promise<
    { id: string; name: string; email: string; role: string; position: string | null }[]
  > {
    const response = await api.get(`/departments/${departmentId}/users`);
    return response.data;
  },
};
