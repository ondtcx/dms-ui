export interface BatchActionCapabilities {
  scope: "ordinary" | "reception";
  update: boolean;
  trash: boolean;
  restore: boolean;
  permanentDelete: boolean;
  export: boolean;
}

export type BatchAction = Exclude<keyof BatchActionCapabilities, "scope">;

export function readBatchActionCapabilities(document: unknown): BatchActionCapabilities | null {
  if (!document || typeof document !== "object" || Array.isArray(document)) return null;
  const value = (document as Record<string, unknown>).batchCapabilities;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const snapshot = value as Record<string, unknown>;
  if (snapshot.scope !== "ordinary" && snapshot.scope !== "reception") return null;
  if (typeof snapshot.update !== "boolean" || typeof snapshot.trash !== "boolean" ||
    typeof snapshot.restore !== "boolean" || typeof snapshot.permanentDelete !== "boolean" ||
    typeof snapshot.export !== "boolean") return null;
  return { scope: snapshot.scope, update: snapshot.update, trash: snapshot.trash,
    restore: snapshot.restore, permanentDelete: snapshot.permanentDelete, export: snapshot.export };
}
