import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DocumentDetailPage from "../page";
import { documentsService } from "@/lib/services/documents.service";
import toast from "react-hot-toast";
import { DocumentVersionHistory } from "@/components/documents/DocumentVersionHistory";

let actor = { id: "actor-a", role: "admin" };
let routeId = "7";
const push = jest.fn();
jest.mock("@/lib/contexts/AuthContext", () => ({ useAuth: () => ({ user: actor }) }));
jest.mock("next/navigation", () => ({ useParams: () => ({ id: routeId }), useRouter: () => ({ push, back: jest.fn() }) }));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));
jest.mock("@/lib/services/documents.service", () => ({ documentsService: { getOne: jest.fn(), delete: jest.fn(), view: jest.fn() } }));
jest.mock("@/components/workflows/DocumentWorkflowPanel", () => ({ DocumentWorkflowPanel: () => null }));
jest.mock("@/components/documents/OfficeDocumentPreview", () => ({ __esModule: true, default: () => null, isOfficePreviewType: () => false }));
jest.mock("@/components/documents/ExplainPermissionsDialog", () => ({ ExplainPermissionsDialog: () => null }));
jest.mock("@/components/documents/DocumentVersionHistory", () => ({ DocumentVersionHistory: jest.fn(({ open }: { open: boolean }) => open ? <div>Version controls</div> : null) }));
jest.mock("@/components/documents/EditDocumentDialog", () => ({ EditDocumentDialog: ({ open }: { open: boolean }) => open ? <div>Metadata dialog</div> : null }));
jest.mock("@/components/documents/ReplaceFileDialog", () => ({ ReplaceFileDialog: ({ open }: { open: boolean }) => open ? <div>Content dialog</div> : null }));
jest.mock("@/components/ui/dropdown-menu", () => {
  const Container = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
  return { DropdownMenu: Container, DropdownMenuTrigger: Container, DropdownMenuContent: Container,
    DropdownMenuSeparator: () => <hr />, DropdownMenuItem: ({ children, onClick }: { children: React.ReactNode; onClick: () => void }) => <button onClick={onClick}>{children}</button> };
});
const flags = { scope: "ordinary", editMetadata: false, editContent: false, move: false,
  trash: false, restore: false, permanentDelete: false, manageSharing: false };
const doc = { id: 7, name: "Current document", versions: [{ filename: "file.bin", mimetype: "application/octet-stream", size: 1 }],
  uploadedBy: { name: "Ana", role: "admin" }, uploadedById: "actor-a", currentVersion: 1,
  createdAt: "2026-10-12", updatedAt: "2026-10-12", templateId: null, actionCapabilities: flags };
