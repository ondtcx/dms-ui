"use client";

import { DocumentWorkflow, WorkflowApproval, ApprovalAction } from "@/lib/types";
import { CheckCircle2, Clock, Circle, XCircle, AlertCircle, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface RequestTimelineProps {
  workflow: DocumentWorkflow;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getApprovalForState(
  approvals: WorkflowApproval[],
  order: number,
): WorkflowApproval | undefined {
  return approvals.find((a) => a.stateOrder === order);
}

function ActionIcon({ action }: { action: ApprovalAction | null | undefined }) {
  switch (action) {
    case ApprovalAction.APPROVED:
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case ApprovalAction.REJECTED:
      return <XCircle className="h-5 w-5 text-red-500" />;
    case ApprovalAction.REQUESTED_CHANGES:
      return <AlertCircle className="h-5 w-5 text-orange-500" />;
    case ApprovalAction.COMMENTED:
      return <MessageSquare className="h-5 w-5 text-blue-500" />;
    default:
      return null;
  }
}

function actionLabel(action: ApprovalAction | null | undefined): string {
  switch (action) {
    case ApprovalAction.APPROVED:
      return "Aprobado";
    case ApprovalAction.REJECTED:
      return "Rechazado";
    case ApprovalAction.REQUESTED_CHANGES:
      return "Solicitó cambios";
    case ApprovalAction.COMMENTED:
      return "Comentó";
    default:
      return "";
  }
}

export function RequestTimeline({ workflow }: RequestTimelineProps) {
  const states = workflow.template?.stateDefinitions ?? [];
  const approvals = workflow.approvals ?? [];

  // Sort states by order
  const sortedStates = [...states].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-1">
      {/* Initiation step */}
      <div className="flex gap-4">
        <div className="flex flex-col items-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
          </div>
          {sortedStates.length > 0 && (
            <div className="w-px flex-1 bg-border mt-1" />
          )}
        </div>
        <div className="pb-6 pt-1">
          <p className="text-sm font-medium">Solicitud enviada</p>
          <p className="text-xs text-muted-foreground">
            Por {workflow.initiatedBy.name} · {formatDate(workflow.createdAt)}
          </p>
        </div>
      </div>

      {/* Approval states */}
      {sortedStates.map((stateDef, index) => {
        const approval = getApprovalForState(approvals, stateDef.order);
        const isLast = index === sortedStates.length - 1;
        const isCurrent =
          workflow.currentStateOrder === stateDef.order && !approval?.action;
        const isPending = !approval && !isCurrent;

        return (
          <div key={stateDef.order} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2",
                  approval?.action === ApprovalAction.APPROVED
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                    : approval?.action === ApprovalAction.REJECTED
                      ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                      : approval?.action === ApprovalAction.REQUESTED_CHANGES
                        ? "border-orange-500 bg-orange-50 dark:bg-orange-900/20"
                        : isCurrent
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 animate-pulse"
                          : "border-muted-foreground/30 bg-muted",
                )}
              >
                {approval?.action ? (
                  <ActionIcon action={approval.action} />
                ) : isCurrent ? (
                  <Clock className="h-4 w-4 text-blue-500" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground/40" />
                )}
              </div>
              {!isLast && <div className="w-px flex-1 bg-border mt-1" />}
            </div>

            <div className={cn("pb-6 pt-1", isLast && "pb-0")}>
              <p className="text-sm font-medium">{stateDef.state}</p>
              <p className="text-xs text-muted-foreground capitalize">
                Responsable: {stateDef.role?.name || stateDef.roleId}
              </p>

              {approval?.action && (
                <div className="mt-1.5 space-y-0.5">
                  <p className="text-xs font-medium">
                    <span className="text-muted-foreground">Por </span>
                    {approval.user.name}
                    <span className="text-muted-foreground"> · </span>
                    {actionLabel(approval.action)}
                    <span className="text-muted-foreground">
                      {" "}· {formatDate(approval.updatedAt)}
                    </span>
                  </p>
                  {approval.comment && (
                    <p className="text-xs text-muted-foreground italic bg-muted px-2 py-1 rounded">
                      "{approval.comment}"
                    </p>
                  )}
                </div>
              )}

              {isCurrent && !approval?.action && (
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  Esperando revisión...
                </p>
              )}

              {isPending && (
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Pendiente
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
