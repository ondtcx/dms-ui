"use client";

import Link from "next/link";
import { DocumentWorkflow, WorkflowStatus } from "@/lib/types";
import { RequestStatusBadge } from "./RequestStatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, FileText, ChevronRight } from "lucide-react";

interface RequestCardProps {
  workflow: DocumentWorkflow;
}

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
  return date.toLocaleDateString("es", { day: "2-digit", month: "short", year: "numeric" });
}

const CANCELLABLE_STATUSES: WorkflowStatus[] = [
  WorkflowStatus.PENDING,
  WorkflowStatus.IN_PROGRESS,
];

export function RequestCard({ workflow }: RequestCardProps) {
  const isCancellable = CANCELLABLE_STATUSES.includes(workflow.status);
  const hasObservations = workflow.status === WorkflowStatus.CHANGES_REQUESTED;

  // Get current pending state label
  const currentStateDef = workflow.template?.stateDefinitions.find(
    (s) => s.order === workflow.currentStateOrder,
  );

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted shrink-0 mt-0.5">
            <FileText className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            {/* Document name */}
            <p className="text-sm font-medium truncate">
              {workflow.document?.filename ?? `Solicitud #${workflow.id}`}
            </p>

            {/* Workflow type */}
            {workflow.template && (
              <p className="text-xs text-muted-foreground">{workflow.template.name}</p>
            )}

            {/* Status + date row */}
            <div className="flex items-center gap-2 pt-0.5 flex-wrap">
              <RequestStatusBadge status={workflow.status} />
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatRelativeDate(workflow.createdAt)}
              </span>
            </div>

            {/* Contextual status info */}
            {(isCancellable || hasObservations) && (
              <div className="pt-1">
                {isCancellable && currentStateDef && (
                  <p className="text-xs text-muted-foreground">
                    Esperando:{" "}
                    <span className="capitalize font-medium text-foreground">
                      {currentStateDef.state}
                    </span>
                  </p>
                )}
                {hasObservations && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                    Requiere cambios — revisa las observaciones
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Detail link */}
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="shrink-0 h-8 w-8 text-muted-foreground"
          >
            <Link href={`/dashboard/requests/${workflow.documentId}`}>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
