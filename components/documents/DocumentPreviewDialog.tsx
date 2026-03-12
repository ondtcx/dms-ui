import { Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Document } from "@/lib/types";

interface DocumentPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document | null;
  previewUrl: string | null;
  loadingPreview: boolean;
  onDownload: (id: number, filename: string) => void;
}

export function DocumentPreviewDialog({
  open,
  onOpenChange,
  document,
  previewUrl,
  loadingPreview,
  onDownload,
}: DocumentPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[90vw] sm:max-h-[90vh] h-[90vh]">
        <DialogHeader>
          <DialogTitle>Vista Previa: {document?.filename}</DialogTitle>
          <DialogDescription>
            {document?.description || "Previsualización del documento"}
          </DialogDescription>
        </DialogHeader>
        <div className="flex-1 min-h-0 h-full">
          {loadingPreview ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
              <p className="text-muted-foreground mt-4">
                Cargando vista previa...
              </p>
            </div>
          ) : previewUrl ? (
            <iframe
              src={previewUrl}
              className="w-full h-full border rounded-md"
              title={document?.filename}
            />
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          {document && (
            <Button
              onClick={() => onDownload(document.id, document.filename)}
              disabled={loadingPreview}
            >
              <Download className="mr-2 h-4 w-4" />
              Descargar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
