import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import EditDocumentPage from "@/app/dashboard/documents/[id]/edit/page";
import api from "@/lib/axios";
import { documentsService } from "@/lib/services/documents.service";
import { onlyofficeService } from "@/lib/services/onlyoffice.service";
import toast from "react-hot-toast";

let actor = { id: "actor-a", role: "admin" };
let routeId = "7";
jest.mock("@/lib/contexts/AuthContext", () => ({ useAuth: () => ({ user: actor }) }));
jest.mock("react-hot-toast", () => ({ __esModule: true, default: { success: jest.fn(), error: jest.fn() } }));

jest.mock("next/navigation", () => ({
  useParams: () => ({ id: routeId }),
  useRouter: () => ({ back: jest.fn() }),
}));
jest.mock("@/lib/services/documents.service", () => ({
  documentsService: {
    getOne: jest.fn(),
    view: jest.fn(),
    saveContent: jest.fn(),
    download: jest.fn(),
  },
}));
jest.mock("@/lib/services/onlyoffice.service", () => ({
  onlyofficeService: { checkHealth: jest.fn() },
}));
jest.mock("@/lib/axios", () => ({ get: jest.fn() }));
jest.mock("@/components/documents/OnlyOfficeEditor", () => () => <div>OnlyOffice</div>);

const document = {
  id: 7,
  actionCapabilities: { scope: "ordinary", editMetadata: false, editContent: true, move: false,
    trash: false, restore: false, permanentDelete: false, manageSharing: false },
  versions: [{ filename: "notas.txt", mimetype: "text/plain" }],
};

function renderEditor() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const element = () => <QueryClientProvider client={client}><EditDocumentPage /></QueryClientProvider>;
  const view = render(element());
  return { ...view, client, refresh: () => view.rerender(element()) };
}

