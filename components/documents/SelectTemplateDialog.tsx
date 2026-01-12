"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { templatesService } from "@/lib/services/templates.service";
import { DocumentTemplate } from "@/lib/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Loader2, ExternalLink, FileSearch } from "lucide-react";
import { PreviewTemplateDialog } from "@/components/templates/PreviewTemplateDialog";
import Link from "next/link";

interface SelectTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SelectTemplateDialog({
  open,
  onOpenChange,
}: SelectTemplateDialogProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewingTemplate, setPreviewingTemplate] = useState<DocumentTemplate | null>(null);

  // Queries
  const { data: templates, isLoading } = useQuery({
    queryKey: ["templates", searchTerm],
    queryFn: () =>
      templatesService.getAll({
        search: searchTerm || undefined,
        page: 1,
        limit: 50,
      }),
    enabled: open, // Solo cargar cuando el dialog está abierto
  });

  const handleSelectTemplate = (template: DocumentTemplate) => {
    onOpenChange(false); // Cerrar el dialog
    router.push(`/dashboard/templates/${template.id}/create`);
  };

  const handlePreviewTemplate = (template: DocumentTemplate, e: React.MouseEvent) => {
    e.stopPropagation(); // Evitar que se active el click del card
    setPreviewingTemplate(template);
    setShowPreviewDialog(true);
  };

  // Filtrar solo plantillas activas
  const activeTemplates = templates?.data.filter((t) => t.isActive) || [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Seleccionar Plantilla</DialogTitle>
            <DialogDescription>
              Elige una plantilla para crear un nuevo documento
            </DialogDescription>
          </DialogHeader>

          {/* Búsqueda */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar plantillas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Grid de plantillas */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : activeTemplates.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? "No se encontraron plantillas" : "No hay plantillas disponibles"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeTemplates.map((template) => (
                <Card
                  key={template.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleSelectTemplate(template)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <Badge variant="outline">{template.type}</Badge>
                    </div>
                    {template.description && (
                      <CardDescription>{template.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button className="w-full" size="sm">
                      <FileText className="mr-2 h-4 w-4" />
                      Usar Plantilla
                    </Button>
                    <Button
                      className="w-full"
                      size="sm"
                      variant="outline"
                      onClick={(e) => handlePreviewTemplate(template, e)}
                    >
                      <FileSearch className="mr-2 h-4 w-4" />
                      Vista Previa
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Footer con link a ver todas las plantillas */}
          <DialogFooter className="border-t pt-4">
            <Link href="/dashboard/templates" className="w-full">
              <Button variant="outline" className="w-full" onClick={() => onOpenChange(false)}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Ver Todas las Plantillas
              </Button>
            </Link>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para previsualizar plantilla */}
      {previewingTemplate && (
        <PreviewTemplateDialog
          template={previewingTemplate}
          open={showPreviewDialog}
          onOpenChange={setShowPreviewDialog}
        />
      )}
    </>
  );
}
