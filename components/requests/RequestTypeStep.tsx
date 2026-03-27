"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/contexts/AuthContext";
import { workflowsService } from "@/lib/services/workflows.service";
import { WorkflowTemplate } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, FileCheck2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface RequestTypeStepProps {
  onSelect: (workflowTemplate: WorkflowTemplate) => void;
}

export function RequestTypeStep({ onSelect }: RequestTypeStepProps) {
  const { user } = useAuth();

  const { data: templates, isLoading, error } = useQuery({
    queryKey: ["workflow-templates-for-role", user?.role],
    queryFn: workflowsService.getTemplates,
    select: (templates) =>
      templates.filter(
        (t) =>
          t.isActive &&
          user?.role &&
          t.allowedInitiatorRoles.includes(user.role),
      ),
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Cargando tipos de solicitud...</p>
      </div>
    );
  }

  if (error || !templates) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2">
        <p className="text-sm text-destructive">No se pudieron cargar los tipos de solicitud.</p>
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-2">
        <FileCheck2 className="h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          No tienes tipos de solicitud disponibles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Selecciona el tipo de solicitud que deseas enviar.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {templates.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelect(template)}
            className={cn(
              "group text-left w-full rounded-lg border-2 border-border bg-card p-5",
              "hover:border-primary hover:bg-accent transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <h3 className="text-sm font-semibold leading-tight">{template.name}</h3>
                {template.description && (
                  <p className="text-xs text-muted-foreground leading-snug">
                    {template.description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground/70 pt-1">
                  {template.stateDefinitions.length === 1
                    ? "1 paso de aprobación"
                    : `${template.stateDefinitions.length} pasos de aprobación`}
                  {template.category && (
                    <span> · {template.category.name}</span>
                  )}
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5 transition-colors" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
