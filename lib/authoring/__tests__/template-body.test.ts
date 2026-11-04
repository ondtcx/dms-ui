import type { AuthoringField } from '@/lib/types/authoring';
import {
  buildCanonicalBody,
  convertToCanonicalBody,
  defaultBodyInner,
  extractCanonicalBodyInner,
  extractContentInner,
  normalizeContentHtml,
  templateVariables,
  tokenForField,
  validateTemplateFields,
} from '@/lib/authoring/template-body';

const fields: AuthoringField[] = [
  { key: 'documento.asunto', label: 'Asunto', type: 'text', required: true },
  { key: 'contenido', label: 'Contenido', type: 'richtext', required: true },
  { key: 'firmante.nombre', label: 'Firmante', type: 'text', required: true },
  { key: 'firmante.cargo', label: 'Cargo', type: 'text', required: true },
];

describe('template-body', () => {
  it('builds the canonical body with header, title, meta, content and signatures', () => {
    const body = buildCanonicalBody('<p>Hola {{documento.asunto}}</p>');

    expect(body).toContain('{{> institutionHeader}}');
    expect(body).toContain('<div class="doc-title">{{documento.tipo}}</div>');
    expect(body).toContain('{{documento.fecha}}');
    expect(body).toContain('<div class="content">');
    expect(body).toContain('<p>Hola {{documento.asunto}}</p>');
    expect(body).not.toContain('<div class="signature">');
  });

  it('converts a rich-text block paragraph into a raw block token', () => {
    expect(normalizeContentHtml('<p>{{{contenido}}}</p>')).toBe('{{{contenido}}}');
    expect(normalizeContentHtml('<p> {{{ contenido }}} </p>')).toBe('{{{contenido}}}');
    expect(normalizeContentHtml('<p></p>')).toBe('');
  });

  it('round-trips the canonical body inner content', () => {
    const inner = '<p>Uno</p>\n<p>{{documento.asunto}}</p>\n{{{contenido}}}';
    const body = buildCanonicalBody(inner);

    expect(extractCanonicalBodyInner(body)).toBe(inner);
  });

  it('extracts nested divs without cutting at the first closing tag', () => {
    const inner = '<div class="callout"><p>Nota</p></div>\n<p>Fin</p>';
    const body = buildCanonicalBody(inner);

    expect(extractCanonicalBodyInner(body)).toBe(inner);
  });

  it('rejects a body with a custom title even if it has a content block', () => {
    const customTitle =
      '<div class="doc">{{> institutionHeader}}<div class="doc-title">PRUEBA</div><div class="content">{{{contenido}}}</div></div>';

    expect(extractCanonicalBodyInner(customTitle)).toBeNull();
  });

  it('rejects a legacy body with extra content outside the content block', () => {
    const legacy =
      '<div class="doc">{{> institutionHeader}}<div class="doc-title">Acta</div><div class="content">{{{contenido}}}</div><p>Texto extra</p></div>';

    expect(extractCanonicalBodyInner(legacy)).toBeNull();
    expect(extractContentInner(legacy)).toBe('{{{contenido}}}');
  });

  it('does not treat real legacy template bodies as canonical', () => {
    const legacyBodies = [
      '<div class="doc">{{> institutionHeader}}<div class="doc-title">PRUEBA</div><div class="content">{{{contenido}}}</div></div>',
      '<div class="doc">{{> institutionHeader}}<div class="doc-title">PRUEBA DE INVARIANTES V2</div><div class="content"><p>{{documento.asunto}}</p>{{{contenido}}}</div><div class="signature">{{firmante.nombre}}</div></div>',
      '<div class="doc" style="font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#111827;padding-left:14px;">\n<h1 style="text-align:center;font-size:15pt;">ACTA DE PRUEBA DE ENCABEZADO</h1>\n<p><strong>Asunto:</strong> {{documento.asunto}}</p>\n{{{contenido}}}\n<div class="signature" style="margin-top:40px;text-align:center;">{{firmante.nombre}}<br/>{{firmante.cargo}}</div>\n</div>',
    ];

    for (const legacy of legacyBodies) {
      expect(extractCanonicalBodyInner(legacy)).toBeNull();
    }
  });

  it('converts a legacy body using its existing content block', () => {
    const legacy =
      '<div class="doc"><div class="content"><p>Viejo</p></div><p>Fuera</p></div>';
    const body = convertToCanonicalBody(legacy, fields);

    expect(body).toContain('<p>Viejo</p>');
    expect(body).not.toContain('<p>Fuera</p>');
    expect(body).toContain('{{> institutionHeader}}');
  });

  it('uses the first rich-text field as the default content block', () => {
    expect(
      defaultBodyInner([
        { key: 'asunto', label: 'Asunto', type: 'text' },
        { key: 'cuerpo', label: 'Cuerpo', type: 'richtext' },
      ]),
    ).toBe('{{{cuerpo}}}');
  });

  it('builds the variable palette with system and field tokens', () => {
    const variables = templateVariables(fields);
    const keys = variables.map((variable) => variable.key);

    expect(keys).toEqual(
      expect.arrayContaining([
        'documento.tipo',
        'documento.numero',
        'documento.fecha',
        'documento.asunto',
        'contenido',
      ]),
    );
    expect(
      variables.find((variable) => variable.key === 'contenido')?.token,
    ).toBe('{{{contenido}}}');
    expect(tokenForField(fields[0])).toBe('{{documento.asunto}}');
  });

  it('validates empty, duplicate and valid fields', () => {
    expect(
      validateTemplateFields([{ key: '', label: '', type: 'text' }]),
    ).toBe('Todos los campos deben tener clave y etiqueta');
    expect(
      validateTemplateFields([
        { key: 'a', label: 'A', type: 'text' },
        { key: 'a', label: 'Otra A', type: 'text' },
      ]),
    ).toBe('La clave a está repetida');
    expect(validateTemplateFields(fields)).toBeNull();
  });
});
