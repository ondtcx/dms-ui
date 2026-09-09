"use client";

import Link from "next/link";
import {
  Calendar,
  Download,
  Eye,
  File,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileType,
  FileUp,
  Filter,
  FolderInput,
  History,
  Layers,
  Lock,
  MoreVertical,
  Pencil,
  Trash2,
  Unlock,
  User,
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
import type { Document } from "@/lib/types";
import { formatFileSize, formatMimeType, formatRole } from "@/lib/utils";
import { WORKFLOW_STATUS_CONFIG } from "@/lib/workflow-status-config";

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
      ? `${doc.description.substring(0, 150)}...`
      : doc.description;
  }

  if (doc.template) {
    return `Documento generado desde plantilla "${doc.template.name}"${
      doc.template.documentType ? ` • Tipo: ${doc.template.documentType.name}` : ""
    }`;
  }

  const fileType = formatMimeType(doc.versions?.[0]?.mimetype ?? "");
  return `Archivo ${fileType} • Subido por ${getOwnerName(doc)} el ${formatDate(doc.createdAt)}`;
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
  canDelete,
  isOwn,
  isDeleting,
  onMove,
}: DocumentCardProps) {
  const version = doc.versions?.[0];
  const filename = version?.filename ?? "";
  const FileIcon = getFileIcon(version?.mimetype ?? "", !!doc.template);
  const ownerName = getOwnerName(doc);
  const ownerInitials = doc.uploadedBy?.name?.trim()
    ? ownerName
        .split(/\s+/)
        .slice(0, 2)
        .map((name) => name[0])
        .join("")
        .toUpperCase()
    : "?";
  const titleId = `document-card-title-${doc.id}`;

  return (
    <li className="min-w-0">
      <article
        aria-labelledby={titleId}
        className="flex h-full min-w-0 flex-col gap-4 rounded-lg border bg-card p-4 shadow-xs"
      >
        <header className="min-w-0">
          {doc.documentNumber && (
            <span className="mb-1 inline-block rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
              {doc.documentNumber}
            </span>
          )}
          <h3 id={titleId} className="min-w-0 break-words font-medium text-lg leading-tight">
            <Link href={`/dashboard/documents/${doc.id}`} className="break-words hover:underline">
              {filename}
            </Link>
          </h3>
        </header>

        <div className="relative flex min-h-40 items-center justify-center overflow-hidden rounded-lg border-2 border-border bg-muted">
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt={filename} className="h-full w-full object-cover" />
          ) : (
            <div
              role="img"
              aria-label="Vista previa no disponible"
              className="flex h-full min-h-40 w-full items-center justify-center"
            >
              <FileIcon className="h-12 w-12 text-muted-foreground" />
            </div>
          )}
          {!isOwn && (
            <div
              className="absolute bottom-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white ring-2 ring-background"
              title={ownerName}
            >
              {ownerInitials}
            </div>
          )}
        </div>

        <div className="flex items-start gap-2">
          <Checkbox
            checked={isSelected}
            aria-label={`Seleccionar ${filename}`}
            onCheckedChange={() => onToggle(doc)}
          />
          <span className="text-sm text-muted-foreground">Seleccionar documento</span>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {doc.category && (
            <Badge variant="outline" className="gap-1" style={{ borderColor: doc.category.color }}>
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
              Privado
            </Badge>
          )}
        </div>

        <p className="min-w-0 break-words text-sm text-muted-foreground">
          {getFilePreviewContent(doc)}
        </p>

        <div className="flex min-w-0 flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <FileText className="h-3 w-3" />
            {formatFileSize(version?.size ?? 0)}
          </span>
          <span className="flex items-center gap-1 break-words">
            <User className="h-3 w-3 shrink-0" />
            {isOwn ? (
              <span className="font-medium text-primary">Tú</span>
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

        <div className="mt-auto flex min-w-0 flex-wrap items-center gap-2">
          <Button onClick={() => onPreview(doc)} variant="outline" size="sm">
            <Eye className="h-4 w-4" />
            <span>Ver</span>
          </Button>
          <Button
            onClick={() => onDownload(doc.id, filename)}
            variant="default"
            size="sm"
          >
            <Download className="h-4 w-4" />
            <span>Descargar</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Más acciones">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onShowVersionHistory(doc)}>
                <History className="mr-2 h-4 w-4" />
                Ver Versiones
              </DropdownMenuItem>

              {canDelete && (
                <>
                  <DropdownMenuItem onClick={() => onEdit(doc)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Editar Info
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onReplaceFile(doc)}>
                    <FileUp className="mr-2 h-4 w-4" />
                    Reemplazar Archivo
                  </DropdownMenuItem>
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
              <DropdownMenuItem onClick={() => onMove(doc)}>
                <FolderInput className="mr-2 h-4 w-4" />
                Mover a directorio
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </article>
    </li>
  );
}
