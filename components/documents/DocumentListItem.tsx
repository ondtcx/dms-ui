"use client";

import Link from "next/link";
import { useState } from "react";
import { RequestChangesDialog } from "./RequestChangesDialog";
import {
  FileText,
  Download,
  Trash2,
  User,
  Filter,
  FileType,
  Eye,
  History,
  FileUp,
  Pencil,
  MoreVertical,
  FileImage,
  FileSpreadsheet,
  FileCode,
  File,
  Lock,
  Unlock,
  Calendar,
  FolderInput,
} from "lucide-react";
import { Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Document } from "@/lib/types";
import { readDocumentActionCapabilities } from "@/lib/document-action-capabilities";
import { formatMimeType, formatRole, formatFileSize } from "@/lib/utils";
import { WORKFLOW_STATUS_CONFIG } from "@/lib/workflow-status-config";

// ─── Helpers (solo usados en este componente) ─────────────────────────────────

function getFileIcon(mimetype: string, hasTemplate: boolean) {
  if (hasTemplate) return FileType;
  if (mimetype.startsWith("image/")) return FileImage;
  if (mimetype.includes("pdf")) return FileText;
  if (mimetype.includes("spreadsheet") || mimetype.includes("excel")) return FileSpreadsheet;
  if (mimetype.includes("json") || mimetype.includes("xml") || mimetype.includes("code")) return FileCode;
  return File;
}


function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getOwnerName(doc: Document): string {
  return doc.uploadedBy?.name?.trim() || "Propietario no disponible";
}

