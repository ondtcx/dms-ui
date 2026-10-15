"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { documentsService } from "@/lib/services/documents.service";
import {
  OPERATIONAL_CAPABILITY_KEYS,
  actorHasAllOps,
  actorOps,
  canManageDelegate,
  delegatePayload,
  effectiveOps,
  isValidDelegate,
  isValidMembership,
  isValidRecipientRoles,
  isValidRecipientUsers,
  isValidRoleParticipant,
  isValidUserParticipant,
  receptionMembershipQueryKey,
  receptionRecipientsQueryKey,
  requestedWithinActor,
  type DelegateFlagsInput,
  type OperationalCapabilityKey,
  type ReceptionOperationGate,
} from "@/lib/reception-membership";
import type {
  Directory,
  DirectoryDelegate,
  DirectoryRecipientRole,
  DirectoryRecipientUser,
  DirectoryRoleParticipant,
  DirectoryUserParticipant,
  ReceptionCapabilities,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";

const PEER_READ_ROW_LABEL =
  "Puede visualizar entregas de otros participantes (solo lectura)";
const PEER_READ_NEW_LABEL =
  "Habilitar visibilidad de entregas de otros (solo lectura)";
const PEER_READ_ROLE_LABEL =
  "Habilitar visibilidad de entregas de otros para el rol (solo lectura)";
const READ_ALL_LABEL = "Ver todas las entregas";
const REVIEW_LABEL = "Revisar entregas";
const FULL_LABEL = "Acceso operativo completo";
const CONFIRM_FAILURE =
  "No se pudo confirmar la operación. Vuelve a cargar la membresía.";
const STALE_CONTEXT_REASON =
  "La operación ya no corresponde a la carpeta o sesión actual.";

const FLAG_LABELS: Record<OperationalCapabilityKey, string> = {
  configure: "Configurar recepción",
  manageParticipants: "Gestionar participantes",
  readAll: READ_ALL_LABEL,
  review: REVIEW_LABEL,
  manageDelegates: "Gestionar delegados",
  manageStructure: "Gestionar estructura",
};

export interface ReceptionMembershipManagerProps {
  directory: Directory;
  actorId: string;
  capabilities: ReceptionCapabilities;
  gate?: ReceptionOperationGate;
  disabled?: boolean;
  onChanged?: () => void;
}

interface GuardResult {
  ok: boolean;
  reason: string;
}

interface ParticipantVars {
  directoryId: number;
  actorId: string;
  session: number;
  scope: "existing" | "search";
  kind: "user" | "role";
  userId?: string;
  roleId?: number;
  peerRead: boolean;
}

interface RemovalVars {
  directoryId: number;
  actorId: string;
  session: number;
  kind: "user" | "role" | "delegate";
  userId?: string;
  roleId?: number;
}

interface DelegateVars {
  directoryId: number;
  actorId: string;
  session: number;
  targetId: string;
  flags: DelegateFlagsInput;
  fromSearch: boolean;
}

function responseMessage(error: unknown, fallback: string): string {
  const apiMessage = (
    error as { response?: { data?: { message?: string } } } | undefined
  )?.response?.data?.message;
  if (typeof apiMessage === "string" && apiMessage.trim()) return apiMessage;
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
}

function CheckboxField({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input
        type="checkbox"
        className="mt-0.5"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}

function operationSummary(flags: DelegateFlagsInput): string {
  if (flags.full === true) return FULL_LABEL;
  const eff = effectiveOps(flags);
  const labels = OPERATIONAL_CAPABILITY_KEYS.filter((key) => eff[key]).map(
    (key) => FLAG_LABELS[key],
  );
  return labels.length ? labels.join(", ") : "Sin permisos operativos";
}

export function ReceptionMembershipManager({
  directory,
  actorId,
  capabilities,
  gate: gateProp,
  disabled = false,
  onChanged,
}: ReceptionMembershipManagerProps) {
  const queryClient = useQueryClient();
  const directoryId = directory.id;
  const ownerId = directory.createdById;
  const canParticipants = capabilities.manageParticipants === true;
  const canDelegates = capabilities.manageDelegates === true;
  const canMembership = canParticipants || canDelegates;

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [participantUserQuery, setParticipantUserQuery] = useState("");
  const [selectedParticipantUser, setSelectedParticipantUser] =
    useState<DirectoryRecipientUser | null>(null);
  const [participantUserPeerRead, setParticipantUserPeerRead] = useState(false);

  const [participantRoleQuery, setParticipantRoleQuery] = useState("");
  const [selectedParticipantRole, setSelectedParticipantRole] =
    useState<DirectoryRecipientRole | null>(null);
  const [participantRolePeerRead, setParticipantRolePeerRead] = useState(false);

  const [delegateUserQuery, setDelegateUserQuery] = useState("");
  const [selectedDelegateUser, setSelectedDelegateUser] =
    useState<DirectoryRecipientUser | null>(null);
  const [newDelegateFlags, setNewDelegateFlags] = useState<DelegateFlagsInput>({});
  const [delegateDrafts, setDelegateDrafts] = useState<
    Record<string, DelegateFlagsInput>
  >({});

  const [confirmRemoval, setConfirmRemoval] = useState<string | null>(null);

  // Guardas de autoridad/destino vigente; se re-asignan cada render para que las
  // acciones programáticas no usen datos obsoletos.
  const guardRef = useRef<{
    participant: (
      scope: "existing" | "search",
      kind: "user" | "role",
      targetId: string | number,
    ) => GuardResult;
    delegate: (targetId: string, flags: DelegateFlagsInput) => GuardResult;
    delegateSearch: (targetId: string) => GuardResult;
    removal: (
      kind: "user" | "role" | "delegate",
      targetId: string | number,
    ) => GuardResult;
  }>({
    participant: () => ({ ok: false, reason: "No disponible." }),
    delegate: () => ({ ok: false, reason: "No disponible." }),
    delegateSearch: () => ({ ok: false, reason: "No disponible." }),
    removal: () => ({ ok: false, reason: "No disponible." }),
  });

  // Contexto sincrónico de carpeta + actor + sesión para aislar respuestas.
  const contextRef = useRef({ directoryId, actorId, session: 0 });
  const sessionKeyRef = useRef<string | null>(null);
  const sessionKey = `${directoryId ?? "null"}|${actorId ?? "null"}`;
  if (sessionKeyRef.current !== sessionKey) {
    sessionKeyRef.current = sessionKey;
    contextRef.current = {
      directoryId,
      actorId,
      session: contextRef.current.session + 1,
    };
  }

  // Puerta de exclusión local cuando el padre no comparte la suya.
  const localGateRef = useRef<ReceptionOperationGate | null>(null);
  if (!localGateRef.current) {
    let held = false;
    localGateRef.current = {
      acquire: () => {
        if (held) return false;
        held = true;
        return true;
      },
      release: () => {
        held = false;
      },
    };
  }
  const gate = gateProp ?? localGateRef.current;

  const heldRef = useRef(false);
  const claim = () => {
    if (disabled) return false;
    if (!gate.acquire()) return false;
    heldRef.current = true;
    setBusy(true);
    return true;
  };
  const release = () => {
    if (!heldRef.current) return;
    heldRef.current = false;
    gate.release();
    setBusy(false);
  };
  // Liberar la puerta al desmontar evita una concesión huérfana si el padre
  // revoca capacidades (o cierra) con una operación en vuelo.
  useEffect(
    () => () => {
      if (heldRef.current) {
        heldRef.current = false;
        gate.release();
      }
    },
    [gate],
  );

  const sameContext = (vars: { directoryId: number; actorId: string; session: number }) => {
    const current = contextRef.current;
    return (
      current.directoryId === vars.directoryId &&
      current.actorId === vars.actorId &&
      current.session === vars.session
    );
  };

  const invalidateMembership = (vars: { directoryId: number; actorId: string }) => {
    queryClient.invalidateQueries({
      queryKey: receptionMembershipQueryKey(vars.directoryId, vars.actorId),
    });
  };

  const membership = useQuery({
    queryKey: receptionMembershipQueryKey(directoryId, actorId),
    queryFn: () => documentsService.getReceptionMembership(directoryId),
    enabled: canMembership,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const participantUserTrimmed = participantUserQuery.trim();
  const participantRoleTrimmed = participantRoleQuery.trim();
  const delegateUserTrimmed = delegateUserQuery.trim();

  const participantUserSearch = useQuery({
    queryKey: receptionRecipientsQueryKey(
      directoryId,
      actorId,
      "participant-user",
      participantUserTrimmed,
    ),
    queryFn: () =>
      documentsService.searchReceptionUserRecipients(
        directoryId,
        participantUserTrimmed,
        20,
      ),
    enabled: canParticipants && participantUserTrimmed.length >= 2,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const participantRoleSearch = useQuery({
    queryKey: receptionRecipientsQueryKey(
      directoryId,
      actorId,
      "participant-role",
      participantRoleTrimmed,
    ),
    queryFn: () =>
      documentsService.searchReceptionRoleRecipients(
        directoryId,
        participantRoleTrimmed === "" ? undefined : participantRoleTrimmed,
        20,
      ),
    enabled: canParticipants,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const delegateUserSearch = useQuery({
    queryKey: receptionRecipientsQueryKey(
      directoryId,
      actorId,
      "delegate-user",
      delegateUserTrimmed,
    ),
    queryFn: () =>
      documentsService.searchReceptionUserRecipients(
        directoryId,
        delegateUserTrimmed,
        20,
      ),
    enabled: canDelegates && delegateUserTrimmed.length >= 2,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Cambiar de carpeta o actor descarta borradores sin migrarlos.
  useEffect(() => {
    setError(null);
    setParticipantUserQuery("");
    setSelectedParticipantUser(null);
    setParticipantUserPeerRead(false);
    setParticipantRoleQuery("");
    setSelectedParticipantRole(null);
    setParticipantRolePeerRead(false);
    setDelegateUserQuery("");
    setSelectedDelegateUser(null);
    setNewDelegateFlags({});
    setDelegateDrafts({});
    setConfirmRemoval(null);
  }, [directoryId, actorId]);

  // Cambiar el texto de búsqueda invalida cualquier selección previa.
  useEffect(() => {
    setSelectedParticipantUser(null);
  }, [participantUserTrimmed, directoryId, actorId]);
  useEffect(() => {
    setSelectedParticipantRole(null);
  }, [participantRoleTrimmed, directoryId, actorId]);
  useEffect(() => {
    setSelectedDelegateUser(null);
  }, [delegateUserTrimmed, directoryId, actorId]);

  const participantMutation = useMutation({
    mutationFn: (vars: ParticipantVars) => {
      // La identidad capturada (carpeta + actor + sesión) debe seguir vigente
      // antes de cualquier autoridad actual o llamada a la API.
      if (!sameContext(vars)) throw new Error(STALE_CONTEXT_REASON);
      const target =
        vars.kind === "user" ? (vars.userId as string) : (vars.roleId as number);
      const check = guardRef.current.participant(vars.scope, vars.kind, target);
      if (!check.ok) throw new Error(check.reason);
      return vars.kind === "user"
        ? documentsService.setReceptionParticipant(vars.directoryId, {
            userId: vars.userId as string,
            peerRead: vars.peerRead,
          })
        : documentsService.setReceptionParticipant(vars.directoryId, {
            roleId: vars.roleId as number,
            peerRead: vars.peerRead,
          });
    },
    retry: false,
    onSuccess: (data, vars) => {
      invalidateMembership(vars);
      const valid =
        vars.kind === "user"
          ? isValidUserParticipant(data, vars.directoryId) &&
            (data as DirectoryUserParticipant).userId === vars.userId &&
            (data as DirectoryUserParticipant).peerRead === vars.peerRead
          : isValidRoleParticipant(data, vars.directoryId) &&
            (data as DirectoryRoleParticipant).roleId === vars.roleId &&
            (data as DirectoryRoleParticipant).peerRead === vars.peerRead;
      if (!sameContext(vars)) return;
      if (valid) {
        setError(null);
        onChanged?.();
        setParticipantUserQuery("");
        setSelectedParticipantUser(null);
        setParticipantUserPeerRead(false);
        setParticipantRoleQuery("");
        setSelectedParticipantRole(null);
        setParticipantRolePeerRead(false);
      } else {
        setError(CONFIRM_FAILURE);
      }
    },
    onError: (cause, vars) => {
      if (!sameContext(vars)) return;
      setError(responseMessage(cause, "No se pudo guardar el participante."));
    },
    onSettled: () => release(),
  });

  const removalMutation = useMutation({
    mutationFn: (vars: RemovalVars) => {
      if (!sameContext(vars)) throw new Error(STALE_CONTEXT_REASON);
      const target =
        vars.kind === "role" ? (vars.roleId as number) : (vars.userId as string);
      const check = guardRef.current.removal(vars.kind, target);
      if (!check.ok) throw new Error(check.reason);
      if (vars.kind === "user")
        return documentsService.removeReceptionUserParticipant(
          vars.directoryId,
          vars.userId as string,
        );
      if (vars.kind === "role")
        return documentsService.removeReceptionRoleParticipant(
          vars.directoryId,
          vars.roleId as number,
        );
      return documentsService.removeReceptionDelegate(
        vars.directoryId,
        vars.userId as string,
      );
    },
    retry: false,
    onSuccess: (data, vars) => {
      invalidateMembership(vars);
      if (!sameContext(vars)) return;
      if (data && (data as { removed?: boolean }).removed === true) {
        setError(null);
        onChanged?.();
      } else {
        setError(CONFIRM_FAILURE);
      }
    },
    onError: (cause, vars) => {
      if (!sameContext(vars)) return;
      setError(responseMessage(cause, "No se pudo quitar el registro."));
    },
    onSettled: () => release(),
  });

  const delegateMutation = useMutation({
    mutationFn: (vars: DelegateVars) => {
      if (!sameContext(vars)) throw new Error(STALE_CONTEXT_REASON);
      if (vars.fromSearch) {
        const searchCheck = guardRef.current.delegateSearch(vars.targetId);
        if (!searchCheck.ok) throw new Error(searchCheck.reason);
      }
      const check = guardRef.current.delegate(vars.targetId, vars.flags);
      if (!check.ok) throw new Error(check.reason);
      return documentsService.setReceptionDelegate(
        vars.directoryId,
        vars.targetId,
        delegatePayload(vars.flags),
      );
    },
    retry: false,
    onSuccess: (data, vars) => {
      invalidateMembership(vars);
      const expected = delegatePayload(vars.flags);
      const returned = data as DirectoryDelegate;
      // El flag `full` importa por sí solo: comparar las 7 banderas exactas, no
      // solo el conjunto de operaciones efectivas.
      const valid =
        isValidDelegate(data, vars.directoryId) &&
        returned.userId === vars.targetId &&
        returned.full === expected.full &&
        OPERATIONAL_CAPABILITY_KEYS.every(
          (key) => returned[key] === expected[key],
        );
      if (!sameContext(vars)) return;
      if (valid) {
        setError(null);
        onChanged?.();
        setDelegateSelectionReset();
      } else {
        // El backend pudo haber aplicado el reemplazo: refrescar la autoridad
        // (membresía ya invalidada) sin conceder éxito ni retener el borrador.
        queryClient.invalidateQueries({ queryKey: ["directory-reception"] });
        setError(CONFIRM_FAILURE);
      }
    },
    onError: (cause, vars) => {
      if (!sameContext(vars)) return;
      setError(responseMessage(cause, "No se pudo guardar el delegado."));
    },
    onSettled: () => release(),
  });

  function setDelegateSelectionReset() {
    setDelegateUserQuery("");
    setSelectedDelegateUser(null);
    setNewDelegateFlags({});
    setDelegateDrafts({});
  }

  const actorOpMap = actorOps(capabilities);
  const canFull = actorHasAllOps(capabilities);

  const settled = !membership.isFetching && !membership.isLoading;
  const membershipValid =
    settled &&
    membership.isSuccess &&
    isValidMembership(membership.data, directoryId);
  const forbidden =
    membership.isError &&
    [403, 404].includes(
      (membership.error as { response?: { status?: number } } | undefined)
        ?.response?.status ?? 0,
    );

  const data = membership.data;
  const users = membershipValid && data ? data.users : [];
  const roles = membershipValid && data ? data.roles : [];
  const delegates = membershipValid && data ? data.delegates : [];

  const startParticipant = (
    vars: Omit<ParticipantVars, "directoryId" | "actorId" | "session">,
  ) => {
    const target = vars.kind === "user" ? vars.userId : vars.roleId;
    const check = evaluateParticipant(vars.scope, vars.kind, target as string | number);
    if (!check.ok) {
      setError(check.reason);
      return;
    }
    if (!claim()) return;
    const current = contextRef.current;
    participantMutation.mutate({
      ...vars,
      directoryId: current.directoryId,
      actorId: current.actorId,
      session: current.session,
    });
  };

  const startRemoval = (vars: Omit<RemovalVars, "directoryId" | "actorId" | "session">) => {
    const target = vars.kind === "role" ? vars.roleId : vars.userId;
    const check = evaluateRemoval(vars.kind, target as string | number);
    if (!check.ok) {
      setError(check.reason);
      return;
    }
    if (!claim()) return;
    const current = contextRef.current;
    setConfirmRemoval(null);
    removalMutation.mutate({
      ...vars,
      directoryId: current.directoryId,
      actorId: current.actorId,
      session: current.session,
    });
  };

  const startDelegate = (targetId: string, flags: DelegateFlagsInput, fromSearch: boolean) => {
    if (fromSearch) {
      const searchCheck = evaluateDelegateSearch(targetId);
      if (!searchCheck.ok) {
        setError(searchCheck.reason);
        return;
      }
    }
    const check = evaluateDelegateGrant(targetId, flags);
    if (!check.ok) {
      setError(check.reason);
      return;
    }
    if (!claim()) return;
    const current = contextRef.current;
    delegateMutation.mutate({
      directoryId: current.directoryId,
      actorId: current.actorId,
      session: current.session,
      targetId,
      flags,
      fromSearch,
    });
  };

  function evaluateParticipant(
    scope: "existing" | "search",
    kind: "user" | "role",
    targetId: string | number,
  ): GuardResult {
    if (!canParticipants)
      return { ok: false, reason: "No tienes permiso para gestionar participantes." };
    if (!membershipValid)
      return { ok: false, reason: "La membresía debe estar vigente para modificar participantes." };
    if (scope === "search") {
      const ready = kind === "user" ? participantUserReady : participantRoleReady;
      const selected = kind === "user" ? selectedParticipantUser?.id : selectedParticipantRole?.id;
      if (!ready || selected !== targetId)
        return { ok: false, reason: "Selecciona un destinatario vigente de la búsqueda." };
    } else {
      const exists =
        kind === "user"
          ? users.some((user) => user.userId === targetId)
          : roles.some((role) => role.roleId === targetId);
      if (!exists)
        return { ok: false, reason: "El registro ya no existe en la membresía vigente." };
    }
    return { ok: true, reason: "" };
  }

  function evaluateDelegateGrant(targetId: string, flags: DelegateFlagsInput): GuardResult {
    if (!canDelegates)
      return { ok: false, reason: "No tienes permiso para gestionar delegados." };
    if (!membershipValid)
      return { ok: false, reason: "La membresía debe estar vigente para gestionar delegados." };
    if (targetId === ownerId)
      return { ok: false, reason: "El propietario no se puede gestionar como delegado." };
    if (targetId === actorId)
      return { ok: false, reason: "No puedes gestionar tu propia delegación." };
    const existing = delegates.find((row) => row.userId === targetId) ?? null;
    if (existing && !canManageDelegate({ capabilities, actorId, ownerId, targetId, existing }))
      return {
        ok: false,
        reason: "No puedes otorgar una delegación superior a la que ya existe.",
      };
    if (!requestedWithinActor(capabilities, flags))
      return { ok: false, reason: "No puedes otorgar permisos que superen tu propia delegación." };
    return { ok: true, reason: "" };
  }

  function evaluateDelegateSearch(targetId: string): GuardResult {
    if (!canDelegates)
      return { ok: false, reason: "No tienes permiso para gestionar delegados." };
    if (!delegateUserReady || selectedDelegateUser?.id !== targetId)
      return { ok: false, reason: "Selecciona un destinatario vigente de la búsqueda." };
    return { ok: true, reason: "" };
  }

  function evaluateRemoval(
    kind: "user" | "role" | "delegate",
    targetId: string | number,
  ): GuardResult {
    if (kind === "delegate") {
      if (!canDelegates)
        return { ok: false, reason: "No tienes permiso para gestionar delegados." };
      if (!membershipValid)
        return { ok: false, reason: "La membresía debe estar vigente para gestionar delegados." };
      const existing = delegates.find((row) => row.userId === targetId) ?? null;
      if (!existing)
        return { ok: false, reason: "La delegación ya no existe en la membresía vigente." };
      if (!canManageDelegate({ capabilities, actorId, ownerId, targetId: targetId as string, existing }))
        return {
          ok: false,
          reason: "No puedes quitar una delegación con permisos superiores a los tuyos.",
        };
      return { ok: true, reason: "" };
    }
    if (!canParticipants)
      return { ok: false, reason: "No tienes permiso para gestionar participantes." };
    if (!membershipValid)
      return { ok: false, reason: "La membresía debe estar vigente para modificar participantes." };
    const exists =
      kind === "user"
        ? users.some((user) => user.userId === targetId)
        : roles.some((role) => role.roleId === targetId);
    if (!exists)
      return { ok: false, reason: "El registro ya no existe en la membresía vigente." };
    return { ok: true, reason: "" };
  }

  guardRef.current = {
    participant: evaluateParticipant,
    delegate: evaluateDelegateGrant,
    delegateSearch: evaluateDelegateSearch,
    removal: evaluateRemoval,
  };

  const participantUserResults = isValidRecipientUsers(participantUserSearch.data)
    ? participantUserSearch.data
    : [];
  const participantRoleResults = isValidRecipientRoles(participantRoleSearch.data)
    ? participantRoleSearch.data
    : [];
  const delegateUserResults = (
    isValidRecipientUsers(delegateUserSearch.data) ? delegateUserSearch.data : []
  ).filter((user) => user.id !== ownerId && user.id !== actorId);

  const participantUserReady =
    participantUserSearch.isSuccess &&
    !participantUserSearch.isFetching &&
    !participantUserSearch.isError &&
    participantUserResults.some((user) => user.id === selectedParticipantUser?.id);
  const participantRoleReady =
    participantRoleSearch.isSuccess &&
    !participantRoleSearch.isFetching &&
    !participantRoleSearch.isError &&
    participantRoleResults.some((role) => role.id === selectedParticipantRole?.id);
  const delegateUserReady =
    delegateUserSearch.isSuccess &&
    !delegateUserSearch.isFetching &&
    !delegateUserSearch.isError &&
    delegateUserResults.some((user) => user.id === selectedDelegateUser?.id);

  const actionsDisabled = disabled || busy;

  const delegateGrant = selectedDelegateUser
    ? evaluateDelegateGrant(selectedDelegateUser.id, newDelegateFlags)
    : null;
  const delegateAddDisabled =
    actionsDisabled || !delegateUserReady || !delegateGrant?.ok;

  const flagControls = (
    draft: DelegateFlagsInput,
    onChange: (next: DelegateFlagsInput) => void,
    keyPrefix: string,
  ) => {
    const eff = effectiveOps(draft);
    const locked = draft.full === true;
    return (
      <div className="space-y-1">
        {canFull ? (
          <CheckboxField
            label={FULL_LABEL}
            checked={draft.full === true}
            disabled={actionsDisabled}
            onChange={(checked) => onChange({ ...draft, full: checked })}
          />
        ) : null}
        {OPERATIONAL_CAPABILITY_KEYS.map((key) => {
          if (!actorOpMap[key]) return null;
          if (key === "readAll") {
            return (
              <CheckboxField
                key={`${keyPrefix}-${key}`}
                label={READ_ALL_LABEL}
                checked={eff.readAll}
                disabled={actionsDisabled || draft.review === true || locked}
                onChange={(checked) => onChange({ ...draft, readAll: checked })}
              />
            );
          }
          return (
            <CheckboxField
              key={`${keyPrefix}-${key}`}
              label={FLAG_LABELS[key]}
              checked={eff[key]}
              disabled={actionsDisabled || locked}
              onChange={(checked) =>
                onChange({ ...draft, [key]: checked } as DelegateFlagsInput)
              }
            />
          );
        })}
      </div>
    );
  };

  const renderConfirmRemoval = (
    key: string,
    vars: Omit<RemovalVars, "directoryId" | "actorId" | "session">,
    readOnly = false,
  ) =>
    readOnly ? (
      <Button size="sm" variant="outline" disabled>
        {`Quitar ${key}`}
      </Button>
    ) : confirmRemoval === key ? (
      <span className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">
          Se revocará su acceso; el historial y las cuotas se conservan.
        </span>
        <Button
          size="sm"
          variant="destructive"
          disabled={actionsDisabled}
          onClick={() => startRemoval(vars)}
        >
          Confirmar
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setConfirmRemoval(null)}
        >
          Cancelar
        </Button>
      </span>
    ) : (
      <Button
        size="sm"
        variant="outline"
        disabled={actionsDisabled}
        onClick={() => setConfirmRemoval(key)}
      >
        {`Quitar ${key}`}
      </Button>
    );

  return (
    <section aria-label="Membresía de recepción" className="space-y-3 border-t pt-3">
      <h3 className="text-sm font-semibold">
        Gestionar participantes y delegados
      </h3>

      {membership.isLoading ? (
        <p className="text-xs text-muted-foreground">Cargando membresías...</p>
      ) : null}
      {!membership.isLoading && membership.isFetching ? (
        <p className="text-xs text-muted-foreground">Actualizando membresías...</p>
      ) : null}

      {membership.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {forbidden
              ? "No tienes permiso para consultar las membresías de esta carpeta."
              : responseMessage(
                  membership.error,
                  "No se pudo cargar la membresía de recepción.",
                )}
          </AlertDescription>
        </Alert>
      ) : null}

      {settled && membership.isSuccess && !membershipValid ? (
        <Alert variant="destructive">
          <AlertDescription>
            La membresía de recepción no es válida para esta carpeta.
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {membershipValid ? (
        <>
          {canParticipants ? (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Participantes</h4>
              <p className="text-xs text-muted-foreground">
                La visibilidad de entregas de otros participantes es de solo
                lectura y nunca otorga edición, uso compartido ni revisión.
              </p>

              <ul className="space-y-2">
                {users.map((user) => (
                  <li
                    key={`user-${user.userId}`}
                    role="group"
                    aria-label={`Usuario (ID): ${user.userId}`}
                    className="flex flex-wrap items-center gap-2 rounded-md border p-2"
                  >
                    <span className="text-sm">{`Usuario (ID): ${user.userId}`}</span>
                    <CheckboxField
                      label={PEER_READ_ROW_LABEL}
                      checked={user.peerRead}
                      disabled={actionsDisabled}
                      onChange={(checked) =>
                        startParticipant({
                          scope: "existing",
                          kind: "user",
                          userId: user.userId,
                          peerRead: checked,
                        })
                      }
                    />
                    {renderConfirmRemoval(`usuario ${user.userId}`, {
                      kind: "user",
                      userId: user.userId,
                    })}
                  </li>
                ))}
                {roles.map((role) => (
                  <li
                    key={`role-${role.roleId}`}
                    role="group"
                    aria-label={`Rol (ID): ${role.roleId}`}
                    className="flex flex-wrap items-center gap-2 rounded-md border p-2"
                  >
                    <span className="text-sm">{`Rol (ID): ${role.roleId}`}</span>
                    <CheckboxField
                      label={PEER_READ_ROW_LABEL}
                      checked={role.peerRead}
                      disabled={actionsDisabled}
                      onChange={(checked) =>
                        startParticipant({
                          scope: "existing",
                          kind: "role",
                          roleId: role.roleId,
                          peerRead: checked,
                        })
                      }
                    />
                    {renderConfirmRemoval(`rol ${role.roleId}`, {
                      kind: "role",
                      roleId: role.roleId,
                    })}
                  </li>
                ))}
                {users.length === 0 && roles.length === 0 ? (
                  <li className="text-xs text-muted-foreground">
                    Sin participantes.
                  </li>
                ) : null}
              </ul>

              <div className="space-y-2 rounded-md border p-2">
                <Input
                  aria-label="Buscar usuario para participante"
                  value={participantUserQuery}
                  maxLength={100}
                  disabled={actionsDisabled}
                  placeholder="Buscar usuario (mínimo 2 caracteres)"
                  onChange={(event) => setParticipantUserQuery(event.target.value)}
                />
                {participantUserTrimmed.length >= 2 && participantUserSearch.isFetching ? (
                  <p className="text-xs text-muted-foreground">
                    Actualizando resultados...
                  </p>
                ) : null}
                {participantUserTrimmed.length >= 2 &&
                participantUserSearch.isSuccess &&
                !participantUserSearch.isFetching &&
                !participantUserSearch.isError ? (
                  <ul className="space-y-1">
                    {participantUserResults.map((user) => (
                      <li key={`p-user-${user.id}`}>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={actionsDisabled}
                          onClick={() => setSelectedParticipantUser(user)}
                        >
                          {`${user.name} (${user.email})`}
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {selectedParticipantUser ? (
                  <p className="text-xs text-muted-foreground">
                    {`Seleccionado: ${selectedParticipantUser.name} (${selectedParticipantUser.email})`}
                  </p>
                ) : null}
                <CheckboxField
                  label={PEER_READ_NEW_LABEL}
                  checked={participantUserPeerRead}
                  disabled={actionsDisabled}
                  onChange={setParticipantUserPeerRead}
                />
                <Button
                  size="sm"
                  disabled={actionsDisabled || !participantUserReady}
                  onClick={() =>
                    startParticipant({
                      scope: "search",
                      kind: "user",
                      userId: selectedParticipantUser?.id,
                      peerRead: participantUserPeerRead,
                    })
                  }
                >
                  Agregar participante
                </Button>
              </div>

              <div className="space-y-2 rounded-md border p-2">
                <Input
                  aria-label="Buscar rol para participante"
                  value={participantRoleQuery}
                  maxLength={100}
                  disabled={actionsDisabled}
                  placeholder="Buscar rol (opcional)"
                  onChange={(event) => setParticipantRoleQuery(event.target.value)}
                />
                {participantRoleSearch.isFetching ? (
                  <p className="text-xs text-muted-foreground">
                    Actualizando resultados...
                  </p>
                ) : null}
                {participantRoleSearch.isSuccess &&
                !participantRoleSearch.isFetching &&
                !participantRoleSearch.isError ? (
                  <ul className="space-y-1">
                    {participantRoleResults.map((role) => (
                      <li key={`p-role-${role.id}`}>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={actionsDisabled}
                          onClick={() => setSelectedParticipantRole(role)}
                        >
                          {`${role.label} (${role.key})`}
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {selectedParticipantRole ? (
                  <p className="text-xs text-muted-foreground">
                    {`Seleccionado: ${selectedParticipantRole.label}`}
                  </p>
                ) : null}
                <CheckboxField
                  label={PEER_READ_ROLE_LABEL}
                  checked={participantRolePeerRead}
                  disabled={actionsDisabled}
                  onChange={setParticipantRolePeerRead}
                />
                <Button
                  size="sm"
                  disabled={actionsDisabled || !participantRoleReady}
                  onClick={() =>
                    startParticipant({
                      scope: "search",
                      kind: "role",
                      roleId: selectedParticipantRole?.id,
                      peerRead: participantRolePeerRead,
                    })
                  }
                >
                  Agregar rol
                </Button>
              </div>
            </div>
          ) : null}

          {canDelegates ? (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Delegados</h4>

              <ul className="space-y-2">
                {delegates.map((delegate) => {
                  const manageable = canManageDelegate({
                    capabilities,
                    actorId,
                    ownerId,
                    targetId: delegate.userId,
                    existing: delegate,
                  });
                  const draft =
                    delegateDrafts[delegate.userId] ?? (delegate as DelegateFlagsInput);
                  const draftWithin = requestedWithinActor(capabilities, draft);
                  return (
                    <li
                      key={`delegate-${delegate.userId}`}
                      role="group"
                      aria-label={`Usuario (ID): ${delegate.userId}`}
                      className="space-y-2 rounded-md border p-2"
                    >
                      <span className="text-sm">{`Usuario (ID): ${delegate.userId}`}</span>
                      {manageable ? (
                        <>
                          {flagControls(
                            draft,
                            (next) =>
                              setDelegateDrafts((current) => ({
                                ...current,
                                [delegate.userId]: next,
                              })),
                            `delegate-${delegate.userId}`,
                          )}
                          {!draftWithin ? (
                            <p className="text-xs text-destructive">
                              No puedes otorgar permisos que superen tu propia
                              delegación.
                            </p>
                          ) : null}
                          <span className="flex flex-wrap items-center gap-2">
                            <Button
                              size="sm"
                              disabled={actionsDisabled || !draftWithin}
                              onClick={() =>
                                startDelegate(delegate.userId, draft, false)
                              }
                            >
                              {`Guardar delegado ${delegate.userId}`}
                            </Button>
                            {renderConfirmRemoval(`delegado ${delegate.userId}`, {
                              kind: "delegate",
                              userId: delegate.userId,
                            })}
                          </span>
                        </>
                      ) : (
                        <>
                          <p className="text-xs text-muted-foreground">
                            {delegate.userId === ownerId
                              ? "El propietario no se puede gestionar como delegado ni transferir la propiedad."
                              : delegate.userId === actorId
                                ? "No puedes gestionar tu propia delegación."
                                : "No puedes modificar una delegación con permisos superiores a los tuyos."}
                          </p>
                          <p className="text-xs">{operationSummary(draft)}</p>
                          {renderConfirmRemoval(
                            `delegado ${delegate.userId}`,
                            { kind: "delegate", userId: delegate.userId },
                            true,
                          )}
                        </>
                      )}
                    </li>
                  );
                })}
                {delegates.length === 0 ? (
                  <li className="text-xs text-muted-foreground">Sin delegados.</li>
                ) : null}
              </ul>

              <div className="space-y-2 rounded-md border p-2">
                <Input
                  aria-label="Buscar usuario para delegado"
                  value={delegateUserQuery}
                  maxLength={100}
                  disabled={actionsDisabled}
                  placeholder="Buscar usuario (mínimo 2 caracteres)"
                  onChange={(event) => setDelegateUserQuery(event.target.value)}
                />
                {delegateUserTrimmed.length >= 2 && delegateUserSearch.isFetching ? (
                  <p className="text-xs text-muted-foreground">
                    Actualizando resultados...
                  </p>
                ) : null}
                {delegateUserTrimmed.length >= 2 &&
                delegateUserSearch.isSuccess &&
                !delegateUserSearch.isFetching &&
                !delegateUserSearch.isError ? (
                  <ul className="space-y-1">
                    {delegateUserResults.map((user) => (
                      <li key={`d-user-${user.id}`}>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={actionsDisabled}
                          onClick={() => setSelectedDelegateUser(user)}
                        >
                          {`${user.name} (${user.email})`}
                        </Button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {selectedDelegateUser ? (
                  <p className="text-xs text-muted-foreground">
                    {`Seleccionado: ${selectedDelegateUser.name} (${selectedDelegateUser.email})`}
                  </p>
                ) : null}
                {selectedDelegateUser && delegateGrant && !delegateGrant.ok ? (
                  <p className="text-xs text-destructive">{delegateGrant.reason}</p>
                ) : null}
                {flagControls(newDelegateFlags, setNewDelegateFlags, "new-delegate")}
                <Button
                  size="sm"
                  disabled={delegateAddDisabled}
                  onClick={() =>
                    startDelegate(
                      selectedDelegateUser?.id ?? "",
                      newDelegateFlags,
                      true,
                    )
                  }
                >
                  Agregar delegado
                </Button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
