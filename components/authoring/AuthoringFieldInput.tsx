'use client';

import type { AuthoringField } from '@/lib/types/authoring';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from './RichTextEditor';
import { listToText, textToList } from '@/lib/authoring/fields';

interface AuthoringFieldInputProps {
  field: AuthoringField;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
}

export function AuthoringFieldInput({
  field,
  value,
  onChange,
  disabled = false,
}: AuthoringFieldInputProps) {
  const label = (
    <Label htmlFor={`authoring-${field.key}`} className="text-sm font-medium">
      {field.label}
      {field.required && <span className="ml-1 text-destructive">*</span>}
    </Label>
  );

  if (field.type === 'richtext') {
    return (
      <div className="space-y-2">
        {label}
        <RichTextEditor value={value} onChange={onChange} disabled={disabled} />
      </div>
    );
  }

  if (field.type === 'textarea' || field.type === 'list') {
    const textValue = field.type === 'list' ? listToText(value) : value ?? '';
    return (
      <div className="space-y-2">
        {label}
        <textarea
          id={`authoring-${field.key}`}
          className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          value={textValue}
          disabled={disabled}
          onChange={(event) =>
            onChange(
              field.type === 'list'
                ? textToList(event.target.value)
                : event.target.value,
            )
          }
          placeholder={
            field.type === 'list' ? 'Un elemento por línea' : undefined
          }
        />
      </div>
    );
  }

  if (field.type === 'checkbox') {
    return (
      <div className="flex items-center gap-2 pt-1">
        <input
          id={`authoring-${field.key}`}
          type="checkbox"
          className="h-4 w-4 rounded border-input"
          checked={Boolean(value)}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
        {label}
      </div>
    );
  }

  if (field.type === 'select') {
    return (
      <div className="space-y-2">
        {label}
        <select
          id={`authoring-${field.key}`}
          className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
          value={value ?? ''}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">Seleccionar...</option>
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {label}
      <Input
        id={`authoring-${field.key}`}
        type={field.type === 'number' ? 'number' : field.type}
        value={value ?? ''}
        disabled={disabled}
        onChange={(event) =>
          onChange(
            field.type === 'number'
              ? event.target.value === ''
                ? ''
                : Number(event.target.value)
              : event.target.value,
          )
        }
      />
    </div>
  );
}
