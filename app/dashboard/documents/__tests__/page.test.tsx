import userEvent from "@testing-library/user-event";
import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DocumentsPage from "../page";
import { documentsService } from "@/lib/services/documents.service";
import type { Document } from "@/lib/types";

const user = { id: "user-1", role: "admin" };
const push = jest.fn();
const replace = jest.fn();
let currentSearch = "";

jest.mock("@/lib/contexts/AuthContext", () => ({
  useAuth: () => ({ user }),
}));

jest.mock("@/hooks/use-permissions", () => ({
  usePermissions: () => ({ isAdmin: () => true }),
}));

jest.mock("@/hooks/use-upload-metadata", () => ({
  useUploadMetadata: () => ({
    categories: [],
    loadingCategories: false,
    academicYears: [],
    uploadDocumentTypes: [{ id: 12, name: "Oficio" }],
    defaultDocumentType: { id: 12, name: "Oficio", categoryId: 4 },
    selectedCategory: undefined,
  }),
}));

jest.mock("@/hooks/use-document-thumbnails", () => ({
  useDocumentThumbnails: () => ({ thumbnailUrls: {} }),
}));

jest.mock("@/components/structure/AcademicYearSelector", () => ({
  useAcademicYearStore: () => ({ currentYearId: null }),
}));

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace }),
  useSearchParams: () => new URLSearchParams(currentSearch),
}));

jest.mock("react-hot-toast", () => ({
  __esModule: true,
  default: { success: jest.fn(), error: jest.fn() },
}));

jest.mock("@/lib/services/documents.service", () => ({
  documentsService: {
    getAll: jest.fn(),
    getStats: jest.fn(),
    delete: jest.fn(),
    upload: jest.fn(),
    uploadMultiple: jest.fn(),
    download: jest.fn(),
    view: jest.fn(),
    moveToDirectory: jest.fn(),
    getThumbnail: jest.fn(),
  },
}));

jest.mock("@/lib/services/onlyoffice.service", () => ({
  onlyofficeService: { createBlank: jest.fn() },
}));

jest.mock("@/components/documents/DirectoryNavigation", () => ({
  DirectoryNavigation: ({ compact }: { compact?: boolean }) => compact ? (
    <div data-testid="compact-directory-navigation">
      <a href="/dashboard/directories">Administrar directorios</a>
    </div>
  ) : <div>Directory navigation</div>,
}));

jest.mock("@/components/documents/DirectoryVisitRecorder", () => ({
  DirectoryVisitRecorder: () => null,
}));

jest.mock("@/components/documents/NewDocumentButton", () => ({
  NewDocumentButton: ({
    open,
    onOpenChange,
    onUploadSingle,
    onUploadMultiple,
  }: {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onUploadSingle?: () => void;
    onUploadMultiple?: () => void;
  }) => (
    <div>
      <button type="button" onClick={() => onOpenChange?.(!open)}>Nuevo documento</button>
      {open && (
        <div role="menu">
          <span>Crear Documento</span>
          <button type="button" onClick={onUploadSingle}>Subir Archivo</button>
          <button type="button" onClick={onUploadMultiple}>Subir Múltiples Archivos</button>
        </div>
      )}
    </div>
  ),
}));

jest.mock("@/components/documents/TrashView", () => ({
  TrashView: () => <div>Vista de papelera</div>,
}));

jest.mock("@/components/documents/batch-actions-bar", () => ({
  BatchActionsBar: () => null,
}));

jest.mock("@/components/documents/BatchListSection", () => ({
  BatchListSection: () => <div>Document batches</div>,
}));

jest.mock("@/components/documents/SelectTemplateDialog", () => ({
  SelectTemplateDialog: () => null,
}));

