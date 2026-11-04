'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Archive, Check, Pencil, RefreshCw, RotateCcw, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { authoringService } from '@/lib/services/authoring.service';
import { ReviewerPicker } from './ReviewerPicker';
import { DocumentStageTracker } from './DocumentStageTracker';
import { documentReviewService } from '@/lib/services/document-reviews.service';
import type { DocumentReview } from '@/lib/types';

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Borrador',
  IN_REVIEW: 'En revisión',
  CHANGES_REQUESTED: 'Cambios solicitados',
  APPROVED: 'Aprobado',
  ARCHIVED: 'Archivado',
};

const ACTION_LABELS: Record<string, string> = {
  CREATED: 'Revisión creada',
  SUBMITTED: 'Enviado a revisión',
  APPROVED: 'Aprobado',
  RETURNED: 'Devuelto',
  ARCHIVED: 'Archivado',
  UPDATED: 'Versión actualizada',
};

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleString('es-ES') : '—';
}

export function DocumentReviewPanel({
  documentId,
  review,
  onChanged,
  canUpdate = false,
  canEditMetadata = false,
  canArchive = false,
  onReplaceFile,
  onEditMetadata,
}: {
  documentId: number;
  review: DocumentReview;
  onChanged: () => void;
  canUpdate?: boolean;
  canEditMetadata?: boolean;
  canArchive?: boolean;
  onReplaceFile?: () => void;
  onEditMetadata?: () => void;
}) {
  const [observation, setObservation] = useState('');
  const [reviewerId, setReviewerId] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const usersQuery = useQuery({
    queryKey: ['authoring-users'],
    queryFn: () => authoringService.listUsers(),
    enabled: review.status === 'DRAFT' || review.status === 'CHANGES_REQUESTED',
  });

  const run = async (action: () => Promise<unknown>, message: string) => {
    setBusy(true);
    try {
      await action();
      toast.success(message);
      onChanged();
    } catch {
      toast.error('No se pudo completar la revisión');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
        <CardTitle className="text-base">Revisión del documento</CardTitle>
        <Badge>{STATUS_LABELS[review.status] ?? review.status}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <DocumentStageTracker mode="upload" status={review.status} />
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {review.reviewerName && <span>Revisor: {review.reviewerName}</span>}
          {review.reviewedByName && <span>Revisó: {review.reviewedByName}</span>}
          {review.submittedAt && <span>Enviado: {formatDate(review.submittedAt)}</span>}
        </div>
        {review.observation && (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            {review.observation}
          </p>
        )}

        {(canUpdate || canEditMetadata) && (
          <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
            <p className="text-sm font-medium">Actualizar documento</p>
            <p className="text-xs text-muted-foreground">
              {review.status === 'IN_REVIEW' || review.status === 'APPROVED'
                ? 'Si actualizas el archivo, la revisión vuelve a Borrador y deberás enviarla de nuevo.'
                : 'Puedes corregir el archivo o los metadatos antes de enviarlo a revisión.'}
            </p>
            <div className="flex flex-wrap gap-2">
              {canUpdate && onReplaceFile ? (
                <Button type="button" size="sm" variant="outline" onClick={onReplaceFile}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Actualizar archivo
                </Button>
              ) : null}
              {canEditMetadata && onEditMetadata ? (
                <Button type="button" size="sm" variant="outline" onClick={onEditMetadata}>
                  <Pencil className="mr-2 h-4 w-4" /> Editar información
                </Button>
              ) : null}
            </div>
          </div>
        )}

        {(review.status === 'DRAFT' || review.status === 'CHANGES_REQUESTED') && (
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="document-review-reviewer">
              Revisor (opcional)
            </label>
            <ReviewerPicker
              id="document-review-reviewer"
              users={usersQuery.data}
              value={reviewerId}
              onChange={setReviewerId}
              disabled={busy}
              loading={usersQuery.isLoading}
            />
            <Button
              size="sm"
              disabled={busy}
              onClick={() => {
                const reviewer = usersQuery.data?.find(
                  (user) => user.id === reviewerId,
                );
                return run(
                  () =>
                    documentReviewService.submit(documentId, {
                      reviewerId: reviewerId || undefined,
                      reviewerName: reviewer?.name ?? undefined,
                    }),
                  'Documento enviado a revisión',
                );
              }}
            >
              <Send className="mr-2 h-4 w-4" /> Enviar a revisión
            </Button>
          </div>
        )}

        {review.status === 'APPROVED' && canArchive ? (
          <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
            <p className="text-sm font-medium">Documento aprobado</p>
            <p className="text-xs text-muted-foreground">
              Puedes archivarlo para retirarlo de la bandeja activa.
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setConfirmArchive(true)}
              disabled={busy}
            >
              <Archive className="mr-2 h-4 w-4" /> Archivar
            </Button>
          </div>
        ) : null}

        {review.status === 'IN_REVIEW' && (
          <div className="space-y-2">
            <textarea
              className="min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Observación de devolución (opcional al aprobar)"
              value={observation}
              onChange={(event) => setObservation(event.target.value)}
            />
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={busy}
                onClick={() =>
                  run(
                    () =>
                      documentReviewService.approve(documentId, observation),
                    'Documento aprobado',
                  )
                }
              >
                <Check className="mr-2 h-4 w-4" /> Aprobar
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={busy || !observation.trim()}
                onClick={() =>
                  run(
                    () =>
                      documentReviewService.returnDocument(
                        documentId,
                        observation,
                      ),
                    'Documento devuelto',
                  )
                }
              >
                <RotateCcw className="mr-2 h-4 w-4" /> Devolver
              </Button>
            </div>
          </div>
        )}

        <ConfirmDialog
          open={confirmArchive}
          onOpenChange={setConfirmArchive}
          title="Archivar documento"
          description="El documento saldrá de la bandeja activa y quedará en el archivo histórico."
          confirmLabel="Archivar"
          onConfirm={() => {
            setConfirmArchive(false);
            return run(
              () => documentReviewService.archive(documentId),
              'Documento archivado',
            );
          }}
        />

        {review.events?.length ? (
          <div className="space-y-1 border-t pt-2">
            {review.events.map((event) => (
              <div key={event.id} className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {ACTION_LABELS[event.action] ?? event.action}
                </span>
                {' · '}
                {event.actorName || event.actorId}
                {' · '}
                {formatDate(event.createdAt)}
                {event.observation ? ` · ${event.observation}` : ''}
              </div>
            ))}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
