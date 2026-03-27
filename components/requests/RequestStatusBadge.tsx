"use client";

import { WorkflowStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface StatusConfig {
  label: string;
  className: string;
}

const STATUS_CONFIG: Record<WorkflowStatus, StatusConfig> = {
  [WorkflowStatus.DRAFT]: {
    label: "Borrador",
    className: "bg-muted text-muted-foreground border-border",
  },
  [WorkflowStatus.PENDING]: {
    label: "Pendiente",
    className: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800",
  },
  [WorkflowStatus.IN_PROGRESS]: {
    label: "En revisión",
    className: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
  },
  [WorkflowStatus.CHANGES_REQUESTED]: {
    label: "Con observaciones",
    className: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800",
  },
  [WorkflowStatus.APPROVED]: {
    label: "Aprobado",
    className: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
  },
  [WorkflowStatus.REJECTED]: {
    label: "Rechazado",
    className: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
  },
  [WorkflowStatus.CANCELLED]: {
    label: "Cancelado",
    className: "bg-muted text-muted-foreground border-border",
  },
};

interface RequestStatusBadgeProps {
  status: WorkflowStatus;
  className?: string;
}

export function RequestStatusBadge({ status, className }: RequestStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className: "bg-muted text-muted-foreground border-border",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        config.className,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
