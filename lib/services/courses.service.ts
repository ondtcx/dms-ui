import api from '@/lib/axios';

export interface Course {
  id: number;
  name: string;
  code: string;
  level: string;
  departmentId: number | null;
  academicYear: string | null;
  isActive: boolean;
}

export interface Subject {
  id: number;
  name: string;
  code: string;
}

export interface CoursesResponse {
  data: Course[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const coursesService = {
  getAll: (params?: { page?: number; limit?: number; level?: string }) =>
    api.get<CoursesResponse>('/courses', { params }).then((r) => r.data),

  getSubjects: (courseId: number) =>
    api.get<Subject[]>(`/courses/${courseId}/subjects`).then((r) => r.data),
};
