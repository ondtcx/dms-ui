'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workflowsService } from '@/lib/services/workflows.service';
import { useAuth } from '@/lib/contexts/AuthContext';
import { DocumentWorkflow, ApprovalAction, WorkflowApproval } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  CheckCircle2,
  XCircle,
  MessageSquare,
  FileText,
  Clock,
  User,
  GitBranch,
  ExternalLink,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

const ACTION_CONFIG = {
  [ApprovalAction.APPROVED]: {
    label: 'Aprobar',
    confirmLabel: 'Aprobar documento',
    description: 'El documento avanzará al siguiente estado del workflow.',
    variant: 'default' as const,
  },
  [ApprovalAction.REJECTED]: {
    label: 'Rechazar',
    confirmLabel: 'Rechazar documento',
    description: 'El workflow se detendrá y el documento quedará rechazado.',
    variant: 'destructive' as const,
  },
  [ApprovalAction.REQUESTED_CHANGES]: {
    label: 'Solicitar cambios',
    confirmLabel: 'Solicitar cambios',
    description: 'Se notificará al creador que debe realizar cambios.',
    variant: 'outline' as const,
  },
  [ApprovalAction.COMMENTED]: {
    label: 'Comentar',
    confirmLabel: 'Añadir comentario',
    description: 'Se dejará un comentario sin cambiar de estado.',
    variant: 'secondary' as const,
  },
};

export default function PendingApprovalsTab() {
  const { user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [selectedWorkflow, setSelectedWorkflow] = useState<DocumentWorkflow | null>(null);
  const [approvalAction, setApprovalAction] = useState<ApprovalAction>(ApprovalAction.APPROVED);
  const [comment, setComment] = useState('');
  const [showDialog, setShowDialog] = useState(false);

  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ['workflow-pending'],
    queryFn: () => workflowsService.getPendingApprovals(),
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
      queryClient.invalidateQueries({ queryKey: ['workflow-pending'] });
      toast.success('Acción registrada exitosamente');
      setShowDialog(false);
      setSelectedWorkflow(null);
      setComment('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al procesar la acción');
    },
  });

  const getPendingApproval = (workflow: DocumentWorkflow): WorkflowApproval | null => {
    if (!user || !workflow.approvals) return null;
    return (
      workflow.approvals.find(
        (a) => a.action === null && a.userId === user.id.toString(),
      ) ?? null
    );
  };

  const handleOpenDialog = (workflow: DocumentWorkflow, action: ApprovalAction) => {
    setSelectedWorkflow(workflow);
    setApprovalAction(action);
    setComment('');
    setShowDialog(true);
  };

  const handleSubmit = () => {
    if (!selectedWorkflow) return;
    approveMutation.mutate({
      workflowId: selectedWorkflow.id,
      action: approvalAction,
      comment: comment.trim() || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Mis Aprobaciones</CardTitle>
          <CardDescription>
            Documentos en workflows que requieren tu aprobación
          </CardDescription>
        </CardHeader>
        <CardContent>
          {workflows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tienes aprobaciones pendientes</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Plantilla</TableHead>
                  <TableHead>Etapa actual</TableHead>
                  <TableHead>Iniciado por</TableHead>
                  <TableHead>Hace</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflows.map((workflow) => {
                  const pendingApproval = getPendingApproval(workflow);
                  return (
                    <TableRow key={workflow.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div>
                            <button
                              className="font-medium text-left hover:underline flex items-center gap-1"
                              onClick={() =>
                                router.push(`/dashboard/documents/${workflow.documentId}`)
                              }
                            >
                              {workflow.document?.filename ?? `Documento #${workflow.documentId}`}
                              <ExternalLink className="h-3 w-3 text-muted-foreground" />
                            </button>
                            {workflow.document?.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {workflow.document.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <GitBranch className="h-3 w-3" />
                          {workflow.template?.name ?? '—'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {workflow.currentState ? (
                          <Badge variant="outline">{workflow.currentState}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {workflow.initiatedBy.name}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(workflow.createdAt), {
                            addSuffix: true,
                            locale: es,
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {pendingApproval ? (
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              onClick={() => handleOpenDialog(workflow, ApprovalAction.APPROVED)}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Aprobar
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleOpenDialog(workflow, ApprovalAction.REQUESTED_CHANGES)
                              }
                            >
                              <MessageSquare className="h-4 w-4 mr-1" />
                              Cambios
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleOpenDialog(workflow, ApprovalAction.REJECTED)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Rechazar
                            </Button>
                          </div>
                        ) : (
                          <Badge variant="secondary">En espera</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{ACTION_CONFIG[approvalAction].confirmLabel}</DialogTitle>
            <DialogDescription>
              {selectedWorkflow?.document?.filename && (
                <span className="font-medium">
                  {selectedWorkflow.document.filename}
                  {' — '}
                </span>
              )}
              {ACTION_CONFIG[approvalAction].description}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="comment">
              Comentario{' '}
              {approvalAction !== ApprovalAction.APPROVED && (
                <span className="text-muted-foreground">(recomendado)</span>
              )}
            </Label>
            <Textarea
              id="comment"
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
              onClick={() => setShowDialog(false)}
              disabled={approveMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant={ACTION_CONFIG[approvalAction].variant}
              onClick={handleSubmit}
              disabled={approveMutation.isPending}
            >
              {approveMutation.isPending ? 'Procesando...' : ACTION_CONFIG[approvalAction].label}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
