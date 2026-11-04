'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  ArrowLeft,
  Check,
  Copy,
  Download,
  RefreshCw,
  Eye,
  FilePenLine,
  Loader2,
  RotateCcw,
  ScrollText,
  Send,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ProtectedRoute from '@/guards/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { authoringService } from '@/lib/services/authoring.service';
import { useAuth } from '@/lib/contexts/AuthContext';
import { UserRole } from '@/lib/types';
import { AuthoringStatusBadge } from '@/components/authoring/AuthoringStatusBadge';
import { DocumentStageTracker } from '@/components/documents/DocumentStageTracker';

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
  const { user } = useAuth();
  const documentId = Number(params.id);
  const [reviewAction, setReviewAction] = useState<'approve' | 'return' | null>(null);
  const [observation, setObservation] = useState('');
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [confirmEmitOpen, setConfirmEmitOpen] = useState(false);
  const [confirmArchiveOpen, setConfirmArchiveOpen] = useState(false);
  const [emitError, setEmitError] = useState<string | null>(null);

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
      setConfirmEmitOpen(false);
    } catch (error) {
      const message = (
        error as { response?: { data?: { message?: string | string[] } } }
      ).response?.data?.message;
      setEmitError(
        Array.isArray(message)
          ? message.join('; ')
          : message || 'No se pudo emitir el documento.',
      );
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
      setConfirmArchiveOpen(false);
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

  const copyDocumentNumber = async () => {
    if (!document?.documentNumber) return;
    try {
      await navigator.clipboard.writeText(document.documentNumber);
      toast.success('Número copiado');
    } catch {
      toast.error('No se pudo copiar el número');
    }
  };

  const timeline = useMemo(
    () =>
      (document?.authoring.events ?? []).filter(
        (event) => event.action !== 'SAVED',
      ),
    [document],
  );
  const savedCount = useMemo(
    () =>
      (document?.authoring.events ?? []).filter(
        (event) => event.action === 'SAVED',
      ).length,
    [document],
  );

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando documento...
      </div>
    );
  }

  if (query.isError) {
    const status = (query.error as { response?: { status?: number } })?.response
      ?.status;
    if (status !== 404) {
      return (
        <div className="p-6">
          <p className="text-sm text-destructive">
            No se pudo cargar el documento.
          </p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => query.refetch()}
          >
            <RefreshCw className="mr-2 h-4 w-4" /> Reintentar
          </Button>
        </div>
      );
    }
  }

  if (!document) {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">Documento no encontrado.</p>
        <Button className="mt-4" variant="outline" onClick={() => router.push('/dashboard/documents')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>
      </div>
    );
  }

  const status = document.authoring.status;
  const canReview =
    status === 'IN_REVIEW' &&
    (document.authoring.reviewerId
      ? document.authoring.reviewerId === user?.id ||
        user?.role === UserRole.ADMIN
      : [UserRole.ADMIN, UserRole.RECTOR, UserRole.VICERRECTOR].includes(
          user?.role as UserRole,
        ));
  const title = document.name || document.templateData?.template?.name || `Documento #${document.id}`;
  const isCreator = document.uploadedBy?.id === user?.id;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Button
            variant="ghost"
            className="mb-2 h-auto px-0 py-0 text-muted-foreground"
            onClick={() => router.push('/dashboard/documents')}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Documentos
          </Button>
          <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <AuthoringStatusBadge status={status} />
            <span>{document.templateData?.template?.name}</span>
            <span>·</span>
            <span>{document.documentNumber || 'Sin número'}</span>
          </div>
          <DocumentStageTracker
            mode="authoring"
            status={status}
            className="mt-3"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(status === 'DRAFT' || status === 'CHANGES_REQUESTED') && (
            <Button
              onClick={() => router.push(`/dashboard/elaboracion/${document.id}/editar`)}
            >
              <FilePenLine className="mr-2 h-4 w-4" /> Editar
            </Button>
          )}
          {status === 'IN_REVIEW' && canReview && (
            <>
              <Button onClick={() => setReviewAction('approve')}>
                <Check className="mr-2 h-4 w-4" /> Aprobar
              </Button>
              <Button variant="outline" onClick={() => setReviewAction('return')}>
                <RotateCcw className="mr-2 h-4 w-4" /> Devolver
              </Button>
            </>
          )}
          {status === 'IN_REVIEW' && !canReview && (
            <p className="max-w-[18rem] text-right text-xs text-muted-foreground">
              {document.authoring.reviewerId
                ? "Solo el revisor asignado puede aprobar o devolver este documento."
                : "Sin revisor asignado: solo Administración, Rectorado o Vicerrectorado pueden aprobar o devolver este documento."}
            </p>
          )}
          {status === 'APPROVED' && isCreator && (
            <Button
              variant="secondary"
              onClick={() => {
                setEmitError(null);
                setConfirmEmitOpen(true);
              }}
              disabled={busy}
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Emitir y numerar
            </Button>
          )}
          {status === 'EMITTED' && (
            <Button
              variant="outline"
              onClick={() => setConfirmArchiveOpen(true)}
              disabled={busy}
            >
              <Archive className="mr-2 h-4 w-4" /> Archivar
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href={`/dashboard/documents/${document.id}/audit`}>
              <ScrollText className="mr-2 h-4 w-4" /> Registro de actividad
            </Link>
          </Button>
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

      {(status === 'EMITTED' || status === 'ARCHIVED') && document.documentNumber ? (
        <Card className="border-secondary/30 bg-secondary/5">
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Número institucional
              </p>
              <p className="mt-1 font-mono text-2xl font-semibold tracking-tight">
                {document.documentNumber}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {document.authoring.emittedAt
                  ? `Emitido el ${formatDate(document.authoring.emittedAt)}`
                  : 'Documento emitido'}
                {document.authoring.emittedByName
                  ? ` por ${document.authoring.emittedByName}`
                  : ''}
                .
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={copyDocumentNumber}>
                <Copy className="mr-2 h-4 w-4" /> Copiar número
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href={`/dashboard/documents/${document.id}/audit`}>
                  Auditar accesos
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {status === 'APPROVED' && !isCreator ? (
        <Card className="border-border bg-muted/40">
          <CardContent className="py-3 text-sm text-muted-foreground">
            El documento está aprobado. Solo el creador puede emitirlo y
            asignarle el número institucional.
          </CardContent>
        </Card>
      ) : null}

      {document.authoring.reviewObservation && (
        <Card className="border-amber-300 bg-amber-50/60 dark:border-amber-700/50 dark:bg-amber-950/30">
          <CardContent className="py-3 text-sm text-amber-900 dark:text-amber-200">
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
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Revisor asignado</span>
                <span className="text-right">
                  {document.authoring.reviewerName || "Sin asignar"}
                </span>
              </div>
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
              {savedCount > 0 ? (
                <p className="text-xs text-muted-foreground">
                  Se omitieron {savedCount}{' '}
                  {savedCount === 1 ? 'autoguardado' : 'autoguardados'} del
                  borrador.
                </p>
              ) : null}
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

      <ConfirmDialog
        open={confirmEmitOpen}
        onOpenChange={setConfirmEmitOpen}
        title="Emitir y numerar"
        description={
          emitError ? (
            <span role="alert">{emitError}</span>
          ) : (
            `Se asignará el número institucional definitivo a "${title}"${
              document.templateData?.template?.name
                ? ` (${document.templateData.template.name}, versión ${document.currentVersion})`
                : ''
            }. El documento pasará a Emitido y no podrá volver a borrador.`
          )
        }
        confirmLabel="Emitir y numerar"
        variant="secondary"
        loading={busy}
        onConfirm={emit}
      />

      <ConfirmDialog
        open={confirmArchiveOpen}
        onOpenChange={setConfirmArchiveOpen}
        title="Archivar documento"
        description={`"${title}" saldrá del flujo activo y quedará archivado. Conservará su número institucional, su versión y su historial de auditoría.`}
        confirmLabel="Archivar"
        loading={busy}
        onConfirm={archive}
      />

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
            aria-label="Observaciones de revisión"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewAction(null)}>
              Cancelar
            </Button>
            <Button
              onClick={review}
              disabled={
                busy ||
                (reviewAction === 'return' && !observation.trim())
              }
            >
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
