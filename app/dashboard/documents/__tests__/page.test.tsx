import userEvent from "@testing-library/user-event";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DocumentsPage from "../page";
import { documentsService } from "@/lib/services/documents.service";
import { academicYearsService } from "@/lib/services/academic-years.service";
import type { Document } from "@/lib/types";
import toast from "react-hot-toast";

const user = { id: "user-1", role: "admin" };
const push = jest.fn();
const replace = jest.fn();
let currentSearch = "";
let mockBatchProps: any;
let browsingYear: number | null = null;
let useRealYearStore = false;
const yearStore = jest.requireActual<
  typeof import("@/components/structure/AcademicYearSelector")
>("@/components/structure/AcademicYearSelector").useAcademicYearStore;
const currentYear = {
  id: 1,
  name: "Current year",
  isCurrent: true,
  isActive: true,
  startDate: "2026-01-01",
  endDate: "2026-12-31",
};
const historicalYear = {
  ...currentYear,
  id: 2,
  name: "Historical year",
  isCurrent: false,
  isActive: false,
};
let uploadYears: (typeof currentYear)[] | undefined = [
  currentYear,
  historicalYear,
];

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
    academicYears: uploadYears,
    uploadDocumentTypes: [
      { id: 12, name: "Oficio" },
      { id: 22, name: "Documento general", isDefault: true },
    ],
    defaultDocumentType: { id: 22, name: "Documento general", isDefault: true },
    selectedCategory: undefined,
  }),
}));

jest.mock("@/hooks/use-document-thumbnails", () => ({
  useDocumentThumbnails: () => ({ thumbnailUrls: {} }),
}));

jest.mock("@/components/structure/AcademicYearSelector", () => {
  const actual = jest.requireActual<
    typeof import("@/components/structure/AcademicYearSelector")
  >("@/components/structure/AcademicYearSelector");
  return {
    ...actual,
    useAcademicYearStore: () => {
      const state = actual.useAcademicYearStore();
      return useRealYearStore ? state : { currentYearId: browsingYear };
    },
  };
});

jest.mock("@/lib/services/academic-years.service", () => ({
  academicYearsService: { getAll: jest.fn() },
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
    getOne: jest.fn(),
    update: jest.fn(),
    replaceFile: jest.fn(),
    getStats: jest.fn(),
    delete: jest.fn(),
    upload: jest.fn(),
    uploadMultiple: jest.fn(),
    download: jest.fn(),
    view: jest.fn(),
    moveToDirectory: jest.fn(),
    getThumbnail: jest.fn(),
    getDirectoryBreadcrumb: jest.fn(),
    getReception: jest.fn(),
    getDirectoryContext: jest.fn(),
  },
}));

jest.mock("@/lib/services/onlyoffice.service", () => ({
  onlyofficeService: { createBlank: jest.fn() },
}));
jest.mock("@/lib/services/categories.service", () => ({
  categoriesService: { getActive: async () => [] },
}));
beforeAll(() => {
  global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
});

jest.mock("@/components/documents/DirectoryNavigation", () => ({
  ...jest.requireActual("@/components/documents/DirectoryNavigation"),
  DirectoryNavigation: ({ compact, onChange, picker }: { compact?: boolean; picker?: boolean; onChange?: (id: number | null) => void }) =>
    compact ? (
      <div data-testid="compact-directory-navigation">
        <a href="/dashboard/directories">Administrar directorios</a>
      </div>
    ) : (
      <div>Directory navigation
        <button onClick={() => onChange?.(99)}>{picker ? "Explorar destino de solo lectura" : "Abrir subcarpeta"}</button>
        <button onClick={() => onChange?.(100)}>{picker ? "Explorar destino con carga" : "Abrir otra subcarpeta"}</button>
        <button onClick={() => onChange?.(null)}>Ir a raíz</button>
      </div>
    ),
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
    uploadDisabled,
  }: {
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onUploadSingle?: () => void;
    onUploadMultiple?: () => void;
    uploadDisabled?: boolean;
  }) => (
    <div>
      <button type="button" onClick={() => onOpenChange?.(!open)}>
        Nuevo documento
      </button>
      {open && (
        <div role="menu">
          <span>Crear Documento</span>
          <button type="button" disabled={uploadDisabled} onClick={onUploadSingle}>
            Subir Archivo
          </button>
          <button
            type="button"
            disabled={uploadDisabled}
            onClick={onUploadMultiple}
          >
            Subir Múltiples Archivos
          </button>
        </div>
      )}
    </div>
  ),
}));

beforeEach(() => {
  jest.mocked(documentsService.getDirectoryBreadcrumb).mockResolvedValue([]);
  jest.mocked(documentsService.getDirectoryContext).mockImplementation(async (id) => {
    const breadcrumb = await documentsService.getDirectoryBreadcrumb(id) ?? [];
    const directory = breadcrumb.find(entry => entry.id === id) ?? {
      id, name: "Carpeta", parentId: null, createdById: "user-1", createdAt: "", updatedAt: "",
    };
    return {
      directory: { ...directory, capabilities: { owner: false, canView: true, canEdit: false, canUploadVersion: id !== 99, canShare: false } },
      breadcrumb,
      reception: directory.receptionEnabled ? await documentsService.getReception(id) : undefined,
    };
  });
});

jest.mock("@/components/documents/TrashView", () => ({
  TrashView: () => <div>Vista de papelera</div>,
}));

jest.mock("@/components/documents/batch-actions-bar", () => ({
  BatchActionsBar: (props: any) => {
    mockBatchProps = { ...props, authorize: props.authorize ?? (() => true) };
    return null;
  },
}));

jest.mock("@/components/documents/BatchListSection", () => ({
  BatchListSection: () => <div>Document batches</div>,
}));

jest.mock("@/components/documents/SelectTemplateDialog", () => ({
  SelectTemplateDialog: () => null,
}));

