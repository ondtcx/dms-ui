'use client';

import { useMemo, useState } from 'react';
import { Wand2 } from 'lucide-react';
import type { AuthoringField } from '@/lib/types/authoring';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { RichTextEditor } from './RichTextEditor';
import {
  buildCanonicalBody,
  convertToCanonicalBody,
  extractCanonicalBodyInner,
  templateVariables,
} from '@/lib/authoring/template-body';

interface TemplateContentEditorProps {
  value: string;
  fields: AuthoringField[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function TemplateContentEditor({
  value,
  fields,
  onChange,
  disabled = false,
}: TemplateContentEditorProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const inner = useMemo(() => extractCanonicalBodyInner(value), [value]);
  const variables = useMemo(() => templateVariables(fields), [fields]);

  if (inner === null) {
    return (
      <Card>
        <CardContent className="space-y-4 p-6">
          <div>
            <h3 className="text-base font-medium">Diseño personalizado</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Esta plantilla usa HTML propio, así que no se puede editar con el
              editor visual sin normalizar el diseño. Puedes seguir editándola en
              la pestaña Avanzado.
            </p>
          </div>
          {!disabled && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(true)}
            >
              <Wand2 className="mr-2 h-4 w-4" /> Convertir al editor visual
            </Button>
          )}
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title="Convertir al editor visual"
            description="Se conservará el contenido del bloque de contenido y se normalizará el resto del diseño. El encabezado institucional, el título, la fecha y las firmas se generarán automáticamente. Esta acción reemplaza el cuerpo actual de la versión."
            confirmLabel="Convertir"
            variant="destructive"
            onConfirm={() => {
              setConfirmOpen(false);
              onChange(convertToCanonicalBody(value, fields));
            }}
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <RichTextEditor
        format="html"
        value={inner}
        allowImages
        onChange={(html) => onChange(buildCanonicalBody(String(html)))}
        placeholder="Escribe el cuerpo del documento..."
        disabled={disabled}
        insertButtons={variables.map((variable) => ({
          label:
            variable.kind === 'field' &&
            variable.token.startsWith('{{{')
              ? `${variable.label} (bloque)`
              : variable.label,
          title: `Insertar ${variable.token}`,
          onClick: (editor) => {
            if (variable.token.startsWith('{{{')) {
              editor
                .chain()
                .focus()
                .insertContent({
                  type: 'paragraph',
                  content: [{ type: 'text', text: variable.token }],
                })
                .run();
              return;
            }
            editor.chain().focus().insertContent(variable.token).run();
          },
        }))}
      />
      <p className="text-xs text-muted-foreground">
        El encabezado institucional, el título, la fecha y el número se agregan
        automáticamente. Los campos de texto enriquecido se insertan como bloque
        de contenido. Usa el botón Imagen para subir una imagen al cuerpo.
      </p>
    </div>
  );
}
