"use client";

import Link from "next/link";
import { DocumentWorkflow } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { CheckCircle2, FileText, ListChecks, PlusCircle } from "lucide-react";

interface RequestConfirmStepProps {
  workflow: DocumentWorkflow;
  onNewRequest: () => void;
}

export function RequestConfirmStep({ workflow, onNewRequest }: RequestConfirmStepProps) {
  const nextStep = workflow.template?.stateDefinitions
    .slice()
    .sort((a, b) => a.order - b.order)[0];

  return (
    <div className="flex flex-col items-center text-center gap-6 py-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
        <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold">¡Solicitud enviada!</h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          Tu solicitud fue enviada correctamente y está pendiente de revisión.
        </p>
      </div>

      {/* Summary card */}
      <div className="w-full max-w-sm rounded-lg border border-border bg-muted/50 p-4 text-left space-y-3">
        <div className="flex items-start gap-3">
          <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Documento</p>
            <p className="text-sm font-medium truncate">
              {((workflow.document?.versions?.[0]?.filename) ?? '') ?? "—"}
            </p>
          </div>
        </div>

        {workflow.template && (
          <div className="flex items-start gap-3">
            <ListChecks className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Tipo de solicitud</p>
              <p className="text-sm font-medium">{workflow.template.name}</p>
            </div>
          </div>
        )}

        {nextStep && (
          <div className="pt-1 border-t border-border">
            <p className="text-xs text-muted-foreground">
              Próximo paso:{" "}
              <span className="font-medium text-foreground capitalize">
                {nextStep.state}
              </span>
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-3 flex-wrap justify-center">
        <Button asChild>
          <Link href="/dashboard/requests">Ver mis solicitudes</Link>
        </Button>
        <Button variant="outline" onClick={onNewRequest}>
          <PlusCircle className="h-4 w-4 mr-2" />
          Nueva solicitud
        </Button>
      </div>
    </div>
  );
}
