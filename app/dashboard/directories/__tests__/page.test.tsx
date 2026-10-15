import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DirectoriesPage from "../page";
import NewDirectoryPage from "../new/page";
import { documentsService } from "@/lib/services/documents.service";

const push = jest.fn();
const back = jest.fn();
let search = "";

jest.mock("@/lib/services/documents.service", () => ({
  documentsService: {
    getAccessibleDirectories: jest.fn(),
    createDirectory: jest.fn(),
    listDirectories: jest.fn(),
    getDirectoryBreadcrumb: jest.fn(),
    getDirectoryContext: jest.fn(),
    getAll: jest.fn(),
  },
  directoryQueryKeys: { accessible: ["directory-accessible"], summary: ["directory-navigation-summary"] },
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, back }),
  useSearchParams: () => new URLSearchParams(search),
}));
jest.mock("@/lib/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
jest.mock("@/components/documents/ReceptionSettingsDialog", () => ({ ReceptionSettingsDialog: () => null }));

Object.assign(HTMLElement.prototype, {
  hasPointerCapture: () => false,
  setPointerCapture: () => undefined,
  releasePointerCapture: () => undefined,
  scrollIntoView: () => undefined,
});

const first = { id: 1, name: "Académico", parentId: null, createdById: "u1", createdAt: "", updatedAt: "" };
const second = { id: 2, name: "Privado", parentId: null, createdById: "u1", createdAt: "", updatedAt: "" };

function renderPage(page: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{page}</QueryClientProvider>);
}

