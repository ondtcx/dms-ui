import { render, screen } from "@testing-library/react";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuth } from "@/lib/contexts/AuthContext";

jest.mock("@/lib/contexts/AuthContext", () => ({
  useAuth: jest.fn(),
}));

function HookProbe() {
  const permissions = usePermissions();

  return (
    <div>
      <span data-testid="has-permission">
        {String(permissions.hasPermission("roles:read"))}
      </span>
      <span data-testid="has-any">
        {String(permissions.hasAnyPermission(["roles:write", "users:read"]))}
      </span>
      <span data-testid="has-all">
        {String(permissions.hasAllPermissions(["roles:read", "users:read"]))}
      </span>
      <span data-testid="can-access-users">
        {String(permissions.canAccessRoute("/dashboard/users"))}
      </span>
      <span data-testid="roles-policy">
        {permissions.getRoutePolicy("/dashboard/admin/roles")?.anyOf?.join(",") ?? "none"}
      </span>
    </div>
  );
}

describe("usePermissions", () => {
  it("exposes permission-first helpers for the auth shell", () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        permissions: ["roles:read", "users:read"],
      },
    });

    render(<HookProbe />);

    expect(screen.getByTestId("has-permission")).toHaveTextContent("true");
    expect(screen.getByTestId("has-any")).toHaveTextContent("true");
    expect(screen.getByTestId("has-all")).toHaveTextContent("true");
    expect(screen.getByTestId("can-access-users")).toHaveTextContent("false");
    expect(screen.getByTestId("roles-policy")).toHaveTextContent("roles:read");
  });

  it("denies access when the capability is missing", () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: {
        permissions: ["documents:read:all"],
      },
    });

    render(<HookProbe />);

    expect(screen.getByTestId("has-permission")).toHaveTextContent("false");
    expect(screen.getByTestId("has-any")).toHaveTextContent("false");
    expect(screen.getByTestId("has-all")).toHaveTextContent("false");
    expect(screen.getByTestId("can-access-users")).toHaveTextContent("false");
  });
});
