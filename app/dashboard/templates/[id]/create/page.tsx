"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { templatesService } from "@/lib/services/templates.service";
import { categoriesService } from "@/lib/services/categories.service";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Handlebars from "handlebars";
import { registerHandlebarsHelpers } from "@/lib/handlebars-helpers";
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
import { TemplateField } from "@/lib/types";
import { FileText, AlertCircle, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

// Registrar helpers globalmente al cargar el módulo
registerHandlebarsHelpers();

export default function CreateDocumentFromTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const templateId = parseInt(params.id as string);

  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [description, setDescription] = useState("");
  const [filename, setFilename] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [categoryId, setCategoryId] = useState<number | undefined>(undefined);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState(true);

  // Query para obtener la plantilla
  const { data: template, isLoading: loadingTemplate } = useQuery({
    queryKey: ["template", templateId],
    queryFn: () => templatesService.getOne(templateId),
  });

  // Query para categorías
  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => categoriesService.getAll(),
  });

  // Compilar la plantilla con los datos del formulario en tiempo real
  const previewHtml = useMemo(() => {
    if (!template) return "";

    try {
      const compiledTemplate = Handlebars.compile(template.htmlTemplate);

      // Preparar datos con metadata
      const dataWithMetadata = {
        ...formData,
        _metadata: {
          templateName: template.name,
          generatedDate: new Date().toLocaleDateString("es-ES"),
          generatedTime: new Date().toLocaleTimeString("es-ES"),
        },
      };

      const html = compiledTemplate(dataWithMetadata);

      // Combinar con los estilos de la plantilla
      return `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            ${template.styles || ""}

            /* Estilos adicionales para la vista previa */
            body {
              margin: 0;
              padding: 20px;
              font-family: Arial, sans-serif;
            }
          </style>
        </head>
        <body>
          ${html}
        </body>
        </html>
      `;
    } catch (error) {
      console.error("Error compilando plantilla:", error);
      return `
        <!DOCTYPE html>
        <html>
        <body>
          <div style="padding: 20px; color: #dc2626;">
            <h3>Error al compilar la plantilla</h3>
            <p>Verifica que todos los campos estén correctamente configurados.</p>
            <pre>${error}</pre>
          </div>
        </body>
        </html>
      `;
    }
  }, [formData, template]);

  const createDocumentMutation = useMutation({
    mutationFn: templatesService.createDocumentFromTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      toast.success("Documento generado exitosamente");
      router.push("/dashboard/documents");
    },
    onError: (error) => {
      const message =
        (error as { response?: { data?: { message?: string } } }).response
          ?.data?.message || "Error al generar documento";
      toast.error(message);
    },
  });

  const handleFieldChange = (fieldName: string, value: unknown) => {
    setFormData((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
    // Limpiar error del campo
    if (errors[fieldName]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[fieldName];
        return newErrors;
      });
    }
  };

  const validateForm = (): boolean => {
    if (!template) return false;

    const newErrors: Record<string, string> = {};

    template.fields?.fields?.forEach((field: TemplateField) => {
      if (field.required && !formData[field.name]) {
        newErrors[field.name] = `${field.label} es requerido`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    createDocumentMutation.mutate({
      templateId: template!.id,
      formData,
      filename: filename || undefined,
      description: description || undefined,
      isPublic,
      categoryId: categoryId || undefined,
    });
  };

  const renderField = (field: TemplateField) => {
    const value = String(formData[field.name] || "");
    const hasError = !!errors[field.name];

    switch (field.type) {
      case "textarea":
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Textarea
              id={field.name}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={`Ingresa ${field.label.toLowerCase()}`}
              rows={4}
              className={hasError ? "border-red-500" : ""}
            />
            {hasError && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors[field.name]}
              </p>
            )}
          </div>
        );

      case "number":
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              type="number"
              value={value}
              onChange={(e) =>
                handleFieldChange(field.name, parseFloat(e.target.value) || "")
              }
              placeholder={`Ingresa ${field.label.toLowerCase()}`}
              className={hasError ? "border-red-500" : ""}
            />
            {hasError && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors[field.name]}
              </p>
            )}
          </div>
        );

      case "date":
      case "time":
      case "email":
      case "text":
      default:
        return (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              type={field.type}
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              placeholder={`Ingresa ${field.label.toLowerCase()}`}
              className={hasError ? "border-red-500" : ""}
            />
            {hasError && (
              <p className="text-sm text-red-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors[field.name]}
              </p>
            )}
          </div>
        );
    }
  };

  if (loadingTemplate) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-lg font-medium">Plantilla no encontrada</p>
        <Button onClick={() => router.push("/dashboard/templates")} className="mt-4">
          Volver a Plantillas
        </Button>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-background px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/dashboard/templates")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FileText className="h-6 w-6" />
                Generar: {template.name}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Completa los campos para generar el documento basado en la plantilla
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? (
                <>
                  <EyeOff className="mr-2 h-4 w-4" />
                  Ocultar Vista Previa
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Mostrar Vista Previa
                </>
              )}
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createDocumentMutation.isPending}
              size="lg"
            >
              {createDocumentMutation.isPending
                ? "Generando..."
                : "Generar Documento"}
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div
          className={`h-full ${showPreview ? "grid" : ""}`}
          style={showPreview ? { gridTemplateColumns: "420px 1fr" } : {}}
        >
          {/* Columna izquierda - Formulario */}
          <div className="h-full overflow-y-auto p-6 bg-muted/30">
            <div className="max-w-xl mx-auto space-y-6">
              {/* Información de la plantilla */}
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm font-medium">Tipo: {template.type}</p>
                  {template.description && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {template.description}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Campos del formulario */}
              <div className="space-y-4">
                <h3 className="font-medium">Campos del Documento</h3>
                {template.fields?.fields?.map((field) => renderField(field))}
              </div>

              <Separator />

              {/* Metadatos opcionales */}
              <div className="space-y-4">
                <h3 className="font-medium">Información Adicional (Opcional)</h3>

                <div className="space-y-2">
                  <Label htmlFor="filename">Nombre del archivo</Label>
                  <Input
                    id="filename"
                    value={filename}
                    onChange={(e) => setFilename(e.target.value)}
                    placeholder={`${template.type}-${new Date().toISOString().split("T")[0]}.json`}
                  />
                  <p className="text-xs text-muted-foreground">
                    Si no especificas un nombre, se generará automáticamente
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Descripción del documento (opcional)"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoría</Label>
                  <Select
                    value={categoryId?.toString() || ""}
                    onValueChange={(value) =>
                      setCategoryId(value ? parseInt(value) : undefined)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
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

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="isPublic"
                    checked={isPublic}
                    onCheckedChange={(checked) => setIsPublic(checked as boolean)}
                  />
                  <label
                    htmlFor="isPublic"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Hacer público (visible para todos los usuarios)
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Columna derecha - Vista previa en tiempo real */}
          {showPreview && (
            <div className="h-full flex flex-col bg-background border-l">
              <div className="px-6 py-4 border-b bg-muted/30">
                <h3 className="font-medium flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Vista Previa en Tiempo Real
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Los cambios se reflejan automáticamente mientras escribes
                </p>
              </div>
              <div className="flex-1 overflow-hidden p-6">
                <div className="h-full border-2 rounded-lg bg-white shadow-sm overflow-hidden">
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full h-full"
                    title="Vista previa del documento"
                    sandbox="allow-same-origin allow-scripts"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
