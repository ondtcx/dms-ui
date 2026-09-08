export enum WorkflowStatus {
  DRAFT = "DRAFT",
  PENDING = "PENDING",
  IN_PROGRESS = "IN_PROGRESS",
  CHANGES_REQUESTED = "CHANGES_REQUESTED",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  CANCELLED = "CANCELLED",
}

export enum WorkflowTransitionAction {
  SUBMIT = "SUBMIT",
  APPROVE = "APPROVE",
  REQUEST_CHANGES = "REQUEST_CHANGES",
  REJECT = "REJECT",
  CANCEL = "CANCEL",
}

export interface WorkflowStage {
  id?: number;
  order: number;
  roleKey: string;
}

export interface WorkflowDefinitionVersion {
  id: number;
  templateId: number;
  version: number;
  isActive: boolean;
  publishedAt?: string | null;
  snapshot: Record<string, unknown>;
  stages: WorkflowStage[];
  executionCount?: number | null;
}

export interface WorkflowDefinition {
  id: number;
  name: string;
  description?: string | null;
  categoryId?: number | null;
  allowedInitiatorRoles: string[];
  isActive: boolean;
  versions: WorkflowDefinitionVersion[];
}

export interface WorkflowValidationIssue {
  path: string;
  message: string;
  code?: string;
}

export interface WorkflowValidationResult {
  versionId: number;
  valid: boolean;
  issues: WorkflowValidationIssue[];
}

export interface WorkflowUsage {
  executionCount: number | null;
  activeCount: number | null;
}

export interface WorkflowDefinitionCounts {
  versions: number | null;
  executions: number | null;
  usage: number | null;
  executionHistory: number | null;
}

export interface WorkflowDefinitionDetail extends WorkflowDefinition {
  counts?: WorkflowDefinitionCounts | null;
  usage?: WorkflowUsage | null;
  history?: ReadonlyArray<WorkflowExecution> | null;
}

export type ApplicableWorkflowDefinition = WorkflowDefinition & {
  isActive: true;
  versions: Array<WorkflowDefinitionVersion & { isActive: true }>;
};

export interface WorkflowAssignment {
  id: number;
  workflowId: number;
  stageDefinitionId: number;
  userId: string;
  userNameSnapshot: string;
  roleKeySnapshot: string;
  status: "PENDING" | "COMPLETED" | "REASSIGNED";
  reassignedAt?: string | null;
  reassignmentReason?: string | null;
  completedAt?: string | null;
  stageDefinition: WorkflowStage;
}

export interface WorkflowTransition {
  id: number;
  workflowId: number;
  assignmentId?: number | null;
  action: WorkflowTransitionAction;
  fromState?: string | null;
  toState?: string | null;
  comment?: string | null;
  performedById: string;
  documentVersionId?: number | null;
  createdAt: string;
}

export interface WorkflowEvent {
  id: number;
  workflowId: number;
  type: string;
  payload: Record<string, unknown>;
  occurredAt: string;
}

export interface WorkflowExecution {
  id: number;
  documentId: number;
  status: WorkflowStatus;
  currentState?: string | null;
  currentStateOrder: number;
  active: boolean;
  initiatedById: string;
  documentVersionId?: number | null;
  definitionVersion: WorkflowDefinitionVersion;
  assignments: WorkflowAssignment[];
  transitions: WorkflowTransition[];
  events: WorkflowEvent[];
  createdAt: string;
  completedAt?: string | null;
}

export interface CreateWorkflowDefinitionDto {
  name: string;
  description?: string;
  categoryId?: number;
  stages: WorkflowStage[];
  allowedInitiatorRoles?: string[];
  isActive?: boolean;
}

export type CreateWorkflowVersionDto = Partial<CreateWorkflowDefinitionDto>;

export interface UpdateWorkflowDefinitionMetadataDto {
  name?: string;
  description?: string;
  categoryId?: number;
  allowedInitiatorRoles?: string[];
}

export interface CreateWorkflowVersionAdminDto extends UpdateWorkflowDefinitionMetadataDto {
  baseVersionId: number;
  stages?: WorkflowStage[];
}

export interface ValidateWorkflowVersionDto {
  versionId: number;
  mode?: string;
}

export interface StartWorkflowDto {
  versionId?: number;
  comment?: string;
}

export interface WorkflowTransitionDto {
  action: WorkflowTransitionAction;
  comment?: string;
  versionId?: number;
}

export interface ReassignWorkflowAssignmentDto {
  userId: string;
  reason: string;
}

export function requiresWorkflowComment(action: WorkflowTransitionAction): boolean {
  return [
    WorkflowTransitionAction.REQUEST_CHANGES,
    WorkflowTransitionAction.REJECT,
    WorkflowTransitionAction.CANCEL,
  ].includes(action);
}

export function getWorkflowActionState(status: WorkflowStatus, assignedToCurrentUser: boolean) {
  const active = ![WorkflowStatus.APPROVED, WorkflowStatus.REJECTED, WorkflowStatus.CANCELLED].includes(status);
  const canSubmit = status === WorkflowStatus.CHANGES_REQUESTED;
  return {
    canApprove: active && assignedToCurrentUser,
    canRequestChanges: active && assignedToCurrentUser,
    canReject: active && assignedToCurrentUser,
    canCancel: active,
    canSubmit,
  };
}

export function workflowErrorMessage(error: unknown): string {
  const response = error as { response?: { data?: { message?: string | string[] } } };
  const message = response.response?.data?.message;
  return Array.isArray(message) ? message.join(", ") : message || "No se pudo actualizar el flujo de trabajo";
}
