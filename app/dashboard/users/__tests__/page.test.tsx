import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import UsersManagementPage from "../page";
import { usersService } from "@/lib/services/users.service";
import { rolesService } from "@/lib/services/roles.service";

jest.mock("@/guards/ProtectedRoute", () => ({ __esModule: true, default: ({ children }: any) => children }));
jest.mock("@/components/users/EditUserDialog", () => ({ EditUserDialog: () => null }));
jest.mock("@/lib/services/users.service", () => ({ usersService: {
  getAll: jest.fn(), create: jest.fn(), delete: jest.fn(), generateResetToken: jest.fn(),
} }));
jest.mock("@/lib/services/roles.service", () => ({ rolesService: { getAll: jest.fn() } }));

const mockedUsers = usersService as jest.Mocked<typeof usersService>;
const mockedRoles = rolesService as jest.Mocked<typeof rolesService>;
const activeRole = { id: 12, key: "inspector-general", label: "Inspector General", isActive: true, permissions: [] };

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><UsersManagementPage /></QueryClientProvider>);
  fireEvent.click(screen.getByRole("button", { name: "Crear usuario" }));
  return within(screen.getByRole("dialog"));
}

describe("create user catalog roles", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedUsers.getAll.mockResolvedValue([]);
    mockedUsers.create.mockResolvedValue({ id: "new-user" } as any);
    mockedRoles.getAll.mockResolvedValue([activeRole, {
      id: 13, key: "profesor", label: "Profesor inactivo", isActive: false, permissions: [],
    }]);
  });

  it("lists only active catalog roles and submits the ID without a legacy role", async () => {
    const dialog = renderPage();
    expect(await dialog.findByRole("option", { name: "Inspector General" })).toBeInTheDocument();
    expect(dialog.queryByText("Profesor inactivo")).not.toBeInTheDocument();
    expect(dialog.queryByRole("option", { name: "Profesor" })).not.toBeInTheDocument();
    fireEvent.change(dialog.getByLabelText("Nombre"), { target: { value: "Inspector" } });
    fireEvent.change(dialog.getByLabelText("Email"), { target: { value: "inspector@example.com" } });
    fireEvent.change(dialog.getByLabelText("Contraseña"), { target: { value: "Password123!" } });
    fireEvent.change(dialog.getByLabelText("Rol"), { target: { value: "12" } });
    fireEvent.click(dialog.getByRole("button", { name: "Crear usuario" }));
    await waitFor(() => expect(mockedUsers.create.mock.calls[0]?.[0]).toEqual({
      name: "Inspector", email: "inspector@example.com", password: "Password123!", catalogRoleId: 12,
    }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Crear usuario" }));
    expect(screen.getByLabelText("Rol")).toHaveValue("");
  });

  it("requires explicit role selection before allowing submission", async () => {
    const dialog = renderPage();
    await dialog.findByRole("option", { name: "Inspector General" });
    expect(dialog.getByRole("button", { name: "Crear usuario" })).toBeDisabled();
    fireEvent.submit(dialog.getByLabelText("Nombre").closest("form")!);
    expect(mockedUsers.create).not.toHaveBeenCalled();
  });

  it("blocks creation while roles load", () => {
    mockedRoles.getAll.mockReturnValue(new Promise(() => {}));
    const dialog = renderPage();
    expect(dialog.getByRole("button", { name: "Crear usuario" })).toBeDisabled();
    expect(dialog.getByLabelText("Rol")).toBeDisabled();
  });

  it.each(["empty", "failure"])("blocks creation when the catalog is %s", async (state) => {
    if (state === "empty") mockedRoles.getAll.mockResolvedValue([]);
    else mockedRoles.getAll.mockRejectedValue(new Error("Catalog unavailable"));
    const dialog = renderPage();
    expect(await dialog.findByRole("alert")).toHaveTextContent(state === "empty"
      ? "No hay roles activos disponibles" : "No se pudieron cargar los roles");
    expect(dialog.getByRole("button", { name: "Crear usuario" })).toBeDisabled();
    expect(mockedUsers.create).not.toHaveBeenCalled();
  });
});
