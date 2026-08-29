import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { documentsService } from "@/lib/services/documents.service";

jest.mock("@/lib/services/documents.service", () => ({
  documentsService: {
    getDirectoryNavigationSummary: jest.fn().mockResolvedValue({ recent: [], mostUsed: [] }),
  },
  directoryQueryKeys: { summary: ["directory-navigation-summary"] },
}));

// jsdom does not implement matchMedia; useIsMobile relies on it.
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }),
});

let currentPathname = "/dashboard/documents";
jest.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
}));

// app-sidebar imports Link as a DEFAULT import, so the mock must expose a
// real `default` (jest's interop would otherwise hand the namespace object).
jest.mock("next/link", () => {
  const Link = ({ href, children, ...rest }: any) => (
    <a href={href} {...rest}>
      {children}
    </a>
  );
  return { __esModule: true, default: Link, Link };
});

jest.mock("@/lib/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { name: "Ana Torres", email: "a@b.c", role: "admin" },
    logout: jest.fn(),
  }),
}));

jest.mock("@/lib/contexts/SettingsContext", () => ({
  useSettings: () => ({
    settings: { institution: { name: "Colegio", logoPath: null } },
  }),
}));

let visiblePermissions: Set<string> | null = null;
jest.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({
    hasRole: () => true,
    hasAnyRole: () => true,
    hasPermission: (permission: string) => visiblePermissions === null || visiblePermissions.has(permission),
    hasAnyPermission: (permissions: string[]) => permissions.some((permission) => visiblePermissions === null || visiblePermissions.has(permission)),
  }),
}));

function renderSidebar() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <SidebarProvider defaultOpen={false}>
        <AppSidebar />
      </SidebarProvider>
    </QueryClientProvider>,
  );
}

describe("AppSidebar render smoke (REQ-1, REQ-2, REQ-4, REQ-5)", () => {
  beforeEach(() => {
    currentPathname = "/dashboard/documents";
    jest.mocked(documentsService.getDirectoryNavigationSummary).mockReset();
    jest.mocked(documentsService.getDirectoryNavigationSummary).mockResolvedValue({ recent: [], mostUsed: [] });
  });

  afterEach(() => {
    visiblePermissions = null;
  });

  it("renders and reflects active state, account menu and icon collapsible", async () => {
    const { container } = renderSidebar();

    // a) Documentos is present (REQ-1/REQ-2 integration)
    expect(screen.getByText("Documentos")).toBeInTheDocument();
    const settingsLink = screen.getByRole("link", { name: "Configuración" });
    expect(settingsLink).toHaveAttribute("href", "/dashboard/settings");
    expect(screen.queryByRole("button", { name: "Configuración" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Categorías" })).not.toBeInTheDocument();

    // b) the Documentos nav link is active on its exact route
    const docLink = screen.getByRole("link", { name: "Documentos" });
    expect(docLink).toHaveAttribute("data-active", "true");

    // c) account menu reveals only the session action (REQ-4).
    const trigger = screen.getByLabelText("Abrir menú de cuenta");
    await userEvent.click(trigger);
    expect(await screen.findByText("Cerrar Sesión")).toBeInTheDocument();
    expect(screen.queryByText("Mi Cuenta")).not.toBeInTheDocument();

    // d) sidebar root uses icon collapsible (REQ-5).
    // The element carrying data-collapsible is the sidebar wrapper
    // (data-slot="sidebar"); the data-sidebar="sidebar" inner div does not.
    const sidebarRoot = container.querySelector("[data-collapsible]");
    expect(sidebarRoot).toHaveAttribute("data-collapsible", "icon");
  });

  it("keeps Configuration as a single destination for a roles.manage-only user", async () => {
    visiblePermissions = new Set(["roles.manage"]);
    renderSidebar();

    expect(screen.getByRole("link", { name: "Configuración" })).toHaveAttribute(
      "href",
      "/dashboard/settings",
    );
    expect(screen.queryByRole("link", { name: "Usuarios" })).not.toBeInTheDocument();
  });

  it("renders loading, empty, and error states for directory navigation", async () => {
    currentPathname = "/dashboard/directories";
    jest.mocked(documentsService.getDirectoryNavigationSummary).mockImplementation(() => new Promise(() => {}));
    renderSidebar();
    expect(await screen.findByText("Cargando...")).toBeInTheDocument();

    jest.mocked(documentsService.getDirectoryNavigationSummary).mockResolvedValue({ recent: [], mostUsed: [] });
    renderSidebar();
    expect(await screen.findByText("Sin directorios recientes")).toBeInTheDocument();

    jest.mocked(documentsService.getDirectoryNavigationSummary).mockRejectedValue(new Error("offline"));
    renderSidebar();
    expect(await screen.findByRole("button", { name: /no se pudieron cargar/i })).toBeInTheDocument();
  });

  it("marks the active directory creation route while the sidebar is icon-collapsed", async () => {
    currentPathname = "/dashboard/directories/new";
    renderSidebar();

    expect(screen.getByRole("button", { name: "Directorios" })).toHaveAttribute("data-active", "true");
    expect(screen.getByRole("link", { name: "Crear nuevo" })).toHaveAttribute("data-active", "true");
  });

});
