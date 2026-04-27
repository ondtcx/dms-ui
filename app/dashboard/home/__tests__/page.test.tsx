import { render, screen } from "@testing-library/react";
import DashboardHomePage from "@/app/dashboard/home/page";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useSettings } from "@/lib/contexts/SettingsContext";
import { useQuery } from "@tanstack/react-query";

jest.mock("@/lib/contexts/AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/lib/contexts/SettingsContext", () => ({
  useSettings: jest.fn(),
}));

jest.mock("@tanstack/react-query", () => ({
  useQuery: jest.fn(),
}));

jest.mock("next/link", () => {
  return function MockLink({ href, children }: { href: string; children: React.ReactNode }) {
    return <a href={href}>{children}</a>;
  };
});

describe("DashboardHomePage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useSettings as jest.Mock).mockReturnValue({ settings: null });
    (useQuery as jest.Mock).mockImplementation(({ queryKey }: { queryKey: unknown[] }) => {
      const key = queryKey.join(":");

      if (key === "documents:recent") {
        return { data: { data: [] }, isLoading: false };
      }

      if (key === "workflows:pending") {
        return { data: [], isLoading: false };
      }

      if (key === "workflows:my-initiated:active") {
        return { data: { meta: { total: 0 } }, isLoading: false };
      }

      return { data: null, isLoading: false };
    });
  });

  it("shows permission-gated management shortcuts for authorized users", () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        name: "Ana",
        permissions: ["role:admin", "roles:read"],
        legacyRoleName: "admin",
      },
    });

    render(<DashboardHomePage />);

    expect(screen.getByText("Gestionar usuarios")).toBeInTheDocument();
    expect(screen.getByText("Registro documental")).toBeInTheDocument();
    expect(screen.getByText("Archivo y consulta")).toBeInTheDocument();
  });

  it("hides privileged shortcuts when the permissions are missing", () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        name: "María",
        permissions: ["documents:read:all"],
        legacyRoleName: "profesor",
      },
    });

    render(<DashboardHomePage />);

    expect(screen.queryByText("Gestionar usuarios")).not.toBeInTheDocument();
    expect(screen.getByText("Registro documental")).toBeInTheDocument();
    expect(screen.getByText("Archivo y consulta")).toBeInTheDocument();
  });
});
