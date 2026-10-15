"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { documentsService } from "@/lib/services/documents.service";
import { documentTypesService } from "@/lib/services/document-types.service";
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
import { Document } from "@/lib/types";
import { findDefaultDocumentType } from "@/lib/types";
import { useDocumentActionGuard } from "@/hooks/use-document-action-guard";

interface EditDocumentDialogProps {
  document: Document;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  authorize?: () => boolean;
}

export function EditDocumentDialog({
  document,
  open,
  onOpenChange,
  authorize,
}: EditDocumentDialogProps) {
  const queryClient = useQueryClient();
  const guard = useDocumentActionGuard(document.id, "editMetadata", open, authorize);

  const [formData, setFormData] = useState({
    name: document.name?.trim() || document.versions?.[0]?.filename || "",
    documentNumber: document.documentNumber ?? "",
    description: document.description || "",
    documentTypeId: document.documentTypeId ?? undefined,
  });

  // Actualizar form cuando cambia el documento
  useEffect(() => {
    setFormData({
      name: document.name?.trim() || document.versions?.[0]?.filename || "",
      documentNumber: document.documentNumber ?? "",
      description: document.description || "",
      documentTypeId: document.documentTypeId ?? undefined,
    });
  }, [document, guard.identity]);

  // Query para tipos de documento activos; el predeterminado (`Documento
  // general`) se deriva mediante `isDefault` y se excluye del desplegable.
  const { data: documentTypes } = useQuery({
    queryKey: ["document-types", "active"],
    queryFn: () => documentTypesService.getActive(),
  });
  const defaultType = findDefaultDocumentType(documentTypes);
  const concreteTypes = (documentTypes ?? []).filter(
    (type) => type.isDefault !== true,
  );
  const isGeneral =
    defaultType !== undefined && formData.documentTypeId === defaultType.id;

  // Mutation para actualizar
  const updateMutation = useMutation({
    mutationFn: (epoch: object) => {
      guard.assert(epoch);
      return documentsService.update(document.id, {
        description: formData.description || undefined,
        ...(formData.name !== (document.name?.trim() || document.versions?.[0]?.filename || "")
          ? { name: formData.name.trim() }
          : {}),
        ...(formData.documentNumber !== (document.documentNumber ?? "")
          ? { documentNumber: formData.documentNumber.trim() || null }
          : {}),
        // Solo se envía un cambio de tipo; conservar uno inactivo no exige
        // volver a validarlo al editar el título o el número institucional.
        ...(formData.documentTypeId === undefined ||
        formData.documentTypeId === (document.documentTypeId ?? undefined)
          ? {}
          : { documentTypeId: formData.documentTypeId }),
      });
    },
    onSuccess: (_data, epoch) => {
      if (!guard.isCurrent(epoch)) return;
      toast.success("Documento actualizado exitosamente");
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["document-action-readback"] });
      queryClient.invalidateQueries({ queryKey: ["document", document.id] });
      onOpenChange(false);
    },
    onError: (error: unknown, epoch) => {
      if (!guard.isCurrent(epoch)) return;
      const message = (error as { response?: { data?: { message?: string } } })
        .response?.data?.message || "Error al actualizar documento";
      toast.error(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guard.canAct || updateMutation.isPending) return;
    updateMutation.mutate(guard.capture());
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Editar Documento
          </DialogTitle>
          <DialogDescription>
            Modifica la información del documento
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Número institucional opcional; no se genera automáticamente. */}
          <div className="space-y-2">
            <Label htmlFor="documentNumber">Número institucional (opcional)</Label>
            <Input
              id="documentNumber"
              value={formData.documentNumber}
              onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Déjalo vacío para guardar el documento sin número institucional.
            </p>
          </div>

          {/* El título visible no modifica los nombres de los archivos históricos. */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre del documento</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Cambia el título visible, no el nombre del archivo original.
            </p>
          </div>

          {/* Tipo de documento */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="documentTypeId">Tipo de documento</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="generalDocumentType"
                  checked={isGeneral}
                  disabled={defaultType === undefined}
                  onCheckedChange={(checked) =>
                    setFormData({
                      ...formData,
                      // El servidor deriva la categoría del tipo elegido.
                      documentTypeId:
                        checked === true ? defaultType?.id : undefined,
                    })
                  }
                />
                <Label
                  htmlFor="generalDocumentType"
                  className="text-sm font-medium leading-none cursor-pointer"
                >
                  Documento general
                </Label>
              </div>
            </div>
            <Select
              value={isGeneral ? "" : formData.documentTypeId?.toString() ?? ""}
              onValueChange={(value) => {
                const selected = concreteTypes.find(
                  (type) => type.id === parseInt(value),
                );
                setFormData({
                  ...formData,
                  documentTypeId: selected?.id,
                });
              }}
              disabled={isGeneral}
            >
              <SelectTrigger id="documentTypeId">
                <SelectValue
                  placeholder={
                    isGeneral
                      ? "Documento general"
                      : "Selecciona un tipo de documento"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {concreteTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id.toString()}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={updateMutation.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={updateMutation.isPending || !guard.canAct}>
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