function getFilePreviewContent(doc: Document): string {
  if (doc.description) {
    return doc.description.length > 150
      ? doc.description.substring(0, 150) + "..."
      : doc.description;
  }
  if (doc.template) {
    return `Documento generado desde plantilla "${doc.template.name}"${doc.template.documentType ? ` • Tipo: ${doc.template.documentType.name}` : ""}`;
  }
  const fileType = formatMimeType(((doc?.versions?.[0]?.mimetype) ?? ''));
  const uploadInfo = `Subido por ${getOwnerName(doc)} el ${formatDate(doc.createdAt)}`;
  return `Archivo ${fileType} • ${uploadInfo}`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

import { DocumentSharingAction } from './DocumentSharingAction';
import { SharingIndicator } from './SharingIndicator';

interface DocumentListItemProps {
  doc: Document;
  index: number;
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

// ─── Component ────────────────────────────────────────────────────────────────

export function DocumentListItem({
  doc,
  index,
  isSelected,
  onToggle,
  thumbnailUrl,
  onPreview,
  onDownload,
  onShowVersionHistory,
  onEdit,
  onReplaceFile,
  onDelete,
  isOwn,
  isDeleting,
  onMove,
  actorId,
}: DocumentListItemProps) {
  const [showRequestChanges, setShowRequestChanges] = useState(false);
  const FileIcon = getFileIcon(((doc?.versions?.[0]?.mimetype) ?? ''), !!doc.template);
  const previewContent = getFilePreviewContent(doc);
  const capabilities = readDocumentActionCapabilities(doc, actorId);
  const displayName = doc.name?.trim() || doc.versions?.[0]?.filename || "";
  const ownerName = getOwnerName(doc);
  const ownerInitials = doc.uploadedBy?.name?.trim()
    ? ownerName
        .split(/\s+/)
        .slice(0, 2)
        .map((name) => name[0])
        .join("")
        .toUpperCase()
    : "?";

  return (
    <div>
      {index > 0 && <Separator />}
      {showRequestChanges && <RequestChangesDialog key={doc.id} documentId={doc.id} open onOpenChange={setShowRequestChanges} />}
      <div className="py-4 flex gap-4">
        {/* Checkbox */}
        <div className="flex items-start pt-1">
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onToggle(doc)}
          />
        </div>

        {/* Thumbnail */}
        <div className="flex-shrink-0">
          <div className="w-20 h-20 rounded-lg border-2 border-border bg-muted flex items-center justify-center overflow-hidden relative">
            {thumbnailUrl ? (
              <img
                src={thumbnailUrl}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <FileIcon className="h-10 w-10 text-muted-foreground" />
            )}
            {!isOwn && (
              <div
                className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-bold ring-2 ring-background"
                title={ownerName}
              >
                {ownerInitials}
              </div>
            )}
          </div>
        </div>

        {/* Contenido principal */}
        <div className="flex-1 min-w-0">
          {/* Header con título y acciones */}
          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex-1 min-w-0">
              {doc.documentNumber && (
                <span className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded mb-1 inline-block">
                  {doc.documentNumber}
                </span>
              )}
              <h3 className="font-medium text-lg leading-tight">
                <Link href={`/dashboard/documents/${doc.id}`} className="hover:underline">
                  {displayName}
                </Link>
              </h3>
            </div>

            {/* Botones de acción */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Button onClick={() => onPreview(doc)} variant="outline" size="sm">
                <Eye className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Ver</span>
              </Button>

              <Button onClick={() => onDownload(doc.id, ((doc?.versions?.[0]?.filename) ?? ''))} variant="default" size="sm">
                <Download className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Descargar</span>
              </Button>

              <DocumentSharingAction document={doc} />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {doc.canRequestChanges === true && <DropdownMenuItem onClick={() => setShowRequestChanges(true)}>Solicitar cambios</DropdownMenuItem>}
                  <DropdownMenuItem onClick={() => onShowVersionHistory(doc)}>
                    <History className="mr-2 h-4 w-4" />
                    Ver Versiones
                  </DropdownMenuItem>

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
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <SharingIndicator summary={doc.sharingSummary} provenance={doc.sharingProvenance} reception={capabilities?.scope === "reception"} />
            {doc.category && (
              <Badge
                variant="outline"
                className="gap-1"
                style={{ borderColor: doc.category.color }}
              >
                <Filter className="h-3 w-3" style={{ color: doc.category.color }} />
                <span style={{ color: doc.category.color }}>{doc.category.name}</span>
              </Badge>
            )}
            {doc.template && (
              <Badge variant="default" className="gap-1">
                <FileType className="h-3 w-3" />
                {doc.template.documentType?.name ?? doc.template.name}
              </Badge>
            )}
            {doc.isComposite && (
              <Badge variant="secondary" className="gap-1">
                <Layers className="h-3 w-3" />
                Informe Compuesto
              </Badge>
            )}
            {doc.workflow && (() => {
              const workflowStatus = WORKFLOW_STATUS_CONFIG[doc.workflow.status];
              return workflowStatus ? <Badge variant={workflowStatus.variant}>{workflowStatus.label}</Badge> : null;
            })()}
            {doc.isPublic ? (
              <Badge variant="outline" className="gap-1">
                <Unlock className="h-3 w-3" />
                Público
              </Badge>
            ) : (
              <Badge variant="secondary" className="gap-1">
                <Lock className="h-3 w-3" />
                {doc.sharingSummary?.public ? 'Privado local' : 'Privado'}
              </Badge>
            )}
          </div>

          {/* Preview texto */}
          <p
            className="text-sm text-muted-foreground mb-2"
            style={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {previewContent}
          </p>

          {/* Metadata footer */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" />
              {formatFileSize(((doc?.versions?.[0]?.size) ?? 0))}
            </span>
            <span className="flex items-center gap-1">
              <User className="h-3 w-3" />
              {isOwn ? (
                <span className="text-primary font-medium">Tú</span>
              ) : (
                <>
                  {ownerName}
                  {doc.uploadedBy?.role && (
                    <span className="text-muted-foreground/60">· {formatRole(doc.uploadedBy.role)}</span>
                  )}
                </>
              )}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDate(doc.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
