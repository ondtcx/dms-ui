// src/app/dashboard/documents/page.tsx
"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
import { usePermissions } from "@/hooks/use-permissions";
import { useDocumentThumbnails } from "@/hooks/use-document-thumbnails";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { categoriesService } from "@/lib/services/categories.service";
import { documentTypesService } from "@/lib/services/document-types.service";
import { documentsService } from "@/lib/services/documents.service";
import { sectionsService } from "@/lib/services/sections.service";
import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import {
  FileText,
  Download,
  User,
  FolderOpen,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Document, DocumentModalityFilter, PilotDocumentStatus } from "@/lib/types";
import { DocumentListItem } from "@/components/documents/DocumentListItem";
import { DocumentsToolbar } from "@/components/documents/DocumentsToolbar";
import {
  UploadDocumentDialog,
  UploadMultipleDocumentsDialog,
} from "@/components/documents/UploadDocumentDialogs";
import { DocumentVersionHistory } from "@/components/documents/DocumentVersionHistory";
import { ReplaceFileDialog } from "@/components/documents/ReplaceFileDialog";
import { EditDocumentDialog } from "@/components/documents/EditDocumentDialog";
import { useAcademicYearStore } from "@/components/structure/AcademicYearSelector";

// Shadcn imports
import { Button } from "@/components/ui/button";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// Helper para obtener el componente de icono desde el string