const setup = () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const element = () => <QueryClientProvider client={client}><DocumentDetailPage /></QueryClientProvider>;
  const view = render(element());
  return { ...view, client, refresh: () => view.rerender(element()) };
};
describe("document detail capabilities", () => {
  beforeEach(() => { jest.clearAllMocks(); actor = { id: "actor-a", role: "admin" }; routeId = "7";
    jest.mocked(documentsService.getOne).mockResolvedValue(doc as never);
    jest.mocked(documentsService.delete).mockResolvedValue(undefined as never);
  });
  it.each([undefined, flags])("does not grant from admin or ownership %#", async (actionCapabilities) => {
    jest.mocked(documentsService.getOne).mockResolvedValue({ ...doc, actionCapabilities } as never);
    setup(); await screen.findByRole("heading", { name: "Current document" });
    for (const name of ["Editar", "Editar información", "Actualizar", "Eliminar"]) {
      expect(screen.queryAllByRole("button", { name })).toHaveLength(0);
    }
    fireEvent.click(screen.getByRole("button", { name: "Historial de versiones" }));
    expect(screen.getByText("Version controls")).toBeInTheDocument();
    const props = (DocumentVersionHistory as jest.Mock).mock.calls.at(-1)![0];
    for (const key of ["actionCapabilities", ...Object.keys(flags)]) expect(props).not.toHaveProperty(key);
  });
  it.each([["editMetadata", "Editar información"], ["editContent", "Actualizar"], ["trash", "Eliminar"]])(
    "separates %s from other permissions", async (flag, label) => {
      jest.mocked(documentsService.getOne).mockResolvedValue({ ...doc, actionCapabilities: { ...flags, [flag]: true } } as never);
      setup(); await screen.findByRole("heading", { name: "Current document" });
      expect(screen.getAllByRole("button", { name: label }).length).toBeGreaterThan(0);
      for (const name of ["Editar información", "Actualizar", "Eliminar"]) {
        if (name !== label) expect(screen.queryAllByRole("button", { name })).toHaveLength(0);
      }
    },
  );
  it("hides direct content editing but preserves update and trash confirmation", async () => {
    jest.mocked(documentsService.getOne).mockResolvedValue({ ...doc, actionCapabilities: { ...flags, editContent: true, trash: true } } as never);
    setup(); await screen.findByRole("heading", { name: "Current document" });
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Actualizar" })[0]).toHaveClass("bg-primary");
    fireEvent.click(screen.getAllByRole("button", { name: "Actualizar" })[0]);
    expect(screen.getByText("Content dialog")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    await waitFor(() => expect(documentsService.delete).toHaveBeenCalledWith(7));
  });
  it("opens metadata without granting the replacement dialog", async () => {
    jest.mocked(documentsService.getOne).mockResolvedValue({ ...doc, actionCapabilities: { ...flags, editMetadata: true } } as never);
    setup(); await screen.findByRole("heading", { name: "Current document" });
    fireEvent.click(screen.getAllByRole("button", { name: "Editar información" })[0]);
    expect(screen.getByText("Metadata dialog")).toBeInTheDocument();
    expect(screen.queryByText("Content dialog")).not.toBeInTheDocument();
  });
  it("preserves the existing template edit-form navigation", async () => {
    jest.mocked(documentsService.getOne).mockResolvedValue({ ...doc, templateId: 9, actionCapabilities: undefined } as never);
    setup(); await screen.findByRole("heading", { name: "Current document" });
    fireEvent.click(screen.getByRole("button", { name: "Editar" }));
    expect(push).toHaveBeenCalledWith("/dashboard/documents/7/edit-form");
  });
  it("rejects trash confirmation during readback refresh", async () => {
    jest.mocked(documentsService.getOne).mockResolvedValue({ ...doc, actionCapabilities: { ...flags, trash: true } } as never);
    const view = setup(); await screen.findByRole("heading", { name: "Current document" });
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    jest.mocked(documentsService.getOne).mockReturnValue(new Promise(() => {}));
    await act(async () => { void view.client.invalidateQueries({ queryKey: ["document"] }); });
    const confirm = screen.queryByRole("button", { name: "Eliminar" });
    if (confirm) fireEvent.click(confirm);
    await act(async () => {});
    expect(documentsService.delete).not.toHaveBeenCalled();
  });
  it("clears old actor details and ignores a pending delete completion", async () => {
    let finish!: () => void;
    jest.mocked(documentsService.getOne).mockResolvedValue({ ...doc, actionCapabilities: { ...flags, trash: true } } as never);
    jest.mocked(documentsService.delete).mockReturnValue(new Promise((resolve) => { finish = () => resolve(undefined as never); }));
    const view = setup(); await screen.findByRole("heading", { name: "Current document" });
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    await waitFor(() => expect(documentsService.delete).toHaveBeenCalled());
    actor = { id: "actor-b", role: "admin" };
    jest.mocked(documentsService.getOne).mockReturnValue(new Promise(() => {})); view.refresh();
    expect(screen.queryByRole("heading", { name: "Current document" })).not.toBeInTheDocument();
    await act(async () => finish());
    expect(toast.success).not.toHaveBeenCalled(); expect(push).not.toHaveBeenCalled();
  });

  it("keeps one update button and no quick actions card", async () => {
    jest.mocked(documentsService.getOne).mockResolvedValue({ ...doc,
      actionCapabilities: { ...flags, editMetadata: true, editContent: true, trash: true } } as never);
    setup(); await screen.findByRole("heading", { name: "Current document" });

    expect(screen.queryByText("Acciones")).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Actualizar" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Editar información" })).toHaveLength(1);
    expect(screen.getAllByRole("button", { name: "Historial de versiones" })).toHaveLength(1);
    fireEvent.click(screen.getAllByRole("button", { name: "Actualizar" })[0]);
    expect(screen.getByText("Content dialog")).toBeInTheDocument();
  });

  it("keeps requesting changes only in the three-dot action menu", async () => {
    jest.mocked(documentsService.getOne).mockResolvedValue({ ...doc, canRequestChanges: true } as never);
    setup(); await screen.findByRole("heading", { name: "Current document" });

    const entries = screen.getAllByRole("button", { name: "Solicitar cambios" });
    expect(entries).toHaveLength(1);
    fireEvent.click(entries[0]);
    expect(await screen.findByRole("heading", { name: "Solicitar cambios" })).toBeInTheDocument();
  });
});
