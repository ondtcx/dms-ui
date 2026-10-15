import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RequestChangesDialog } from '../RequestChangesDialog';
import { documentChangeRequestService as service } from '@/lib/services/document-change-request.service';

jest.mock('@/lib/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }));
jest.mock('@/lib/services/document-change-request.service', () => ({ documentChangeRequestService: { get: jest.fn(), recipients: jest.fn(), access: jest.fn(), create: jest.fn() } }));
describe('RequestChangesDialog', () => {
  const mount = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><RequestChangesDialog documentId={1} open onOpenChange={jest.fn()} /></QueryClientProvider>);
  beforeEach(() => {
    jest.clearAllMocks();
    (service.get as jest.Mock).mockResolvedValue({ request: null, capabilities: { create: true, manage: true, submit: false } });
    (service.recipients as jest.Mock).mockResolvedValue([{ id: 'recipient', name: 'Ana', email: 'ana@example.test' }]);
    (service.access as jest.Mock).mockResolvedValue({ hasAccess: false });
    (service.create as jest.Mock).mockResolvedValue({});
  });
  it('requires explicit confirmation for a recipient without access', async () => {
    mount();
    fireEvent.change(await screen.findByLabelText('Buscar destinatario'), { target: { value: 'Ana' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Seleccionar Ana' }));
    const confirm = await screen.findByLabelText('Confirmo compartir acceso de lectura');
    fireEvent.change(screen.getByLabelText('Cambios solicitados'), { target: { value: 'Corregir' } });
    expect(screen.getByRole('button', { name: 'Enviar solicitud' })).toBeDisabled();
    fireEvent.click(confirm); fireEvent.click(screen.getByRole('button', { name: 'Enviar solicitud' }));
    await waitFor(() => expect(service.create).toHaveBeenCalledWith(1, { recipientId: 'recipient', message: 'Corregir', confirmShare: true }));
  });
  it('does not ask to share when inherited access already exists', async () => {
    (service.access as jest.Mock).mockResolvedValue({ hasAccess: true }); mount();
    fireEvent.change(await screen.findByLabelText('Buscar destinatario'), { target: { value: 'Ana' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Seleccionar Ana' }));
    await screen.findByText('El destinatario ya tiene acceso.');
    expect(screen.queryByLabelText('Confirmo compartir acceso de lectura')).not.toBeInTheDocument();
  });
  it('fails closed on server capability denial even for a client owner', async () => {
    (service.get as jest.Mock).mockResolvedValue({ request: null, capabilities: { create: false, manage: false, submit: false } }); mount();
    await screen.findByText('No puedes crear otra solicitud en este momento.');
    expect(screen.queryByLabelText('Buscar destinatario')).not.toBeInTheDocument();
  });
});
