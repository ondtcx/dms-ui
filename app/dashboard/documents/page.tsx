// src/app/dashboard/documents/page.tsx
"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
import { readDocumentActionCapabilities, type DocumentActionCapabilities } from "@/lib/document-action-capabilities";
import { readBatchActionCapabilities, type BatchAction } from "@/lib/batch-action-capabilities";
import { useUploadMetadata } from "@/hooks/use-upload-metadata";
import { useDocumentThumbnails } from "@/hooks/use-document-thumbnails";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsService } from "@/lib/services/documents.service";
import { onlyofficeService } from "@/lib/services/onlyoffice.service";
import { Suspense, useState, useEffect, useRef } from "react";
import toast from "react-hot-toast";
import {
  FileText,
  Download,
  Upload,
  Filter,
  User,
  FolderOpen,
  AlertCircle,
  RefreshCw,
  LayoutGrid,
  List,
} from "lucide-react";
import { Document, DocumentListView } from "@/lib/types";
import { NewDocumentButton } from "@/components/documents/NewDocumentButton";
import { DocumentCard } from "@/components/documents/DocumentCard";
import { DocumentListItem } from "@/components/documents/DocumentListItem";
import { UploadDocumentsDialog } from "@/components/documents/UploadDocumentsDialog";
import { useRouter, useSearchParams } from "next/navigation";
import { TrashView } from "@/components/documents/TrashView";
import { DocumentVersionHistory } from "@/components/documents/DocumentVersionHistory";
import { ReplaceFileDialog } from "@/components/documents/ReplaceFileDialog";
import { EditDocumentDialog } from "@/components/documents/EditDocumentDialog";
import { BatchActionsBar } from "@/components/documents/batch-actions-bar";
import { SelectTemplateDialog } from "@/components/documents/SelectTemplateDialog";
import {
  AcademicYearSelector,
  useAcademicYearStore,
} from "@/components/structure/AcademicYearSelector";
import { DirectoryNavigation, useDirectoryAccess } from "@/components/documents/DirectoryNavigation";
import { FolderBrowser } from "@/components/documents/FolderBrowser";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

// Helper para obtener el componente de icono desde el string

const DOCUMENT_LIST_VIEWS: DocumentListView[] = [
  "recent-accessed",
  "recent-created",
  "all",
  "trash",
];

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

export default function DocumentsPage() {
  return (
    <Suspense fallback={<div className="p-8">Cargando documentos...</div>}>
      <DocumentsPageContent />
    </Suspense>
  );
}

