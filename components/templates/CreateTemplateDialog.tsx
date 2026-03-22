"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { templatesService } from "@/lib/services/templates.service";
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { DocumentTemplate, TemplateField, UpdateDocumentTemplateDto } from "@/lib/types";
import { Plus, Trash2, FileType, Code, Settings, Layout } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";
import "prismjs/components/prism-markup";
import "prismjs/themes/prism-tomorrow.css";

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

const DEFAULT_HTML_TEMPLATE = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>{{_metadata.templateName}}</title>
</head>
<body>
  <h1>{{_metadata.templateName}}</h1>
  <p><em>Generado: {{_metadata.generatedDate}}</em></p>
  <hr>

  <!-- Agrega tus campos aquí usando sintaxis Handlebars -->
  <!-- Ejemplo: <p><strong>Campo:</strong> {{nombre_campo}}</p> -->

</body>
</html>`;

const DEFAULT_STYLES = `body {
  font-family: Arial, sans-serif;
  margin: 40px;
  color: #333;
}

h1 {
  color: #000;
  border-bottom: 2px solid #333;
  padding-bottom: 10px;
}`;

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
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [fields, setFields] = useState<TemplateField[]>([]);

  const { data: categories } = useQuery({
    queryKey: ["categories", "active"],
    queryFn: categoriesService.getActive,
  });

  // Nuevos campos
  const [htmlTemplate, setHtmlTemplate] = useState(DEFAULT_HTML_TEMPLATE);
  const [styles, setStyles] = useState(DEFAULT_STYLES);
  const [outputFormat, setOutputFormat] = useState<'pdf' | 'docx' | 'html'>('pdf');
  const [pageSize, setPageSize] = useState<'A4' | 'Letter' | 'Legal'>('A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  // Cargar datos si estamos editando
  useEffect(() => {
    if (template) {
      setName(template.name);
      setType(template.type);
      setDescription(template.description || "");
      setIsActive(template.isActive);
      setCategoryId(template.categoryId ?? undefined);
      setFields(template.fields.fields);
      setHtmlTemplate(template.htmlTemplate);
      setStyles(template.styles || DEFAULT_STYLES);
      setOutputFormat(template.outputFormat);
      setPageSize(template.pageSize);
      setOrientation(template.orientation);
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
    setCategoryId(undefined);
    setFields([]);
    setHtmlTemplate(DEFAULT_HTML_TEMPLATE);
    setStyles(DEFAULT_STYLES);
    setOutputFormat('pdf');
    setPageSize('A4');
    setOrientation('portrait');
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

    if (!htmlTemplate.trim()) {
      toast.error("El template HTML es requerido");
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
      htmlTemplate: htmlTemplate.trim(),
      styles: styles.trim() || undefined,
      outputFormat,
      pageSize,
      orientation,
      isActive,
      categoryId,
    };

    if (isEditing && template) {
      updateMutation.mutate({ id: template.id, data: templateData });
    } else {
      createMutation.mutate(templateData);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
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

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">
              <Layout className="h-4 w-4 mr-2" />
              Básico
            </TabsTrigger>
            <TabsTrigger value="fields">
              <Settings className="h-4 w-4 mr-2" />
              Campos
            </TabsTrigger>
            <TabsTrigger value="template">
              <Code className="h-4 w-4 mr-2" />
              HTML
            </TabsTrigger>
            <TabsTrigger value="config">
              <FileType className="h-4 w-4 mr-2" />
              Configuración
            </TabsTrigger>
          </TabsList>

          {/* Tab: Información Básica */}
          <TabsContent value="basic" className="space-y-4 mt-4">
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
                <Label htmlFor="categoryId">Categoría</Label>
                <Select
                  value={categoryId?.toString() ?? "none"}
                  onValueChange={(value) =>
                    setCategoryId(value === "none" ? undefined : Number(value))
                  }
                >
                  <SelectTrigger id="categoryId">
                    <SelectValue placeholder="Sin categoría asignada" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin categoría</SelectItem>
                    {categories?.filter((c) => c.isActive).map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {categoryId && categories && (
                  <p className="text-xs text-muted-foreground">
                    Roles con acceso:{" "}
                    {(categories.find((c) => c.id === categoryId)?.allowedRoles as string[] | undefined)?.join(", ") || "todos"}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe para qué sirve esta plantilla"
                  rows={3}
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
          </TabsContent>

          {/* Tab: Campos del Formulario */}
          <TabsContent value="fields" className="space-y-4 mt-4">
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
                    No hay campos. Haz clic en &quot;Agregar Campo&quot; para empezar.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto">
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
                                  updateField(index, "required", checked as boolean)
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
          </TabsContent>

          {/* Tab: Template HTML */}
          <TabsContent value="template" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="htmlTemplate">
                Plantilla HTML <span className="text-red-500">*</span>
              </Label>
              <p className="text-xs text-muted-foreground mb-2">
                Usa sintaxis Handlebars para los campos. Ejemplo: {"{{"} nombre_campo {"}}"}
              </p>
              <div className="border rounded-md overflow-hidden">
                <Editor
                  value={htmlTemplate}
                  onValueChange={setHtmlTemplate}
                  highlight={(code) => Prism.highlight(code, Prism.languages.markup, 'markup')}
                  padding={10}
                  style={{
                    fontFamily: '"Fira code", "Fira Mono", monospace',
                    fontSize: 14,
                    minHeight: "300px",
                    maxHeight: "400px",
                    overflow: "auto",
                  }}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="styles">CSS Personalizado</Label>
              <p className="text-xs text-muted-foreground mb-2">
                Estilos CSS adicionales para el documento
              </p>
              <div className="border rounded-md overflow-hidden">
                <Editor
                  value={styles}
                  onValueChange={setStyles}
                  highlight={(code) => Prism.highlight(code, Prism.languages.css, 'css')}
                  padding={10}
                  style={{
                    fontFamily: '"Fira code", "Fira Mono", monospace',
                    fontSize: 14,
                    minHeight: "200px",
                    maxHeight: "300px",
                    overflow: "auto",
                  }}
                />
              </div>
            </div>
          </TabsContent>

          {/* Tab: Configuración */}
          <TabsContent value="config" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="outputFormat">Formato de salida</Label>
                <Select
                  value={outputFormat}
                  onValueChange={(value: 'pdf' | 'docx' | 'html') => setOutputFormat(value)}
                >
                  <SelectTrigger id="outputFormat">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="html">HTML</SelectItem>
                    <SelectItem value="docx" disabled>DOCX (Próximamente)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pageSize">Tamaño de página</Label>
                <Select
                  value={pageSize}
                  onValueChange={(value: 'A4' | 'Letter' | 'Legal') => setPageSize(value)}
                >
                  <SelectTrigger id="pageSize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A4">A4</SelectItem>
                    <SelectItem value="Letter">Letter</SelectItem>
                    <SelectItem value="Legal">Legal</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="orientation">Orientación</Label>
                <Select
                  value={orientation}
                  onValueChange={(value: 'portrait' | 'landscape') => setOrientation(value)}
                >
                  <SelectTrigger id="orientation">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portrait">Vertical (Portrait)</SelectItem>
                    <SelectItem value="landscape">Horizontal (Landscape)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg mt-4">
              <h4 className="text-sm font-medium mb-2">Helpers disponibles:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• <code>{"{{"} formatDate fecha {"}}"}</code> - Formatea fechas</li>
                <li>• <code>{"{{"} nl2br texto {"}}"}</code> - Convierte saltos de línea a &lt;br&gt;</li>
                <li>• <code>{"{{"} capitalize texto {"}}"}</code> - Capitaliza la primera letra</li>
                <li>• <code>{"{{"} _metadata.generatedDate {"}}"}</code> - Fecha de generación</li>
                <li>• <code>{"{{"} _metadata.generatedTime {"}}"}</code> - Hora de generación</li>
              </ul>
            </div>
          </TabsContent>
        </Tabs>

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
