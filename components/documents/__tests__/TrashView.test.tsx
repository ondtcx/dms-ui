import { render, screen, waitFor, fireEvent, act, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TrashView } from "../TrashView";
import { documentsService } from "@/lib/services/documents.service";
import toast from "react-hot-toast";

let actor = { id: "actor-a", role: "admin" };
jest.mock("@/lib/contexts/AuthContext", () => ({ useAuth: () => ({ user: actor }) }));
jest.mock("@/hooks/use-permissions", () => ({ usePermissions: () => ({ isAdmin: () => true }) }));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/lib/services/documents.service", () => ({ documentsService: {
  getAll: jest.fn(), restore: jest.fn(), permanentDelete: jest.fn(),
} }));
const flags = { scope: "reception", editMetadata: false, editContent: false, move: false,
  trash: false, restore: false, permanentDelete: false, manageSharing: false };
const doc = { id: 7, deletedAt: "2026-10-12", uploadedById: "actor-a", uploadedBy: { name: "Ana" },
  versions: [{ filename: "Deleted file.pdf", size: 1 }], actionCapabilities: flags };
const response = (actionCapabilities: unknown = flags) => ({ data: [{ ...doc, actionCapabilities }],
  meta: { total: 1, page: 1, limit: 100, totalPages: 1 } });
