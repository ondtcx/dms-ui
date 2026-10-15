import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AcademicYearsManager } from '../AcademicYearsManager';
import { academicYearsService } from '@/lib/services/academic-years.service';
import toast from 'react-hot-toast';

jest.mock('@/lib/services/academic-years.service', () => ({
  academicYearsService: {
    getAll: jest.fn(), create: jest.fn(), update: jest.fn(),
    setCurrent: jest.fn(), deactivate: jest.fn(),
  },
}));
jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

const service = academicYearsService as jest.Mocked<typeof academicYearsService>;
const year = {
  id: 1, name: '2026-2027', startDate: '2026-09-01T00:00:00.000Z',
  endDate: '2027-06-30T00:00:00.000Z', isActive: true, isCurrent: false,
};

describe('catalog mutation settings refresh', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    service.getAll.mockResolvedValue({ data: [year], total: 1 } as any);
    service.create.mockResolvedValue(year as any);
    service.update.mockResolvedValue(year as any);
    service.setCurrent.mockResolvedValue(year as any);
    service.deactivate.mockResolvedValue(year as any);
  });

  it.each(['create', 'update', 'setCurrent', 'deactivate'] as const)('invalidates catalog and Settings after %s succeeds', async (mutation) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    render(<QueryClientProvider client={client}><AcademicYearsManager /></QueryClientProvider>);
    await screen.findByText(year.name);

    if (mutation === 'create') {
      fireEvent.click(screen.getByRole('button', { name: 'New Year' }));
      fireEvent.change(screen.getByLabelText('Nombre *'), { target: { value: '2027-2028' } });
      fireEvent.change(screen.getByLabelText('Fecha de Inicio *'), { target: { value: '2027-09-01' } });
      fireEvent.change(screen.getByLabelText('Fecha de Fin *'), { target: { value: '2028-06-30' } });
      fireEvent.click(screen.getByRole('button', { name: 'Crear' }));
    } else if (mutation === 'setCurrent') {
      fireEvent.click(screen.getByRole('button', { name: 'Marcar como actual' }));
    } else {
      fireEvent.click(screen.getByRole('button', {
        name: `${mutation === 'update' ? 'Editar' : 'Eliminar'} ${year.name}`,
      }));
      fireEvent.click(await screen.findByRole('button', { name: mutation === 'update' ? 'Actualizar' : 'Eliminar' }));
    }

    await waitFor(() => expect(service[mutation]).toHaveBeenCalled());
    if (mutation === 'create') {
      expect(service.create.mock.calls[0][0]).toEqual({
        name: '2027-2028', startDate: '2027-09-01', endDate: '2028-06-30',
        isActive: true, isCurrent: false,
      });
    } else if (mutation === 'update') {
      expect(service.update).toHaveBeenCalledWith(year.id, {
        name: year.name, startDate: '2026-09-01', endDate: '2027-06-30',
        isActive: true, isCurrent: false,
      });
    } else {
      expect(service[mutation].mock.calls[0][0]).toBe(year.id);
    }
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['settings'] }));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['academic-years'] });
  });

  it('does not invalidate Settings when a catalog mutation fails', async () => {
    service.setCurrent.mockRejectedValue(new Error('Rejected'));
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    render(<QueryClientProvider client={client}><AcademicYearsManager /></QueryClientProvider>);
    fireEvent.click(await screen.findByRole('button', { name: 'Marcar como actual' }));
    await waitFor(() => expect(service.setCurrent).toHaveBeenCalled());
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(invalidate).not.toHaveBeenCalled();
  });
});