export default function DocumentsPage() {
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
  const { currentYearId } = useAcademicYearStore();
  const queryClient = useQueryClient();

  // Estados
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>(
    undefined,
  );
  const [documentTypeFilter, setDocumentTypeFilter] = useState<number | undefined>(
    undefined,
  );
  const [sectionFilter, setSectionFilter] = useState<number | undefined>(
    undefined,
  );
  const [statusFilter, setStatusFilter] = useState<PilotDocumentStatus | undefined>(
    undefined,
  );
  const [modalityFilter, setModalityFilter] = useState<DocumentModalityFilter | undefined>(
    undefined,
  );
  const [dateFrom, setDateFrom] = useState<string | undefined>(undefined);
  const [dateTo, setDateTo] = useState<string | undefined>(undefined);
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
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Queries
  const {
    data: documents,
    isLoading: loadingDocuments,
    error: documentsError,
    refetch: refetchDocuments,
  } = useQuery({
    queryKey: [
      "documents",
      searchTerm,
      categoryFilter,
      documentTypeFilter,
      sectionFilter,
      statusFilter,
      modalityFilter,
      dateFrom,
      dateTo,
      onlyMine,
      currentYearId,
    ],
    queryFn: () =>
      documentsService.getAll({
        search: searchTerm || undefined,
        categoryId: categoryFilter,
        documentTypeId: documentTypeFilter,
        sectionId: sectionFilter,
        status: statusFilter,
        modality: modalityFilter,
        dateFrom,
        dateTo,
        onlyMine: onlyMine || undefined,
        academicYearId: currentYearId ?? undefined,
        excludeBatched: true,
        page: 1,
        limit: 50,
      }),
  });

  const { thumbnailUrls } = useDocumentThumbnails(documents?.data);

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: () => documentsService.getStats(),
  });

  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ["categories", "active"],
    queryFn: () => categoriesService.getActive(),
  });

  const { data: sectionStats, isLoading: loadingSections } = useQuery({
    queryKey: ["section-stats"],
    queryFn: () => sectionsService.getStats(),
  });

  const { data: documentTypes, isLoading: loadingDocumentTypes } = useQuery({
    queryKey: ["document-types", "active", categoryFilter],
    queryFn: () => documentTypesService.getActive(categoryFilter),
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: documentsService.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast.success("Documento eliminado exitosamente");
    },
    onError: () => {
      toast.error("Error al eliminar documento");
    },
  });

  // Handlers
  const handleUploadSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["documents"] });
    queryClient.invalidateQueries({ queryKey: ["stats"] });
    queryClient.invalidateQueries({ queryKey: ["categories"] });
  };

  const handleSearchChange = useCallback((value: string) => {
    setSearchTerm((current) => (current === value ? current : value));
  }, []);

  const handleDownload = async (id: number, filename: string) => {
    try {
      const blob = await documentsService.download(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Descarga iniciada");
    } catch {
      toast.error("Error al descargar archivo");
    }
  };

  const handleDelete = (id: number) => {
    setDeleteConfirmId(id);
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
    setReplaceFileDocument(doc);
    setShowReplaceFile(true);
  };

  const filteredDocuments = documents?.data ?? [];

  return (
    <div className="bg-background">
      <div className="mx-auto max-w-7xl space-y-6">
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

        {/* Barra de acciones */}
        <Card>
          <CardContent>
            <DocumentsToolbar
              initialSearch={searchTerm}
                categoryFilter={categoryFilter}
                documentTypeFilter={documentTypeFilter}
                sectionFilter={sectionFilter}
                statusFilter={statusFilter}
                modalityFilter={modalityFilter}
                dateFrom={dateFrom}
                dateTo={dateTo}
                categories={categories}
                documentTypes={documentTypes}
                sections={sectionStats}
                loadingCategories={loadingCategories}
                loadingDocumentTypes={loadingDocumentTypes}
                loadingSections={loadingSections}
                onSearchChange={handleSearchChange}
                onCategoryChange={setCategoryFilter}
                onDocumentTypeChange={setDocumentTypeFilter}
                onSectionChange={setSectionFilter}
                onStatusChange={setStatusFilter}
                onModalityChange={setModalityFilter}
                onDateFromChange={setDateFrom}
                onDateToChange={setDateTo}
                onUploadSingle={() => setShowUploadModal(true)}
                onUploadMultiple={() => setShowUploadMultipleModal(true)}
              />
          </CardContent>
        </Card>

        <div className="mt-4">
        {/* Lista de documentos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Archivo y consulta</CardTitle>
                <CardDescription>
                  {filteredDocuments.length} documento(s) encontrado(s)
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
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
                    servidor esté ejecutándose y que tengas conexión a internet.
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
            ) : loadingDocuments ? (
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
            ) : (
              <div className="space-y-4">
                {filteredDocuments.map((doc, index) => (
                  <DocumentListItem
                    key={doc.id}
                    doc={doc}
                    index={index}
                    thumbnailUrl={thumbnailUrls[doc.id]?.url}
                    onPreview={handlePreview}
                    onDownload={handleDownload}
                    onShowVersionHistory={handleShowVersionHistory}
                    onEdit={(d) => { setEditingDocument(d); setShowEditDialog(true); }}
                    onReplaceFile={handleShowReplaceFile}
                    onDelete={handleDelete}
                    canDelete={isAdmin() || doc.uploadedById === String(user?.id)}
                    isOwn={doc.uploadedById === user?.id}
                    isDeleting={deleteMutation.isPending}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        </div>

        <UploadDocumentDialog
          open={showUploadModal}
          onOpenChange={setShowUploadModal}
          userRole={user?.role}
          onSuccess={handleUploadSuccess}
        />

        {/* Modal de vista previa de documento */}
        <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
          <DialogContent className="sm:max-w-[90vw] sm:max-h-[90vh] h-[90vh]">
            <DialogHeader>
              <DialogTitle>
                Vista Previa: {((previewDocument?.versions?.[0]?.filename) ?? '')}
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
                  title={((previewDocument?.versions?.[0]?.filename) ?? '')}
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
                    handleDownload(previewDocument.id, ((previewDocument?.versions?.[0]?.filename) ?? ''))
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
        {replaceFileDocument && (
          <ReplaceFileDialog
            documentId={replaceFileDocument.id}
            documentName={replaceFileDocument.versions?.[0]?.filename ?? ''}
            open={showReplaceFile}
            onOpenChange={setShowReplaceFile}
          />
        )}

        {/* Modal de editar documento */}
        {editingDocument && (
          <EditDocumentDialog
            document={editingDocument}
            open={showEditDialog}
            onOpenChange={setShowEditDialog}
          />
        )}

        <UploadMultipleDocumentsDialog
          open={showUploadMultipleModal}
          onOpenChange={setShowUploadMultipleModal}
          userRole={user?.role}
          onSuccess={handleUploadSuccess}
        />

        <ConfirmDialog
          open={deleteConfirmId !== null}
          onOpenChange={(open) => !open && setDeleteConfirmId(null)}
          title="Eliminar documento"
          description="¿Estás seguro de eliminar este documento? Será enviado a la papelera."
          confirmLabel="Eliminar"
          variant="destructive"
          loading={deleteMutation.isPending}
          onConfirm={() => {
            if (deleteConfirmId !== null) deleteMutation.mutate(deleteConfirmId);
            setDeleteConfirmId(null);
          }}
        />
      </div>
    </div>
  );
}
