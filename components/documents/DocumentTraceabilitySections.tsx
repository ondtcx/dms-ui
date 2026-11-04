"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Archive, FileText, FolderOpen, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Document } from "@/lib/types";
import { formatRole, formatFileSize } from "@/lib/utils";
import { DocumentStageTracker } from "./DocumentStageTracker";

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  IN_REVIEW: "En revisión",
  CHANGES_REQUESTED: "Devuelto",
  APPROVED: "Aprobado",
  EMITTED: "Emitido",
  ARCHIVED: "Archivado",
};

const AUTHORING_ACTIONS: Record<string, string> = {
  CREATED: "Borrador creado",
  SAVED: "Borrador guardado",
  SUBMITTED: "Enviado a revisión",
  APPROVED: "Aprobado",
  RETURNED: "Devuelto con observaciones",
  EMITTED: "Emitido",
  ARCHIVED: "Archivado",
};

const REVIEW_ACTIONS: Record<string, string> = {
  CREATED: "Revisión creada",
  SUBMITTED: "Enviado a revisión",
  APPROVED: "Aprobado",
  RETURNED: "Devuelto con observaciones",
  ARCHIVED: "Archivado",
  UPDATED: "Versión actualizada",
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, "PPpp", { locale: es });
}

function formatCalendarDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return format(
    new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
    "PPP",
    { locale: es },
  );
}

function statusLabel(value?: string | null) {
  if (!value) return "Inicio";
  return STATUS_LABELS[value] ?? value;
}

function originOf(document: Document) {
  if (document.authoring && document.templateData?.template?.isBlank) {
    return "Creado en el editor";
  }
  if (document.authoring) return "Creado desde plantilla";
  if (document.receptionOriginDirectory) return "Recibido por transferencia";
  if (document.templateData?.batch) return "Generado en lote desde plantilla";
  return "Subido";
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
      <dt className="min-w-36 text-xs font-medium text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm">{children}</dd>
    </div>
  );
}

export function DocumentOriginCard({ document }: { document: Document }) {
  const version = document.versions?.[0];
  const author = document.uploadedBy;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-4 w-4" /> Origen del documento
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-2">
          <Row label="Origen">
            <Badge variant="outline">{originOf(document)}</Badge>
          </Row>
          <Row label="Autor">
            <span className="inline-flex items-center gap-1.5">
              <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
              {author?.name || author?.email || "Actor no disponible"}
              {author?.role ? (
                <span className="text-xs text-muted-foreground">
                  · {formatRole(author.role)}
                </span>
              ) : null}
            </span>
          </Row>
          <Row label="Creado">{formatDate(document.createdAt)}</Row>
          <Row label="Fecha de origen">
            {document.originDate
              ? formatCalendarDate(document.originDate)
              : "No registrada"}
          </Row>
          <Row label="Tipo de documento">
            {document.documentType?.name ||
              document.templateData?.template?.documentType?.name ||
              "Sin tipo de documento"}
          </Row>
          <Row label="Año lectivo">
            {document.academic?.academicYear?.name || "Sin año lectivo"}
          </Row>
          <Row label="Carpeta">
            <span className="inline-flex items-center gap-1.5">
              <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
              {document.directory?.name || "Raíz"}
              {document.receptionOriginDirectory
                ? ` · origen: ${document.receptionOriginDirectory.name}`
                : ""}
            </span>
          </Row>
          {document.templateData?.template ? (
            <Row label="Plantilla">
              {document.templateData.template.name}
              {document.templateData.template.isBlank
                ? " · documento en blanco"
                : ""}
            </Row>
          ) : null}
          {version ? (
            <Row label="Archivo">
              {version.filename} · {formatFileSize(version.size)}
            </Row>
          ) : null}
          <Row label="Archivo histórico">
            {document.archivedAt
              ? `Archivado el ${formatDate(document.archivedAt)}`
              : "Activo en la bandeja"}
          </Row>
        </dl>
      </CardContent>
    </Card>
  );
}

interface Transition {
  key: string;
  label: string;
  from?: string | null;
  to?: string | null;
  actor?: string | null;
  createdAt?: string | null;
  observation?: string | null;
}

function transitionsOf(document: Document): Transition[] {
  if (document.authoring?.events?.length) {
    return document.authoring.events
      .filter((event) => event.action !== 'SAVED')
      .map((event) => ({
        key: `authoring-${event.id}`,
        label: AUTHORING_ACTIONS[event.action] ?? event.action,
        from: event.fromStatus ?? null,
        to: event.toStatus,
        actor: event.actorName,
        createdAt: event.createdAt,
        observation: event.observation,
      }));
  }
  if (document.review?.events?.length) {
    return document.review.events.map((event) => ({
      key: `review-${event.id}`,
      label: REVIEW_ACTIONS[event.action] ?? event.action,
      from: event.fromStatus ?? null,
      to: event.toStatus,
      actor: event.actorName,
      createdAt: event.createdAt,
      observation: event.observation,
    }));
  }
  return [];
}

export function DocumentStateCard({ document }: { document: Document }) {
  const authoring = document.authoring;
  const review = document.review;
  const status = authoring?.status ?? review?.status ?? "DRAFT";
  const mode = authoring ? "authoring" : "upload";
  const transitions = transitionsOf(document);
  const archivedAt = document.archivedAt;

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Archive className="h-4 w-4" /> Estado y etapas
        </CardTitle>
        <Badge>{statusLabel(status)}</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <DocumentStageTracker mode={mode} status={status} />

        <div className="grid gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
          {authoring?.reviewerName || review?.reviewerName ? (
            <span>
              Revisor: {authoring?.reviewerName || review?.reviewerName}
            </span>
          ) : null}
          {authoring?.submittedAt || review?.submittedAt ? (
            <span>
              Enviado:{" "}
              {formatDate(authoring?.submittedAt || review?.submittedAt)}
            </span>
          ) : null}
          {authoring?.reviewedByName || review?.reviewedByName ? (
            <span>
              Revisó: {authoring?.reviewedByName || review?.reviewedByName}
            </span>
          ) : null}
          {authoring?.emittedAt ? (
            <span>Emitido: {formatDate(authoring.emittedAt)}</span>
          ) : null}
          {archivedAt ? <span>Archivado: {formatDate(archivedAt)}</span> : null}
        </div>

        {authoring?.reviewObservation || review?.observation ? (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {authoring?.reviewObservation || review?.observation}
          </p>
        ) : null}

        {transitions.length > 0 ? (
          <ol className="space-y-3 border-t pt-3" aria-label="Transiciones de estado">
            {transitions
              .slice()
              .reverse()
              .map((transition) => (
                <li
                  key={transition.key}
                  className="border-l-2 border-border pl-3"
                >
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="font-medium">{transition.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {statusLabel(transition.from)} → {statusLabel(transition.to)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {transition.actor || "Actor no disponible"} ·{" "}
                    {formatDate(transition.createdAt)}
                  </div>
                  {transition.observation ? (
                    <p className="mt-1 text-xs">{transition.observation}</p>
                  ) : null}
                </li>
              ))}
          </ol>
        ) : (
          <p className="border-t pt-3 text-sm text-muted-foreground">
            Sin transiciones registradas. El documento muestra su estado actual
            y los datos de creación.
          </p>
        )}

        {archivedAt && !transitions.some((item) => item.to === "ARCHIVED") ? (
          <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
            Archivado automáticamente el {formatDate(archivedAt)}. El documento
            salió de la bandeja activa y se conserva en el archivo histórico.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
