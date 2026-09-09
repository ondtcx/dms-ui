"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
import { usePermissions } from "@/hooks/use-permissions";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsService } from "@/lib/services/documents.service";
import toast from "react-hot-toast";
import {
  Trash2,
  RotateCcw,
  XCircle,
  Calendar,
  User,
  FileText,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { useState } from "react";
import { Document } from "@/lib/types";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// Shadcn imports
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

export function TrashView() {
  const { user } = useAuth();
  const { isAdmin } = usePermissions();
  const queryClient = useQueryClient();
  const [restoreConfirmId, setRestoreConfirmId] = useState<number | null>(null);
  const [permanentDeleteConfirmId, setPermanentDeleteConfirmId] = useState<number | null>(null);

  // Query for deleted documents - using includeDeleted parameter
  const {
    data: documents,
    isLoading: loadingDocuments,
    error: documentsError,
    refetch: refetchDocuments
  } = useQuery({
    queryKey: ["documents", "trash"],
    queryFn: () =>
      documentsService.getAll({
        view: "trash",
        includeDeleted: true,
        page: 1,
        limit: 100,
      }),
    // Filter deleted documents on client side for now
    select: (data) => ({
      ...data,
      data: data.data.filter(doc => doc.deletedAt !== null)
    })
  });

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: (id: number) => documentsService.restore(id),
    onSuccess: () => {
      toast.success("Documento restaurado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (error: unknown) => {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message || "Error al restaurar documento";
      toast.error(message);
    },
  });

  // Permanent delete mutation (admin only)
  const permanentDeleteMutation = useMutation({
    mutationFn: (id: number) => documentsService.permanentDelete(id),
    onSuccess: () => {
      toast.success("Documento eliminado permanentemente");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (error: unknown) => {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message || "Error al eliminar documento";
      toast.error(message);
    },
  });

  const handleRestore = (id: number) => {
    setRestoreConfirmId(id);
  };

  const handlePermanentDelete = (id: number) => {
    setPermanentDeleteConfirmId(id);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return format(new Date(dateString), "PPp", { locale: es });
  };

  const canPermanentDelete = (): boolean => {
    return isAdmin();
  };

  const canRestore = (doc: Document): boolean => {
    return isAdmin() || doc.uploadedById === String(user?.id);
  };

  const daysInTrash = (deletedAt: string): number => {
    const now = new Date();
    const deleted = new Date(deletedAt);
    const diffTime = Math.abs(now.getTime() - deleted.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Trash2 className="h-8 w-8" />
          Papelera
        </h1>
        <p className="text-muted-foreground mt-2">
          Los documentos eliminados se conservan aquí durante 30 días antes de ser eliminados permanentemente
        </p>
      </div>

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Información</AlertTitle>
        <AlertDescription>
          Los documentos en la papelera se eliminan automáticamente después de 30 días.
          {isAdmin() && " Como administrador, puedes eliminar documentos permanentemente en cualquier momento."}
        </AlertDescription>
      </Alert>

      {/* Lista de documentos eliminados */}
      <Card>
        <CardHeader>
          <CardTitle>Documentos Eliminados</CardTitle>
          <CardDescription>
            {documents?.data.length || 0} documento(s) en la papelera
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documentsError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error al cargar documentos</AlertTitle>
              <AlertDescription className="flex flex-col gap-3">
                <p>
                  No se pudieron cargar los documentos eliminados. Verifica que el servidor
                  esté ejecutándose y que tengas conexión a internet.
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
                Cargando documentos eliminados...
              </p>
            </div>
          ) : documents?.data.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Trash2 className="h-16 w-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">La papelera está vacía</p>
              <p className="text-sm text-muted-foreground mt-1">
                No hay documentos eliminados
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents?.data.map((doc, index) => (
                <div key={doc.id}>
                  {index > 0 && <Separator />}
                  <div className="flex items-start justify-between gap-4 py-4">
                    {/* Información del documento */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        <h3 className="font-medium truncate">{((doc?.versions?.[0]?.filename) ?? '')}</h3>
                        {doc.deletedAt && daysInTrash(doc.deletedAt) >= 25 && (
                          <Badge variant="destructive">
                            Eliminación automática en {30 - daysInTrash(doc.deletedAt)} días
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {formatFileSize(((doc?.versions?.[0]?.size) ?? 0))}
                        </span>

                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {doc.uploadedBy.name}
                        </span>

                        {doc.deletedAt && (
                          <span className="flex items-center gap-1">
                            <Trash2 className="h-3 w-3" />
                            Eliminado: {formatDate(doc.deletedAt)}
                          </span>
                        )}

                        {doc.deletedBy && (
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Por: {doc.deletedBy.name}
                          </span>
                        )}

                        {doc.deletedAt && (
                          <span className="flex items-center gap-1 col-span-2">
                            <Calendar className="h-3 w-3" />
                            {daysInTrash(doc.deletedAt)} día(s) en papelera
                          </span>
                        )}
                      </div>

                      {doc.description && (
                        <p className="text-sm text-muted-foreground">
                          {doc.description}
                        </p>
                      )}
                    </div>

                    {/* Acciones */}
                    <div className="flex items-center gap-2">
                      {canRestore(doc) && (
                        <Button
                          onClick={() => handleRestore(doc.id)}
                          disabled={restoreMutation.isPending}
                          variant="default"
                          size="sm"
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Restaurar
                        </Button>
                      )}

                      {canPermanentDelete() && (
                        <Button
                          onClick={() => handlePermanentDelete(doc.id)}
                          disabled={permanentDeleteMutation.isPending}
                          variant="destructive"
                          size="sm"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Eliminar Permanentemente
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <ConfirmDialog
        open={restoreConfirmId !== null}
        onOpenChange={(open) => !open && setRestoreConfirmId(null)}
        title="Restaurar documento"
        description="¿Deseas restaurar este documento? Volverá a estar disponible en tus documentos."
        confirmLabel="Restaurar"
        loading={restoreMutation.isPending}
        onConfirm={() => {
          if (restoreConfirmId !== null) restoreMutation.mutate(restoreConfirmId);
          setRestoreConfirmId(null);
        }}
      />

      <ConfirmDialog
        open={permanentDeleteConfirmId !== null}
        onOpenChange={(open) => !open && setPermanentDeleteConfirmId(null)}
        title="Eliminar permanentemente"
        description="Esta acción no se puede deshacer. El documento será eliminado para siempre y no podrá recuperarse."
        confirmLabel="Eliminar permanentemente"
        variant="destructive"
        requireTyped="ELIMINAR"
        loading={permanentDeleteMutation.isPending}
        onConfirm={() => {
          if (permanentDeleteConfirmId !== null) permanentDeleteMutation.mutate(permanentDeleteConfirmId);
          setPermanentDeleteConfirmId(null);
        }}
      />
    </div>
  );
}
