import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SettingsPage from '@/app/dashboard/settings/page';
import { rolesService } from '@/lib/services/roles.service';

let mockSection: string | null = 'roles';
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockSection ? `section=${mockSection}` : ''),
}));
jest.mock('@/guards/ProtectedRoute', () => ({ children }: { children: React.ReactNode }) => <>{children}</>);
jest.mock('@/lib/contexts/SettingsContext', () => ({ useSettings: () => ({ isLoading: false }) }));
jest.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({ hasPermission: () => true, hasRole: () => true }),
}));
jest.mock('@/lib/services/roles.service', () => ({ rolesService: { getAll: jest.fn(), create: jest.fn() } }));
jest.mock('@/app/dashboard/users/page', () => () => <div>Users management</div>);
jest.mock('@/app/dashboard/categories/page', () => () => <div>Categories management</div>);
jest.mock('@/app/dashboard/document-types/page', () => () => <div>Document types management</div>);
jest.mock('@/app/dashboard/templates/page', () => () => <div>Templates management</div>);

const mockedRolesService = rolesService as jest.Mocked<typeof rolesService>;

describe('authorized Settings management surface', () => {
  afterEach(() => {
    mockSection = 'roles';
  });

  it('renders role management controls and creates a role from the Settings destination', async () => {
    mockedRolesService.getAll.mockResolvedValue([]);
    mockedRolesService.create.mockResolvedValue({ id: 1, key: 'editor', label: 'Editor', isActive: true });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(<QueryClientProvider client={client}><SettingsPage /></QueryClientProvider>);

    expect(await screen.findByRole('heading', { name: 'Roles y permisos' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Clave del rol'), { target: { value: 'editor' } });
    fireEvent.change(screen.getByLabelText('Nombre del rol'), { target: { value: 'Editor' } });
    fireEvent.click(screen.getByRole('button', { name: 'Crear rol' }));

    await waitFor(() => expect(mockedRolesService.create).toHaveBeenCalledWith({ key: 'editor', label: 'Editor' }));
  });

  it('renders permission-aware settings categories as navigation cards', () => {
    mockSection = null;
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(<QueryClientProvider client={client}><SettingsPage /></QueryClientProvider>);

    expect(screen.getByRole('heading', { name: 'Configuración del Sistema' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Institución/ })).toHaveAttribute(
      'href',
      '/dashboard/settings?section=institution',
    );
    expect(screen.getByRole('link', { name: /Roles/ })).toHaveAttribute(
      'href',
      '/dashboard/settings?section=roles',
    );
    expect(screen.getByRole('link', { name: /Años lectivos/ })).toHaveAttribute(
      'href',
      '/dashboard/academic-years',
    );
    expect(screen.getByRole('link', { name: /Mi cuenta/ })).toHaveAttribute(
      'href',
      '/dashboard/mi-cuenta',
    );
  });
});
