import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { EditDocumentDialog } from "../EditDocumentDialog";
import { documentsService } from "@/lib/services/documents.service";
import { categoriesService } from "@/lib/services/categories.service";
import { documentTypesService } from "@/lib/services/document-types.service";
import type { Document } from "@/lib/types";

let actor = { id: "actor-a" };

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  HTMLElement.prototype.scrollIntoView = jest.fn();
});

jest.mock("@/lib/contexts/AuthContext", () => ({
  useAuth: () => ({ user: actor }),
}));
jest.mock("@/lib/services/documents.service", () => ({
  documentsService: { getOne: jest.fn(), update: jest.fn() },
}));
jest.mock("@/lib/services/categories.service", () => ({
  categoriesService: { getActive: jest.fn() },
}));
jest.mock("@/lib/services/document-types.service", () => ({
  documentTypesService: { getActive: jest.fn() },
}));
jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

const flags = {
  scope: "ordinary",
  editMetadata: true,
  editContent: true,
  move: true,
  trash: true,
  restore: false,
  permanentDelete: false,
  manageSharing: false,
};

const defaultTypeId = 22;

function makeDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: 42,
    versions: [],
    description: "Original",
    isPublic: false,
    categoryId: null,
    actionCapabilities: flags,
    ...overrides,
  } as unknown as Document;
}

function setup(doc: Document) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const onOpenChange = jest.fn();
  render(
    <QueryClientProvider client={client}>
      <EditDocumentDialog document={doc} open onOpenChange={onOpenChange} />
    </QueryClientProvider>,
  );
  return { onOpenChange };
}

function submit() {
  fireEvent.submit(
    screen.getByRole("button", { name: /Guardar Cambios|Guardando/ }).closest("form")!,
  );
}

function openTypeOptions() {
  fireEvent.keyDown(screen.getByRole("combobox", { name: "Tipo de documento" }), {
    key: "Enter",
  });
}

async function waitForDefault() {
  await waitFor(() =>
    expect(
      screen.getByRole("checkbox", { name: "Documento general" }),
    ).not.toBeDisabled(),
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  actor = { id: "actor-a" };
  jest.mocked(categoriesService.getActive).mockResolvedValue([
    { id: 7, name: "Académico", isActive: true, allowedRoles: [] },
  ] as never);
  jest.mocked(documentTypesService.getActive).mockResolvedValue([
    { id: 12, name: "Oficio", categoryId: 7, isActive: true },
    { id: defaultTypeId, name: "Documento general", categoryId: null, isActive: true, isDefault: true },
  ] as never);
  jest
    .mocked(documentsService.update)
    .mockImplementation(async (id) => makeDocument({ id }));
});

