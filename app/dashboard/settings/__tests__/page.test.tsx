import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SettingsPage from '@/app/dashboard/settings/page';
import { rolesService } from '@/lib/services/roles.service';
import { UserRole } from '@/lib/types';

let mockSection: string | null = 'roles';
let workflowPermission = false;
let workflowOnly = false;
let grantedPermissions: Set<string> | null = null;
let mockRole = UserRole.ADMIN;
let mockAuthenticated = true;
const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockSection ? `section=${mockSection}` : ''),
  useRouter: () => ({ push: mockPush }),
}));
jest.mock('@/lib/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { role: mockRole }, loading: false, isAuthenticated: mockAuthenticated }),
}));
jest.mock('@/components/structure/AcademicYearsManager', () => ({
  AcademicYearsManager: () => <div>Canonical catalog manager</div>,
}));
jest.mock('@/lib/contexts/SettingsContext', () => ({ useSettings: () => ({ isLoading: false }) }));
jest.mock('@/hooks/use-permissions', () => ({
  usePermissions: () => ({
    hasPermission: (permission: string) => grantedPermissions
      ? grantedPermissions.has(permission)
      : permission === 'workflow.templates.manage' ? workflowPermission : true,
    hasRole: () => !workflowOnly,
  }),
}));
jest.mock('@/lib/services/roles.service', () => ({ rolesService: { getAll: jest.fn(), create: jest.fn() } }));
jest.mock('@/app/dashboard/users/page', () => () => <div>Users management</div>);
jest.mock('@/app/dashboard/categories/page', () => () => <div>Categories management</div>);
jest.mock('@/app/dashboard/document-types/page', () => () => <div>Document types management</div>);
jest.mock('@/app/dashboard/templates/page', () => () => <div>Templates management</div>);
jest.mock('@/components/workflows/WorkflowAdministration', () => () => <div>Workflow administration surface</div>);

const mockedRolesService = rolesService as jest.Mocked<typeof rolesService>;

describe('authorized Settings management surface', () => {
  afterEach(() => {
    mockSection = 'roles';
    workflowPermission = false;
    workflowOnly = false;
    grantedPermissions = null;
    mockRole = UserRole.ADMIN;
    mockAuthenticated = true;
    mockPush.mockClear();
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
    expect(screen.queryByRole('link', { name: /Año lectivo\b/ })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Mi cuenta/ })).toHaveAttribute(
      'href',
      '/dashboard/mi-cuenta',
    );
  });

  it('does not expose workflow administration to an unauthorized Settings bookmark', () => {
    mockSection = 'workflows';
    workflowPermission = false;

    render(<QueryClientProvider client={new QueryClient()}><SettingsPage /></QueryClientProvider>);

    expect(screen.queryByText('Flujos de trabajo')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /crear definición|activar/i })).not.toBeInTheDocument();
  });

  it.each(['schoolYear', 'academic-years'])('opens %s through the canonical role gate for a rector without Settings permissions', (section) => {
    mockSection = section;
    mockRole = UserRole.RECTOR;
    grantedPermissions = new Set();
    render(<SettingsPage />);
    expect(screen.getByText('Canonical catalog manager')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it.each(['schoolYear', 'academic-years'])('denies %s to a professor even with Settings permissions', (section) => {
    mockSection = section;
    mockRole = UserRole.PROFESOR;
    render(<SettingsPage />);
    expect(screen.queryByText('Canonical catalog manager')).not.toBeInTheDocument();
    expect(mockPush).toHaveBeenCalledWith('/errors/unauthorized');
  });

  it('denies unauthenticated alias access', () => {
    mockSection = 'schoolYear';
    mockAuthenticated = false;
    render(<SettingsPage />);
    expect(screen.queryByText('Canonical catalog manager')).not.toBeInTheDocument();
    expect(mockPush).toHaveBeenCalledWith('/auth/login');
  });

  it('admits an administrator through the legacy alias', () => {
    mockSection = 'schoolYear';
    render(<SettingsPage />);
    expect(screen.getByText('Canonical catalog manager')).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('hides the workflow destination from an unauthorized Settings overview', () => {
    mockSection = null;
    workflowPermission = false;
    grantedPermissions = new Set(['documents.read']);

    render(<QueryClientProvider client={new QueryClient()}><SettingsPage /></QueryClientProvider>);

    expect(screen.queryByRole('link', { name: /Flujos de trabajo/ })).not.toBeInTheDocument();
  });

  it('admits a workflow-only administrator and hides unrelated management destinations', () => {
    mockSection = null;
    workflowPermission = true;
    workflowOnly = true;
    grantedPermissions = new Set(['workflow.templates.manage']);

    render(<QueryClientProvider client={new QueryClient()}><SettingsPage /></QueryClientProvider>);

    expect(screen.getByRole('link', { name: /Flujos de trabajo/ })).toHaveAttribute(
      'href',
      '/dashboard/settings?section=workflows',
    );
    expect(screen.queryByRole('link', { name: /Usuarios/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Categorías/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Plantillas/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Roles/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Años lectivos/ })).not.toBeInTheDocument();
  });

  it('opens the workflow administration surface from its Settings destination', () => {
    mockSection = 'workflows';
    workflowPermission = true;

    render(<QueryClientProvider client={new QueryClient()}><SettingsPage /></QueryClientProvider>);

    expect(screen.getByText('Workflow administration surface')).toBeInTheDocument();
  });

  it('keeps the direct workflow bookmark permission-gated through Settings ownership', () => {
    mockSection = 'workflows';
    workflowPermission = true;
    workflowOnly = true;
    grantedPermissions = new Set(['workflow.templates.manage']);

    render(<QueryClientProvider client={new QueryClient()}><SettingsPage /></QueryClientProvider>);

    expect(screen.getByText('Workflow administration surface')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Usuarios|Categorías|Plantillas|Roles/ })).not.toBeInTheDocument();
  });
});