function setup() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const element = () => <QueryClientProvider client={client}><TrashView /></QueryClientProvider>;
  const view = render(element()); return { ...view, client, refresh: () => view.rerender(element()) };
}
const open = async (action: string) => {
  fireEvent.click(await screen.findByRole("button", { name: action === "restore" ? "Restaurar" : "Eliminar Permanentemente" }));
  const dialog = screen.getByRole("dialog", { name: action === "restore" ? "Restaurar documento" : "Eliminar permanentemente" });
  if (action !== "restore") fireEvent.change(within(dialog).getByPlaceholderText("ELIMINAR"), { target: { value: "ELIMINAR" } });
  return within(dialog).getByRole("button", { name: action === "restore" ? "Restaurar" : "Eliminar permanentemente" });
};
describe("trash document capabilities", () => {
  beforeEach(() => { jest.clearAllMocks(); actor = { id: "actor-a", role: "admin" };
    jest.mocked(documentsService.getAll).mockResolvedValue(response() as never);
    jest.mocked(documentsService.restore).mockResolvedValue(undefined as never);
    jest.mocked(documentsService.permanentDelete).mockResolvedValue(undefined as never);
  });
  it.each([null, flags, { ...flags, restore: "true" }])("does not grant from admin or ownership %#", async (snapshot) => {
    jest.mocked(documentsService.getAll).mockResolvedValue(response(snapshot) as never);
    setup(); await screen.findByText("Deleted file.pdf");
    expect(screen.queryByRole("button", { name: "Restaurar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Eliminar Permanentemente" })).not.toBeInTheDocument();
  });
  it('never offers permanent deletion of another owner document despite an administrator snapshot', async () => {
    jest.mocked(documentsService.getAll).mockResolvedValue({ ...response(), data: [{ ...doc, uploadedById: 'other-owner', actionCapabilities: { ...flags, permanentDelete: true } }] } as never);
    setup();
    await screen.findByText('Deleted file.pdf');
    expect(screen.queryByRole('button', { name: 'Eliminar Permanentemente' })).not.toBeInTheDocument();
  });
  it.each(["restore", "permanentDelete"])("dispatches only the granted %s operation", async (action) => {
    jest.mocked(documentsService.getAll).mockResolvedValue(response({ ...flags, [action]: true }) as never);
    setup(); await screen.findByText("Deleted file.pdf");
    expect(screen.queryByRole("button", { name: action === "restore" ? "Eliminar Permanentemente" : "Restaurar" })).not.toBeInTheDocument();
    fireEvent.click(await open(action));
    await waitFor(() => expect(action === "restore" ? documentsService.restore : documentsService.permanentDelete).toHaveBeenCalledWith(7));
    expect(action === "restore" ? documentsService.permanentDelete : documentsService.restore).not.toHaveBeenCalled();
  });
  it("keeps typed confirmation required for permanent deletion", async () => {
    jest.mocked(documentsService.getAll).mockResolvedValue(response({ ...flags, permanentDelete: true }) as never);
    setup(); fireEvent.click(await screen.findByRole("button", { name: "Eliminar Permanentemente" }));
    const confirm = screen.getByRole("button", { name: "Eliminar permanentemente" });
    expect(confirm).toBeDisabled(); fireEvent.click(confirm);
    expect(documentsService.permanentDelete).not.toHaveBeenCalled();
  });
  it("applies restore and permanent deletion per record rather than globally", async () => {
    jest.mocked(documentsService.getAll).mockResolvedValue({ ...response(), data: [
      { ...doc, actionCapabilities: { ...flags, restore: true } },
      { ...doc, id: 8, versions: [{ filename: "Other file.pdf", size: 1 }],
        actionCapabilities: { ...flags, permanentDelete: true } },
    ] } as never);
    setup(); await screen.findByText("Deleted file.pdf");
    const first = within(screen.getByText("Deleted file.pdf").closest(".py-4")! as HTMLElement);
    const second = within(screen.getByText("Other file.pdf").closest(".py-4")! as HTMLElement);
    expect(first.getByRole("button", { name: "Restaurar" })).toBeInTheDocument();
    expect(first.queryByRole("button", { name: "Eliminar Permanentemente" })).not.toBeInTheDocument();
    expect(second.getByRole("button", { name: "Eliminar Permanentemente" })).toBeInTheDocument();
    expect(second.queryByRole("button", { name: "Restaurar" })).not.toBeInTheDocument();
  });
  it("shows loading and hides actions during unsettled trash readback", async () => {
    jest.mocked(documentsService.getAll).mockResolvedValue(response({ ...flags, restore: true }) as never);
    const view = setup(); await screen.findByRole("button", { name: "Restaurar" });
    jest.mocked(documentsService.getAll).mockReturnValue(new Promise(() => {}));
    await act(async () => { void view.client.invalidateQueries({ queryKey: ["documents"] }); });
    await waitFor(() => expect(screen.queryByRole("button", { name: "Restaurar" })).not.toBeInTheDocument());
    expect(screen.getByText("Cargando documentos eliminados...")).toBeInTheDocument();
  });
  it.each(["restore", "permanentDelete"])("blocks %s confirmation during refresh", async (action) => {
    jest.mocked(documentsService.getAll).mockResolvedValue(response({ ...flags, [action]: true }) as never);
    const view = setup(); const confirm = await open(action);
    jest.mocked(documentsService.getAll).mockReturnValue(new Promise(() => {}));
    await act(async () => { void view.client.invalidateQueries({ queryKey: ["documents"] }); });
    fireEvent.click(confirm); await act(async () => {});
    expect(documentsService.restore).not.toHaveBeenCalled(); expect(documentsService.permanentDelete).not.toHaveBeenCalled();
  });
  it.each(["restore", "permanentDelete"])("does not settle old actor %s results into the new actor context", async (action) => {
    let finish!: () => void;
    jest.mocked(documentsService.getAll).mockResolvedValue(response({ ...flags, [action]: true }) as never);
    const mutation = action === "restore" ? documentsService.restore : documentsService.permanentDelete;
    jest.mocked(mutation).mockReturnValue(new Promise((resolve) => { finish = () => resolve(undefined as never); }));
    const view = setup(); fireEvent.click(await open(action));
    await waitFor(() => expect(mutation).toHaveBeenCalled());
    actor = { id: "actor-b", role: "admin" }; jest.mocked(documentsService.getAll).mockReturnValue(new Promise(() => {})); view.refresh();
    expect(screen.queryByText("Deleted file.pdf")).not.toBeInTheDocument();
    const invalidate = jest.spyOn(view.client, "invalidateQueries");
    await act(async () => finish());
    expect(invalidate).not.toHaveBeenCalled(); expect(toast.success).not.toHaveBeenCalled();
  });
});
