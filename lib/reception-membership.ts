import type {
  DirectoryDelegate,
  DirectoryMembership,
  DirectoryParticipantInput,
  DirectoryRecipientRole,
  DirectoryRecipientUser,
  DirectoryRoleParticipant,
  DirectoryUserParticipant,
  ReceptionCapabilities,
} from "@/lib/types";

/**
 * Ayudantes puros de membresía de recepción. Replican la política de concesión
 * del backend (`canGrantReceptionDelegate`) para que la interfaz y el payload
 * nunca prometan una capacidad que la operación rechazaría.
 */

export const OPERATIONAL_CAPABILITY_KEYS = [
  "configure",
  "manageParticipants",
  "readAll",
  "review",
  "manageDelegates",
  "manageStructure",
] as const;

export type OperationalCapabilityKey =
  (typeof OPERATIONAL_CAPABILITY_KEYS)[number];

/** Bandera de operación tal como la envía el DTO de delegado (todas opcionales). */
export interface DelegateFlagsInput {
  full?: boolean;
  configure?: boolean;
  manageParticipants?: boolean;
  readAll?: boolean;
  review?: boolean;
  manageDelegates?: boolean;
  manageStructure?: boolean;
}

/** Payload de reemplazo: todas las banderas presentes como booleanos reales. */
export type DelegateFlagsPayload = Required<DelegateFlagsInput>;

/**
 * Exclusión de operación compartida entre el diálogo de ajustes y la gestión de
 * membresía: solo un intento por diálogo.
 */
export interface ReceptionOperationGate {
  acquire: () => boolean;
  release: () => void;
}