jest.mock("@/components/documents/DocumentCard", () => ({
  DocumentCard: ({ doc, isSelected, onToggle, onPreview }: {
    doc: Document;
    isSelected: boolean;
    onToggle: (doc: Document) => void;
    onPreview: (doc: Document) => void;
  }) => (
    <li data-testid="document-card">
      <article>
        <h3>{doc.versions?.[0]?.filename}</h3>
        <input
          type="checkbox"
          aria-label={`Seleccionar ${doc.versions?.[0]?.filename}`}
          checked={isSelected}
          onChange={() => onToggle(doc)}
        />
        <button type="button" onClick={() => onPreview(doc)}>Ver</button>
      </article>
    </li>
  ),
}));

jest.mock("@/components/documents/DocumentListItem", () => ({
  DocumentListItem: ({ doc, isSelected, onToggle, onPreview }: {
    doc: Document;
    isSelected: boolean;
    onToggle: (doc: Document) => void;
    onPreview: (doc: Document) => void;
  }) => (
    <div data-testid="document-list-item">
      <h3>{doc.versions?.[0]?.filename}</h3>
      <input
        type="checkbox"
        aria-label={`Seleccionar ${doc.versions?.[0]?.filename}`}
        checked={isSelected}
        onChange={() => onToggle(doc)}
      />
      <button type="button" onClick={() => onPreview(doc)}>Ver</button>
    </div>
  ),
}));

const documents = [
  {
    id: 42,
    description: "First document",
    categoryId: 7,
    category: { id: 7, name: "Administrativo", color: "#1d4ed8" },
    isPublic: false,
    uploadedBy: { id: "user-1", name: "Ana Torres", email: "ana@example.com", role: "admin" },
    uploadedById: "user-1",
    templateId: null,
    currentVersion: 1,
    versions: [{ id: 100, documentId: 42, version: 1, filename: "First document.pdf", mimetype: "application/pdf", size: 2048, createdAt: "2026-09-01T10:00:00.000Z" }],
    workflow: null,
    deletedAt: null,
    deletedBy: null,
    deletedById: null,
    archivedAt: null,
    documentNumber: "DOC-0042",
    createdAt: "2026-09-01T10:00:00.000Z",
    updatedAt: "2026-09-01T10:00:00.000Z",
  },
  {
    id: 43,
    description: "Second document",
    categoryId: 7,
    category: { id: 7, name: "Administrativo", color: "#1d4ed8" },
    isPublic: true,
    uploadedBy: { id: "user-2", name: "Luis Pérez", email: "luis@example.com", role: "user" },
    uploadedById: "user-2",
    templateId: null,
    currentVersion: 1,
    versions: [{ id: 101, documentId: 43, version: 1, filename: "Second document.docx", mimetype: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 4096, createdAt: "2026-09-02T10:00:00.000Z" }],
    workflow: null,
    deletedAt: null,
    deletedBy: null,
    deletedById: null,
    archivedAt: null,
    documentNumber: "DOC-0043",
    createdAt: "2026-09-02T10:00:00.000Z",
    updatedAt: "2026-09-02T10:00:00.000Z",
  },
];

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <DocumentsPage />
    </QueryClientProvider>,
  );
}

