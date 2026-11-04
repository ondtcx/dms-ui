'use client';

import { Plus, Trash2 } from 'lucide-react';
import type { AuthoringField, AuthoringFieldType } from '@/lib/types/authoring';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export const FIELD_TYPES: AuthoringFieldType[] = [
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

interface TemplateFieldsEditorProps {
  fields: AuthoringField[];
  onChange: (fields: AuthoringField[]) => void;
  disabled?: boolean;
}

export function TemplateFieldsEditor({
  fields,
  onChange,
  disabled = false,
}: TemplateFieldsEditorProps) {
  const updateField = (index: number, patch: Partial<AuthoringField>) => {
    onChange(
      fields.map((field, position) =>
        position === index ? { ...field, ...patch } : field,
      ),
    );
  };

  const removeField = (index: number) => {
    onChange(fields.filter((_, position) => position !== index));
  };

  return (
    <div className="space-y-3">
      {fields.map((field, index) => (
        <div
          key={index}
          className="grid gap-2 sm:grid-cols-[1fr_1fr_150px_auto_auto]"
        >
          <Input
            value={field.key}
            onChange={(event) => updateField(index, { key: event.target.value })}
            placeholder="destinatario.nombre"
            aria-label="Clave del campo"
            disabled={disabled}
          />
          <Input
            value={field.label}
            onChange={(event) => updateField(index, { label: event.target.value })}
            placeholder="Nombre del destinatario"
            aria-label="Etiqueta del campo"
            disabled={disabled}
          />
          <select
            className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            value={field.type}
            onChange={(event) =>
              updateField(index, {
                type: event.target.value as AuthoringFieldType,
              })
            }
            aria-label="Tipo del campo"
            disabled={disabled}
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
              disabled={disabled}
            />
            Obligatorio
          </label>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => removeField(index)}
            aria-label="Quitar campo"
            disabled={disabled}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      {!disabled && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() =>
            onChange([
              ...fields,
              { key: '', label: '', type: 'text', required: false },
            ])
          }
        >
          <Plus className="mr-1.5 h-4 w-4" /> Agregar campo
        </Button>
      )}
    </div>
  );
}
