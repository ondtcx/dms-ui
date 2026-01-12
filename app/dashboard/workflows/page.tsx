'use client';

import { useEffect, useState } from 'react';
import { workflowsService } from '@/lib/services/workflows.service';
import { WorkflowApproval, ApprovalAction } from '@/lib/types';
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
import { CheckCircle2, XCircle, MessageSquare, FileText, Clock, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';

export default function WorkflowsPage() {
  const [approvals, setApprovals] = useState<WorkflowApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<WorkflowApproval | null>(null);
  const [approvalAction, setApprovalAction] = useState<ApprovalAction>(ApprovalAction.APPROVED);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadApprovals();
  }, []);

  const loadApprovals = async () => {
    try {
      setLoading(true);
      const data = await workflowsService.getPendingApprovals();
      setApprovals(data);
    } catch (error) {
      console.error('Error loading approvals:', error);
      toast.error('Error al cargar las aprobaciones pendientes');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenApprovalDialog = (approval: WorkflowApproval, action: ApprovalAction) => {
    setSelectedApproval(approval);
    setApprovalAction(action);
    setComment('');
    setShowApprovalDialog(true);
  };

  const handleSubmitApproval = async () => {
    if (!selectedApproval) return;

    setSubmitting(true);
    try {
      await workflowsService.approve(
        selectedApproval.workflowId,
        approvalAction,
        comment || undefined
      );

      const actionText = {
        [ApprovalAction.APPROVED]: 'aprobado',
        [ApprovalAction.REJECTED]: 'rechazado',
        [ApprovalAction.REQUESTED_CHANGES]: 'solicitado cambios para',
        [ApprovalAction.COMMENTED]: 'comentado en',
      }[approvalAction];

      toast.success(`Documento ${actionText} exitosamente`);
      setShowApprovalDialog(false);
      setSelectedApproval(null);
      setComment('');
      loadApprovals();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al procesar la aprobación');
    } finally {
      setSubmitting(false);
    }
  };

  const getActionBadge = (action: ApprovalAction | null) => {
    if (!action) {
      return <Badge variant="secondary">Pendiente</Badge>;
    }

    const config = {
      [ApprovalAction.APPROVED]: { variant: 'default' as const, label: 'Aprobado', icon: CheckCircle2 },
      [ApprovalAction.REJECTED]: { variant: 'destructive' as const, label: 'Rechazado', icon: XCircle },
      [ApprovalAction.REQUESTED_CHANGES]: { variant: 'secondary' as const, label: 'Cambios solicitados', icon: MessageSquare },
      [ApprovalAction.COMMENTED]: { variant: 'outline' as const, label: 'Comentado', icon: MessageSquare },
    };

    const { variant, label, icon: Icon } = config[action];

    return (
      <Badge variant={variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CheckCircle2 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Aprobaciones Pendientes</h1>
          <p className="text-muted-foreground">
            Gestiona los documentos que requieren tu aprobación
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Mis Aprobaciones</CardTitle>
          <CardDescription>
            Documentos en workflows que requieren tu aprobación
          </CardDescription>
        </CardHeader>
        <CardContent>
          {approvals.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No tienes aprobaciones pendientes</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Iniciado por</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {approvals.map((approval) => (
                  <TableRow key={approval.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Documento #{approval.workflowId}</p>
                          {approval.comment && (
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {approval.comment}
                            </p>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getActionBadge(approval.action)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {approval.state} (Orden {approval.stateOrder})
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{approval.user.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {formatDistanceToNow(new Date(approval.createdAt), {
                          addSuffix: true,
                          locale: es,
                        })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {!approval.action && (
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() =>
                              handleOpenApprovalDialog(approval, ApprovalAction.APPROVED)
                            }
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Aprobar
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              handleOpenApprovalDialog(approval, ApprovalAction.REJECTED)
                            }
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Rechazar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              handleOpenApprovalDialog(approval, ApprovalAction.REQUESTED_CHANGES)
                            }
                          >
                            <MessageSquare className="h-4 w-4 mr-1" />
                            Solicitar cambios
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {approvalAction === ApprovalAction.APPROVED && 'Aprobar documento'}
              {approvalAction === ApprovalAction.REJECTED && 'Rechazar documento'}
              {approvalAction === ApprovalAction.REQUESTED_CHANGES && 'Solicitar cambios'}
            </DialogTitle>
            <DialogDescription>
              {approvalAction === ApprovalAction.APPROVED &&
                'El documento será aprobado y avanzará al siguiente estado del workflow'}
              {approvalAction === ApprovalAction.REJECTED &&
                'El documento será rechazado y el workflow se detendrá'}
              {approvalAction === ApprovalAction.REQUESTED_CHANGES &&
                'Se notificará al creador que debe realizar cambios'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="comment">Comentario (opcional)</Label>
              <Textarea
                id="comment"
                placeholder={
                  approvalAction === ApprovalAction.APPROVED
                    ? 'Escribe un comentario sobre la aprobación...'
                    : 'Describe los motivos del rechazo o los cambios requeridos...'
                }
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowApprovalDialog(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitApproval}
              disabled={submitting}
              variant={
                approvalAction === ApprovalAction.REJECTED ? 'destructive' : 'default'
              }
            >
              {submitting ? 'Procesando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
