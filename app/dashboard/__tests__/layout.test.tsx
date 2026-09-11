import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import DashboardLayout from "@/app/dashboard/layout";
import userEvent from "@testing-library/user-event";

const mockLogout = jest.fn();

jest.mock("@/components/ui/sidebar", () => ({
  SidebarProvider: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  SidebarTrigger: () => <button aria-label="Abrir navegación">Menú</button>,
  SidebarInset: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));
jest.mock("@/components/app-sidebar", () => ({ AppSidebar: () => <aside>Barra lateral</aside> }));
jest.mock("@/components/navigation/DashboardBreadcrumb", () => ({
  DashboardBreadcrumb: () => <nav aria-label="Ruta de navegación">Inicio</nav>,
}));
jest.mock("@/components/search/SearchBar", () => ({
  SearchBar: () => <input aria-label="Buscar documentos" placeholder="Buscar documentos..." />,
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
      "Abrir menú de cuenta",
    ]);
    expect(screen.getByRole("main")).toHaveTextContent("Contenido");
  });
  it("shows the desktop profile identity and preserves logout through the dropdown", async () => {
    mockLogout.mockReset();
    render(<DashboardLayout><p>Contenido</p></DashboardLayout>);

    const trigger = screen.getByRole("button", { name: "Abrir menú de cuenta" });
    expect(trigger).toHaveTextContent("Ana Torres");
    expect(trigger).toHaveTextContent("ADMIN");
    expect(trigger).toHaveTextContent("AT");
    expect(screen.getByText("Ana Torres").parentElement).toHaveClass("hidden", "sm:block");

    await userEvent.click(trigger);
    const profileItem = await screen.findByRole("menuitem", { name: "Mi perfil" });
    expect(profileItem).toHaveAttribute("href", "/dashboard/mi-cuenta");
    await userEvent.click(await screen.findByRole("menuitem", { name: "Cerrar sesión" }));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });
});
