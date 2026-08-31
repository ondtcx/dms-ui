import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DirectoriesPage from "../page";
import NewDirectoryPage from "../new/page";
import { documentsService } from "@/lib/services/documents.service";

const push = jest.fn();
const back = jest.fn();

jest.mock("@/lib/services/documents.service", () => ({
  documentsService: {
    getAccessibleDirectories: jest.fn(),
    createDirectory: jest.fn(),
  },
  directoryQueryKeys: { accessible: ["directory-accessible"], summary: ["directory-navigation-summary"] },
}));
jest.mock("next/navigation", () => ({ useRouter: () => ({ push, back }) }));

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
  beforeEach(() => jest.clearAllMocks());

  it("links accessible directories to filtered documents and omits inaccessible data", async () => {
    jest.mocked(documentsService.getAccessibleDirectories).mockResolvedValue({
      data: [first], meta: { page: 1, limit: 50, total: 1, totalPages: 1 },
    });
    renderPage(<DirectoriesPage />);
    expect(await screen.findByRole("link", { name: "Académico" })).toHaveAttribute("href", "/dashboard/documents?directoryId=1");
    expect(screen.queryByText("Privado")).not.toBeInTheDocument();
  });

  it("links the virtual root to all documents without a directory filter", async () => {
    jest.mocked(documentsService.getAccessibleDirectories).mockResolvedValue({
      data: [], meta: { page: 1, limit: 50, total: 0, totalPages: 0 },
    });
    renderPage(<DirectoriesPage />);

    const rootLink = await screen.findByRole("link", { name: /raíz virtual/i });
    expect(rootLink).toHaveAttribute("href", "/dashboard/documents");
    expect(rootLink).toHaveTextContent("Todos los documentos, incluidos los que no tienen directorio.");
  });

  it("renders empty and API error states with retry", async () => {
    jest.mocked(documentsService.getAccessibleDirectories).mockResolvedValue({ data: [], meta: { page: 1, limit: 50, total: 0, totalPages: 0 } });
    renderPage(<DirectoriesPage />);
    expect(await screen.findByText("No hay directorios accesibles.")).toBeInTheDocument();

    jest.mocked(documentsService.getAccessibleDirectories).mockRejectedValueOnce(new Error("offline"));
    renderPage(<DirectoriesPage />);
    expect(await screen.findByText(/no se pudieron cargar los directorios/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reintentar/i })).toBeInTheDocument();
  });

  it("paginates independently", async () => {
    jest.mocked(documentsService.getAccessibleDirectories)
      .mockResolvedValueOnce({ data: [first], meta: { page: 1, limit: 50, total: 2, totalPages: 2 } })
      .mockResolvedValueOnce({ data: [second], meta: { page: 2, limit: 50, total: 2, totalPages: 2 } });
    const user = userEvent.setup();
    renderPage(<DirectoriesPage />);
    await user.click(await screen.findByRole("button", { name: /siguiente/i }));
    expect(await screen.findByRole("link", { name: "Privado" })).toBeInTheDocument();
    expect(documentsService.getAccessibleDirectories).toHaveBeenLastCalledWith({ page: 2, limit: 50 });
  });

  it("validates creation and shows API errors", async () => {
    jest.mocked(documentsService.getAccessibleDirectories).mockResolvedValue({ data: [], meta: { page: 1, limit: 50, total: 0, totalPages: 1 } });
    jest.mocked(documentsService.createDirectory).mockRejectedValue(new Error("duplicate"));
    const user = userEvent.setup();
    renderPage(<NewDirectoryPage />);
    await user.click(screen.getByRole("button", { name: "Crear directorio" }));
    expect(screen.getByText("Ingresa un nombre para el directorio.")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Nombre"), "Nuevo");
    await user.click(screen.getByRole("button", { name: "Crear directorio" }));
    await waitFor(() => expect(screen.getByText("No se pudo crear el directorio.")).toBeInTheDocument());
  });

  it("creates a successful root directory", async () => {
    jest.mocked(documentsService.getAccessibleDirectories).mockResolvedValue({ data: [], meta: { page: 1, limit: 50, total: 0, totalPages: 1 } });
    jest.mocked(documentsService.createDirectory).mockResolvedValue({ ...first, id: 3, name: "Root" });
    const user = userEvent.setup();
    renderPage(<NewDirectoryPage />);

    await user.type(await screen.findByLabelText("Nombre"), "  Root  ");
    await user.click(screen.getByRole("button", { name: "Crear directorio" }));

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

    await user.click(await screen.findByRole("combobox", { name: "Directorio padre (opcional)" }));
    await user.click(await screen.findByRole("option", { name: "Académico" }));
    await user.type(screen.getByLabelText("Nombre"), "Child");
    await user.click(screen.getByRole("button", { name: "Crear directorio" }));

    await waitFor(() => expect(documentsService.createDirectory).toHaveBeenCalledWith({ name: "Child", parentId: 1 }));
    expect(push).toHaveBeenCalledWith("/dashboard/directories");
  });
});
