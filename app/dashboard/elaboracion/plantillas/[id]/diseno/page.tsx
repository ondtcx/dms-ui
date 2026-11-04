'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Eye, Loader2, Save, Send, Wand2 } from 'lucide-react';
import toast from 'react-hot-toast';
import ProtectedRoute from '@/guards/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PageFrameEditor } from '@/components/authoring/PageFrameEditor';
import { PageFrameSimpleEditor } from '@/components/authoring/PageFrameSimpleEditor';
import { SignatureEditor } from '@/components/authoring/SignatureEditor';
import { TemplateContentEditor } from '@/components/authoring/TemplateContentEditor';
import { TemplateFieldsEditor } from '@/components/authoring/TemplateFieldsEditor';
import { usePermissions } from '@/hooks/use-permissions';
import { authoringService } from '@/lib/services/authoring.service';
import type {
  AuthoringField,
  PageFrame,
  SignatureBlock,
} from '@/lib/types/authoring';
import {
  ACTA_PAGE_FRAME,
  SAMPLE_FOOTER_HTML,
  SAMPLE_HEADER_HTML,
  SAMPLE_MARGINS,
  pageFrameToFooterHtml,
  pageFrameToHeaderHtml,
} from '@/lib/authoring/page-frame';
import { validateTemplateFields } from '@/lib/authoring/template-body';

