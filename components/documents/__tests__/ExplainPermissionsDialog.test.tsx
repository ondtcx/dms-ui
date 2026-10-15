import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ExplainPermissionsDialog } from '../ExplainPermissionsDialog';
import { permissionsService } from '@/lib/services/permissions.service';

jest.mock('@/lib/services/permissions.service', () => ({ permissionsService: { getEffectiveAccess: jest.fn(), explainPermission: jest.fn() } }));
jest.mock('@/lib/services/users.service', () => ({ usersService: { getAllForSelection: jest.fn(() => { throw new Error('Must not load all users'); }) } }));

function mount(open = true, id = 7) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}><ExplainPermissionsDialog documentId={id} open={open} onOpenChange={jest.fn()} /></QueryClientProvider>);
}

beforeEach(() => jest.clearAllMocks());

it('directly lists effective readers and traverses bounded pages, including empty pages', async () => {
  (permissionsService.getEffectiveAccess as jest.Mock)
    .mockResolvedValueOnce({ users: [{ id: 'a', name: 'Ana', email: 'a@example.test', role: 'profesor' }], nextCursor: 'a' })
    .mockResolvedValueOnce({ users: [], nextCursor: 'b' })
    .mockResolvedValueOnce({ users: [{ id: 'c', name: 'Carmen', email: 'c@example.test', role: 'user' }], nextCursor: null });
  mount();
  expect(await screen.findByText('Ana')).toBeInTheDocument();
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  await waitFor(() => expect(permissionsService.getEffectiveAccess).toHaveBeenCalledWith(7, 'a'));
  expect(await screen.findByText('No hay usuarios con acceso en esta página.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  expect(await screen.findByText('Carmen')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  expect(permissionsService.explainPermission).not.toHaveBeenCalled();
});

it('does not fetch when closed', () => {
  mount(false);
  expect(permissionsService.getEffectiveAccess).not.toHaveBeenCalled();
});

it('renders an authorization failure without cached reader identities', async () => {
  (permissionsService.getEffectiveAccess as jest.Mock).mockRejectedValue({ response: { status: 403 } });
  mount();
  expect(await screen.findByRole('alert')).toHaveTextContent('No tienes autorización');
  expect(screen.queryByText('Ana')).not.toBeInTheDocument();
});

it('hides the previous page while loading the next and supports returning to the first page', async () => {
  let resolvePage!: (page: unknown) => void;
  (permissionsService.getEffectiveAccess as jest.Mock)
    .mockResolvedValueOnce({ users: [{ id: 'a', name: 'Ana', email: 'a@example.test', role: 'user' }], nextCursor: 'a' })
    .mockImplementationOnce(() => new Promise(resolve => { resolvePage = resolve; }))
    .mockResolvedValueOnce({ users: [{ id: 'a', name: 'Ana', email: 'a@example.test', role: 'user' }], nextCursor: 'a' });
  mount();
  expect(await screen.findByText('Ana')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }));
  await waitFor(() => expect(resolvePage).toBeDefined());
  expect(screen.getByRole('status')).toHaveTextContent('Cargando');
  expect(screen.queryByText('Ana')).not.toBeInTheDocument();
  resolvePage({ users: [], nextCursor: null });
  expect(await screen.findByText('No hay usuarios con acceso en esta página.')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));
  expect(await screen.findByText('Ana')).toBeInTheDocument();
  expect(permissionsService.getEffectiveAccess).toHaveBeenLastCalledWith(7, undefined);
});

it('renders a network failure as an error rather than an empty access list', async () => {
  (permissionsService.getEffectiveAccess as jest.Mock).mockRejectedValue(new Error('network'));
  mount();
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudieron cargar');
  expect(screen.queryByText('No hay usuarios con acceso en esta página.')).not.toBeInTheDocument();
});
