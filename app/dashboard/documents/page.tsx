// src/app/dashboard/documents/page.tsx
"use client";

import { formatMimeType } from "@/lib/utils";
import Link from "next/link";
import { useAuth } from "@/lib/contexts/AuthContext";
import { usePermissions } from "@/hooks/use-permissions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsService } from "@/lib/services/documents.service";
import { categoriesService } from "@/lib/services/categories.service";
import { sectionsService } from "@/lib/services/sections.service";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  FileText,
  Download,
  Trash2,
  Upload,
  Search,
  Filter,
  Lock,
  Unlock,
  Calendar,
  User,
  FolderOpen,
  FileType,
  Eye,
  AlertCircle,
  RefreshCw,
  History,
  FileUp,
  Pencil,
  MoreVertical,
  FileImage,
  FileSpreadsheet,
  FileCode,
  File,
} from "lucide-react";
import { Document } from "@/lib/types";
import { NewDocumentButton } from "@/components/documents/NewDocumentButton";
import { useRouter } from "next/navigation";
import { DocumentVersionHistory } from "@/components/documents/DocumentVersionHistory";
import { ReplaceFileDialog } from "@/components/documents/ReplaceFileDialog";
import { EditDocumentDialog } from "@/components/documents/EditDocumentDialog";
import { BatchActionsBar } from "@/components/documents/batch-actions-bar";

// Shadcn imports
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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

import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Helper para obtener el componente de icono desde el string

