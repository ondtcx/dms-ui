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

    // a) Documentos is a direct destination of the scoped workbench.
    expect(screen.getByText("Documentos")).toBeInTheDocument();
    const documentsLink = screen.getByRole("link", { name: "Documentos" });
    expect(documentsLink).toHaveAttribute("href", "/dashboard/documents");
    expect(documentsLink).toHaveAttribute("data-active", "true");
    expect(screen.getByRole("link", { name: "Bandeja" })).toHaveAttribute(
      "href",
      "/dashboard/documents",
    );
    expect(screen.getByRole("link", { name: "Bandeja" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(
      screen.getByRole("link", { name: "Pendientes de revisión" }),
    ).toHaveAttribute("href", "/dashboard/documents/pending");
    expect(screen.getByRole("link", { name: "Nuevo" })).toHaveAttribute(
      "href",
      "/dashboard/documents?action=new",
    );
    expect(screen.queryByRole("link", { name: "Recientemente accedido" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Papelera", hidden: true })).not.toBeInTheDocument();
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

  it("opens the pending view as a Documentos child", () => {
    currentPathname = "/dashboard/documents/pending";
    renderSidebar();

    const parent = screen.getByRole("link", { name: "Documentos" });
    expect(parent).toHaveAttribute("href", "/dashboard/documents");
    expect(parent).toHaveAttribute("data-active", "true");
    expect(
      screen.getByRole("link", { name: "Pendientes de revisión" }),
    ).toHaveAttribute("aria-current", "page");
  });

  it("uses formal rotating chevrons for collapsible groups", () => {
    const source = readFileSync(resolve(process.cwd(), "components/app-sidebar.tsx"), "utf8");

    expect(source).toContain("ChevronRight");
    expect(source).not.toContain("Minus");
    expect(source).toContain("group-data-[state=open]/collapsible:rotate-90");

    renderSidebar();

    const trigger = screen.getByRole("button", { name: /Carpetas/ });
    expect(trigger).toHaveAttribute("aria-expanded");
  });

});
