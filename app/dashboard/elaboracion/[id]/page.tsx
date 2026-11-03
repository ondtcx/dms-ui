'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  ArrowLeft,
  Check,
  Download,
  Eye,
  FilePenLine,
  Loader2,
  RotateCcw,
  Send,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ProtectedRoute from '@/guards/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { authoringService } from '@/lib/services/authoring.service';
import { AuthoringStatusBadge } from '@/components/authoring/AuthoringStatusBadge';

const ACTION_LABELS: Record<string, string> = {
  CREATED: 'Borrador creado',
  SAVED: 'Borrador guardado',
  SUBMITTED: 'Enviado a revisión',
  APPROVED: 'Aprobado',
  RETURNED: 'Devuelto con observaciones',
  EMITTED: 'Emitido',
  ARCHIVED: 'Archivado',
};

const CONTENT_REASON_LABELS: Record<string, string> = {
  DRAFT_SAVE: 'Guardado de borrador',
  SENT_TO_REVIEW: 'Envío a revisión',
  RETURNED: 'Devolución',
  APPROVED: 'Aprobación',
  EMITTED: 'Emisión',
};

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function DocumentDetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const documentId = Number(params.id);
  const [reviewAction, setReviewAction] = useState<'approve' | 'return' | null>(null);
  const [observation, setObservation] = useState('');
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['authoring-document', documentId],
    queryFn: () => authoringService.getDocument(documentId),
    enabled: Number.isSafeInteger(documentId) && documentId > 0,
  });
  const document = query.data;

  const previewQuery = useQuery({
    queryKey: ['authoring-preview', documentId],
    queryFn: () => authoringService.previewDocument(documentId),
    enabled: Boolean(document),
    staleTime: 0,
  });

  useEffect(() => {
    if (!previewQuery.data) return;
    const url = URL.createObjectURL(previewQuery.data);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [previewQuery.data]);

  const refresh = async (next: any) => {
    queryClient.setQueryData(['authoring-document', documentId], next);
    await queryClient.invalidateQueries({ queryKey: ['authoring-documents'] });
    await queryClient.invalidateQueries({ queryKey: ['authoring-preview', documentId] });
  };

  const emit = async () => {
    if (!document) return;
    setBusy(true);
    try {
      await refresh(await authoringService.emit(document.id));
      toast.success('Documento emitido');
    } catch {
      toast.error('No se pudo emitir el documento. Revisa los campos obligatorios.');
    } finally {
      setBusy(false);
    }
  };

  const archive = async () => {
    if (!document) return;
    setBusy(true);
    try {
      await refresh(await authoringService.archive(document.id));
      toast.success('Documento archivado');
    } catch {
      toast.error('No se pudo archivar el documento');
    } finally {
      setBusy(false);
    }
  };

  const review = async () => {
    if (!document || !reviewAction) return;
    if (reviewAction === 'return' && !observation.trim()) {
      toast.error('Escribe una observación para devolver el documento');
      return;
    }
    setBusy(true);
    try {
      const next =
        reviewAction === 'approve'
          ? await authoringService.approve(document.id, { observation: observation || undefined })
          : await authoringService.returnDocument(document.id, { observation });
      await refresh(next);
      toast.success(reviewAction === 'approve' ? 'Documento aprobado' : 'Documento devuelto');
      setReviewAction(null);
      setObservation('');
    } catch {
      toast.error('No se pudo completar la revisión');
    } finally {
      setBusy(false);
    }
  };

  const download = async () => {
    if (!document) return;
    try {
      const blob = await authoringService.downloadDocument(document.id);
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = `${document.name || 'documento'}.pdf`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch {
      toast.error('No se pudo descargar el PDF');
    }
  };

  const openPreview = async () => {
    if (!document) return;
    try {
      const blob = await authoringService.previewDocument(document.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      toast.error('No se pudo generar la vista previa');
    }
  };

  const timeline = useMemo(() => document?.authoring.events ?? [], [document]);

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando documento...
      </div>
    );
  }

  if (!document) {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">Documento no encontrado.</p>
        <Button className="mt-4" variant="outline" onClick={() => router.push('/dashboard/elaboracion')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>
      </div>
    );
  }

  const status = document.authoring.status;
  const title = document.name || document.templateData?.template?.name || `Documento #${document.id}`;

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Button
            variant="ghost"
            className="mb-2 h-auto px-0 py-0 text-muted-foreground"
            onClick={() => router.push('/dashboard/elaboracion')}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Biblioteca
          </Button>
          <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <AuthoringStatusBadge status={status} />
            <span>{document.templateData?.template?.name}</span>
            <span>·</span>
            <span>{document.documentNumber || 'Sin número'}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(status === 'DRAFT' || status === 'CHANGES_REQUESTED') && (
            <Button
              onClick={() => router.push(`/dashboard/elaboracion/${document.id}/editar`)}
            >
              <FilePenLine className="mr-2 h-4 w-4" /> Editar
            </Button>
          )}
          {status === 'IN_REVIEW' && (
            <>
              <Button onClick={() => setReviewAction('approve')}>
                <Check className="mr-2 h-4 w-4" /> Aprobar
              </Button>
              <Button variant="outline" onClick={() => setReviewAction('return')}>
                <RotateCcw className="mr-2 h-4 w-4" /> Devolver
              </Button>
            </>
          )}
          {status === 'APPROVED' && (
            <Button onClick={emit} disabled={busy}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Emitir
            </Button>
          )}
          {status === 'EMITTED' && (
            <Button variant="outline" onClick={archive} disabled={busy}>
              <Archive className="mr-2 h-4 w-4" /> Archivar
            </Button>
          )}
          <Button variant="outline" onClick={openPreview}>
            <Eye className="mr-2 h-4 w-4" /> Previsualizar
          </Button>
          {(status === 'EMITTED' || status === 'ARCHIVED') && (
            <Button variant="outline" onClick={download}>
              <Download className="mr-2 h-4 w-4" /> Descargar PDF
            </Button>
          )}
        </div>
      </div>

      {document.authoring.reviewObservation && (
        <Card className="border-amber-300 bg-amber-50/60">
          <CardContent className="py-3 text-sm text-amber-900">
            <strong>Observaciones:</strong> {document.authoring.reviewObservation}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Vista previa</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {previewUrl ? (
              <iframe
                title="Vista previa del documento"
                src={previewUrl}
                className="h-[70vh] w-full border-0 bg-muted/30"
              />
            ) : (
              <div className="flex h-[70vh] items-center justify-center text-sm text-muted-foreground">
                {previewQuery.isLoading ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Generando vista previa...
                  </span>
                ) : (
                  'Vista previa no disponible'
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Datos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Autor</span>
                <span className="text-right">{document.uploadedBy?.name || '—'}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Creado</span>
                <span className="text-right">{formatDate(document.createdAt)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Actualizado</span>
                <span className="text-right">{formatDate(document.updatedAt)}</span>
              </div>
              {document.authoring.reviewerName && (
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Revisor</span>
                  <span className="text-right">{document.authoring.reviewerName}</span>
                </div>
              )}
              {document.authoring.emittedByName && (
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Emitido por</span>
                  <span className="text-right">{document.authoring.emittedByName}</span>
                </div>
              )}
              {document.authoring.emittedAt && (
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">Emisión</span>
                  <span className="text-right">{formatDate(document.authoring.emittedAt)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Historial</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {timeline.length === 0 ? (
                <p className="text-muted-foreground">Sin movimientos registrados.</p>
              ) : (
                timeline.map((event) => (
                  <div key={event.id} className="border-l-2 border-border pl-3">
                    <div className="font-medium">
                      {ACTION_LABELS[event.action] ?? event.action}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {event.actorName || 'Usuario'} · {formatDate(event.createdAt)}
                    </div>
                    {event.observation && (
                      <p className="mt-1 text-xs">{event.observation}</p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {document.contentVersions?.length ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Versiones de contenido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {document.contentVersions.map((version) => (
                  <div key={version.id} className="flex justify-between gap-3">
                    <span>
                      v{version.version} ·{' '}
                      {CONTENT_REASON_LABELS[version.reason] ?? version.reason}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(version.createdAt)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <Dialog open={reviewAction !== null} onOpenChange={(open) => !open && setReviewAction(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approve' ? 'Aprobar documento' : 'Devolver documento'}
            </DialogTitle>
            <DialogDescription>
              {reviewAction === 'approve'
                ? 'Puedes dejar una observación opcional.'
                : 'Explica qué debe corregir el autor.'}
            </DialogDescription>
          </DialogHeader>
          <textarea
            className="min-h-28 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={observation}
            onChange={(event) => setObservation(event.target.value)}
            placeholder="Observaciones..."
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewAction(null)}>
              Cancelar
            </Button>
            <Button onClick={review} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {reviewAction === 'approve' ? 'Aprobar' : 'Devolver'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AuthoringDocumentDetailPage() {
  return (
    <ProtectedRoute>
      <DocumentDetailContent />
    </ProtectedRoute>
  );
}
