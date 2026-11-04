'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { batchService } from '@/lib/services/batch.service';
import { BatchAction, readBatchActionCapabilities } from '@/lib/batch-action-capabilities';
import { Document } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import toast from 'react-hot-toast';
import {
  Download,
  Trash2,
  RotateCcw,
  X,
} from 'lucide-react';

interface BatchActionsBarProps {
  selectedDocuments: Document[];
  contextKey: string;
  authorize: (action: BatchAction, documentIds: number[]) => boolean;
  onClearSelection: () => void;
  onSuccess?: () => void;
}

export function BatchActionsBar({
  selectedDocuments,
  contextKey,
  authorize,
  onClearSelection,
  onSuccess,
}: BatchActionsBarProps) {
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ permanent: boolean; epoch: object } | null>(null);
  const reasonId = useId();
  const selectedIds = selectedDocuments.map((d) => d.id);
  const allDeleted = selectedDocuments.every((d) => d.deletedAt);
  const selectionKey = JSON.stringify([contextKey, selectedIds, allDeleted]);
  const current = useRef({ key: selectionKey, epoch: {}, alive: true, selectedDocuments, authorize });
  if (current.current.key !== selectionKey) {
    current.current = { key: selectionKey, epoch: {}, alive: true, selectedDocuments, authorize };
  } else {
    current.current.selectedDocuments = selectedDocuments;
    current.current.authorize = authorize;
  }
  const epoch = current.current.epoch;
  const operation = useRef<{ epoch: object; token: object } | null>(null);
  useEffect(() => {
    current.current.alive = true;
    return () => { current.current.alive = false; };
  }, []);
  useEffect(() => { setLoading(false); setDeleteConfirm(null); }, [selectionKey]);

  const canRun = (action: BatchAction, expectedEpoch = epoch) => {
    const latest = current.current;
    const ids = latest.selectedDocuments.map((document) => document.id);
    return latest.alive && latest.epoch === expectedEpoch && ids.length > 0 &&
      ids.every((id) => Number.isSafeInteger(id) && id > 0) && new Set(ids).size === ids.length &&
      latest.selectedDocuments.every((document) => readBatchActionCapabilities(document)?.[action] === true) &&
      latest.authorize(action, ids);
  };

  async function runAction(action: BatchAction, request: () => Promise<unknown>,
    settle: (result: unknown) => void, errorMessage: string) {
    if (!canRun(action) || operation.current?.epoch === epoch) return;
    const token = {};
    operation.current = { epoch, token };
    setLoading(true);
    try {
      const result = await request();
      if (canRun(action, epoch) && operation.current?.token === token) settle(result);
    } catch (error: any) {
      if (canRun(action, epoch) && operation.current?.token === token) {
        toast.error(error.response?.data?.message || errorMessage);
      }
    } finally {
      if (current.current.alive && current.current.epoch === epoch && operation.current?.token === token) {
        operation.current = null;
        setLoading(false);
      }
    }
  }

  const handleBatchDelete = (permanent: boolean) => runAction(
    permanent ? 'permanentDelete' : 'trash',
    () => batchService.delete({ documentIds: selectedIds, permanent }),
    () => {
      toast.success(permanent
        ? `${selectedIds.length} ${selectedIds.length === 1 ? "documento eliminado permanentemente" : "documentos eliminados permanentemente"}`
        : `${selectedIds.length} ${selectedIds.length === 1 ? "documento movido a la papelera" : "documentos movidos a la papelera"}`);
      onClearSelection();
      onSuccess?.();
    }, 'Error al eliminar documentos',
  );

  const handleBatchExport = () => runAction('export',
    () => batchService.export({ documentIds: selectedIds }),
    (result) => {
      const url = window.URL.createObjectURL(result as Blob);
      const link = document.createElement('a');
      try {
        link.href = url;
        link.download = `documents-${Date.now()}.zip`;
        document.body.appendChild(link);
        link.click();
        toast.success(`Descargando ${selectedIds.length} ${selectedIds.length === 1 ? "documento" : "documentos"}...`);
      } finally {
        link.remove();
        window.URL.revokeObjectURL(url);
      }
    }, 'Error al exportar documentos',
  );

  const handleBatchRestore = () => runAction('restore',
    () => batchService.restore(selectedIds),
    () => {
      toast.success(`${selectedDocuments.length} ${selectedDocuments.length === 1 ? "documento restaurado" : "documentos restaurados"}`);
      onClearSelection();
      onSuccess?.();
    }, 'Error al restaurar documentos',
  );

  if (selectedDocuments.length === 0) return null;
  const deleteAction = allDeleted ? 'permanentDelete' : 'trash';
  const visibleActions: BatchAction[] = allDeleted ? ['restore', deleteAction] : ['export', deleteAction];
  const blockedActions = visibleActions.filter((action) => !canRun(action));
  const actionLabels: Record<BatchAction, string> = { update: 'Editar', trash: 'Eliminar',
    restore: 'Restaurar', permanentDelete: 'Eliminar permanentemente', export: 'Descargar ZIP' };

  return (
    <>
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <div className="flex max-w-[calc(100vw-2rem)] flex-wrap items-center justify-center gap-4 rounded-lg border border-border bg-background px-4 py-3 shadow-lg">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              {selectedDocuments.length} seleccionado{selectedDocuments.length > 1 && 's'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              aria-label="Limpiar selección"
              className="h-6 px-2"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>

          <div className="h-6 w-px bg-border" />

          <div className="flex items-center gap-2">
            {allDeleted ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleBatchRestore}
                disabled={loading || !canRun('restore')}
                aria-describedby={!canRun('restore') ? reasonId : undefined}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restaurar
              </Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBatchExport}
                  disabled={loading || !canRun('export')}
                  aria-describedby={!canRun('export') ? reasonId : undefined}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar ZIP
                </Button>


              </>
            )}

            <Button
              variant="destructive"
              size="sm"
              onClick={() => { if (canRun(deleteAction)) setDeleteConfirm({ permanent: allDeleted, epoch }); }}
              disabled={loading || !canRun(deleteAction)}
              aria-describedby={!canRun(deleteAction) ? reasonId : undefined}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {allDeleted ? 'Eliminar permanentemente' : 'Eliminar'}
            </Button>
          </div>
          {blockedActions.length > 0 && (
            <p id={reasonId} className="max-w-xs text-xs text-muted-foreground" role="status">
              {blockedActions.map((action) => actionLabels[action]).join(', ')}: la selección completa
              no dispone de permisos vigentes o está pendiente de verificación. No se ejecutará sobre un subconjunto.
            </p>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteConfirm !== null && deleteConfirm.epoch === epoch && canRun(deleteConfirm.permanent ? 'permanentDelete' : 'trash')}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title={deleteConfirm?.permanent ? "Eliminar permanentemente" : "Eliminar documentos"}
        description={
          deleteConfirm?.permanent
            ? `¿Estás seguro de eliminar permanentemente ${selectedDocuments.length} ${selectedDocuments.length === 1 ? "documento" : "documentos"}? Esta acción no se puede deshacer.`
            : `¿Estás seguro de eliminar ${selectedDocuments.length} ${selectedDocuments.length === 1 ? "documento" : "documentos"}? Serán enviados a la papelera.`
        }
        confirmLabel={deleteConfirm?.permanent ? "Eliminar permanentemente" : "Eliminar"}
        variant="destructive"
        loading={loading}
        onConfirm={() => {
          if (deleteConfirm?.epoch === epoch) handleBatchDelete(deleteConfirm.permanent);
          setDeleteConfirm(null);
        }}
      />
    </>
  );
}