describe("directories pages", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    search = "";
    jest.mocked(documentsService.listDirectories).mockResolvedValue([first]);
    jest.mocked(documentsService.getAll).mockResolvedValue({ data: [], meta: { page: 1, limit: 50, total: 0, totalPages: 0 } });
    jest.mocked(documentsService.getDirectoryBreadcrumb).mockResolvedValue([first]);
    jest.mocked(documentsService.getDirectoryContext).mockImplementation(async (id) => ({
      directory: { ...first, id },
      breadcrumb: [{ ...first, id }],
    }));
  });

  it("opens a root folder in place and lists its documents without leaving the page", async () => {
    const child = { ...first, id: 5, name: "Subnivel", parentId: 1 };
    const rootDocument = { id: 10, name: "Documento raíz", versions: [{ filename: "raiz.pdf" }] };
    const folderDocument = { id: 11, name: "Documento de Académico", versions: [{ filename: "academico.pdf" }] };
    jest.mocked(documentsService.listDirectories).mockImplementation(async (parentId) => (parentId === 1 ? [child] : [first]));
    jest.mocked(documentsService.getAll)
      .mockResolvedValueOnce({ data: [rootDocument], meta: { page: 1, limit: 50, total: 1, totalPages: 1 } } as never)
      .mockResolvedValue({ data: [folderDocument], meta: { page: 1, limit: 50, total: 1, totalPages: 1 } } as never);
    renderPage(<DirectoriesPage />);

    expect(await screen.findByText("Documento raíz")).toBeInTheDocument();
    await userEvent.click(await screen.findByRole("button", { name: "Académico" }));

    expect(await screen.findByText("Documento de Académico")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText("Documento raíz")).not.toBeInTheDocument());
    expect(await screen.findByRole("button", { name: "Subnivel" })).toBeInTheDocument();
    expect(documentsService.getAll).toHaveBeenLastCalledWith({ directoryId: 1, page: 1, limit: 50 });
    expect(push).not.toHaveBeenCalled();
  });

  it("navigates back to the root in place when the current folder is left", async () => {
    const child = { ...first, id: 5, name: "Subnivel", parentId: 1 };
    jest.mocked(documentsService.listDirectories).mockImplementation(async (parentId) => (parentId === 1 ? [child] : [first]));
    renderPage(<DirectoriesPage />);

    await userEvent.click(await screen.findByRole("button", { name: "Académico" }));
    await screen.findByRole("button", { name: "Subnivel" });
    await userEvent.click(screen.getByRole("button", { name: "Raíz" }));

    expect(await screen.findByRole("button", { name: "Académico" })).toBeInTheDocument();
    expect(documentsService.getAll).toHaveBeenLastCalledWith({ directoryId: null, page: 1, limit: 50 });
    expect(push).not.toHaveBeenCalled();
  });

  it("opens the folder addressed by a shared-folder notification without leaving the page", async () => {
    search = "directoryId=1";
    const folderDocument = { id: 11, name: "Documento de Académico", versions: [{ filename: "academico.pdf" }] };
    jest.mocked(documentsService.getAll).mockResolvedValue({ data: [folderDocument], meta: { page: 1, limit: 50, total: 1, totalPages: 1 } } as never);
    renderPage(<DirectoriesPage />);

    expect(await screen.findByText("Documento de Académico")).toBeInTheDocument();
    expect(documentsService.getAll).toHaveBeenCalledWith({ directoryId: 1, page: 1, limit: 50 });
    expect(push).not.toHaveBeenCalled();
  });

  it("falls back to the root for an invalid folder link", async () => {
    search = "directoryId=abc";
    renderPage(<DirectoriesPage />);

    await waitFor(() => expect(documentsService.getAll).toHaveBeenCalledWith({ directoryId: null, page: 1, limit: 50 }));
    expect(push).not.toHaveBeenCalled();
  });

  it("lists only root documents beside child folders", async () => {
    const rootDocument = { id: 10, name: "Documento raíz", versions: [{ filename: "raiz.pdf" }] };
    jest.mocked(documentsService.getAll).mockResolvedValue({ data: [rootDocument], meta: { page: 1, limit: 50, total: 1, totalPages: 1 } } as never);
    renderPage(<DirectoriesPage />);
    expect(await screen.findByRole("button", { name: "Académico" })).toBeInTheDocument();
    expect(documentsService.getAll).toHaveBeenCalledWith({ directoryId: null, page: 1, limit: 50 });
    expect(screen.getByRole("link", { name: /Documento raíz/ })).toHaveAttribute("href", "/dashboard/documents/10");
    expect(screen.queryByRole("link", { name: /abrir documentos/i })).not.toBeInTheDocument();
  });

  it("renders empty and API error states with retry", async () => {
    jest.mocked(documentsService.listDirectories).mockResolvedValue([]);
    renderPage(<DirectoriesPage />);
    expect(await screen.findByText("No hay subcarpetas accesibles.")).toBeInTheDocument();

    jest.mocked(documentsService.getAll).mockRejectedValueOnce(new Error("offline"));
    renderPage(<DirectoriesPage />);
    expect(await screen.findByText(/no se pudieron cargar los documentos/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reintentar/i })).toBeInTheDocument();
  });

  it("creates a root folder directly from the hierarchy page", async () => {
    jest.mocked(documentsService.createDirectory).mockResolvedValue(second);
    const user = userEvent.setup();
    renderPage(<DirectoriesPage />);
    await user.click(await screen.findByRole("button", { name: "Crear carpeta" }));
    await user.type(screen.getByLabelText("Nombre de la carpeta"), "  Privado  ");
    await user.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(documentsService.createDirectory).toHaveBeenCalledWith({ name: "Privado", parentId: null }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("validates creation and shows API errors", async () => {
    jest.mocked(documentsService.getAccessibleDirectories).mockResolvedValue({ data: [], meta: { page: 1, limit: 50, total: 0, totalPages: 1 } });
    jest.mocked(documentsService.createDirectory).mockRejectedValue(new Error("duplicate"));
    const user = userEvent.setup();
    renderPage(<NewDirectoryPage />);
    await user.click(screen.getByRole("button", { name: "Crear carpeta" }));
    expect(screen.getByText("Ingresa un nombre para la carpeta.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Nombre"), "Nuevo");
    await user.click(screen.getByRole("button", { name: "Crear carpeta" }));
    await waitFor(() => expect(screen.getByText("No se pudo crear la carpeta.")).toBeInTheDocument());
  });

  it("creates a successful root directory", async () => {
    jest.mocked(documentsService.getAccessibleDirectories).mockResolvedValue({ data: [], meta: { page: 1, limit: 50, total: 0, totalPages: 1 } });
    jest.mocked(documentsService.createDirectory).mockResolvedValue({ ...first, id: 3, name: "Root" });
    const user = userEvent.setup();
    renderPage(<NewDirectoryPage />);

    await user.type(await screen.findByLabelText("Nombre"), "  Root  ");
    await user.click(screen.getByRole("button", { name: "Crear carpeta" }));

    await waitFor(() => expect(documentsService.createDirectory).toHaveBeenCalledWith({ name: "Root", parentId: null }));
    expect(push).toHaveBeenCalledWith("/dashboard/directories");
  });

  it("creates a successful directory under an accessible parent", async () => {
    jest.mocked(documentsService.getAccessibleDirectories).mockResolvedValue({
      data: [first],
      meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
    });
    jest.mocked(documentsService.createDirectory).mockResolvedValue({ ...first, id: 3, name: "Child", parentId: 1 });
    const user = userEvent.setup();
    renderPage(<NewDirectoryPage />);

    await user.click(await screen.findByRole("combobox", { name: "Carpeta padre (opcional)" }));
    await user.click(await screen.findByRole("option", { name: "Académico" }));
    await user.type(screen.getByLabelText("Nombre"), "Child");
    await user.click(screen.getByRole("button", { name: "Crear carpeta" }));

    await waitFor(() => expect(documentsService.createDirectory).toHaveBeenCalledWith({ name: "Child", parentId: 1 }));
    expect(push).toHaveBeenCalledWith("/dashboard/directories");
  });
});
