"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import {
  Check,
  ExternalLink,
  Inbox,
  Loader2,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/contexts/AuthContext";
import { authoringService } from "@/lib/services/authoring.service";
import { documentReviewService } from "@/lib/services/document-reviews.service";
import { UserRole } from "@/lib/types";
import { DocumentStageTracker } from "./DocumentStageTracker";

interface QueueItem {
  key: string;
  kind: "authoring" | "upload";
  documentId: number;
  name: string;
  author?: string | null;
  template?: string | null;
  documentType?: string | null;
  reviewerId?: string | null;
  reviewerName?: string | null;
  submittedAt?: string | null;
  status: string;
  detailHref: string;
}

function waitingLabel(value?: string | null) {
  if (!value) return "Sin fecha de envío";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin fecha de envío";
  return `Esperando ${formatDistanceToNow(date, {
    locale: es,
    addSuffix: false,
  })}`;
}

export function ReviewQueue() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const authoringQuery = useQuery({
    queryKey: ["authoring-pending"],
    queryFn: () => authoringService.pendingDocuments(),
  });
  const reviewQuery = useQuery({
    queryKey: ["document-review-pending"],
    queryFn: () => documentReviewService.pending(),
  });

  const [actionItem, setActionItem] = useState<QueueItem | null>(null);
  const [actionMode, setActionMode] = useState<"approve" | "return">("approve");
  const [observation, setObservation] = useState("");
  const [busy, setBusy] = useState(false);

  const items = useMemo<QueueItem[]>(() => {
    const authoring = (authoringQuery.data ?? []).map((document) => ({
      key: `authoring-${document.id}`,
      kind: "authoring" as const,
      documentId: document.id,
      name: document.name || `Documento #${document.id}`,
      author: document.uploadedBy?.name,
      template: document.templateData?.template?.name,
      documentType: document.documentType?.name,
      reviewerId: document.authoring.reviewerId,
      reviewerName: document.authoring.reviewerName,
      submittedAt: document.authoring.submittedAt,
      status: document.authoring.status,
      detailHref: `/dashboard/elaboracion/${document.id}`,
    }));
    const uploaded = (reviewQuery.data ?? []).map((review) => ({
      key: `review-${review.id}`,
      kind: "upload" as const,
      documentId: review.documentId,
      name: review.document?.name || `Documento #${review.documentId}`,
      author: review.document?.uploadedBy?.name,
      template: review.document?.templateData?.template?.name,
      documentType: review.document?.documentType?.name,
      reviewerName: review.reviewerName,
      submittedAt: review.submittedAt,
      status: review.status,
      detailHref: `/dashboard/documents/${review.documentId}`,
    }));
    return [...authoring, ...uploaded].sort((left, right) => {
      const leftTime = left.submittedAt
        ? new Date(left.submittedAt).getTime()
        : Number.MAX_SAFE_INTEGER;
      const rightTime = right.submittedAt
        ? new Date(right.submittedAt).getTime()
        : Number.MAX_SAFE_INTEGER;
      return leftTime - rightTime;
    });
  }, [authoringQuery.data, reviewQuery.data]);

  const canReview = (item: QueueItem) => {
    if (item.kind === "upload") return true;
    if (item.reviewerId) {
      return item.reviewerId === user?.id || user?.role === UserRole.ADMIN;
    }
    return [UserRole.ADMIN, UserRole.RECTOR, UserRole.VICERRECTOR].includes(
      user?.role as UserRole,
    );
  };

  const openAction = (item: QueueItem, mode: "approve" | "return") => {
    setActionItem(item);
    setActionMode(mode);
    setObservation("");
  };

  const runAction = async () => {
    if (!actionItem) return;
    if (actionMode === "return" && !observation.trim()) {
      toast.error("La observación es obligatoria para devolver.");
      return;
    }
    setBusy(true);
    try {
      if (actionItem.kind === "authoring") {
        if (actionMode === "approve") {
          await authoringService.approve(actionItem.documentId, {
            observation: observation.trim() || undefined,
          });
        } else {
          await authoringService.returnDocument(actionItem.documentId, {
            observation: observation.trim(),
          });
        }
      } else if (actionMode === "approve") {
        await documentReviewService.approve(
          actionItem.documentId,
          observation.trim() || undefined,
        );
      } else {
        await documentReviewService.returnDocument(
          actionItem.documentId,
          observation.trim(),
        );
      }
      toast.success(
        actionMode === "approve" ? "Documento aprobado" : "Documento devuelto",
      );
      setActionItem(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["authoring-pending"] }),
        queryClient.invalidateQueries({
          queryKey: ["document-review-pending"],
        }),
        queryClient.invalidateQueries({ queryKey: ["authoring-documents"] }),
        queryClient.invalidateQueries({ queryKey: ["documents"] }),
      ]);
    } catch (cause) {
      const message = (
        cause as { response?: { data?: { message?: string | string[] } } }
      ).response?.data?.message;
      toast.error(
        Array.isArray(message)
          ? message.join("; ")
          : message || "No se pudo completar la revisión.",
      );
    } finally {
      setBusy(false);
    }
  };

  const error = authoringQuery.error || reviewQuery.error;
  const loading = authoringQuery.isLoading || reviewQuery.isLoading;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Pendientes de revisión
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Documentos de plantilla y documentos subidos que esperan una decisión
          de revisión.
        </p>
      </header>

      {error ? (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 py-6">
            <p className="text-sm text-destructive">
              No se pudieron cargar los pendientes de revisión.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void authoringQuery.refetch();
                void reviewQuery.refetch();
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" /> Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : loading ? (
        <Card>
          <CardContent className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando pendientes…
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <Inbox className="h-8 w-8 text-muted-foreground" aria-hidden />
            <p className="font-medium">No hay documentos pendientes</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Cuando alguien envíe un documento a revisión aparecerá aquí con
              sus etapas y acciones.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {items.length} {items.length === 1 ? "documento" : "documentos"} en
            revisión
          </p>
          {items.map((item) => (
            <Card key={item.key}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base">
                      {item.name}
                    </CardTitle>
                    <CardDescription className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Badge variant="outline">
                        {item.kind === "authoring"
                          ? "Desde plantilla"
                          : "Subido"}
                      </Badge>
                      {item.documentType ? <span>{item.documentType}</span> : null}
                      {item.template ? <span>· {item.template}</span> : null}
                      {item.author ? <span>· Autor: {item.author}</span> : null}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button asChild size="sm" variant="ghost">
                      <Link href={item.detailHref}>
                        <ExternalLink className="mr-1.5 h-4 w-4" /> Abrir
                      </Link>
                    </Button>
                    {canReview(item) ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAction(item, "return")}
                        >
                          <RotateCcw className="mr-1.5 h-4 w-4" /> Devolver
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => openAction(item, "approve")}
                        >
                          <Check className="mr-1.5 h-4 w-4" /> Aprobar
                        </Button>
                      </>
                    ) : null}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <DocumentStageTracker
                  mode={item.kind === "authoring" ? "authoring" : "upload"}
                  status={item.status}
                />
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>
                    Revisor:{" "}
                    {item.reviewerName || "sin asignar (bandeja compartida)"}
                  </span>
                  <span>{waitingLabel(item.submittedAt)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={actionItem !== null}
        onOpenChange={(open) => {
          if (!open) setActionItem(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionMode === "approve" ? "Aprobar documento" : "Devolver documento"}
            </DialogTitle>
            <DialogDescription>
              {actionItem?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="review-observation">
              Observación{" "}
              {actionMode === "return" ? (
                <span className="text-destructive">*</span>
              ) : (
                <span className="text-muted-foreground">(opcional)</span>
              )}
            </label>
            <Textarea
              id="review-observation"
              value={observation}
              onChange={(event) => setObservation(event.target.value)}
              placeholder={
                actionMode === "return"
                  ? "Indica qué debe corregir el autor"
                  : "Comentario de aprobación (opcional)"
              }
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionItem(null)}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button
              onClick={runAction}
              disabled={busy || (actionMode === "return" && !observation.trim())}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {actionMode === "approve" ? "Aprobar" : "Devolver"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
