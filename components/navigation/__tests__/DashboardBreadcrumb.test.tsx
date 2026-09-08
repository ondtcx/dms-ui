import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { DashboardBreadcrumb } from "@/components/navigation/DashboardBreadcrumb";

jest.mock("next/navigation", () => ({ usePathname: () => "/dashboard/settings" }));
jest.mock("next/link", () => ({
  __esModule: true,
  default: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>,
}));
jest.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: undefined }),
}));
jest.mock("@/lib/services/documents.service", () => ({ documentsService: {} }));
jest.mock("@/lib/services/batch.service", () => ({ batchService: {} }));

describe("DashboardBreadcrumb", () => {
  it("uses formal Spanish labels and exposes its navigation landmark", () => {
    render(<DashboardBreadcrumb />);

    expect(screen.getByRole("navigation", { name: "Ruta de navegación" })).toBeInTheDocument();
    expect(screen.getByText("Inicio")).toBeInTheDocument();
    expect(screen.getByText("Configuración")).toBeInTheDocument();
  });
});
