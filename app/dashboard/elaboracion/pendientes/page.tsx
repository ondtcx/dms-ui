'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Inbox, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/guards/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { documentReviewService } from '@/lib/services/document-reviews.service';
import { authoringService } from '@/lib/services/authoring.service';
import { AuthoringStatusBadge } from '@/components/authoring/AuthoringStatusBadge';

function PendingContent() {
  const router = useRouter();
  const query = useQuery({
    queryKey: ['authoring-pending'],
    queryFn: () => authoringService.pendingDocuments(),
  });
  const reviewQuery = useQuery({
    queryKey: ['document-review-pending'],
    queryFn: () => documentReviewService.pending(),
  });

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6">
      <div>
        <Button
          variant="ghost"
          className="mb-2 h-auto px-0 py-0 text-muted-foreground"
          onClick={() => router.push('/dashboard/elaboracion')}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Biblioteca
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Pendientes de revisión</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Documentos enviados a la bandeja compartida o asignados a un revisor.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Inbox className="h-4 w-4" /> En revisión
          </CardTitle>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
            </div>
          ) : query.data?.length ? (
            <div className="divide-y divide-border">
              {query.data.map((document) => (
                <div
                  key={document.id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/elaboracion/${document.id}`}
                      className="font-medium hover:underline"
                    >
                      {document.name || `Documento #${document.id}`}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <AuthoringStatusBadge status={document.authoring.status} />
                      <span>{document.templateData?.template?.name}</span>
                      <span>·</span>
                      <span>{document.uploadedBy?.name || 'Autor'}</span>
                      {document.authoring.reviewerName && (
                        <>
                          <span>·</span>
                          <span>Revisor: {document.authoring.reviewerName}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/dashboard/elaboracion/${document.id}`}>Revisar</Link>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-sm text-muted-foreground">
              No hay documentos pendientes de revisión.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Inbox className="h-4 w-4" /> Documentos subidos en revisión
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reviewQuery.isLoading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Cargando...
            </div>
          ) : reviewQuery.data?.length ? (
            <div className="divide-y divide-border">
              {reviewQuery.data.map((review) => (
                <div
                  key={review.id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <Link
                      href={`/dashboard/documents/${review.documentId}`}
                      className="font-medium hover:underline"
                    >
                      {review.document?.name || `Documento #${review.documentId}`}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <span>En revisión</span>
                      <span>·</span>
                      <span>{review.document?.uploadedBy?.name || 'Autor'}</span>
                      {review.reviewerName && (
                        <>
                          <span>·</span>
                          <span>Revisor: {review.reviewerName}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/dashboard/documents/${review.documentId}`}>Revisar</Link>
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-4 text-sm text-muted-foreground">
              No hay documentos subidos pendientes.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function PendingAuthoringPage() {
  return (
    <ProtectedRoute>
      <PendingContent />
    </ProtectedRoute>
  );
}
