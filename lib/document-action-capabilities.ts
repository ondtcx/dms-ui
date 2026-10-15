export interface DocumentActionCapabilities {
  scope: "ordinary" | "reception";
  editMetadata: boolean;
  editContent: boolean;
  move: boolean;
  trash: boolean;
  restore: boolean;
  permanentDelete: boolean;
  manageSharing: boolean;
}

export function readDocumentActionCapabilities(
  document: unknown,
  actorId?: string | null,
): DocumentActionCapabilities | null {
  if (!document || typeof document !== "object" || Array.isArray(document)) return null;
  const value = (document as Record<string, unknown>).actionCapabilities;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const snapshot = value as Record<string, unknown>;
  if (snapshot.scope !== "ordinary" && snapshot.scope !== "reception") return null;
  if (
    typeof snapshot.editMetadata !== "boolean" ||
    typeof snapshot.editContent !== "boolean" ||
    typeof snapshot.move !== "boolean" ||
    typeof snapshot.trash !== "boolean" ||
    typeof snapshot.restore !== "boolean" ||
    typeof snapshot.permanentDelete !== "boolean" ||
    typeof snapshot.manageSharing !== "boolean"
  ) return null;
  // La propiedad real refuerza las acciones destructivas sin sustituir las
  // restricciones del flujo. Sin actor explícito se conserva la lectura base.
  const ownsDeletion = actorId === undefined || (!!actorId &&
    (document as Record<string, unknown>).uploadedById === actorId);
  return {
    scope: snapshot.scope,
    editMetadata: snapshot.editMetadata,
    editContent: snapshot.editContent,
    move: snapshot.move,
    trash: snapshot.trash && ownsDeletion,
    restore: snapshot.restore,
    permanentDelete: snapshot.permanentDelete && ownsDeletion,
    manageSharing: snapshot.manageSharing,
  };
}
