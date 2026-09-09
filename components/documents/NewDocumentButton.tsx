"use client";

import { Plus, FileText, Upload, Scan, FolderInput, Layers, PenLine } from "lucide-react";
import { usePermissions } from "@/hooks/use-permissions";
import { UserRole } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NewDocumentButtonProps {
  onUploadSingle: () => void;
  onUploadMultiple: () => void;
  onFromTemplate: () => void;
  onBatchGenerate?: () => void;
  onCreateInEditor?: () => void;
  "aria-label"?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function NewDocumentButton({
  onUploadSingle,
  onUploadMultiple,
  onFromTemplate,
  onBatchGenerate,
  onCreateInEditor,
  "aria-label": ariaLabel,
  open,
  onOpenChange,
}: NewDocumentButtonProps) {
  const { hasAnyRole } = usePermissions();
  const canUseTemplateCreation = hasAnyRole([UserRole.ADMIN, UserRole.RECTOR]);

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button size="default" className="gap-2 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100" aria-label={ariaLabel}>
          <Plus className="h-4 w-4" />
          Nuevo
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Crear Documento</DropdownMenuLabel>
        <DropdownMenuSeparator />

        {canUseTemplateCreation && (
          <DropdownMenuItem onClick={onFromTemplate}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Desde Plantilla</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onClick={onCreateInEditor}>
          <PenLine className="mr-2 h-4 w-4" />
          <span>Crear en Editor</span>
        </DropdownMenuItem>

        {canUseTemplateCreation && (
          <DropdownMenuItem onClick={onBatchGenerate}>
            <Layers className="mr-2 h-4 w-4" />
            <span>Generar en Lote</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={onUploadSingle}>
          <Upload className="mr-2 h-4 w-4" />
          <span>Subir Archivo</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={onUploadMultiple}>
          <FolderInput className="mr-2 h-4 w-4" />
          <span>Subir Múltiples Archivos</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem disabled>
          <Scan className="mr-2 h-4 w-4" />
          <span>Escanear Documento</span>
          <span className="ml-auto text-xs text-muted-foreground">Próximamente</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
