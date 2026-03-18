'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workflowsService } from '@/lib/services/workflows.service';
import { useAuth } from '@/lib/contexts/AuthContext';
import {
  DocumentWorkflow,
  WorkflowStatus,
  ApprovalAction,
  WorkflowApproval,
  UserRole,
} from '@/lib/types';
import { WORKFLOW_STATUS_CONFIG } from '@/lib/workflow-status-config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  GitBranch,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Play,
  X,
  CircleDot,
  RotateCcw,
  RefreshCw,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';

interface Props {
  documentId: number;
  categoryId?: number | null;
  categoryContext?: string | null;
}

const APPROVAL_ACTION_CONFIG = {
  [ApprovalAction.APPROVED]: {
    label: 'Aprobar',
    confirmLabel: 'Aprobar documento',
    description: 'El documento avanzará al siguiente estado del workflow.',
    variant: 'default' as const,
    icon: CheckCircle2,
  },
  [ApprovalAction.REJECTED]: {
    label: 'Rechazar',
    confirmLabel: 'Rechazar documento',
    description: 'El workflow se detendrá y el documento quedará rechazado.',
    variant: 'destructive' as const,
    icon: XCircle,
  },
  [ApprovalAction.REQUESTED_CHANGES]: {
    label: 'Solicitar cambios',
    confirmLabel: 'Solicitar cambios',
    description: 'Se notificará al creador que debe realizar cambios.',
    variant: 'outline' as const,
    icon: MessageSquare,
  },
};