describe("EditDocumentPage", () => {
  beforeEach(() => {
    jest.clearAllMocks(); actor = { id: "actor-a", role: "admin" }; routeId = "7";
    window.history.replaceState({}, "", "/");
    jest.mocked(documentsService.getOne).mockResolvedValue(document as never);
  });

  it("renders the basic editor when OnlyOffice is unavailable for text", async () => {
    jest.mocked(onlyofficeService.checkHealth).mockResolvedValue(false);
    jest.mocked(documentsService.view).mockResolvedValue({ text: async () => "contenido" } as Blob);

    renderEditor();

    await waitFor(() => expect(screen.getByText("OnlyOffice no está disponible. Estás usando el editor básico.")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Guardar" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Contenido del documento" })).toHaveValue("contenido");
  });

  it("shows download guidance for unsupported files", async () => {
    jest.mocked(onlyofficeService.checkHealth).mockResolvedValue(false);
    jest.mocked(documentsService.getOne).mockResolvedValue({
      ...document,
      versions: [{ filename: "archivo.pdf", mimetype: "application/pdf" }],
    } as never);

    renderEditor();

    await waitFor(() => expect(screen.getByText("El editor OnlyOffice no está disponible")).toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Descargar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Volver" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Contenido del documento" })).not.toBeInTheDocument();
  });

  it("renders the OnlyOffice editor when the service is healthy", async () => {
    jest.mocked(onlyofficeService.checkHealth).mockResolvedValue(true);
    jest.mocked(api.get).mockResolvedValue({ data: { type: "desktop" } });

    renderEditor();

    await waitFor(() => expect(screen.getByText("OnlyOffice")).toBeInTheDocument());
    expect(screen.queryByText("OnlyOffice no está disponible. Estás usando el editor básico.")).not.toBeInTheDocument();
  });

  it("renders the basic editor when mode=basic is forced even if OnlyOffice is healthy", async () => {
    jest.mocked(onlyofficeService.checkHealth).mockResolvedValue(true);
    jest.mocked(documentsService.view).mockResolvedValue({ text: async () => "contenido" } as Blob);
    window.history.replaceState({}, "", "/dashboard/documents/7/edit?mode=basic");

    renderEditor();

    await waitFor(() => expect(screen.getByText("OnlyOffice no está disponible. Estás usando el editor básico.")).toBeInTheDocument());
    expect(screen.queryByText("OnlyOffice")).not.toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Contenido del documento" })).toHaveValue("contenido");

    window.history.replaceState({}, "", "/");
  });

  it.each([undefined, { ...document.actionCapabilities, editContent: false }])(
    "blocks both editor initialization paths without content authority %#", async (actionCapabilities) => {
      jest.mocked(documentsService.getOne).mockResolvedValue({ ...document, actionCapabilities } as never);
      jest.mocked(onlyofficeService.checkHealth).mockResolvedValue(true);
      renderEditor();
      await waitFor(() => expect(screen.getByText("No tienes permiso para editar este documento")).toBeInTheDocument());
      expect(api.get).not.toHaveBeenCalled();
      expect(documentsService.view).not.toHaveBeenCalled();
      expect(screen.queryByText("OnlyOffice")).not.toBeInTheDocument();
    },
  );
  it("preserves an authorized basic save", async () => {
    jest.mocked(onlyofficeService.checkHealth).mockResolvedValue(false);
    jest.mocked(documentsService.view).mockResolvedValue({ text: async () => "contenido" } as Blob);
    jest.mocked(documentsService.saveContent).mockResolvedValue({ id: 7 } as never);
    renderEditor();
    fireEvent.click(await screen.findByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(documentsService.saveContent).toHaveBeenCalledWith(7, "contenido"));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Documento guardado"));
  });
  it("blocks basic save while readback refreshes and preserves its draft", async () => {
    jest.mocked(onlyofficeService.checkHealth).mockResolvedValue(false);
    jest.mocked(documentsService.view).mockResolvedValue({ text: async () => "contenido" } as Blob);
    const view = renderEditor();
    const input = await screen.findByRole("textbox", { name: "Contenido del documento" });
    fireEvent.change(input, { target: { value: "Draft" } });
    jest.mocked(documentsService.getOne).mockReturnValue(new Promise(() => {}));
    await act(async () => { void view.client.invalidateQueries({ queryKey: ["document"] }); });
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardar" })).toBeDisabled());
    expect(input).toHaveValue("Draft");
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(documentsService.saveContent).not.toHaveBeenCalled();
  });
  it("discards an old actor's pending editor initialization", async () => {
    let finish!: (value: { data: unknown }) => void;
    jest.mocked(onlyofficeService.checkHealth).mockResolvedValue(true);
    jest.mocked(api.get).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const view = renderEditor();
    await waitFor(() => expect(api.get).toHaveBeenCalled());
    actor = { id: "actor-b", role: "admin" };
    jest.mocked(documentsService.getOne).mockReturnValue(new Promise(() => {}));
    view.refresh();
    await act(async () => finish({ data: { type: "desktop" } }));
    expect(screen.queryByText("OnlyOffice")).not.toBeInTheDocument();
  });
  it("unmounts OnlyOffice during a same-context permission refresh", async () => {
    jest.mocked(onlyofficeService.checkHealth).mockResolvedValue(true);
    jest.mocked(api.get).mockResolvedValue({ data: { type: "desktop" } });
    const view = renderEditor(); await screen.findByText("OnlyOffice");
    jest.mocked(documentsService.getOne).mockReturnValue(new Promise(() => {}));
    await act(async () => { void view.client.invalidateQueries({ queryKey: ["document"] }); });
    await waitFor(() => expect(screen.queryByText("OnlyOffice")).not.toBeInTheDocument());
    expect(screen.getByText("Cargando editor...")).toBeInTheDocument();
  });
  it("discards basic content resolved after route change", async () => {
    let finish!: (blob: Blob) => void;
    jest.mocked(onlyofficeService.checkHealth).mockResolvedValue(false);
    jest.mocked(documentsService.view).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    const view = renderEditor(); await waitFor(() => expect(documentsService.view).toHaveBeenCalled());
    routeId = "8"; jest.mocked(documentsService.getOne).mockReturnValue(new Promise(() => {})); view.refresh();
    await act(async () => finish({ text: async () => "Old document bytes" } as Blob));
    expect(screen.queryByRole("textbox", { name: "Contenido del documento" })).not.toBeInTheDocument();
  });
  it("suppresses an old document's save completion after route change", async () => {
    let finish!: () => void;
    jest.mocked(onlyofficeService.checkHealth).mockResolvedValue(false);
    jest.mocked(documentsService.view).mockResolvedValue({ text: async () => "contenido" } as Blob);
    jest.mocked(documentsService.saveContent).mockReturnValue(new Promise((resolve) => { finish = () => resolve({ id: 7 } as never); }));
    const view = renderEditor();
    fireEvent.click(await screen.findByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(documentsService.saveContent).toHaveBeenCalled());
    routeId = "8"; jest.mocked(documentsService.getOne).mockReturnValue(new Promise(() => {})); view.refresh();
    const invalidate = jest.spyOn(view.client, "invalidateQueries");
    await act(async () => finish());
    expect(toast.success).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });
});
