import api from "@/lib/axios";

export type EducationalLevel = "PREESCOLAR" | "PRIMARIA" | "SECUNDARIA" | "BACHILLERATO" | "UNIVERSIDAD";

export interface Level {
  id: number;
  name: string;
  educationalLevel: EducationalLevel;
  academicYearId: number;
  order: number;
  academicYear?: { name: string };
  _count?: { grades: number; sections: number; documents: number };
}

export interface LevelsResponse {
  data: Level[];
  total: number;
}

export const levelsService = {
  getAll: (params?: { academicYearId?: number }) =>
    api.get<LevelsResponse>("/levels", { params }).then((r) => r.data),
  create: (data: { name: string; educationalLevel: EducationalLevel; academicYearId: number; order?: number }) =>
    api.post<Level>("/levels", data).then((r) => r.data),
  update: (id: number, data: Partial<{ name: string; educationalLevel: EducationalLevel; order: number }>) =>
    api.patch<Level>(`/levels/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/levels/${id}`).then((r) => r.data),
};
