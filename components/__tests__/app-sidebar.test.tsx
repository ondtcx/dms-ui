import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cleanup, render, screen } from "@testing-library/react";
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
let currentSearch = "";
let mockSettings: {
  institution: { name: string; logoPath: string | null };
  schoolYear?: { name: string; isActive: boolean };
} = { institution: { name: "Colegio", logoPath: null } };
jest.mock("next/navigation", () => ({
  usePathname: () => currentPathname,
  useSearchParams: () => new URLSearchParams(currentSearch),
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
  }),
}));

jest.mock("@/lib/contexts/SettingsContext", () => ({
  useSettings: () => ({
    settings: mockSettings,
  }),
}));

let visiblePermissions: Set<string> | null = null;
let visibleRoles = true;
jest.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({
    hasRole: () => visibleRoles,
    hasAnyRole: () => visibleRoles,
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
    currentSearch = "";
    mockSettings = { institution: { name: "Colegio", logoPath: null } };
    jest.mocked(documentsService.getDirectoryNavigationSummary).mockReset();
    jest.mocked(documentsService.getDirectoryNavigationSummary).mockResolvedValue({ recent: [], mostUsed: [] });
  });

  afterEach(() => {
    visiblePermissions = null;
    visibleRoles = true;
  });

  it("renders and reflects active state, account menu and icon collapsible", async () => {
    const { container } = renderSidebar();

    // a) Documentos is present (REQ-1/REQ-2 integration)
    expect(screen.getByText("Documentos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Documentos/ })).toHaveAttribute("data-active", "true");
    expect(screen.getByRole("link", { name: "Recientemente accedido" })).toHaveAttribute(
      "href",
      "/dashboard/documents?view=recent-accessed",
    );
    expect(screen.getByRole("link", { name: "Recientemente creado" })).toHaveAttribute(
      "href",
      "/dashboard/documents?view=recent-created",
    );
    expect(screen.getByRole("link", { name: "Todos los documentos" })).toHaveAttribute(
      "href",
      "/dashboard/documents?view=all",
    );
    expect(screen.getByRole("link", { name: "Papelera" })).toHaveAttribute(
      "href",
      "/dashboard/documents?view=trash",
    );
    expect(screen.getByRole("link", { name: "Nuevo Documento" })).toHaveAttribute(
      "href",
      "/dashboard/documents?action=new",
    );
    expect(screen.queryByRole("link", { name: "Documentos" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Papelera", hidden: true })).not.toHaveAttribute(
      "href",
      "/dashboard/trash",
    );
    expect(screen.queryByRole("link", { name: "Calendario" })).not.toBeInTheDocument();
    const settingsLink = screen.getByRole("link", { name: "Configuración" });
    expect(settingsLink).toHaveAttribute("href", "/dashboard/settings");
    expect(screen.queryByRole("button", { name: "Configuración" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Categorías" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Archivo" })).not.toBeInTheDocument();

    // b) El menú de cuenta pertenece al encabezado del dashboard, no al sidebar.
    expect(screen.queryByLabelText("Abrir menú de cuenta")).not.toBeInTheDocument();

    // d) sidebar root uses icon collapsible (REQ-5).
    // The element carrying data-collapsible is the sidebar wrapper
    // (data-slot="sidebar"); the data-sidebar="sidebar" inner div does not.
    const sidebarRoot = container.querySelector("[data-collapsible]");
    expect(sidebarRoot).toHaveAttribute("data-collapsible", "icon");
  });

  it.each([
    ["view=recent-accessed", "Recientemente accedido"],
    ["view=recent-created", "Recientemente creado"],
    ["view=all", "Todos los documentos"],
    ["view=trash", "Papelera"],
    ["action=new", "Nuevo Documento"],
  ])("marks the %s Documents query destination as active", (query, title) => {
    currentSearch = query;
    renderSidebar();

    expect(screen.getByRole("button", { name: /Documentos/ })).toHaveAttribute("data-active", "true");
    expect(screen.getByRole("link", { name: title })).toHaveAttribute("data-active", "true");
  });

  it("uses wrapping-safe structure only for Documents submenu entries", () => {
    renderSidebar();

    for (const title of [
      "Recientemente accedido",
      "Recientemente creado",
      "Todos los documentos",
      "Papelera",
      "Nuevo Documento",
    ]) {
      const link = screen.getByRole("link", { name: title });

      expect(link).toHaveClass("min-h-8", "h-auto", "items-start", "overflow-visible", "py-1.5");
      expect(link).toHaveAttribute("data-size", "sm");
      expect(link).toHaveClass(
        "[&>span:last-child]:whitespace-normal",
        "[&>span:last-child]:break-words",
        "[&>span:last-child]:leading-tight",
        "[&>span:last-child]:overflow-visible",
        "[&>span:last-child]:text-clip",
      );
      expect(link.querySelector("span")).toHaveClass(
        "min-w-0",
        "flex-1",
        "whitespace-normal",
        "break-words",
        "leading-tight",
      );
    }

    expect(screen.getByRole("link", { name: "Inicio" })).not.toHaveClass("min-h-7");
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

  it("routes template managers through Settings without a duplicate workflow item", () => {
    visiblePermissions = new Set(["workflow.templates.manage"]);
    currentPathname = "/dashboard/workflows/definition/7";
    renderSidebar();

    const settingsLink = screen.getByRole("link", { name: "Configuración" });
    expect(settingsLink).toHaveAttribute("href", "/dashboard/settings");
    expect(settingsLink).toHaveAttribute("data-active", "true");
    expect(screen.queryByRole("link", { name: "Flujos de trabajo" })).not.toBeInTheDocument();

    cleanup();
    visiblePermissions = new Set(["roles.manage"]);
    renderSidebar();

    expect(screen.queryByRole("link", { name: "Flujos de trabajo" })).not.toBeInTheDocument();
  });

  it("does not expose Settings workflow ownership to users without its permission", () => {
    visiblePermissions = new Set(["documents.read"]);
    visibleRoles = false;
    currentPathname = "/dashboard/workflows";
    renderSidebar();

    expect(screen.queryByRole("link", { name: "Flujos de trabajo" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Configuración" })).not.toBeInTheDocument();
  });

  it("renders loading, empty, and error states for directory navigation", async () => {
    currentPathname = "/dashboard/directories";
    jest.mocked(documentsService.getDirectoryNavigationSummary).mockImplementation(() => new Promise(() => {}));
    renderSidebar();
    expect(await screen.findByText("Cargando...")).toBeInTheDocument();

    jest.mocked(documentsService.getDirectoryNavigationSummary).mockResolvedValue({ recent: [], mostUsed: [] });
    renderSidebar();
    expect(await screen.findByText("Sin carpetas recientes")).toBeInTheDocument();

    jest.mocked(documentsService.getDirectoryNavigationSummary).mockRejectedValue(new Error("offline"));
    renderSidebar();
    expect(await screen.findByRole("button", { name: /no se pudieron cargar/i })).toBeInTheDocument();
  });

  it("marks the active directory creation route while the sidebar is icon-collapsed", async () => {
    currentPathname = "/dashboard/directories/new";
    renderSidebar();

    expect(screen.getByRole("button", { name: "Carpetas" })).toHaveAttribute("data-active", "true");
    expect(screen.getByRole("link", { name: "Crear nuevo" })).toHaveAttribute("data-active", "true");
  });

  it("shows institutional and academic-year identity with explicit fallbacks", async () => {
    renderSidebar();
    expect(screen.getByText("Colegio")).toBeInTheDocument();
    expect(screen.getByText("Año lectivo no disponible")).toBeInTheDocument();

    mockSettings = {
      institution: { name: "Instituto Central", logoPath: null },
      schoolYear: { name: "2026–2027", isActive: true },
    };
    renderSidebar();
    expect(screen.getByText("Instituto Central")).toBeInTheDocument();
    expect(screen.getByText("2026–2027")).toBeInTheDocument();
  });

  it("uses institutional sidebar semantic tokens for surfaces and separators", () => {
    const { container } = renderSidebar();

    expect(container.querySelector('[data-slot="sidebar-container"]')).toHaveClass("border-sidebar-border");
    expect(container.querySelector('[data-sidebar="sidebar"]')).toHaveClass("bg-sidebar");
    expect(container.querySelector('[data-slot="sidebar"]')).toHaveClass("text-sidebar-foreground");
    expect(container.querySelector('[data-sidebar="header"]')).toHaveClass("border-sidebar-border");
    expect(container.querySelector('[data-sidebar="footer"]')).not.toBeInTheDocument();
  });

  it("uses formal rotating chevrons for collapsible groups", () => {
    const source = readFileSync(resolve(process.cwd(), "components/app-sidebar.tsx"), "utf8");

    expect(source).toContain("ChevronRight");
    expect(source).not.toContain("Minus");
    expect(source).toContain("group-data-[state=open]/collapsible:rotate-90");

    renderSidebar();

    for (const title of ["Documentos", "Carpetas"]) {
      const trigger = screen.getByRole("button", { name: new RegExp(title) });
      expect(trigger).toHaveAttribute("aria-expanded");
    }
  });

});
