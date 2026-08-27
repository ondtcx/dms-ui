import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

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

jest.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/documents",
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
  return render(
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
    </SidebarProvider>,
  );
}

describe("AppSidebar render smoke (REQ-1, REQ-2, REQ-4, REQ-5)", () => {
  afterEach(() => {
    visiblePermissions = null;
  });

  it("renders and reflects active state, account menu and icon collapsible", async () => {
    const { container } = renderSidebar();

    // a) Documentos is present (REQ-1/REQ-2 integration)
    expect(screen.getByText("Documentos")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Configuracion" }));
    expect(screen.getByRole("link", { name: "Categorias" })).toHaveAttribute(
      "href",
      "/dashboard/settings?section=categories",
    );
    expect(screen.getByRole("link", { name: "Roles" })).toBeInTheDocument();

    // b) the Documentos nav link is active on its exact route
    const docLink = screen.getByRole("link", { name: "Documentos" });
    expect(docLink).toHaveAttribute("data-active", "true");

    // c) account menu reveals "Mi Cuenta" and "Cerrar Sesión" (REQ-4).
    // "Mi Cuenta" also exists as a sidebar nav link, so assert it appears
    // and use the dropdown-unique "Cerrar Sesión" to confirm the menu opened.
    const trigger = screen.getByLabelText("Abrir menú de cuenta");
    await userEvent.click(trigger);
    expect(await screen.findByText("Cerrar Sesión")).toBeInTheDocument();
    expect((await screen.findAllByText("Mi Cuenta")).length).toBeGreaterThanOrEqual(1);

    // d) sidebar root uses icon collapsible (REQ-5).
    // The element carrying data-collapsible is the sidebar wrapper
    // (data-slot="sidebar"); the data-sidebar="sidebar" inner div does not.
    const sidebarRoot = container.querySelector("[data-collapsible]");
    expect(sidebarRoot).toHaveAttribute("data-collapsible", "icon");
  });

  it("shows Users under Settings for a roles.manage-only user", async () => {
    visiblePermissions = new Set(["roles.manage"]);
    renderSidebar();

    await userEvent.click(screen.getByRole("button", { name: "Configuracion" }));
    expect(screen.getByRole("link", { name: "Usuarios" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Roles" })).toBeInTheDocument();
  });

});
