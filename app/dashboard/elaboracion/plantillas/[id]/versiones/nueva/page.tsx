'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import ProtectedRoute from '@/guards/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { authoringService } from '@/lib/services/authoring.service';
import type { AuthoringField, AuthoringFieldType } from '@/lib/types/authoring';
import {
  SAMPLE_BODY_PREFIX,
  SAMPLE_FOOTER_HTML,
  SAMPLE_HEADER_HTML,
  SAMPLE_MARGINS,
} from '@/lib/authoring/page-frame';

const FIELD_TYPES: AuthoringFieldType[] = [
  'text',
  'textarea',
  'number',
  'date',
  'time',
  'email',
  'select',
  'checkbox',
  'list',
  'richtext',
];

function NewVersionContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const templateId = Number(params.id);
  const initialized = useRef(false);
  const [numberPrefix, setNumberPrefix] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [styles, setStyles] = useState('');
  const [headerHtml, setHeaderHtml] = useState('');
  const [footerHtml, setFooterHtml] = useState('');
  const [marginTop, setMarginTop] = useState('2cm');
  const [marginBottom, setMarginBottom] = useState('2.2cm');
  const [marginLeft, setMarginLeft] = useState('2cm');
  const [marginRight, setMarginRight] = useState('2cm');
  const [fields, setFields] = useState<AuthoringField[]>([]);
  const [saving, setSaving] = useState(false);

  const query = useQuery({
    queryKey: ['authoring-template', templateId],
    queryFn: () => authoringService.getTemplate(templateId),
    enabled: Number.isSafeInteger(templateId) && templateId > 0,
  });
  const template = query.data;
  const latest = template?.versions?.[0];

  useEffect(() => {
    if (!template || !latest || initialized.current) return;
    initialized.current = true;
    setNumberPrefix(latest.numberPrefix);
    setBodyHtml(latest.bodyHtml);
    setStyles(latest.styles ?? '');
    setHeaderHtml(latest.headerHtml ?? '');
    setFooterHtml(latest.footerHtml ?? '');
    setMarginTop(latest.marginTop ?? '2cm');
    setMarginBottom(latest.marginBottom ?? '2.2cm');
    setMarginLeft(latest.marginLeft ?? '2cm');
    setMarginRight(latest.marginRight ?? '2cm');
    setFields(latest.fields?.fields ?? []);
  }, [template, latest]);

  const updateField = (index: number, patch: Partial<AuthoringField>) => {
    setFields((current) =>
      current.map((field, position) =>
        position === index ? { ...field, ...patch } : field,
      ),
    );
  };

  const applySampleFrame = () => {
    setHeaderHtml(SAMPLE_HEADER_HTML);
    setFooterHtml(SAMPLE_FOOTER_HTML);
    setMarginTop(SAMPLE_MARGINS.marginTop);
    setMarginBottom(SAMPLE_MARGINS.marginBottom);
    setMarginLeft(SAMPLE_MARGINS.marginLeft);
    setMarginRight(SAMPLE_MARGINS.marginRight);
    setBodyHtml((current) => {
      const withoutHeader = current
        .replace(/\{\{>\s*institutionHeader\s*\}\}/g, '')
        .trim();
      if (withoutHeader.includes('data-authoring-left-bar="true"')) {
        return withoutHeader;
      }
      return `${SAMPLE_BODY_PREFIX}\n${withoutHeader}`;
    });
  };

  const save = async () => {
    if (!template) return;
    if (!numberPrefix.trim()) {
      toast.error('El prefijo es obligatorio');
      return;
    }
    if (fields.some((field) => !field.key.trim() || !field.label.trim())) {
      toast.error('Todos los campos deben tener clave y etiqueta');
      return;
    }

    setSaving(true);
    try {
      await authoringService.createVersion(template.id, {
        bodyHtml,
        styles,
        headerHtml: headerHtml.trim() || undefined,
        footerHtml: footerHtml.trim() || undefined,
        marginTop,
        marginBottom,
        marginLeft,
        marginRight,
        numberPrefix: numberPrefix.trim().toUpperCase(),
        fields: { fields },
      });
      toast.success('Versión borrador creada');
      router.push(`/dashboard/elaboracion/plantillas/${template.id}`);
    } catch {
      toast.error('No se pudo crear la versión');
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
    <div className="mx-auto flex max-w-5xl flex-col gap-5 p-4 sm:p-6">
      <Button
        variant="ghost"
        className="w-fit"
        onClick={() => router.push(`/dashboard/elaboracion/plantillas/${template.id}`)}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Plantilla
      </Button>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Nueva versión de {template.name}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          La versión se crea como borrador. Los documentos existentes seguirán usando la versión con la que fueron creados.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuración</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs space-y-2">
            <Label htmlFor="version-prefix">Prefijo de numeración</Label>
            <Input
              id="version-prefix"
              value={numberPrefix}
              maxLength={12}
              onChange={(event) => setNumberPrefix(event.target.value.toUpperCase())}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="version-body">Cuerpo HTML controlado</Label>
            <textarea
              id="version-body"
              className="min-h-64 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
              value={bodyHtml}
              onChange={(event) => setBodyHtml(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="version-styles">CSS</Label>
            <textarea
              id="version-styles"
              className="min-h-40 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
              value={styles}
              onChange={(event) => setStyles(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Encabezado y pie de página</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={applySampleFrame}>
            Usar diseño de ejemplo
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Se repiten en cada página. Si defines un encabezado, el partial
            <code className="mx-1">{'{{> institutionHeader}}'}</code>
            del cuerpo se omite automáticamente. Puedes usar variables como
            <code className="mx-1">{'{{institucion.nombre}}'}</code>,
            <code className="mx-1">{'{{institucion.logo}}'}</code>,
            <code className="mx-1">{'{{institucion.direccion}}'}</code> y las clases
            <code className="mx-1">pageNumber</code>/<code className="mx-1">totalPages</code>.
          </p>
          <div className="space-y-2">
            <Label htmlFor="version-header">Encabezado HTML</Label>
            <textarea
              id="version-header"
              className="min-h-40 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
              value={headerHtml}
              onChange={(event) => setHeaderHtml(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="version-footer">Pie de página HTML</Label>
            <textarea
              id="version-footer"
              className="min-h-40 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
              value={footerHtml}
              onChange={(event) => setFooterHtml(event.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="version-margin-top">Margen superior</Label>
              <Input id="version-margin-top" value={marginTop} onChange={(event) => setMarginTop(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="version-margin-bottom">Margen inferior</Label>
              <Input id="version-margin-bottom" value={marginBottom} onChange={(event) => setMarginBottom(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="version-margin-left">Margen izquierdo</Label>
              <Input id="version-margin-left" value={marginLeft} onChange={(event) => setMarginLeft(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="version-margin-right">Margen derecho</Label>
              <Input id="version-margin-right" value={marginRight} onChange={(event) => setMarginRight(event.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Campos</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              setFields((current) => [
                ...current,
                { key: '', label: '', type: 'text', required: false },
              ])
            }
          >
            <Plus className="mr-1.5 h-4 w-4" /> Agregar campo
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {fields.map((field, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_150px_auto_auto]">
              <Input
                value={field.key}
                onChange={(event) => updateField(index, { key: event.target.value })}
                placeholder="destinatario.nombre"
                aria-label="Clave del campo"
              />
              <Input
                value={field.label}
                onChange={(event) => updateField(index, { label: event.target.value })}
                placeholder="Nombre del destinatario"
                aria-label="Etiqueta del campo"
              />
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                value={field.type}
                onChange={(event) =>
                  updateField(index, { type: event.target.value as AuthoringFieldType })
                }
                aria-label="Tipo del campo"
              >
                {FIELD_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  checked={Boolean(field.required)}
                  onChange={(event) =>
                    updateField(index, { required: event.target.checked })
                  }
                />
                Obligatorio
              </label>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() =>
                  setFields((current) => current.filter((_, position) => position !== index))
                }
                aria-label="Quitar campo"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/elaboracion/plantillas/${template.id}`)}
        >
          Cancelar
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Crear versión borrador
        </Button>
      </div>
    </div>
  );
}

export default function NewVersionPage() {
  return (
    <ProtectedRoute>
      <NewVersionContent />
    </ProtectedRoute>
  );
}