type TabKey = 'content' | 'fields' | 'frame' | 'signatures' | 'advanced';

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function TemplateEditorContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { hasPermission } = usePermissions();
  const canDesign = hasPermission('authoring.templates.design');
  const canPublish = hasPermission('authoring.templates.publish');
  const templateId = Number(params.id);

  const [bodyHtml, setBodyHtml] = useState('');
  const [styles, setStyles] = useState('');
  const [headerHtml, setHeaderHtml] = useState('');
  const [footerHtml, setFooterHtml] = useState('');
  const [marginTop, setMarginTop] = useState('2cm');
  const [marginBottom, setMarginBottom] = useState('2.2cm');
  const [marginLeft, setMarginLeft] = useState('2cm');
  const [marginRight, setMarginRight] = useState('2cm');
  const [fields, setFields] = useState<AuthoringField[]>([]);
  const [numberPrefix, setNumberPrefix] = useState('');
  const [pageSize, setPageSize] = useState('A4');
  const [orientation, setOrientation] = useState('portrait');
  const [frame, setFrame] = useState<PageFrame>(() => clone(ACTA_PAGE_FRAME));
  const [signatures, setSignatures] = useState<SignatureBlock>({ items: [] });
  const [usesPageFrame, setUsesPageFrame] = useState(false);
  const [editorMode, setEditorMode] = useState<'simple' | 'advanced'>('simple');
  const [tab, setTab] = useState<TabKey>('content');
  const [saving, setSaving] = useState<'draft' | 'publish' | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [visualFrameOpen, setVisualFrameOpen] = useState(false);
  const initializedTemplate = useRef<number | null>(null);

  const query = useQuery({
    queryKey: ['authoring-template', templateId],
    queryFn: () => authoringService.getTemplate(templateId),
    enabled: Number.isSafeInteger(templateId) && templateId > 0,
  });
  const template = query.data;
  const latest = template?.versions?.[0];
  const isFullPage = usesPageFrame && frame.mode === 'fullPage';

  useEffect(() => {
    if (!latest || initializedTemplate.current === templateId) return;
    initializedTemplate.current = templateId;
    setBodyHtml(latest.bodyHtml ?? '');
    setStyles(latest.styles ?? '');
    setHeaderHtml(latest.headerHtml ?? '');
    setFooterHtml(latest.footerHtml ?? '');
    setMarginTop(latest.marginTop ?? '2cm');
    setMarginBottom(latest.marginBottom ?? '2.2cm');
    setMarginLeft(latest.marginLeft ?? '2cm');
    setMarginRight(latest.marginRight ?? '2cm');
    setFields(latest.fields?.fields ?? []);
    setNumberPrefix(latest.numberPrefix ?? '');
    setPageSize(latest.pageSize ?? 'A4');
    setOrientation(latest.orientation ?? 'portrait');
    setSignatures(latest.signatures ?? { items: [] });
    if (latest.pageFrame) {
      setFrame(clone(latest.pageFrame));
      setUsesPageFrame(true);
      setEditorMode(latest.pageFrame.mode === 'fullPage' ? 'simple' : 'advanced');
    } else {
      setFrame(clone(ACTA_PAGE_FRAME));
      setUsesPageFrame(false);
    }
  }, [latest, templateId]);

  const tabs = useMemo(
    () => [
      { key: 'content' as const, label: 'Contenido' },
      { key: 'fields' as const, label: 'Campos' },
      ...(isFullPage
        ? []
        : [
            { key: 'frame' as const, label: 'Marco' },
            { key: 'signatures' as const, label: 'Firmas' },
          ]),
      { key: 'advanced' as const, label: 'Avanzado' },
    ],
    [isFullPage],
  );
  const activeTab = tabs.some((item) => item.key === tab) ? tab : 'content';

  const refresh = async () => {
    if (!template) return;
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['authoring-template', template.id],
      }),
      queryClient.invalidateQueries({ queryKey: ['authoring-templates'] }),
      queryClient.invalidateQueries({
        queryKey: ['authoring-template-activity', template.id],
      }),
    ]);
  };

  const applySampleFrame = () => {
    setHeaderHtml(SAMPLE_HEADER_HTML);
    setFooterHtml(SAMPLE_FOOTER_HTML);
    setMarginTop(SAMPLE_MARGINS.marginTop);
    setMarginBottom(SAMPLE_MARGINS.marginBottom);
    setMarginLeft(SAMPLE_MARGINS.marginLeft);
    setMarginRight(SAMPLE_MARGINS.marginRight);
  };

  const save = async (publish = false) => {
    if (!template || !latest) return;
    const fieldsError = validateTemplateFields(fields);
    if (fieldsError) {
      setTab('fields');
      toast.error(fieldsError);
      return;
    }
    if (!numberPrefix.trim()) {
      setTab('fields');
      toast.error('El prefijo es obligatorio');
      return;
    }

    setSaving(publish ? 'publish' : 'draft');
    try {
      const created = await authoringService.createVersion(template.id, {
        bodyHtml,
        styles,
        fields: { fields },
        signatures: isFullPage ? undefined : signatures,
        numberPrefix: numberPrefix.trim().toUpperCase(),
        ...(usesPageFrame
          ? {
              headerHtml: isFullPage ? undefined : pageFrameToHeaderHtml(frame),
              footerHtml: isFullPage ? undefined : pageFrameToFooterHtml(frame),
              marginTop: isFullPage ? '0' : frame.margins.top,
              marginBottom: isFullPage ? '0' : frame.margins.bottom,
              marginLeft: isFullPage ? '0' : frame.margins.left,
              marginRight: isFullPage ? '0' : frame.margins.right,
              pageSize: frame.pageSize,
              orientation: frame.orientation,
              pageFrame: frame,
            }
          : {
              headerHtml,
              footerHtml,
              marginTop,
              marginBottom,
              marginLeft,
              marginRight,
              pageSize,
              orientation,
            }),
      });
      if (publish) {
        await authoringService.publishVersion(template.id, created.id);
      }
      await refresh();
      toast.success(
        publish
          ? 'Contenido guardado y publicado.'
          : 'Versión borrador creada. Publícala para aplicarla.',
      );
    } catch {
      toast.error(
        publish
          ? 'No se pudo guardar y publicar la plantilla'
          : 'No se pudo guardar la versión',
      );
    } finally {
      setSaving(null);
    }
  };

  const preview = async () => {
    if (!template) return;
    setPreviewing(true);
    try {
      const blob = await authoringService.previewTemplate(template.id);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      toast.error('No se pudo generar la vista previa');
    } finally {
      setPreviewing(false);
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
        <p className="text-sm text-destructive">
          Plantilla no encontrada o sin versiones.
        </p>
        <Button
          className="mt-4"
          variant="outline"
          onClick={() => router.push('/dashboard/elaboracion')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Volver
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Button
            variant="ghost"
            className="mb-2 h-auto px-0 py-0 text-muted-foreground"
            onClick={() =>
              router.push(`/dashboard/elaboracion/plantillas/${template.id}`)
            }
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Plantilla
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            Editor de plantilla
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {template.name} · versión base {latest.version}. Los cambios se
            guardan como una versión nueva.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={preview} disabled={previewing}>
            {previewing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Eye className="mr-2 h-4 w-4" />
            )}
            Vista previa
          </Button>
          {canDesign && (
            <Button
              variant="outline"
              onClick={() => save(false)}
              disabled={saving !== null}
            >
              {saving === 'draft' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Guardar borrador
            </Button>
          )}
          {canDesign && canPublish && (
            <Button onClick={() => save(true)} disabled={saving !== null}>
              {saving === 'publish' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
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

      <div className="flex flex-wrap gap-1 rounded-md border border-border bg-muted/40 p-1">
        {tabs.map((item) => (
          <Button
            key={item.key}
            type="button"
            size="sm"
            variant={activeTab === item.key ? 'secondary' : 'ghost'}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {activeTab === 'content' && isFullPage && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1 rounded-md border border-border bg-muted/40 p-1">
              <Button
                type="button"
                size="sm"
                variant={editorMode === 'simple' ? 'secondary' : 'ghost'}
                onClick={() => setEditorMode('simple')}
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
          {editorMode === 'simple' ? (
            <PageFrameSimpleEditor
              value={frame}
              onChange={setFrame}
              readOnly={!canDesign}
            />
          ) : (
            <PageFrameEditor
              value={frame}
              onChange={setFrame}
              readOnly={!canDesign}
            />
          )}
          <p className="text-xs text-muted-foreground">
            El cuerpo y los campos se editan en la pestaña Campos. Esta pantalla
            define el marco, las líneas y las firmas de la página.
          </p>
        </div>
      )}

      {activeTab === 'content' && !isFullPage && (
        <TemplateContentEditor
          value={bodyHtml}
          fields={fields}
          onChange={setBodyHtml}
          disabled={!canDesign}
        />
      )}

      {activeTab === 'fields' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Campos del documento</CardTitle>
            </CardHeader>
            <CardContent>
              <TemplateFieldsEditor
                fields={fields}
                onChange={setFields}
                disabled={!canDesign}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Numeración y página</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="template-prefix">Prefijo de numeración</Label>
                <Input
                  id="template-prefix"
                  value={numberPrefix}
                  maxLength={12}
                  disabled={!canDesign}
                  onChange={(event) =>
                    setNumberPrefix(event.target.value.toUpperCase())
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-page-size">Tamaño de página</Label>
                <select
                  id="template-page-size"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={pageSize}
                  disabled={!canDesign || isFullPage}
                  onChange={(event) => setPageSize(event.target.value)}
                >
                  <option value="A4">A4</option>
                  <option value="Letter">Carta</option>
                  <option value="Legal">Legal</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-orientation">Orientación</Label>
                <select
                  id="template-orientation"
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={orientation}
                  disabled={!canDesign || isFullPage}
                  onChange={(event) => setOrientation(event.target.value)}
                >
                  <option value="portrait">Vertical</option>
                  <option value="landscape">Horizontal</option>
                </select>
              </div>
              {isFullPage && (
                <p className="text-xs text-muted-foreground sm:col-span-3">
                  El tamaño y la orientación se ajustan en el editor de página.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'frame' && !isFullPage && (
        <div className="space-y-4">
          {usesPageFrame ? (
            <>
              <PageFrameEditor
                value={frame}
                onChange={setFrame}
                readOnly={!canDesign}
              />
              <p className="text-xs text-muted-foreground">
                El encabezado y el pie de página se generan desde este marco al
                guardar la versión.
              </p>
            </>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Diseño visual</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Crea el encabezado y el pie con textos e imágenes, sin editar
                    HTML. Se usará el diseño institucional como base y podrás
                    ajustar posiciones, tamaños, recortes y fondos.
                  </p>
                  {canDesign && (
                    <Button
                      type="button"
                      onClick={() => setVisualFrameOpen(true)}
                    >
                      <Wand2 className="mr-2 h-4 w-4" /> Diseñar visualmente
                    </Button>
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">
                    Encabezado y pie de página
                  </CardTitle>
                  {canDesign && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={applySampleFrame}
                    >
                      Usar diseño de ejemplo
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Se repiten en cada página. Si defines un encabezado, el
                    partial <code className="mx-1">{'{{> institutionHeader}}'}</code>
                    del cuerpo se omite automáticamente. Puedes usar variables
                    como <code className="mx-1">{'{{institucion.nombre}}'}</code>,
                    <code className="mx-1">{'{{institucion.logo}}'}</code> y las
                    clases <code className="mx-1">pageNumber</code>/
                    <code className="mx-1">totalPages</code>.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="template-header">Encabezado HTML</Label>
                    <textarea
                      id="template-header"
                      className="min-h-40 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
                      value={headerHtml}
                      disabled={!canDesign}
                      onChange={(event) => setHeaderHtml(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-footer">Pie de página HTML</Label>
                    <textarea
                      id="template-footer"
                      className="min-h-40 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
                      value={footerHtml}
                      disabled={!canDesign}
                      onChange={(event) => setFooterHtml(event.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Márgenes</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-4">
                  <div className="space-y-2">
                    <Label htmlFor="margin-top">Margen superior</Label>
                    <Input
                      id="margin-top"
                      value={marginTop}
                      disabled={!canDesign}
                      onChange={(event) => setMarginTop(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="margin-bottom">Margen inferior</Label>
                    <Input
                      id="margin-bottom"
                      value={marginBottom}
                      disabled={!canDesign}
                      onChange={(event) => setMarginBottom(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="margin-left">Margen izquierdo</Label>
                    <Input
                      id="margin-left"
                      value={marginLeft}
                      disabled={!canDesign}
                      onChange={(event) => setMarginLeft(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="margin-right">Margen derecho</Label>
                    <Input
                      id="margin-right"
                      value={marginRight}
                      disabled={!canDesign}
                      onChange={(event) => setMarginRight(event.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {activeTab === 'signatures' && !isFullPage && (
        <SignatureEditor
          value={signatures}
          onChange={setSignatures}
          readOnly={!canDesign}
        />
      )}

      {activeTab === 'advanced' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cuerpo HTML</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Editor avanzado para diseños personalizados. Si cambias la
                estructura, el editor visual dejará de estar disponible hasta
                volver a la estructura canónica.
              </p>
              <textarea
                className="min-h-64 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
                value={bodyHtml}
                disabled={!canDesign}
                onChange={(event) => setBodyHtml(event.target.value)}
                aria-label="Cuerpo HTML de la plantilla"
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">CSS</CardTitle>
            </CardHeader>
            <CardContent>
              <textarea
                className="min-h-40 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
                value={styles}
                disabled={!canDesign}
                onChange={(event) => setStyles(event.target.value)}
                aria-label="CSS de la plantilla"
              />
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">
            La vista previa usa la última versión guardada. Guarda antes de
            previsualizar los cambios.
          </p>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() =>
            router.push(`/dashboard/elaboracion/plantillas/${template.id}`)
          }
        >
          Volver
        </Button>
      </div>

      <ConfirmDialog
        open={visualFrameOpen}
        onOpenChange={setVisualFrameOpen}
        title="Diseñar encabezado y pie visual"
        description="Se usará el diseño institucional como base. El encabezado y el pie HTML actuales se reemplazarán al guardar la versión. Podrás mover textos, subir imágenes y cambiar el fondo."
        confirmLabel="Diseñar"
        onConfirm={() => {
          setVisualFrameOpen(false);
          setFrame({
            ...clone(ACTA_PAGE_FRAME),
            mode: 'frame',
            pageSize: pageSize as PageFrame['pageSize'],
            orientation: orientation as PageFrame['orientation'],
          });
          setUsesPageFrame(true);
        }}
      />
    </div>
  );
}

export default function TemplateEditorPage() {
  return (
    <ProtectedRoute>
      <TemplateEditorContent />
    </ProtectedRoute>
  );
}
