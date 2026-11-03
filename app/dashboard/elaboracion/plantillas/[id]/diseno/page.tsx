'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import ProtectedRoute from '@/guards/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { PageFrameEditor } from '@/components/authoring/PageFrameEditor';
import { SignatureEditor } from '@/components/authoring/SignatureEditor';
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
  const templateId = Number(params.id);
  const [frame, setFrame] = useState<PageFrame>(() => clone(ACTA_PAGE_FRAME));
  const [signatures, setSignatures] = useState<SignatureBlock>(() =>
    clone(ACTA_SIGNATURES),
  );
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

  const save = async () => {
    if (!template || !latest) return;
    setSaving(true);
    try {
      await authoringService.createVersion(template.id, {
        bodyHtml: latest.bodyHtml,
        styles: latest.styles ?? undefined,
        fields: latest.fields,
        numberPrefix: latest.numberPrefix,
        headerHtml: pageFrameToHeaderHtml(frame),
        footerHtml: pageFrameToFooterHtml(frame),
        marginTop: frame.margins.top,
        marginBottom: frame.margins.bottom,
        marginLeft: frame.margins.left,
        marginRight: frame.margins.right,
        pageSize: frame.pageSize,
        orientation: frame.orientation,
        pageFrame: frame,
        signatures,
      });
      toast.success('Versión de diseño creada. Publícala para aplicarla.');
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

  if (latest.pageFrame?.mode === 'fullPage') {
    return (
      <div className="mx-auto flex max-w-3xl flex-col gap-5 p-4 sm:p-6">
        <Button
          variant="ghost"
          className="w-fit"
          onClick={() => router.push(`/dashboard/elaboracion/plantillas/${template.id}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Plantilla
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Diseño de página completa</h1>
        <p className="text-sm text-muted-foreground">
          {template.name} usa el HTML fiel del documento original como página
          completa. Para mantener la fidelidad, su encabezado, cuerpo y firmas se
          editan en el HTML de una nueva versión.
        </p>
        <Button
          className="w-fit"
          onClick={() =>
            router.push(`/dashboard/elaboracion/plantillas/${template.id}/versiones/nueva`)
          }
        >
          Editar HTML del cuerpo
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 p-4 sm:p-6">
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
        <Button onClick={save} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Guardar diseño
        </Button>
      </div>

      <PageFrameEditor value={frame} onChange={setFrame} />
      <SignatureEditor value={signatures} onChange={setSignatures} />

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
