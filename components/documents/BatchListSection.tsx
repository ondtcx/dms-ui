'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { batchService } from '@/lib/services/batch.service';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { Layers, Eye, Download, Trash2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export function BatchListSection() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['document-batches'],
    queryFn: () => batchService.listBatches({ limit: 50 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => batchService.deleteBatch(id),
    onSuccess: (result) => {
      toast.success(`Lote eliminado (${result.deletedDocuments} documentos)`);
      queryClient.invalidateQueries({ queryKey: ['document-batches'] });
    },
    onError: () => toast.error('Error al eliminar el lote'),
  });

  const handleDelete = (id: string, name: string) => {
    setDeleteConfirm({ id, name });
  };

  const handleDownload = async (id: string, name: string) => {
    try {
      await batchService.downloadBatch(id, name);
      toast.success('Descarga iniciada');
    } catch {
      toast.error('Error al descargar el lote');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  const batches = data?.data ?? [];

  if (batches.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Layers className="h-16 w-16 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">No hay lotes de documentos</p>
          <p className="text-sm text-muted-foreground mt-1">
            Genera documentos en lote desde una plantilla para verlos aquí
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lotes de Documentos</CardTitle>
        <CardDescription>{batches.length} lote{batches.length !== 1 ? 's' : ''}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {batches.map((batch, index) => (
            <div key={batch.id}>
              {index > 0 && <Separator />}
              <div className="py-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <Layers className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{batch.name}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs gap-1">
                        <FileText className="h-3 w-3" />
                        {batch.template?.name ?? `Plantilla #${batch.templateId}`}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {batch._count?.documents ?? batch.totalCount} documentos
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Por {batch.createdBy?.name} ·{' '}
                      {format(new Date(batch.createdAt), 'PPP', { locale: es })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/dashboard/documents/batches/${batch.id}`)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Ver
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(batch.id, batch.name)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    ZIP
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(batch.id, batch.name)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <ConfirmDialog
        open={deleteConfirm !== null}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Eliminar lote"
        description={`¿Eliminar el lote "${deleteConfirm?.name}"? Los documentos serán enviados a la papelera.`}
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteConfirm) deleteMutation.mutate(deleteConfirm.id);
          setDeleteConfirm(null);
        }}
      />
    </Card>
  );
}
