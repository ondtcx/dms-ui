import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreateTemplateDialog } from "../CreateTemplateDialog";
import { templatesService } from "@/lib/services/templates.service";
import { categoriesService } from "@/lib/services/categories.service";
import { documentTypesService } from "@/lib/services/document-types.service";
import type { DocumentTemplate } from "@/lib/types";

beforeAll(() => {
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});

jest.mock("@/lib/services/templates.service", () => ({
  templatesService: { create: jest.fn(), update: jest.fn() },
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

Object.assign(HTMLElement.prototype, {
  hasPointerCapture: () => false,
  setPointerCapture: () => undefined,
  releasePointerCapture: () => undefined,
  scrollIntoView: () => undefined,
});

const defaultTypeId = 22;

const makeTemplate = (overrides: Partial<DocumentTemplate> = {}): DocumentTemplate => ({
  id: 42,
  name: "Acta existente",
  documentTypeId: 12,
  documentType: { id: 12, name: "Oficio" },
  description: null,
  fields: { fields: [{ name: "titulo", label: "Título", type: "text", required: false }] },
  htmlTemplate: "<p>{{titulo}}</p>",
  styles: null,
  outputFormat: "pdf",
  pageSize: "A4",
  orientation: "portrait",
  isActive: true,
  categoryId: 5,
  category: { id: 5, name: "Académico", color: "#000000", icon: "file", allowedRoles: [] },
  createdById: "user-1",
  createdBy: { id: "user-1", name: "Admin", email: "admin@example.com" },
  createdAt: "",
  updatedAt: "",
  ...overrides,
});

function renderDialog(template?: DocumentTemplate) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <CreateTemplateDialog open onOpenChange={jest.fn()} template={template ?? null} />
    </QueryClientProvider>,
  );
}

async function fillRequiredFields() {
  fireEvent.change(screen.getByLabelText(/Nombre de la plantilla/), {
    target: { value: "Acta" },
  });
  fireEvent.mouseDown(screen.getByRole("tab", { name: "Campos" }), {
    button: 0,
  });
  fireEvent.click(screen.getByRole("button", { name: /Agregar Campo/ }));
  fireEvent.change(screen.getByLabelText("Nombre del campo *"), {
    target: { value: "titulo" },
  });
  fireEvent.change(screen.getByLabelText("Etiqueta *"), {
    target: { value: "Título" },
  });
  fireEvent.mouseDown(screen.getByRole("tab", { name: "Básico" }), {
    button: 0,
  });
}

async function selectCategory() {
  fireEvent.keyDown(screen.getByRole("combobox", { name: "Categoría" }), {
    key: "Enter",
  });
  fireEvent.click(await screen.findByRole("option", { name: "Académico" }));
  await waitFor(() =>
    expect(
      screen.getByRole("combobox", { name: "Subtipo de documento" }),
    ).not.toBeDisabled(),
  );
}

const generalCheckbox = () =>
  screen.getByRole("checkbox", { name: "Documento general" });

async function waitForDefault() {
  await waitFor(() => expect(generalCheckbox()).not.toBeDisabled());
}

describe("CreateTemplateDialog general document type", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(categoriesService.getActive).mockResolvedValue([
      { id: 5, name: "Académico", isActive: true, allowedRoles: [] },
    ] as never);
    jest.mocked(documentTypesService.getActive).mockResolvedValue([
      { id: 12, name: "Oficio", categoryId: 5 },
      { id: defaultTypeId, name: "Documento general", categoryId: null, isDefault: true },
    ] as never);
    jest.mocked(templatesService.create).mockResolvedValue(makeTemplate());
    jest.mocked(templatesService.update).mockResolvedValue(makeTemplate());
  });

  it("creates a template without a concrete type when nothing is selected", async () => {
    renderDialog();
    await fillRequiredFields();

    fireEvent.click(screen.getByRole("button", { name: "Crear Plantilla" }));

    await waitFor(() => expect(templatesService.create).toHaveBeenCalled());
    const payload = jest.mocked(templatesService.create).mock.calls[0][0];
    expect(payload.documentTypeId).toBeUndefined();
  });

  it("checks Documento general to select the persisted default and disable the selector", async () => {
    renderDialog();
    await fillRequiredFields();
    await selectCategory();
    await waitForDefault();

    expect(generalCheckbox()).not.toBeChecked();
    fireEvent.click(generalCheckbox());

    expect(generalCheckbox()).toBeChecked();
    expect(
      screen.getByRole("combobox", { name: "Subtipo de documento" }),
    ).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Crear Plantilla" }));

    await waitFor(() => expect(templatesService.create).toHaveBeenCalled());
    const payload = jest.mocked(templatesService.create).mock.calls[0][0];
    expect(payload.documentTypeId).toBe(defaultTypeId);
    expect(payload.categoryId).toBeUndefined();
  });

  it("unchecks Documento general and requires a category before concrete selection", async () => {
    renderDialog();
    await fillRequiredFields();
    await selectCategory();
    await waitForDefault();

    fireEvent.click(generalCheckbox());
    expect(generalCheckbox()).toBeChecked();

    fireEvent.click(generalCheckbox());

    expect(generalCheckbox()).not.toBeChecked();
    // Al marcar `Documento general` se limpió la categoría, así que el selector
    // de subtipo permanece deshabilitado hasta elegir una categoría.
    expect(
      screen.getByRole("combobox", { name: "Subtipo de documento" }),
    ).toBeDisabled();

    await selectCategory();
    expect(
      screen.getByRole("combobox", { name: "Subtipo de documento" }),
    ).not.toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Crear Plantilla" }));

    await waitFor(() => expect(templatesService.create).toHaveBeenCalled());
    const payload = jest.mocked(templatesService.create).mock.calls[0][0];
    expect(payload.documentTypeId).toBeUndefined();
  });

  it("opens an existing concrete template unchecked and preserves its type", async () => {
    renderDialog(makeTemplate({ documentTypeId: 12, documentType: { id: 12, name: "Oficio" } }));

    await waitForDefault();
    expect(generalCheckbox()).not.toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));

    await waitFor(() => expect(templatesService.update).toHaveBeenCalled());
    const [id, payload] = jest.mocked(templatesService.update).mock.calls[0];
    expect(id).toBe(42);
    expect(payload.documentTypeId).toBe(12);
  });

  it("checks Documento general on an existing template to submit the default type", async () => {
    renderDialog(makeTemplate({ documentTypeId: 12, documentType: { id: 12, name: "Oficio" } }));

    await waitForDefault();
    fireEvent.click(generalCheckbox());
    fireEvent.click(screen.getByRole("button", { name: "Actualizar" }));

    await waitFor(() => expect(templatesService.update).toHaveBeenCalled());
    const [, payload] = jest.mocked(templatesService.update).mock.calls[0];
    expect(payload.documentTypeId).toBe(defaultTypeId);
  });

  it("excludes the persisted default type from the concrete dropdown", async () => {
    renderDialog();
    await fillRequiredFields();
    await selectCategory();
    await waitForDefault();

    fireEvent.keyDown(
      screen.getByRole("combobox", { name: "Subtipo de documento" }),
      { key: "Enter" },
    );
    const options = screen
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(options).not.toContain("Documento general");
    expect(options).toContain("Oficio");
  });
});