export function isPositiveInt(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Normaliza las operaciones efectivas de una regla de delegado: `full` implica
 * todas y `review` implica lectura total, igual que el backend.
 */
export function effectiveOps(
  rule: DelegateFlagsInput | null | undefined,
): Record<OperationalCapabilityKey, boolean> {
  const full = rule?.full === true;
  return {
    configure: full || rule?.configure === true,
    manageParticipants: full || rule?.manageParticipants === true,
    readAll: full || rule?.readAll === true || rule?.review === true,
    review: full || rule?.review === true,
    manageDelegates: full || rule?.manageDelegates === true,
    manageStructure: full || rule?.manageStructure === true,
  };
}

/**
 * Operaciones del actor a partir de sus banderas explícitas. Nunca se derivan
 * del flag `owner` ni de implicaciones (`review` no regala `readAll` al actor):
 * el backend entrega al propietario legítimo con las seis banderas en true, y la
 * concesión siempre compara las operaciones solicitadas contra estas banderas.
 */
export function actorOps(
  capabilities: ReceptionCapabilities,
): Record<OperationalCapabilityKey, boolean> {
  return {
    configure: capabilities.configure === true,
    manageParticipants: capabilities.manageParticipants === true,
    readAll: capabilities.readAll === true,
    review: capabilities.review === true,
    manageDelegates: capabilities.manageDelegates === true,
    manageStructure: capabilities.manageStructure === true,
  };
}

export function actorHasAllOps(capabilities: ReceptionCapabilities): boolean {
  const ops = actorOps(capabilities);
  return OPERATIONAL_CAPABILITY_KEYS.every((key) => ops[key]);
}

/** ¿Todas las operaciones solicitadas (normalizadas) están dentro del actor? */
export function requestedWithinActor(
  capabilities: ReceptionCapabilities,
  requested: DelegateFlagsInput,
): boolean {
  const actor = actorOps(capabilities);
  const next = effectiveOps(requested);
  return OPERATIONAL_CAPABILITY_KEYS.every((key) => !next[key] || actor[key]);
}

export interface CanManageDelegateOptions {
  capabilities: ReceptionCapabilities;
  actorId: string;
  ownerId: string;
  targetId: string;
  existing?: DelegateFlagsInput | null;
}

/**
 * El propietario y la propia cuenta nunca son gestionables; tampoco una
 * delegación cuyas banderas superen las del actor.
 */
export function canManageDelegate(options: CanManageDelegateOptions): boolean {
  const { capabilities, actorId, ownerId, targetId, existing } = options;
  if (capabilities.manageDelegates !== true) return false;
  if (targetId === ownerId || targetId === actorId) return false;
  if (existing && !requestedWithinActor(capabilities, existing)) return false;
  return true;
}

/**
 * Construye el payload de reemplazo explícito. `full` implica las seis
 * operaciones y `review` implica lectura total, igual que el backend.
 */
export function delegatePayload(
  flags: DelegateFlagsInput,
): DelegateFlagsPayload {
  const full = flags.full === true;
  return {
    full,
    configure: full || flags.configure === true,
    manageParticipants: full || flags.manageParticipants === true,
    readAll: full || flags.readAll === true || flags.review === true,
    review: full || flags.review === true,
    manageDelegates: full || flags.manageDelegates === true,
    manageStructure: full || flags.manageStructure === true,
  };
}

/** Payload de participante con exactamente un destino y solo campos del DTO. */
export function participantPayload(data: DirectoryParticipantInput): {
  userId?: string;
  roleId?: number;
  peerRead: boolean;
} {
  const hasUser = data.userId !== undefined;
  const hasRole = data.roleId !== undefined;
  if (hasUser === hasRole)
    throw new Error("Debe indicar exactamente un usuario o un rol");
  if (hasUser) {
    if (!isNonEmptyString(data.userId)) throw new Error("Usuario no válido");
    return { userId: data.userId, peerRead: data.peerRead === true };
  }
  if (!isPositiveInt(data.roleId)) throw new Error("Rol activo no válido");
  return { roleId: data.roleId, peerRead: data.peerRead === true };
}

function assertLimit(limit: number): void {
  if (!Number.isInteger(limit) || limit < 1 || limit > 50)
    throw new Error("El límite de destinatarios debe estar entre 1 y 50");
}

/** Parámetros de búsqueda de usuarios: consulta obligatoria de 2 a 100. */
export function userRecipientParams(
  q: string,
  limit = 20,
): { q: string; limit: number } {
  assertLimit(limit);
  const trimmed = typeof q === "string" ? q.trim() : "";
  if (trimmed.length < 2 || trimmed.length > 100)
    throw new Error("Escribe entre 2 y 100 caracteres para buscar usuarios");
  return { q: trimmed, limit };
}

/** Parámetros de búsqueda de roles: consulta opcional de 2 a 100. */
export function roleRecipientParams(
  q: string | undefined,
  limit = 20,
): { q?: string; limit: number } {
  assertLimit(limit);
  const trimmed = typeof q === "string" ? q.trim() : "";
  if (trimmed.length === 0) return { limit };
  if (trimmed.length < 2 || trimmed.length > 100)
    throw new Error("Escribe entre 2 y 100 caracteres para buscar roles");
  return { q: trimmed, limit };
}

export function isValidUserParticipant(
  value: unknown,
  directoryId: number,
): value is DirectoryUserParticipant {
  const row = value as Partial<DirectoryUserParticipant> | null | undefined;
  return (
    !!row &&
    row.directoryId === directoryId &&
    isNonEmptyString(row.userId) &&
    typeof row.peerRead === "boolean"
  );
}

export function isValidRoleParticipant(
  value: unknown,
  directoryId: number,
): value is DirectoryRoleParticipant {
  const row = value as Partial<DirectoryRoleParticipant> | null | undefined;
  return (
    !!row &&
    row.directoryId === directoryId &&
    isPositiveInt(row.roleId) &&
    typeof row.peerRead === "boolean"
  );
}

export function isValidDelegate(
  value: unknown,
  directoryId: number,
): value is DirectoryDelegate {
  const row = value as Partial<DirectoryDelegate> | null | undefined;
  if (!row || row.directoryId !== directoryId || !isNonEmptyString(row.userId))
    return false;
  if (typeof row.full !== "boolean") return false;
  return OPERATIONAL_CAPABILITY_KEYS.every(
    (key) => typeof row[key] === "boolean",
  );
}

/**
 * Valida la membresía completa sin filtrar filas malformadas: cualquier fila
 * inválida invalida la respuesta para impedir mutaciones sobre datos dudosos.
 */
export function isValidMembership(
  value: unknown,
  directoryId: number,
): value is DirectoryMembership {
  const membership = value as Partial<DirectoryMembership> | null | undefined;
  if (!membership) return false;
  const { users, roles, delegates } = membership;
  if (!Array.isArray(users) || !Array.isArray(roles) || !Array.isArray(delegates))
    return false;
  return (
    users.every((row) => isValidUserParticipant(row, directoryId)) &&
    roles.every((row) => isValidRoleParticipant(row, directoryId)) &&
    delegates.every((row) => isValidDelegate(row, directoryId))
  );
}

export function isValidRecipientUsers(
  value: unknown,
): value is DirectoryRecipientUser[] {
  return (
    Array.isArray(value) &&
    value.every((row) => {
      const user = row as Partial<DirectoryRecipientUser> | null | undefined;
      return (
        !!user &&
        isNonEmptyString(user.id) &&
        typeof user.name === "string" &&
        typeof user.email === "string"
      );
    })
  );
}

export function isValidRecipientRoles(
  value: unknown,
): value is DirectoryRecipientRole[] {
  return (
    Array.isArray(value) &&
    value.every((row) => {
      const role = row as Partial<DirectoryRecipientRole> | null | undefined;
      return (
        !!role &&
        isPositiveInt(role.id) &&
        isNonEmptyString(role.key) &&
        isNonEmptyString(role.label)
      );
    })
  );
}

export function receptionMembershipQueryKey(
  directoryId: number | null,
  actorId: string | null,
) {
  return ["directory-reception-membership", directoryId, actorId] as const;
}

export type ReceptionRecipientScope =
  | "participant-user"
  | "participant-role"
  | "delegate-user";

/**
 * Clave de búsqueda de destinatarios. El `scope` distingue cada formulario para
 * que el mismo texto de consulta no colisione en caché entre formularios.
 */
export function receptionRecipientsQueryKey(
  directoryId: number | null,
  actorId: string | null,
  scope: ReceptionRecipientScope,
  q: string,
) {
  return ["directory-reception-recipients", directoryId, actorId, scope, q] as const;
}
