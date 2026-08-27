import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EditUserDialog } from "@/components/users/EditUserDialog";
import { usersService } from "@/lib/services/users.service";
import { rolesService } from "@/lib/services/roles.service";
import { UserRole } from "@/lib/types";
jest.mock("@/lib/services/users.service", () => ({
  usersService: { update: jest.fn(), assignRole: jest.fn(), unassignRole: jest.fn() },
}));
jest.mock("@/lib/services/roles.service", () => ({ rolesService: { getAll: jest.fn() } }));
let canManageRoles = true;
jest.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({ hasPermission: () => canManageRoles }),
}));
const mockedUsers = usersService as jest.Mocked<typeof usersService>;
const mockedRoles = rolesService as jest.Mocked<typeof rolesService>;
const user = {
  id: "user-1",
  name: "Ana",
  email: "ana@example.com",
  role: UserRole.PROFESOR,
  roles: ["editor"],
  catalogRoles: [{ id: 1, key: "editor", label: "Editor", isActive: true }],
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
};
function renderDialog() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <EditUserDialog user={user} open onOpenChange={jest.fn()} />
    </QueryClientProvider>,
  );
}
describe("EditUserDialog catalog assignments", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    canManageRoles = true;
    mockedRoles.getAll.mockResolvedValue([
      { id: 1, key: "editor", label: "Editor", isActive: true, permissions: [] },
      { id: 2, key: "reviewer", label: "Reviewer", isActive: true, permissions: [] },
      { id: 3, key: "inactive", label: "Inactive", isActive: false, permissions: [] },
    ]);
  });
  it("shows current assignments, assigns active roles, and refreshes projections", async () => {
    mockedUsers.assignRole.mockResolvedValue({
      id: "user-1", catalogRoles: [{ id: 2, key: "reviewer", label: "Reviewer", isActive: true }],
    } as any);
    renderDialog();

    expect(await screen.findByText("Editor")).toBeInTheDocument();
    expect(screen.queryByText("Inactive")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Rol de catálogo"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: "Asignar rol" }));
    await waitFor(() => expect(mockedUsers.assignRole).toHaveBeenCalledWith("user-1", 2));
    expect(await screen.findByText("Reviewer")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Quitar Editor" })).not.toBeInTheDocument();
    expect(mockedRoles.getAll).toHaveBeenCalledTimes(2);
  });
  it("unassigns a current role and refreshes the user projection", async () => {
    mockedUsers.unassignRole.mockResolvedValue({ id: "user-1", catalogRoles: [] } as any);
    renderDialog();
    await screen.findByText("Editor");
    fireEvent.click(screen.getByRole("button", { name: "Quitar Editor" }));
    await waitFor(() => expect(mockedUsers.unassignRole).toHaveBeenCalledWith("user-1", 1));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Quitar Editor" })).not.toBeInTheDocument());
  });
  it("shows invalid-selection errors without calling the mutation", async () => {
    renderDialog();
    await screen.findByText("Editor");
    fireEvent.click(screen.getByRole("button", { name: "Asignar rol" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Seleccioná un rol válido");
    expect(mockedUsers.assignRole).not.toHaveBeenCalled();
  });
  it("keeps legacy fields but hides catalog controls without roles.manage", async () => {
    canManageRoles = false;
    renderDialog();
    expect(await screen.findByLabelText("Rol")).toBeInTheDocument();
    expect(screen.queryByLabelText("Rol de catálogo")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Asignar rol" })).not.toBeInTheDocument();
  });
});