export default function DocumentsPage() {
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
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
  const [sectionFilter, setSectionFilter] = useState<number | undefined>(
    undefined,
  );
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showUploadMultipleModal, setShowUploadMultipleModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [uploadData, setUploadData] = useState({
    categoryId: undefined as number | undefined,
    sectionId: undefined as number | undefined,
    description: "",
    isPublic: false,
  });

  // Estados para version history y replace file
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [versionHistoryDocument, setVersionHistoryDocument] =
    useState<Document | null>(null);
  const [showReplaceFile, setShowReplaceFile] = useState(false);
  const [replaceFileDocument, setReplaceFileDocument] =
    useState<Document | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [thumbnailUrls, setThumbnailUrls] = useState<Record<number, string>>(
    {},
  );

  // Estados para batch actions
  const [selectedDocuments, setSelectedDocuments] = useState<Document[]>([]);

  // Queries
  const {
    data: documents,
    isLoading: loadingDocuments,
    error: documentsError,
    refetch: refetchDocuments,
  } = useQuery({
    queryKey: ["documents", searchTerm, categoryFilter, sectionFilter],
    queryFn: () =>
      documentsService.getAll({
        search: searchTerm || undefined,
        categoryId: categoryFilter,
        sectionId: sectionFilter,
        page: 1,
        limit: 50,
      }),
  });

  const { data: stats } = useQuery({
    queryKey: ["stats"],
    queryFn: () => documentsService.getStats(),
  });

  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesService.getAll(),
  });

  const { data: sectionStats, isLoading: loadingSections } = useQuery({
    queryKey: ["section-stats"],
    queryFn: () => sectionsService.getStats(),
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
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
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
        sectionId: undefined,
        description: "",
        isPublic: false,
      });
      setShowUploadModal(false);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
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
        sectionId: undefined,
        description: "",
        isPublic: false,
      });
      setShowUploadMultipleModal(false);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
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
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Descarga iniciada");
    } catch {
      toast.error("Error al descargar archivo");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Estás seguro de eliminar este documento?")) return;
    deleteMutation.mutate(id);
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
    if (selectedDocuments.length === documents?.data.length) {
      setSelectedDocuments([]);
    } else {
      setSelectedDocuments(documents?.data || []);
    }
  };

  const handleClearSelection = () => {
    setSelectedDocuments([]);
  };

  const handleBatchSuccess = () => {
    setSelectedDocuments([]);
    queryClient.invalidateQueries({ queryKey: ["documents"] });
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

  // Cargar thumbnails para documentos que lo soporten
  useEffect(() => {
    const loadThumbnails = async () => {
      if (!documents?.data) return;

      for (const doc of documents.data) {
        // Solo para PDFs e imágenes
        if (
          doc.mimetype.startsWith("image/") ||
          doc.mimetype === "application/pdf"
        ) {
          // Si ya tenemos el thumbnail, no volver a cargarlo
          if (thumbnailUrls[doc.id]) continue;

          try {
            const blob = await documentsService.getThumbnail(doc.id);
            const url = window.URL.createObjectURL(blob);
            setThumbnailUrls((prev) => ({ ...prev, [doc.id]: url }));
          } catch {
            // Si falla, no hacer nada (se mostrará el icono)
            console.log(`No se pudo cargar thumbnail para documento ${doc.id}`);
          }
        }
      }
    };

    loadThumbnails();

    // Cleanup: revocar URLs cuando se desmonte o cambien los documentos
    return () => {
      Object.values(thumbnailUrls).forEach((url) => {
        window.URL.revokeObjectURL(url);
      });
    };
  }, [documents?.data]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const canDelete = (doc: Document): boolean => {
    return isAdmin() || doc.uploadedById === String(user?.id);
  };

  const getFileIcon = (mimetype: string, hasTemplate: boolean) => {
    if (hasTemplate) return FileType;

    if (mimetype.startsWith("image/")) return FileImage;
    if (mimetype.includes("pdf")) return FileText;
    if (mimetype.includes("spreadsheet") || mimetype.includes("excel"))
      return FileSpreadsheet;
    if (
      mimetype.includes("json") ||
      mimetype.includes("xml") ||
      mimetype.includes("code")
    )
      return FileCode;
    return File;
  };

  const getFilePreviewContent = (doc: Document): string => {
    // Si tiene descripción, mostrarla
    if (doc.description) {
      const desc =
        doc.description.length > 150
          ? doc.description.substring(0, 150) + "..."
          : doc.description;
      return desc;
    }

    // Si es un documento generado desde plantilla
    if (doc.template) {
      return `Documento generado desde plantilla "${doc.template.name}" • Tipo: ${doc.template.type}`;
    }

    // Información basada en el tipo de archivo
    const fileType = formatMimeType(doc.mimetype);
    const uploadInfo = `Subido por ${doc.uploadedBy.name} el ${formatDate(doc.createdAt)}`;

    return `Archivo ${fileType} • ${uploadInfo}`;
  };

  const handleShowVersionHistory = (doc: Document) => {
    setVersionHistoryDocument(doc);
    setShowVersionHistory(true);
  };

  const handleShowReplaceFile = (doc: Document) => {
    setReplaceFileDocument(doc);
    setShowReplaceFile(true);
  };

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
            <div className="flex flex-col md:flex-row gap-4">
              {/* Búsqueda y Filtros */}
              <div className="flex-1 flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Buscar documentos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Filtro de categorías */}
                <Select
                  value={categoryFilter?.toString() || "all"}
                  onValueChange={(value) =>
                    setCategoryFilter(
                      value === "all" ? undefined : parseInt(value),
                    )
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

                {/* Filtro de secciones */}
                <Select
                  value={sectionFilter?.toString() || "all"}
                  onValueChange={(value) =>
                    setSectionFilter(
                      value === "all" ? undefined : parseInt(value),
                    )
                  }
                >
                  <SelectTrigger className="w-[180px]">
                    <FolderOpen className="mr-2 h-4 w-4" />
                    <SelectValue placeholder="Sección" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {!loadingSections &&
                      sectionStats?.map((section) => (
                        <SelectItem
                          key={section.id}
                          value={section.id.toString()}
                        >
                          {section.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Botón Nuevo */}
              <NewDocumentButton
                onUploadSingle={() => setShowUploadModal(true)}
                onUploadMultiple={() => setShowUploadMultipleModal(true)}
                onFromTemplate={() => router.push("/dashboard/templates")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Lista de documentos */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>
                  {isAdmin() ? "Todos los Documentos" : "Mis Documentos"}
                </CardTitle>
                <CardDescription>
                  {documents?.data.length || 0} documento(s) encontrado(s)
                  {selectedDocuments.length > 0 && (
                    <span className="ml-2 text-primary">
                      ({selectedDocuments.length} seleccionado
                      {selectedDocuments.length > 1 ? "s" : ""})
                    </span>
                  )}
                </CardDescription>
              </div>
              {documents && documents.data.length > 0 && (
                <label
                  onClick={handleSelectAll}
                  className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md hover:bg-accent cursor-pointer"
                >
                  <Checkbox
                    checked={selectedDocuments.length === documents.data.length}
                  />
                  {selectedDocuments.length === documents.data.length
                    ? "Deseleccionar todos"
                    : "Seleccionar todos"}
                </label>
              )}
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
            ) : documents?.data.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <FileText className="h-16 w-16 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No hay documentos</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Comienza subiendo tu primer documento
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {documents?.data.map((doc, index) => {
                  const FileIcon = getFileIcon(doc.mimetype, !!doc.template);
                  const previewContent = getFilePreviewContent(doc);

                  return (
                    <div key={doc.id}>
                      {index > 0 && <Separator />}
                      <div className="py-4 flex gap-4">
                        {/* Checkbox para batch selection */}
                        <div className="flex items-start pt-1">
                          <Checkbox
                            checked={selectedDocuments.some(
                              (d) => d.id === doc.id,
                            )}
                            onCheckedChange={() => handleToggleDocument(doc)}
                          />
                        </div>

                        {/* Preview Thumbnail */}
                        <div className="flex-shrink-0">
                          <div className="w-20 h-20 rounded-lg border-2 border-border bg-muted flex items-center justify-center overflow-hidden relative">
                            {thumbnailUrls[doc.id] ? (
                              <img
                                src={thumbnailUrls[doc.id]}
                                alt={doc.filename}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <FileIcon className="h-10 w-10 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        {/* Contenido Principal */}
                        <div className="flex-1 min-w-0">
                          {/* Header con título y acciones */}
                          <div className="flex items-start justify-between gap-4 mb-2">
                            <h3 className="font-medium text-lg leading-tight">
                              <Link href={`/dashboard/documents/${doc.id}`} className="hover:underline">
                                {doc.filename}
                              </Link>
                            </h3>
                            {/* Botones de acción compactos */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Button
                                onClick={() => handlePreview(doc)}
                                variant="outline"
                                size="sm"
                              >
                                <Eye className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">Ver</span>
                              </Button>

                              <Button
                                onClick={() =>
                                  handleDownload(doc.id, doc.filename)
                                }
                                variant="default"
                                size="sm"
                              >
                                <Download className="h-4 w-4 sm:mr-2" />
                                <span className="hidden sm:inline">
                                  Descargar
                                </span>
                              </Button>

                              {/* Menú de más opciones */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                  align="end"
                                  className="w-48"
                                >
                                  <DropdownMenuItem
                                    onClick={() =>
                                      handleShowVersionHistory(doc)
                                    }
                                  >
                                    <History className="mr-2 h-4 w-4" />
                                    Ver Versiones
                                  </DropdownMenuItem>

                                  {canDelete(doc) && (
                                    <>
                                      <DropdownMenuItem
                                        onClick={() => {
                                          setEditingDocument(doc);
                                          setShowEditDialog(true);
                                        }}
                                      >
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Editar Info
                                      </DropdownMenuItem>

                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleShowReplaceFile(doc)
                                        }
                                      >
                                        <FileUp className="mr-2 h-4 w-4" />
                                        Reemplazar Archivo
                                      </DropdownMenuItem>

                                      <DropdownMenuSeparator />

                                      <DropdownMenuItem
                                        onClick={() => handleDelete(doc.id)}
                                        className="text-destructive focus:text-destructive"
                                        disabled={deleteMutation.isPending}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Eliminar
                                      </DropdownMenuItem>
                                    </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          {/* Badges y metadata */}
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            {doc.section && (
                              <Badge
                                variant="outline"
                                className="gap-1"
                                style={{ borderColor: doc.section.color }}
                              >
                                <FolderOpen
                                  className="h-3 w-3"
                                  style={{ color: doc.section.color }}
                                />
                                <span style={{ color: doc.section.color }}>
                                  {doc.section.name}
                                </span>
                              </Badge>
                            )}
                            {doc.category && (
                              <Badge
                                variant="outline"
                                className="gap-1"
                                style={{ borderColor: doc.category.color }}
                              >
                                <Filter
                                  className="h-3 w-3"
                                  style={{ color: doc.category.color }}
                                />
                                <span style={{ color: doc.category.color }}>
                                  {doc.category.name}
                                </span>
                              </Badge>
                            )}
                            {doc.template && (
                              <Badge variant="default" className="gap-1">
                                <FileType className="h-3 w-3" />
                                {doc.template.type}
                              </Badge>
                            )}
                            {doc.isPublic ? (
                              <Badge variant="outline" className="gap-1">
                                <Unlock className="h-3 w-3" />
                                Público
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1">
                                <Lock className="h-3 w-3" />
                                Privado
                              </Badge>
                            )}
                          </div>

                          {/* Preview del contenido */}
                          <p
                            className="text-sm text-muted-foreground mb-2"
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {previewContent}
                          </p>

                          {/* Información adicional */}
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {formatFileSize(doc.size)}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {doc.uploadedBy.name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(doc.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

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

              <Separator />

              {/* Categoría */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Categoría</label>
                <Select
                  value={uploadData.categoryId?.toString() || ""}
                  onValueChange={(value) =>
                    setUploadData({
                      ...uploadData,
                      categoryId: value ? parseInt(value) : undefined,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
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

              {/* Sección */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Sección</label>
                <Select
                  value={uploadData.sectionId?.toString() || ""}
                  onValueChange={(value) =>
                    setUploadData({
                      ...uploadData,
                      sectionId: value ? parseInt(value) : undefined,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una sección" />
                  </SelectTrigger>
                  <SelectContent>
                    {!loadingSections &&
                      sectionStats?.map((section) => (
                        <SelectItem
                          key={section.id}
                          value={section.id.toString()}
                        >
                          {section.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Descripción</label>
                <Textarea
                  value={uploadData.description}
                  onChange={(e) =>
                    setUploadData({
                      ...uploadData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Describe el contenido del documento..."
                  rows={3}
                />
              </div>

              {/* Visibilidad */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPublic"
                  checked={uploadData.isPublic}
                  onCheckedChange={(checked) =>
                    setUploadData({
                      ...uploadData,
                      isPublic: checked as boolean,
                    })
                  }
                />
                <label
                  htmlFor="isPublic"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Hacer público (visible para todos los usuarios)
                </label>
              </div>
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
                Vista Previa: {previewDocument?.filename}
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
                  title={previewDocument?.filename}
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
                    handleDownload(previewDocument.id, previewDocument.filename)
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
            documentName={replaceFileDocument.filename}
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

              <Separator />

              {/* Categoría */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Categoría</label>
                <Select
                  value={uploadData.categoryId?.toString() || ""}
                  onValueChange={(value) =>
                    setUploadData({
                      ...uploadData,
                      categoryId: value ? parseInt(value) : undefined,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
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

              {/* Sección */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Sección</label>
                <Select
                  value={uploadData.sectionId?.toString() || ""}
                  onValueChange={(value) =>
                    setUploadData({
                      ...uploadData,
                      sectionId: value ? parseInt(value) : undefined,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una sección" />
                  </SelectTrigger>
                  <SelectContent>
                    {!loadingSections &&
                      sectionStats?.map((section) => (
                        <SelectItem
                          key={section.id}
                          value={section.id.toString()}
                        >
                          {section.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Descripción */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Descripción (opcional)
                </label>
                <Textarea
                  value={uploadData.description}
                  onChange={(e) =>
                    setUploadData({
                      ...uploadData,
                      description: e.target.value,
                    })
                  }
                  placeholder="Descripción que se aplicará a todos los archivos..."
                  rows={3}
                />
              </div>

              {/* Visibilidad */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isPublicMultiple"
                  checked={uploadData.isPublic}
                  onCheckedChange={(checked) =>
                    setUploadData({
                      ...uploadData,
                      isPublic: checked as boolean,
                    })
                  }
                />
                <label
                  htmlFor="isPublicMultiple"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Hacer públicos (visible para todos los usuarios)
                </label>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowUploadMultipleModal(false);
                  setSelectedFiles([]);
                  setUploadData({
                    categoryId: undefined,
                    sectionId: undefined,
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
      </div>
    </div>
  );
}
