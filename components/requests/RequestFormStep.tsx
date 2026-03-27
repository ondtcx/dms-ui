"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { templatesService } from "@/lib/services/templates.service";
import { WorkflowTemplate, DocumentTemplate, TemplateField } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Check, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RequestFormStepProps {
  workflowTemplate: WorkflowTemplate;
  onSubmit: (docTemplate: DocumentTemplate, formData: Record<string, unknown>) => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export function RequestFormStep({
  workflowTemplate,
  onSubmit,
  onBack,
  isSubmitting,
}: RequestFormStepProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: templatesResponse, isLoading } = useQuery({
    queryKey: ["doc-templates-for-workflow", workflowTemplate.id, workflowTemplate.categoryId],
    queryFn: () =>
      templatesService.getAll({
        categoryId: workflowTemplate.categoryId ?? undefined,
        isActive: true,
        limit: 50,
      }),
    select: (res) => res.data,
  });

  const templates = templatesResponse ?? [];

  // Auto-select if only one template available
  const effectiveTemplate =
    selectedTemplate ?? (templates.length === 1 ? templates[0] : null);

  function handleFieldChange(fieldName: string, value: unknown) {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    if (errors[fieldName]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldName];
        return next;
      });
    }
  }

  function validate(): boolean {
    if (!effectiveTemplate) return false;
    const newErrors: Record<string, string> = {};
    for (const field of effectiveTemplate.fields.fields) {
      if (field.required && !formData[field.name]) {
        newErrors[field.name] = "Este campo es obligatorio";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit() {
    if (!effectiveTemplate) return;
    if (!validate()) return;
    onSubmit(effectiveTemplate, formData);
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Cargando formulario...</p>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          No hay plantillas disponibles para este tipo de solicitud.
        </p>
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Template picker — only shown when multiple templates */}
      {templates.length > 1 && !selectedTemplate && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Elige la plantilla que deseas utilizar.
          </p>
          <div className="grid gap-2">
            {templates.map((tmpl) => (
              <button
                key={tmpl.id}
                onClick={() => setSelectedTemplate(tmpl)}
                className={cn(
                  "flex items-center justify-between text-left w-full rounded-lg border border-border bg-card px-4 py-3",
                  "hover:border-primary hover:bg-accent transition-all",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                <div>
                  <p className="text-sm font-medium">{tmpl.name}</p>
                  {tmpl.description && (
                    <p className="text-xs text-muted-foreground mt-0.5">{tmpl.description}</p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>
      )}

      {/* Form fields */}
      {effectiveTemplate && (
        <div className="space-y-5">
          {templates.length > 1 && selectedTemplate && (
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => setSelectedTemplate(null)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Plantillas
              </button>
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <span className="font-medium">{effectiveTemplate.name}</span>
            </div>
          )}

          <div className="grid gap-4">
            {effectiveTemplate.fields.fields.map((field: TemplateField) => (
              <FieldInput
                key={field.name}
                field={field}
                value={formData[field.name] ?? ""}
                error={errors[field.name]}
                onChange={(val) => handleFieldChange(field.name, val)}
              />
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={onBack} disabled={isSubmitting}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando solicitud...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Enviar solicitud
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- Field renderer ----

interface FieldInputProps {
  field: TemplateField;
  value: unknown;
  error?: string;
  onChange: (value: string) => void;
}

function FieldInput({ field, value, error, onChange }: FieldInputProps) {
  const inputClass = cn(
    error && "border-destructive focus-visible:ring-destructive",
  );

  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.name}>
        {field.label}
        {field.required && <span className="text-destructive ml-1">*</span>}
      </Label>

      {field.type === "textarea" ? (
        <Textarea
          id={field.name}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.label}
          className={inputClass}
          rows={3}
        />
      ) : (
        <Input
          id={field.name}
          type={field.type}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.label}
          className={inputClass}
        />
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
