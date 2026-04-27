"use client";

import { FolderInput, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NewDocumentButtonProps {
  onUploadSingle: () => void;
  onUploadMultiple: () => void;
}

export function NewDocumentButton({
  onUploadSingle,
  onUploadMultiple,
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
        <DropdownMenuItem onClick={onUploadSingle}>
          <Upload className="mr-2 h-4 w-4" />
          <span>Subir Archivo</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={onUploadMultiple}>
          <FolderInput className="mr-2 h-4 w-4" />
          <span>Subir Múltiples Archivos</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