function DocumentsPageContent() {
  const { user } = useAuth();
  const { currentYearId } = useAcademicYearStore();
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
      ? "Recientemente accedido"
      : documentView === "recent-created"
        ? "Recientemente creado"
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
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [showBatchSelectDialog, setShowBatchSelectDialog] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Create in editor dialog state
  const [showCreateInEditorDialog, setShowCreateInEditorDialog] =
    useState(false);
  const [createInEditorData, setCreateInEditorData] = useState<{
    title: string;
    fileType: "docx" | "xlsx" | "pptx" | "txt" | "md";
    categoryId?: number;
    documentTypeId?: number;
  }>({ title: "", fileType: "docx" });
  const [creatingInEditor, setCreatingInEditor] = useState(false);
  const [directoryId, setDirectoryId] = useState<number | null>(() =>
    parseDirectoryId(searchParams.get("directoryId")),
  );
  const [movingDocument, setMovingDocument] = useState<Document | null>(null);
  const [moveDestination, setMoveDestination] = useState<number | null>(null);
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const skipNewMenuCloseRef = useRef(false);
  const deleteEpoch = useRef<object | null>(null);
  const moveEpoch = useRef<object | null>(null);
  const editEpoch = useRef<object | null>(null);
  const replaceEpoch = useRef<object | null>(null);
  const contextKey = JSON.stringify([user?.id, documentTypeFilter, onlyMine, currentYearId,
    directoryId, searchParams.get("directoryId"), documentView]);
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
    setNewMenuOpen(newActionRequested);
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
        page: 1,
        limit: 50,
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
  actionState.current.rows = filteredDocuments;
  const canAct = (id: number, action: Exclude<keyof DocumentActionCapabilities, "scope">, epoch?: object | null) => {
    const current = actionState.current;
    const query = queryClient.getQueryState(["documents", documentTypeFilter, onlyMine,
      currentYearId, directoryId, documentView, user?.id]);
    return current.alive && current.ready && (!epoch || current.epoch === epoch) &&
      query?.fetchStatus === "idle" && !query.isInvalidated &&
       readDocumentActionCapabilities(current.rows.find((doc) => doc.id === id), user?.id ?? null)?.[action] === true;
  };
  const batchEpoch = actionState.current.epoch;
  const canBatchAct = (action: BatchAction, ids: number[]) => {
    const current = actionState.current;
    const selection = batchSelection.current;
    const query = queryClient.getQueryState(["documents", documentTypeFilter, onlyMine,
      currentYearId, directoryId, documentView, user?.id]);
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

  const {
    categories,
    loadingCategories,
    uploadDocumentTypes,
    academicYears,
  } = useUploadMetadata();

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

  const handleCreateInEditor = async () => {
    if (!createInEditorData.title.trim()) {
      toast.error("Ingresa un nombre para el documento");
      return;
    }
    setCreatingInEditor(true);
    try {
      const doc = await onlyofficeService.createBlank(createInEditorData);
      setShowCreateInEditorDialog(false);
      setCreateInEditorData({
        title: "",
        fileType: "docx",
      });
      if (
        createInEditorData.fileType === "txt" ||
        createInEditorData.fileType === "md"
      ) {
        router.push(`/dashboard/documents/${doc.id}/edit?mode=basic`);
      } else {
        router.push(`/dashboard/documents/${doc.id}/edit`);
      }
    } catch {
      toast.error("Error al crear el documento");
    } finally {
      setCreatingInEditor(false);
    }
  };

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

  const handleNewMenuOpenChange = (open: boolean) => {
    if (!open && skipNewMenuCloseRef.current) {
      skipNewMenuCloseRef.current = false;
      setNewMenuOpen(false);
      return;
    }

    setNewMenuOpen(open);
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

  const handleNewMenuSelection = (callback: () => void) => {
    skipNewMenuCloseRef.current = true;
    setNewMenuOpen(false);
    const nextSearchParams = new URLSearchParams(queryString);
    nextSearchParams.delete("action");
    const nextQuery = nextSearchParams.toString();
    router.replace(`/dashboard/documents${nextQuery ? `?${nextQuery}` : ""}`, {
      scroll: false,
    });
    callback();
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
    return <TrashView />;
  }

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
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Contexto de bandeja de recepción para el lector actual */}
        {submission.isReception && submission.directoryName ? (
          <h2 className="text-lg font-semibold">
            Bandeja de recepción: {submission.directoryName}
          </h2>
        ) : null}
        {/* Estadísticas compactas */}
        {stats && (
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card/50 p-1.5">
            <div className="flex items-center gap-2 rounded-md px-3 py-1.5">
              <div className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground">
                <FileText className="h-4 w-4" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-semibold text-foreground">
                  {stats.totalDocuments}
                </span>
                <span className="text-xs text-muted-foreground">
                  documentos
                </span>
              </div>
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2 rounded-md px-3 py-1.5">
              <div className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground">
                <FolderOpen className="h-4 w-4" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-semibold text-foreground">
                  {stats.totalSizeMB} MB
                </span>
                <span className="text-xs text-muted-foreground">espacio</span>
              </div>
            </div>
          </div>
        )}

        <FolderBrowser enabled={!isUnfilteredView} directoryId={directoryId} onNavigate={(id) => {
              const params = new URLSearchParams(queryString);
              if (id === null) params.delete("directoryId");
              else params.set("directoryId", String(id));
              params.delete("action");
              setDirectoryId(id);
              router.push(`/dashboard/documents${params.size ? `?${params.toString()}` : ""}`);
            }}>
            {/* Lista de documentos */}
            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <CardTitle>{documentViewTitle}</CardTitle>
                      <CardDescription>
                        {filteredDocuments.length} documento(s) encontrado(s)
                        {selectedDocuments.length > 0 && (
                          <span className="ml-2 text-primary">
                            ({selectedDocuments.length} seleccionado
                            {selectedDocuments.length > 1 ? "s" : ""})
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex shrink-0 justify-start sm:justify-end">
                      {/* Botón Nuevo */}
                      <NewDocumentButton
                        onUploadSingle={() =>
                          handleNewMenuSelection(() => openUploadDialog(false))
                        }
                        onUploadMultiple={() =>
                          handleNewMenuSelection(() => openUploadDialog(true))
                        }
                        uploadDisabled={!canUpload}
                        onFromTemplate={() =>
                          handleNewMenuSelection(() =>
                            router.push("/dashboard/templates"),
                          )
                        }
                        onBatchGenerate={() =>
                          handleNewMenuSelection(() =>
                            setShowBatchSelectDialog(true),
                          )
                        }
                        onCreateInEditor={() =>
                          handleNewMenuSelection(() =>
                            setShowCreateInEditorDialog(true),
                          )
                        }
                        open={newMenuOpen}
                        onOpenChange={handleNewMenuOpenChange}
                      />
                    </div>
                  </div>

                  <div className="flex w-full flex-wrap items-center justify-start gap-2 xl:w-auto xl:justify-end">
                    {!isUnfilteredView && (
                      <div className="w-full sm:w-[200px]">
                        <AcademicYearSelector label="Filtrar por año lectivo" />
                      </div>
                    )}
                    {/* Filtro de tipos de documento */}
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
                        className="w-full sm:w-[200px]"
                        aria-label="Filtrar por tipo de documento"
                      >
                        <Filter className="mr-1.5 h-3.5 w-3.5" />
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

                    <div
                      className="flex items-center gap-1 rounded-md border bg-muted p-1"
                      role="group"
                      aria-label="Cambiar vista"
                    >
                      <Button
                        type="button"
                        size="sm"
                        variant={viewMode === "grid" ? "default" : "ghost"}
                        className="h-7 px-2 text-xs focus-visible:ring-2"
                        aria-label="Vista de tarjetas"
                        aria-pressed={viewMode === "grid"}
                        onClick={() => setViewMode("grid")}
                      >
                        <LayoutGrid className="h-3.5 w-3.5" />
                        <span className="sr-only">Tarjetas</span>
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={viewMode === "list" ? "default" : "ghost"}
                        className="h-7 px-2 text-xs focus-visible:ring-2"
                        aria-label="Vista de lista"
                        aria-pressed={viewMode === "list"}
                        onClick={() => setViewMode("list")}
                      >
                        <List className="h-3.5 w-3.5" />
                        <span className="sr-only">Lista</span>
                      </Button>
                    </div>
                    {/* Control segmentado Todos / Mis documentos */}
                    <div className="flex items-center rounded-md border bg-muted p-1 gap-1">
                      <Button
                        size="sm"
                        variant={!onlyMine ? "default" : "ghost"}
                        className="h-7 px-3 text-xs"
                        onClick={() => setOnlyMine(false)}
                      >
                        Todos
                      </Button>
                      <Button
                        size="sm"
                        variant={onlyMine ? "default" : "ghost"}
                        className="h-7 px-3 text-xs gap-1.5"
                        onClick={() => setOnlyMine(true)}
                      >
                        <User className="h-3 w-3" />
                        Mis documentos
                      </Button>
                    </div>
                    {filteredDocuments.length > 0 && (
                      <label
                        onClick={handleSelectAll}
                        className="inline-flex h-8 items-center gap-2 rounded-md border px-2 text-xs hover:bg-accent cursor-pointer"
                      >
                        <Checkbox
                          checked={
                            filteredDocuments.length > 0 &&
                            selectedDocuments.length ===
                              filteredDocuments.length
                          }
                        />
                        {selectedDocuments.length === filteredDocuments.length
                          ? "Deseleccionar todos"
                          : "Seleccionar todos"}
                      </label>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {documentsError ? (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error al cargar documentos</AlertTitle>
                    <AlertDescription className="flex flex-col gap-3">
                      <p>
                        No se pudieron cargar los documentos. Verifica que el
                        servidor esté ejecutándose y que tengas conexión a
                        internet.
                      </p>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => refetchDocuments()}
                          variant="outline"
                          size="sm"
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Reintentar
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                ) : loadingDocuments || fetchingDocuments ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
                    <p className="text-muted-foreground mt-4">
                      Cargando documentos...
                    </p>
                  </div>
                ) : filteredDocuments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No hay documentos</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Comienza subiendo tu primer documento
                    </p>
                  </div>
                ) : viewMode === "grid" ? (
                  <ul
                    aria-label="Documentos"
                    className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5"
                  >
                    {filteredDocuments.map((doc) => (
                      <DocumentCard
                        key={doc.id}
                        doc={doc}
                        isSelected={selectedDocuments.some(
                          (d) => d.id === doc.id,
                        )}
                        onToggle={handleToggleDocument}
                        thumbnailUrl={thumbnailUrls[doc.id]?.url}
                        onPreview={handlePreview}
                        onDownload={handleDownload}
                        onShowVersionHistory={handleShowVersionHistory}
                        onEdit={handleEdit}
                        onReplaceFile={handleShowReplaceFile}
                        onDelete={handleDelete}
                        canDelete={false}
                        isOwn={doc.uploadedById === user?.id}
                        actorId={user?.id ?? null}
                        isDeleting={deleteMutation.isPending}
                        onMove={handleMove}
                      />
                    ))}
                  </ul>
                ) : (
                  <div className="space-y-4">
                    {filteredDocuments.map((doc, index) => (
                      <DocumentListItem
                        key={doc.id}
                        doc={doc}
                        index={index}
                        isSelected={selectedDocuments.some(
                          (d) => d.id === doc.id,
                        )}
                        onToggle={handleToggleDocument}
                        thumbnailUrl={thumbnailUrls[doc.id]?.url}
                        onPreview={handlePreview}
                        onDownload={handleDownload}
                        onShowVersionHistory={handleShowVersionHistory}
                        onEdit={handleEdit}
                        onReplaceFile={handleShowReplaceFile}
                        onDelete={handleDelete}
                        canDelete={false}
                        isOwn={doc.uploadedById === user?.id}
                        actorId={user?.id ?? null}
                        isDeleting={deleteMutation.isPending}
                        onMove={handleMove}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            </FolderBrowser>

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

        {/* Dialog para seleccionar plantilla en modo lote */}
        <SelectTemplateDialog
          open={showBatchSelectDialog}
          onOpenChange={setShowBatchSelectDialog}
          mode="batch"
        />

        {/* Create in editor dialog */}
        <Dialog
          open={showCreateInEditorDialog}
          onOpenChange={setShowCreateInEditorDialog}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear en Editor</DialogTitle>
              <DialogDescription>
                Se creará un documento en blanco y se abrirá en el editor
                correspondiente.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Nombre del documento
                </label>
                <Input
                  placeholder="Ej. Notas de reunión"
                  value={createInEditorData.title}
                  onChange={(e) =>
                    setCreateInEditorData((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => e.key === "Enter" && handleCreateInEditor()}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Tipo de archivo</label>
                <Select
                  value={createInEditorData.fileType}
                  onValueChange={(v) =>
                    setCreateInEditorData((prev) => ({
                      ...prev,
                      fileType: v as "docx" | "xlsx" | "pptx" | "txt" | "md",
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="docx">Documento Word (.docx)</SelectItem>
                    <SelectItem value="xlsx">
                      Hoja de cálculo (.xlsx)
                    </SelectItem>
                    <SelectItem value="pptx">Presentación (.pptx)</SelectItem>
                    <SelectItem value="txt">
                      Documento de texto (.txt)
                    </SelectItem>
                    <SelectItem value="md">Markdown (.md)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">
                  Categoría (opcional)
                </label>
                <Select
                  value={createInEditorData.categoryId?.toString() ?? "none"}
                  onValueChange={(v) =>
                    setCreateInEditorData((prev) => ({
                      ...prev,
                      categoryId: v === "none" ? undefined : parseInt(v),
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sin categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin categoría</SelectItem>
                    {!loadingCategories &&
                      categories?.map((cat: { id: number; name: string }) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowCreateInEditorDialog(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateInEditor}
                disabled={creatingInEditor || !createInEditorData.title.trim()}
              >
                {creatingInEditor ? "Creando..." : "Crear y Abrir"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
