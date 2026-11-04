import { render, screen } from "@testing-library/react";
import type { ComponentProps, ReactNode } from "react";
import DashboardLayout from "@/app/dashboard/layout";
import userEvent from "@testing-library/user-event";

const mockLogout = jest.fn();

jest.mock("@/components/ui/sidebar", () => ({
  SidebarProvider: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SidebarTrigger: () => <button aria-label="Abrir navegación">Menú</button>,
  SidebarInset: ({
    children,
    ...props
  }: { children: ReactNode } & ComponentProps<"main">) => (
    <main {...props}>{children}</main>
  ),
}));
jest.mock("@/components/app-sidebar", () => ({ AppSidebar: () => <aside>Barra lateral</aside> }));
jest.mock("@/components/navigation/DashboardBreadcrumb", () => ({
  DashboardBreadcrumb: () => <nav aria-label="Ruta de navegación">Inicio</nav>,
}));
jest.mock("@/components/search/SearchBar", () => ({
  SearchBar: () => <input aria-label="Buscar documentos" placeholder="Buscar documentos..." />,
}));
jest.mock("@/components/notifications/NotificationBell", () => ({
  NotificationBell: () => <button aria-label="Notificaciones, 0 sin leer">Notificaciones</button>,
}));
jest.mock("@/lib/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { name: "Ana Torres", email: "ana@example.com", role: "admin" },
    logout: mockLogout,
  }),
}));

describe("DashboardLayout", () => {
  it("keeps the accessible header controls in visual keyboard order", () => {
    render(<DashboardLayout><p>Contenido</p></DashboardLayout>);

    const header = screen.getByRole("banner", { name: "Encabezado principal" });
    const controls = Array.from(header.querySelectorAll("button, input"));
    expect(controls.map((control) => control.getAttribute("aria-label"))).toEqual([
      "Abrir navegación",
      "Buscar documentos",
      "Notificaciones, 0 sin leer",
      "Abrir menú de cuenta",
    ]);
    expect(screen.getByRole("main")).toHaveTextContent("Contenido");
  });

  it("offers a skip link to the single main content region", () => {
    render(<DashboardLayout><p>Contenido</p></DashboardLayout>);

    expect(
      screen.getByRole("link", { name: "Saltar al contenido" }),
    ).toHaveAttribute("href", "#dashboard-content");
    expect(screen.getByRole("main")).toHaveAttribute("id", "dashboard-content");
  });

  it("applies the institutional header styling without changing control order", () => {
    render(<DashboardLayout><p>Contenido</p></DashboardLayout>);

    const header = screen.getByRole("banner", { name: "Encabezado principal" });
    expect(header).toHaveClass(
      "dashboard-header",
      "bg-institution-primary",
      "text-institution-primary-foreground",
    );
    expect(screen.getByRole("textbox").closest(".dashboard-header-search")).not.toBeNull();
  });

  it("shows the desktop profile identity and preserves logout through the dropdown", async () => {
    mockLogout.mockReset();
    render(<DashboardLayout><p>Contenido</p></DashboardLayout>);

    const trigger = screen.getByRole("button", { name: "Abrir menú de cuenta" });
    expect(trigger).toHaveTextContent("Ana Torres");
    expect(trigger).toHaveTextContent("Administrador");
    expect(trigger).toHaveTextContent("AT");
    expect(screen.getByText("Ana Torres").parentElement).toHaveClass("hidden", "sm:block");

    await userEvent.click(trigger);
    const profileItem = await screen.findByRole("menuitem", { name: "Mi perfil" });
    expect(profileItem).toHaveAttribute("href", "/dashboard/mi-cuenta");
    await userEvent.click(await screen.findByRole("menuitem", { name: "Cerrar sesión" }));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
