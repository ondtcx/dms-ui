import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DocumentTypesPage from "../page";
import { documentTypesService } from "@/lib/services/document-types.service";
import toast from "react-hot-toast";

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

jest.mock("@/guards/ProtectedRoute", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@/lib/services/document-types.service", () => ({
  documentTypesService: {
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

Object.assign(HTMLElement.prototype, {
  hasPointerCapture: () => false,
  setPointerCapture: () => undefined,
  releasePointerCapture: () => undefined,
  scrollIntoView: () => undefined,
});

// The persisted type still carries a category from previous data; the admin
// surface must ignore it now that categories left the type form and list.
const concreteType = {
  id: 12,
  name: "Oficio",
  description: null,
  categoryId: 5,
  isActive: true,
  createdAt: "",
  updatedAt: "",
  category: { id: 5, name: "Académico", color: "#000000", icon: "file" },
  _count: { documents: 0 },
};

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <DocumentTypesPage />
    </QueryClientProvider>,
  );
}

describe("document types admin surface", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(documentTypesService.getAll).mockResolvedValue([
      concreteType,
    ] as never);
  });

  it("lists types without category or template columns", async () => {
    renderPage();

    expect(await screen.findByText("Oficio")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Tipos de Documento" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Documentos" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Categoría" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Plantillas" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Académico")).not.toBeInTheDocument();
    expect(screen.queryByText("Plantillas")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("combobox", { name: "Filtrar por categoría" }),
    ).not.toBeInTheDocument();
  });

  it("renders no concrete default column or badge", async () => {
    renderPage();

    expect(await screen.findByText("Oficio")).toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Predeterminado" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Predeterminado")).not.toBeInTheDocument();
  });

  it("creates a type without category, isDefault, or default-specific toast", async () => {
    jest.mocked(documentTypesService.create).mockResolvedValue({
      id: 1,
      name: "Acta",
      isDefault: true,
    } as never);
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /Nuevo Tipo/ }));
    const dialog = within(await screen.findByRole("dialog"));

    expect(
      dialog.queryByRole("combobox", { name: "Categoría" }),
    ).not.toBeInTheDocument();
    expect(
      dialog.queryByRole("checkbox", { name: "Tipo predeterminado global" }),
    ).not.toBeInTheDocument();

    fireEvent.change(dialog.getByLabelText("Nombre *"), {
      target: { value: "Acta" },
    });
    fireEvent.click(dialog.getByRole("button", { name: "Crear" }));

    await waitFor(() => expect(documentTypesService.create).toHaveBeenCalled());
    const payload = jest.mocked(documentTypesService.create).mock.calls[0][0];
    expect(payload).toEqual({
      name: "Acta",
      description: undefined,
      isActive: true,
    });
    expect(payload).not.toHaveProperty("categoryId");
    expect(payload).not.toHaveProperty("isDefault");

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Tipo creado exitosamente"),
    );
  });

  it("updates a type without a categoryId payload", async () => {
    jest
      .mocked(documentTypesService.update)
      .mockResolvedValue({ id: 12 } as never);
    renderPage();

    const row = (await screen.findByText("Oficio")).closest("tr")!;
    fireEvent.click(within(row).getAllByRole("button")[1]);

    const dialog = within(await screen.findByRole("dialog"));
    fireEvent.click(dialog.getByRole("button", { name: "Actualizar" }));

    await waitFor(() => expect(documentTypesService.update).toHaveBeenCalled());
    const [id, payload] = jest.mocked(documentTypesService.update).mock.calls[0];
    expect(id).toBe(12);
    expect(payload).not.toHaveProperty("categoryId");
    expect(payload).not.toHaveProperty("isDefault");

    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Tipo actualizado exitosamente"),
    );
  });

  it("warns only about documents when deleting a type", async () => {
    jest
      .mocked(documentTypesService.delete)
      .mockResolvedValue({ message: "ok" } as never);
    renderPage();

    const row = (await screen.findByText("Oficio")).closest("tr")!;
    fireEvent.click(within(row).getAllByRole("button")[2]);

    const dialog = within(await screen.findByRole("dialog"));
    expect(dialog.getByText("Eliminar tipo")).toBeInTheDocument();
    expect(
      dialog.getByText(
        '¿Estás seguro de eliminar el tipo "Oficio"? Si tiene documentos asociados, no podrá eliminarse.',
      ),
    ).toBeInTheDocument();
    expect(dialog.queryByText(/plantilla/i)).not.toBeInTheDocument();

    fireEvent.click(dialog.getByRole("button", { name: "Eliminar" }));

    await waitFor(() =>
      expect(jest.mocked(documentTypesService.delete).mock.calls[0][0]).toBe(12),
    );
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Tipo eliminado exitosamente"),
    );
  });
});
