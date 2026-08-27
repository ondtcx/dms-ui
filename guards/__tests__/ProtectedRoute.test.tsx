import { render, screen, waitFor } from "@testing-library/react";
import ProtectedRoute from "@/guards/ProtectedRoute";

const push = jest.fn();
let authenticated = true;
let permissions = new Set(["templates.manage"]);

jest.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
jest.mock("@/lib/contexts/AuthContext", () => ({
  useAuth: () => ({ loading: false, isAuthenticated: authenticated, user: { role: "admin" } }),
}));
jest.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({ hasPermission: (permission: string) => permissions.has(permission) }),
}));

describe("protected compatibility entry points", () => {
  beforeEach(() => {
    authenticated = true;
    permissions = new Set(["templates.manage"]);
    push.mockReset();
  });

  it("renders an authenticated authorized legacy bookmark destination", () => {
    render(
      <ProtectedRoute requiredPermission="templates.manage">
        <div>Gestión de Plantillas</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText("Gestión de Plantillas")).toBeInTheDocument();
  });

  it("redirects an authenticated unauthorized legacy bookmark", async () => {
    permissions = new Set();
    render(
      <ProtectedRoute requiredPermission="templates.manage">
        <div>Gestión de Plantillas</div>
      </ProtectedRoute>,
    );

    expect(screen.queryByText("Gestión de Plantillas")).not.toBeInTheDocument();
    await waitFor(() => expect(push).toHaveBeenCalledWith("/errors/unauthorized"));
  });
});
