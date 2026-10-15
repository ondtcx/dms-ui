export interface WorkflowActionCapabilities {
  scope: "ordinary" | "reception";
  submit: boolean;
  approve: boolean;
  requestChanges: boolean;
  reject: boolean;
  cancel: boolean;
  reassign: boolean;
  reassignAssignmentIds: number[];
}

const BOOLEAN_FLAGS = ["submit", "approve", "requestChanges", "reject", "cancel", "reassign"] as const;

function isSafePositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

// Lectura estricta de instantáneas de acciones: sin coerción ni concesiones fabricadas.
export function readWorkflowActionCapabilities(
  execution: unknown,
): WorkflowActionCapabilities | null {
  if (!execution || typeof execution !== "object" || Array.isArray(execution)) return null;
  const value = (execution as Record<string, unknown>).actionCapabilities;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const snapshot = value as Record<string, unknown>;
  if (snapshot.scope !== "ordinary" && snapshot.scope !== "reception") return null;
  for (const flag of BOOLEAN_FLAGS) {
    if (typeof snapshot[flag] !== "boolean") return null;
  }
  const rawIds = snapshot.reassignAssignmentIds;
  if (!Array.isArray(rawIds)) return null;
  const reassignAssignmentIds: number[] = [];
  for (const id of rawIds) {
    if (!isSafePositiveInteger(id)) return null;
    if (!reassignAssignmentIds.includes(id)) reassignAssignmentIds.push(id);
  }
  // Una bandera de reasignación y su lista deben ser coherentes; si no, no se confía en la fila.
  if (snapshot.reassign !== (reassignAssignmentIds.length > 0)) return null;
  return {
    scope: snapshot.scope,
    submit: snapshot.submit === true,
    approve: snapshot.approve === true,
    requestChanges: snapshot.requestChanges === true,
    reject: snapshot.reject === true,
    cancel: snapshot.cancel === true,
    reassign: snapshot.reassign === true,
    reassignAssignmentIds,
  };
}
