import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { DashboardBreadcrumb } from "@/components/navigation/DashboardBreadcrumb";

let pathname = "/dashboard/settings";
let search = "";

jest.mock("next/navigation", () => ({
  usePathname: () => pathname,
  useSearchParams: () => new URLSearchParams(search),
}));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
jest.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: undefined }),
}));
jest.mock("@/lib/services/documents.service", () => ({ documentsService: {} }));
jest.mock("@/lib/services/batch.service", () => ({ batchService: {} }));

beforeEach(() => {
  pathname = "/dashboard/settings";
  search = "";
});

describe("DashboardBreadcrumb", () => {
  it("uses formal Spanish labels and exposes its navigation landmark", () => {
    render(<DashboardBreadcrumb />);

    expect(screen.getByRole("navigation", { name: "Ruta de navegación" })).toBeInTheDocument();
    expect(screen.getByText("Inicio")).toBeInTheDocument();
    expect(screen.getByText("Configuración")).toBeInTheDocument();
  });

  it("appends the settings section label", () => {
    search = "section=institution";
    render(<DashboardBreadcrumb />);

    expect(screen.getByText("Institución")).toBeInTheDocument();
  });

  it("labels the document audit route in Spanish", () => {
    pathname = "/dashboard/documents/42/audit";
    render(<DashboardBreadcrumb />);

    expect(screen.getByText("Registro de actividad")).toBeInTheDocument();
    expect(screen.queryByText("audit")).not.toBeInTheDocument();
  });
});