describe("DocumentsPage presentation switching", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    currentSearch = "";
    jest.mocked(documentsService.getAll).mockResolvedValue({
      data: documents as unknown as Document[],
      meta: { total: documents.length, page: 1, limit: 50, totalPages: 1 },
    });
    jest.mocked(documentsService.getStats).mockResolvedValue({
      totalDocuments: documents.length,
      totalSize: 6,
      totalSizeMB: "6",
    });
  });

  it("keeps directory navigation out of the page and places the new action beside the documents title", async () => {
    renderPage();

    const cardList = await screen.findByRole("list", { name: "Documentos" });
    const documentsCard = cardList.closest('[data-slot="card"]');
    const documentsTitle = within(documentsCard as HTMLElement).getByText("Documentos", { selector: '[data-slot="card-title"]' });
    const titleRow = documentsTitle.parentElement?.parentElement;

    expect(screen.queryByTestId("compact-directory-navigation")).not.toBeInTheDocument();
    expect(documentsCard).not.toBeNull();
    expect(titleRow).not.toBeNull();
    expect(within(titleRow as HTMLElement).getByRole("button", { name: "Nuevo documento" })).toBeInTheDocument();
    expect(within(documentsCard as HTMLElement).getByRole("combobox")).toHaveAttribute("data-size", "sm");
    expect(screen.getAllByRole("combobox")).toHaveLength(1);
  });

  it("defaults to cards and renders every filtered document", async () => {
    renderPage();

    const cardList = await screen.findByRole("list", { name: "Documentos" });
    expect(within(cardList).getAllByTestId("document-card")).toHaveLength(2);
    expect(within(cardList).getByText("First document.pdf")).toBeInTheDocument();
    expect(cardList).toHaveClass("xl:grid-cols-5");
    expect(screen.getByRole("combobox")).toHaveAttribute("data-size", "sm");
    expect(screen.queryByPlaceholderText("Buscar documentos...")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Vista de tarjetas" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Vista de lista" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByTestId("document-list-item")).not.toBeInTheDocument();
  });

  it("excludes residual workflow PDFs while keeping normal documents visible", async () => {
    const residualDocument = {
      ...documents[0],
      id: 44,
      versions: [{
        ...documents[0].versions[0],
        id: 102,
        documentId: 44,
        filename: "Workflow-1788839333360-WP4WBR.PDF",
      }],
    };
    jest.mocked(documentsService.getAll).mockResolvedValue({
      data: [...documents, residualDocument],
      meta: { total: 3, page: 1, limit: 50, totalPages: 1 },
    } as never);

    renderPage();

    const cardList = await screen.findByRole("list", { name: "Documentos" });
    expect(within(cardList).getAllByTestId("document-card")).toHaveLength(2);
    expect(within(cardList).getByText("First document.pdf")).toBeInTheDocument();
    expect(within(cardList).getByText("Second document.docx")).toBeInTheDocument();
    expect(within(cardList).queryByText("Workflow-1788839333360-WP4WBR.PDF")).not.toBeInTheDocument();
    expect(screen.getByText("2 documento(s) encontrado(s)")).toBeInTheDocument();
  });

  it("requests recent accessed documents without automatic list exclusions", async () => {
    currentSearch = "view=recent-accessed";
    renderPage();

    await screen.findByRole("list", { name: "Documentos" });

    expect(documentsService.getAll).toHaveBeenCalledWith(expect.objectContaining({
      view: "recent-accessed",
    }));
    const request = jest.mocked(documentsService.getAll).mock.calls[0][0];
    expect(request).not.toHaveProperty("academicYearId");
    expect(request).not.toHaveProperty("excludeBatched");
  });

  it("keeps residual filenames in the explicit all-documents view", async () => {
    currentSearch = "view=all";
    const residualDocument = {
      ...documents[0],
      id: 44,
      versions: [{
        ...documents[0].versions[0],
        id: 102,
        documentId: 44,
        filename: "Workflow-1788839333360-WP4WBR.PDF",
      }],
    };
    jest.mocked(documentsService.getAll).mockResolvedValue({
      data: [...documents, residualDocument],
      meta: { total: 3, page: 1, limit: 50, totalPages: 1 },
    } as never);

    renderPage();

    const cardList = await screen.findByRole("list", { name: "Documentos" });
    expect(within(cardList).getAllByTestId("document-card")).toHaveLength(3);
    expect(within(cardList).getByText("Workflow-1788839333360-WP4WBR.PDF")).toBeInTheDocument();
  });

  it("opens the creation menu from the URL-backed new action", async () => {
    currentSearch = "action=new";
    renderPage();

    expect(await screen.findByRole("menu")).toHaveTextContent("Crear Documento");
  });

  it("requires an explicit document type before uploading", async () => {
    const interaction = userEvent.setup();
    renderPage();

    await interaction.click(screen.getByRole("button", { name: "Nuevo documento" }));
    await interaction.click(screen.getByRole("button", { name: "Subir Archivo" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("combobox")).toHaveTextContent(
      "Selecciona un tipo de documento",
    );

    await interaction.upload(
      within(dialog).getByLabelText("Archivo *"),
      new File(["content"], "notes.txt", { type: "text/plain" }),
    );
    await interaction.click(within(dialog).getByRole("button", { name: "Subir Documento" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Selecciona un tipo de documento",
    );
    expect(documentsService.upload).not.toHaveBeenCalled();
  });

  it("does not auto-select the editor default in the upload form", async () => {
    const interaction = userEvent.setup();
    renderPage();

    await interaction.click(screen.getByRole("button", { name: "Nuevo documento" }));
    await interaction.click(screen.getByRole("button", { name: "Subir Archivo" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("combobox")).toHaveTextContent(
      "Selecciona un tipo de documento",
    );
    expect(within(dialog).queryByText("(Predeterminado)")).not.toBeInTheDocument();
  });

  it("renders the trash view on the canonical Documents route", async () => {
    currentSearch = "view=trash";
    renderPage();

    expect(await screen.findByText("Vista de papelera")).toBeInTheDocument();
    expect(documentsService.getAll).not.toHaveBeenCalled();
  });

  it("updates selected state and switches between the same card and list documents", async () => {
    const interaction = userEvent.setup();
    renderPage();

    const firstCheckbox = await screen.findByRole("checkbox", { name: "Seleccionar First document.pdf" });
    await interaction.click(firstCheckbox);
    await interaction.click(screen.getByRole("button", { name: "Vista de lista" }));

    expect(screen.getByRole("button", { name: "Vista de lista" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Vista de tarjetas" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getAllByTestId("document-list-item")).toHaveLength(2);
    expect(screen.getByRole("checkbox", { name: "Seleccionar First document.pdf" })).toBeChecked();

    await interaction.click(screen.getByRole("button", { name: "Vista de tarjetas" }));
    expect(screen.getAllByTestId("document-card")).toHaveLength(2);
    expect(screen.getByRole("checkbox", { name: "Seleccionar First document.pdf" })).toBeChecked();
  });

  it("keeps both view controls keyboard operable with selected state exposed", async () => {
    const interaction = userEvent.setup();
    renderPage();

    const listButton = await screen.findByRole("button", { name: "Vista de lista" });
    expect(listButton).toHaveAttribute("type", "button");
    listButton.focus();
    expect(document.activeElement).toBe(listButton);

    await interaction.keyboard("{Enter}");

    expect(listButton).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Vista de tarjetas" })).toHaveAttribute("aria-pressed", "false");
  });

  it("preserves filters, selection, and dialog behavior while switching", async () => {
    const interaction = userEvent.setup();
    jest.mocked(documentsService.view).mockImplementation(() => new Promise(() => {}));
    renderPage();

    await interaction.click(screen.getByRole("button", { name: "Mis documentos" }));
    await interaction.click(screen.getByRole("checkbox", { name: "Seleccionar First document.pdf" }));
    await interaction.click(screen.getByRole("button", { name: "Vista de lista" }));
    await interaction.click(
      within(screen.getAllByTestId("document-list-item")[0]).getByRole("button", {
        name: "Ver",
      }),
    );

    expect(screen.queryByPlaceholderText("Buscar documentos...")).not.toBeInTheDocument();
    expect(screen.getByText(/1 seleccionado/)).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveTextContent("Vista Previa: First document.pdf");
  });

  it("resets to cards on a new mount without reading or writing a view preference", async () => {
    const interaction = userEvent.setup();
    const getItem = jest.spyOn(Storage.prototype, "getItem");
    const setItem = jest.spyOn(Storage.prototype, "setItem");
    const firstRender = renderPage();

    await interaction.click(await screen.findByRole("button", { name: "Vista de lista" }));
    firstRender.unmount();
    renderPage();

    expect(await screen.findByRole("button", { name: "Vista de tarjetas" })).toHaveAttribute("aria-pressed", "true");
    expect(getItem.mock.calls.flat().filter((key) => key.toLowerCase().includes("view"))).toHaveLength(0);
    expect(setItem.mock.calls.flat().filter((key) => key.toLowerCase().includes("view"))).toHaveLength(0);

    getItem.mockRestore();
    setItem.mockRestore();
  });
});
