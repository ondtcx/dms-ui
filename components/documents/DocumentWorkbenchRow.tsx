"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Download,
  Eye,
  File,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType,
  FileUp,
  FolderInput,
  History,
  MoreVertical,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { readDocumentActionCapabilities } from "@/lib/document-action-capabilities";
import type { Document } from "@/lib/types";
import { formatFileSize } from "@/lib/utils";
import { WORKFLOW_STATUS_CONFIG } from "@/lib/workflow-status-config";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { RequestChangesDialog } from "./RequestChangesDialog";
import { SharingDialog } from "./SharingDialog";
import { SharingIndicator } from "./SharingIndicator";
import { AuthoringStatusBadge } from "@/components/authoring/AuthoringStatusBadge";
import { ReviewStatusBadge } from "./ReviewStatusBadge";

interface DocumentWorkbenchRowProps {
  doc: Document;
  isSelected: boolean;
  onToggle: (doc: Document) => void;
  thumbnailUrl?: string;
  onPreview: (doc: Document) => void;
  onDownload: (id: number, filename: string) => void;
  onShowVersionHistory: (doc: Document) => void;
  onEdit: (doc: Document) => void;
  onReplaceFile: (doc: Document) => void;
  onDelete: (id: number) => void;
  onMove: (doc: Document) => void;
  isDeleting: boolean;
  actorId?: string | null;
}

function WorkbenchFileIcon({ doc }: { doc: Document }) {
  const mimetype = doc.versions?.[0]?.mimetype ?? "";
  if (doc.template) return <FileType className="h-4 w-4" aria-hidden="true" />;
  if (mimetype.startsWith("image/")) return <FileImage className="h-4 w-4" aria-hidden="true" />;
  if (mimetype.includes("pdf")) return <FileText className="h-4 w-4" aria-hidden="true" />;
  if (mimetype.includes("spreadsheet") || mimetype.includes("excel")) {
    return <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />;
  }
  if (mimetype.includes("json") || mimetype.includes("xml") || mimetype.includes("code")) {
    return <FileCode className="h-4 w-4" aria-hidden="true" />;
  }
  return <File className="h-4 w-4" aria-hidden="true" />;
}

