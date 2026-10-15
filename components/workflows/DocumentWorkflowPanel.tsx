"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, History, Loader2, MessageSquare, UserRound } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/contexts/AuthContext";
import { usePermissions } from "@/hooks/use-permissions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WORKFLOW_STATUS_CONFIG } from "@/lib/workflow-status-config";
import { workflowsService } from "@/lib/services/workflows.service";
import {
  requiresWorkflowComment,
  WorkflowTransitionAction,
  WorkflowStatus,
  workflowErrorMessage,
  type ApplicableWorkflowDefinition,
  type WorkflowExecution,
} from "@/lib/types/workflows";
import { readWorkflowActionCapabilities, type WorkflowActionCapabilities } from "@/lib/workflow-action-capabilities";
import { getWorkflowTraceability } from "@/lib/document-traceability";

interface DocumentWorkflowPanelProps {
  documentId: number;
  documentOwnerId: string;
  documentVersionId?: number;
}

const ACTION_LABELS: Record<WorkflowTransitionAction, string> = {
  APPROVE: "Aprobar",
  REQUEST_CHANGES: "Solicitar cambios",
  REJECT: "Rechazar",
  CANCEL: "Cancelar flujo de trabajo",
  SUBMIT: "Reenviar versión corregida",
};

// Acciones que deciden sobre una versión revisada concreta y deben fallar cerrado.
const DECISION_ACTIONS: WorkflowTransitionAction[] = [
  WorkflowTransitionAction.APPROVE,
  WorkflowTransitionAction.REQUEST_CHANGES,
  WorkflowTransitionAction.REJECT,
];

const REVIEWED_VERSION_REQUIRED_MESSAGE = "No hay una versión revisada válida para decidir sobre este flujo de trabajo.";
const DECISION_HISTORY_UNAVAILABLE_MESSAGE = "El historial del flujo de trabajo no está disponible. Vuelve a intentarlo cuando termine de actualizarse.";
const DECISION_STALE_MESSAGE = "La versión revisada o la ejecución del flujo de trabajo cambió. Cierra y vuelve a abrir la acción para confirmar la versión vigente.";
const PARALLEL_OPERATION_MESSAGE = "Hay otra operación en curso. Espera a que termine antes de volver a intentarlo.";
const MISSING_REASSIGN_INPUT_MESSAGE = "Selecciona un usuario y un motivo para reasignar la etapa.";

function historyQueryKey(actorId: string, documentId: number) {
  return ["document-workflows", actorId, documentId] as const;
}

function definitionsQueryKey(actorId: string, documentId: number) {
  return ["document-workflow-definitions", actorId, documentId] as const;
}

function isDecisionAction(action: WorkflowTransitionAction | null): action is WorkflowTransitionAction {
  return action !== null && DECISION_ACTIONS.includes(action);
}

function isDecisionCapability(capabilities: WorkflowActionCapabilities, action: WorkflowTransitionAction): boolean {
  switch (action) {
    case WorkflowTransitionAction.APPROVE:
      return capabilities.approve;
    case WorkflowTransitionAction.REQUEST_CHANGES:
      return capabilities.requestChanges;
    case WorkflowTransitionAction.REJECT:
      return capabilities.reject;
    default:
      return false;
  }
}

