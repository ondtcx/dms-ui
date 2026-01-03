"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { documentsService } from "@/lib/services/documents.service";
import toast from "react-hot-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, FileUp } from "lucide-react";

interface ReplaceFileDialogProps {
  documentId: number;
  documentName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ReplaceFileDialog({
  documentId,
  documentName,
  open,
  onOpenChange,
}: ReplaceFileDialogProps) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [comment, setComment] = useState("");

  const replaceMutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("No se ha seleccionado un archivo");
      return documentsService.replaceFile(documentId, file, comment || undefined);
    },
    onSuccess: () => {
      toast.success("Archivo reemplazado exitosamente. Nueva versión creada.");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["document", documentId] });
      queryClient.invalidateQueries({ queryKey: ["document-versions", documentId] });
      handleClose();
    },
    onError: (error: unknown) => {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message || "Error al reemplazar el archivo";
      toast.error(message);
    },
  });

  const handleClose = () => {
    setFile(null);
    setComment("");
    onOpenChange(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error("Por favor selecciona un archivo");
      return;
    }
    replaceMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5" />
            Reemplazar Archivo
          </DialogTitle>
          <DialogDescription>
            Al reemplazar el archivo, se creará una nueva versión automáticamente.
            El archivo anterior se mantendrá en el historial.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-700">
              Documento actual
            </Label>
            <p className="text-sm text-gray-600 mt-1">{documentName}</p>
          </div>

          <div>
            <Label htmlFor="file" className="text-sm font-medium">
              Nuevo archivo *
            </Label>
            <Input
              id="file"
              type="file"
              onChange={handleFileChange}
              required
              className="mt-1"
            />
            {file && (
              <p className="text-xs text-gray-500 mt-1">
                Archivo seleccionado: {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="comment" className="text-sm font-medium">
              Comentario (opcional)
            </Label>
            <Textarea
              id="comment"
              placeholder="Describe los cambios realizados en esta versión..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="mt-1"
              rows={3}
            />
            <p className="text-xs text-gray-500 mt-1">
              Este comentario aparecerá en el historial de versiones
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={replaceMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!file || replaceMutation.isPending}
            >
              <Upload className="h-4 w-4 mr-2" />
              {replaceMutation.isPending ? "Subiendo..." : "Reemplazar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
