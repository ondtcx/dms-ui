'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import ProtectedRoute from '@/guards/ProtectedRoute';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TemplateFieldsEditor } from '@/components/authoring/TemplateFieldsEditor';
import { usePermissions } from '@/hooks/use-permissions';
import { authoringService } from '@/lib/services/authoring.service';
import { documentTypesService } from '@/lib/services/document-types.service';
import type { AuthoringField } from '@/lib/types/authoring';
import {
  DEFAULT_TEMPLATE_STYLES,
  buildCanonicalBody,
  defaultBodyInner,
  validateTemplateFields,
} from '@/lib/authoring/template-body';

const DEFAULT_FIELDS: AuthoringField[] = [
  {
    key: 'destinatario.nombre',
    label: 'Nombre del destinatario',
    type: 'text',
    required: true,
  },
  { key: 'documento.asunto', label: 'Asunto', type: 'text', required: true },
  { key: 'contenido', label: 'Contenido', type: 'richtext', required: true },
  {
    key: 'firmante.nombre',
    label: 'Nombre del firmante',
    type: 'text',
    required: true,
  },
  {
    key: 'firmante.cargo',
    label: 'Cargo del firmante',
    type: 'text',
    required: true,
  },
];

function NewTemplateContent() {
  const router = useRouter();
  const { hasPermission } = usePermissions();
  const canManageTemplates = hasPermission('authoring.templates.manage');
  const canDesignTemplates = hasPermission('authoring.templates.design');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [numberPrefix, setNumberPrefix] = useState('DOC');
  const [documentTypeId, setDocumentTypeId] = useState<number | undefined>();
  const [pageSize, setPageSize] = useState('A4');
  const [orientation, setOrientation] = useState('portrait');
  const [fields, setFields] = useState<AuthoringField[]>(DEFAULT_FIELDS);
  const [saving, setSaving] = useState(false);
  const documentTypesQuery = useQuery({
    queryKey: ['document-types', 'active'],
    queryFn: () => documentTypesService.getActive(),
  });

  const save = async () => {
    if (!name.trim() || !numberPrefix.trim()) {
      toast.error('El nombre y el prefijo son obligatorios');
      return;
    }
    if (!documentTypeId) {
      toast.error('Selecciona el tipo de documento de la plantilla');
      return;
    }
    const fieldsError = validateTemplateFields(fields);
    if (fieldsError) {
      toast.error(fieldsError);
      return;
    }

    setSaving(true);
    try {
      const template = await authoringService.createTemplate({
        name: name.trim(),
        description: description.trim() || undefined,
        bodyHtml: buildCanonicalBody(defaultBodyInner(fields)),
        styles: DEFAULT_TEMPLATE_STYLES,
        fields: { fields },
        pageSize,
        orientation,
        numberPrefix: numberPrefix.trim().toUpperCase(),
        documentTypeId,
      });
      toast.success('Plantilla creada. Ahora diseña el contenido y publícala.');
      router.push(
        canDesignTemplates
          ? `/dashboard/elaboracion/plantillas/${template.id}/diseno`
          : `/dashboard/elaboracion/plantillas/${template.id}`,
      );
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
          Paso 1 de 2: datos básicos y campos. Después podrás diseñar el
          contenido en el editor visual. Para una plantilla de página completa
          (acta), duplica una acta existente desde la biblioteca.
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
            <Label htmlFor="template-document-type">Tipo de documento *</Label>
            <select
              id="template-document-type"
              className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
              value={documentTypeId?.toString() ?? ''}
              onChange={(event) =>
                setDocumentTypeId(
                  event.target.value ? Number(event.target.value) : undefined,
                )
              }
            >
              <option value="">Selecciona un tipo</option>
              {(documentTypesQuery.data ?? []).map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
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
        <CardHeader>
          <CardTitle className="text-base">Campos</CardTitle>
        </CardHeader>
        <CardContent>
          <TemplateFieldsEditor fields={fields} onChange={setFields} />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.push('/dashboard/elaboracion')}>
          Cancelar
        </Button>
        <Button onClick={save} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Crear y abrir editor
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
