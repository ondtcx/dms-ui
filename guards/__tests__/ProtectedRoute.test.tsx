import { render, screen, waitFor } from "@testing-library/react";
import ProtectedRoute from "@/guards/ProtectedRoute";
import { useAuth } from "@/lib/contexts/AuthContext";
import { useRouter } from "next/navigation";

jest.mock("@/lib/contexts/AuthContext", () => ({
  useAuth: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

describe("ProtectedRoute / AuthorizationBoundary", () => {
  const push = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({ push });
  });

  it("redirects unauthenticated users to login", async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
      isAuthenticated: false,
    });

    render(
      <ProtectedRoute routeKey="/dashboard/users">
        <div>Contenido protegido</div>
      </ProtectedRoute>,
    );

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/auth/login");
    });
  });

  it("redirects authenticated users without permission to unauthorized", async () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { permissions: ["users:read"] },
      loading: false,
      isAuthenticated: true,
    });

    render(
      <ProtectedRoute routeKey="/dashboard/admin/roles">
        <div>Contenido protegido</div>
      </ProtectedRoute>,
    );

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/errors/unauthorized");
    });
  });

  it("renders children when the route capability is granted", () => {
    (useAuth as jest.Mock).mockReturnValue({
      user: { permissions: ["role:admin"] },
      loading: false,
      isAuthenticated: true,
    });

    render(
      <ProtectedRoute routeKey="/dashboard/users">
        <div>Contenido protegido</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText("Contenido protegido")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
