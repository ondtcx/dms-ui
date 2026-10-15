"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { documentsService } from "@/lib/services/documents.service";
import { invalidateDirectoryQueries } from "@/lib/directory-cache";
import { useAuth } from "@/lib/contexts/AuthContext";
import { ReceptionMembershipManager } from "@/components/documents/ReceptionMembershipManager";
import type { ReceptionOperationGate } from "@/lib/reception-membership";
import type {
  ConfigureReception,
  Directory,
  ReceptionSettings,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

const CAPABILITY_KEYS = [
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

/** Clave de consulta separada por carpeta y actor para no reutilizar capacidades ajenas. */
export function receptionSettingsQueryKey(
  directoryId: number | null,
  actorId: string | null,
) {
  return ["directory-reception", directoryId, actorId] as const;
}

function responseStatus(error: unknown): number | undefined {
  return (error as { response?: { status?: number } } | undefined)?.response
    ?.status;
}

function responseMessage(error: unknown, fallback: string): string {
  const message = (
    error as { response?: { data?: { message?: string } } } | undefined
  )?.response?.data?.message;
  return typeof message === "string" && message.trim() ? message : fallback;
}

/** Valida la forma exacta: booleanos reales, cuota booleana, recepción activa y carpeta coincidente. */
function isValidSettings(
  value: ReceptionSettings | undefined,
  directoryId: number,
): value is ReceptionSettings {
  if (!value || value.enabled !== true || value.directoryId !== directoryId)
    return false;
  if (typeof value.singleDocumentPerParticipant !== "boolean") return false;
  const capabilities = value.capabilities as unknown as
    | Record<string, unknown>
    | undefined;
  if (!capabilities) return false;
  return CAPABILITY_KEYS.every(
    (key) => typeof capabilities[key] === "boolean",
  );
}

interface ReceptionSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  directory: Directory | null;
}

export function ReceptionSettingsDialog({
  open,
  onOpenChange,
  directory,
}: ReceptionSettingsDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const actorId = user?.id ?? null;
  const directoryId = directory?.id ?? null;
  const isOwner =
    directory !== null && user?.id != null && directory.createdById === user.id;

  const [singleQuota, setSingleQuota] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [operationBusy, setOperationBusy] = useState(false);

  // Contexto sincrónico (carpeta + actor + sesión de diálogo). Se actualiza cada render para que
  // una respuesta antigua no pueda contaminar una carpeta/actor nuevos ni reabrir el mismo id.
  const contextRef = useRef({ directoryId, actorId, session: 0 });
  const sessionKeyRef = useRef<string | null>(null);
  const sessionKey = `${open ? 1 : 0}|${directoryId ?? "null"}|${actorId ?? "null"}`;
  if (sessionKeyRef.current !== sessionKey) {
    sessionKeyRef.current = sessionKey;
    contextRef.current = {
      directoryId,
      actorId,
      session: contextRef.current.session + 1,
    };
  }
  // Puerta de exclusión compartida con la gestión de membresía: un solo intento por diálogo.
  const operationHeldRef = useRef(false);
  const operationGateRef = useRef<ReceptionOperationGate>({
    acquire: () => {
      if (operationHeldRef.current) return false;
      operationHeldRef.current = true;
      setOperationBusy(true);
      return true;
    },
    release: () => {
      operationHeldRef.current = false;
      setOperationBusy(false);
    },
  });

  const settings = useQuery({
    queryKey: receptionSettingsQueryKey(directoryId, actorId),
    queryFn: () => documentsService.getReception(directoryId as number),
    enabled: open && directoryId !== null,
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Cambiar de carpeta o de actor descarta cualquier borrador sin migrarlo a la nueva clave.
  useEffect(() => {
    setSingleQuota(false);
    setConfirmed(false);
    setError(null);
  }, [directoryId, actorId]);

  useEffect(() => {
    if (settings.isSuccess && settings.data) {
      setSingleQuota(settings.data.singleDocumentPerParticipant === true);
    }
  }, [directoryId, actorId, settings.isSuccess]);

  const save = useMutation({
    mutationFn: (variables: {
      directoryId: number;
      actorId: string;
      session: number;
      payload: ConfigureReception;
    }) =>
      documentsService.configureReception(
        variables.directoryId,
        variables.payload,
      ),
    retry: false,
    onSuccess: (data, variables) => {
      const key = receptionSettingsQueryKey(
        variables.directoryId,
        variables.actorId,
      );
      if (isValidSettings(data, variables.directoryId)) {
        queryClient.setQueryData(key, data);
      } else {
        // Respuesta no confiable: no se concede caché optimista; se recarga la fuente autoritativa.
        queryClient.invalidateQueries({ queryKey: key });
      }
      invalidateDirectoryQueries(queryClient);

      const current = contextRef.current;
      if (
        current.directoryId !== variables.directoryId ||
        current.actorId !== variables.actorId ||
        current.session !== variables.session
      )
        return;
      if (isValidSettings(data, variables.directoryId)) {
        setError(null);
        setSingleQuota(data.singleDocumentPerParticipant === true);
      } else {
        setError(
          "No se pudo confirmar la configuración actual de la recepción. Vuelve a cargar la configuración.",
        );
      }
    },
    onError: (cause, variables) => {
      const current = contextRef.current;
      if (
        current.directoryId !== variables.directoryId ||
        current.actorId !== variables.actorId ||
        current.session !== variables.session
      )
        return;
      setError(
        responseMessage(
          cause,
          "No se pudo guardar la configuración de recepción.",
        ),
      );
    },
    onSettled: () => {
      operationGateRef.current.release();
    },
  });

  const status = responseStatus(settings.error);
  const hasError = settings.error != null;
  const settled = !settings.isFetching && !settings.isLoading;
  const ordinaryConversion =
    settled &&
    hasError &&
    status === 400 &&
    directory?.receptionEnabled === false &&
    isOwner;
  const settingsValid =
    directoryId !== null &&
    settings.isSuccess &&
    isValidSettings(settings.data, directoryId);

  const startSave = (payload: ConfigureReception) => {
    if (settings.isFetching) return;
    if (!operationGateRef.current.acquire()) return;
    const current = contextRef.current;
    if (current.directoryId === null || current.actorId === null) {
      operationGateRef.current.release();
      return;
    }
    save.mutate({
      directoryId: current.directoryId,
      actorId: current.actorId,
      session: current.session,
      payload,
    });
  };

  const confirmConversion = () => {
    if (!confirmed) return;
    startSave({ enabled: true, singleDocumentPerParticipant: singleQuota });
  };

  const saveQuota = () => {
    startSave({ enabled: true, singleDocumentPerParticipant: singleQuota });
  };

  const quotaOption = (readOnly: boolean) => (
    <div className="space-y-1">
      <div className="flex items-start gap-2">
        <input
          id="reception-single-quota"
          type="checkbox"
          className="mt-0.5"
          checked={singleQuota}
          disabled={readOnly}
          onChange={(event) => setSingleQuota(event.target.checked)}
        />
        <label htmlFor="reception-single-quota" className="text-sm">
          Un solo documento por participante
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        Las cuotas ya ocupadas se conservan aunque cambies esta opción; las
        entregas históricas no se liberan.
      </p>
    </div>
  );

  const errorAlert = error ? (
    <Alert variant="destructive">
      <AlertDescription>{error}</AlertDescription>
    </Alert>
  ) : null;

  const conversionForm = (
    <>
      <Alert>
        <AlertDescription>
          Activar la recepción es irreversible. Solo se permite en carpetas
          vacías, sin subcarpetas y con ancestros ordinarios.
        </AlertDescription>
      </Alert>
      <div className="flex items-start gap-2">
        <input
          id="reception-confirm"
          type="checkbox"
          className="mt-0.5"
          checked={confirmed}
          onChange={(event) => setConfirmed(event.target.checked)}
        />
        <label htmlFor="reception-confirm" className="text-sm">
          Entiendo que la activación es permanente y que la carpeta debe estar
          vacía.
        </label>
      </div>
      {quotaOption(false)}
      {errorAlert}
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancelar
        </Button>
        <Button
          onClick={confirmConversion}
          disabled={!confirmed || save.isPending || operationBusy}
        >
          Activar recepción
        </Button>
      </DialogFooter>
    </>
  );

  const enabledForm = (data: ReceptionSettings) => {
    const canConfigure = data.capabilities.configure === true;
    const canMembership =
      data.capabilities.manageParticipants === true ||
      data.capabilities.manageDelegates === true;
    return (
      <>
        <p className="text-sm font-medium">Recepción activada</p>
        {canConfigure ? null : (
          <p className="text-xs text-muted-foreground">
            Solo lectura: no tienes permiso para modificar esta recepción.
          </p>
        )}
        {quotaOption(!canConfigure)}
        {canMembership && directory && actorId ? (
          <ReceptionMembershipManager
            directory={directory}
            actorId={actorId}
            capabilities={data.capabilities}
            gate={operationGateRef.current}
            disabled={save.isPending || operationBusy}
            onChanged={() => invalidateDirectoryQueries(queryClient)}
          />
        ) : null}
        {errorAlert}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          {canConfigure ? (
            <Button
              onClick={saveQuota}
              disabled={save.isPending || operationBusy}
            >
              Guardar
            </Button>
          ) : null}
        </DialogFooter>
      </>
    );
  };

  const body = () => {
    if (directoryId === null || actorId === null)
      return (
        <p className="text-sm text-muted-foreground">No disponible.</p>
      );
    if (settings.isLoading)
      return (
        <p className="text-sm text-muted-foreground">
          Cargando configuración...
        </p>
      );
    if (settings.isFetching)
      return (
        <p className="text-sm text-muted-foreground">
          Actualizando la configuración...
        </p>
      );
    if (ordinaryConversion) return conversionForm;
    if (hasError) {
      if (status === 400 && directory?.receptionEnabled === undefined)
        return (
          <Alert variant="destructive">
            <AlertDescription>
              No se pudo determinar si esta carpeta es ordinaria. No se puede
              activar la recepción hasta confirmar el estado de la carpeta.
            </AlertDescription>
          </Alert>
        );
      return (
        <Alert variant="destructive">
          <AlertDescription>
            {responseMessage(
              settings.error,
              "No se pudo leer la configuración de recepción.",
            )}
          </AlertDescription>
        </Alert>
      );
    }
    if (settings.isSuccess && !settingsValid)
      return (
        <Alert variant="destructive">
          <AlertDescription>
            La configuración de recepción no es válida para esta carpeta.
          </AlertDescription>
        </Alert>
      );
    if (settings.isSuccess && settingsValid) return enabledForm(settings.data);
    return (
      <p className="text-sm text-muted-foreground">Cargando configuración...</p>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configuración de recepción</DialogTitle>
          <DialogDescription>{directory?.name ?? ""}</DialogDescription>
        </DialogHeader>
        {body()}
      </DialogContent>
    </Dialog>
  );
}