jest.mock("@/components/documents/DocumentCard", () => ({
  DocumentCard: ({
    doc,
    isSelected,
    onToggle,
    onPreview,
    onDelete,
    onMove,
    onEdit,
  }: {
    doc: Document;
    isSelected: boolean;
    onToggle: (doc: Document) => void;
    onPreview: (doc: Document) => void;
    onDelete: (id: number) => void;
    onMove: (doc: Document) => void;
    onEdit: (doc: Document) => void;
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
        <button type="button" onClick={() => onPreview(doc)}>
          Ver
        </button>
        <button onClick={() => onDelete(doc.id)}>Solicitar eliminar {doc.id}</button>
        <button onClick={() => onMove(doc)}>Solicitar mover {doc.id}</button>
        <button onClick={() => onEdit(doc)}>Editar {doc.id}</button>
      </article>
    </li>
  ),
}));

jest.mock("@/components/documents/DocumentListItem", () => ({
  DocumentListItem: ({
    doc,
    isSelected,
    onToggle,
    onPreview,
  }: {
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
      <button type="button" onClick={() => onPreview(doc)}>
        Ver
      </button>
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
    uploadedBy: {
      id: "user-1",
      name: "Ana Torres",
      email: "ana@example.com",
      role: "admin",
    },
    uploadedById: "user-1",
    templateId: null,
    currentVersion: 1,
    versions: [
      {
        id: 100,
        documentId: 42,
        version: 1,
        filename: "First document.pdf",
        mimetype: "application/pdf",
        size: 2048,
        createdAt: "2026-09-01T10:00:00.000Z",
      },
    ],
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
    uploadedBy: {
      id: "user-2",
      name: "Luis Pérez",
      email: "luis@example.com",
      role: "user",
    },
    uploadedById: "user-2",
    templateId: null,
    currentVersion: 1,
    versions: [
      {
        id: 101,
        documentId: 43,
        version: 1,
        filename: "Second document.docx",
        mimetype:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        size: 4096,
        createdAt: "2026-09-02T10:00:00.000Z",
      },
    ],
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
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const view = render(
    <QueryClientProvider client={client}>
      <DocumentsPage />
    </QueryClientProvider>,
  );
  return { ...view, client };
}

function receptionSettings(submit: boolean): import("@/lib/types").ReceptionSettings {
  return {
    directoryId: 7,
    enabled: true,
    singleDocumentPerParticipant: false,
    capabilities: {
      configure: false,
      manageParticipants: false,
      readAll: false,
      review: false,
      manageDelegates: false,
      manageStructure: false,
      owner: false,
      discover: true,
      submit,
      peerRead: false,
    },
  };
}

function selectUploadOption(dialog: HTMLElement, name: string, option: string) {
  const originalScrollIntoView = HTMLElement.prototype.scrollIntoView;
  HTMLElement.prototype.scrollIntoView = jest.fn();
  try {
    fireEvent.keyDown(within(dialog).getByRole("combobox", { name }), {
      key: "Enter",
    });
    fireEvent.click(screen.getByRole("option", { name: option }));
  } finally {
    HTMLElement.prototype.scrollIntoView = originalScrollIntoView;
  }
}

describe("DocumentsPage presentation switching", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    user.id = "user-1";
    jest.mocked(documentsService.delete).mockResolvedValue(undefined as never);
    jest.mocked(documentsService.moveToDirectory).mockResolvedValue(undefined as never);
    currentSearch = "";
    browsingYear = null;
    useRealYearStore = false;
    yearStore.setState({
      currentYearId: null,
      persistedUserId: null,
      hasInitializedYear: false,
    });
    jest
      .mocked(academicYearsService.getAll)
      .mockResolvedValue({ data: [currentYear, historicalYear], total: 2 });
    uploadYears = [currentYear, historicalYear];
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

  it("does not open trash or movement from missing capabilities despite admin role", async () => {
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Solicitar eliminar 42" }));
    expect(screen.queryByRole("dialog", { name: "Eliminar documento" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Solicitar mover 42" }));
    expect(screen.queryByRole("dialog", { name: "Mover documento" })).not.toBeInTheDocument();
    expect(documentsService.delete).not.toHaveBeenCalled();
    expect(documentsService.moveToDirectory).not.toHaveBeenCalled();
  });

  const allowActions = () => {
    const snapshot = { scope: "ordinary" as const, editMetadata: true, editContent: true,
      move: true, trash: true, restore: false, permanentDelete: false, manageSharing: false };
    const rows = documents.map((doc) => ({ ...doc, actionCapabilities: snapshot })) as unknown as Document[];
    jest.mocked(documentsService.getAll).mockResolvedValue({ data: rows,
      meta: { total: rows.length, page: 1, limit: 50, totalPages: 1 } });
    return rows;
  };

  it("shows folder navigation beside documents and preserves filters in compatible folder links", async () => {
    currentSearch = "directoryId=7&filter=kept";
    renderPage();
    expect(await screen.findByRole("list", { name: "Documentos" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Contenido de la carpeta" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Abrir subcarpeta" }));
    expect(push).toHaveBeenCalledWith("/dashboard/documents?directoryId=99&filter=kept");
    fireEvent.click(screen.getByRole("button", { name: "Ir a raíz" }));
    expect(push).toHaveBeenCalledWith("/dashboard/documents?filter=kept");
  });

  it("does not restrict the all-documents view to the hierarchy root", async () => {
    currentSearch = "view=all";
    renderPage();
    await screen.findByRole("list", { name: "Documentos" });
    expect(documentsService.getAll).toHaveBeenCalledWith(expect.objectContaining({ view: "all", directoryId: undefined }));
    expect(screen.queryByRole("region", { name: "Contenido de la carpeta" })).not.toBeInTheDocument();
  });

  it("allows browsing read-only destinations but only confirms a move into a writable folder", async () => {
    allowActions();
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Solicitar mover 42" }));
    const dialog = await screen.findByRole("dialog", { name: "Mover documento" });
    fireEvent.click(within(dialog).getByRole("button", { name: "Explorar destino de solo lectura" }));
    await waitFor(() => expect(documentsService.getDirectoryContext).toHaveBeenCalledWith(99));
    expect(within(dialog).getByRole("button", { name: "Mover aquí" })).toBeDisabled();
    expect(documentsService.moveToDirectory).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Explorar destino con carga" }));
    await waitFor(() => expect(within(dialog).getByRole("button", { name: "Mover aquí" })).toBeEnabled());
    fireEvent.click(within(dialog).getByRole("button", { name: "Mover aquí" }));
    await waitFor(() => expect(documentsService.moveToDirectory).toHaveBeenCalledWith(42, 100));
  });

  it("does not offer ordinary uploads into a navigation-only ancestor", async () => {
    currentSearch = "directoryId=7&action=upload-single";
    jest.mocked(documentsService.getDirectoryContext).mockResolvedValue({
      directory: { id: 7, name: "Antecesor", parentId: null, createdById: "other", createdAt: "", updatedAt: "", navigationOnly: true,
        capabilities: { owner: false, canView: false, canEdit: false, canUploadVersion: false, canShare: false } },
      breadcrumb: [],
    });
    renderPage();
    await screen.findByRole("list", { name: "Documentos" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Nuevo documento" }));
    expect(await screen.findByRole("button", { name: "Subir Archivo" })).toBeDisabled();
  });

  function allowBatchActions() {
    const batchCapabilities = { scope: "ordinary" as const, update: true, trash: true,
      restore: true, permanentDelete: true, export: true };
    const rows = documents.map((document) => ({ ...document, batchCapabilities })) as unknown as Document[];
    jest.mocked(documentsService.getAll).mockResolvedValue({ data: rows,
      meta: { total: 2, page: 1, limit: 50, totalPages: 1 } });
    return rows;
  }

  it("bulk readback denies absent snapshots rather than ADMIN or individual fallback", async () => {
    allowActions(); renderPage();
    fireEvent.click(await screen.findByLabelText("Seleccionar First document.pdf"));
    expect(mockBatchProps.authorize("trash", [42])).toBe(false);
  });
  it("bulk readback drops an A-to-B-to-A actor selection and old callback", async () => {
    allowBatchActions(); const view = renderPage();
    fireEvent.click(await screen.findByLabelText("Seleccionar First document.pdf"));
    const oldAuthorize = mockBatchProps.authorize;
    user.id = "user-2";
    view.rerender(<QueryClientProvider client={view.client}><DocumentsPage /></QueryClientProvider>);
    user.id = "user-1";
    view.rerender(<QueryClientProvider client={view.client}><DocumentsPage /></QueryClientProvider>);
    await screen.findByLabelText("Seleccionar First document.pdf");
    expect(oldAuthorize("trash", [42])).toBe(false);
    expect(mockBatchProps.selectedDocuments).toEqual([]);
  });
  it("bulk readback follows refreshed row authority while preserving selection", async () => {
    const rows = allowBatchActions(); const view = renderPage();
    fireEvent.click(await screen.findByLabelText("Seleccionar First document.pdf"));
    const changed = { ...rows[0], batchCapabilities: { ...rows[0].batchCapabilities!, trash: false } };
    jest.mocked(documentsService.getAll).mockResolvedValue({ data: [changed, rows[1]],
      meta: { total: 2, page: 1, limit: 50, totalPages: 1 } });
    await act(async () => { await view.client.invalidateQueries({ queryKey: ["documents"] }); });
    await waitFor(() => expect(mockBatchProps.selectedDocuments[0]?.batchCapabilities?.trash).toBe(false));
    expect(mockBatchProps.selectedDocuments.map((document: Document) => document.id)).toEqual([42]);
    expect(mockBatchProps.authorize("trash", [42])).toBe(false);
  });
  it("bulk readback denies the full selection if one snapshot is absent", async () => {
    const rows = allowBatchActions();
    jest.mocked(documentsService.getAll).mockResolvedValue({ data: [rows[0], documents[1] as unknown as Document],
      meta: { total: 2, page: 1, limit: 50, totalPages: 1 } });
    renderPage();
    fireEvent.click(await screen.findByLabelText("Seleccionar First document.pdf"));
    fireEvent.click(screen.getByLabelText("Seleccionar Second document.docx"));
    expect(mockBatchProps.authorize("trash", [42, 43])).toBe(false);
  });
  it("bulk readback requires exactly the full current selection", async () => {
    allowBatchActions(); renderPage();
    fireEvent.click(await screen.findByLabelText("Seleccionar First document.pdf"));
    fireEvent.click(screen.getByLabelText("Seleccionar Second document.docx"));
    expect(mockBatchProps.authorize("trash", [42, 43])).toBe(true);
    expect(mockBatchProps.authorize("trash", [42])).toBe(false);
    expect(mockBatchProps.authorize("trash", [42, 42])).toBe(false);
    expect(mockBatchProps.authorize("trash", [999])).toBe(false);
  });
  it("bulk readback preserves selection during refresh but denies immediate stale dispatch", async () => {
    allowBatchActions(); const view = renderPage();
    fireEvent.click(await screen.findByLabelText("Seleccionar First document.pdf"));
    const oldAuthorize = mockBatchProps.authorize;
    jest.mocked(documentsService.getAll).mockReturnValue(new Promise(() => {}));
    await act(async () => {
      void view.client.invalidateQueries({ queryKey: ["documents"] });
      expect(oldAuthorize("trash", [42])).toBe(false);
    });
    expect(mockBatchProps.selectedDocuments.map((document: Document) => document.id)).toEqual([42]);
  });
  it("bulk readback rejects a retained previous-actor callback", async () => {
    allowBatchActions(); const view = renderPage();
    fireEvent.click(await screen.findByLabelText("Seleccionar First document.pdf"));
    const oldAuthorize = mockBatchProps.authorize;
    jest.mocked(documentsService.getAll).mockReturnValue(new Promise(() => {}));
    user.id = "user-2";
    view.rerender(<QueryClientProvider client={view.client}><DocumentsPage /></QueryClientProvider>);
    expect(oldAuthorize("trash", [42])).toBe(false);
  });
  it("bulk readback retains missing selected rows instead of silently using a subset", async () => {
    const rows = allowBatchActions(); const view = renderPage();
    fireEvent.click(await screen.findByLabelText("Seleccionar First document.pdf"));
    fireEvent.click(screen.getByLabelText("Seleccionar Second document.docx"));
    jest.mocked(documentsService.getAll).mockResolvedValue({ data: [rows[0]],
      meta: { total: 1, page: 1, limit: 50, totalPages: 1 } });
    await act(async () => { await view.client.invalidateQueries({ queryKey: ["documents"] }); });
    await waitFor(() => expect(screen.queryByLabelText("Seleccionar Second document.docx")).not.toBeInTheDocument());
    expect(mockBatchProps.selectedDocuments.map((document: Document) => document.id)).toEqual([42, 43]);
    expect(mockBatchProps.authorize("trash", [42, 43])).toBe(false);
  });

  it.each(["trash", "move"])("preserves an authorized %s dispatch", async (action) => {
    allowActions(); renderPage();
    if (action === "trash") {
      fireEvent.click(await screen.findByRole("button", { name: "Solicitar eliminar 42" }));
      fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
      await waitFor(() => expect(documentsService.delete).toHaveBeenCalledWith(42));
    } else {
      fireEvent.click(await screen.findByRole("button", { name: "Solicitar mover 42" }));
      fireEvent.click(screen.getByRole("button", { name: "Mover aquí" }));
      await waitFor(() => expect(documentsService.moveToDirectory).toHaveBeenCalledWith(42, null));
    }
  });

  it.each(["trash", "move"])("rejects %s confirmation while readback refreshes", async (action) => {
    allowActions(); const view = renderPage();
    fireEvent.click(await screen.findByRole("button", {
      name: action === "trash" ? "Solicitar eliminar 42" : "Solicitar mover 42",
    }));
    jest.mocked(documentsService.getAll).mockReturnValue(new Promise(() => {}));
    await act(async () => { void view.client.invalidateQueries({ queryKey: ["documents"] }); });
    const confirm = screen.queryByRole("button", { name: action === "trash" ? "Eliminar" : "Mover aquí" });
    if (confirm) fireEvent.click(confirm);
    await act(async () => {});
    expect(documentsService.delete).not.toHaveBeenCalled();
    expect(documentsService.moveToDirectory).not.toHaveBeenCalled();
  });

  it("clears old actor records and confirmations before the new actor list settles", async () => {
    allowActions(); const view = renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Solicitar eliminar 42" }));
    jest.mocked(documentsService.getAll).mockReturnValue(new Promise(() => {}));
    user.id = "user-2";
    view.rerender(<QueryClientProvider client={view.client}><DocumentsPage /></QueryClientProvider>);
    expect(screen.queryByText("First document.pdf")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Eliminar documento" })).not.toBeInTheDocument();
    expect(documentsService.delete).not.toHaveBeenCalled();
  });

  it("preserves entered metadata during a same-context refresh but blocks submission", async () => {
    const rows = allowActions();
    jest.mocked(documentsService.getOne).mockResolvedValue(rows[0]);
    const view = renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Editar 42" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardar Cambios" })).toBeEnabled());
    fireEvent.change(screen.getByLabelText("Descripción"), { target: { value: "Keep this draft" } });
    let finish!: (value: Awaited<ReturnType<typeof documentsService.getAll>>) => void;
    jest.mocked(documentsService.getAll).mockReturnValue(new Promise((resolve) => { finish = resolve; }));
    await act(async () => { void view.client.invalidateQueries({ queryKey: ["documents"] }); });
    expect(screen.getByLabelText("Descripción")).toHaveValue("Keep this draft");
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardar Cambios" })).toBeDisabled());
    fireEvent.submit(screen.getByRole("button", { name: "Guardar Cambios" }).closest("form")!);
    expect(documentsService.update).not.toHaveBeenCalled();
    await act(async () => finish({ data: rows, meta: { total: rows.length, page: 1, limit: 50, totalPages: 1 } }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardar Cambios" })).toBeEnabled());
    expect(screen.getByLabelText("Descripción")).toHaveValue("Keep this draft");
  });

  it("closes the metadata dialog when settled list readback revokes its capability", async () => {
    const rows = allowActions();
    jest.mocked(documentsService.getOne).mockResolvedValue(rows[0]);
    const view = renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Editar 42" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Guardar Cambios" })).toBeEnabled());
    jest.mocked(documentsService.getAll).mockResolvedValue({
      data: rows.map((doc) => ({ ...doc, actionCapabilities: { ...doc.actionCapabilities!, editMetadata: false } })),
      meta: { total: rows.length, page: 1, limit: 50, totalPages: 1 },
    });
    await act(async () => { await view.client.invalidateQueries({ queryKey: ["documents"] }); });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Editar Documento" })).not.toBeInTheDocument());
    expect(documentsService.update).not.toHaveBeenCalled();
  });

  it("clears selection and confirmation when the source directory changes", async () => {
    allowActions(); const view = renderPage();
    fireEvent.click(await screen.findByLabelText("Seleccionar First document.pdf"));
    fireEvent.click(screen.getByRole("button", { name: "Solicitar eliminar 42" }));
    currentSearch = "directoryId=8";
    view.rerender(<QueryClientProvider client={view.client}><DocumentsPage /></QueryClientProvider>);
    expect(screen.queryByRole("dialog", { name: "Eliminar documento" })).not.toBeInTheDocument();
    expect(screen.queryByText(/1 seleccionado/)).not.toBeInTheDocument();
    expect(documentsService.delete).not.toHaveBeenCalled();
  });

  it.each(["trash", "move"])("does not apply an old actor's %s completion to the new context", async (action) => {
    allowActions();
    let finish!: () => void;
    if (action === "trash") jest.mocked(documentsService.delete).mockReturnValue(new Promise((resolve) => {
      finish = () => resolve(undefined as never);
    }));
    else jest.mocked(documentsService.moveToDirectory).mockReturnValue(new Promise((resolve) => {
      finish = () => resolve(undefined as never);
    }));
    const view = renderPage();
    fireEvent.click(await screen.findByRole("button", {
      name: action === "trash" ? "Solicitar eliminar 42" : "Solicitar mover 42",
    }));
    fireEvent.click(screen.getByRole("button", { name: action === "trash" ? "Eliminar" : "Mover aquí" }));
    await waitFor(() => expect(action === "trash" ? documentsService.delete : documentsService.moveToDirectory).toHaveBeenCalledTimes(1));
    jest.mocked(documentsService.getAll).mockReturnValue(new Promise(() => {}));
    user.id = "user-2";
    view.rerender(<QueryClientProvider client={view.client}><DocumentsPage /></QueryClientProvider>);
    const invalidate = jest.spyOn(view.client, "invalidateQueries");
    await act(async () => finish());
    expect(toast.success).not.toHaveBeenCalled();
    expect(invalidate).not.toHaveBeenCalled();
  });

  it("keeps directory navigation out of the page and places the new action beside the documents title", async () => {
    renderPage();

    const cardList = await screen.findByRole("list", { name: "Documentos" });
    const documentsCard = cardList.closest('[data-slot="card"]');
    const documentsTitle = within(documentsCard as HTMLElement).getByText(
      "Documentos",
      { selector: '[data-slot="card-title"]' },
    );
    const titleRow = documentsTitle.parentElement?.parentElement;

    expect(
      screen.queryByTestId("compact-directory-navigation"),
    ).not.toBeInTheDocument();
    expect(documentsCard).not.toBeNull();
    expect(titleRow).not.toBeNull();
    expect(
      within(titleRow as HTMLElement).getByRole("button", {
        name: "Nuevo documento",
      }),
    ).toBeInTheDocument();
    expect(
      within(documentsCard as HTMLElement).getByRole("combobox", {
        name: "Filtrar por tipo de documento",
      }),
    ).toHaveAttribute("data-size", "sm");
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
  });

  it("defaults to cards and renders every filtered document", async () => {
    renderPage();

    const cardList = await screen.findByRole("list", { name: "Documentos" });
    expect(within(cardList).getAllByTestId("document-card")).toHaveLength(2);
    expect(
      within(cardList).getByText("First document.pdf"),
    ).toBeInTheDocument();
    expect(cardList).toHaveClass("xl:grid-cols-5");
    expect(
      screen.getByRole("combobox", { name: "Filtrar por tipo de documento" }),
    ).toHaveAttribute("data-size", "sm");
    expect(
      screen.queryByPlaceholderText("Buscar documentos..."),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Vista de tarjetas" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Vista de lista" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(screen.queryByTestId("document-list-item")).not.toBeInTheDocument();
  });

  it("excludes residual workflow PDFs while keeping normal documents visible", async () => {
    const residualDocument = {
      ...documents[0],
      id: 44,
      versions: [
        {
          ...documents[0].versions[0],
          id: 102,
          documentId: 44,
          filename: "Workflow-1788839333360-WP4WBR.PDF",
        },
      ],
    };
    jest.mocked(documentsService.getAll).mockResolvedValue({
      data: [...documents, residualDocument],
      meta: { total: 3, page: 1, limit: 50, totalPages: 1 },
    } as never);

    renderPage();

    const cardList = await screen.findByRole("list", { name: "Documentos" });
    expect(within(cardList).getAllByTestId("document-card")).toHaveLength(2);
    expect(
      within(cardList).getByText("First document.pdf"),
    ).toBeInTheDocument();
    expect(
      within(cardList).getByText("Second document.docx"),
    ).toBeInTheDocument();
    expect(
      within(cardList).queryByText("Workflow-1788839333360-WP4WBR.PDF"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("2 documento(s) encontrado(s)"),
    ).toBeInTheDocument();
  });

  it("requests recent accessed documents without automatic list exclusions", async () => {
    currentSearch = "view=recent-accessed";
    renderPage();

    await screen.findByRole("list", { name: "Documentos" });

    expect(documentsService.getAll).toHaveBeenCalledWith(
      expect.objectContaining({
        view: "recent-accessed",
      }),
    );
    const request = jest.mocked(documentsService.getAll).mock.calls[0][0];
    expect(request).not.toHaveProperty("academicYearId");
    expect(request).not.toHaveProperty("excludeBatched");
  });

  it("keeps residual filenames in the explicit all-documents view", async () => {
    currentSearch = "view=all";
    const residualDocument = {
      ...documents[0],
      id: 44,
      versions: [
        {
          ...documents[0].versions[0],
          id: 102,
          documentId: 44,
          filename: "Workflow-1788839333360-WP4WBR.PDF",
        },
      ],
    };
    jest.mocked(documentsService.getAll).mockResolvedValue({
      data: [...documents, residualDocument],
      meta: { total: 3, page: 1, limit: 50, totalPages: 1 },
    } as never);

    renderPage();

    const cardList = await screen.findByRole("list", { name: "Documentos" });
    expect(within(cardList).getAllByTestId("document-card")).toHaveLength(3);
    expect(
      within(cardList).getByText("Workflow-1788839333360-WP4WBR.PDF"),
    ).toBeInTheDocument();
  });

  it("opens the creation menu from the URL-backed new action", async () => {
    currentSearch = "action=new";
    renderPage();

    expect(await screen.findByRole("menu")).toHaveTextContent(
      "Crear Documento",
    );
  });

  it("opens the single upload dialog from the explicit upload action", async () => {
    currentSearch = "action=upload-single";
    renderPage();

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText("Archivo *")).toBeInTheDocument();
    expect(
      within(dialog).queryByLabelText("Archivos *"),
    ).not.toBeInTheDocument();
  });

  it("opens the multiple upload dialog from the explicit upload action", async () => {
    currentSearch = "action=upload-multiple";
    renderPage();

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText("Archivos *")).toBeInTheDocument();
    expect(within(dialog).queryByLabelText("Archivo *")).not.toBeInTheDocument();
  });

  it("keeps single mode when the mounted action switches from multiple to single", async () => {
    currentSearch = "action=upload-multiple";
    const view = renderPage();

    expect(
      within(await screen.findByRole("dialog")).getByLabelText("Archivos *"),
    ).toBeInTheDocument();

    currentSearch = "action=upload-single";
    view.rerender(
      <QueryClientProvider client={view.client}>
        <DocumentsPage />
      </QueryClientProvider>,
    );

    await waitFor(() =>
      expect(
        within(screen.getByRole("dialog")).getByLabelText("Archivo *"),
      ).toBeInTheDocument(),
    );
    expect(
      within(screen.getByRole("dialog")).queryByLabelText("Archivos *"),
    ).not.toBeInTheDocument();
  });

  it("consumes the upload action on close so a remount does not reopen the dialog", async () => {
    const interaction = userEvent.setup();
    currentSearch = "action=upload-single";
    const view = renderPage();

    const dialog = await screen.findByRole("dialog");
    await interaction.click(
      within(dialog).getByRole("button", { name: "Cancelar" }),
    );

    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    expect(replace).toHaveBeenCalledWith("/dashboard/documents", {
      scroll: false,
    });

    view.unmount();
    currentSearch = "";
    renderPage();

    await screen.findByRole("list", { name: "Documentos" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("mounts the real local year filter and drives current/all list requests without changing upload defaults", async () => {
    useRealYearStore = true;
    const interaction = userEvent.setup();
    const view = renderPage();
    const filter = await screen.findByRole("combobox", {
      name: "Filtrar por año lectivo",
    });
    await waitFor(() => expect(filter).toHaveTextContent("Current year"));
    expect(yearStore.getState()).toMatchObject({
      currentYearId: 1,
      persistedUserId: user.id,
      hasInitializedYear: true,
    });
    await waitFor(() =>
      expect(documentsService.getAll).toHaveBeenLastCalledWith(
        expect.objectContaining({ academicYearId: 1 }),
      ),
    );
    selectUploadOption(
      document.body,
      "Filtrar por año lectivo",
      "Todos los años",
    );
    await waitFor(() =>
      expect(documentsService.getAll).toHaveBeenLastCalledWith(
        expect.objectContaining({ academicYearId: undefined }),
      ),
    );
    await act(async () => {
      await view.client.invalidateQueries({ queryKey: ["academic-years"] });
    });
    expect(filter).toHaveTextContent("Todos los años");
    expect(yearStore.getState().currentYearId).toBeNull();
    await interaction.click(
      screen.getByRole("button", { name: "Nuevo documento" }),
    );
    await interaction.click(
      screen.getByRole("button", { name: "Subir Archivo" }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).queryByRole("combobox", {
        name: "Año lectivo del documento",
      }),
    ).not.toBeInTheDocument();
    expect(
      within(dialog).queryByRole("combobox", {
        name: "Filtrar por año lectivo",
      }),
    ).not.toBeInTheDocument();
  });

  it.each(["all", "recent-created", "recent-accessed"])(
    "does not expose a misleading year filter in unfiltered %s view",
    async (view) => {
      currentSearch = `view=${view}`;
      renderPage();
      await screen.findByRole("list", { name: "Documentos" });
      expect(
        screen.queryByRole("combobox", { name: "Filtrar por año lectivo" }),
      ).not.toBeInTheDocument();
      expect(documentsService.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ view }),
      );
      expect(
        jest.mocked(documentsService.getAll).mock.calls.at(-1)![0],
      ).not.toHaveProperty("academicYearId");
    },
  );

  it("preselects Documento general and uploads it without an explicit choice", async () => {
    const interaction = userEvent.setup();
    jest
      .mocked(documentsService.upload)
      .mockResolvedValueOnce(documents[0] as unknown as Document);
    renderPage();

    await interaction.click(
      screen.getByRole("button", { name: "Nuevo documento" }),
    );
    await interaction.click(
      screen.getByRole("button", { name: "Subir Archivo" }),
    );

    const dialog = await screen.findByRole("dialog");

    await interaction.upload(
      within(dialog).getByLabelText("Archivo *"),
      new File(["content"], "notes.txt", { type: "text/plain" }),
    );
    expect(
      within(dialog).getByRole("combobox", { name: "Tipo de documento *" }),
    ).toHaveTextContent("Documento general");
    await interaction.click(
      within(dialog).getByRole("button", { name: "Subir Documento" }),
    );

    await waitFor(() =>
      expect(documentsService.upload).toHaveBeenCalledWith(
        expect.any(File),
        expect.objectContaining({ documentTypeId: 22 }),
        expect.any(Function),
      ),
    );
  });

  it("preselects Documento general in the multiple-upload form", async () => {
    const interaction = userEvent.setup();
    renderPage();

    await interaction.click(
      screen.getByRole("button", { name: "Nuevo documento" }),
    );
    await interaction.click(
      screen.getByRole("button", { name: "Subir Múltiples Archivos" }),
    );

    const dialog = await screen.findByRole("dialog");
    await interaction.upload(
      within(dialog).getByLabelText("Archivos *"),
      new File(["x"], "one.txt"),
    );
    expect(
      within(dialog).getByRole("combobox", { name: "Tipo de documento *" }),
    ).toHaveTextContent("Documento general");
  });

  it("submits a concrete document type picked after unchecking Documento general", async () => {
    const interaction = userEvent.setup();
    jest
      .mocked(documentsService.upload)
      .mockResolvedValueOnce(documents[0] as unknown as Document);
    renderPage();

    await interaction.click(
      screen.getByRole("button", { name: "Nuevo documento" }),
    );
    await interaction.click(
      screen.getByRole("button", { name: "Subir Archivo" }),
    );

    const dialog = await screen.findByRole("dialog");
    await interaction.upload(
      within(dialog).getByLabelText("Archivo *"),
      new File(["content"], "notes.txt", { type: "text/plain" }),
    );
    const group = within(dialog).getByRole("group");
    fireEvent.click(
      within(group).getByRole("checkbox", { name: "Documento general" }),
    );
    selectUploadOption(group, "Tipo de documento *", "Oficio");
    await interaction.click(
      within(dialog).getByRole("button", { name: "Subir Documento" }),
    );

    await waitFor(() =>
      expect(documentsService.upload).toHaveBeenCalledWith(
        expect.any(File),
        expect.objectContaining({ documentTypeId: 12 }),
        expect.any(Function),
      ),
    );
  });

  it("renders the trash view on the canonical Documents route", async () => {
    currentSearch = "view=trash";
    renderPage();

    expect(await screen.findByText("Vista de papelera")).toBeInTheDocument();
    expect(documentsService.getAll).not.toHaveBeenCalled();
  });

  it.each(["single", "multiple"] as const)(
    "forwards description and resets %s upload metadata after success",
    async (mode) => {
      const interaction = userEvent.setup();
      const upload =
        mode === "single"
          ? documentsService.upload
          : documentsService.uploadMultiple;
      jest
        .mocked(documentsService.upload)
        .mockResolvedValueOnce(documents[0] as unknown as Document);
      jest.mocked(documentsService.uploadMultiple).mockResolvedValueOnce([]);
      renderPage();
      const openUpload = async () => {
        await interaction.click(
          screen.getByRole("button", { name: "Nuevo documento" }),
        );
        await interaction.click(
          screen.getByRole("button", {
            name:
              mode === "single" ? "Subir Archivo" : "Subir Múltiples Archivos",
          }),
        );
        return screen.findByRole("dialog");
      };
      const dialog = await openUpload();
      const files = [
        new File(["one"], "one.txt"),
        new File(["two"], "two.txt"),
      ];
      await interaction.upload(
        within(dialog).getByLabelText(
          mode === "single" ? "Archivo *" : "Archivos *",
        ),
        mode === "single" ? files[0] : files,
      );
      for (const group of within(dialog).getAllByRole("group")) {
        fireEvent.change(
          within(group).getByRole("textbox", { name: "Descripción (opcional)" }),
          { target: { value: "Meeting agenda" } },
        );
        fireEvent.change(
          within(group).getByLabelText("Fecha de origen (opcional)"),
          { target: { value: "2024-12-31" } },
        );
        fireEvent.click(
          within(group).getByRole("checkbox", { name: "Documento general" }),
        );
        selectUploadOption(group, "Tipo de documento *", "Oficio");
      }
      await interaction.click(
        within(dialog).getByRole("button", {
          name: mode === "single" ? "Subir Documento" : "Subir 2 archivo(s)",
        }),
      );
      const fields = expect.objectContaining({
        description: "Meeting agenda",
        documentTypeId: 12,
        originDate: "2024-12-31",
      });
      if (mode === "single")
        expect(upload).toHaveBeenCalledWith(
          files[0],
          fields,
          expect.any(Function),
        );
      else
        expect(upload).toHaveBeenCalledWith(
          files,
          [fields, fields],
          null,
          expect.any(Function),
        );
      const reopened = await openUpload();
      expect(within(reopened).queryByRole("group")).not.toBeInTheDocument();
      await interaction.upload(
        within(reopened).getByLabelText(
          mode === "single" ? "Archivo *" : "Archivos *",
        ),
        files[0],
      );
      expect(within(reopened).getByRole("textbox", { name: "Descripción (opcional)" })).toHaveValue("");
      expect(
        within(reopened).getByLabelText("Fecha de origen (opcional)"),
      ).toHaveValue("");
      expect(
        within(reopened).getByRole("combobox", { name: "Tipo de documento *" }),
      ).toHaveTextContent("Documento general");
    },
    20000,
  );

  it.each(["cancel", "dismiss"] as const)(
    "does not carry description between new uploads after %s",
    async (closing) => {
      const interaction = userEvent.setup();
      renderPage();
      for (const action of [
        "Subir Archivo",
        "Subir Múltiples Archivos",
        "Subir Archivo",
      ]) {
        await interaction.click(
          screen.getByRole("button", { name: "Nuevo documento" }),
        );
        await interaction.click(screen.getByRole("button", { name: action }));
        const dialog = await screen.findByRole("dialog");
        expect(within(dialog).queryByRole("group")).not.toBeInTheDocument();
        await interaction.upload(
          within(dialog).getByLabelText(
            action === "Subir Archivo" ? "Archivo *" : "Archivos *",
          ),
          new File(["x"], "one.txt"),
        );
        const field = within(dialog).getByRole("textbox", {
          name: "Descripción (opcional)",
        });
        fireEvent.change(
          within(dialog).getByLabelText("Fecha de origen (opcional)"),
          { target: { value: "2024-12-31" } },
        );
        expect(field).toHaveValue("");
        fireEvent.change(field, { target: { value: "Previous description" } });
        if (closing === "cancel")
          await interaction.click(
            within(dialog).getByRole("button", { name: "Cancelar" }),
          );
        else await interaction.keyboard("{Escape}");
      }
      expect(documentsService.upload).not.toHaveBeenCalled();
      expect(documentsService.uploadMultiple).not.toHaveBeenCalled();
    },
    20000,
  );

  it.each([99, null])(
    "defaults both upload flows independently of browsing year %s",
    async (year) => {
      browsingYear = year;
      const interaction = userEvent.setup();
      renderPage();
      for (const action of ["Subir Archivo", "Subir Múltiples Archivos"]) {
        await interaction.click(
          screen.getByRole("button", { name: "Nuevo documento" }),
        );
        await interaction.click(screen.getByRole("button", { name: action }));
        const dialog = await screen.findByRole("dialog");
        await interaction.upload(
          within(dialog).getByLabelText(
            action === "Subir Archivo" ? "Archivo *" : "Archivos *",
          ),
          new File(["x"], "one.txt"),
        );
        expect(
          within(dialog).queryByRole("combobox", {
            name: "Año lectivo del documento",
          }),
        ).not.toBeInTheDocument();
        fireEvent.change(
          within(dialog).getByLabelText("Fecha de origen (opcional)"),
          { target: { value: "2024-12-31" } },
        );
        expect(browsingYear).toBe(year);
        await interaction.click(
          within(dialog).getByRole("button", { name: "Cancelar" }),
        );
      }
      expect(documentsService.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ academicYearId: year ?? undefined }),
      );
    },
    20000,
  );

  it.each([undefined, [historicalYear]])(
    "keeps uploads available without a current catalog (%s)",
    async (catalog) => {
      uploadYears = catalog;
      const interaction = userEvent.setup();
      renderPage();
      await interaction.click(
        screen.getByRole("button", { name: "Nuevo documento" }),
      );
      await interaction.click(
        screen.getByRole("button", { name: "Subir Archivo" }),
      );
      const dialog = await screen.findByRole("dialog");
      await interaction.upload(
        within(dialog).getByLabelText("Archivo *"),
        new File(["x"], "one.txt"),
      );
      expect(
        within(dialog).getByLabelText("Fecha de origen (opcional)"),
      ).toHaveValue("");
      expect(within(dialog).getByRole("textbox", { name: "Descripción (opcional)" })).toHaveValue("");
    },
  );

  it.each(["single", "multiple"] as const)(
    "does not overwrite %s origin metadata when catalog arrives/refetches",
    async (mode) => {
      uploadYears = undefined;
      const interaction = userEvent.setup();
      const view = renderPage();
      await interaction.click(
        screen.getByRole("button", { name: "Nuevo documento" }),
      );
      await interaction.click(
        screen.getByRole("button", {
          name:
            mode === "single" ? "Subir Archivo" : "Subir Múltiples Archivos",
        }),
      );
      const dialog = await screen.findByRole("dialog");
      const file = new File(["content"], "notes.txt");
      await interaction.upload(
        within(dialog).getByLabelText(
          mode === "single" ? "Archivo *" : "Archivos *",
        ),
        file,
      );
      const field = within(dialog).getByLabelText("Fecha de origen (opcional)");
      fireEvent.change(field, { target: { value: "2024-12-31" } });
      fireEvent.change(within(dialog).getByRole("textbox", { name: "Descripción (opcional)" }), {
        target: { value: "Agenda" },
      });
      uploadYears = [currentYear, historicalYear];
      view.rerender(
        <QueryClientProvider client={view.client}>
          <DocumentsPage />
        </QueryClientProvider>,
      );
      expect(field).toHaveValue("2024-12-31");
      uploadYears = [historicalYear, { ...currentYear, id: 7 }];
      view.rerender(
        <QueryClientProvider client={view.client}>
          <DocumentsPage />
        </QueryClientProvider>,
      );
      expect(field).toHaveValue("2024-12-31");
      fireEvent.click(
        within(dialog).getByRole("checkbox", { name: "Documento general" }),
      );
      selectUploadOption(dialog, "Tipo de documento *", "Oficio");
      jest
        .mocked(documentsService.upload)
        .mockResolvedValueOnce(documents[0] as unknown as Document);
      jest.mocked(documentsService.uploadMultiple).mockResolvedValueOnce([]);
      await interaction.click(
        within(dialog).getByRole("button", {
          name: mode === "single" ? "Subir Documento" : "Subir 1 archivo(s)",
        }),
      );
      const fields = expect.objectContaining({
        originDate: "2024-12-31",
        description: "Agenda",
        documentTypeId: 12,
      });
      if (mode === "single")
        expect(documentsService.upload).toHaveBeenCalledWith(
          file,
          fields,
          expect.any(Function),
        );
      else
        expect(documentsService.uploadMultiple).toHaveBeenCalledWith(
          [file],
          [fields],
          null,
          expect.any(Function),
        );
    },
  );

  it("updates selected state and switches between the same card and list documents", async () => {
    const interaction = userEvent.setup();
    renderPage();

    const firstCheckbox = await screen.findByRole("checkbox", {
      name: "Seleccionar First document.pdf",
    });
    await interaction.click(firstCheckbox);
    await interaction.click(
      screen.getByRole("button", { name: "Vista de lista" }),
    );

    expect(
      screen.getByRole("button", { name: "Vista de lista" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Vista de tarjetas" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(screen.getAllByTestId("document-list-item")).toHaveLength(2);
    expect(
      screen.getByRole("checkbox", { name: "Seleccionar First document.pdf" }),
    ).toBeChecked();

    await interaction.click(
      screen.getByRole("button", { name: "Vista de tarjetas" }),
    );
    expect(screen.getAllByTestId("document-card")).toHaveLength(2);
    expect(
      screen.getByRole("checkbox", { name: "Seleccionar First document.pdf" }),
    ).toBeChecked();
  });

  it("keeps both view controls keyboard operable with selected state exposed", async () => {
    const interaction = userEvent.setup();
    renderPage();

    const listButton = await screen.findByRole("button", {
      name: "Vista de lista",
    });
    expect(listButton).toHaveAttribute("type", "button");
    listButton.focus();
    expect(document.activeElement).toBe(listButton);

    await interaction.keyboard("{Enter}");

    expect(listButton).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Vista de tarjetas" }),
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("preserves filters, selection, and dialog behavior while switching", async () => {
    const interaction = userEvent.setup();
    jest
      .mocked(documentsService.view)
      .mockImplementation(() => new Promise(() => {}));
    renderPage();

    await interaction.click(
      screen.getByRole("button", { name: "Mis documentos" }),
    );
    await interaction.click(
      screen.getByRole("checkbox", { name: "Seleccionar First document.pdf" }),
    );
    await interaction.click(
      screen.getByRole("button", { name: "Vista de lista" }),
    );
    await interaction.click(
      within(screen.getAllByTestId("document-list-item")[0]).getByRole(
        "button",
        {
          name: "Ver",
        },
      ),
    );

    expect(
      screen.queryByPlaceholderText("Buscar documentos..."),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/1 seleccionado/)).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toHaveTextContent(
      "Vista Previa: First document.pdf",
    );
  });

  it("shows the logical name in the page preview independently of the original filename", async () => {
    jest.mocked(documentsService.getAll).mockResolvedValue({ data: [{ ...documents[0], name: "Consejo" }] as unknown as Document[],
      meta: { total: 1, page: 1, limit: 50, totalPages: 1 } });
    jest.mocked(documentsService.view).mockImplementation(() => new Promise(() => {}));
    const interaction = userEvent.setup();
    renderPage();
    await interaction.click(await screen.findByRole("button", { name: "Vista de lista" }));
    await interaction.click(within(screen.getByTestId("document-list-item")).getByRole("button", { name: "Ver" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Vista Previa: Consejo");
  });

  it("resets to cards on a new mount without reading or writing a view preference", async () => {
    const interaction = userEvent.setup();
    const getItem = jest.spyOn(Storage.prototype, "getItem");
    const setItem = jest.spyOn(Storage.prototype, "setItem");
    const firstRender = renderPage();

    await interaction.click(
      await screen.findByRole("button", { name: "Vista de lista" }),
    );
    firstRender.unmount();
    renderPage();

    expect(
      await screen.findByRole("button", { name: "Vista de tarjetas" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      getItem.mock.calls
        .flat()
        .filter((key) => key.toLowerCase().includes("view")),
    ).toHaveLength(0);
    expect(
      setItem.mock.calls
        .flat()
        .filter((key) => key.toLowerCase().includes("view")),
    ).toHaveLength(0);

    getItem.mockRestore();
    setItem.mockRestore();
  });
});

describe("DocumentsPage document type filter and top tabs", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    currentSearch = "";
    browsingYear = null;
    useRealYearStore = false;
    jest.mocked(academicYearsService.getAll).mockResolvedValue({
      data: [currentYear, historicalYear],
      total: 2,
    });
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

  it("filters the list by document type and never by category", async () => {
    renderPage();
    await screen.findByRole("list", { name: "Documentos" });

    const filter = screen.getByRole("combobox", {
      name: "Filtrar por tipo de documento",
    });
    expect(
      screen.queryByRole("combobox", { name: "Filtrar por categoría" }),
    ).not.toBeInTheDocument();
    expect(
      jest.mocked(documentsService.getAll).mock.calls.at(-1)![0],
    ).not.toHaveProperty("categoryId");

    selectUploadOption(
      document.body,
      "Filtrar por tipo de documento",
      "Oficio",
    );
    await waitFor(() =>
      expect(documentsService.getAll).toHaveBeenLastCalledWith(
        expect.objectContaining({ documentTypeId: 12 }),
      ),
    );
    expect(
      jest.mocked(documentsService.getAll).mock.calls.at(-1)![0],
    ).not.toHaveProperty("categoryId");

    selectUploadOption(
      document.body,
      "Filtrar por tipo de documento",
      "Todos los tipos",
    );
    await waitFor(() =>
      expect(documentsService.getAll).toHaveBeenLastCalledWith(
        expect.objectContaining({ documentTypeId: undefined }),
      ),
    );
    expect(filter).toBeInTheDocument();
  });

  it("removes the Documents and Lotes top tabs", async () => {
    renderPage();
    await screen.findByRole("list", { name: "Documentos" });

    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(
      screen.queryByRole("tab", { name: /lotes/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Document batches")).not.toBeInTheDocument();
  });
});

describe("DocumentsPage reception inbox integration", () => {
  const receptionFolder = {
    id: 7,
    name: "Recepción Central",
    parentId: null,
    createdById: "other",
    createdAt: "",
    updatedAt: "",
    receptionEnabled: true,
  };
  const ordinaryFolder = {
    id: 8,
    name: "Archivo",
    parentId: null,
    createdById: "other",
    createdAt: "",
    updatedAt: "",
    receptionEnabled: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(academicYearsService.getAll).mockResolvedValue({
      data: [currentYear, historicalYear],
      total: 2,
    });
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

  it("shows a reception inbox heading for the selected reception folder", async () => {
    currentSearch = "directoryId=7";
    jest
      .mocked(documentsService.getDirectoryBreadcrumb)
      .mockResolvedValue([receptionFolder]);
    jest
      .mocked(documentsService.getReception)
      .mockResolvedValue(receptionSettings(true));

    renderPage();

    expect(
      await screen.findByRole("heading", { name: /Bandeja de recepción/ }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(documentsService.getAll).toHaveBeenCalledWith(
        expect.objectContaining({ directoryId: 7 }),
      ),
    );
  });

  it("keeps an ordinary folder URL without a reception heading", async () => {
    currentSearch = "directoryId=8";
    jest
      .mocked(documentsService.getDirectoryBreadcrumb)
      .mockResolvedValue([ordinaryFolder]);

    renderPage();

    await screen.findByRole("list", { name: "Documentos" });
    expect(
      screen.queryByRole("heading", { name: /Bandeja de recepción/ }),
    ).not.toBeInTheDocument();
    expect(documentsService.getReception).not.toHaveBeenCalled();
    expect(documentsService.getAll).toHaveBeenCalledWith(
      expect.objectContaining({ directoryId: 8 }),
    );
  });

  it("shows an invalid destination for a malformed directory id without listing root", async () => {
    currentSearch = "directoryId=abc";

    renderPage();

    expect(
      await screen.findByText(/no corresponde a una carpeta válida/i),
    ).toBeInTheDocument();
    expect(documentsService.getAll).not.toHaveBeenCalled();
    expect(documentsService.getDirectoryBreadcrumb).not.toHaveBeenCalled();
    expect(
      screen.queryByRole("list", { name: "Documentos" }),
    ).not.toBeInTheDocument();
  });

  it.each(["", "0", "-1", "1.5", "abc", "1e999"])(
    "rejects the malformed directory value %p without querying documents",
    async (value) => {
      currentSearch = `directoryId=${value}`;

      renderPage();

      expect(
        await screen.findByText(/no corresponde a una carpeta válida/i),
      ).toBeInTheDocument();
      expect(documentsService.getAll).not.toHaveBeenCalled();
    },
  );

  it("does not open or use the root for a malformed upload action", async () => {
    currentSearch = "action=upload-single&directoryId=abc";

    renderPage();

    await screen.findByText(/no corresponde a una carpeta válida/i);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(documentsService.getAll).not.toHaveBeenCalled();
  });

  it("treats a missing directory parameter as the ordinary root", async () => {
    currentSearch = "";

    renderPage();

    await screen.findByRole("list", { name: "Documentos" });
    expect(documentsService.getAll).toHaveBeenCalledWith(
      expect.objectContaining({ directoryId: null }),
    );
    expect(documentsService.getDirectoryBreadcrumb).not.toHaveBeenCalled();
  });

  it("does not open the upload dialog for a reception folder that withholds submit", async () => {
    currentSearch = "directoryId=7";
    jest
      .mocked(documentsService.getDirectoryBreadcrumb)
      .mockResolvedValue([receptionFolder]);
    jest
      .mocked(documentsService.getReception)
      .mockResolvedValue(receptionSettings(false));
    const interaction = userEvent.setup();

    renderPage();

    await screen.findByRole("list", { name: "Documentos" });
    await interaction.click(
      screen.getByRole("button", { name: "Nuevo documento" }),
    );
    expect(
      await screen.findByRole("button", { name: "Subir Archivo" }),
    ).toBeDisabled();
    await interaction.click(
      screen.getByRole("button", { name: "Subir Archivo" }),
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the upload dialog for a reception folder that grants submit", async () => {
    currentSearch = "directoryId=7";
    jest
      .mocked(documentsService.getDirectoryBreadcrumb)
      .mockResolvedValue([receptionFolder]);
    jest
      .mocked(documentsService.getReception)
      .mockResolvedValue(receptionSettings(true));
    const interaction = userEvent.setup();

    renderPage();

    await screen.findByRole("list", { name: "Documentos" });
    await interaction.click(
      screen.getByRole("button", { name: "Nuevo documento" }),
    );
    await interaction.click(
      screen.getByRole("button", { name: "Subir Archivo" }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText("Archivo *")).toBeInTheDocument();
  });

  it("preserves the directory id in the URL when closing the upload dialog", async () => {
    currentSearch = "action=upload-single&directoryId=8";
    jest
      .mocked(documentsService.getDirectoryBreadcrumb)
      .mockResolvedValue([ordinaryFolder]);
    const interaction = userEvent.setup();

    renderPage();

    const dialog = await screen.findByRole("dialog");
    await interaction.click(
      within(dialog).getByRole("button", { name: "Cancelar" }),
    );
    await waitFor(() =>
      expect(replace).toHaveBeenCalledWith(
        "/dashboard/documents?directoryId=8",
        { scroll: false },
      ),
    );
  });
});
