'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import ProtectedRoute from '@/guards/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { PageFrameEditor } from '@/components/authoring/PageFrameEditor';
import { PageFrameSimpleEditor } from '@/components/authoring/PageFrameSimpleEditor';
import { SignatureEditor } from '@/components/authoring/SignatureEditor';
import { usePermissions } from '@/hooks/use-permissions';
import { authoringService } from '@/lib/services/authoring.service';
import type { PageFrame, SignatureBlock } from '@/lib/types/authoring';
import {
  ACTA_PAGE_FRAME,
  ACTA_SIGNATURES,
  pageFrameToFooterHtml,
  pageFrameToHeaderHtml,
} from '@/lib/authoring/page-frame';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function TemplateDesignContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canDesign = hasPermission('authoring.templates.design');
  const canPublish = hasPermission('authoring.templates.publish');
  const templateId = Number(params.id);
  const [frame, setFrame] = useState<PageFrame>(() => clone(ACTA_PAGE_FRAME));
  const [signatures, setSignatures] = useState<SignatureBlock>(() =>
    clone(ACTA_SIGNATURES),
  );
  const [editorMode, setEditorMode] = useState<'simple' | 'advanced'>('simple');
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);

  const query = useQuery({
    queryKey: ['authoring-template', templateId],
    queryFn: () => authoringService.getTemplate(templateId),
    enabled: Number.isSafeInteger(templateId) && templateId > 0,
  });
  const template = query.data;
  const latest = template?.versions?.[0];

  useEffect(() => {
    if (!latest || initialized) return;
    setInitialized(true);
    if (latest.pageFrame) setFrame(clone(latest.pageFrame));
    if (latest.signatures) setSignatures(clone(latest.signatures));
  }, [latest, initialized]);

  const save = async (publish = false) => {
    if (!template || !latest) return;
    setSaving(true);
    try {
      const isFullPage = frame.mode === 'fullPage';
      const created = await authoringService.createVersion(template.id, {
        bodyHtml: latest.bodyHtml,
        styles: isFullPage ? '' : latest.styles ?? undefined,
        fields: latest.fields,
        numberPrefix: latest.numberPrefix,
        headerHtml: isFullPage ? undefined : pageFrameToHeaderHtml(frame),
        footerHtml: isFullPage ? undefined : pageFrameToFooterHtml(frame),
        marginTop: isFullPage ? '0' : frame.margins.top,
        marginBottom: isFullPage ? '0' : frame.margins.bottom,
        marginLeft: isFullPage ? '0' : frame.margins.left,
        marginRight: isFullPage ? '0' : frame.margins.right,
        pageSize: frame.pageSize,
        orientation: frame.orientation,
        pageFrame: frame,
        signatures: isFullPage ? undefined : signatures,
      });
      if (publish) {
        await authoringService.publishVersion(template.id, created.id);
      }
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ['authoring-template', template.id],
        }),
        queryClient.invalidateQueries({
          queryKey: ['authoring-templates'],
        }),
        queryClient.invalidateQueries({
          queryKey: ['authoring-template-activity', template.id],
        }),
      ]);
      toast.success(
        publish
          ? 'Diseño guardado y publicado.'
          : 'Versión de diseño creada. Publícala para aplicarla.',
      );
      router.push(`/dashboard/elaboracion/plantillas/${template.id}`);
    } catch {
      toast.error('No se pudo guardar el diseño');
    } finally {
      setSaving(false);
    }
  };

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Cargando plantilla...
      </div>
    );
  }

  if (!template || !latest) {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">Plantilla no encontrada o sin versiones.</p>
        <Button className="mt-4" variant="outline" onClick={() => router.push('/dashboard/elaboracion')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button
            variant="ghost"
            className="mb-2 h-auto px-0 py-0 text-muted-foreground"
            onClick={() => router.push(`/dashboard/elaboracion/plantillas/${template.id}`)}
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Plantilla
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Diseño de página</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {template.name} · versión base {latest.version}. Se creará una versión
            borrador; publícala desde la pantalla de la plantilla.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canDesign && (
            <Button variant="outline" onClick={() => save(false)} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Guardar diseño
            </Button>
          )}
          {canDesign && canPublish && (
            <Button onClick={() => save(true)} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Guardar y publicar
            </Button>
          )}
        </div>
      </div>

      {!canDesign && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          No tienes permiso para diseñar plantillas. Esta vista es de solo
          lectura.
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-md border border-border bg-muted/40 p-1">
          <Button
            type="button"
            size="sm"
            variant={editorMode === 'simple' ? 'secondary' : 'ghost'}
            onClick={() => setEditorMode('simple')}
            disabled={frame.mode !== 'fullPage'}
            title={
              frame.mode !== 'fullPage'
                ? 'El modo simple está disponible para diseños de página completa'
                : undefined
            }
          >
            Simple
          </Button>
          <Button
            type="button"
            size="sm"
            variant={editorMode === 'advanced' ? 'secondary' : 'ghost'}
            onClick={() => setEditorMode('advanced')}
          >
            Avanzado
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Simple: arrastrar y ubicar. Avanzado: coordenadas y tabla completa.
        </p>
      </div>

      {editorMode === 'simple' && frame.mode === 'fullPage' ? (
        <PageFrameSimpleEditor
          value={frame}
          onChange={setFrame}
          readOnly={!canDesign}
        />
      ) : (
        <PageFrameEditor value={frame} onChange={setFrame} readOnly={!canDesign} />
      )}
      {frame.mode !== 'fullPage' && (
        <SignatureEditor
          value={signatures}
          onChange={setSignatures}
          readOnly={!canDesign}
        />
      )}

      <p className="text-xs text-muted-foreground">
        El cuerpo y los campos no cambian en esta pantalla. Para editar el
        contenido usa “Nueva versión” en la pantalla de la plantilla.
      </p>
    </div>
  );
}

export default function TemplateDesignPage() {
  return (
    <ProtectedRoute>
      <TemplateDesignContent />
    </ProtectedRoute>
  );
}
