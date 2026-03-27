"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { workflowsService } from "@/lib/services/workflows.service";
import { documentsService } from "@/lib/services/documents.service";
import { WorkflowStatus } from "@/lib/types";
import { RequestStatusBadge } from "@/components/requests/RequestStatusBadge";
import { RequestTimeline } from "@/components/requests/RequestTimeline";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Download,
  Loader2,
  RefreshCw,
  XCircle,
  FileText,
  CalendarDays,
  Tag,
} from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

const CANCELLABLE_STATUSES: WorkflowStatus[] = [
  WorkflowStatus.PENDING,
  WorkflowStatus.IN_PROGRESS,
];

export default function RequestDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const documentId = parseInt(id, 10);
  const router = useRouter();
  const queryClient = useQueryClient();

  const {
    data: workflow,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["request-detail", documentId],
    queryFn: () => workflowsService.getDocumentWorkflow(documentId),
    enabled: !isNaN(documentId),
  });

  const cancelMutation = useMutation({
    mutationFn: (workflowId: number) => workflowsService.cancel(workflowId),
    onSuccess: () => {
      toast.success("Solicitud cancelada");
      queryClient.invalidateQueries({ queryKey: ["my-requests"] });
      queryClient.invalidateQueries({ queryKey: ["request-detail", documentId] });
    },
    onError: () => toast.error("No se pudo cancelar la solicitud"),
  });

  const resubmitMutation = useMutation({
    mutationFn: (workflowId: number) => workflowsService.resubmit(workflowId),
    onSuccess: () => {
      toast.success("Solicitud reenviada para revisión");
      queryClient.invalidateQueries({ queryKey: ["my-requests"] });
      queryClient.invalidateQueries({ queryKey: ["request-detail", documentId] });
    },
    onError: () => toast.error("No se pudo reenviar la solicitud"),
  });

  async function handleDownload() {
    try {
      const blob = await documentsService.download(documentId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = workflow?.document?.filename ?? `documento-${documentId}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("No se pudo descargar el documento");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !workflow) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/requests">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Mis Solicitudes
          </Link>
        </Button>
        <p className="text-sm text-muted-foreground">
          No se encontró la solicitud o no tienes acceso.
        </p>
      </div>
    );
  }

  const isCancellable = CANCELLABLE_STATUSES.includes(workflow.status);
  const isChangesRequested = workflow.status === WorkflowStatus.CHANGES_REQUESTED;
  const doc = workflow.document;

  return (
    <div className="max-w-2xl space-y-6">
      {/* Back link */}
      <Button variant="ghost" size="sm" asChild className="-ml-2">
        <Link href="/dashboard/requests">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Mis Solicitudes
        </Link>
      </Button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">
            {doc?.filename ?? `Solicitud #${workflow.id}`}
          </h1>
          {workflow.template && (
            <p className="text-sm text-muted-foreground">{workflow.template.name}</p>
          )}
        </div>
        <RequestStatusBadge status={workflow.status} />
      </div>

      {/* Document info card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Información del documento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {doc?.category && (
            <div className="flex items-center gap-3 text-sm">
              <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Categoría:</span>
              <span>{doc.category.name}</span>
            </div>
          )}
          <div className="flex items-center gap-3 text-sm">
            <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Enviada el:</span>
            <span>
              {new Date(workflow.createdAt).toLocaleDateString("es", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
          {workflow.completedAt && (
            <div className="flex items-center gap-3 text-sm">
              <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground">Completada el:</span>
              <span>
                {new Date(workflow.completedAt).toLocaleDateString("es", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </span>
            </div>
          )}
          <div className="pt-1">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Descargar documento
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Estado de la solicitud
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RequestTimeline workflow={workflow} />
        </CardContent>
      </Card>

      {/* Actions */}
      {(isCancellable || isChangesRequested) && (
        <div className="flex gap-3 flex-wrap">
          {isChangesRequested && (
            <Button
              variant="outline"
              onClick={() => resubmitMutation.mutate(workflow.id)}
              disabled={resubmitMutation.isPending}
            >
              {resubmitMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Reenviar para revisión
            </Button>
          )}

          {isCancellable && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="text-destructive hover:text-destructive">
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancelar solicitud
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Cancelar la solicitud?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. La solicitud quedará cancelada y
                    deberás crear una nueva si deseas continuar.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>No, mantener</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => cancelMutation.mutate(workflow.id)}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Sí, cancelar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      )}
    </div>
  );
}