export function DocumentWorkbenchRow({
  doc,
  isSelected,
  onToggle,
  thumbnailUrl,
  onPreview,
  onDownload,
  onShowVersionHistory,
  onEdit,
  onReplaceFile,
  onDelete,
  onMove,
  isDeleting,
  actorId,
}: DocumentWorkbenchRowProps) {
  const [showSharing, setShowSharing] = useState(false);
  const [showRequestChanges, setShowRequestChanges] = useState(false);
  const version = doc.versions?.[0];
  const filename = version?.filename ?? "";
  const displayName = doc.name?.trim() || filename || "Documento sin nombre";
  const capabilities = readDocumentActionCapabilities(doc, actorId ?? null);
  const workflow = doc.workflow ? WORKFLOW_STATUS_CONFIG[doc.workflow.status] : null;
  const categoryLabel = doc.documentType?.name ?? doc.template?.documentType?.name ?? doc.category?.name ?? "—";
  const folderLabel = doc.directory?.name ?? "Raíz";
  const templateLabel = doc.template?.name && doc.template.name !== categoryLabel ? doc.template.name : null;
  const updatedAt = doc.updatedAt ? new Date(doc.updatedAt) : null;
  const validUpdatedAt = updatedAt && Number.isFinite(updatedAt.getTime()) ? updatedAt : null;
  const relativeUpdated = validUpdatedAt
    ? formatDistanceToNow(validUpdatedAt, { addSuffix: true, locale: es })
    : "—";
  const fullUpdated = validUpdatedAt
    ? validUpdatedAt.toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })
    : "—";
  const sizeLabel = formatFileSize(version?.size ?? 0);
  const ownerName = doc.uploadedBy?.name?.trim() || "Propietario no disponible";
  const ownerLabel = doc.uploadedById === actorId ? "Tú" : ownerName;
  const versionLabel = doc.currentVersion ? `v${doc.currentVersion}` : "—";
  const shared = doc.sharingSummary?.shared === true || (doc.sharingProvenance?.length ?? 0) > 0;

  return (
    <>
      <tr className="align-top md:align-middle">
        <td className="w-10 py-2.5 pl-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggle(doc)}
            aria-label={`Seleccionar ${displayName}`}
          />
        </td>

        <td className="min-w-0 py-2.5">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted text-muted-foreground">
              {thumbnailUrl ? (
                <img src={thumbnailUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <WorkbenchFileIcon doc={doc} />
              )}
            </span>
            <div className="min-w-0">
              <Link
                href={`/dashboard/documents/${doc.id}`}
                className="block truncate text-sm font-medium hover:underline"
                title={displayName}
              >
                {displayName}
              </Link>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                {doc.documentNumber && (
                  <span className="font-mono">{doc.documentNumber}</span>
                )}
                <span>{ownerLabel}</span>
                <span>{versionLabel}</span>
                <span className="md:hidden">
                  <span className="sr-only">Tipo: </span>
                  {categoryLabel}
                </span>
                <span className="md:hidden">
                  <span className="sr-only">Carpeta: </span>
                  {folderLabel}
                </span>
                <span className="md:hidden">
                  <span className="sr-only">Tamaño: </span>
                  {sizeLabel}
                </span>
                <span className="md:hidden" title={fullUpdated}>
                  <span className="sr-only">Actualizado: </span>
                  {relativeUpdated}
                </span>
                {doc.authoring?.status ? (
                  <span className="md:hidden">
                    <AuthoringStatusBadge status={doc.authoring.status} />
                  </span>
                ) : doc.review?.status ? (
                  <span className="md:hidden">
                    <ReviewStatusBadge status={doc.review.status} />
                  </span>
                ) : workflow ? (
                  <Badge variant={workflow.variant} className="md:hidden">
                    {workflow.label}
                  </Badge>
                ) : null}
                {shared && (
                  <span className="md:hidden">
                    <SharingIndicator
                      summary={doc.sharingSummary}
                      provenance={doc.sharingProvenance}
                      reception={capabilities?.scope === "reception"}
                    />
                  </span>
                )}
              </div>
            </div>
          </div>
        </td>

        <td className="hidden px-3 py-2.5 md:table-cell">
          <div className="truncate text-sm" title={categoryLabel}>
            {categoryLabel}
          </div>
          {templateLabel && (
            <div
              className="truncate text-xs text-muted-foreground"
              title={templateLabel}
            >
              {templateLabel}
            </div>
          )}
        </td>

        <td className="hidden px-3 py-2.5 md:table-cell">
          <div className="truncate text-sm" title={folderLabel}>
            {folderLabel}
          </div>
        </td>

        <td
          className="hidden px-3 py-2.5 text-sm text-muted-foreground md:table-cell"
          title={fullUpdated}
        >
          {relativeUpdated}
        </td>

        <td className="hidden px-3 py-2.5 text-sm text-muted-foreground md:table-cell">
          {sizeLabel}
        </td>

        <td className="hidden px-3 py-2.5 md:table-cell">
          <div className="flex flex-wrap items-center gap-1">
            {doc.authoring?.status ? (
              <AuthoringStatusBadge status={doc.authoring.status} />
            ) : doc.review?.status ? (
              <ReviewStatusBadge status={doc.review.status} />
            ) : workflow ? (
              <Badge variant={workflow.variant}>{workflow.label}</Badge>
            ) : (
              <span className="text-xs text-muted-foreground">—</span>
            )}
            {shared && (
              <SharingIndicator
                summary={doc.sharingSummary}
                provenance={doc.sharingProvenance}
                reception={capabilities?.scope === "reception"}
              />
            )}
          </div>
        </td>

        <td className="py-2.5 pr-3 text-right">
          <div className="flex items-center justify-end gap-1">
            {capabilities?.manageSharing && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Compartir ${displayName}`}
                title="Compartir"
                onClick={() => setShowSharing(true)}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Acciones para ${displayName}`}
                  title="Acciones"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => onPreview(doc)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Vista previa
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDownload(doc.id, filename)}>
                  <Download className="mr-2 h-4 w-4" />
                  Descargar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onShowVersionHistory(doc)}>
                  <History className="mr-2 h-4 w-4" />
                  Historial de versiones
                </DropdownMenuItem>
                {doc.canRequestChanges === true && (
                  <DropdownMenuItem onClick={() => setShowRequestChanges(true)}>
                    Solicitar cambios
                  </DropdownMenuItem>
                )}
                {capabilities?.editMetadata && (
                  <DropdownMenuItem onClick={() => onEdit(doc)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar información
                  </DropdownMenuItem>
                )}
                {capabilities?.editContent && (
                  <DropdownMenuItem onClick={() => onReplaceFile(doc)}>
                    <FileUp className="mr-2 h-4 w-4" />
                    Reemplazar archivo
                  </DropdownMenuItem>
                )}
                {capabilities?.move && (
                  <DropdownMenuItem onClick={() => onMove(doc)}>
                    <FolderInput className="mr-2 h-4 w-4" />
                    Mover a carpeta
                  </DropdownMenuItem>
                )}
                {capabilities?.trash && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(doc.id)}
                      className="text-destructive focus:text-destructive"
                      disabled={isDeleting}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </td>
      </tr>

      {showSharing && (
        <SharingDialog
          key={doc.id}
          documentId={doc.id}
          open={showSharing}
          onOpenChange={setShowSharing}
        />
      )}
      {showRequestChanges && (
        <RequestChangesDialog
          key={doc.id}
          documentId={doc.id}
          open={showRequestChanges}
          onOpenChange={setShowRequestChanges}
        />
      )}
    </>
  );
}
