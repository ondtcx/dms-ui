import api from "@/lib/axios";

export interface Grade {
  id: number;
  name: string;
  levelId: number;
  order: number;
  level?: {
    name: string;
    educationalLevel: string;
    academicYear?: { name: string };
  };
  _count?: { sections: number; documents: number };
}

export interface GradesResponse {
  data: Grade[];
  total: number;
}

export const gradesService = {
  getAll: (params?: { levelId?: number }) =>
    api.get<GradesResponse>("/grades", { params }).then((r) => r.data),
  create: (data: { name: string; levelId: number; order?: number }) =>
    api.post<Grade>("/grades", data).then((r) => r.data),
  update: (id: number, data: Partial<{ name: string; order: number }>) =>
    api.patch<Grade>(`/grades/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/grades/${id}`).then((r) => r.data),
};
