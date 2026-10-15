import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ChangeRequestPanel } from '../ChangeRequestPanel';
import { documentChangeRequestService as service } from '@/lib/services/document-change-request.service';

jest.mock('@/lib/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'recipient' } }) }));
jest.mock('@/lib/services/document-change-request.service', () => ({ documentChangeRequestService: { get: jest.fn(), submit: jest.fn(), decide: jest.fn(), download: jest.fn() } }));
describe('ChangeRequestPanel', () => {
  const request = { id: 8, documentId: 1, recipientId: 'recipient', status: 'PENDING', revision: 3, message: '<b>Corregir</b>', hasCorrection: false };
  const mount = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><ChangeRequestPanel documentId={1} /></QueryClientProvider>);
  beforeEach(() => { jest.clearAllMocks(); (service.submit as jest.Mock).mockResolvedValue({}); });
  it('offers recipient-only correction submission without ordinary update capability', async () => {
    (service.get as jest.Mock).mockResolvedValue({ request, capabilities: { create: false, manage: false, submit: true } }); mount();
    const file = new File(['file'], 'correction.txt');
    fireEvent.change(await screen.findByLabelText('Archivo corregido'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: 'Enviar corrección' }));
    await waitFor(() => expect(service.submit).toHaveBeenCalledWith(1, 8, 3, file));
    expect(screen.queryByRole('button', { name: 'Aceptar corrección' })).not.toBeInTheDocument();
  });
  it('keeps the create action inside the document action menu', async () => {
    (service.get as jest.Mock).mockResolvedValue({ request: null, capabilities: { create: true, manage: true, submit: false } }); mount();
    await waitFor(() => expect(screen.queryByText('Cargando solicitud...')).not.toBeInTheDocument());
    expect(screen.queryByRole('button', { name: 'Solicitar cambios' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Solicitudes de cambios' })).not.toBeInTheDocument();
  });
  it('renders text safely and keeps a submitted correction active awaiting review', async () => {
    (service.get as jest.Mock).mockResolvedValue({ request: { ...request, status: 'CORRECTION_SUBMITTED', hasCorrection: true }, capabilities: { create: false, manage: false, submit: false } }); mount();
    expect(await screen.findByText('<b>Corregir</b>')).toBeInTheDocument();
    expect(screen.getByText('Corrección enviada; pendiente de revisión')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Solicitar cambios' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Archivo corregido')).not.toBeInTheDocument();
  });
  it('lets server-authorized managers request further changes with the same revision', async () => {
    (service.get as jest.Mock).mockResolvedValue({ request: { ...request, status: 'CORRECTION_SUBMITTED', hasCorrection: true }, capabilities: { create: false, manage: true, submit: false } });
    (service.decide as jest.Mock).mockResolvedValue({}); mount();
    fireEvent.change(await screen.findByLabelText('Cambios adicionales'), { target: { value: 'Revisar otra vez' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pedir más cambios' }));
    await waitFor(() => expect(service.decide).toHaveBeenCalledWith(1, 8, { action: 'further', revision: 3, message: 'Revisar otra vez' }));
  });
});
