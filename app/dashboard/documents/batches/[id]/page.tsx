'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { batchService } from '@/lib/services/batch.service';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import toast from 'react-hot-toast';
import {
  ArrowLeft,
  Layers,
  Download,
  Trash2,
  FileText,
  User,
  Calendar,
  FileType,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatMimeType } from '@/lib/utils';
import Link from 'next/link';

export default function BatchDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const batchId = params.id as string;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: batch, isLoading } = useQuery({
    queryKey: ['document-batch', batchId],
    queryFn: () => batchService.getBatch(batchId),
    enabled: !!batchId,
  });

  const deleteMutation = useMutation({
    mutationFn: () => batchService.deleteBatch(batchId),
    onSuccess: () => {
      toast.success('Lote eliminado');
      queryClient.invalidateQueries({ queryKey: ['document-batches'] });
      router.push('/dashboard/documents?tab=batches');
    },
    onError: () => toast.error('Error al eliminar el lote'),
  });

  const handleDownload = async () => {
    try {
      await batchService.downloadBatch(batchId, batch?.name);
      toast.success('Descarga iniciada');
    } catch {
      toast.error('Error al descargar el lote');
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <Layers className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Lote no encontrado</h1>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>
      </div>
    );
  }

  const documents = batch.documents ?? [];

  return (
    <div className="space-y-6 p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <Layers className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">{batch.name}</h1>
            </div>
            <p className="text-muted-foreground mt-1">
              Plantilla:{' '}
              <span className="font-medium">{batch.template?.name ?? `#${batch.templateId}`}</span>
              {' · '}Por {batch.createdBy?.name}
              {' · '}
              {format(new Date(batch.createdAt), 'PPP', { locale: es })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Descargar todos (ZIP)
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Eliminar lote
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4">
        <Badge variant="secondary" className="text-sm py-1 px-3">
          {documents.length} documento{documents.length !== 1 ? 's' : ''}
        </Badge>
      </div>

      {/* Documents list */}
      <Card>
        <CardHeader>
          <CardTitle>Documentos del lote</CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mb-3" />
              <p>No hay documentos en este lote</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc, index) => (
                <div key={doc.id}>
                  {index > 0 && <Separator />}
                  <div className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="h-5 w-5 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <Link
                          href={`/dashboard/documents/${doc.id}`}
                          className="font-medium hover:underline truncate block"
                        >
                          {((doc?.versions?.[0]?.filename) ?? '')}
                        </Link>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <FileType className="h-3 w-3" />
                            {formatMimeType(((doc?.versions?.[0]?.mimetype) ?? ''))}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {formatFileSize(((doc?.versions?.[0]?.size) ?? 0))}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {doc.uploadedBy?.name}
                          </span>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(doc.createdAt), 'PP', { locale: es })}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/dashboard/documents/${doc.id}`}>
                        Ver
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title="Eliminar lote"
        description={`¿Eliminar el lote "${batch?.name}"? Los documentos serán enviados a la papelera.`}
        confirmLabel="Eliminar"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          deleteMutation.mutate();
          setShowDeleteConfirm(false);
        }}
      />
    </div>
  );
}
