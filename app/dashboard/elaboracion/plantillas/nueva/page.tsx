'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Plus, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import ProtectedRoute from '@/guards/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { usePermissions } from '@/hooks/use-permissions';
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

const DEFAULT_BODY = `{{#if _metadata.draft}}<div class="draft-watermark">BORRADOR</div>{{/if}}
<div class="doc">
  {{> institutionHeader}}
  <div class="doc-title">{{documento.tipo}}</div>
  <div class="meta"><span>{{documento.fecha}}</span><span>{{documento.numero}}</span></div>
  <div class="content">{{{contenido}}}</div>
  <div class="signature">
    <div>{{firmante.nombre}}</div>
    <div>{{firmante.cargo}}</div>
  </div>
</div>`;

const DEFAULT_STYLES = `.doc { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #111827; }
.doc-title { text-align: center; font-size: 15pt; font-weight: 700; margin: 6px 0 18px; }
.meta { display: flex; justify-content: space-between; font-size: 10pt; color: #374151; margin: 4px 0 16px; }
.content { text-align: justify; line-height: 1.55; }
.signature { margin-top: 54px; text-align: center; line-height: 1.4; }
.draft-watermark { position: fixed; top: 42%; left: 8%; transform: rotate(-28deg); font-size: 86px; font-weight: 700; color: rgba(15, 23, 42, 0.08); z-index: -1; letter-spacing: 8px; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #9ca3af; padding: 4px 6px; }`;

function NewTemplateContent() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const canManageTemplates = hasPermission('authoring.templates.manage');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [numberPrefix, setNumberPrefix] = useState('DOC');
  const [pageSize, setPageSize] = useState('A4');
  const [orientation, setOrientation] = useState('portrait');
  const [bodyHtml, setBodyHtml] = useState(DEFAULT_BODY);
  const [styles, setStyles] = useState(DEFAULT_STYLES);
  const [headerHtml, setHeaderHtml] = useState('');
  const [footerHtml, setFooterHtml] = useState('');
  const [marginTop, setMarginTop] = useState('2cm');
  const [marginBottom, setMarginBottom] = useState('2.2cm');
  const [marginLeft, setMarginLeft] = useState('2cm');
  const [marginRight, setMarginRight] = useState('2cm');
  const [fields, setFields] = useState<AuthoringField[]>([
    { key: 'destinatario.nombre', label: 'Nombre del destinatario', type: 'text', required: true },
    { key: 'documento.asunto', label: 'Asunto', type: 'text', required: true },
    { key: 'contenido', label: 'Contenido', type: 'richtext', required: true },
    { key: 'firmante.nombre', label: 'Nombre del firmante', type: 'text', required: true },
    { key: 'firmante.cargo', label: 'Cargo del firmante', type: 'text', required: true },
  ]);
  const [saving, setSaving] = useState(false);

  const updateField = (index: number, patch: Partial<AuthoringField>) => {
    setFields((current) =>
      current.map((field, position) =>
        position === index ? { ...field, ...patch } : field,
      ),
    );
  };

  const removeField = (index: number) => {
    setFields((current) => current.filter((_, position) => position !== index));
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
    if (!name.trim() || !numberPrefix.trim()) {
      toast.error('El nombre y el prefijo son obligatorios');
      return;
    }
    if (fields.some((field) => !field.key.trim() || !field.label.trim())) {
      toast.error('Todos los campos deben tener clave y etiqueta');
      return;
    }

    setSaving(true);
    try {
      const template = await authoringService.createTemplate({
        name: name.trim(),
        description: description.trim() || undefined,
        bodyHtml,
        styles,
        headerHtml: headerHtml.trim() || undefined,
        footerHtml: footerHtml.trim() || undefined,
        marginTop,
        marginBottom,
        marginLeft,
        marginRight,
        pageSize,
        orientation,
        numberPrefix: numberPrefix.trim().toUpperCase(),
        fields: { fields },
      });
      const draft = template.versions?.[0];
      if (draft) {
        await authoringService.publishVersion(template.id, draft.id);
      }
      toast.success('Plantilla creada y publicada');
      router.push('/dashboard/elaboracion');
    } catch {
      toast.error('No se pudo crear la plantilla. Revisa los datos.');
    } finally {
      setSaving(false);
    }
  };

  if (!canManageTemplates) {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">
          No tienes permiso para crear plantillas de elaboración.
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
    <div className="mx-auto flex max-w-5xl flex-col gap-5 p-4 sm:p-6">
      <Button
        variant="ghost"
        className="w-fit"
        onClick={() => router.push('/dashboard/elaboracion')}
      >
        <ArrowLeft className="mr-2 h-4 w-4" /> Biblioteca
      </Button>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nueva plantilla</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Define los campos y el cuerpo controlado de la plantilla. No se permite HTML arbitrario en el contenido del documento.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Datos generales</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="template-name">Nombre</Label>
            <Input
              id="template-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Oficio de designación"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="template-prefix">Prefijo de numeración</Label>
            <Input
              id="template-prefix"
              value={numberPrefix}
              onChange={(event) => setNumberPrefix(event.target.value.toUpperCase())}
              maxLength={12}
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="template-description">Descripción</Label>
            <Input
              id="template-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Para qué se usa esta plantilla"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="template-page-size">Tamaño de página</Label>
            <select
              id="template-page-size"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={pageSize}
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
              onChange={(event) => setOrientation(event.target.value)}
            >
              <option value="portrait">Vertical</option>
              <option value="landscape">Horizontal</option>
            </select>
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
                onClick={() => removeField(index)}
                aria-label="Quitar campo"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cuerpo HTML controlado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Variables disponibles: <code>{'{{documento.fecha}}'}</code>,{' '}
            <code>{'{{documento.numero}}'}</code>, <code>{'{{firmante.nombre}}'}</code>.
            Para contenido enriquecido usa <code>{'{{{contenido}}}'}</code>. El encabezado
            institucional se inserta con <code>{'{{> institutionHeader}}'}</code>.
          </p>
          <textarea
            className="min-h-64 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
            value={bodyHtml}
            onChange={(event) => setBodyHtml(event.target.value)}
            aria-label="Cuerpo HTML de la plantilla"
          />
          <div className="space-y-2">
            <Label htmlFor="template-styles">CSS</Label>
            <textarea
              id="template-styles"
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
            <Label htmlFor="template-header">Encabezado HTML</Label>
            <textarea
              id="template-header"
              className="min-h-40 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
              value={headerHtml}
              onChange={(event) => setHeaderHtml(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="template-footer">Pie de página HTML</Label>
            <textarea
              id="template-footer"
              className="min-h-40 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs"
              value={footerHtml}
              onChange={(event) => setFooterHtml(event.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="margin-top">Margen superior</Label>
              <Input id="margin-top" value={marginTop} onChange={(event) => setMarginTop(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="margin-bottom">Margen inferior</Label>
              <Input id="margin-bottom" value={marginBottom} onChange={(event) => setMarginBottom(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="margin-left">Margen izquierdo</Label>
              <Input id="margin-left" value={marginLeft} onChange={(event) => setMarginLeft(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="margin-right">Margen derecho</Label>
              <Input id="margin-right" value={marginRight} onChange={(event) => setMarginRight(event.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push('/dashboard/elaboracion')}>
          Cancelar
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Crear y publicar
        </Button>
      </div>
    </div>
  );
}

export default function NewTemplatePage() {
  return (
    <ProtectedRoute>
      <NewTemplateContent />
    </ProtectedRoute>
  );
}
