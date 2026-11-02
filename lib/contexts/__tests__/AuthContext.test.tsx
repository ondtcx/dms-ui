import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuthProvider, useAuth } from "../AuthContext";

const mockPush = jest.fn();
const mockLogin = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));
jest.mock("@/lib/services/auth.service", () => ({
  authService: {
    isAuthenticated: () => false,
    login: (...args: unknown[]) => mockLogin(...args),
    getProfile: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
  },
}));

function LoginConsumer() {
  const { login } = useAuth();
  return (
    <button onClick={() => login("user@example.com", "password")}>login</button>
  );
}

describe("AuthProvider", () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockLogin.mockReset();
  });

  it("routes a setup-required login to the account page", async () => {
    mockLogin.mockResolvedValue({
      access_token: "token",
      user: { id: "u1", email: "user@example.com", name: "User", role: "user" },
      twoFactorSetupRequired: true,
    });
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <LoginConsumer />
      </AuthProvider>,
    );
    await user.click(screen.getByRole("button", { name: "login" }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard/mi-cuenta");
    });
  });

  it("routes a normal login to the dashboard home", async () => {
    mockLogin.mockResolvedValue({
      access_token: "token",
      user: { id: "u1", email: "user@example.com", name: "User", role: "user" },
      twoFactorSetupRequired: false,
    });
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <LoginConsumer />
      </AuthProvider>,
    );
    await user.click(screen.getByRole("button", { name: "login" }));

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith("/dashboard/home");
    });
  });
});
