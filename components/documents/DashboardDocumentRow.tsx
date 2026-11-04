"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { WORKFLOW_STATUS_CONFIG } from "@/lib/workflow-status-config";
import { Badge } from "@/components/ui/badge";
import { DashboardDocumentRow as DashboardDocument } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface DashboardDocumentRowProps {
  document: DashboardDocument;
  pending?: boolean;
}

export function DashboardDocumentRow({ document, pending = false }: DashboardDocumentRowProps) {
  const filename = document.versions?.[0]?.filename || "Documento sin nombre";
  const displayName = document.name?.trim() || filename;
  const owner = document.uploadedBy?.name || "Propietario no disponible";
  const category = document.category?.name;
  const documentNumber = document.documentNumber;
  const currentVersion = document.versions?.[0]?.version;
  const versionLabel = currentVersion ? `Versión ${currentVersion}` : null;
  const workflowStatus = document.workflow
    ? WORKFLOW_STATUS_CONFIG[document.workflow.status]
    : null;
  const statusLabel = pending ? "Pendiente de oficialización" : workflowStatus?.label;
  const href = `/dashboard/documents/${document.id}`;

  return (
    <Link
      href={href}
      className="group flex min-w-0 flex-col items-stretch gap-2 rounded-lg px-3 py-3 outline-none motion-safe:transition-colors motion-reduce:transition-none hover:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center"
      aria-label={`${displayName}. ${statusLabel ?? "Documento"}. Actualizado ${formatDistanceToNow(new Date(document.updatedAt), { addSuffix: true, locale: es })}`}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        <FileText className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium group-hover:underline" title={displayName}>
          {displayName}
        </span>
        <span className="block truncate text-xs text-muted-foreground">
          {documentNumber ? (
            <span className="font-mono">{documentNumber} · </span>
          ) : null}
          {versionLabel ? `${versionLabel} · ` : ""}
          {owner}
          {category ? ` · ${category}` : ""}
        </span>
      </span>
      <span className="flex shrink-0 items-center justify-between gap-2 sm:justify-end">
        {workflowStatus && (
          <Badge variant={workflowStatus.variant}>{workflowStatus.label}</Badge>
        )}
        {pending && !workflowStatus && <Badge variant="outline">Borrador</Badge>}
        <span className="hidden text-xs text-muted-foreground sm:inline">
          {formatDistanceToNow(new Date(document.updatedAt), { addSuffix: true, locale: es })}
        </span>
      </span>
    </Link>
  );
}
