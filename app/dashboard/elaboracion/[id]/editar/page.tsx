'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
import type { AuthoringDocument, PageFrame } from '@/lib/types/authoring';
import { AuthoringDocumentForm } from '@/components/authoring/AuthoringDocumentForm';
import { AuthoringStatusBadge } from '@/components/authoring/AuthoringStatusBadge';
import { PageFrameEditor } from '@/components/authoring/PageFrameEditor';
import { buildPrebody, fieldsOf, getByPath } from '@/lib/authoring/fields';

function formatDateEs(value: string): string {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? new Date(`${value}T12:00:00`)
    : new Date(value);
  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function EditDocumentContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const documentId = Number(params.id);
  const latestForm = useRef<Record<string, any> | null>(null);
  const latestPageFrame = useRef<PageFrame | null>(null);
  const initializedFrame = useRef(false);
  const [pageFrame, setPageFrame] = useState<PageFrame | null>(null);
  const [formSnapshot, setFormSnapshot] = useState<Record<string, any>>({});
  const [richTextHtml, setRichTextHtml] = useState<Record<string, string>>({});
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
    if (!document) return;
    if (!latestForm.current) {
      latestForm.current = document.templateData?.formData ?? {};
      setFormSnapshot(latestForm.current);
    }
    if (!initializedFrame.current) {
      initializedFrame.current = true;
      const frame = document.authoring.pageFrame;
      if (frame?.mode === 'fullPage') {
        setPageFrame(frame);
        latestPageFrame.current = frame;
      }
    }
  }, [document]);

  useEffect(() => {
    if (!dirty || !document || !editable) return;
    const timer = window.setTimeout(async () => {
      if (!latestForm.current) return;
      setAutoSaving(true);
      try {
        const saved = await authoringService.saveDraft(document.id, {
          formData: latestForm.current,
          pageFrame: latestPageFrame.current ?? undefined,
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
    setFormSnapshot(formData);
    if (meta?.user) setDirty(true);
  };

  const handleFrameChange = (frame: PageFrame) => {
    setPageFrame(frame);
    latestPageFrame.current = frame;
    setDirty(true);
  };

  const handleRichTextHtmlChange = (key: string, html: string) => {
    setRichTextHtml((current) => ({ ...current, [key]: html }));
  };

  const previewVariables = useMemo(() => {
    const value = (path: string) => {
      const current = getByPath(formSnapshot, path);
      return current === undefined || current === null ? '' : String(current);
    };
    const date = value('acta.fecha');
    const formattedDate = date ? formatDateEs(date) : '';
    return {
      '{{acta.lugar}}': value('acta.lugar'),
      '{{acta.hora}}': value('acta.hora'),
      '{{documento.fecha}}': new Date().toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }),
      '{{documento.numero}}': document?.documentNumber ?? 'BORRADOR',
      '{{formatDate acta.fecha}}': formattedDate,
      '{{recibidoPor.nombre}}': value('recibidoPor.nombre'),
      '{{recibidoPor.cargo}}': value('recibidoPor.cargo'),
      '{{entregadoPor.nombre}}': value('entregadoPor.nombre'),
      '{{entregadoPor.cargo}}': value('entregadoPor.cargo'),
      '{{vistoBueno.nombre}}': value('vistoBueno.nombre'),
      '{{vistoBueno.cargo}}': value('vistoBueno.cargo'),
      '{{firmante.nombre}}': value('firmante.nombre'),
      '{{firmante.cargo}}': value('firmante.cargo'),
      '{{#each acta.firmantes}}<div>{{this}}</div>{{/each}}': (
        Array.isArray(formSnapshot?.acta?.firmantes)
          ? formSnapshot.acta.firmantes
          : []
      )
        .map((name: unknown) => `<div>${String(name)}</div>`)
        .join(''),
      '{{{contenido}}}': richTextHtml.contenido ?? '',
      '{{{prebody}}}': buildPrebody(
        fieldsOf(document?.templateData?.templateVersion?.fields),
        formSnapshot,
      ),
    };
  }, [document, formSnapshot, richTextHtml]);

  const save = async (createVersion: boolean) => {
    if (!document || !latestForm.current) return null;
    setSaving(true);
    try {
      const saved = await authoringService.saveDraft(document.id, {
        formData: latestForm.current,
        pageFrame: latestPageFrame.current ?? undefined,
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
      const submitted = await authoringService.submit(document.id, {
        reviewerId: reviewerId || undefined,
        reviewerName: reviewer?.name ?? undefined,
      });
      queryClient.setQueryData(['authoring-document', document.id], submitted);
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
            onRichTextHtmlChange={handleRichTextHtmlChange}
          />
        </CardContent>
      </Card>

      {pageFrame?.mode === 'fullPage' && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            El cuerpo se edita en el editor de arriba. Aquí ajustas el título,
            el subtítulo y las etiquetas de firmas; los campos actualizan las
            variables del documento.
          </p>
          <PageFrameEditor
            key={`frame-${document.id}`}
            value={pageFrame}
            onChange={handleFrameChange}
            variables={previewVariables}
            contentOnly
          />
        </div>
      )}

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
