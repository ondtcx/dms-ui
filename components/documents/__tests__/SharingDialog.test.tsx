import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SharingDialog } from '../SharingDialog';
import { documentSharingService } from '@/lib/services/document-sharing.service';
import { directorySharingService } from '@/lib/services/directory-sharing.service';
import toast from 'react-hot-toast';

jest.mock('react-hot-toast', () => ({ __esModule: true, default: { success: jest.fn() } }));

jest.mock('@/lib/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'owner' } }) }));
jest.mock('@/lib/services/document-sharing.service', () => ({ documentSharingService: {
  get: jest.fn(), search: jest.fn(), grant: jest.fn(), revoke: jest.fn(), setVisibility: jest.fn(),
} }));
jest.mock('@/lib/services/directory-sharing.service', () => ({ directorySharingService: {
  get: jest.fn(), search: jest.fn(), grant: jest.fn(), revoke: jest.fn(), setVisibility: jest.fn(),
} }));

const ownerCapabilities = { owner: true, canView: true, canEdit: true, canUploadVersion: true, canShare: true };
const person = { id: 'reader', name: 'Ana', email: 'ana@example.test' };
const direct = { id: 'grant-ana', user: person, grantedBy: { id: 'owner', name: 'Propietario' }, canRevoke: true, effective: true, canEdit: false, canUploadVersion: false, canShare: false };
const precedes = (first: Node, second: Node) => (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

describe('SharingDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (documentSharingService.get as jest.Mock).mockResolvedValue({ documentId: 12, isPublic: false, capabilities: ownerCapabilities, canManageSharing: true, canSetVisibility: true, grants: [direct], recipients: [person] });
    (documentSharingService.search as jest.Mock).mockResolvedValue([{ id: 'new', name: 'Luis', email: 'luis@example.test' }]);
    for (const method of ['grant', 'revoke', 'setVisibility'] as const) (documentSharingService[method] as jest.Mock).mockResolvedValue({});
  });
  const mount = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><SharingDialog documentId={12} open onOpenChange={jest.fn()} /></QueryClientProvider>);
  it('lists access and explains the limits of revocation', async () => {
    mount();
    expect(await screen.findByText('ana@example.test')).toBeInTheDocument();
    expect(screen.getByText(/no elimina el acceso público o heredado/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Revocar concesión grant-ana de Ana' }));
    await waitFor(() => expect(documentSharingService.revoke).toHaveBeenCalledWith(12, 'grant-ana'));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Acceso revocado correctamente'));
  });
  it('searches recipients, selects one and grants read access without edit permissions', async () => {
    mount();
    await screen.findByText('ana@example.test');
    fireEvent.change(screen.getByLabelText('Buscar personas'), { target: { value: 'Luis' } });
    expect(await screen.findByText('luis@example.test')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar a Luis' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dar acceso a Luis' }));
    await waitFor(() => expect(documentSharingService.grant).toHaveBeenCalledWith(12, 'new', { canEdit: false, canUploadVersion: false, canShare: false }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Acceso compartido correctamente'));
  });
  it('keeps the confirmation disabled until a recipient is selected', async () => {
    mount();
    await screen.findByText('ana@example.test');
    fireEvent.change(screen.getByLabelText('Buscar personas'), { target: { value: 'Luis' } });
    fireEvent.click(await screen.findByLabelText('Editar metadatos'));
    fireEvent.change(screen.getByLabelText('Comentario opcional'), { target: { value: 'Revisar' } });
    expect(screen.getByRole('button', { name: 'Dar acceso' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar a Luis' }));
    expect(screen.getByRole('button', { name: 'Seleccionar a Luis' })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar a Luis' }));
    expect(screen.getByRole('button', { name: 'Dar acceso' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Seleccionar a Luis' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dar acceso a Luis' }));
    await waitFor(() => expect(documentSharingService.grant).toHaveBeenCalledWith(12, 'new', { canEdit: true, canUploadVersion: false, canShare: false, comment: 'Revisar' }));
  });
  it('places the recipient selector, the permissions and the comment before the access readback', async () => {
    mount();
    await screen.findByText('ana@example.test');
    fireEvent.change(screen.getByLabelText('Buscar personas'), { target: { value: 'Luis' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Seleccionar a Luis' }));
    const sequence = [
      screen.getByLabelText('Buscar personas'),
      screen.getByText('Permisos del nuevo acceso'),
      screen.getByLabelText('Comentario opcional'),
      screen.getByRole('button', { name: 'Dar acceso a Luis' }),
      screen.getByLabelText('Visible para todos los usuarios autenticados'),
      screen.getByText('Concesiones directas'),
    ];
    sequence.slice(0, -1).forEach((element, index) => expect(precedes(element, sequence[index + 1])).toBe(true));
  });
  it('changes visibility through the sharing endpoint', async () => {
    mount();
    fireEvent.click(await screen.findByLabelText('Visible para todos los usuarios autenticados'));
    await waitFor(() => expect(documentSharingService.setVisibility).toHaveBeenCalledWith(12, true));
  });
  it('fails closed when management is denied', async () => {
    (documentSharingService.get as jest.Mock).mockRejectedValue(new Error('denied'));
    mount();
    expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo consultar el acceso');
    expect(screen.queryByLabelText('Buscar personas')).not.toBeInTheDocument();
  });
  it('does not let a delegate change visibility or revoke a legacy recipient', async () => {
    (documentSharingService.get as jest.Mock).mockResolvedValue({ documentId: 12, isPublic: false, capabilities: { ...ownerCapabilities, owner: false }, canManageSharing: true, canSetVisibility: false, grants: [], recipients: [person], legacyGrants: [{ ...direct, legacy: true, canRevoke: false }] });
    mount();
    expect(await screen.findByLabelText('Visible para todos los usuarios autenticados')).toBeDisabled();
    expect(screen.getByText('Accesos anteriores (solo lectura)')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Revocar/ })).not.toBeInTheDocument();
    expect(documentSharingService.revoke).not.toHaveBeenCalled();
    expect(documentSharingService.setVisibility).not.toHaveBeenCalled();
  });
  it('sends an optional plain-text sharing comment with a new grant', async () => {
    mount();
    fireEvent.change(await screen.findByLabelText('Comentario opcional'), { target: { value: '<b>Revisar</b>' } });
    fireEvent.change(screen.getByLabelText('Buscar personas'), { target: { value: 'Luis' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Seleccionar a Luis' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dar acceso a Luis' }));
    await waitFor(() => expect(documentSharingService.grant).toHaveBeenCalledWith(12, 'new', { canEdit: false, canUploadVersion: false, canShare: false, comment: '<b>Revisar</b>' }));
  });
  it('allows metadata, version upload and resharing to be selected independently', async () => {
    mount();
    fireEvent.click(await screen.findByLabelText('Editar metadatos'));
    expect(screen.getByLabelText('Subir nuevas versiones')).not.toBeChecked();
    fireEvent.click(screen.getByLabelText('Volver a compartir'));
    fireEvent.change(screen.getByLabelText('Buscar personas'), { target: { value: 'Luis' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Seleccionar a Luis' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dar acceso a Luis' }));
    await waitFor(() => expect(documentSharingService.grant).toHaveBeenCalledWith(12, 'new', { canEdit: true, canUploadVersion: false, canShare: true }));
  });
  it('distinguishes concrete grants for the same person and revokes only the selected grant', async () => {
    (documentSharingService.get as jest.Mock).mockResolvedValue({ documentId: 12, isPublic: false, capabilities: ownerCapabilities, canManageSharing: true,
      grants: [direct, { ...direct, id: 42, grantedBy: { id: 'delegate', name: 'Delegado' } }], recipients: [person] });
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Revocar concesión 42 de Ana' }));
    await waitFor(() => expect(documentSharingService.revoke).toHaveBeenCalledWith(12, 42));
    expect(documentSharingService.revoke).toHaveBeenCalledTimes(1);
  });
  it('does not amplify permissions by combining independent delegation sources', async () => {
    (documentSharingService.get as jest.Mock).mockResolvedValue({ documentId: 12, isPublic: false, capabilities: { ...ownerCapabilities, owner: false }, canManageSharing: true,
      recipients: [], grants: [], provenance: [
        { grantId: 1, canShare: true, canEdit: true, canUploadVersion: false },
        { grantId: 2, canShare: true, canEdit: false, canUploadVersion: true },
      ] });
    mount();
    fireEvent.click(await screen.findByLabelText('Editar metadatos'));
    expect(screen.getByLabelText('Subir nuevas versiones')).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Editar metadatos'));
    expect(screen.getByLabelText('Subir nuevas versiones')).toBeEnabled();
    expect(screen.getByLabelText('Visible para todos los usuarios autenticados')).toBeDisabled();
  });
  it('shows inherited source and legacy readback without descendant revocation', async () => {
    (documentSharingService.get as jest.Mock).mockResolvedValue({ documentId: 12, isPublic: false, capabilities: ownerCapabilities, canManageSharing: true, recipients: [], grants: [],
      inheritedGrants: [{ ...direct, inherited: true, canRevoke: false, sourceDirectory: { id: 7, name: 'Académico' } }],
      legacyGrants: [{ ...direct, id: 8, legacy: true, canRevoke: false }] });
    mount();
    expect(await screen.findByText(/Heredado de Académico/)).toBeInTheDocument();
    expect(screen.getByText(/No se puede revocar aquí/)).toBeInTheDocument();
    expect(screen.getByText('Accesos anteriores (solo lectura)')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Revocar/ })).not.toBeInTheDocument();
  });
  it('updates only an actor-owned concrete grant and preserves its expiry', async () => {
    const expiresAt = '2099-01-01T00:00:00.000Z';
    (documentSharingService.get as jest.Mock).mockResolvedValue({ documentId: 12, isPublic: false, capabilities: ownerCapabilities, canManageSharing: true, recipients: [person], grants: [{ ...direct, expiresAt }] });
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Editar concesión grant-ana' }));
    fireEvent.click(screen.getByLabelText('Subir nuevas versiones'));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar permisos de Ana' }));
    await waitFor(() => expect(documentSharingService.grant).toHaveBeenCalledWith(12, 'reader', { canEdit: false, canUploadVersion: true, canShare: false, expiresAt }));
  });
  it('shares a folder through its adapter with independently selected upload and child creation rights', async () => {
    (directorySharingService.get as jest.Mock).mockResolvedValue({ directoryId: 7, isPublic: false, capabilities: ownerCapabilities, canManageSharing: true, canSetVisibility: true, grants: [], recipients: [] });
    (directorySharingService.search as jest.Mock).mockResolvedValue([person]);
    (directorySharingService.grant as jest.Mock).mockResolvedValue({});
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><SharingDialog directoryId={7} open onOpenChange={jest.fn()} /></QueryClientProvider>);
    expect(await screen.findByRole('dialog', { name: 'Compartir carpeta' })).toBeInTheDocument();
    fireEvent.click(await screen.findByLabelText('Subir documentos, nuevas versiones y crear subcarpetas'));
    expect(screen.getByLabelText('Editar metadatos')).not.toBeChecked();
    expect(screen.queryByLabelText('Comentario opcional')).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Buscar personas'), { target: { value: 'Ana' } });
    fireEvent.click(await screen.findByRole('button', { name: 'Seleccionar a Ana' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dar acceso a Ana' }));
    await waitFor(() => expect(directorySharingService.grant).toHaveBeenCalledWith(7, 'reader', { canEdit: false, canUploadVersion: true, canShare: false }));
    expect(documentSharingService.grant).not.toHaveBeenCalled();
  });
  it('lets an owner edit a delegate grant by its concrete ID', async () => {
    (documentSharingService.get as jest.Mock).mockResolvedValue({ documentId: 12, isPublic: false,
      capabilities: ownerCapabilities, canManageSharing: true,
      grants: [{ ...direct, id: 42, grantedBy: { id: 'delegate' } }] });
    mount();
    fireEvent.click(await screen.findByRole('button', { name: 'Editar concesión 42' }));
    fireEvent.click(screen.getByLabelText('Editar metadatos'));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar permisos de Ana' }));
    await waitFor(() => expect(documentSharingService.grant).toHaveBeenCalledWith(12, 'reader', {
      grantId: 42, canEdit: true, canUploadVersion: false, canShare: false,
    }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Permisos actualizados correctamente'));
  });
  it('does not allow editing an inactive grant', async () => {
    (documentSharingService.get as jest.Mock).mockResolvedValue({ documentId: 12, isPublic: false,
      capabilities: ownerCapabilities, canManageSharing: true, grants: [{ ...direct, effective: false }] });
    mount();
    await screen.findByText(/No vigente/);
    expect(screen.queryByRole('button', { name: 'Editar concesión grant-ana' })).not.toBeInTheDocument();
  });
  it('disables unowned flags for a delegated read-and-reshare source', async () => {
    (documentSharingService.get as jest.Mock).mockResolvedValue({ documentId: 12, isPublic: false, capabilities: { ...ownerCapabilities, owner: false, canEdit: false, canUploadVersion: false }, canManageSharing: true,
      grants: [], recipients: [], provenance: [{ grantId: 4, canShare: true, canEdit: false, canUploadVersion: false }] });
    mount();
    expect(await screen.findByLabelText('Editar metadatos')).toBeDisabled();
    expect(screen.getByLabelText('Subir nuevas versiones')).toBeDisabled();
    expect(screen.getByLabelText('Volver a compartir')).toBeEnabled();
  });
});
