"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { templatesService } from "@/lib/services/templates.service";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DocumentTemplate, TemplateField, UpdateDocumentTemplateDto } from "@/lib/types";
import { Plus, Trash2, FileType } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: DocumentTemplate | null;
  onSuccess?: () => void;
}

const FIELD_TYPES = [
  { value: "text", label: "Texto" },
  { value: "textarea", label: "Texto largo" },
  { value: "number", label: "Número" },
  { value: "date", label: "Fecha" },
  { value: "time", label: "Hora" },
  { value: "email", label: "Email" },
];

export function CreateTemplateDialog({
  open,
  onOpenChange,
  template,
  onSuccess,
}: CreateTemplateDialogProps) {
  const queryClient = useQueryClient();
  const isEditing = !!template;

  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [fields, setFields] = useState<TemplateField[]>([]);

  // Cargar datos si estamos editando
  useEffect(() => {
    if (template) {
      setName(template.name);
      setType(template.type);
      setDescription(template.description || "");
      setIsActive(template.isActive);
      setFields(template.fields.fields);
    } else {
      resetForm();
    }
  }, [template]);

  const createMutation = useMutation({
    mutationFn: templatesService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["template-types"] });
      toast.success("Plantilla creada exitosamente");
      resetForm();
      onSuccess?.();
    },
    onError: (error) => {
      const message =
        (error as { response?: { data?: { message?: string } } }).response?.data?.message || "Error al crear plantilla";
      toast.error(message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateDocumentTemplateDto }) =>
      templatesService.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["templates"] });
      queryClient.invalidateQueries({ queryKey: ["template-types"] });
      toast.success("Plantilla actualizada exitosamente");
      resetForm();
      onSuccess?.();
    },
    onError: (error) => {
      const message =
        (error as { response?: { data?: { message?: string } } }).response?.data?.message || "Error al actualizar plantilla";
      toast.error(message);
    },
  });

  const resetForm = () => {
    setName("");
    setType("");
    setDescription("");
    setIsActive(true);
    setFields([]);
  };

  const addField = () => {
    setFields([
      ...fields,
      {
        name: "",
        label: "",
        type: "text",
        required: false,
      },
    ]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (
    index: number,
    key: keyof TemplateField,
    value: string | boolean
  ) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], [key]: value };
    setFields(newFields);
  };

  const handleSubmit = () => {
    // Validaciones
    if (!name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    if (!type.trim()) {
      toast.error("El tipo es requerido");
      return;
    }

    if (fields.length === 0) {
      toast.error("Debes agregar al menos un campo");
      return;
    }

    // Validar que todos los campos tengan nombre y label
    const invalidFields = fields.some((f) => !f.name.trim() || !f.label.trim());
    if (invalidFields) {
      toast.error("Todos los campos deben tener nombre y etiqueta");
      return;
    }

    const templateData = {
      name: name.trim(),
      type: type.trim(),
      description: description.trim() || undefined,
      fields: { fields },
      isActive,
    };

    if (isEditing && template) {
      updateMutation.mutate({ id: template.id, data: templateData });
    } else {
      createMutation.mutate(templateData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileType className="h-5 w-5" />
            {isEditing ? "Editar Plantilla" : "Nueva Plantilla"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Modifica los campos de la plantilla"
              : "Crea una nueva plantilla personalizada para generar documentos"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Información básica */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Nombre de la plantilla <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Acta de Reunión, Certificado de Trabajo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">
                Tipo <span className="text-red-500">*</span>
              </Label>
              <Input
                id="type"
                value={type}
                onChange={(e) => setType(e.target.value)}
                placeholder="Ej: acta, certificado, informe"
              />
              <p className="text-xs text-muted-foreground">
                El tipo permite agrupar plantillas similares
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe para qué sirve esta plantilla"
                rows={2}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={isActive}
                onCheckedChange={(checked) => setIsActive(checked as boolean)}
              />
              <label
                htmlFor="isActive"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Plantilla activa
              </label>
            </div>
          </div>

          <Separator />

          {/* Campos del formulario */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-sm">
                Campos del Formulario <span className="text-red-500">*</span>
              </h3>
              <Button onClick={addField} size="sm" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Agregar Campo
              </Button>
            </div>

            {fields.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="pt-6 pb-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    No hay campos. Haz clic en &quot;Agregar Campo&quot; para
                    empezar.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <Card key={index}>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor={`field-name-${index}`}>
                                Nombre del campo *
                              </Label>
                              <Input
                                id={`field-name-${index}`}
                                value={field.name}
                                onChange={(e) =>
                                  updateField(index, "name", e.target.value)
                                }
                                placeholder="Ej: titulo, fecha, contenido"
                              />
                              <p className="text-xs text-muted-foreground">
                                Sin espacios, minúsculas
                              </p>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor={`field-label-${index}`}>
                                Etiqueta *
                              </Label>
                              <Input
                                id={`field-label-${index}`}
                                value={field.label}
                                onChange={(e) =>
                                  updateField(index, "label", e.target.value)
                                }
                                placeholder="Ej: Título, Fecha, Contenido"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor={`field-type-${index}`}>
                                Tipo de campo
                              </Label>
                              <Select
                                value={field.type}
                                onValueChange={(value) =>
                                  updateField(index, "type", value)
                                }
                              >
                                <SelectTrigger id={`field-type-${index}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {FIELD_TYPES.map((type) => (
                                    <SelectItem
                                      key={type.value}
                                      value={type.value}
                                    >
                                      {type.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="flex items-center space-x-2 pt-8">
                              <Checkbox
                                id={`field-required-${index}`}
                                checked={field.required}
                                onCheckedChange={(checked) =>
                                  updateField(index, "required", checked)
                                }
                              />
                              <label
                                htmlFor={`field-required-${index}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                Campo requerido
                              </label>
                            </div>
                          </div>
                        </div>

                        <Button
                          onClick={() => removeField(index)}
                          variant="ghost"
                          size="icon"
                          className="mt-8"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              resetForm();
            }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              createMutation.isPending || updateMutation.isPending
            }
          >
            {createMutation.isPending || updateMutation.isPending
              ? "Guardando..."
              : isEditing
                ? "Actualizar"
                : "Crear Plantilla"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
