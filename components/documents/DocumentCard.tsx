"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Download,
  File,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType,
  FileUp,
  Files,
  FolderInput,
  History,
  MoreVertical,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Document } from "@/lib/types";
import { readDocumentActionCapabilities } from "@/lib/document-action-capabilities";
import { SharingDialog } from "./SharingDialog";
import { RequestChangesDialog } from "./RequestChangesDialog";
import { SharingIndicator } from "./SharingIndicator";

export interface DocumentCardProps {
  doc: Document;
  isSelected: boolean;
  onToggle: (doc: Document) => void;
  thumbnailUrl: string | undefined;
  onPreview: (doc: Document) => void;
  onDownload: (id: number, filename: string) => void;
  onShowVersionHistory: (doc: Document) => void;
  onEdit: (doc: Document) => void;
  onReplaceFile: (doc: Document) => void;
  onDelete: (id: number) => void;
  canDelete: boolean;
  isOwn: boolean;
  isDeleting: boolean;
  onMove: (doc: Document) => void;
  actorId?: string | null;
}

function getFileIcon(mimetype: string, hasTemplate: boolean) {
  if (hasTemplate) return FileType;
  if (mimetype.startsWith("image/")) return FileImage;
  if (mimetype.includes("pdf")) return FileText;
  if (mimetype.includes("spreadsheet") || mimetype.includes("excel")) return FileSpreadsheet;
  if (mimetype.includes("json") || mimetype.includes("xml") || mimetype.includes("code")) {
    return FileCode;
  }
  return File;
}

/** Etiqueta del recuento: solo se muestra cuando el dato es un entero positivo. */
function pageCountLabel(pageCount: number | null | undefined): string | null {
  if (!Number.isInteger(pageCount) || (pageCount as number) < 1) return null;
  return pageCount === 1 ? "1 página" : `${pageCount} páginas`;
}

export function DocumentCard({
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
  isDeleting,
  onMove,
  actorId,
}: DocumentCardProps) {
  const [showSharing, setShowSharing] = useState(false);
  const [showRequestChanges, setShowRequestChanges] = useState(false);
  const version = doc.versions?.[0];
  const capabilities = readDocumentActionCapabilities(doc, actorId);
  const canManageSharing = capabilities?.scope === "ordinary" && capabilities.manageSharing === true;
  const filename = version?.filename ?? "";
  const displayName = doc.name?.trim() || filename;
  const description = doc.description?.trim() ?? "";
  const FileIcon = getFileIcon(version?.mimetype ?? "", !!doc.template);
  const titleId = `document-card-title-${doc.id}`;
  const uploadDate = doc.createdAt ? new Date(doc.createdAt) : null;
  const validUploadDate = uploadDate && Number.isFinite(uploadDate.getTime());
  const pageLabel = pageCountLabel(version?.pageCount);

  return (
    <li className="min-w-0">
      <article
        aria-labelledby={titleId}
        className="flex h-full min-w-0 flex-col gap-2 rounded-md border border-border/70 bg-card p-2.5 shadow-none"
      >
        <div className="relative aspect-[4/3] min-h-40 overflow-hidden rounded-md border border-border/70 bg-muted">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onPreview(doc)}
            aria-label={`Vista previa de ${displayName}`}
            className="h-full w-full rounded-md p-0 hover:bg-transparent"
          >
            {thumbnailUrl ? (
              <img src={thumbnailUrl} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              <div
                role="img"
                aria-label="Vista previa no disponible"
                className="flex h-full w-full items-center justify-center"
              >
                <FileIcon className="h-10 w-10 text-muted-foreground" />
              </div>
            )}
          </Button>
          <div className="absolute left-2 top-2 z-10 rounded-md bg-background/90 p-1 shadow-sm">
            <Checkbox
              checked={isSelected}
              aria-label={`Seleccionar ${displayName}`}
              onCheckedChange={() => onToggle(doc)}
            />
          </div>
        </div>

        <header className="flex min-w-0 items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 id={titleId} className="min-w-0 break-words font-medium text-sm leading-tight [overflow-wrap:anywhere]">
              <Link href={`/dashboard/documents/${doc.id}`} className="break-words hover:underline [overflow-wrap:anywhere]">
                {displayName}
              </Link>
            </h3>
            <SharingIndicator summary={doc.sharingSummary} provenance={doc.sharingProvenance} reception={capabilities?.scope === "reception"} />
            {description && (
              <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{description}</p>
            )}
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="flex min-w-0 items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {validUploadDate ? (
                  <time dateTime={doc.createdAt}>
                    {uploadDate.toLocaleDateString("es-ES", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </time>
                ) : (
                  <span>Fecha no disponible</span>
                )}
              </span>
              {pageLabel && (
                <span className="flex min-w-0 items-center gap-1.5">
                  <Files className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  {pageLabel}
                </span>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8 shadow-none" aria-label="Más acciones">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {doc.canRequestChanges === true && <DropdownMenuItem onClick={() => setShowRequestChanges(true)}>Solicitar cambios</DropdownMenuItem>}
              <DropdownMenuItem onClick={() => onDownload(doc.id, filename)}>
                <Download className="mr-2 h-4 w-4" />
                Descargar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onShowVersionHistory(doc)}>
                <History className="mr-2 h-4 w-4" />
                Ver Versiones
              </DropdownMenuItem>
              {canManageSharing && (
                <DropdownMenuItem onClick={() => setShowSharing(true)}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Compartir
                </DropdownMenuItem>
              )}

              {capabilities && (
                <>
                  {capabilities.editMetadata && (
                  <DropdownMenuItem onClick={() => onEdit(doc)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar Info
                  </DropdownMenuItem>
                  )}
                  {capabilities.editContent && (
                  <DropdownMenuItem onClick={() => onReplaceFile(doc)}>
                    <FileUp className="mr-2 h-4 w-4" />
                    Reemplazar Archivo
                  </DropdownMenuItem>
                  )}
                  {capabilities.trash && (<>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(doc.id)}
                    className="text-destructive focus:text-destructive"
                    disabled={isDeleting}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </DropdownMenuItem>
                  </>)}
                </>
              )}
              {capabilities?.move && (<DropdownMenuItem onClick={() => onMove(doc)}>
                <FolderInput className="mr-2 h-4 w-4" />
                Mover a carpeta
              </DropdownMenuItem>)}
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* El diálogo vive fuera del menú: al cerrarse el menú no debe desmontarse. */}
        {showSharing && canManageSharing && (
          <SharingDialog key={doc.id} documentId={doc.id} open onOpenChange={setShowSharing} />
        )}
        {showRequestChanges && <RequestChangesDialog key={doc.id} documentId={doc.id} open onOpenChange={setShowRequestChanges} />}
      </article>
    </li>
  );
}