// Solo un entero positivo identifica una fila real de versión del backend.
function isValidVersionId(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function statusLabel(status: WorkflowStatus) {
  return WORKFLOW_STATUS_CONFIG[status] ?? { label: status, variant: "outline" as const };
}

interface DecisionIntent {
  epoch: string;
  executionId: number;
  documentVersionId: number;
}

interface ReassignIntent {
  epoch: string;
  executionId: number;
  assignmentId: number;
}

interface TransitionVariables {
  token: number;
  actorId: string;
  documentId: number;
  epoch: string;
  executionId: number;
  versionId: number | undefined;
  action: WorkflowTransitionAction;
  comment: string | undefined;
}

interface StartVariables {
  token: number;
  actorId: string;
  documentId: number;
  epoch: string;
  versionId: number;
  comment: string | undefined;
}

interface ReassignVariables {
  token: number;
  actorId: string;
  documentId: number;
  epoch: string;
  executionId: number;
  assignmentId: number;
  targetUserId: string;
  reason: string;
}

export function DocumentWorkflowPanel({ documentId, documentVersionId }: DocumentWorkflowPanelProps) {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const queryClient = useQueryClient();
  const actorId = user?.id ?? "";
  // Época de contexto: un cambio de actor o documento invalida intenciones y resultados en vuelo.
  const epoch = `${actorId}::${documentId}`;

  const [dialogAction, setDialogAction] = useState<WorkflowTransitionAction | null>(null);
  const [decisionIntent, setDecisionIntent] = useState<DecisionIntent | null>(null);
  const [comment, setComment] = useState("");
  const [reassignIntent, setReassignIntent] = useState<ReassignIntent | null>(null);
  const [targetUserId, setTargetUserId] = useState("");
  const [reassignmentReason, setReassignmentReason] = useState("");
  const [selectedVersionId, setSelectedVersionId] = useState("");

  const epochRef = useRef(epoch);
  epochRef.current = epoch;

  const historyQuery = useQuery({
    queryKey: historyQueryKey(actorId, documentId),
    queryFn: () => workflowsService.history(documentId),
  });
  const executions = historyQuery.data ?? [];
  const execution = executions.find((item) => item.active) ?? executions[0];
  const capabilities = execution ? readWorkflowActionCapabilities(execution) : null;
  // Solo decidimos con historial resuelto y sin recarga en curso ni error.
  const historyReady = historyQuery.isSuccess && !historyQuery.isFetching && !historyQuery.isError;
  const reviewedVersionValid = isValidVersionId(execution?.documentVersionId);
  const decisionReady = historyReady && reviewedVersionValid;

  // Sin flujo activo, el permiso global solo puede estrechar; la autoridad real son las definiciones del servidor.
  const canStart = !execution?.active && !!user && hasPermission("workflow.start");
  const definitionsQuery = useQuery({
    queryKey: definitionsQueryKey(actorId, documentId),
    queryFn: () => workflowsService.getStartableDefinitions(documentId),
    enabled: canStart,
  });
  const availableVersions = definitionsQuery.data?.flatMap((definition) =>
    definition.versions.map((version) => ({
      id: version.id,
      label: `${definition.name} · versión ${version.version}`,
      description: definition.description,
      stages: version.stages,
    })),
  ) ?? [];

  // Una sola operación intencional por panel: reclamo síncrono con token para no liberar un candado ajeno.
  const lockRef = useRef(0);
  const lockSeqRef = useRef(0);
  const [operationBusy, setOperationBusy] = useState(false);
  const acquireOperation = (): number | null => {
    if (lockRef.current !== 0) return null;
    const token = lockSeqRef.current + 1;
    lockSeqRef.current = token;
    lockRef.current = token;
    setOperationBusy(true);
    return token;
  };
  const releaseOperation = (token: number) => {
    if (lockRef.current === token) {
      lockRef.current = 0;
      setOperationBusy(false);
    }
  };

  useEffect(() => {
    // Al cambiar de actor o documento se descartan los diálogos e intenciones incompatibles.
    lockRef.current = 0;
    setOperationBusy(false);
    setDialogAction(null);
    setDecisionIntent(null);
    setComment("");
    setSelectedVersionId("");
    setReassignIntent(null);
    setTargetUserId("");
    setReassignmentReason("");
  }, [epoch]);

  // Relee el historial vigente del actor y documento actuales directamente del cliente de consultas.
  const readSettledHistory = (currentActorId: string, currentDocumentId: number): WorkflowExecution[] | null => {
    const state = queryClient.getQueryState<WorkflowExecution[]>(historyQueryKey(currentActorId, currentDocumentId));
    if (!state || state.status !== "success" || state.fetchStatus !== "idle" || state.error != null) return null;
    return state.data ?? [];
  };
  const readSettledDefinitions = (currentActorId: string, currentDocumentId: number): ApplicableWorkflowDefinition[] | null => {
    const state = queryClient.getQueryState<ApplicableWorkflowDefinition[]>(definitionsQueryKey(currentActorId, currentDocumentId));
    if (!state || state.status !== "success" || state.fetchStatus !== "idle" || state.error != null) return null;
    return state.data ?? [];
  };

  const resolveDecision = (
    records: WorkflowExecution[],
    settled: boolean,
    action: WorkflowTransitionAction,
    intent: DecisionIntent | null,
  ): { executionId: number; versionId: number } | null => {
    if (!isDecisionAction(action) || !intent || !settled) return null;
    if (intent.epoch !== epoch) return null;
    const current = records.find((item) => item.id === intent.executionId);
    if (!current || !current.active) return null;
    const currentCapabilities = readWorkflowActionCapabilities(current);
    if (!currentCapabilities || !isDecisionCapability(currentCapabilities, action)) return null;
    if (!isValidVersionId(current.documentVersionId)) return null;
    if (current.documentVersionId !== intent.documentVersionId) return null;
    return { executionId: current.id, versionId: intent.documentVersionId };
  };

  const decisionTarget = isDecisionAction(dialogAction)
    ? resolveDecision(executions, historyReady, dialogAction, decisionIntent)
    : null;
  const decisionFailureReason = (() => {
    if (!isDecisionAction(dialogAction)) return "";
    if (!decisionIntent) return REVIEWED_VERSION_REQUIRED_MESSAGE;
    if (!historyReady) return DECISION_HISTORY_UNAVAILABLE_MESSAGE;
    if (!decisionTarget) return DECISION_STALE_MESSAGE;
    return "";
  })();
  const decisionBlocked = decisionFailureReason !== "";

  const transitionMutation = useMutation({
    mutationFn: (variables: TransitionVariables) => {
      if (lockRef.current !== variables.token) throw new Error(PARALLEL_OPERATION_MESSAGE);
      if (variables.epoch !== epochRef.current) throw new Error(PARALLEL_OPERATION_MESSAGE);
      const records = readSettledHistory(variables.actorId, variables.documentId);
      if (!records) throw new Error(DECISION_HISTORY_UNAVAILABLE_MESSAGE);
      const current = records.find((item) => item.id === variables.executionId);
      const currentCapabilities = current ? readWorkflowActionCapabilities(current) : null;
      if (isDecisionAction(variables.action)) {
        // Guarda de cierre: una acción obsoleta nunca reenvía la versión vigente por accidente.
        if (
          !current || !current.active || !currentCapabilities ||
          !isDecisionCapability(currentCapabilities, variables.action) ||
          !isValidVersionId(current.documentVersionId) ||
          current.documentVersionId !== variables.versionId
        ) {
          throw new Error(DECISION_STALE_MESSAGE);
        }
      } else if (variables.action === WorkflowTransitionAction.SUBMIT) {
        if (!current || !current.active || !currentCapabilities?.submit || !isValidVersionId(variables.versionId)) {
          throw new Error(DECISION_STALE_MESSAGE);
        }
      } else if (!current || !current.active || !currentCapabilities?.cancel) {
        throw new Error(DECISION_STALE_MESSAGE);
      }
      return workflowsService.transition(variables.executionId, {
        action: variables.action,
        comment: variables.comment,
        versionId: variables.versionId,
      });
    },
    onSuccess: (_data, variables) => {
      if (variables.epoch !== epochRef.current) return;
      setDialogAction(null);
      setDecisionIntent(null);
      setComment("");
      queryClient.invalidateQueries({ queryKey: historyQueryKey(variables.actorId, variables.documentId) });
      queryClient.invalidateQueries({ queryKey: ["document", variables.documentId] });
      toast.success("Flujo de trabajo actualizado");
    },
    onError: (error, variables) => {
      if (variables.epoch !== epochRef.current) return;
      toast.error(workflowErrorMessage(error));
    },
    onSettled: (_data, _error, variables) => releaseOperation(variables.token),
    retry: false,
  });

  const startMutation = useMutation({
    mutationFn: (variables: StartVariables) => {
      if (lockRef.current !== variables.token) throw new Error(PARALLEL_OPERATION_MESSAGE);
      if (variables.epoch !== epochRef.current) throw new Error(PARALLEL_OPERATION_MESSAGE);
      if (!isValidVersionId(variables.versionId)) throw new Error(DECISION_STALE_MESSAGE);
      const records = readSettledHistory(variables.actorId, variables.documentId);
      if (!records) throw new Error(DECISION_HISTORY_UNAVAILABLE_MESSAGE);
      if (records.some((item) => item.active)) throw new Error(DECISION_STALE_MESSAGE);
      const definitions = readSettledDefinitions(variables.actorId, variables.documentId);
      if (!definitions) throw new Error(DECISION_HISTORY_UNAVAILABLE_MESSAGE);
      const versionExists = definitions.some((definition) =>
        definition.versions.some((version) => version.id === variables.versionId),
      );
      if (!versionExists) throw new Error(DECISION_STALE_MESSAGE);
      return workflowsService.start(variables.documentId, {
        versionId: variables.versionId,
        comment: variables.comment,
      });
    },
    onSuccess: (_data, variables) => {
      if (variables.epoch !== epochRef.current) return;
      setDialogAction(null);
      setComment("");
      setSelectedVersionId("");
      queryClient.invalidateQueries({ queryKey: historyQueryKey(variables.actorId, variables.documentId) });
      queryClient.invalidateQueries({ queryKey: ["document", variables.documentId] });
      toast.success("Flujo de trabajo iniciado");
    },
    onError: (error, variables) => {
      if (variables.epoch !== epochRef.current) return;
      toast.error(workflowErrorMessage(error));
    },
    onSettled: (_data, _error, variables) => releaseOperation(variables.token),
    retry: false,
  });

  const reassignMutation = useMutation({
    mutationFn: (variables: ReassignVariables) => {
      if (lockRef.current !== variables.token) throw new Error(PARALLEL_OPERATION_MESSAGE);
      if (variables.epoch !== epochRef.current) throw new Error(PARALLEL_OPERATION_MESSAGE);
      if (!variables.targetUserId.trim() || !variables.reason.trim()) throw new Error(MISSING_REASSIGN_INPUT_MESSAGE);
      const records = readSettledHistory(variables.actorId, variables.documentId);
      if (!records) throw new Error(DECISION_HISTORY_UNAVAILABLE_MESSAGE);
      const current = records.find((item) => item.id === variables.executionId);
      const currentCapabilities = current ? readWorkflowActionCapabilities(current) : null;
      if (
        !current || !current.active || !currentCapabilities ||
        !currentCapabilities.reassignAssignmentIds.includes(variables.assignmentId)
      ) {
        throw new Error(DECISION_STALE_MESSAGE);
      }
      return workflowsService.reassign(variables.executionId, variables.assignmentId, {
        userId: variables.targetUserId.trim(),
        reason: variables.reason.trim(),
      });
    },
    onSuccess: (_data, variables) => {
      if (variables.epoch !== epochRef.current) return;
      setReassignIntent(null);
      setTargetUserId("");
      setReassignmentReason("");
      queryClient.invalidateQueries({ queryKey: historyQueryKey(variables.actorId, variables.documentId) });
      toast.success("Asignación actualizada");
    },
    onError: (error, variables) => {
      if (variables.epoch !== epochRef.current) return;
      toast.error(workflowErrorMessage(error));
    },
    onSettled: (_data, _error, variables) => releaseOperation(variables.token),
    retry: false,
  });

  const busy = operationBusy || transitionMutation.isPending || startMutation.isPending || reassignMutation.isPending;

  const buildTransitionVariables = (action: WorkflowTransitionAction, token: number): TransitionVariables | null => {
    if (!execution) return null;
    const base = { token, actorId, documentId, epoch, action, comment: comment.trim() || undefined };
    if (isDecisionAction(action)) {
      const target = resolveDecision(executions, historyReady, action, decisionIntent);
      if (!target) return null;
      return { ...base, executionId: target.executionId, versionId: target.versionId };
    }
    if (action === WorkflowTransitionAction.SUBMIT) {
      if (!execution.active || !capabilities?.submit || !isValidVersionId(documentVersionId)) return null;
      return { ...base, executionId: execution.id, versionId: documentVersionId };
    }
    if (!execution.active || !capabilities?.cancel) return null;
    return {
      ...base,
      executionId: execution.id,
      versionId: isValidVersionId(execution.documentVersionId) ? execution.documentVersionId : undefined,
    };
  };

  const confirmTransition = (action: WorkflowTransitionAction) => {
    if (busy) return;
    const token = acquireOperation();
    if (token === null) return;
    const variables = buildTransitionVariables(action, token);
    if (!variables) {
      releaseOperation(token);
      return;
    }
    transitionMutation.mutate(variables);
  };
  const confirmStart = () => {
    if (busy) return;
    const versionId = Number(selectedVersionId);
    if (!isValidVersionId(versionId)) return;
    const token = acquireOperation();
    if (token === null) return;
    startMutation.mutate({ token, actorId, documentId, epoch, versionId, comment: comment.trim() || undefined });
  };
  const confirmReassign = () => {
    if (busy || !reassignIntent) return;
    if (!targetUserId.trim() || !reassignmentReason.trim()) return;
    const token = acquireOperation();
    if (token === null) return;
    reassignMutation.mutate({
      token,
      actorId,
      documentId,
      epoch,
      executionId: reassignIntent.executionId,
      assignmentId: reassignIntent.assignmentId,
      targetUserId,
      reason: reassignmentReason,
    });
  };

  const closeActionDialog = () => {
    setDialogAction(null);
    setDecisionIntent(null);
    setSelectedVersionId("");
  };
  const openAction = (action: WorkflowTransitionAction) => {
    if (busy) return;
    setComment("");
    if (isDecisionAction(action) && execution) {
      // Fallar cerrado: sin historial resuelto, versión válida ni capacidad vigente no se abre la decisión.
      if (!historyReady || !isValidVersionId(execution.documentVersionId)) return;
      if (!capabilities || !isDecisionCapability(capabilities, action)) return;
      setDecisionIntent({ epoch, executionId: execution.id, documentVersionId: execution.documentVersionId });
    } else {
      setDecisionIntent(null);
    }
    setDialogAction(action);
  };
  const openReassign = (assignmentId: number) => {
    if (busy || !execution) return;
    if (!capabilities?.reassignAssignmentIds.includes(assignmentId)) return;
    setReassignIntent({ epoch, executionId: execution.id, assignmentId });
  };
  const status = execution ? statusLabel(execution.status) : null;

  if (
    historyQuery.isSuccess && !historyQuery.isFetching && !execution &&
    (!canStart || (definitionsQuery.isSuccess && !definitionsQuery.isFetching && availableVersions.length === 0))
  ) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2"><History className="h-5 w-5" /> Flujo de trabajo</span>
          {status && <Badge variant={status.variant}>{status.label}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {historyQuery.isLoading ? <p className="text-sm text-muted-foreground">Cargando flujo de trabajo...</p> : null}
        {historyQuery.isError ? <p className="text-sm text-destructive">No se pudo cargar el historial del flujo de trabajo.</p> : null}
        {!historyQuery.isLoading && !historyQuery.isError && !execution && (
          <div className="space-y-2"><p className="text-sm text-muted-foreground">Este documento aún no participa en un flujo de trabajo.</p>
            {canStart && definitionsQuery.isLoading && <p className="text-sm text-muted-foreground">Buscando flujos de trabajo aplicables...</p>}
            {canStart && definitionsQuery.isError && <p className="text-sm text-destructive">No se pudieron cargar los flujos de trabajo aplicables.</p>}
            {canStart && !definitionsQuery.isLoading && !definitionsQuery.isError && availableVersions.length === 0 && <p className="text-sm text-muted-foreground">No hay flujos de trabajo activos compatibles con este documento.</p>}
            {canStart && availableVersions.length > 0 && <Button disabled={busy} onClick={() => openAction(WorkflowTransitionAction.SUBMIT)}>Iniciar flujo de trabajo</Button>}
          </div>
        )}
        {execution && (
          <>
            <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              <span>Etapa actual: {[WorkflowStatus.APPROVED, WorkflowStatus.REJECTED, WorkflowStatus.CANCELLED].includes(execution.status) ? "Finalizado" : execution.currentState || "Finalizado"}</span>
              {execution.documentVersionId && <span>Versión vinculada: {execution.documentVersionId}</span>}
            </div>
            <div className="space-y-2">
              {execution.assignments.map((assignment) => (
                <div key={assignment.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-2 text-sm">
                  <span className="flex items-center gap-2"><UserRound className="h-4 w-4" />{assignment.userNameSnapshot} · {assignment.roleKeySnapshot}</span>
                  <span className="flex items-center gap-2"><Badge variant={assignment.status === "COMPLETED" ? "default" : "secondary"}>{assignment.status === "COMPLETED" ? "Completado" : "Pendiente"}</Badge>
                    {capabilities && capabilities.reassignAssignmentIds.includes(assignment.id) && <Button size="sm" variant="outline" disabled={!historyReady || busy} onClick={() => openReassign(assignment.id)}>Reasignar</Button>}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {capabilities?.approve && <Button disabled={!decisionReady || busy} onClick={() => openAction(WorkflowTransitionAction.APPROVE)}><Check className="mr-2 h-4 w-4" />Aprobar</Button>}
              {capabilities?.requestChanges && <Button disabled={!decisionReady || busy} variant="outline" onClick={() => openAction(WorkflowTransitionAction.REQUEST_CHANGES)}><MessageSquare className="mr-2 h-4 w-4" />Solicitar cambios</Button>}
              {capabilities?.reject && <Button disabled={!decisionReady || busy} variant="destructive" onClick={() => openAction(WorkflowTransitionAction.REJECT)}>Rechazar</Button>}
              {capabilities?.cancel && <Button disabled={!historyReady || busy} variant="outline" onClick={() => openAction(WorkflowTransitionAction.CANCEL)}>Cancelar flujo de trabajo</Button>}
              {capabilities?.submit && <>
                <Button disabled={!isValidVersionId(documentVersionId) || !historyReady || busy} onClick={() => openAction(WorkflowTransitionAction.SUBMIT)}>Reenviar versión corregida</Button>
                {!isValidVersionId(documentVersionId) && <p role="alert" className="w-full text-sm text-destructive">No hay una versión del documento disponible para reenviar.</p>}
              </>}
              {execution && (capabilities?.approve || capabilities?.requestChanges || capabilities?.reject) && !reviewedVersionValid && (
                <p role="alert" className="w-full text-sm text-destructive">{REVIEWED_VERSION_REQUIRED_MESSAGE}</p>
              )}
            </div>
            <div className="space-y-2 border-t pt-3"><h3 className="text-sm font-medium">Historial de transiciones</h3>
               {execution.transitions.length ? execution.transitions.map((transition) => {
                 const traceability = getWorkflowTraceability({ action: transition.action, performedBy: transition.performedById, createdAt: transition.createdAt });
                 return <div key={transition.id} className="text-sm text-muted-foreground"><strong>{traceability.label}</strong> · {traceability.actor} · {traceability.time === 'Fecha no disponible' ? traceability.time : new Date(traceability.time).toLocaleString("es-ES")}{transition.comment ? ` · ${transition.comment}` : ""}</div>;
               }) : <p className="text-sm text-muted-foreground">Historial de flujo de trabajo no disponible.</p>}
            </div>
          </>
        )}
      </CardContent>
      <Dialog open={dialogAction !== null} onOpenChange={(open) => {
        if (!open) {
          closeActionDialog();
        }
      }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialogAction === "SUBMIT" && !execution ? "Iniciar flujo de trabajo" : ACTION_LABELS[dialogAction ?? "APPROVE"]}</DialogTitle><DialogDescription>Confirma la acción sobre el flujo de trabajo del documento.</DialogDescription></DialogHeader>
          {dialogAction === "SUBMIT" && !execution && <div className="space-y-2"><p className="text-sm font-medium">Flujo de trabajo aplicable</p><Select value={selectedVersionId} onValueChange={setSelectedVersionId}><SelectTrigger><SelectValue placeholder="Selecciona una definición" /></SelectTrigger><SelectContent>{availableVersions.map((version) => <SelectItem key={version.id} value={String(version.id)}>{version.label}</SelectItem>)}</SelectContent></Select>{selectedVersionId && (() => { const version = availableVersions.find((item) => item.id === Number(selectedVersionId)); return version ? <p className="text-sm text-muted-foreground">{version.description || "Sin descripción"} · {version.stages.map((stage) => stage.roleKey).join(" → ")}</p> : null; })()}</div>}
          {dialogAction && isDecisionAction(dialogAction) && (
            decisionBlocked
              ? <p role="alert" className="text-sm text-destructive">{decisionFailureReason}</p>
              : decisionIntent
                ? <p className="text-sm text-muted-foreground">Versión revisada vinculada: {decisionIntent.documentVersionId}</p>
                : null
          )}
          <Textarea placeholder={dialogAction && requiresWorkflowComment(dialogAction) ? "Comentario obligatorio" : "Comentario (opcional)"} value={comment} onChange={(event) => setComment(event.target.value)} />
          <DialogFooter><Button variant="outline" onClick={closeActionDialog}>Cancelar</Button><Button disabled={(dialogAction ? requiresWorkflowComment(dialogAction) && !comment.trim() : true) || (dialogAction === "SUBMIT" && !execution && !selectedVersionId) || (dialogAction === "SUBMIT" && !!execution && (!isValidVersionId(documentVersionId) || !historyReady)) || (isDecisionAction(dialogAction) && decisionBlocked) || busy} onClick={() => dialogAction === "SUBMIT" && !execution ? confirmStart() : dialogAction && confirmTransition(dialogAction)}>{(startMutation.isPending || transitionMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={reassignIntent !== null} onOpenChange={(open) => !open && setReassignIntent(null)}>
        <DialogContent><DialogHeader><DialogTitle>Reasignar etapa</DialogTitle><DialogDescription>La reasignación queda registrada en el historial del flujo de trabajo.</DialogDescription></DialogHeader><div className="space-y-3"><Input placeholder="ID del usuario" value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)} /><Textarea placeholder="Motivo obligatorio" value={reassignmentReason} onChange={(event) => setReassignmentReason(event.target.value)} /></div><DialogFooter><Button variant="outline" onClick={() => setReassignIntent(null)}>Cancelar</Button><Button disabled={!targetUserId.trim() || !reassignmentReason.trim() || busy} onClick={confirmReassign}>Reasignar</Button></DialogFooter></DialogContent>
      </Dialog>
    </Card>
  );
}
