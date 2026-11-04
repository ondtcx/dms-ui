"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import {
  Archive,
  Check,
  ExternalLink,
  FilePenLine,
  Loader2,
  RotateCcw,
  Send,
} from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
import { UserRole, type Document } from "@/lib/types";
import { DocumentStageTracker } from "./DocumentStageTracker";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  IN_REVIEW: "En revisión",
  CHANGES_REQUESTED: "Devuelto",
  APPROVED: "Aprobado",
  EMITTED: "Emitido",
  ARCHIVED: "Archivado",
};

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString("es-ES") : "—";
}

export function AuthoringReviewCard({
  document,
  onChanged,
}: {
  document: Document;
  onChanged: () => void;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const authoring = document.authoring;
  const [reviewAction, setReviewAction] = useState<"approve" | "return" | null>(
    null,
  );
  const [observation, setObservation] = useState("");
  const [confirmEmit, setConfirmEmit] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!authoring) return null;

  const status = authoring.status;
  const reviewerId = authoring.reviewerId;
  const isCreator =
    document.uploadedById === user?.id || document.uploadedBy?.id === user?.id;
  const canReview =
    status === "IN_REVIEW" &&
    (reviewerId
      ? reviewerId === user?.id || user?.role === UserRole.ADMIN
      : [UserRole.ADMIN, UserRole.RECTOR, UserRole.VICERRECTOR].includes(
          user?.role as UserRole,
        ));

  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["document", document.id],
      }),
      queryClient.invalidateQueries({ queryKey: ["documents"] }),
      queryClient.invalidateQueries({ queryKey: ["authoring-pending"] }),
      queryClient.invalidateQueries({ queryKey: ["authoring-documents"] }),
    ]);
    onChanged();
  };

  const runReview = async () => {
    if (!reviewAction) return;
    if (reviewAction === "return" && !observation.trim()) {
      toast.error("La observación es obligatoria para devolver.");
      return;
    }
    setBusy(true);
    try {
      if (reviewAction === "approve") {
        await authoringService.approve(document.id, {
          observation: observation.trim() || undefined,
        });
        toast.success("Documento aprobado");
      } else {
        await authoringService.returnDocument(document.id, {
          observation: observation.trim(),
        });
        toast.success("Documento devuelto");
      }
      setReviewAction(null);
      setObservation("");
      await refresh();
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

  const emit = async () => {
    setBusy(true);
    try {
      await authoringService.emit(document.id);
      toast.success("Documento emitido y numerado");
      setConfirmEmit(false);
      await refresh();
    } catch (cause) {
      const message = (
        cause as { response?: { data?: { message?: string | string[] } } }
      ).response?.data?.message;
      toast.error(
        Array.isArray(message)
          ? message.join("; ")
          : message || "No se pudo emitir el documento.",
      );
    } finally {
      setBusy(false);
    }
  };

  const archive = async () => {
    setBusy(true);
    try {
      await authoringService.archive(document.id);
      toast.success("Documento archivado");
      setConfirmArchive(false);
      await refresh();
    } catch (cause) {
      const message = (
        cause as { response?: { data?: { message?: string | string[] } } }
      ).response?.data?.message;
      toast.error(
        Array.isArray(message)
          ? message.join("; ")
          : message || "No se pudo archivar el documento.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
        <CardTitle className="text-base">Elaboración y revisión</CardTitle>
        <Badge>{STATUS_LABELS[status] ?? status}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <DocumentStageTracker mode="authoring" status={status} />

        <div className="grid gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
          <span>
            Revisor:{" "}
            {authoring.reviewerName || "sin asignar (bandeja compartida)"}
          </span>
          {authoring.submittedAt ? (
            <span>Enviado: {formatDate(authoring.submittedAt)}</span>
          ) : null}
          {authoring.reviewedByName ? (
            <span>Revisó: {authoring.reviewedByName}</span>
          ) : null}
          {authoring.emittedAt ? (
            <span>Emitido: {formatDate(authoring.emittedAt)}</span>
          ) : null}
          {document.archivedAt ? (
            <span>Archivado: {formatDate(document.archivedAt)}</span>
          ) : null}
        </div>

        {authoring.reviewObservation ? (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {authoring.reviewObservation}
          </p>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {status === "DRAFT" || status === "CHANGES_REQUESTED" ? (
            <>
              <Button asChild size="sm">
                <Link href={`/dashboard/elaboracion/${document.id}/editar`}>
                  <FilePenLine className="mr-1.5 h-4 w-4" /> Editar contenido
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline">
                <Link href={`/dashboard/elaboracion/${document.id}`}>
                  Abrir detalle
                </Link>
              </Button>
            </>
          ) : null}

          {canReview ? (
            <>
              <Button size="sm" onClick={() => setReviewAction("approve")}>
                <Check className="mr-1.5 h-4 w-4" /> Aprobar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setReviewAction("return")}
              >
                <RotateCcw className="mr-1.5 h-4 w-4" /> Devolver
              </Button>
            </>
          ) : null}

          {status === "APPROVED" && isCreator ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setConfirmEmit(true)}
              disabled={busy}
            >
              <Send className="mr-1.5 h-4 w-4" /> Emitir y numerar
            </Button>
          ) : null}

          {status === "APPROVED" && !isCreator ? (
            <p className="w-full rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              Solo el creador puede emitir y numerar este documento.
            </p>
          ) : null}

          {status === "EMITTED" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setConfirmArchive(true)}
              disabled={busy}
            >
              <Archive className="mr-1.5 h-4 w-4" /> Archivar
            </Button>
          ) : null}

          <Button asChild size="sm" variant="ghost">
            <Link href={`/dashboard/elaboracion/${document.id}`}>
              <ExternalLink className="mr-1.5 h-4 w-4" /> Ver trazabilidad
            </Link>
          </Button>
        </div>
      </CardContent>

      <Dialog
        open={reviewAction !== null}
        onOpenChange={(open) => {
          if (!open) setReviewAction(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === "approve"
                ? "Aprobar documento"
                : "Devolver documento"}
            </DialogTitle>
            <DialogDescription>{document.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label
              className="text-sm font-medium"
              htmlFor={`authoring-review-observation-${document.id}`}
            >
              Observación{" "}
              {reviewAction === "return" ? (
                <span className="text-destructive">*</span>
              ) : (
                <span className="text-muted-foreground">(opcional)</span>
              )}
            </label>
            <Textarea
              id={`authoring-review-observation-${document.id}`}
              value={observation}
              onChange={(event) => setObservation(event.target.value)}
              placeholder={
                reviewAction === "return"
                  ? "Indica qué debe corregir el autor"
                  : "Comentario de aprobación (opcional)"
              }
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setReviewAction(null)}
              disabled={busy}
            >
              Cancelar
            </Button>
            <Button
              onClick={runReview}
              disabled={
                busy ||
                (reviewAction === "return" && !observation.trim())
              }
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {reviewAction === "approve" ? "Aprobar" : "Devolver"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmEmit}
        onOpenChange={setConfirmEmit}
        title="Emitir y numerar"
        description="El documento quedará aprobado, se le asignará un número institucional y ya no podrá editarse."
        confirmLabel="Emitir y numerar"
        onConfirm={emit}
      />
      <ConfirmDialog
        open={confirmArchive}
        onOpenChange={setConfirmArchive}
        title="Archivar documento"
        description="El documento saldrá de la bandeja activa y quedará en el archivo histórico."
        confirmLabel="Archivar"
        onConfirm={archive}
      />
    </Card>
  );
}
