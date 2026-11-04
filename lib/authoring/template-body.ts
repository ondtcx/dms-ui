import type { AuthoringField } from '@/lib/types/authoring';

export interface TemplateVariable {
  key: string;
  label: string;
  token: string;
  kind: 'system' | 'field';
}

const SYSTEM_VARIABLES: TemplateVariable[] = [
  {
    key: 'documento.tipo',
    label: 'Tipo de documento',
    token: '{{documento.tipo}}',
    kind: 'system',
  },
  {
    key: 'documento.numero',
    label: 'Número de documento',
    token: '{{documento.numero}}',
    kind: 'system',
  },
  {
    key: 'documento.fecha',
    label: 'Fecha del documento',
    token: '{{documento.fecha}}',
    kind: 'system',
  },
];

const DOC_OPEN = '<div class="doc">';
const DOC_CLOSE = '</div>';
const INSTITUTION_HEADER = '  {{> institutionHeader}}';
const DOC_TITLE = '  <div class="doc-title">{{documento.tipo}}</div>';
const DOC_META =
  '  <div class="meta"><span>{{documento.fecha}}</span><span>{{documento.numero}}</span></div>';
const CONTENT_OPEN = '  <div class="content">';
const CONTENT_CLOSE = '  </div>';

export const DEFAULT_TEMPLATE_STYLES = `.doc { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #111827; }
.doc-title { text-align: center; font-size: 15pt; font-weight: 700; margin: 6px 0 18px; }
.meta { display: flex; justify-content: space-between; font-size: 10pt; color: #374151; margin: 4px 0 16px; }
.content { text-align: justify; line-height: 1.55; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 1px solid #9ca3af; padding: 4px 6px; }`;

export function tokenForField(field: AuthoringField): string {
  return field.type === 'richtext' ? `{{{${field.key}}}}` : `{{${field.key}}}`;
}

export function templateVariables(fields: AuthoringField[]): TemplateVariable[] {
  return [
    ...SYSTEM_VARIABLES,
    ...fields
      .filter((field) => field.key.trim() && field.label.trim())
      .map((field) => ({
        key: field.key,
        label: field.label,
        token: tokenForField(field),
        kind: 'field' as const,
      })),
  ];
}

export function defaultBodyInner(fields: AuthoringField[]): string {
  const richTextField = fields.find((field) => field.type === 'richtext');
  return richTextField ? tokenForField(richTextField) : '<p></p>';
}

export function normalizeContentHtml(html: string): string {
  const trimmed = (html ?? '').trim();
  if (!trimmed || trimmed === '<p></p>') return '';
  return trimmed.replace(
    /<p>\s*\{\{\{\s*([A-Za-z0-9_.]+)\s*\}\}\}\s*<\/p>/g,
    (_match, key: string) => `{{{${key}}}}`,
  );
}

function indentLines(html: string, spaces = 4): string {
  const pad = ' '.repeat(spaces);
  return html
    .split('\n')
    .map((line) => (line.trim() ? `${pad}${line}` : ''))
    .join('\n');
}

export function buildCanonicalBody(innerHtml: string): string {
  const content = normalizeContentHtml(innerHtml);
  const lines = [
    DOC_OPEN,
    INSTITUTION_HEADER,
    DOC_TITLE,
    DOC_META,
    CONTENT_OPEN,
  ];
  if (content) {
    lines.push(indentLines(content));
  }
  lines.push(CONTENT_CLOSE, DOC_CLOSE);
  return lines.join('\n');
}

function dedent(html: string): string {
  const lines = html.split('\n');
  const indents = lines
    .filter((line) => line.trim())
    .map((line) => line.match(/^ */)?.[0].length ?? 0);
  const common = indents.length ? Math.min(...indents) : 0;
  return lines
    .map((line) => line.slice(Math.min(common, line.length)))
    .join('\n')
    .trim();
}

function findContentBlock(html: string): { start: number; end: number } | null {
  const open = /<div\b[^>]*class="[^"]*\bcontent\b[^"]*"[^>]*>/i.exec(html);
  if (!open) return null;

  const start = open.index + open[0].length;
  let depth = 1;
  const tag = /<(\/?)div\b[^>]*>/gi;
  tag.lastIndex = start;

  let match: RegExpExecArray | null;
  while ((match = tag.exec(html))) {
    depth += match[1] === '/' ? -1 : 1;
    if (depth === 0) {
      return { start, end: match.index };
    }
  }
  return null;
}

export function extractContentInner(bodyHtml: string): string | null {
  const normalized = (bodyHtml ?? '').replace(/\r\n/g, '\n');
  const block = findContentBlock(normalized);
  return block ? dedent(normalized.slice(block.start, block.end)) : null;
}

const CANONICAL_HEAD =
  /^<div class="doc">\s*\{\{>\s*institutionHeader\s*\}\}\s*<div class="doc-title">\{\{documento\.tipo\}\}<\/div>\s*<div class="meta">\s*<span>\{\{documento\.fecha\}\}<\/span>\s*<span>\{\{documento\.numero\}\}<\/span>\s*<\/div>/;
const CANONICAL_TAIL =
  /^\s*<\/div>\s*(?:<div class="signature">[\s\S]*<\/div>\s*)?<\/div>\s*$/;

export function extractCanonicalBodyInner(bodyHtml: string): string | null {
  const normalized = (bodyHtml ?? '').replace(/\r\n/g, '\n').trim();
  const head = CANONICAL_HEAD.exec(normalized);
  if (!head) return null;
  if (!/^\s*<div class="content">/.test(normalized.slice(head[0].length))) {
    return null;
  }

  const block = findContentBlock(normalized);
  if (!block) return null;
  if (!CANONICAL_TAIL.test(normalized.slice(block.end))) return null;

  return dedent(normalized.slice(block.start, block.end));
}

export function convertToCanonicalBody(
  bodyHtml: string,
  fields: AuthoringField[],
): string {
  const existingInner = extractContentInner(bodyHtml);
  return buildCanonicalBody(existingInner ?? defaultBodyInner(fields));
}

export function validateTemplateFields(fields: AuthoringField[]): string | null {
  const keys = new Set<string>();
  for (const field of fields) {
    const key = field.key.trim();
    const label = field.label.trim();
    if (!key || !label) {
      return 'Todos los campos deben tener clave y etiqueta';
    }
    if (keys.has(key)) {
      return `La clave ${key} está repetida`;
    }
    keys.add(key);
  }
  return null;
}
