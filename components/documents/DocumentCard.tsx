"use client";

import Link from "next/link";
import {
  Download,
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
  isDeleting,
  onMove,
}: DocumentCardProps) {
  const version = doc.versions?.[0];
  const filename = version?.filename ?? "";
  const FileIcon = getFileIcon(version?.mimetype ?? "", !!doc.template);
  const titleId = `document-card-title-${doc.id}`;

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
            aria-label={`Vista previa de ${filename}`}
            className="h-full w-full rounded-md p-0 hover:bg-transparent"
          >
            {thumbnailUrl ? (
              <img src={thumbnailUrl} alt={filename} className="h-full w-full object-cover" />
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
              aria-label={`Seleccionar ${filename}`}
              onCheckedChange={() => onToggle(doc)}
            />
          </div>
        </div>

        <header className="flex min-w-0 items-start justify-between gap-2">
          <h3 id={titleId} className="min-w-0 break-words font-medium text-sm leading-tight [overflow-wrap:anywhere]">
            <Link href={`/dashboard/documents/${doc.id}`} className="break-words hover:underline [overflow-wrap:anywhere]">
              {filename}
            </Link>
          </h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8 shadow-none" aria-label="Más acciones">
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onDownload(doc.id, filename)}>
                <Download className="mr-2 h-4 w-4" />
                Descargar
              </DropdownMenuItem>
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
                Mover a carpeta
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
      </article>
    </li>
  );
}
