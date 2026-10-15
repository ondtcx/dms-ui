"use client";

import { useQuery } from "@tanstack/react-query";
import { documentsService } from "@/lib/services/documents.service";
import { useAuth } from "@/lib/contexts/AuthContext";
import type { ReceptionSettings } from "@/lib/types";

/**
 * Capacidades de recepción leídas para el actor y la carpeta actuales. La clave
 * conserva la convención existente de los ajustes para no mezclar lecturas de
 * actores distintos ni reutilizar caché ajena.
 */
export function directorySubmissionReceptionQueryKey(
  directoryId: number,
  actorId: string,
) {
  return ["directory-reception", directoryId, actorId] as const;
}

/**
 * Metadatos autorizados de la carpeta, con alcance de actor. La invalidación por
 * prefijo `directory-breadcrumb` sigue funcionando con esta clave ampliada.
 */
export function directorySubmissionMetadataQueryKey(
  directoryId: number,
  actorId: string,
) {
  return ["directory-breadcrumb", actorId, directoryId] as const;
}

const RECEPTION_CAPABILITY_KEYS = [
  "configure",
  "manageParticipants",
  "readAll",
  "review",
  "manageDelegates",
  "manageStructure",
  "owner",
  "discover",
  "submit",
  "peerRead",
] as const;

export function isPositiveDirectoryId(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

/**
 * Valida la forma completa y exacta de la configuración leída: carpeta
 * coincidente, recepción activa, cuota booleana y las diez banderas booleanas.
 * Nunca concede autoridad por rol global.
 */
export function isValidReceptionReadback(
  value: unknown,
  directoryId: number,
): value is ReceptionSettings {
  const settings = value as Partial<ReceptionSettings> | null | undefined;
  if (
    !settings ||
    settings.enabled !== true ||
    settings.directoryId !== directoryId
  )
    return false;
  if (typeof settings.singleDocumentPerParticipant !== "boolean") return false;
  const capabilities = settings.capabilities as unknown as
    | Record<string, unknown>
    | undefined;
  if (!capabilities) return false;
  return RECEPTION_CAPABILITY_KEYS.every(
    (key) => typeof capabilities[key] === "boolean",
  );
}

export interface DirectorySubmissionState {
  directoryId: number | null;
  actorId: string | null;
  isReception: boolean;
  canSubmit: boolean;
  singleQuota: boolean;
  busy: boolean;
  error: string | null;
  directoryName: string | null;
}

/**
 * Autoridad de envío a una carpeta para el actor autenticado actual. La raíz y
 * las carpetas ordinarias conservan el comportamiento de carga existente; una
 * carpeta de recepción exige metadatos autorizados vigentes y una lectura válida
 * y asentada de capacidades con `submit === true`. Cualquier hueco, error o
 * recarga pendiente se cierra como denegación.
 */
export function useDirectorySubmission(
  directoryId: number | null | undefined,
  enabled = true,
): DirectorySubmissionState {
  const { user } = useAuth();
  const actorId = user?.id ?? null;
  const validId = isPositiveDirectoryId(directoryId) ? directoryId : null;
  const queryEnabled = enabled && validId !== null && actorId !== null;

  const metadata = useQuery({
    queryKey: directorySubmissionMetadataQueryKey(validId ?? 0, actorId ?? ""),
    queryFn: () => documentsService.getDirectoryBreadcrumb(validId as number),
    enabled: queryEnabled,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const target =
    metadata.isSuccess && Array.isArray(metadata.data)
      ? metadata.data.find((directory) => directory.id === validId)
      : undefined;
  const receptionFlag = target?.receptionEnabled;
  const metadataSettled =
    metadata.isSuccess && !metadata.isFetching && metadata.error == null;
  const receptionKnown =
    metadataSettled && target !== undefined && typeof receptionFlag === "boolean";
  const isReception = receptionKnown && receptionFlag === true;

  const settings = useQuery({
    queryKey: directorySubmissionReceptionQueryKey(validId ?? 0, actorId ?? ""),
    queryFn: () => documentsService.getReception(validId as number),
    enabled: enabled && isReception && actorId !== null,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const settingsSettled =
    settings.isSuccess && !settings.isFetching && settings.error == null;
  const settingsValid =
    settingsSettled && isValidReceptionReadback(settings.data, validId as number);

  const metadataBusy =
    queryEnabled && (metadata.isLoading || metadata.isFetching);
  const settingsBusy =
    enabled &&
    isReception &&
    actorId !== null &&
    (settings.isLoading || settings.isFetching);

  const base = {
    directoryId: validId,
    actorId,
  };

  if (!enabled) {
    // Sin permiso de consulta activo no se concede autoridad alguna, aunque la
    // caché del actor y la carpeta esté caliente.
    return {
      ...base,
      isReception: false,
      canSubmit: false,
      singleQuota: false,
      busy: false,
      error: null,
      directoryName: null,
    };
  }
  if (directoryId === null || directoryId === undefined) {
    // Raíz: comportamiento ordinario existente, pero solo con identidad actual.
    return {
      directoryId: null,
      actorId,
      isReception: false,
      canSubmit: actorId !== null,
      singleQuota: false,
      busy: false,
      error: null,
      directoryName: null,
    };
  }
  if (validId === null) {
    return {
      ...base,
      directoryId: null,
      isReception: false,
      canSubmit: false,
      singleQuota: false,
      busy: false,
      error: "La carpeta indicada no es válida.",
      directoryName: null,
    };
  }
  if (actorId === null) {
    return {
      ...base,
      isReception: false,
      canSubmit: false,
      singleQuota: false,
      busy: false,
      error: "No se pudo identificar al usuario actual.",
      directoryName: null,
    };
  }
  if (metadataBusy) {
    return {
      ...base,
      isReception,
      canSubmit: false,
      singleQuota: false,
      busy: true,
      error: null,
      directoryName: null,
    };
  }
  if (metadata.error != null || !receptionKnown) {
    return {
      ...base,
      isReception: false,
      canSubmit: false,
      singleQuota: false,
      busy: false,
      error: "No se pudo verificar el estado de la carpeta.",
      directoryName: null,
    };
  }
  if (receptionFlag === false) {
    return {
      ...base,
      isReception: false,
      canSubmit: true,
      singleQuota: false,
      busy: false,
      error: null,
      directoryName: target?.name ?? null,
    };
  }
  if (settingsBusy) {
    return {
      ...base,
      isReception: true,
      canSubmit: false,
      singleQuota: false,
      busy: true,
      error: null,
      directoryName: target?.name ?? null,
    };
  }
  if (!settingsValid) {
    return {
      ...base,
      isReception: true,
      canSubmit: false,
      singleQuota: false,
      busy: false,
      error: "No se pudieron verificar los permisos de esta carpeta de recepción.",
      directoryName: target?.name ?? null,
    };
  }
  return {
    ...base,
    isReception: true,
    canSubmit: settings.data!.capabilities.submit === true,
    singleQuota: settings.data!.singleDocumentPerParticipant === true,
    busy: false,
    error: null,
    directoryName: target?.name ?? null,
  };
}
