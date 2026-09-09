import userEvent from "@testing-library/user-event";
import { render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DocumentsPage from "../page";
import { documentsService } from "@/lib/services/documents.service";
import type { Document } from "@/lib/types";

const user = { id: "user-1", role: "admin" };
const push = jest.fn();

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
    uploadDocumentTypes: [],
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
  useRouter: () => ({ push }),
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
  DirectoryNavigation: () => <div>Directory navigation</div>,
}));

jest.mock("@/components/documents/DirectoryVisitRecorder", () => ({
  DirectoryVisitRecorder: () => null,
}));

jest.mock("@/components/documents/NewDocumentButton", () => ({
  NewDocumentButton: () => <button type="button">Nuevo documento</button>,
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
    jest.mocked(documentsService.getAll).mockResolvedValue({
      data: documents,
      meta: { total: documents.length, page: 1, limit: 50, totalPages: 1 },
    });
    jest.mocked(documentsService.getStats).mockResolvedValue({
      totalDocuments: documents.length,
      totalSizeMB: 6,
    });
  });

  it("defaults to cards and renders every filtered document", async () => {
    renderPage();

    const cardList = await screen.findByRole("list", { name: "Documentos" });
    expect(within(cardList).getAllByTestId("document-card")).toHaveLength(2);
    expect(within(cardList).getByText("First document.pdf")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Vista de tarjetas" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Vista de lista" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByTestId("document-list-item")).not.toBeInTheDocument();
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

    const search = await screen.findByPlaceholderText("Buscar documentos...");
    await interaction.type(search, "First");
    await interaction.click(screen.getByRole("button", { name: "Mis documentos" }));
    await interaction.click(screen.getByRole("checkbox", { name: "Seleccionar First document.pdf" }));
    await interaction.click(screen.getByRole("button", { name: "Vista de lista" }));
    await interaction.click(
      within(screen.getAllByTestId("document-list-item")[0]).getByRole("button", {
        name: "Ver",
      }),
    );

    expect(screen.getByPlaceholderText("Buscar documentos...")).toHaveValue("First");
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
