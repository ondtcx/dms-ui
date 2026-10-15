"use client";

import { useAuth } from "@/lib/contexts/AuthContext";
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
import { useState, useRef, useEffect } from "react";
import { readDocumentActionCapabilities } from "@/lib/document-action-capabilities";
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
  const queryClient = useQueryClient();
  const [restoreConfirmId, setRestoreConfirmId] = useState<number | null>(null);
  const [permanentDeleteConfirmId, setPermanentDeleteConfirmId] = useState<number | null>(null);
  const actorId = user?.id;
  const current = useRef({ actorId, epoch: {}, alive: true });
  if (current.current.actorId !== actorId) current.current = { actorId, epoch: {}, alive: true };
  const restoreEpoch = useRef<object | null>(null);
  const deleteEpoch = useRef<object | null>(null);
  useEffect(() => {
    current.current.alive = true;
    return () => { current.current.alive = false; };
  }, []);
  useEffect(() => {
    setRestoreConfirmId(null); setPermanentDeleteConfirmId(null);
  }, [actorId]);
  const queryKey = ["documents", "trash", actorId];

  // Query for deleted documents - using includeDeleted parameter
  const {
    data: readback,
    isLoading: loadingDocuments,
    isFetching: fetchingDocuments,
    error: documentsError,
    refetch: refetchDocuments
  } = useQuery({
    queryKey,
    enabled: !!actorId,
    placeholderData: () => undefined,
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
  const documents = !loadingDocuments && !fetchingDocuments && !documentsError ? readback : undefined;
  const canAct = (id: number, action: "restore" | "permanentDelete", epoch: object = current.current.epoch) => {
    const state = queryClient.getQueryState(queryKey);
    const snapshot = queryClient.getQueryData<Awaited<ReturnType<typeof documentsService.getAll>>>(queryKey);
    const doc = snapshot?.data.find((document) => document.id === id && document.deletedAt !== null);
    return !!actorId && current.current.alive && current.current.epoch === epoch &&
      state?.status === "success" && state.fetchStatus === "idle" && !state.isInvalidated &&
      readDocumentActionCapabilities(doc, actorId ?? null)?.[action] === true;
  };

  // Restore mutation
  const restoreMutation = useMutation({
    mutationFn: ({ id, epoch }: { id: number; epoch: object }) => {
      if (!canAct(id, "restore", epoch)) throw new Error("Los permisos han cambiado.");
      return documentsService.restore(id);
    },
    onSuccess: (_data, { id, epoch }) => {
      if (!canAct(id, "restore", epoch)) return;
      toast.success("Documento restaurado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (error: unknown, { epoch }) => {
      if (!current.current.alive || current.current.epoch !== epoch) return;
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message || "Error al restaurar documento";
      toast.error(message);
    },
  });

  // Eliminación permanente según la capacidad vigente del documento.
  const permanentDeleteMutation = useMutation({
    mutationFn: ({ id, epoch }: { id: number; epoch: object }) => {
      if (!canAct(id, "permanentDelete", epoch)) throw new Error("Los permisos han cambiado.");
      return documentsService.permanentDelete(id);
    },
    onSuccess: (_data, { id, epoch }) => {
      if (!canAct(id, "permanentDelete", epoch)) return;
      toast.success("Documento eliminado permanentemente");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
    onError: (error: unknown, { epoch }) => {
      if (!current.current.alive || current.current.epoch !== epoch) return;
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message || "Error al eliminar documento";
      toast.error(message);
    },
  });

  const handleRestore = (id: number) => {
    if (!canAct(id, "restore")) return;
    restoreEpoch.current = current.current.epoch;
    setRestoreConfirmId(id);
  };

  const handlePermanentDelete = (id: number) => {
    if (!canAct(id, "permanentDelete")) return;
    deleteEpoch.current = current.current.epoch;
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

  const canPermanentDelete = (doc: Document): boolean => {
    return canAct(doc.id, "permanentDelete");
  };

  const canRestore = (doc: Document): boolean => {
    return canAct(doc.id, "restore");
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
          {documents?.data.some(canPermanentDelete) && " Puedes eliminar permanentemente los documentos que tengan esa acción habilitada."}
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
          ) : loadingDocuments || fetchingDocuments ? (
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

                      {canPermanentDelete(doc) && (
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
        key={`restore:${actorId}:${restoreConfirmId}`}
        open={restoreConfirmId !== null && !!restoreEpoch.current && canAct(restoreConfirmId, "restore", restoreEpoch.current)}
        onOpenChange={(open) => !open && setRestoreConfirmId(null)}
        title="Restaurar documento"
        description="¿Deseas restaurar este documento? Volverá a estar disponible en tus documentos."
        confirmLabel="Restaurar"
        loading={restoreMutation.isPending}
        onConfirm={() => {
          if (restoreConfirmId !== null && restoreEpoch.current && canAct(restoreConfirmId, "restore", restoreEpoch.current))
            restoreMutation.mutate({ id: restoreConfirmId, epoch: restoreEpoch.current });
          setRestoreConfirmId(null);
        }}
      />

      <ConfirmDialog
        key={`delete:${actorId}:${permanentDeleteConfirmId}`}
        open={permanentDeleteConfirmId !== null && !!deleteEpoch.current && canAct(permanentDeleteConfirmId, "permanentDelete", deleteEpoch.current)}
        onOpenChange={(open) => !open && setPermanentDeleteConfirmId(null)}
        title="Eliminar permanentemente"
        description="Esta acción no se puede deshacer. El documento será eliminado para siempre y no podrá recuperarse."
        confirmLabel="Eliminar permanentemente"
        variant="destructive"
        requireTyped="ELIMINAR"
        loading={permanentDeleteMutation.isPending}
        onConfirm={() => {
          if (permanentDeleteConfirmId !== null && deleteEpoch.current && canAct(permanentDeleteConfirmId, "permanentDelete", deleteEpoch.current))
            permanentDeleteMutation.mutate({ id: permanentDeleteConfirmId, epoch: deleteEpoch.current });
          setPermanentDeleteConfirmId(null);
        }}
      />
    </div>
  );
}
