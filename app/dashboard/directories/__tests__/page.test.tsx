import userEvent from "@testing-library/user-event";
import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
    expect(push).toHaveBeenCalledWith("/dashboard/documents");
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
    expect(push).toHaveBeenCalledWith("/dashboard/documents");
  });
});
