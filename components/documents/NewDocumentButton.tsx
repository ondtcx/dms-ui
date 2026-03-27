"use client";

import { Plus, FileText, Upload, Scan, FolderInput, Layers, PenLine } from "lucide-react";
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
}

export function NewDocumentButton({
  onUploadSingle,
  onUploadMultiple,
  onFromTemplate,
  onBatchGenerate,
  onCreateInEditor,
}: NewDocumentButtonProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="default" className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Crear Documento</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={onFromTemplate}>
          <FileText className="mr-2 h-4 w-4" />
          <span>Desde Plantilla</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={onCreateInEditor}>
          <PenLine className="mr-2 h-4 w-4" />
          <span>Crear en Editor</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={onBatchGenerate}>
          <Layers className="mr-2 h-4 w-4" />
          <span>Generar en Lote</span>
        </DropdownMenuItem>

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
