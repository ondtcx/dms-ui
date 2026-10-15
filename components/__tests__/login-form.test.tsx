import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LoginForm } from "@/components/login-form";

const mockLogin = jest.fn();
const mockPush = jest.fn();

jest.mock("@/lib/contexts/AuthContext", () => ({
  useAuth: () => ({ login: mockLogin }),
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { error: jest.fn(), success: jest.fn(), },
}));

describe("LoginForm", () => {
  beforeEach(() => {
    mockLogin.mockReset();
    mockPush.mockReset();
  });

  it("keeps credentials and asks for the second factor after the public challenge", async () => {
    const user = userEvent.setup();
    mockLogin.mockRejectedValueOnce({
      response: { status: 401, data: { code: "TWO_FACTOR_REQUIRED" } },
    });
    mockLogin.mockResolvedValueOnce({ access_token: "token", user: {} });

    render(<LoginForm />);
    await user.type(screen.getByLabelText("Correo electrónico"), "user@example.com");
    await user.type(screen.getByLabelText("Contraseña"), "password");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(await screen.findByLabelText("Código de autenticación")).toBeInTheDocument();
    expect(screen.getByLabelText("Correo electrónico")).toHaveValue("user@example.com");
    expect(screen.getByLabelText("Contraseña")).toHaveValue("password");

    await user.type(screen.getByLabelText("Código de autenticación"), "123456");
    await user.click(screen.getByRole("button", { name: "Ingresar" }));

    expect(mockLogin).toHaveBeenLastCalledWith("user@example.com", "password", "123456");
    expect(mockPush).toHaveBeenCalledWith("/dashboard");
  });
});
