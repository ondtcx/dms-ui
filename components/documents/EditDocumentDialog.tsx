"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { documentsService } from "@/lib/services/documents.service";
import { categoriesService } from "@/lib/services/categories.service";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Save } from "lucide-react";
import { Document, PilotDocumentStatus } from "@/lib/types";

interface EditDocumentDialogProps {
  document: Document;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditDocumentDialog({
  document,
  open,
  onOpenChange,
}: EditDocumentDialogProps) {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    title: document.title || "",
    filename: ((document?.versions?.[0]?.filename) ?? ''),
    description: document.description || "",
    documentDate: document.documentDate ? document.documentDate.slice(0, 10) : "",
    sender: document.sender || "",
    recipient: document.recipient || "",
    keywords: document.keywords || "",
    status: document.status,
    physicalBuilding: document.physicalBuilding || "",
    physicalOffice: document.physicalOffice || "",
    physicalArchive: document.physicalArchive || "",
    physicalBox: document.physicalBox || "",
    physicalNotes: document.physicalNotes || "",
    categoryId: document.categoryId,
    isPublic: document.isPublic,
  });

  // Actualizar form cuando cambia el documento
  useEffect(() => {
    setFormData({
      title: document.title || "",
      filename: ((document?.versions?.[0]?.filename) ?? ''),
      description: document.description || "",
      documentDate: document.documentDate ? document.documentDate.slice(0, 10) : "",
      sender: document.sender || "",
      recipient: document.recipient || "",
      keywords: document.keywords || "",
      status: document.status,
      physicalBuilding: document.physicalBuilding || "",
      physicalOffice: document.physicalOffice || "",
      physicalArchive: document.physicalArchive || "",
      physicalBox: document.physicalBox || "",
      physicalNotes: document.physicalNotes || "",
      categoryId: document.categoryId,
      isPublic: document.isPublic,
    });
  }, [document]);

  // Query para categorías
  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ["categories", "active"],
    queryFn: () => categoriesService.getActive(),
  });

  // Mutation para actualizar
  const updateMutation = useMutation({
    mutationFn: () =>
      documentsService.update(document.id, {
        title: formData.title || undefined,
        description: formData.description || undefined,
        documentDate: formData.documentDate || undefined,
        sender: formData.sender || undefined,
        recipient: formData.recipient || undefined,
        keywords: formData.keywords || undefined,
        status: formData.status,
        physicalBuilding: formData.physicalBuilding || undefined,
        physicalOffice: formData.physicalOffice || undefined,
        physicalArchive: formData.physicalArchive || undefined,
        physicalBox: formData.physicalBox || undefined,
        physicalNotes: formData.physicalNotes || undefined,
        categoryId: formData.categoryId || undefined,
        isPublic: formData.isPublic,
      }),
    onSuccess: () => {
      toast.success("Documento actualizado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["document", document.id] });
      onOpenChange(false);
    },
    onError: (error: unknown) => {
      const message = (error as { response?: { data?: { message?: string } } })
        .response?.data?.message || "Error al actualizar documento";
      toast.error(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-[500px]">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Editar Documento
          </DialogTitle>
          <DialogDescription>
            Modifica la información del documento
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto py-1 pr-1">
          {/* Número institucional (solo lectura) */}
          {document.documentNumber && (
            <div className="space-y-2">
              <Label>Número de Documento</Label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted border text-sm font-mono">
                {document.documentNumber}
              </div>
              <p className="text-xs text-muted-foreground">
                Código institucional asignado automáticamente
              </p>
            </div>
          )}

          {/* Nombre del archivo (solo lectura) */}
          <div className="space-y-2">
            <Label htmlFor="title">Título del documento</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Ej. Solicitud de permiso docente"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="filename">Nombre del Archivo</Label>
            <Input
              id="filename"
              value={formData.filename}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              El nombre del archivo no se puede cambiar
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="documentDate">Fecha del documento</Label>
              <Input
                id="documentDate"
                type="date"
                value={formData.documentDate}
                onChange={(e) =>
                  setFormData({ ...formData, documentDate: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    status: value as PilotDocumentStatus,
                  })
                }
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REGISTRADO">Registrado</SelectItem>
                  <SelectItem value="EN_REVISION">En revisión</SelectItem>
                  <SelectItem value="ARCHIVADO">Archivado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sender">Remitente</Label>
              <Input
                id="sender"
                value={formData.sender}
                onChange={(e) =>
                  setFormData({ ...formData, sender: e.target.value })
                }
                placeholder="Ej. Secretaría General"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipient">Destinatario</Label>
              <Input
                id="recipient"
                value={formData.recipient}
                onChange={(e) =>
                  setFormData({ ...formData, recipient: e.target.value })
                }
                placeholder="Ej. Rectorado"
              />
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Descripción del documento..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="keywords">Palabras clave</Label>
            <Input
              id="keywords"
              value={formData.keywords}
              onChange={(e) =>
                setFormData({ ...formData, keywords: e.target.value })
              }
              placeholder="Ej. permiso, docente, abril"
            />
          </div>

          {/* Categoría */}
          <div className="space-y-2">
            <Label htmlFor="category">Categoría</Label>
            <Select
              value={formData.categoryId?.toString() || "none"}
              onValueChange={(value) =>
                setFormData({
                  ...formData,
                  categoryId: value === "none" ? null : parseInt(value),
                })
              }
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Sin categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin categoría</SelectItem>
                {!loadingCategories &&
                  categories
                    ?.filter((cat) => cat.isActive)
                    .map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border bg-muted/20 p-4 space-y-4">
            <p className="text-sm font-medium">Ubicación física</p>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="physicalBuilding">Edificio</Label>
                <Input
                  id="physicalBuilding"
                  value={formData.physicalBuilding}
                  onChange={(e) =>
                    setFormData({ ...formData, physicalBuilding: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="physicalOffice">Oficina</Label>
                <Input
                  id="physicalOffice"
                  value={formData.physicalOffice}
                  onChange={(e) =>
                    setFormData({ ...formData, physicalOffice: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="physicalArchive">Archivo o estante</Label>
                <Input
                  id="physicalArchive"
                  value={formData.physicalArchive}
                  onChange={(e) =>
                    setFormData({ ...formData, physicalArchive: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="physicalBox">Gaveta o caja</Label>
                <Input
                  id="physicalBox"
                  value={formData.physicalBox}
                  onChange={(e) =>
                    setFormData({ ...formData, physicalBox: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="physicalNotes">Observación</Label>
                <Textarea
                  id="physicalNotes"
                  value={formData.physicalNotes}
                  onChange={(e) =>
                    setFormData({ ...formData, physicalNotes: e.target.value })
                  }
                  rows={2}
                />
              </div>
            </div>
          </div>

          {/* Visibilidad */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="isPublic"
              checked={formData.isPublic}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isPublic: checked as boolean })
              }
            />
            <Label
              htmlFor="isPublic"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Hacer público (visible para todos los usuarios)
            </Label>
          </div>

          </div>

          <DialogFooter className="shrink-0 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <>Guardando...</>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
