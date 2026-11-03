'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Check,
  Eye,
  Loader2,
  Save,
  Send,
} from 'lucide-react';
import toast from 'react-hot-toast';
import ProtectedRoute from '@/guards/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { authoringService } from '@/lib/services/authoring.service';
import type { AuthoringDocument } from '@/lib/types/authoring';
import { AuthoringDocumentForm } from '@/components/authoring/AuthoringDocumentForm';
import { AuthoringStatusBadge } from '@/components/authoring/AuthoringStatusBadge';

function EditDocumentContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const documentId = Number(params.id);
  const latestForm = useRef<Record<string, any> | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [reviewerId, setReviewerId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const query = useQuery({
    queryKey: ['authoring-document', documentId],
    queryFn: () => authoringService.getDocument(documentId),
    enabled: Number.isSafeInteger(documentId) && documentId > 0,
  });
  const document = query.data;
  const editable =
    document?.authoring.status === 'DRAFT' ||
    document?.authoring.status === 'CHANGES_REQUESTED';

  const usersQuery = useQuery({
    queryKey: ['authoring-users'],
    queryFn: () => authoringService.listUsers(),
    enabled: showSubmit,
  });

  useEffect(() => {
    if (!document) return;
    if (
      document.authoring.status !== 'DRAFT' &&
      document.authoring.status !== 'CHANGES_REQUESTED'
    ) {
      router.replace(`/dashboard/elaboracion/${document.id}`);
    }
  }, [document, router]);

  useEffect(() => {
    if (!dirty || !document || !editable) return;
    const timer = window.setTimeout(async () => {
      if (!latestForm.current) return;
      setAutoSaving(true);
      try {
        const saved = await authoringService.saveDraft(document.id, {
          formData: latestForm.current,
          createVersion: false,
        });
        queryClient.setQueryData(['authoring-document', document.id], saved);
        setDirty(false);
      } catch {
        toast.error('No se pudo guardar automáticamente');
      } finally {
        setAutoSaving(false);
      }
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [dirty, document, editable, queryClient]);

  const handleFormChange = (
    formData: Record<string, any>,
    meta?: { user?: boolean },
  ) => {
    latestForm.current = formData;
    if (meta?.user) setDirty(true);
  };

  const save = async (createVersion: boolean) => {
    if (!document || !latestForm.current) return null;
    setSaving(true);
    try {
      const saved = await authoringService.saveDraft(document.id, {
        formData: latestForm.current,
        createVersion,
      });
      queryClient.setQueryData(['authoring-document', document.id], saved);
      setDirty(false);
      toast.success(createVersion ? 'Borrador guardado' : 'Cambios guardados');
      return saved;
    } catch {
      toast.error('No se pudo guardar el borrador');
      return null;
    } finally {
      setSaving(false);
    }
  };

  const preview = async () => {
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

  const submit = async () => {
    if (!document) return;
    setSubmitting(true);
    try {
      const saved = await save(false);
      if (!saved) return;
      const reviewer = usersQuery.data?.find((user) => user.id === reviewerId);
      await authoringService.submit(document.id, {
        reviewerId: reviewerId || undefined,
        reviewerName: reviewer?.name ?? undefined,
      });
      await queryClient.invalidateQueries({ queryKey: ['authoring-documents'] });
      toast.success('Documento enviado a revisión');
      setShowSubmit(false);
      router.push(`/dashboard/elaboracion/${document.id}`);
    } catch {
      toast.error('No se pudo enviar a revisión. Revisa los campos obligatorios.');
    } finally {
      setSubmitting(false);
    }
  };

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

  const templateVersion = document.templateData?.templateVersion;
  if (!templateVersion) {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">El documento no tiene una versión de plantilla.</p>
      </div>
    );
  }

  const title =
    document.name ||
    document.templateData?.template?.name ||
    `Documento #${document.id}`;

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
            <AuthoringStatusBadge status={document.authoring.status} />
            <span>{document.templateData?.template?.name}</span>
            <span>·</span>
            <span>{document.documentNumber || 'Borrador sin número'}</span>
            {autoSaving && (
              <span className="inline-flex items-center gap-1 text-xs">
                <Loader2 className="h-3 w-3 animate-spin" /> Guardando...
              </span>
            )}
            {!autoSaving && dirty && (
              <span className="text-xs">Cambios sin guardar</span>
            )}
            {!autoSaving && !dirty && (
              <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                <Check className="h-3 w-3" /> Guardado
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => save(true)} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Guardar
          </Button>
          <Button variant="outline" onClick={preview}>
            <Eye className="mr-2 h-4 w-4" /> Previsualizar
          </Button>
          <Button onClick={() => setShowSubmit(true)} disabled={saving}>
            <Send className="mr-2 h-4 w-4" /> Enviar a revisión
          </Button>
        </div>
      </div>

      {document.authoring.reviewObservation && (
        <Card className="border-amber-300 bg-amber-50/60">
          <CardContent className="py-3 text-sm text-amber-900">
            <strong>Observaciones de la devolución:</strong>{' '}
            {document.authoring.reviewObservation}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <AuthoringDocumentForm
            key={document.id}
            templateVersion={templateVersion}
            initialFormData={document.templateData?.formData}
            onChange={handleFormChange}
          />
        </CardContent>
      </Card>

      <Dialog open={showSubmit} onOpenChange={setShowSubmit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar a revisión</DialogTitle>
            <DialogDescription>
              Puedes elegir un revisor o dejar el documento en la bandeja compartida.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="reviewer">
              Revisor (opcional)
            </label>
            <select
              id="reviewer"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={reviewerId}
              onChange={(event) => setReviewerId(event.target.value)}
            >
              <option value="">Cualquier usuario del módulo</option>
              {(usersQuery.data ?? []).map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name || user.email}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmit(false)}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enviar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function EditAuthoringDocumentPage() {
  return (
    <ProtectedRoute>
      <EditDocumentContent />
    </ProtectedRoute>
  );
}
