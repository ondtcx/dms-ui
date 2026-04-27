import { cleanup, render, screen } from "@testing-library/react";
import { AppSidebar } from "@/components/app-sidebar";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useSettings } from "@/lib/contexts/SettingsContext";
import { usePendingApprovalsCount } from "@/hooks/use-pending-approvals-count";

jest.mock("@/lib/contexts/AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("@/lib/contexts/SettingsContext", () => ({
  useSettings: jest.fn(),
}));

jest.mock("@/hooks/use-pending-approvals-count", () => ({
  usePendingApprovalsCount: jest.fn(),
}));

jest.mock("next/link", () => {
  return function MockLink({ href, children }: { href: string; children: React.ReactNode }) {
    return <a href={href}>{children}</a>;
  };
});

jest.mock("@/components/ui/sidebar", () => {
  const Mock = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  return {
    Sidebar: Mock,
    SidebarContent: Mock,
    SidebarGroup: Mock,
    SidebarGroupContent: Mock,
    SidebarGroupLabel: Mock,
    SidebarMenu: Mock,
    SidebarMenuButton: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
      asChild ? <>{children}</> : <button>{children}</button>,
    SidebarMenuItem: Mock,
    SidebarHeader: Mock,
    SidebarFooter: Mock,
    SidebarMenuSub: Mock,
    SidebarMenuSubButton: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
      asChild ? <>{children}</> : <button>{children}</button>,
    SidebarMenuSubItem: Mock,
    SidebarRail: () => null,
  };
});

jest.mock("@/components/ui/collapsible", () => ({
  Collapsible: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsibleContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  CollapsibleTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) =>
    asChild ? <>{children}</> : <button>{children}</button>,
}));

describe("AppSidebar", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (useSettings as jest.Mock).mockReturnValue({ settings: null });
    (usePendingApprovalsCount as jest.Mock).mockReturnValue(0);
  });

  it("shows admin navigation only when the same route policy grants direct access", () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        name: "Ana",
        email: "ana@example.com",
        permissions: ["role:admin", "roles:read"],
      },
      logout: jest.fn(),
    });

    render(<AppSidebar />);

    expect(screen.getByText("Usuarios")).toBeInTheDocument();
    expect(screen.getByText("Categorias")).toBeInTheDocument();
    expect(screen.getByText("Ana")).toBeInTheDocument();
  });

  it("hides gated admin navigation when the user lacks the required capability", () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        name: "Luis",
        email: "luis@example.com",
        permissions: ["documents:read:all"],
      },
      logout: jest.fn(),
    });

    render(<AppSidebar />);

    expect(screen.queryByText("Usuarios")).not.toBeInTheDocument();
    expect(screen.queryByText("Categorias")).not.toBeInTheDocument();
    expect(screen.getByText("Registro documental")).toBeInTheDocument();
    expect(screen.getByText("Archivo y consulta")).toBeInTheDocument();
  });
});
