import { WorkflowStatus } from './types';
import { GitBranch, Clock, CircleDot, CheckCheck, XCircle, X, MessageSquare } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export const WORKFLOW_STATUS_CONFIG: Record<
  WorkflowStatus,
  { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: LucideIcon }
> = {
  [WorkflowStatus.DRAFT]:             { label: 'Borrador',           variant: 'outline',     icon: GitBranch },
  [WorkflowStatus.PENDING]:           { label: 'Pendiente',          variant: 'secondary',   icon: Clock },
  [WorkflowStatus.IN_PROGRESS]:       { label: 'En progreso',        variant: 'default',     icon: CircleDot },
  [WorkflowStatus.CHANGES_REQUESTED]: { label: 'Cambios requeridos', variant: 'outline',     icon: MessageSquare },
  [WorkflowStatus.APPROVED]:          { label: 'Aprobado',           variant: 'default',     icon: CheckCheck },
  [WorkflowStatus.REJECTED]:          { label: 'Rechazado',          variant: 'destructive', icon: XCircle },
  [WorkflowStatus.CANCELLED]:         { label: 'Cancelado',          variant: 'secondary',   icon: X },
};
