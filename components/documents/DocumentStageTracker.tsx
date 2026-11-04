"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

type StageMode = "authoring" | "upload";

const AUTHORING_STEPS = [
  { value: "DRAFT", label: "Borrador" },
  { value: "IN_REVIEW", label: "En revisión" },
  { value: "APPROVED", label: "Aprobado" },
  { value: "EMITTED", label: "Emitido" },
  { value: "ARCHIVED", label: "Archivado" },
] as const;

const UPLOAD_STEPS = [
  { value: "DRAFT", label: "Borrador" },
  { value: "IN_REVIEW", label: "En revisión" },
  { value: "APPROVED", label: "Aprobado" },
  { value: "ARCHIVED", label: "Archivado" },
] as const;

export function DocumentStageTracker({
  mode,
  status,
  className,
}: {
  mode: StageMode;
  status: string;
  className?: string;
}) {
  const steps = mode === "authoring" ? AUTHORING_STEPS : UPLOAD_STEPS;
  const normalized = status === "CHANGES_REQUESTED" ? "IN_REVIEW" : status;
  const currentIndex = Math.max(
    0,
    steps.findIndex((step) => step.value === normalized),
  );
  const returned = status === "CHANGES_REQUESTED";

  return (
    <div className={cn("space-y-1", className)}>
      <ol
        aria-label="Etapas del documento"
        className="flex flex-wrap items-center gap-x-2 gap-y-1"
      >
        {steps.map((step, index) => {
          const done = index < currentIndex;
          const current = index === currentIndex;
          return (
            <li key={step.value} className="flex items-center gap-2">
              <span
                aria-current={current ? "step" : undefined}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs",
                  done && "border-secondary/30 bg-secondary/10 text-secondary",
                  current &&
                    "border-primary/40 bg-primary/10 font-medium text-primary",
                  !done && !current && "border-border text-muted-foreground",
                )}
              >
                {done ? (
                  <Check className="h-3 w-3" aria-hidden="true" />
                ) : (
                  <span
                    className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border text-[9px]"
                    aria-hidden="true"
                  >
                    {index + 1}
                  </span>
                )}
                {step.label}
              </span>
              {index < steps.length - 1 ? (
                <span
                  className="hidden h-px w-4 bg-border sm:block"
                  aria-hidden="true"
                />
              ) : null}
            </li>
          );
        })}
      </ol>
      {returned ? (
        <p className="text-xs text-amber-700">
          Devuelto para corrección; el autor debe reenviarlo.
        </p>
      ) : null}
    </div>
  );
}
