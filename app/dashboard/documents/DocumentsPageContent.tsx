"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
import { readDocumentActionCapabilities, type DocumentActionCapabilities } from "@/lib/document-action-capabilities";
import { readBatchActionCapabilities, type BatchAction } from "@/lib/batch-action-capabilities";
import { useUploadMetadata } from "@/hooks/use-upload-metadata";
import { useDocumentThumbnails } from "@/hooks/use-document-thumbnails";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsService } from "@/lib/services/documents.service";
import { useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import {
  FileText,
  Download,
  Filter,
  FilterX,
  User,
  AlertCircle,
  ArrowDown,
  ArrowUp,
  FolderOpen,
  RefreshCw,
  Search,
} from "lucide-react";
import { Document, DocumentListView } from "@/lib/types";
import { NewDocumentButton } from "@/components/documents/NewDocumentButton";
import { CreateDocumentDialog } from "@/components/documents/CreateDocumentDialog";
import { DocumentWorkbenchRow } from "@/components/documents/DocumentWorkbenchRow";
import { UploadDocumentsDialog } from "@/components/documents/UploadDocumentsDialog";
import { useRouter, useSearchParams } from "next/navigation";
import { TrashView } from "@/components/documents/TrashView";
import { DocumentVersionHistory } from "@/components/documents/DocumentVersionHistory";
import { ReplaceFileDialog } from "@/components/documents/ReplaceFileDialog";
import { EditDocumentDialog } from "@/components/documents/EditDocumentDialog";
import { BatchActionsBar } from "@/components/documents/batch-actions-bar";
import {
  AcademicYearSelector,
  useAcademicYearStore,
} from "@/components/structure/AcademicYearSelector";
import { DirectoryNavigation, useDirectoryAccess } from "@/components/documents/DirectoryNavigation";
import { DirectoryVisitRecorder } from "@/components/documents/DirectoryVisitRecorder";
import { invalidateDirectoryQueries } from "@/lib/directory-cache";
import { isResidualWorkflowFilename } from "@/lib/document-visibility";
import {
  isPositiveDirectoryId,
  useDirectorySubmission,
} from "@/hooks/use-directory-submission";

// Shadcn imports
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";

// Helper para obtener el componente de icono desde el string

const DOCUMENT_LIST_VIEWS: DocumentListView[] = [
  "recent-accessed",
  "recent-created",
  "all",
  "trash",
];

const DOCUMENTS_PAGE_SIZE = 25;

function parseDocumentView(value: string | null): DocumentListView | undefined {
  return DOCUMENT_LIST_VIEWS.includes(value as DocumentListView)
    ? (value as DocumentListView)
    : undefined;
}

/** Identificador malformado: distingue un destino inválido de la raíz ausente. */
const INVALID_DIRECTORY_ID = Number.NaN;

/**
 * `null` cuando el parámetro está ausente (raíz ordinaria); `NaN` cuando el
 * valor existe pero es malformado (vacío, no numérico, cero, negativo,
 * fraccionario o desbordado), para no listar ni cargar la raíz por un enlace
 * inválido.
 */
function parseDirectoryId(value: string | null): number | null {
  if (value === null) return null;
  const parsed = Number(value);
  return isPositiveDirectoryId(parsed) ? parsed : INVALID_DIRECTORY_ID;
}

export function DocumentsPageContent() {
  const { user } = useAuth();
  const { currentYearId, setCurrentYearId } = useAcademicYearStore();
  const queryClient = useQueryClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const newActionRequested = searchParams.get("action") === "new";
  const uploadSingleActionRequested =
    searchParams.get("action") === "upload-single";
  const uploadMultipleActionRequested =
    searchParams.get("action") === "upload-multiple";
  const documentView = parseDocumentView(searchParams.get("view"));
  const isTrashView = documentView === "trash";
  const isUnfilteredView =
    documentView === "recent-accessed" ||
    documentView === "recent-created" ||
    documentView === "all";
  const documentViewTitle =
    documentView === "recent-accessed"
      ? "Visitados recientemente"
      : documentView === "recent-created"
        ? "Creados recientemente"
        : documentView === "all"
          ? "Todos los documentos"
          : "Documentos";

  // Estados
  const [documentTypeFilter, setDocumentTypeFilter] = useState<
    number | undefined
  >(undefined);
  const [onlyMine, setOnlyMine] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUploadMultipleModal, setShowUploadMultipleModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Estados para version history y replace file
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versionHistoryDocument, setVersionHistoryDocument] =
    useState<Document | null>(null);
  const [showReplaceFile, setShowReplaceFile] = useState(false);
  const [replaceFileDocument, setReplaceFileDocument] =
    useState<Document | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);

  // Estados para batch actions
  const [selectedDocuments, setSelectedDocuments] = useState<Document[]>([]);
  const batchSelection = useRef<number[]>([]);
  batchSelection.current = selectedDocuments.map((document) => document.id);
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<
    "createdAt" | "updatedAt" | "name" | "documentNumber" | undefined
  >(undefined);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [directoryId, setDirectoryId] = useState<number | null>(() =>
    parseDirectoryId(searchParams.get("directoryId")),
  );
  const [movingDocument, setMovingDocument] = useState<Document | null>(null);
  const [moveDestination, setMoveDestination] = useState<number | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const deleteEpoch = useRef<object | null>(null);
  const moveEpoch = useRef<object | null>(null);
  const editEpoch = useRef<object | null>(null);
  const replaceEpoch = useRef<object | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);
  useEffect(() => {
    setPage(1);
  }, [documentTypeFilter, onlyMine, currentYearId, directoryId, documentView, search, sortBy, sortOrder]);
  const contextKey = JSON.stringify([user?.id, documentTypeFilter, onlyMine, currentYearId,
    directoryId, searchParams.get("directoryId"), documentView, search, sortBy, sortOrder, page]);
  const actionState = useRef({ key: contextKey, epoch: {}, ready: false, rows: [] as Document[], alive: true });
  const batchSelectionEpoch = useRef<object | null>(null);
  if (actionState.current.key !== contextKey) {
    actionState.current = { key: contextKey, epoch: {}, ready: false, rows: [], alive: true };
  }
  useEffect(() => {
    actionState.current.alive = true;
    return () => { actionState.current.alive = false; };
  }, []);
  useEffect(() => {
    setSelectedDocuments([]);
    setDeleteConfirmId(null);
    setMovingDocument(null);
    setEditingDocument(null);
    setReplaceFileDocument(null);
    setShowEditDialog(false);
    setShowReplaceFile(false);
    setShowPreviewModal(false);
    setVersionHistoryDocument(null);
  }, [contextKey]);

  // Autoridad de envío para la carpeta seleccionada. La raíz y las carpetas
  // ordinarias conservan el comportamiento existente; una carpeta de recepción
  // sin `submit` vigente no ofrece carga.
  const submission = useDirectorySubmission(directoryId);
  const folderAccess = useDirectoryAccess(directoryId, !isTrashView);
  const moveAccess = useDirectoryAccess(moveDestination, movingDocument !== null);
  const canUpload = directoryId === null ? submission.canSubmit :
    folderAccess.ready && (folderAccess.directory?.receptionEnabled ? submission.canSubmit : folderAccess.canWrite);
  const directoryInvalid =
    typeof directoryId === "number" && Number.isNaN(directoryId);

  useEffect(() => {
    setDirectoryId(parseDirectoryId(searchParams.get("directoryId")));
  }, [searchParams]);

  useEffect(() => {
    setCreateDialogOpen(newActionRequested);
  }, [newActionRequested]);

  // Acción explícita desde Home: abre directamente el diálogo de carga
  // correspondiente sin pasar por el menú "Nuevo". Al alternar la acción en el
  // mismo montaje se restablece el modo opuesto para no conservar una selección.
  // Un destino inválido nunca abre el diálogo ni cae a la raíz.
  useEffect(() => {
    if (directoryInvalid) return;
    if (uploadSingleActionRequested) {
      setShowUploadMultipleModal(false);
      setShowUploadModal(true);
    } else if (uploadMultipleActionRequested) {
      setShowUploadModal(false);
      setShowUploadMultipleModal(true);
    }
  }, [
    uploadSingleActionRequested,
    uploadMultipleActionRequested,
    directoryInvalid,
  ]);

  // Queries
  const {
    data: documents,
    isLoading: loadingDocuments,
    isFetching: fetchingDocuments,
    error: documentsError,
    refetch: refetchDocuments,
  } = useQuery({
    queryKey: [
      "documents",
      documentTypeFilter,
      onlyMine,
      currentYearId,
      directoryId,
      documentView,
      search,
      sortBy,
      sortOrder,
      page,
      user?.id,
    ],
    queryFn: () =>
      documentsService.getAll({
        documentTypeId: documentTypeFilter,
        onlyMine: onlyMine || undefined,
        directoryId: isUnfilteredView ? undefined : directoryId,
        ...(isUnfilteredView
          ? { view: documentView }
          : {
              academicYearId: currentYearId ?? undefined,
              excludeBatched: true,
            }),
        ...(search ? { search } : {}),
        ...(sortBy ? { sortBy, sortOrder } : {}),
        page,
        limit: DOCUMENTS_PAGE_SIZE,
      }),
    enabled: !!user?.id && !isTrashView && !directoryInvalid,
    placeholderData: () => undefined,
  });

  actionState.current.ready = !!user?.id && !loadingDocuments && !fetchingDocuments &&
    !documentsError && !!documents && !directoryInvalid && !isTrashView &&
    Object.is(directoryId, parseDirectoryId(searchParams.get("directoryId")));
  const filteredDocuments =
    (actionState.current.ready ? documents?.data : undefined)?.filter(
      (document) =>
        documentView === "all" ||
        !isResidualWorkflowFilename(document.versions?.[0]?.filename),
    ) ?? [];
  const documentsMeta = documents?.meta;
  const totalDocuments = documentsMeta?.total ?? filteredDocuments.length;
  const currentPage = documentsMeta?.page ?? page;
  const totalPages = Math.max(documentsMeta?.totalPages ?? 1, 1);
  const rangeStart =
    totalDocuments === 0
      ? 0
      : (currentPage - 1) * (documentsMeta?.limit ?? DOCUMENTS_PAGE_SIZE) + 1;
  const rangeEnd =
    totalDocuments === 0
      ? 0
      : Math.min(
          rangeStart + (documentsMeta?.limit ?? DOCUMENTS_PAGE_SIZE) - 1,
          totalDocuments,
        );
  const hasActiveFilters = Boolean(search || documentTypeFilter || onlyMine);

  const clearFilters = () => {
    setSearchInput("");
    setSearch("");
    setDocumentTypeFilter(undefined);
    setOnlyMine(false);
  };

  const navigateToRoot = () => {
    const params = new URLSearchParams(queryString);
    params.delete("directoryId");
    params.delete("action");
    setDirectoryId(null);
    router.push(
      `/dashboard/documents${params.size ? `?${params.toString()}` : ""}`,
    );
  };

  const toggleSort = (
    field: "createdAt" | "updatedAt" | "name" | "documentNumber",
  ) => {
    if (sortBy === field) {
      setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
  };

  const renderSortButton = (
    field: "createdAt" | "updatedAt" | "name" | "documentNumber",
    label: string,
  ) => {
    const active = sortBy === field;
    return (
      <button
        type="button"
        onClick={() => toggleSort(field)}
        className="inline-flex items-center gap-1 text-left uppercase tracking-wide hover:text-foreground"
        aria-label={`Ordenar por ${label}`}
        aria-pressed={active}
      >
        {label}
        {active ? (
          sortOrder === "asc" ? (
            <ArrowUp className="h-3 w-3" aria-hidden="true" />
          ) : (
            <ArrowDown className="h-3 w-3" aria-hidden="true" />
          )
        ) : null}
      </button>
    );
  };

  const renderSearchField = () => (
    <div className="relative w-full sm:w-[260px]">
      <Search
        className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        value={searchInput}
        onChange={(event) => setSearchInput(event.target.value)}
        placeholder="Filtrar por nombre, número o descripción"
        aria-label="Filtrar esta bandeja"
        className="h-9 pl-8"
      />
    </div>
  );

  const renderYearScope = () =>
    isUnfilteredView ? (
      <span className="inline-flex h-9 items-center rounded-md border border-dashed px-3 text-xs text-muted-foreground">
        Todos los años · Todas las carpetas
      </span>
    ) : (
      <div className="w-full sm:w-[200px]">
        <AcademicYearSelector label="Filtrar por año lectivo" />
      </div>
    );

  const viewOptions: { value?: DocumentListView; label: string }[] = [
    { value: undefined, label: "Bandeja" },
    { value: "recent-accessed", label: "Visitados recientemente" },
    { value: "recent-created", label: "Creados recientemente" },
    { value: "trash", label: "Papelera" },
  ];
  const selectDocumentView = (view?: DocumentListView) => {
    const params = new URLSearchParams(queryString);
    if (view) params.set("view", view);
    else params.delete("view");
    params.delete("action");
    router.push(
      `/dashboard/documents${params.size ? `?${params.toString()}` : ""}`,
    );
  };
  const renderViewSelector = () => (
    <div className="w-full sm:w-[200px]">
      <Select
        value={documentView ?? "bandeja"}
        onValueChange={(value) =>
          selectDocumentView(
            value === "bandeja" ? undefined : (value as DocumentListView),
          )
        }
      >
        <SelectTrigger aria-label="Vista de documentos">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {viewOptions.map((option) => (
            <SelectItem key={option.label} value={option.value ?? "bandeja"}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  const renderPagination = () => {
    if (!documentsMeta || documentsMeta.total === 0 || documentsMeta.totalPages <= 1) {
      return null;
    }
    return (
      <div className="flex flex-col gap-3 border-t border-border py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-end">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={currentPage <= 1 || fetchingDocuments}
          >
            Anterior
          </Button>
          <span>
            Página {currentPage} de {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setPage((current) => Math.min(totalPages, current + 1))
            }
            disabled={currentPage >= totalPages || fetchingDocuments}
          >
            Siguiente
          </Button>
        </div>
      </div>
    );
  };

  actionState.current.rows = filteredDocuments;
  const canAct = (id: number, action: Exclude<keyof DocumentActionCapabilities, "scope">, epoch?: object | null) => {
    const current = actionState.current;
    const query = queryClient.getQueryState(["documents", documentTypeFilter, onlyMine,
      currentYearId, directoryId, documentView, search, sortBy, sortOrder, page, user?.id]);
    return current.alive && current.ready && (!epoch || current.epoch === epoch) &&
      query?.fetchStatus === "idle" && !query.isInvalidated &&
       readDocumentActionCapabilities(current.rows.find((doc) => doc.id === id), user?.id ?? null)?.[action] === true;
  };
  const batchEpoch = actionState.current.epoch;
  const canBatchAct = (action: BatchAction, ids: number[]) => {
    const current = actionState.current;
    const selection = batchSelection.current;
    const query = queryClient.getQueryState(["documents", documentTypeFilter, onlyMine,
      currentYearId, directoryId, documentView, search, sortBy, sortOrder, page, user?.id]);
    return current.alive && current.ready && current.epoch === batchEpoch &&
      batchSelectionEpoch.current === current.epoch &&
      query?.status === "success" && query.fetchStatus === "idle" && !query.isInvalidated &&
      ids.length > 0 && ids.length === selection.length && new Set(ids).size === ids.length &&
      ids.every((id) => selection.includes(id) &&
        readBatchActionCapabilities(current.rows.find((document) => document.id === id))?.[action] === true);
  };

  const { thumbnailUrls } = useDocumentThumbnails(filteredDocuments);

  const { data: stats } = useQuery({
    queryKey: ["stats", user?.id],
    queryFn: () => documentsService.getStats(),
    enabled: !!user?.id && !isTrashView,
  });

  const { uploadDocumentTypes, academicYears } = useUploadMetadata();

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: ({ id, epoch }: { id: number; epoch: object }) => {
      if (!canAct(id, "trash", epoch)) throw new Error("Los permisos han cambiado.");
      return documentsService.delete(id);
    },
    onSuccess: (_data, { id, epoch }) => {
      if (!canAct(id, "trash", epoch)) return;
      invalidateDirectoryQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast.success("Documento eliminado exitosamente");
    },
    onError: (_error, { epoch }) => {
      if (actionState.current.epoch !== epoch || !actionState.current.alive) return;
      toast.error("Error al eliminar documento");
    },
  });

  // Handlers

  const handleUploadSuccess = () => {
    invalidateDirectoryQueries(queryClient);
    queryClient.invalidateQueries({ queryKey: ["stats"] });
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  const handleDownload = async (id: number, filename: string) => {
    try {
      const blob = await documentsService.download(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      document.body.removeChild(a);
      toast.success("Descarga iniciada");
    } catch {
      toast.error("Error al descargar archivo");
    }
  };

  const handleDelete = (id: number) => {
    if (!canAct(id, "trash")) return;
    deleteEpoch.current = actionState.current.epoch;
    setDeleteConfirmId(id);
  };

  const moveMutation = useMutation({
    mutationFn: ({ id, destination, epoch }: { id: number; destination: number | null; epoch: object }) => {
      if (!canAct(id, "move", epoch) || destination !== moveDestination || !moveAccess.canWriteNow())
        throw new Error("Los permisos han cambiado.");
      return documentsService.moveToDirectory(id, destination);
    },
    onSuccess: (_data, { id, epoch }) => {
      if (!canAct(id, "move", epoch)) return;
      invalidateDirectoryQueries(queryClient);
      setMovingDocument(null);
      toast.success("Documento movido exitosamente");
    },
    onError: (_error, { epoch }) => {
      if (actionState.current.epoch === epoch && actionState.current.alive)
        toast.error("No se pudo mover el documento");
    },
  });

  const handleEdit = (doc: Document) => {
    if (!canAct(doc.id, "editMetadata")) return;
    editEpoch.current = actionState.current.epoch;
    setEditingDocument(doc);
    setShowEditDialog(true);
  };
  const handleMove = (doc: Document) => {
    if (!canAct(doc.id, "move")) return;
    moveEpoch.current = actionState.current.epoch;
    setMovingDocument(doc);
    setMoveDestination(doc.directoryId ?? null);
  };

  const handlePreview = async (doc: Document) => {
    setPreviewDocument(doc);
    setShowPreviewModal(true);
    setLoadingPreview(true);

    try {
      const blob = await documentsService.view(doc.id);
      const url = window.URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch {
      toast.error("Error al cargar la vista previa");
      setShowPreviewModal(false);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Handlers para batch actions
  const handleToggleDocument = (doc: Document) => {
    if (!actionState.current.ready || !filteredDocuments.some((current) => current.id === doc.id)) return;
    batchSelectionEpoch.current = actionState.current.epoch;
    setSelectedDocuments((prev) => {
      const isSelected = prev.some((d) => d.id === doc.id);
      if (isSelected) {
        return prev.filter((d) => d.id !== doc.id);
      } else {
        return [...prev, doc];
      }
    });
  };

  const handleSelectAll = () => {
    if (!actionState.current.ready) return;
    batchSelectionEpoch.current = actionState.current.epoch;
    if (selectedDocuments.length === filteredDocuments.length) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(filteredDocuments);
    }
  };

  const handleClearSelection = () => {
    setSelectedDocuments([]);
  };

  const handleBatchSuccess = () => {
    setSelectedDocuments([]);
    invalidateDirectoryQueries(queryClient);
    queryClient.invalidateQueries({ queryKey: ["stats"] });
  };

  // Limpiar URL del blob cuando se cierra el modal
  useEffect(() => {
    if (!showPreviewModal && previewUrl) {
      window.URL.revokeObjectURL(previewUrl);
      setPreviewUrl("");
      setPreviewDocument(null);
    }
  }, [showPreviewModal, previewUrl]);

  const handleShowVersionHistory = (doc: Document) => {
    setVersionHistoryDocument(doc);
    setShowVersionHistory(true);
  };

  const handleShowReplaceFile = (doc: Document) => {
    if (!canAct(doc.id, "editContent")) return;
    replaceEpoch.current = actionState.current.epoch;
    setReplaceFileDocument(doc);
    setShowReplaceFile(true);
  };

  const handleCreateDialogOpenChange = (open: boolean) => {
    setCreateDialogOpen(open);
    const nextSearchParams = new URLSearchParams(queryString);
    if (open) {
      nextSearchParams.set("action", "new");
    } else {
      nextSearchParams.delete("action");
    }
    const nextQuery = nextSearchParams.toString();
    router.replace(`/dashboard/documents${nextQuery ? `?${nextQuery}` : ""}`, {
      scroll: false,
    });
  };

  // No ofrece el diálogo de carga mientras la carpeta seleccionada no tenga
  // permisos vigentes (recepción sin submit, comprobación pendiente, error o
  // destino inválido).
  const openUploadDialog = (multiple: boolean) => {
    if (directoryInvalid || !canUpload) return;
    if (multiple) setShowUploadMultipleModal(true);
    else setShowUploadModal(true);
  };

  const handleUploadDialogOpenChange = (open: boolean) => {    if (open) return;
    setShowUploadModal(false);
    setShowUploadMultipleModal(false);

    // Consume la acción de la URL al cerrar para que recargar o remontar no
    // reabra el diálogo. Se preservan los demás parámetros (directoryId, etc.).
    if (uploadSingleActionRequested || uploadMultipleActionRequested) {
      const nextSearchParams = new URLSearchParams(queryString);
      nextSearchParams.delete("action");
      const nextQuery = nextSearchParams.toString();
      router.replace(`/dashboard/documents${nextQuery ? `?${nextQuery}` : ""}`, {
        scroll: false,
      });
    }
  };

  if (directoryInvalid) {
    return (
      <div className="bg-background">
        <div className="mx-auto max-w-7xl space-y-6 p-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Carpeta no válida</AlertTitle>
            <AlertDescription>
              La dirección solicitada no corresponde a una carpeta válida.
              Revisa el enlace o vuelve a la raíz.
            </AlertDescription>
          </Alert>
          <Button
            variant="outline"
            onClick={() => router.replace("/dashboard/documents")}
          >
            Volver a la raíz
          </Button>
        </div>
      </div>
    );
  }

  if (isTrashView) {
    return (
      <div className="bg-background">
        <div className="mx-auto max-w-[1500px] space-y-4">
          {renderViewSelector()}
          <TrashView />
        </div>
      </div>
    );
  }

  const renderWorkbench = () => (
    <div className="space-y-4">
      <header className="flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">
              {documentViewTitle}
            </h1>
            {submission.isReception && submission.directoryName ? (
              <span className="rounded-full border px-2 py-0.5 text-xs text-muted-foreground">
                Recepción: {submission.directoryName}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {documentsMeta && documentsMeta.total > 0
              ? `Mostrando ${rangeStart}–${rangeEnd} de ${totalDocuments} documentos`
              : `${filteredDocuments.length} ${
                  filteredDocuments.length === 1 ? "documento" : "documentos"
                }`}
            {stats ? ` · ${stats.totalSizeMB} MB` : ""}
            {selectedDocuments.length > 0
              ? ` · ${selectedDocuments.length} ${
                  selectedDocuments.length === 1 ? "seleccionado" : "seleccionados"
                }`
              : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetchDocuments()}
            disabled={fetchingDocuments}
          >
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
          <NewDocumentButton onClick={() => handleCreateDialogOpenChange(true)} />
        </div>
      </header>

      <div className="flex w-full flex-wrap items-center gap-2">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {renderViewSelector()}
          {renderSearchField()}
          {renderYearScope()}
          {!isUnfilteredView && directoryId !== null && (
            <span className="inline-flex h-8 items-center gap-1 rounded-full border border-border px-2.5 text-xs">
              <FolderOpen
                className="h-3.5 w-3.5 text-muted-foreground"
                aria-hidden="true"
              />
              {folderAccess.directory?.name ?? "Carpeta"}
              <button
                type="button"
                onClick={navigateToRoot}
                aria-label="Quitar filtro de carpeta"
                className="rounded-full p-0.5 text-muted-foreground hover:text-foreground"
              >
                <FilterX className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-3 text-xs"
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((current) => !current)}
          >
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Filtros
          </Button>
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs"
              onClick={clearFilters}
            >
              <FilterX className="mr-1.5 h-3.5 w-3.5" />
              Limpiar filtros
            </Button>
          )}
        </div>
      </div>

      {filtersOpen && (
        <div className="flex flex-wrap items-end gap-3 rounded-md border border-border bg-muted/30 p-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Propietario
            </p>
            <div
              className="flex items-center gap-1 rounded-md border bg-muted p-1"
              role="group"
              aria-label="Filtrar por propietario"
            >
              <Button
                type="button"
                size="sm"
                variant={!onlyMine ? "default" : "ghost"}
                className="h-7 px-3 text-xs"
                aria-pressed={!onlyMine}
                onClick={() => setOnlyMine(false)}
              >
                Cualquiera
              </Button>
              <Button
                type="button"
                size="sm"
                variant={onlyMine ? "default" : "ghost"}
                className="h-7 gap-1.5 px-3 text-xs"
                aria-pressed={onlyMine}
                onClick={() => setOnlyMine(true)}
              >
                <User className="h-3 w-3" />
                Mis documentos
              </Button>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              Tipo de documento
            </p>
            <Select
              value={documentTypeFilter?.toString() || "all"}
              onValueChange={(value) =>
                setDocumentTypeFilter(
                  value === "all" ? undefined : parseInt(value),
                )
              }
            >
              <SelectTrigger
                size="sm"
                className="w-full sm:w-[220px]"
                aria-label="Filtrar por tipo de documento"
              >
                <SelectValue placeholder="Tipo de documento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                {uploadDocumentTypes?.map((type) => (
                  <SelectItem key={type.id} value={type.id.toString()}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}


      {!isUnfilteredView && (
        <details className="rounded-lg border border-border bg-card">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium">
            Carpetas · {folderAccess.directory?.name ?? "Raíz"}
          </summary>
          <div className="border-t border-border p-4">
            <DirectoryNavigation
              value={directoryId}
              onChange={(id) => {
                const params = new URLSearchParams(queryString);
                if (id === null) params.delete("directoryId");
                else params.set("directoryId", String(id));
                params.delete("action");
                setDirectoryId(id);
                router.push(
                  `/dashboard/documents${params.size ? `?${params.toString()}` : ""}`,
                );
              }}
            />
          </div>
        </details>
      )}
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {documentsError ? (
            <div className="p-4">
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error al cargar documentos</AlertTitle>
                <AlertDescription className="flex flex-col gap-3">
                  <p>
                    No se pudieron cargar los documentos. Verifica la conexión
                    con el servidor.
                  </p>
                  <Button
                    type="button"
                    onClick={() => refetchDocuments()}
                    variant="outline"
                    size="sm"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Reintentar
                  </Button>
                </AlertDescription>
              </Alert>
            </div>
          ) : loadingDocuments || fetchingDocuments ? (
            <div className="divide-y divide-border">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3 px-3 py-3">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-9 w-9" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                  <Skeleton className="h-8 w-8" />
                </div>
              ))}
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/40" />
              <p className="mt-3 font-medium">
                {hasActiveFilters ? "Sin resultados" : "No hay documentos"}
              </p>
              <p className="text-sm text-muted-foreground">
                {hasActiveFilters
                  ? "Prueba con otro término o limpia los filtros."
                  : "Comienza subiendo tu primer documento."}
              </p>
            </div>
          ) : (
            <table className="w-full border-collapse text-sm" aria-label="Documentos">
              <thead className="hidden border-b border-border bg-muted/30 text-[11px] font-medium uppercase tracking-wide text-muted-foreground md:table-header-group">
                <tr>
                  <th scope="col" className="w-10 px-3 py-2 text-left">
                    <Checkbox
                      checked={
                        filteredDocuments.length > 0 &&
                        selectedDocuments.length === filteredDocuments.length
                      }
                      onCheckedChange={() => handleSelectAll()}
                      aria-label="Seleccionar página"
                    />
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 text-left"
                    aria-sort={
                      sortBy === "name"
                        ? sortOrder === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    {renderSortButton("name", "Documento")}
                  </th>
                  <th scope="col" className="px-3 py-2 text-left">
                    Tipo de documento
                  </th>
                  <th scope="col" className="px-3 py-2 text-left">
                    Carpeta
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-2 text-left"
                    aria-sort={
                      sortBy === "updatedAt"
                        ? sortOrder === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                  >
                    {renderSortButton("updatedAt", "Actualizado")}
                  </th>
                  <th scope="col" className="px-3 py-2 text-left">
                    Tamaño
                  </th>
                  <th scope="col" className="px-3 py-2 text-left">
                    Estado
                  </th>
                  <th scope="col" className="px-3 py-2 text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredDocuments.map((doc) => (
                  <DocumentWorkbenchRow
                    key={doc.id}
                    doc={doc}
                    isSelected={selectedDocuments.some(
                      (selected) => selected.id === doc.id,
                    )}
                    onToggle={handleToggleDocument}
                    thumbnailUrl={thumbnailUrls[doc.id]?.url}
                    onPreview={handlePreview}
                    onDownload={handleDownload}
                    onShowVersionHistory={handleShowVersionHistory}
                    onEdit={handleEdit}
                    onReplaceFile={handleShowReplaceFile}
                    onDelete={handleDelete}
                    onMove={handleMove}
                    isDeleting={deleteMutation.isPending}
                    actorId={user?.id ?? null}
                  />
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="px-4 sm:px-6">{renderPagination()}</div>
    </div>
  );

  return (
    <div className="bg-background">
      <DirectoryVisitRecorder
        directoryId={directoryId}
        navigationSucceeded={
          directoryId !== null &&
          !loadingDocuments &&
          !documentsError &&
          documents !== undefined
        }
      />
      <div className="mx-auto max-w-[1500px] space-y-4">
        {renderWorkbench()}

        <CreateDocumentDialog
          open={createDialogOpen}
          onOpenChange={handleCreateDialogOpenChange}
          uploadDocumentTypes={uploadDocumentTypes}
          academicYears={academicYears}
          uploadDisabled={!canUpload}
          onUploadSingle={() => openUploadDialog(false)}
          onUploadMultiple={() => openUploadDialog(true)}
        />

        {/* Modal de subir documento */}
        <UploadDocumentsDialog
          open={(showUploadModal || showUploadMultipleModal) && (directoryId === null ||
            (folderAccess.ready && (folderAccess.directory?.receptionEnabled === true || folderAccess.canWrite)))}
          multiple={showUploadMultipleModal}
          directoryId={directoryId}
          uploadDocumentTypes={uploadDocumentTypes}
          academicYears={academicYears}
          onOpenChange={handleUploadDialogOpenChange}
          onSuccess={handleUploadSuccess}
        />

        {/* Modal de vista previa de documento */}
        <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
          <DialogContent className="sm:max-w-[90vw] sm:max-h-[90vh] h-[90vh]">
            <DialogHeader>
              <DialogTitle>
                Vista Previa: {previewDocument?.name?.trim() || previewDocument?.versions?.[0]?.filename || ""}
              </DialogTitle>
              <DialogDescription>
                {previewDocument?.description ||
                  "Previsualización del documento"}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 min-h-0 h-full">
              {loadingPreview ? (
                <div className="flex flex-col items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                  <p className="text-muted-foreground mt-4">
                    Cargando vista previa...
                  </p>
                </div>
              ) : previewUrl ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-full border rounded-md"
                  title={previewDocument?.name?.trim() || previewDocument?.versions?.[0]?.filename || ""}
                />
              ) : null}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowPreviewModal(false)}
              >
                Cerrar
              </Button>
              {previewDocument && (
                <Button
                  onClick={() =>
                    handleDownload(
                      previewDocument.id,
                      previewDocument?.versions?.[0]?.filename ?? "",
                    )
                  }
                  disabled={loadingPreview}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Descargar
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de historial de versiones */}
        {versionHistoryDocument && (
          <DocumentVersionHistory
            documentId={versionHistoryDocument.id}
            currentVersion={versionHistoryDocument.currentVersion}
            open={showVersionHistory}
            onOpenChange={setShowVersionHistory}
          />
        )}

        {/* Modal de reemplazar archivo */}
        {replaceFileDocument && replaceEpoch.current === actionState.current.epoch && (
          <ReplaceFileDialog
            key={`${contextKey}:${replaceFileDocument.id}`}
            authorize={() => canAct(replaceFileDocument.id, "editContent", replaceEpoch.current)}
            documentId={replaceFileDocument.id}
            documentName={replaceFileDocument.versions?.[0]?.filename ?? ""}
            open={showReplaceFile && (fetchingDocuments || canAct(replaceFileDocument.id, "editContent", replaceEpoch.current))}
            onOpenChange={setShowReplaceFile}
          />
        )}

        {/* Modal de editar documento */}
        {editingDocument && editEpoch.current === actionState.current.epoch && (
          <EditDocumentDialog
            key={`${contextKey}:${editingDocument.id}`}
            authorize={() => canAct(editingDocument.id, "editMetadata", editEpoch.current)}
            document={editingDocument}
            open={showEditDialog && (fetchingDocuments || canAct(editingDocument.id, "editMetadata", editEpoch.current))}
            onOpenChange={setShowEditDialog}
          />
        )}

        {/* Batch Actions Bar */}
        <BatchActionsBar
          key={contextKey}
          contextKey={contextKey}
          authorize={canBatchAct}
          selectedDocuments={batchSelectionEpoch.current === actionState.current.epoch
            ? selectedDocuments.map((selected) =>
              filteredDocuments.find((document) => document.id === selected.id) ?? selected)
            : []}
          onClearSelection={handleClearSelection}
          onSuccess={handleBatchSuccess}
        />

        <ConfirmDialog
          open={deleteConfirmId !== null && canAct(deleteConfirmId, "trash", deleteEpoch.current)}
          onOpenChange={(open) => !open && setDeleteConfirmId(null)}
          title="Eliminar documento"
          description="¿Estás seguro de eliminar este documento? Será enviado a la papelera."
          confirmLabel="Eliminar"
          variant="destructive"
          loading={deleteMutation.isPending}
          onConfirm={() => {
            if (deleteConfirmId !== null && deleteEpoch.current && canAct(deleteConfirmId, "trash", deleteEpoch.current))
              deleteMutation.mutate({ id: deleteConfirmId, epoch: deleteEpoch.current });
            setDeleteConfirmId(null);
          }}
        />

        <Dialog
          open={movingDocument !== null && canAct(movingDocument.id, "move", moveEpoch.current)}
          onOpenChange={(open) => !open && setMovingDocument(null)}
        >
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Mover documento</DialogTitle>
              <DialogDescription>
                Selecciona el directorio de destino.
              </DialogDescription>
            </DialogHeader>
            <DirectoryNavigation
              value={moveDestination}
              onChange={setMoveDestination}
              picker
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setMovingDocument(null)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (movingDocument && moveEpoch.current && moveAccess.canWrite && canAct(movingDocument.id, "move", moveEpoch.current))
                    moveMutation.mutate({ id: movingDocument.id, destination: moveDestination, epoch: moveEpoch.current });
                }}
                disabled={moveMutation.isPending || !movingDocument || !moveAccess.canWrite || !canAct(movingDocument.id, "move", moveEpoch.current)}
              >
                Mover aquí
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