describe("EditDocumentDialog document type", () => {
  it("omits an unchanged inactive type during title and number edits", async () => {
    const doc = makeDocument({ name: "Old title", documentNumber: "Old / 7",
      documentTypeId: 99, documentType: { id: 99, name: "Legacy inactive type" } });
    jest.mocked(documentsService.getOne).mockResolvedValue(doc);
    jest.mocked(documentsService.update).mockImplementation(async (_id, payload) => {
      if (payload.documentTypeId !== undefined) throw new Error("El tipo de documento está inactivo");
      return doc;
    });
    const { onOpenChange } = setup(doc);
    fireEvent.change(screen.getByLabelText("Nombre del documento"), { target: { value: "New title" } });
    fireEvent.change(screen.getByLabelText("Número institucional (opcional)"), { target: { value: "New / 8" } });
    await waitFor(() => expect(screen.getByRole("button", { name: /Guardar Cambios/ })).toBeEnabled());
    submit();
    await waitFor(() => expect(documentsService.update).toHaveBeenCalledWith(42,
      { name: "New title", documentNumber: "New / 8", description: "Original" }));
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });
  it("edits the visible title and optional number without category or public controls", async () => {
    const doc = makeDocument({ name: "Stored title", documentNumber: "Stored / 7",
      versions: [{ filename: "historical.pdf" }] as Document["versions"] });
    jest.mocked(documentsService.getOne).mockResolvedValue(doc);
    setup(doc);
    expect(screen.getByLabelText("Nombre del documento")).toHaveValue("Stored title");
    expect(screen.getByLabelText("Número institucional (opcional)")).toHaveValue("Stored / 7");
    expect(screen.queryByRole("combobox", { name: "Categoría" })).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Hacer público/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Nombre del documento"), { target: { value: "New title" } });
    fireEvent.change(screen.getByLabelText("Número institucional (opcional)"), { target: { value: "  " } });
    await waitFor(() => expect(screen.getByRole("button", { name: /Guardar Cambios/ })).toBeEnabled());
    submit();
    await waitFor(() => expect(documentsService.update).toHaveBeenCalledWith(42,
      { name: "New title", documentNumber: null, description: "Original" }));
    expect(doc.versions?.[0]?.filename).toBe("historical.pdf");
  });
  it("preserves stored identity when only the description changes", async () => {
    const doc = makeDocument({ name: "Stored title", documentNumber: "Stored / 7" });
    jest.mocked(documentsService.getOne).mockResolvedValue(doc);
    setup(doc);
    fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Changed" } });
    await waitFor(() => expect(screen.getByRole("button", { name: /Guardar Cambios/ })).toBeEnabled());
    submit();
    await waitFor(() => expect(documentsService.update).toHaveBeenCalledWith(42, { description: "Changed" }));
  });
  it("does not migrate a legacy filename fallback or generate a missing number", async () => {
    const doc = makeDocument({ name: null, documentNumber: null,
      versions: [{ filename: "historical.pdf" }] as Document["versions"] });
    jest.mocked(documentsService.getOne).mockResolvedValue(doc);
    setup(doc);
    expect(screen.getByLabelText("Nombre del documento")).toHaveValue("historical.pdf");
    expect(screen.getByLabelText("Número institucional (opcional)")).toHaveValue("");
    await waitFor(() => expect(screen.getByRole("button", { name: /Guardar Cambios/ })).toBeEnabled());
    submit();
    await waitFor(() => expect(documentsService.update).toHaveBeenCalledWith(42, { description: "Original" }));
  });
  it("submits a manually entered institutional number", async () => {
    const doc = makeDocument({ name: "Title", documentNumber: null });
    jest.mocked(documentsService.getOne).mockResolvedValue(doc);
    setup(doc);
    fireEvent.change(screen.getByLabelText("Número institucional (opcional)"), { target: { value: "  Manual / 8  " } });
    await waitFor(() => expect(screen.getByRole("button", { name: /Guardar Cambios/ })).toBeEnabled());
    submit();
    await waitFor(() => expect(documentsService.update).toHaveBeenCalledWith(42,
      { description: "Original", documentNumber: "Manual / 8" }));
  });
  it("opens a concrete document unchecked and preserves its selection when unchanged", async () => {
    const doc = makeDocument({
      documentTypeId: 12,
      documentType: { id: 12, name: "Oficio" },
    });
    jest.mocked(documentsService.getOne).mockResolvedValue(doc);
    setup(doc);

    const general = await screen.findByRole("checkbox", {
      name: "Documento general",
    });
    await waitForDefault();
    expect(general).not.toBeChecked();
    expect(
      screen.getByRole("combobox", { name: "Tipo de documento" }),
    ).toHaveTextContent("Oficio");
    openTypeOptions();
    expect(
      screen.getAllByRole("option").map((option) => option.textContent),
    ).toContain("Oficio");
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Guardar Cambios/ })).toBeEnabled(),
    );
    submit();
    await waitFor(() => expect(documentsService.update).toHaveBeenCalled());
    expect(documentsService.update).toHaveBeenCalledWith(
      42,
      { description: "Original" },
    );
  });

  it("checks Documento general to submit the persisted default and clear the category", async () => {
    const doc = makeDocument({
      documentTypeId: 12,
      documentType: { id: 12, name: "Oficio" },
      categoryId: 7,
    });
    jest.mocked(documentsService.getOne).mockResolvedValue(doc);
    setup(doc);

    const general = await screen.findByRole("checkbox", {
      name: "Documento general",
    });
    await waitForDefault();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Guardar Cambios/ })).toBeEnabled(),
    );
    fireEvent.click(general);
    expect(general).toBeChecked();
    submit();
    await waitFor(() => expect(documentsService.update).toHaveBeenCalled());
    const payload = jest
      .mocked(documentsService.update)
      .mock.calls.at(-1)![1] as Record<string, unknown>;
    expect(payload.documentTypeId).toBe(defaultTypeId);
    expect(payload.categoryId).toBeUndefined();
  });

  it("opens a document already using the default type checked and disabled", async () => {
    const doc = makeDocument({
      documentTypeId: defaultTypeId,
      documentType: { id: defaultTypeId, name: "Documento general" },
    });
    jest.mocked(documentsService.getOne).mockResolvedValue(doc);
    setup(doc);

    const general = await screen.findByRole("checkbox", {
      name: "Documento general",
    });
    await waitForDefault();
    expect(general).toBeChecked();
    expect(
      screen.getByRole("combobox", { name: "Tipo de documento" }),
    ).toBeDisabled();
  });

  it("selects a concrete type and derives its category", async () => {
    const doc = makeDocument({
      documentTypeId: defaultTypeId,
      documentType: { id: defaultTypeId, name: "Documento general" },
    });
    jest.mocked(documentsService.getOne).mockResolvedValue(doc);
    setup(doc);

    await screen.findByRole("checkbox", { name: "Documento general" });
    await waitForDefault();
    // Al elegir un tipo concreto hay que desmarcar `Documento general`.
    fireEvent.click(
      screen.getByRole("checkbox", { name: "Documento general" }),
    );
    openTypeOptions();
    fireEvent.click(await screen.findByRole("option", { name: "Oficio" }));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /Guardar Cambios/ })).toBeEnabled(),
    );
    submit();
    await waitFor(() => expect(documentsService.update).toHaveBeenCalled());
    const payload = jest
      .mocked(documentsService.update)
      .mock.calls.at(-1)![1] as Record<string, unknown>;
    expect(payload.documentTypeId).toBe(12);
    expect(payload).not.toHaveProperty("categoryId");
  });

  it("excludes the persisted default type from the concrete dropdown", async () => {
    const doc = makeDocument({
      documentTypeId: 12,
      documentType: { id: 12, name: "Oficio" },
    });
    jest.mocked(documentsService.getOne).mockResolvedValue(doc);
    setup(doc);

    await screen.findByRole("checkbox", { name: "Documento general" });
    await waitForDefault();
    openTypeOptions();
    expect(
      screen.getAllByRole("option").map((option) => option.textContent),
    ).toEqual(["Oficio"]);
    fireEvent.keyDown(screen.getByRole("listbox"), { key: "Escape" });
  });
});
