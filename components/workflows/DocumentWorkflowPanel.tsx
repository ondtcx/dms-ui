"use client";

import { useState } from "react";
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
  getWorkflowActionState,
  requiresWorkflowComment,
  WorkflowTransitionAction,
  WorkflowStatus,
  workflowErrorMessage,
} from "@/lib/types/workflows";
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

function statusLabel(status: WorkflowStatus) {
  return WORKFLOW_STATUS_CONFIG[status] ?? { label: status, variant: "outline" as const };
}

export function DocumentWorkflowPanel({ documentId, documentOwnerId, documentVersionId }: DocumentWorkflowPanelProps) {
  const { user } = useAuth();
  const { hasPermission, isAdmin } = usePermissions();
  const queryClient = useQueryClient();
  const [dialogAction, setDialogAction] = useState<WorkflowTransitionAction | null>(null);
  const [comment, setComment] = useState("");
  const [reassigning, setReassigning] = useState<number | null>(null);
  const [targetUserId, setTargetUserId] = useState("");
  const [reassignmentReason, setReassignmentReason] = useState("");

  const historyQuery = useQuery({
    queryKey: ["document-workflows", documentId],
    queryFn: () => workflowsService.history(documentId),
  });
  const executions = historyQuery.data ?? [];
  const execution = executions.find((item) => item.active) ?? executions[0];
  const assigned = !!user && execution?.assignments.some(
    (item) => item.userId === user.id && item.status === "PENDING" && item.stageDefinition.order === execution.currentStateOrder,
  );
  const state = execution
    ? getWorkflowActionState(execution.status, assigned)
    : { canApprove: false, canRequestChanges: false, canReject: false, canCancel: false, canSubmit: false };
  const canStart = !execution?.active && !!user && (user.id === documentOwnerId || isAdmin()) && hasPermission("workflow.start");
  const definitionsQuery = useQuery({
    queryKey: ["document-workflow-definitions", documentId],
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
  const [selectedVersionId, setSelectedVersionId] = useState("");

  const transitionMutation = useMutation({
    mutationFn: (action: WorkflowTransitionAction) => workflowsService.transition(execution!.id, {
      action,
      comment: comment.trim() || undefined,
      versionId: action === "SUBMIT" ? documentVersionId : undefined,
    }),
    onSuccess: () => {
      setDialogAction(null);
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["document-workflows", documentId] });
      queryClient.invalidateQueries({ queryKey: ["document", documentId] });
      toast.success("Flujo de trabajo actualizado");
    },
    onError: (error) => toast.error(workflowErrorMessage(error)),
  });
  const startMutation = useMutation({
    mutationFn: () => workflowsService.start(documentId, {
      versionId: Number(selectedVersionId),
      comment: comment.trim() || undefined,
    }),
    onSuccess: () => {
      setDialogAction(null);
      setComment("");
      setSelectedVersionId("");
      queryClient.invalidateQueries({ queryKey: ["document-workflows", documentId] });
      queryClient.invalidateQueries({ queryKey: ["document", documentId] });
      toast.success("Flujo de trabajo iniciado");
    },
    onError: (error) => toast.error(workflowErrorMessage(error)),
  });
  const reassignMutation = useMutation({
    mutationFn: () => workflowsService.reassign(execution!.id, reassigning!, { userId: targetUserId.trim(), reason: reassignmentReason.trim() }),
    onSuccess: () => {
      setReassigning(null);
      setTargetUserId("");
      setReassignmentReason("");
      queryClient.invalidateQueries({ queryKey: ["document-workflows", documentId] });
      toast.success("Asignación actualizada");
    },
    onError: (error) => toast.error(workflowErrorMessage(error)),
  });

  const openAction = (action: WorkflowTransitionAction) => {
    setComment("");
    setDialogAction(action);
  };
  const status = execution ? statusLabel(execution.status) : null;

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
            {canStart && availableVersions.length > 0 && <Button onClick={() => openAction(WorkflowTransitionAction.SUBMIT)}>Iniciar flujo de trabajo</Button>}
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
                    {isAdmin() && assignment.status === "PENDING" && <Button size="sm" variant="outline" onClick={() => setReassigning(assignment.id)}>Reasignar</Button>}</span>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {state.canApprove && hasPermission("workflow.approve") && <Button onClick={() => openAction(WorkflowTransitionAction.APPROVE)}><Check className="mr-2 h-4 w-4" />Aprobar</Button>}
              {state.canRequestChanges && hasPermission("workflow.request_changes") && <Button variant="outline" onClick={() => openAction(WorkflowTransitionAction.REQUEST_CHANGES)}><MessageSquare className="mr-2 h-4 w-4" />Solicitar cambios</Button>}
              {state.canReject && hasPermission("workflow.reject") && <Button variant="destructive" onClick={() => openAction(WorkflowTransitionAction.REJECT)}>Rechazar</Button>}
               {state.canCancel && hasPermission("workflow.cancel") && <Button variant="outline" onClick={() => openAction(WorkflowTransitionAction.CANCEL)}>Cancelar flujo de trabajo</Button>}
              {state.canSubmit && user?.id === documentOwnerId && hasPermission("workflow.start") && <Button onClick={() => openAction(WorkflowTransitionAction.SUBMIT)}>Reenviar versión corregida</Button>}
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
          setDialogAction(null);
          setSelectedVersionId("");
        }
      }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{dialogAction === "SUBMIT" && !execution ? "Iniciar flujo de trabajo" : ACTION_LABELS[dialogAction ?? "APPROVE"]}</DialogTitle><DialogDescription>Confirma la acción sobre el flujo de trabajo del documento.</DialogDescription></DialogHeader>
          {dialogAction === "SUBMIT" && !execution && <div className="space-y-2"><p className="text-sm font-medium">Flujo de trabajo aplicable</p><Select value={selectedVersionId} onValueChange={setSelectedVersionId}><SelectTrigger><SelectValue placeholder="Selecciona una definición" /></SelectTrigger><SelectContent>{availableVersions.map((version) => <SelectItem key={version.id} value={String(version.id)}>{version.label}</SelectItem>)}</SelectContent></Select>{selectedVersionId && (() => { const version = availableVersions.find((item) => item.id === Number(selectedVersionId)); return version ? <p className="text-sm text-muted-foreground">{version.description || "Sin descripción"} · {version.stages.map((stage) => stage.roleKey).join(" → ")}</p> : null; })()}</div>}
          <Textarea placeholder={dialogAction && requiresWorkflowComment(dialogAction) ? "Comentario obligatorio" : "Comentario (opcional)"} value={comment} onChange={(event) => setComment(event.target.value)} />
          <DialogFooter><Button variant="outline" onClick={() => setDialogAction(null)}>Cancelar</Button><Button disabled={(dialogAction ? requiresWorkflowComment(dialogAction) && !comment.trim() : true) || (dialogAction === "SUBMIT" && !execution && !selectedVersionId) || startMutation.isPending || transitionMutation.isPending} onClick={() => dialogAction === "SUBMIT" && !execution ? startMutation.mutate() : dialogAction && transitionMutation.mutate(dialogAction)}>{(startMutation.isPending || transitionMutation.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={reassigning !== null} onOpenChange={(open) => !open && setReassigning(null)}>
        <DialogContent><DialogHeader><DialogTitle>Reasignar etapa</DialogTitle><DialogDescription>La reasignación queda registrada en el historial del flujo de trabajo.</DialogDescription></DialogHeader><div className="space-y-3"><Input placeholder="ID del usuario" value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)} /><Textarea placeholder="Motivo obligatorio" value={reassignmentReason} onChange={(event) => setReassignmentReason(event.target.value)} /></div><DialogFooter><Button variant="outline" onClick={() => setReassigning(null)}>Cancelar</Button><Button disabled={!targetUserId.trim() || !reassignmentReason.trim() || reassignMutation.isPending} onClick={() => reassignMutation.mutate()}>Reasignar</Button></DialogFooter></DialogContent>
      </Dialog>
    </Card>
  );
}
