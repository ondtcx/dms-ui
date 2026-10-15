"use client";

import { Plus, Upload, FolderInput } from "lucide-react";
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
  // Se conservan por compatibilidad con flujos internos que aún los cablean,
  // aunque el menú compartido ya no muestre opciones de plantilla, editor o lote.
  onFromTemplate?: () => void;
  onBatchGenerate?: () => void;
  onCreateInEditor?: () => void;
  "aria-label"?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Deshabilita solo las dos opciones de carga; el resto de llamadas no cambia. */
  uploadDisabled?: boolean;
}

export function NewDocumentButton({
  onUploadSingle,
  onUploadMultiple,
  "aria-label": ariaLabel,
  open,
  onOpenChange,
  uploadDisabled = false,
}: NewDocumentButtonProps) {
  // Guarda el manejador además del atributo `disabled` para que ningún consumidor
  // pueda disparar una carga denegada por vía programática.
  const guard = (callback: () => void) => () => {
    if (uploadDisabled) return;
    callback();
  };

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button size="default" className="gap-2" aria-label={ariaLabel}>
          <Plus className="h-4 w-4" />
          Nuevo
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Crear Documento</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          disabled={uploadDisabled}
          onClick={guard(onUploadSingle)}
        >
          <Upload className="mr-2 h-4 w-4" />
          <span>Subir Archivo</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          disabled={uploadDisabled}
          onClick={guard(onUploadMultiple)}
        >
          <FolderInput className="mr-2 h-4 w-4" />
          <span>Subir Múltiples Archivos</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
