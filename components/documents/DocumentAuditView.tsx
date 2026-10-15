"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronDown, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type {
  AuditAction,
  AuditResource,
  DocumentAuditEvent,
} from "@/lib/types";

export type AuditViewState =
  | "denied"
  | "loading"
  | "forbidden"
  | "invalid"
  | "error"
  | "empty"
  | "records";

const ACTION_LABELS: Record<AuditAction, string> = {
  CREATE: "Creación",
  UPDATE: "Actualización",
  DELETE: "Eliminación",
  VIEW: "Visualización",
  DOWNLOAD: "Descarga",
  SHARE: "Compartición",
  REVOKE: "Revocación",
  SUBMIT: "Envío",
  APPROVE: "Aprobación",
  REJECT: "Rechazo",
  REQUEST_CHANGES: "Solicitud de cambios",
  CANCEL: "Cancelación",
  COMPLETE: "Finalización",
  REASSIGN: "Reasignación",
  RESTORE: "Restauración",
  ARCHIVE: "Archivo",
  LOGIN: "Inicio de sesión",
  LOGOUT: "Cierre de sesión",
};

const RESOURCE_LABELS: Record<AuditResource, string> = {
  DOCUMENT: "Documento",
  DOCUMENT_VERSION: "Versión del documento",
  DOCUMENT_TEMPLATE: "Plantilla",
  WORKFLOW: "Flujo de trabajo",
  USER: "Usuario",
  ROLE: "Rol",
  PERMISSION: "Permiso",
  DIRECTORY: "Directorio",
  CATEGORY: "Categoría",
  SECTION: "Sección",
  SHARE: "Compartición",
  SESSION: "Sesión",
  SYSTEM: "Sistema",
};

/** Safe Spanish labels for the sanitized metadata keys the backend emits. */
const METADATA_LABELS: Record<string, string> = {
  before: "Antes",
  after: "Después",
  description: "Descripción",
  categoryId: "Categoría",
  documentTypeId: "Tipo de documento",
  isPublic: "Público",
  directoryId: "Directorio",
  restoredFromTrash: "Restaurado desde la papelera",
  restoredFromArchive: "Restaurado desde el archivo",
  permanent: "Eliminación permanente",
};

const STATUS_MESSAGES: Record<Exclude<AuditViewState, "records">, string> = {
  denied:
    "No tiene autorización para consultar la auditoría de este documento.",
  loading: "Cargando registros de auditoría…",
  forbidden:
    "No tiene autorización para consultar la auditoría de este documento.",
  invalid: "El identificador del documento no es válido.",
  error: "No se pudieron cargar los registros de auditoría.",
  empty: "No hay registros de auditoría para este documento.",
};

export function isPermissionDenied(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("response" in error)) return false;
  const response = (error as { response?: { status?: number } }).response;
  return response?.status === 403;
}

export function resolveAuditState(input: {
  authorized: boolean;
  loading?: boolean;
  documentValid?: boolean;
  error?: unknown;
  eventCount?: number;
}): AuditViewState {
  if (!input.authorized) return "denied";
  if (input.loading) return "loading";
  if (input.documentValid === false) return "invalid";
  if (input.error) return isPermissionDenied(input.error) ? "forbidden" : "error";
  return (input.eventCount ?? 0) > 0 ? "records" : "empty";
}

export interface AuditViewProps {
  state: AuditViewState;
  events?: DocumentAuditEvent[];
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
}

function labelFor(key: string): string {
  return METADATA_LABELS[key] ?? key;
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return format(date, "PPpp", { locale: es });
}

function MetadataValue({ value }: { value: unknown }) {
  if (value === null || value === undefined) return <span>Sin datos</span>;
  if (typeof value === "boolean") return <span>{value ? "Sí" : "No"}</span>;
  if (typeof value === "string" || typeof value === "number")
    return <span>{String(value)}</span>;
  if (Array.isArray(value)) {
    return (
      <ul className="list-disc space-y-1 pl-4">
        {value.map((item, index) => (
          <li key={index}>
            <MetadataValue value={item} />
          </li>
        ))}
      </ul>
    );
  }
  return <MetadataEntries metadata={value as Record<string, unknown>} />;
}

function MetadataEntries({ metadata }: { metadata: Record<string, unknown> }) {
  const entries = Object.entries(metadata);
  if (entries.length === 0) return <span>Sin datos</span>;
  return (
    <dl className="space-y-1">
      {entries.map(([key, value]) => (
        <div key={key} className="flex flex-col gap-0.5 sm:flex-row sm:gap-2">
          <dt className="font-medium text-muted-foreground">{labelFor(key)}</dt>
          <dd>
            <MetadataValue value={value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function AuditEventItem({ event }: { event: DocumentAuditEvent }) {
  const [open, setOpen] = useState(false);
  const actor = event.actorName || event.actorEmail || "Actor no disponible";
  const hasMetadata =
    !!event.metadata && Object.keys(event.metadata).length > 0;

  return (
    <li className="rounded-md border p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">
          {ACTION_LABELS[event.action] ?? event.action}
        </Badge>
        <span className="font-medium">{actor}</span>
        <span className="text-muted-foreground">
          {formatTimestamp(event.createdAt)}
        </span>
      </div>

      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="mt-2 h-7 px-2">
            <ChevronDown
              className={`mr-1 h-3.5 w-3.5 transition-transform ${open ? "rotate-180" : ""}`}
              aria-hidden
            />
            Detalles
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2 space-y-3 border-t pt-3">
          <dl>
            <div className="flex gap-2">
              <dt className="font-medium text-muted-foreground">Recurso</dt>
              <dd>
                {RESOURCE_LABELS[event.resource] ?? event.resource}
              </dd>
            </div>
          </dl>
          {hasMetadata ? (
            <div>
              <p className="mb-1 font-medium text-muted-foreground">
                Cambios registrados
              </p>
              <MetadataEntries
                metadata={event.metadata as Record<string, unknown>}
              />
            </div>
          ) : (
            <p className="text-muted-foreground">Sin metadatos adicionales.</p>
          )}
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}

export function AuditView({
  state,
  events = [],
  page = 1,
  totalPages = 1,
  onPageChange,
}: AuditViewProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Registro de actividad</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {state === "records" ? (
          <>
            <ul aria-label="Registros de auditoría" className="space-y-2">
              {events.map((event) => (
                <AuditEventItem key={event.id} event={event} />
              ))}
            </ul>
            {totalPages > 1 && onPageChange ? (
              <nav
                aria-label="Paginación de auditoría"
                className="flex items-center justify-center gap-2 pt-2"
              >
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => onPageChange(page - 1)}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" aria-hidden />
                  Anterior
                </Button>
                <span className="px-2 text-sm text-muted-foreground">
                  Página {page} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => onPageChange(page + 1)}
                >
                  Siguiente
                  <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
                </Button>
              </nav>
            ) : null}
          </>
        ) : (
          <p
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 text-sm"
          >
            {state === "loading" && (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            )}
            {STATUS_MESSAGES[state]}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