export default function DocumentWorkflowCard({ documentId, categoryId, categoryContext }: Props) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Dialog: iniciar workflow
  const [showInitiate, setShowInitiate] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  // Dialog: acción de aprobación
  const [showApproval, setShowApproval] = useState(false);
  const [approvalAction, setApprovalAction] = useState<ApprovalAction>(ApprovalAction.APPROVED);
  const [comment, setComment] = useState('');

  // Queries
  const { data: workflow, isLoading } = useQuery({
    queryKey: ['document-workflow', documentId],
    queryFn: () => workflowsService.getDocumentWorkflow(documentId),
    retry: false,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ['workflow-templates'],
    queryFn: () => workflowsService.getTemplates(),
    enabled: showInitiate,
  });

  const activeTemplates = templates.filter((t) => {
    if (!t.isActive) return false;
    // Filtro por categoría/contexto del documento
    if (t.categoryId != null && t.categoryId !== categoryId) return false;
    if (t.categoryId == null && t.documentType != null && t.documentType !== categoryContext) return false;
    // ADMIN bypasea el filtro de rol iniciador — acceso total por rol, no por lista
    if (user?.role === 'admin') return true;
    // Filtro por rol del iniciador para los demás roles
    const initiatorRoles = t.allowedInitiatorRoles ?? [];
    if (initiatorRoles.length > 0 && user?.role && !initiatorRoles.includes(user.role)) return false;
    return true;
  });

  // Mutations
  const initiateMutation = useMutation({
    mutationFn: ({ docId, templateId }: { docId: number; templateId: number }) =>
      workflowsService.initiate(docId, templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-workflow', documentId] });
      queryClient.invalidateQueries({ queryKey: ['workflow-pending'] });
      toast.success('Workflow iniciado exitosamente');
      setShowInitiate(false);
      setSelectedTemplateId('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al iniciar el workflow');
    },
  });

  const approveMutation = useMutation({
    mutationFn: ({
      workflowId,
      action,
      comment,
    }: {
      workflowId: number;
      action: ApprovalAction;
      comment?: string;
    }) => workflowsService.approve(workflowId, action, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-workflow', documentId] });
      queryClient.invalidateQueries({ queryKey: ['workflow-pending'] });
      toast.success('Acción registrada exitosamente');
      setShowApproval(false);
      setComment('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al procesar la acción');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (workflowId: number) => workflowsService.cancel(workflowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-workflow', documentId] });
      toast.success('Workflow cancelado');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al cancelar el workflow');
    },
  });

  const resubmitMutation = useMutation({
    mutationFn: (workflowId: number) => workflowsService.resubmit(workflowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-workflow', documentId] });
      queryClient.invalidateQueries({ queryKey: ['workflow-pending'] });
      toast.success('Workflow reenviado para revisión');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al reenviar el workflow');
    },
  });

  const handleInitiate = () => {
    if (!selectedTemplateId) return;
    initiateMutation.mutate({ docId: documentId, templateId: Number(selectedTemplateId) });
  };

  const handleOpenApproval = (action: ApprovalAction) => {
    setApprovalAction(action);
    setComment('');
    setShowApproval(true);
  };

  const handleSubmitApproval = () => {
    if (!workflow) return;
    approveMutation.mutate({
      workflowId: workflow.id,
      action: approvalAction,
      comment: comment.trim() || undefined,
    });
  };

  const handleCancel = () => {
    if (!workflow) return;
    if (!confirm('¿Cancelar el workflow de este documento?')) return;
    cancelMutation.mutate(workflow.id);
  };

  // Determinar si el usuario actual tiene una aprobación pendiente en la etapa actual
  const getPendingApprovalForCurrentUser = (wf: DocumentWorkflow): WorkflowApproval | null => {
    if (!user || !wf.approvals) return null;
    return (
      wf.approvals.find(
        (a) => a.action === null && a.userId === user.id.toString(),
      ) ?? null
    );
  };

  const INITIATOR_ROLES = [
    UserRole.ADMIN, UserRole.DIRECTOR, UserRole.COORDINADOR,
    UserRole.PROFESOR, UserRole.SECRETARIO,
  ];
  const canInitiate = user ? INITIATOR_ROLES.includes(user.role as UserRole) : false;

  const isInitiator = workflow
    ? workflow.initiatedById === user?.id.toString()
    : false;

  const isActiveWorkflow =
    workflow?.status === WorkflowStatus.IN_PROGRESS ||
    workflow?.status === WorkflowStatus.PENDING ||
    workflow?.status === WorkflowStatus.CHANGES_REQUESTED;

  const isChangesRequested = workflow?.status === WorkflowStatus.CHANGES_REQUESTED;

  const isTerminalWorkflow =
    workflow?.status === WorkflowStatus.APPROVED ||
    workflow?.status === WorkflowStatus.REJECTED ||
    workflow?.status === WorkflowStatus.CANCELLED;

  const pendingApproval = workflow ? getPendingApprovalForCurrentUser(workflow) : null;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch className="h-4 w-4" />
            Workflow
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <GitBranch className="h-4 w-4" />
            Workflow
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Sin workflow activo */}
          {!workflow ? (
            <div className="text-center py-2 space-y-3">
              <p className="text-sm text-muted-foreground">
                Este documento no tiene un workflow activo
              </p>
              {canInitiate && (
                <Button
                  size="sm"
                  className="w-full"
                  onClick={() => setShowInitiate(true)}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Iniciar Workflow
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Estado actual */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Estado</span>
                {(() => {
                  const cfg = WORKFLOW_STATUS_CONFIG[workflow.status];
                  const Icon = cfg.icon;
                  return (
                    <Badge variant={cfg.variant} className="gap-1">
                      <Icon className="h-3 w-3" />
                      {cfg.label}
                    </Badge>
                  );
                })()}
              </div>

              {/* Template */}
              {workflow.template && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Plantilla</span>
                  <span className="text-sm text-muted-foreground">{workflow.template.name}</span>
                </div>
              )}

              {/* Etapa actual */}
              {workflow.currentState && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Etapa actual</span>
                  <Badge variant="outline">{workflow.currentState}</Badge>
                </div>
              )}

              {/* Stepper de etapas */}
              {workflow.template && workflow.template.stateDefinitions.length > 0 && (
                <div className="space-y-1 pt-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Progreso
                  </p>
                  <div className="space-y-1.5">
                    {workflow.template.stateDefinitions
                      .sort((a, b) => a.order - b.order)
                      .map((sd, i) => {
                        const isCurrent = sd.state === workflow.currentState;
                        const isDone =
                          workflow.currentStateOrder !== null &&
                          sd.order < workflow.currentStateOrder;
                        const isApproved =
                          workflow.status === WorkflowStatus.APPROVED;

                        let icon: React.ReactNode;
                        let textClass = 'text-muted-foreground';

                        if (isApproved || isDone) {
                          icon = <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />;
                          textClass = 'text-muted-foreground line-through';
                        } else if (isCurrent) {
                          icon = <CircleDot className="h-3.5 w-3.5 text-primary shrink-0" />;
                          textClass = 'font-medium';
                        } else {
                          icon = (
                            <span className="h-3.5 w-3.5 rounded-full border border-muted-foreground/40 shrink-0 inline-block" />
                          );
                        }

                        return (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            {icon}
                            <span className={textClass}>{sd.state}</span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Historial de aprobaciones */}
              {workflow.approvals && workflow.approvals.length > 0 && (
                <div className="space-y-1 pt-1">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                    Historial
                  </p>
                  <div className="space-y-2">
                    {workflow.approvals
                      .filter((a) => a.action !== null)
                      .map((a) => (
                        <div key={a.id} className="text-xs space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{a.user.name}</span>
                            <ApprovalBadge action={a.action!} />
                          </div>
                          <div className="text-muted-foreground">
                            {a.state} ·{' '}
                            {formatDistanceToNow(new Date(a.updatedAt), {
                              addSuffix: true,
                              locale: es,
                            })}
                          </div>
                          {a.comment && (
                            <p className="text-muted-foreground italic">"{a.comment}"</p>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Banner: cambios requeridos — visible para el iniciador */}
              {isChangesRequested && isInitiator && (
                <div className="space-y-2 pt-2 border-t">
                  <div className="rounded-md border border-yellow-300 bg-yellow-50 dark:bg-yellow-950/20 dark:border-yellow-800 p-3 space-y-2">
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300 flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 shrink-0" />
                      El aprobador solicitó cambios
                    </p>
                    {(() => {
                      const lastChangesRequest = workflow.approvals
                        ?.filter((a) => a.action === ApprovalAction.REQUESTED_CHANGES)
                        .at(-1);
                      return lastChangesRequest?.comment ? (
                        <p className="text-xs text-yellow-700 dark:text-yellow-400 italic">
                          "{lastChangesRequest.comment}"
                        </p>
                      ) : null;
                    })()}
                    <p className="text-xs text-yellow-700 dark:text-yellow-400">
                      Realiza los cambios necesarios y reenvía el documento para revisión.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => resubmitMutation.mutate(workflow.id)}
                    disabled={resubmitMutation.isPending}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {resubmitMutation.isPending ? 'Reenviando...' : 'Reenviar para revisión'}
                  </Button>
                </div>
              )}

              {/* Acciones de aprobación para el usuario actual (no mostrar si está en CHANGES_REQUESTED) */}
              {pendingApproval && isActiveWorkflow && !isChangesRequested && (
                <div className="space-y-2 pt-2 border-t">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Tu aprobación requerida
                  </p>
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => handleOpenApproval(ApprovalAction.APPROVED)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Aprobar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => handleOpenApproval(ApprovalAction.REQUESTED_CHANGES)}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Solicitar cambios
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="w-full justify-start"
                      onClick={() => handleOpenApproval(ApprovalAction.REJECTED)}
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Rechazar
                    </Button>
                  </div>
                </div>
              )}

              {/* Cancelar (solo iniciador, solo si está activo) */}
              {isInitiator && isActiveWorkflow && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full text-muted-foreground hover:text-destructive"
                  onClick={handleCancel}
                  disabled={cancelMutation.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar workflow
                </Button>
              )}

              {/* Iniciar nuevo workflow: solo el iniciador del workflow anterior puede reiniciarlo */}
              {isTerminalWorkflow && isInitiator && canInitiate && (
                <div className="pt-2 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowInitiate(true)}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Iniciar nuevo workflow
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Dialog: Iniciar workflow */}
      <Dialog open={showInitiate} onOpenChange={setShowInitiate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Iniciar Workflow</DialogTitle>
            <DialogDescription>
              Selecciona una plantilla de workflow para iniciar el proceso de aprobación
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Plantilla de Workflow</Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar plantilla..." />
                </SelectTrigger>
                <SelectContent>
                  {activeTemplates.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No hay plantillas activas disponibles
                    </SelectItem>
                  ) : (
                    activeTemplates.map((t) => (
                      <SelectItem key={t.id} value={t.id.toString()}>
                        <div>
                          <p>{t.name}</p>
                          {t.description && (
                            <p className="text-xs text-muted-foreground">{t.description}</p>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Preview de etapas */}
            {selectedTemplateId && (() => {
              const tpl = activeTemplates.find((t) => t.id === Number(selectedTemplateId));
              if (!tpl) return null;
              return (
                <div className="rounded-md border p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Etapas del workflow
                  </p>
                  <div className="space-y-1">
                    {tpl.stateDefinitions
                      .sort((a, b) => a.order - b.order)
                      .map((sd, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                            {i + 1}
                          </span>
                          <span>{sd.state}</span>
                          <Badge variant="outline" className="text-xs ml-auto">
                            {sd.role}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </div>
              );
            })()}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInitiate(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleInitiate}
              disabled={!selectedTemplateId || initiateMutation.isPending}
            >
              <Play className="h-4 w-4 mr-2" />
              {initiateMutation.isPending ? 'Iniciando...' : 'Iniciar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Acción de aprobación */}
      <Dialog open={showApproval} onOpenChange={setShowApproval}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{APPROVAL_ACTION_CONFIG[approvalAction].confirmLabel}</DialogTitle>
            <DialogDescription>
              {APPROVAL_ACTION_CONFIG[approvalAction].description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="approval-comment">
              Comentario{' '}
              {approvalAction !== ApprovalAction.APPROVED && (
                <span className="text-muted-foreground">(recomendado)</span>
              )}
            </Label>
            <Textarea
              id="approval-comment"
              placeholder={
                approvalAction === ApprovalAction.APPROVED
                  ? 'Comentario opcional...'
                  : 'Describe los motivos o los cambios requeridos...'
              }
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApproval(false)}
              disabled={approveMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant={APPROVAL_ACTION_CONFIG[approvalAction].variant}
              onClick={handleSubmitApproval}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending
                ? 'Procesando...'
                : APPROVAL_ACTION_CONFIG[approvalAction].label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ApprovalBadge({ action }: { action: ApprovalAction }) {
  const config = {
    [ApprovalAction.APPROVED]: { label: 'Aprobado', variant: 'default' as const },
    [ApprovalAction.REJECTED]: { label: 'Rechazado', variant: 'destructive' as const },
    [ApprovalAction.REQUESTED_CHANGES]: { label: 'Cambios', variant: 'secondary' as const },
    [ApprovalAction.COMMENTED]: { label: 'Comentado', variant: 'outline' as const },
  };
  const { label, variant } = config[action];
  return <Badge variant={variant} className="text-xs">{label}</Badge>;
}
