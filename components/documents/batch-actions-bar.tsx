'use client';

import { useState } from 'react';
import { batchService } from '@/lib/services/batch.service';
import { Document } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import toast from 'react-hot-toast';
import {
  Download,
  Trash2,
  RotateCcw,
  Pencil,
  X,
  ChevronDown,
  Folder,
  Tag,
} from 'lucide-react';

interface BatchActionsBarProps {
  selectedDocuments: Document[];
  onClearSelection: () => void;
  onSuccess?: () => void;
}

export function BatchActionsBar({
  selectedDocuments,
  onClearSelection,
  onSuccess,
}: BatchActionsBarProps) {
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ permanent: boolean } | null>(null);

  if (selectedDocuments.length === 0) {
    return null;
  }

  const selectedIds = selectedDocuments.map((d) => d.id);

  const handleBatchDelete = async (permanent: boolean = false) => {
    setLoading(true);
    try {
      await batchService.delete({
        documentIds: selectedIds,
        permanent,
      });
      toast.success(
        permanent
          ? `${selectedDocuments.length} documento(s) eliminados permanentemente`
          : `${selectedDocuments.length} documento(s) movidos a la papelera`
      );
      onClearSelection();
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al eliminar documentos');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchExport = async () => {
    setLoading(true);
    try {
      await batchService.downloadExport(
        selectedIds,
        `documents-${Date.now()}.zip`
      );
      toast.success(`Descargando ${selectedDocuments.length} documento(s)...`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al exportar documentos');
    } finally {
      setLoading(false);
    }
  };

  const allDeleted = selectedDocuments.every((d) => d.deletedAt);

  const handleBatchRestore = async () => {
    setLoading(true);
    try {
      await batchService.restore(selectedIds);
      toast.success(`${selectedDocuments.length} documento(s) restaurados`);
      onClearSelection();
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al restaurar documentos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
        <div className="bg-background border border-border rounded-lg shadow-lg px-4 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1">
              {selectedDocuments.length} seleccionado{selectedDocuments.length > 1 && 's'}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
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
                disabled={loading}
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
                  disabled={loading}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar ZIP
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" disabled={loading}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Editar
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      <Folder className="mr-2 h-4 w-4" />
                      Cambiar categoría
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Tag className="mr-2 h-4 w-4" />
                      Cambiar sección
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}

            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteConfirm({ permanent: allDeleted })}
              disabled={loading}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {allDeleted ? 'Eliminar permanentemente' : 'Eliminar'}
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title={deleteConfirm?.permanent ? "Eliminar permanentemente" : "Eliminar documentos"}
        description={
          deleteConfirm?.permanent
            ? `¿Estás seguro de eliminar permanentemente ${selectedDocuments.length} documento(s)? Esta acción no se puede deshacer.`
            : `¿Estás seguro de eliminar ${selectedDocuments.length} documento(s)? Serán enviados a la papelera.`
        }
        confirmLabel={deleteConfirm?.permanent ? "Eliminar permanentemente" : "Eliminar"}
        variant="destructive"
        loading={loading}
        onConfirm={() => {
          handleBatchDelete(deleteConfirm?.permanent ?? false);
          setDeleteConfirm(null);
        }}
      />
    </>
  );
}
