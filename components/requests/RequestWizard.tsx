"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { templatesService } from "@/lib/services/templates.service";
import { workflowsService } from "@/lib/services/workflows.service";
import { WorkflowTemplate, DocumentTemplate, DocumentWorkflow } from "@/lib/types";
import { RequestTypeStep } from "./RequestTypeStep";
import { RequestFormStep } from "./RequestFormStep";
import { RequestConfirmStep } from "./RequestConfirmStep";
import { cn } from "@/lib/utils";

type WizardStep = "type" | "form" | "confirm";

const STEPS: { key: WizardStep; label: string }[] = [
  { key: "type", label: "Tipo" },
  { key: "form", label: "Datos" },
  { key: "confirm", label: "Confirmación" },
];

function StepIndicator({ current }: { current: WizardStep }) {
  const currentIndex = STEPS.findIndex((s) => s.key === current);

  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium border-2 transition-colors",
                  isCompleted
                    ? "border-primary bg-primary text-primary-foreground"
                    : isCurrent
                      ? "border-primary bg-background text-primary"
                      : "border-muted-foreground/30 bg-background text-muted-foreground/50",
                )}
              >
                {isCompleted ? "✓" : index + 1}
              </div>
              <span
                className={cn(
                  "text-xs whitespace-nowrap",
                  isCurrent ? "text-primary font-medium" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  "h-0.5 w-16 sm:w-24 mb-4 mx-1 transition-colors",
                  index < currentIndex ? "bg-primary" : "bg-muted",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function RequestWizard() {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<WizardStep>("type");
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowTemplate | null>(null);
  const [createdWorkflow, setCreatedWorkflow] = useState<DocumentWorkflow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleTypeSelect(workflowTemplate: WorkflowTemplate) {
    setSelectedWorkflow(workflowTemplate);
    setStep("form");
  }

  async function handleFormSubmit(
    docTemplate: DocumentTemplate,
    formData: Record<string, unknown>,
  ) {
    if (!selectedWorkflow) return;

    setIsSubmitting(true);
    try {
      // Step 1: Create document from template
      const doc = await templatesService.createDocumentFromTemplate({
        templateId: docTemplate.id,
        formData,
        filename: `${docTemplate.name} - ${new Date().toLocaleDateString("es-AR")}`,
      });

      // Step 2: Immediately initiate workflow
      const workflow = await workflowsService.initiate(doc.id, selectedWorkflow.id);

      // Attach document info to workflow for the confirm step
      const workflowWithDoc: DocumentWorkflow = { ...workflow, document: doc };
      setCreatedWorkflow(workflowWithDoc);

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["my-requests"] });

      setStep("confirm");
    } catch {
      toast.error("No se pudo enviar la solicitud. Intenta nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleNewRequest() {
    setStep("type");
    setSelectedWorkflow(null);
    setCreatedWorkflow(null);
  }

  return (
    <div className="max-w-2xl mx-auto">
      <StepIndicator current={step} />

      {step === "type" && <RequestTypeStep onSelect={handleTypeSelect} />}

      {step === "form" && selectedWorkflow && (
        <RequestFormStep
          workflowTemplate={selectedWorkflow}
          onSubmit={handleFormSubmit}
          onBack={() => setStep("type")}
          isSubmitting={isSubmitting}
        />
      )}

      {step === "confirm" && createdWorkflow && (
        <RequestConfirmStep
          workflow={createdWorkflow}
          onNewRequest={handleNewRequest}
        />
      )}
    </div>
  );
}
