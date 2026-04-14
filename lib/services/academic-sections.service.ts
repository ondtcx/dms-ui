import api from "@/lib/axios";

export interface AcademicSection {
  id: number;
  name: string;
  gradeId: number;
  maxStudents?: number;
  grade?: {
    name: string;
    level?: {
      name: string;
      educationalLevel: string;
      academicYear?: { name: string };
    };
  };
  teachers?: { id: string; firstName: string; lastName: string; email: string }[];
  _count?: { students: number; teachers: number; documents: number };
}

export interface AcademicSectionsResponse {
  data: AcademicSection[];
  total: number;
}

export const academicSectionsService = {
  getAll: (params?: { gradeId?: number }) =>
    api.get<AcademicSectionsResponse>("/academic-sections", { params }).then((r) => r.data),
  create: (data: { name: string; gradeId: number; maxStudents?: number }) =>
    api.post<AcademicSection>("/academic-sections", data).then((r) => r.data),
  update: (id: number, data: Partial<{ name: string; maxStudents: number }>) =>
    api.patch<AcademicSection>(`/academic-sections/${id}`, data).then((r) => r.data),
  delete: (id: number) => api.delete(`/academic-sections/${id}`).then((r) => r.data),
  addTeacher: (sectionId: number, teacherId: string) =>
    api.post(`/academic-sections/${sectionId}/teachers`, { teacherId }).then((r) => r.data),
  removeTeacher: (sectionId: number, teacherId: string) =>
    api.delete(`/academic-sections/${sectionId}/teachers/${teacherId}`).then((r) => r.data),
};
