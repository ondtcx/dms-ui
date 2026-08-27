import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RolesManagement } from '@/components/settings/RolesManagement';
import { rolesService } from '@/lib/services/roles.service';
import { permissionsService } from '@/lib/services/permissions.service';

jest.mock('@/lib/services/roles.service', () => ({
  rolesService: {
    getAll: jest.fn(), create: jest.fn(), update: jest.fn(), deactivate: jest.fn(),
  },
}));
jest.mock('@/lib/services/permissions.service', () => ({ permissionsService: { getCatalog: jest.fn() } }));
let mockCanManage = true;
jest.mock('@/hooks/use-permissions', () => ({ usePermissions: () => ({ hasPermission: () => mockCanManage }) }));

const mockedRoles = rolesService as unknown as Record<string, jest.Mock>;
const mockedPermissions = permissionsService as unknown as Record<string, jest.Mock>;

function renderRoles() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><RolesManagement /></QueryClientProvider>);
}

describe('RolesManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanManage = true;
    mockedRoles.getAll.mockResolvedValue([
      { id: 1, key: 'editor', label: 'Editor', isActive: true, permissions: [{ key: 'documents.read', label: 'Leer documentos' }] },
      { id: 2, key: 'legacy', label: 'Legacy', isActive: false, permissions: [] },
    ]);
    mockedPermissions.getCatalog.mockResolvedValue([
      { id: 4, key: 'documents.read', label: 'Leer documentos', isActive: true },
      { id: 5, key: 'users.manage', label: 'Gestionar usuarios', isActive: true },
      { id: 6, key: 'documents.delete', label: 'Eliminar documentos', isActive: false },
    ]);
  });

  it('lists state and permissions, creates with selected active permissions, and refreshes', async () => {
    mockedRoles.create.mockResolvedValue({ id: 3, key: 'reviewer', label: 'Reviewer', isActive: true });
    renderRoles();

    expect(await screen.findByText('Editor')).toBeInTheDocument();
    expect(screen.getByText('Activo')).toBeInTheDocument();
    expect(screen.getByText('Inactivo')).toBeInTheDocument();
    expect(screen.getByText('Leer documentos')).toBeInTheDocument();
    expect(screen.queryByLabelText('Eliminar documentos')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Clave del rol'), { target: { value: 'reviewer' } });
    fireEvent.change(screen.getByLabelText('Nombre del rol'), { target: { value: 'Reviewer' } });
    fireEvent.click(screen.getByLabelText('Gestionar usuarios'));
    fireEvent.click(screen.getByRole('button', { name: 'Crear rol' }));
    await waitFor(() => expect(mockedRoles.create).toHaveBeenCalledWith({ key: 'reviewer', label: 'Reviewer', permissionKeys: ['users.manage'] }));

    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }));
    await waitFor(() => expect(mockedRoles.getAll).toHaveBeenCalledTimes(3));
  });

  it('edits permissions and activates or deactivates a role', async () => {
    mockedRoles.update.mockResolvedValue({ id: 1, key: 'editor', label: 'Editor actualizado', isActive: true });
    mockedRoles.deactivate.mockResolvedValue({ id: 1, key: 'editor', label: 'Editor', isActive: false });
    renderRoles();
    await screen.findByText('Editor');

    fireEvent.click(screen.getByRole('button', { name: 'Editar Editor' }));
    fireEvent.change(screen.getByLabelText('Nombre del rol'), { target: { value: 'Editor actualizado' } });
    fireEvent.click(screen.getByLabelText('Gestionar usuarios'));
    fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await waitFor(() => expect(mockedRoles.update).toHaveBeenCalledWith(1, { label: 'Editor actualizado', permissionKeys: ['documents.read', 'users.manage'] }));

    fireEvent.click(screen.getByRole('button', { name: 'Desactivar Editor' }));
    await waitFor(() => expect(mockedRoles.deactivate).toHaveBeenCalledWith(1));
  });

  it('shows mutation errors and hides management controls without roles.manage', async () => {
    mockedRoles.create.mockRejectedValue(new Error('No autorizado'));
    renderRoles();
    await screen.findByText('Editor');
    fireEvent.change(screen.getByLabelText('Clave del rol'), { target: { value: 'x' } });
    fireEvent.change(screen.getByLabelText('Nombre del rol'), { target: { value: 'X' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear rol' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('No autorizado');
  });

  it('hides role administration controls when the current user lacks roles.manage', () => {
    mockCanManage = false;
    renderRoles();
    expect(screen.queryByRole('button', { name: 'Crear rol' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Actualizar' })).not.toBeInTheDocument();
  });
});
