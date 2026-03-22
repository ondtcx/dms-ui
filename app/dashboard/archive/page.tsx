"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
import { usePermissions } from "@/hooks/use-permissions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsService } from "@/lib/services/documents.service";
import toast from "react-hot-toast";
import {
  Archive,
  RotateCcw,
  Calendar,
  User,
  FileText,
  AlertCircle,
  RefreshCw,
  Eye,
  Download,
  Search,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Document } from "@/lib/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export default function ArchivePage() {
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
  const queryClient = useQueryClient();
  const [restoreConfirmId, setRestoreConfirmId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const {
    data: archiveStats,
    isLoading: loadingStats,
  } = useQuery({
    queryKey: ["archive", "stats"],
    queryFn: () => documentsService.getArchiveStats(),
  });

  const {
    data: documents,
    isLoading: loadingDocuments,
    error: documentsError,
    refetch: refetchDocuments,
  } = useQuery({
    queryKey: ["archive", { search }],
    queryFn: () => documentsService.getArchived({ search: search || undefined, limit: 200 }),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: number) => documentsService.restoreFromArchive(id),
    onSuccess: () => {
      toast.success("Documento restaurado al archivo activo");
      queryClient.invalidateQueries({ queryKey: ["archive"] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (error: unknown) => {
      const message =
        (error as { response?: { data?: { message?: string } } }).response?.data?.message ||
        "Error al restaurar documento";
      toast.error(message);
    },
  });

  const groupedByYear = useMemo(() => {
    if (!documents?.data) return {} as Record<string, Document[]>;
    return documents.data.reduce((acc, doc) => {
      const dateSource = doc.archivedAt ?? doc.createdAt;
      const year = new Date(dateSource).getFullYear().toString();
      if (!acc[year]) acc[year] = [];
      acc[year].push(doc);
      return acc;
    }, {} as Record<string, Document[]>);
  }, [documents]);

  const years = Object.keys(groupedByYear).sort((a, b) => Number(b) - Number(a));

  const canRestore = (doc: Document): boolean =>
    isAdmin() || doc.uploadedById === String(user?.id);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString: string): string =>
    format(new Date(dateString), "PPp", { locale: es });

  const handleSearch = () => setSearch(searchInput);

  const handleDownload = async (doc: Document) => {
    try {
      const blob = await documentsService.download(doc.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Error al descargar el documento");
    }
  };

  const handleView = async (doc: Document) => {
    try {
      const blob = await documentsService.view(doc.id);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch {
      toast.error("Error al visualizar el documento");
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Archive className="h-8 w-8" />
          Archivo Histórico
        </h1>
        <p className="text-muted-foreground mt-2">
          Documentos archivados automáticamente tras 90 días de inactividad
        </p>
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Archivo de solo lectura</AlertTitle>
        <AlertDescription>
          Los documentos se archivan automáticamente cuando llevan más de 90 días sin actividad.
          Puedes ver y descargar cualquier documento. Para editarlo nuevamente, restáuralo al archivo activo.
        </AlertDescription>
      </Alert>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total archivados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">
              {loadingStats ? "—" : archiveStats?.total ?? 0}
            </p>
            <p className="text-xs text-muted-foreground mt-1">documentos en el archivo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Por categoría
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : archiveStats?.byCategory.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin datos</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {archiveStats?.byCategory.map((cat) => (
                  <Badge
                    key={cat.categoryId ?? "none"}
                    variant="outline"
                    style={{ borderColor: cat.categoryColor, color: cat.categoryColor }}
                  >
                    {cat.categoryName} ({cat.count})
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Barra de búsqueda */}
      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar en el archivo..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={handleSearch}>
          Buscar
        </Button>
        {search && (
          <Button
            variant="ghost"
            onClick={() => { setSearch(""); setSearchInput(""); }}
          >
            Limpiar
          </Button>
        )}
      </div>

      {/* Lista agrupada por año */}
      {documentsError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error al cargar el archivo</AlertTitle>
          <AlertDescription className="flex flex-col gap-3">
            <p>No se pudieron cargar los documentos archivados.</p>
            <Button onClick={() => refetchDocuments()} variant="outline" size="sm" className="w-fit">
              <RefreshCw className="mr-2 h-4 w-4" />
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      ) : loadingDocuments ? (
        <div className="flex flex-col items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
          <p className="text-muted-foreground mt-4">Cargando archivo...</p>
        </div>
      ) : years.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Archive className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">El archivo está vacío</p>
            <p className="text-sm text-muted-foreground mt-1">
              {search
                ? "No se encontraron documentos con ese criterio de búsqueda"
                : "Los documentos con más de 90 días aparecerán aquí automáticamente"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {years.map((year) => (
            <Card key={year}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  {year}
                </CardTitle>
                <CardDescription>
                  {groupedByYear[year].length} documento(s)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {groupedByYear[year].map((doc, index) => (
                    <div key={doc.id}>
                      {index > 0 && <Separator className="my-1" />}
                      <div className="flex items-start justify-between gap-4 py-3">
                        {/* Info del documento */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span className="font-medium truncate">{doc.filename}</span>
                            {doc.category && (
                              <Badge
                                variant="outline"
                                style={{
                                  borderColor: doc.category.color,
                                  color: doc.category.color,
                                }}
                              >
                                {doc.category.name}
                              </Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {formatFileSize(doc.size)}
                            </span>
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {doc.uploadedBy.name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Archive className="h-3 w-3" />
                              Archivado: {formatDate(doc.archivedAt ?? doc.createdAt)}
                            </span>
                          </div>

                          {doc.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {doc.description}
                            </p>
                          )}
                        </div>

                        {/* Acciones */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleView(doc)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(doc)}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          {canRestore(doc) && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => setRestoreConfirmId(doc.id)}
                              disabled={restoreMutation.isPending}
                            >
                              <RotateCcw className="mr-1.5 h-4 w-4" />
                              Restaurar
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={restoreConfirmId !== null}
        onOpenChange={(open) => !open && setRestoreConfirmId(null)}
        title="Restaurar documento"
        description="El documento volverá al archivo activo y podrá ser editado nuevamente. ¿Deseas continuar?"
        confirmLabel="Restaurar"
        loading={restoreMutation.isPending}
        onConfirm={() => {
          if (restoreConfirmId !== null) restoreMutation.mutate(restoreConfirmId);
          setRestoreConfirmId(null);
        }}
      />
    </div>
  );
}
