// src/app/dashboard/documents/page.tsx
"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
import { usePermissions } from "@/hooks/use-permissions";
import { useUploadMetadata } from "@/hooks/use-upload-metadata";
import { useDocumentThumbnails } from "@/hooks/use-document-thumbnails";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsService } from "@/lib/services/documents.service";
import { onlyofficeService } from "@/lib/services/onlyoffice.service";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  FileText,
  Download,
  Upload,
  Search,
  Filter,
  User,
  FolderOpen,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Document, UploadMetadata, EMPTY_UPLOAD_METADATA } from "@/lib/types";
import { formatFileSize } from "@/lib/utils";
import { NewDocumentButton } from "@/components/documents/NewDocumentButton";
import { DocumentListItem } from "@/components/documents/DocumentListItem";
import { DocumentMetadataForm } from "@/components/documents/DocumentMetadataForm";
import { useRouter } from "next/navigation";
import { DocumentVersionHistory } from "@/components/documents/DocumentVersionHistory";
import { ReplaceFileDialog } from "@/components/documents/ReplaceFileDialog";
import { EditDocumentDialog } from "@/components/documents/EditDocumentDialog";
import { BatchActionsBar } from "@/components/documents/batch-actions-bar";
import { BatchListSection } from "@/components/documents/BatchListSection";
import { SelectTemplateDialog } from "@/components/documents/SelectTemplateDialog";
import { useAcademicYearStore } from "@/components/structure/AcademicYearSelector";
import { Layers } from "lucide-react";
import { DirectoryNavigation } from "@/components/documents/DirectoryNavigation";
import { DirectoryVisitRecorder } from "@/components/documents/DirectoryVisitRecorder";
import { invalidateDirectoryQueries } from "@/lib/directory-cache";

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

// Helper para obtener el componente de icono desde el string

