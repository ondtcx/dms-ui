'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type {
  AuthoringFieldsSchema,
  AuthoringTemplateVersion,
} from '@/lib/types/authoring';
import {
  buildInitialForm,
  fieldsOf,
  getByPath,
  setByPath,
} from '@/lib/authoring/fields';
import { AuthoringFieldInput } from './AuthoringFieldInput';

interface AuthoringDocumentFormProps {
  templateVersion: AuthoringTemplateVersion;
  initialFormData?: Record<string, any> | null;
  disabled?: boolean;
  excludedFields?: string[];
  onChange?: (
    formData: Record<string, any>,
    meta?: { user?: boolean },
  ) => void;
  onRichTextHtmlChange?: (key: string, html: string) => void;
}

export function AuthoringDocumentForm({
  templateVersion,
  initialFormData,
  disabled = false,
  excludedFields = [],
  onChange,
  onRichTextHtmlChange,
}: AuthoringDocumentFormProps) {
  const fields = useMemo(
    () => fieldsOf(templateVersion.fields as AuthoringFieldsSchema),
    [templateVersion],
  );
  const visibleFields = useMemo(
    () => fields.filter((field) => !excludedFields.includes(field.key)),
    [fields, excludedFields],
  );
  const [formData, setFormData] = useState<Record<string, any>>(() =>
    buildInitialForm(fields, initialFormData),
  );
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onHtmlChangeRef = useRef(onRichTextHtmlChange);
  onHtmlChangeRef.current = onRichTextHtmlChange;
  const initializedVersion = useRef<number | null>(null);

  useEffect(() => {
    if (initializedVersion.current === templateVersion.id) return;
    initializedVersion.current = templateVersion.id;
    const initial = buildInitialForm(fields, initialFormData);
    setFormData(initial);
    onChangeRef.current?.(initial, { user: false });
  }, [fields, initialFormData, templateVersion.id]);

  const updateField = (key: string, value: any) => {
    const next = setByPath(formData, key, value);
    setFormData(next);
    onChangeRef.current?.(next, { user: true });
  };

  if (visibleFields.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Esta plantilla no tiene campos configurables.
      </p>
    );
  }

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {visibleFields.map((field) => (
        <div
          key={field.key}
          className={field.type === 'richtext' ? 'md:col-span-2' : undefined}
        >
          <AuthoringFieldInput
            field={field}
            value={getByPath(formData, field.key)}
            onChange={(value) => updateField(field.key, value)}
            onHtmlChange={(html) => onHtmlChangeRef.current?.(field.key, html)}
            disabled={disabled}
          />
        </div>
      ))}
    </div>
  );
}
