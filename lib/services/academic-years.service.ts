import api from '@/lib/axios';
import { AcademicYear, AcademicYearListResponse } from '@/lib/types';

export const academicYearsService = {
  getAll: (): Promise<AcademicYearListResponse> =>
    api.get('/academic-years').then((r) => r.data),

  getCurrent: (): Promise<AcademicYear | null> =>
    api.get('/academic-years/current').then((r) => r.data),

  getOne: (id: number): Promise<AcademicYear> =>
    api.get(`/academic-years/${id}`).then((r) => r.data),

  create: (data: {
    name: string;
    startDate: string;
    endDate: string;
    isActive?: boolean;
    isCurrent?: boolean;
  }): Promise<AcademicYear> =>
    api.post('/academic-years', data).then((r) => r.data),

  update: (id: number, data: Partial<AcademicYear>): Promise<AcademicYear> =>
    api.patch(`/academic-years/${id}`, data).then((r) => r.data),

  setCurrent: (id: number): Promise<AcademicYear> =>
    api.patch(`/academic-years/${id}/set-current`).then((r) => r.data),

  deactivate: (id: number): Promise<AcademicYear> =>
    api.patch(`/academic-years/${id}/deactivate`).then((r) => r.data),
};
