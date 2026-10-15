import { fireEvent, render, screen, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EditDocumentDialog } from "../EditDocumentDialog";
import { ReplaceFileDialog } from "../ReplaceFileDialog";
import { documentsService } from "@/lib/services/documents.service";
import type { Document } from "@/lib/types";
import toast from "react-hot-toast";

let actor = { id: "actor-a" };
beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});
jest.mock("@/lib/contexts/AuthContext", () => ({ useAuth: () => ({ user: actor }) }));
jest.mock("@/lib/services/documents.service", () => ({ documentsService: {
  getOne: jest.fn(), update: jest.fn(), replaceFile: jest.fn(),
} }));
jest.mock("@/lib/services/categories.service", () => ({ categoriesService: { getActive: async () => [] } }));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

const flags = { scope: "ordinary", editMetadata: true, editContent: true, move: true,
  trash: true, restore: false, permanentDelete: false, manageSharing: false };
const doc = { id: 42, versions: [], description: "Original", isPublic: false,
  categoryId: null, actionCapabilities: flags } as unknown as Document;

describe.each(["metadata", "content"])("%s dialog mutation guard", (kind) => {
  beforeEach(() => { jest.clearAllMocks(); actor = { id: "actor-a" };
    jest.mocked(documentsService.getOne).mockResolvedValue(doc);
    jest.mocked(documentsService.update).mockResolvedValue(doc);
    jest.mocked(documentsService.replaceFile).mockResolvedValue(doc);
  });
  const setup = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    const close = jest.fn();
    const element = () => <QueryClientProvider client={client}>
      {kind === "metadata" ? <EditDocumentDialog document={doc} open onOpenChange={close} />
        : <ReplaceFileDialog documentId={42} documentName="File.pdf" open onOpenChange={close} />}
    </QueryClientProvider>;
    const view = render(element());
    if (kind === "content") fireEvent.change(screen.getByLabelText(/Nuevo archivo/), {
      target: { files: [new File(["bytes"], "File.pdf", { type: "application/pdf" })] },
    });
    const submit = () => fireEvent.submit(screen.getByRole("button", {
      name: kind === "metadata" ? /Guardar Cambios|Guardando/ : /^Actualizar$|Subiendo/,
    }).closest("form")!);
    return { ...view, client, close, submit, rerenderActor: () => view.rerender(element()) };
  };
  const mutation = () => kind === "metadata" ? documentsService.update : documentsService.replaceFile;

  it("does not dispatch before capability readback settles", async () => {
    jest.mocked(documentsService.getOne).mockReturnValue(new Promise(() => {}));
    const view = setup(); view.submit();
    await act(async () => {});
    expect(mutation()).not.toHaveBeenCalled();
  });
  it("rejects a denied action even when a form is submitted directly", async () => {
    jest.mocked(documentsService.getOne).mockResolvedValue({ ...doc, actionCapabilities: {
      ...doc.actionCapabilities!, editMetadata: false, editContent: false,
    } });
    const view = setup();
    await waitFor(() => expect(documentsService.getOne).toHaveBeenCalled());
    view.submit(); await act(async () => {});
    expect(mutation()).not.toHaveBeenCalled();
  });
  it("preserves an authorized mutation and its success effects", async () => {
    const view = setup();
    await waitFor(() => expect(screen.getByRole("button", {
      name: kind === "metadata" ? /Guardar Cambios/ : /^Actualizar$/,
    })).toBeEnabled());
    view.submit();
    await waitFor(() => expect(mutation()).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(view.close).toHaveBeenCalledWith(false));
    expect(toast.success).toHaveBeenCalled();
    expect(mutation()).toHaveBeenCalledWith(42, ...(kind === "metadata"
      ? [{ description: "Original" }]
      : [expect.any(File), undefined]));
  });
  it.each(["missing", "wrong-document", "error", "partial", "unknown-scope"])("fails closed on %s readback", async (mode) => {
    if (mode === "error") jest.mocked(documentsService.getOne).mockRejectedValue(new Error("Denied"));
    else jest.mocked(documentsService.getOne).mockResolvedValue((mode === "missing"
      ? { ...doc, actionCapabilities: undefined } : mode === "wrong-document" ? { ...doc, id: 43 }
      : { ...doc, actionCapabilities: mode === "partial" ? { editMetadata: true, editContent: true }
        : { ...flags, scope: "admin" } }) as unknown as Document);
    const view = setup();
    await act(async () => {});
    view.submit(); await act(async () => {});
    expect(mutation()).not.toHaveBeenCalled();
  });
  it("rejects direct submission during capability refresh", async () => {
    const view = setup();
    await waitFor(() => expect(screen.getByRole("button", {
      name: kind === "metadata" ? /Guardar Cambios/ : /^Actualizar$/,
    })).toBeEnabled());
    jest.mocked(documentsService.getOne).mockReturnValue(new Promise(() => {}));
    await act(async () => { void view.client.invalidateQueries({ queryKey: ["document-action-readback"] }); });
    view.submit(); await act(async () => {});
    expect(mutation()).not.toHaveBeenCalled();
  });
  it("rejects a revoked capability after an allowed readback", async () => {
    const view = setup();
    await waitFor(() => expect(screen.getByRole("button", {
      name: kind === "metadata" ? /Guardar Cambios/ : /^Actualizar$/,
    })).toBeEnabled());
    jest.mocked(documentsService.getOne).mockResolvedValue({ ...doc, actionCapabilities: {
      ...doc.actionCapabilities!, editMetadata: false, editContent: false,
    } });
    await act(async () => { await view.client.invalidateQueries({ queryKey: ["document-action-readback"] }); });
    view.submit(); await act(async () => {});
    expect(mutation()).not.toHaveBeenCalled();
  });
  it("resets entered metadata or replacement comments when the actor changes", async () => {
    const view = setup();
    fireEvent.change(screen.getByLabelText(kind === "metadata" ? "Descripción" : "Comentario (opcional)"), {
      target: { value: "Old actor draft" },
    });
    actor = { id: "actor-b" }; view.rerenderActor();
    expect(screen.getByLabelText(kind === "metadata" ? "Descripción" : "Comentario (opcional)"))
      .toHaveValue(kind === "metadata" ? "Original" : "");
  });
  it("keeps the old form blocked when another actor's readback settles", async () => {
    const view = setup();
    await waitFor(() => expect(screen.getByRole("button", {
      name: kind === "metadata" ? /Guardar Cambios/ : /^Actualizar$/,
    })).toBeEnabled());
    actor = { id: "actor-b" }; view.rerenderActor();
    await act(async () => {});
    view.submit(); await act(async () => {});
    expect(mutation()).not.toHaveBeenCalled();
  });
  it("does not settle an old actor's mutation into the new actor's dialog", async () => {
    let finish!: (value: Document) => void;
    jest.mocked(mutation()).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const view = setup();
    await waitFor(() => expect(screen.getByRole("button", {
      name: kind === "metadata" ? /Guardar Cambios/ : /^Actualizar$/,
    })).toBeEnabled());
    view.submit(); await waitFor(() => expect(mutation()).toHaveBeenCalledTimes(1));
    actor = { id: "actor-b" }; view.rerenderActor();
    await act(async () => finish(doc));
    expect(view.close).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
  });
});
