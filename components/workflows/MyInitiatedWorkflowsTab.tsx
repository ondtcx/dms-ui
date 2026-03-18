'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workflowsService } from '@/lib/services/workflows.service';
import { DocumentWorkflow, WorkflowStatus } from '@/lib/types';
import { WORKFLOW_STATUS_CONFIG } from '@/lib/workflow-status-config';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { GitBranch, Clock, FileText, ExternalLink, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

type StatusFilter = 'all' | 'active' | 'completed' | 'cancelled';

const FILTER_BUTTONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'active', label: 'Activos' },
  { value: 'completed', label: 'Completados' },
  { value: 'cancelled', label: 'Cancelados' },
];

const ACTIVE_STATUSES = [WorkflowStatus.IN_PROGRESS, WorkflowStatus.PENDING, WorkflowStatus.CHANGES_REQUESTED];

export default function MyInitiatedWorkflowsTab() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['my-initiated-workflows', statusFilter, page],
    queryFn: () => workflowsService.getMyInitiatedWorkflows({ status: statusFilter, page, limit: 20 }),
  });

  const workflows = data?.data ?? [];
  const meta = data?.meta;

  const cancelMutation = useMutation({
    mutationFn: (workflowId: number) => workflowsService.cancel(workflowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-initiated-workflows'] });
      toast.success('Workflow cancelado');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al cancelar el workflow');
    },
  });

  const resubmitMutation = useMutation({
    mutationFn: (workflowId: number) => workflowsService.resubmit(workflowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-initiated-workflows'] });
      toast.success('Workflow reenviado para revisión');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Error al reenviar el workflow');
    },
  });

  const handleFilterChange = (filter: StatusFilter) => {
    setStatusFilter(filter);
    setPage(1);
  };

  const handleCancel = (workflow: DocumentWorkflow) => {
    if (!confirm(`¿Cancelar el workflow de "${workflow.document?.filename ?? `Documento #${workflow.documentId}`}"?`)) return;
    cancelMutation.mutate(workflow.id);
  };

  const getProgressLabel = (workflow: DocumentWorkflow): string => {
    const total = (workflow.template?.stateDefinitions as any[])?.length ?? 0;
    if (total === 0) return '—';
    const current = workflow.currentStateOrder ?? 0;
    return `${current}/${total} etapas`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mis Flujos</CardTitle>
        <CardDescription>Workflows que has iniciado</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filtros */}
        <div className="flex gap-2">
          {FILTER_BUTTONS.map((btn) => (
            <Button
              key={btn.value}
              size="sm"
              variant={statusFilter === btn.value ? 'default' : 'outline'}
              onClick={() => handleFilterChange(btn.value)}
            >
              {btn.label}
            </Button>
          ))}
        </div>

        {workflows.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <GitBranch className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No has iniciado ningún workflow aún.</p>
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Documento</TableHead>
                  <TableHead>Plantilla</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Etapa actual</TableHead>
                  <TableHead>Progreso</TableHead>
                  <TableHead>Iniciado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workflows.map((workflow) => {
                  const cfg = WORKFLOW_STATUS_CONFIG[workflow.status];
                  const Icon = cfg.icon;
                  const isActive = ACTIVE_STATUSES.includes(workflow.status);
                  const isChangesRequested = workflow.status === WorkflowStatus.CHANGES_REQUESTED;
                  const showCurrentState =
                    workflow.currentState &&
                    workflow.status !== WorkflowStatus.APPROVED &&
                    workflow.status !== WorkflowStatus.CANCELLED;

                  return (
                    <TableRow key={workflow.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                          <button
                            className="font-medium text-left hover:underline flex items-center gap-1"
                            onClick={() =>
                              router.push(`/dashboard/documents/${workflow.documentId}`)
                            }
                          >
                            {workflow.document?.filename ?? `Documento #${workflow.documentId}`}
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          </button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {workflow.template?.name ?? '—'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={cfg.variant} className="gap-1">
                          <Icon className="h-3 w-3" />
                          {cfg.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {showCurrentState ? (
                          <Badge variant="outline">{workflow.currentState}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {getProgressLabel(workflow)}
                        </span>
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
                        <div className="flex items-center justify-end gap-2">
                          {isChangesRequested && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1"
                              onClick={() => resubmitMutation.mutate(workflow.id)}
                              disabled={resubmitMutation.isPending}
                            >
                              <RefreshCw className="h-3 w-3" />
                              Reenviar
                            </Button>
                          )}
                          {isActive && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-muted-foreground hover:text-destructive"
                              onClick={() => handleCancel(workflow)}
                              disabled={cancelMutation.isPending}
                            >
                              Cancelar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            {/* Paginación */}
            {meta && meta.totalPages > 1 && (
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-muted-foreground">
                  {meta.total} workflows — página {meta.page} de {meta.totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page >= meta.totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
