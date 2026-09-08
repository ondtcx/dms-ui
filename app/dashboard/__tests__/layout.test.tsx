import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import DashboardLayout from "@/app/dashboard/layout";

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

describe("DashboardLayout", () => {
  it("keeps the accessible header controls in visual keyboard order", () => {
    render(<DashboardLayout><p>Contenido</p></DashboardLayout>);

    const controls = screen.getAllByRole("button").concat(screen.getByRole("textbox"));
    expect(controls.map((control) => control.getAttribute("aria-label"))).toEqual([
      "Abrir navegación",
      "Buscar documentos",
    ]);
    expect(screen.getByRole("main")).toHaveTextContent("Contenido");
  });
});
