import type { AuthoringField, AuthoringFieldsSchema } from '@/lib/types/authoring';

export function fieldsOf(schema: AuthoringFieldsSchema | null | undefined): AuthoringField[] {
  if (!schema || !Array.isArray(schema.fields)) return [];
  return schema.fields;
}

export function getByPath(source: any, path: string): any {
  return path.split('.').reduce((current, segment) => {
    if (current === undefined || current === null) return undefined;
    return current[segment];
  }, source);
}

export function setByPath(target: any, path: string, value: any): any {
  const next = { ...(target ?? {}) };
  const segments = path.split('.');
  let current = next;
  for (const segment of segments.slice(0, -1)) {
    current[segment] = { ...(current[segment] ?? {}) };
    current = current[segment];
  }
  current[segments[segments.length - 1]] = value;
  return next;
}

export function emptyValue(field: AuthoringField): any {
  switch (field.type) {
    case 'checkbox':
      return false;
    case 'list':
      return [];
    case 'number':
      return '';
    case 'richtext':
      return { type: 'doc', content: [] };
    default:
      return '';
  }
}

export function listToText(value: unknown): string {
  if (Array.isArray(value)) return value.join('\n');
  return typeof value === 'string' ? value : '';
}

export function textToList(value: string): string[] {
  return value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildInitialForm(
  fields: AuthoringField[],
  formData: Record<string, any> | null | undefined,
): Record<string, any> {
  let result = { ...(formData ?? {}) };
  for (const field of fields) {
    if (getByPath(result, field.key) === undefined) {
      result = setByPath(
        result,
        field.key,
        field.defaultValue !== undefined ? field.defaultValue : emptyValue(field),
      );
    }
  }
  return result;
}


const PREBODY_EXCLUDED = new Set([
  'contenido',
  'firmante.nombre',
  'firmante.cargo',
  'acta.firmantes',
  'acta.fecha',
  'acta.hora',
  'acta.lugar',
]);

function escapePrebody(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildPrebody(
  fields: AuthoringField[],
  formData: Record<string, any> | null | undefined,
): string {
  const rows = fields
    .filter((field) => !PREBODY_EXCLUDED.has(field.key))
    .map((field) => {
      const value = getByPath(formData, field.key);
      if (value === undefined || value === null || value === '') return '';
      if (Array.isArray(value)) {
        const items = value
          .map((item) => String(item).trim())
          .filter(Boolean)
          .map((item) => `<li>${escapePrebody(item)}</li>`)
          .join('');
        return items
          ? `<div class="prebody-row"><strong>${escapePrebody(field.label)}:</strong><ul>${items}</ul></div>`
          : '';
      }
      return `<div class="prebody-row"><strong>${escapePrebody(field.label)}:</strong> ${escapePrebody(String(value)).replace(/\n/g, '<br/>')}</div>`;
    })
    .filter(Boolean)
    .join('');
  return rows ? `<div class="prebody">${rows}</div>` : '';
}
