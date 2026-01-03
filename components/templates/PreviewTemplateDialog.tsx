"use client";

import { useState, useEffect } from "react";
import { templatesService } from "@/lib/services/templates.service";
import { DocumentTemplate } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, FileSearch, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PreviewTemplateDialogProps {
  template: DocumentTemplate;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PreviewTemplateDialog({
  template,
  open,
  onOpenChange,
}: PreviewTemplateDialogProps) {
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (open && template) {
      loadPreview();
    }

    // Cleanup
    return () => {
      if (previewUrl) {
        window.URL.revokeObjectURL(previewUrl);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, template?.id]);

  const loadPreview = async () => {
    setLoading(true);
    setError("");

    try {
      const blob = await templatesService.preview(template.id);
      const url = window.URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (err) {
      console.error("Error loading preview:", err);
      setError("Error al cargar la vista previa de la plantilla");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSearch className="h-5 w-5" />
            Vista Previa: {template.name}
          </DialogTitle>
          <DialogDescription>
            Previsualización con datos de ejemplo
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 relative">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full">
              <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Generando vista previa...
              </p>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : previewUrl ? (
            <iframe
              src={previewUrl}
              className="w-full h-full border rounded-md"
              title={`Preview: ${template.name}`}
            />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