export default function DocumentsPage() {
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
  const { currentYearId } = useAcademicYearStore();
  const queryClient = useQueryClient();
  const router = useRouter();

  // Estados
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>(
    undefined,
  );
  const [onlyMine, setOnlyMine] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUploadMultipleModal, setShowUploadMultipleModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [uploadData, setUploadData] = useState<UploadMetadata>(EMPTY_UPLOAD_METADATA);

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

  // Tab principal: documentos individuales vs lotes
  const [mainTab, setMainTab] = useState<'documents' | 'batches'>('documents');
  const [showBatchSelectDialog, setShowBatchSelectDialog] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Create in editor dialog state
  const [showCreateInEditorDialog, setShowCreateInEditorDialog] = useState(false);
  const [createInEditorData, setCreateInEditorData] = useState<{
    title: string;
    fileType: "docx" | "xlsx" | "pptx" | "txt" | "md";
    categoryId?: number;
    documentTypeId?: number;
  }>({ title: "", fileType: "docx" });
  const [creatingInEditor, setCreatingInEditor] = useState(false);
  const [directoryId, setDirectoryId] = useState<number | null>(null);
  const [movingDocument, setMovingDocument] = useState<Document | null>(null);
  const [moveDestination, setMoveDestination] = useState<number | null>(null);

  useEffect(() => {
    const value = new URLSearchParams(window.location.search).get("directoryId");
    setDirectoryId(value ? Number(value) : null);
  }, []);

  // Queries
  const {
    data: documents,
    isLoading: loadingDocuments,
    error: documentsError,
    refetch: refetchDocuments,
  } = useQuery({
    queryKey: ["documents", searchTerm, categoryFilter, onlyMine, currentYearId, directoryId],
    queryFn: () =>
      documentsService.getAll({
        search: searchTerm || undefined,
        categoryId: categoryFilter,
        onlyMine: onlyMine || undefined,
        academicYearId: currentYearId ?? undefined,
        directoryId,
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

  const {
    categories,
    loadingCategories,
    academicYears,
    uploadDocumentTypes,
    selectedCategory,
  } = useUploadMetadata({
    categoryId: uploadData.categoryId,
  });

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: documentsService.delete,
    onSuccess: () => {
       invalidateDirectoryQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast.success("Documento eliminado exitosamente");
    },
    onError: () => {
      toast.error("Error al eliminar documento");
    },
  });

  // Handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleCreateInEditor = async () => {
    if (!createInEditorData.title.trim()) {
      toast.error("Ingresa un nombre para el documento");
      return;
    }
    setCreatingInEditor(true);
    try {
      const doc = await onlyofficeService.createBlank(createInEditorData);
      setShowCreateInEditorDialog(false);
      setCreateInEditorData({ title: "", fileType: "docx" });
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

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error("Selecciona un archivo");
      return;
    }

    setUploading(true);
    try {
      await documentsService.upload(selectedFile, uploadData);
      toast.success("Archivo subido exitosamente");
      setSelectedFile(null);
      setUploadData({
        categoryId: undefined,
        courseId: undefined,
        subjectId: undefined,
        academicYearId: undefined,
        documentTypeId: undefined,
        description: "",
        isPublic: false,
      });
      setShowUploadModal(false);
      invalidateDirectoryQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message || "Error al subir archivo";
      toast.error(message);
    } finally {
      setUploading(false);
    }
  };

  const handleUploadMultiple = async () => {
    if (selectedFiles.length === 0) {
      toast.error("Selecciona al menos un archivo");
      return;
    }

    setUploading(true);
    try {
      await documentsService.uploadMultiple(selectedFiles, uploadData);
      toast.success(
        `${selectedFiles.length} archivo(s) subido(s) exitosamente`,
      );
      setSelectedFiles([]);
      setUploadData({
        categoryId: undefined,
        courseId: undefined,
        subjectId: undefined,
        academicYearId: undefined,
        documentTypeId: undefined,
        description: "",
        isPublic: false,
      });
      setShowUploadMultipleModal(false);
      invalidateDirectoryQueries(queryClient);
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    } catch (error) {
      const message =
        (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message || "Error al subir archivos";
      toast.error(message);
    } finally {
      setUploading(false);
    }
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
    setDeleteConfirmId(id);
  };

  const moveMutation = useMutation({
    mutationFn: () => documentsService.moveToDirectory(movingDocument!.id, moveDestination),
    onSuccess: () => {
       invalidateDirectoryQueries(queryClient);
      setMovingDocument(null);
      toast.success("Documento movido exitosamente");
    },
    onError: () => toast.error("No se pudo mover el documento"),
  });

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
    setReplaceFileDocument(doc);
    setShowReplaceFile(true);
  };

  const filteredDocuments = documents?.data ?? [];

  return (
    <div className="bg-background">
      <DirectoryVisitRecorder
        directoryId={directoryId}
        navigationSucceeded={directoryId !== null && !loadingDocuments && !documentsError && documents !== undefined}
      />
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
          <CardContent className="pt-6">
            <DirectoryNavigation value={directoryId} onChange={setDirectoryId} />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              {/* Búsqueda y Filtros */}
              <div className="flex-1 flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar documentos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && searchTerm.trim()) {
                        router.push(`/dashboard/search?q=${encodeURIComponent(searchTerm.trim())}`);
                      }
                    }}
                    className="pl-10"
                  />
                </div>

                {/* Filtro de categorías */}
                <Select
                  value={categoryFilter?.toString() || "all"}
                  onValueChange={(value) =>
                    setCategoryFilter(value === "all" ? undefined : parseInt(value))
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <Filter className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {!loadingCategories &&
                      categories
                        ?.filter((cat) => cat.isActive)
                        .map((cat) => (
                          <SelectItem key={cat.id} value={cat.id.toString()}>
                            {cat.name}
                          </SelectItem>
                        ))}
                  </SelectContent>
                </Select>

              </div>

              {/* Botón Nuevo */}
               <NewDocumentButton
                 onUploadSingle={() => { setUploadData((previous) => ({ ...previous, directoryId })); setShowUploadModal(true); }}
                 onUploadMultiple={() => { setUploadData((previous) => ({ ...previous, directoryId })); setShowUploadMultipleModal(true); }}
                onFromTemplate={() => router.push("/dashboard/templates")}
                onBatchGenerate={() => setShowBatchSelectDialog(true)}
                onCreateInEditor={() => setShowCreateInEditorDialog(true)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabs: Documentos / Lotes */}
        <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as 'documents' | 'batches')}>
          <TabsList>
            <TabsTrigger value="documents">
              <FileText className="mr-2 h-4 w-4" />
              Documentos
            </TabsTrigger>
            <TabsTrigger value="batches">
              <Layers className="mr-2 h-4 w-4" />
              Lotes
            </TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="mt-4">
        {/* Lista de documentos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Documentos</CardTitle>
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
              {filteredDocuments.length > 0 && (
                <label
                  onClick={handleSelectAll}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md hover:bg-accent cursor-pointer"
                >
                  <Checkbox
                    checked={filteredDocuments.length > 0 && selectedDocuments.length === filteredDocuments.length}
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
                    isSelected={selectedDocuments.some((d) => d.id === doc.id)}
                    onToggle={handleToggleDocument}
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
                     onMove={(document) => { setMovingDocument(document); setMoveDestination(document.directoryId ?? null); }}
                   />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="batches" className="mt-4">
            <BatchListSection />
          </TabsContent>
        </Tabs>

        {/* Modal de subir documento */}
        <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Subir Documento</DialogTitle>
              <DialogDescription>
                Completa la información del documento que deseas subir
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Seleccionar archivo */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Archivo *</label>
                <Input
                  type="file"
                  onChange={handleFileChange}
                  className="cursor-pointer"
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground">
                    Archivo seleccionado: {selectedFile.name} (
                    {formatFileSize(selectedFile.size)})
                  </p>
                )}
              </div>

               <DocumentMetadataForm
                value={uploadData}
                onChange={setUploadData}
                categories={categories}
                loadingCategories={loadingCategories}
                selectedCategory={selectedCategory}
                academicYears={academicYears}
                showAcademicYear={true}
                uploadDocumentTypes={uploadDocumentTypes}
                showDocumentType={true}
                userRole={user?.role}
                descriptionLabel="Descripción"
                visibilityLabel="Hacer público (visible para todos los usuarios)"
                 isPublicCheckboxId="isPublic"
               />
               <DirectoryNavigation
                 value={uploadData.directoryId ?? null}
                 onChange={(value) => setUploadData((previous) => ({ ...previous, directoryId: value }))}
                 picker
               />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowUploadModal(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUpload}
                disabled={uploading || !selectedFile}
              >
                {uploading ? "Subiendo..." : "Subir Documento"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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

        {/* Modal de subir múltiples documentos */}
        <Dialog
          open={showUploadMultipleModal}
          onOpenChange={setShowUploadMultipleModal}
        >
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Subir Múltiples Documentos</DialogTitle>
              <DialogDescription>
                Selecciona varios archivos para subir al mismo tiempo
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Seleccionar archivos múltiples */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Archivos *</label>
                <Input
                  type="file"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setSelectedFiles(files);
                  }}
                  className="cursor-pointer"
                />
                {selectedFiles.length > 0 && (
                  <div className="space-y-1 mt-2">
                    <p className="text-sm font-medium">
                      {selectedFiles.length} archivo(s) seleccionado(s):
                    </p>
                    {selectedFiles.map((file, idx) => (
                      <p key={idx} className="text-sm text-muted-foreground">
                        • {file.name} ({formatFileSize(file.size)})
                      </p>
                    ))}
                  </div>
                )}
              </div>

               <DocumentMetadataForm
                value={uploadData}
                onChange={setUploadData}
                categories={categories}
                loadingCategories={loadingCategories}
                selectedCategory={selectedCategory}
                academicYears={academicYears}
                showAcademicYear={true}
                uploadDocumentTypes={uploadDocumentTypes}
                showDocumentType={true}
                userRole={user?.role}
                descriptionLabel="Descripción (opcional)"
                visibilityLabel="Hacer públicos (visible para todos los usuarios)"
                 isPublicCheckboxId="isPublicMultiple"
               />
               <DirectoryNavigation
                 value={uploadData.directoryId ?? null}
                 onChange={(value) => setUploadData((previous) => ({ ...previous, directoryId: value }))}
                 picker
               />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowUploadMultipleModal(false);
                  setSelectedFiles([]);
                  setUploadData({
                    categoryId: undefined,
                    courseId: undefined,
                    subjectId: undefined,
                    academicYearId: undefined,
                    documentTypeId: undefined,
                    description: "",
                    isPublic: false,
                  });
                }}
                disabled={uploading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleUploadMultiple}
                disabled={uploading || selectedFiles.length === 0}
              >
                {uploading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Subiendo...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Subir {selectedFiles.length} archivo(s)
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Batch Actions Bar */}
        <BatchActionsBar
          selectedDocuments={selectedDocuments}
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
        <Dialog open={showCreateInEditorDialog} onOpenChange={setShowCreateInEditorDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear en Editor</DialogTitle>
              <DialogDescription>
                Se creará un documento en blanco y se abrirá en el editor correspondiente.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <label className="text-sm font-medium">Nombre del documento</label>
                <Input
                  placeholder="Ej. Notas de reunión"
                  value={createInEditorData.title}
                  onChange={(e) =>
                    setCreateInEditorData((prev) => ({ ...prev, title: e.target.value }))
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
                    <SelectItem value="xlsx">Hoja de cálculo (.xlsx)</SelectItem>
                    <SelectItem value="pptx">Presentación (.pptx)</SelectItem>
                    <SelectItem value="txt">Documento de texto (.txt)</SelectItem>
                    <SelectItem value="md">Markdown (.md)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Categoría (opcional)</label>
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
              <Button variant="outline" onClick={() => setShowCreateInEditorDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateInEditor} disabled={creatingInEditor || !createInEditorData.title.trim()}>
                {creatingInEditor ? "Creando..." : "Crear y Abrir"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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

        <Dialog open={movingDocument !== null} onOpenChange={(open) => !open && setMovingDocument(null)}>
          <DialogContent className="sm:max-w-[700px]">
            <DialogHeader>
              <DialogTitle>Mover documento</DialogTitle>
              <DialogDescription>Selecciona el directorio de destino.</DialogDescription>
            </DialogHeader>
            <DirectoryNavigation value={moveDestination} onChange={setMoveDestination} picker />
            <DialogFooter>
              <Button variant="outline" onClick={() => setMovingDocument(null)}>Cancelar</Button>
              <Button onClick={() => moveMutation.mutate()} disabled={moveMutation.isPending}>Mover aquí</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
