'use client';

import { useMemo, useState } from 'react';
import { LayoutTemplate, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type {
  PageFrame,
  PageFrameArea,
  PageFrameBox,
} from '@/lib/types/authoring';
import {
  ACTA_PAGE_FRAME,
  fullPageFrameToHtml,
  pageFrameToFooterHtml,
  pageFrameToHeaderHtml,
} from '@/lib/authoring/page-frame';

const PAGE_SIZES: Record<string, { width: number; height: number }> = {
  A4: { width: 595, height: 842 },
  Letter: { width: 612, height: 792 },
  Legal: { width: 612, height: 1008 },
};

const LOGO_PLACEHOLDER =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="100"><rect width="80" height="100" rx="8" fill="#e5e7eb"/><text x="40" y="55" text-anchor="middle" font-family="Arial" font-size="12" fill="#6b7280">LOGO</text></svg>',
  );

const DEFAULT_ACTA_BODY_HTML = `<p>A través del presente, se entrega los bienes que reposan en la sala de vicerrectorado, a la Sra. MSc. Soraya Villarreal en calidad de vicerrectora, los mismos que serán utilizados como material de apoyo en el desarrollo de sus funciones como vicerrectora de la Unidad Educativa “Vicente Fierro”.</p><p>El material entregado está sujeto a control y auditoría, quedando bajo su estricta responsabilidad el cuidado de los mismos.</p><p>Como constancia de la presente acta, actúa la MSc. Soraya Villarreal identificado con el número de cédula 0400881454 y el. MSc. Byron Narváez, identificada con el número de cédula 0400881207 como representante del Honorable Consejo Ejecutivo de la Unidad Educativa “Vicente Fierro”, comisión de control interno.</p><p>Se adjunta analítica de existencias.</p><p>Se firman en original y copia con el mismo tenor.</p>`;

const PREVIEW_VARIABLES: Record<string, string> = {
  '{{{contenido}}}': DEFAULT_ACTA_BODY_HTML,
  '{{institucion.nombre}}': 'UNIDAD EDUCATIVA VICENTE FIERRO',
  '{{institucion.direccion}}':
    'Ciudadela Sociedad Obrera Calle Juan XXIII y Caciques Tulcanaza',
  '{{institucion.telefono}}': '2980-466',
  '{{institucion.email}}': 'uevicentefierro@gmail.com',
  '{{acta.lugar}}': 'Tulcán',
  '{{formatDate acta.fecha}}': '14 de febrero de 2025',
  '{{recibidoPor.nombre}}': 'MSc. Soraya Villarreal',
  '{{recibidoPor.cargo}}': 'DOCENTE',
  '{{entregadoPor.nombre}}': 'MSc. Byron Narváez',
  '{{entregadoPor.cargo}}': 'DELEGADO CONSEJO EJECUTIVO',
  '{{vistoBueno.nombre}}': 'MSc. Hugo Tulcanaza',
  '{{vistoBueno.cargo}}': 'RECTOR U.E. “VICENTE FIERRO”',
};

function previewFrame(
  frame: PageFrame,
  variables?: Record<string, string>,
): PageFrame {
  const clone = JSON.parse(JSON.stringify(frame)) as PageFrame;
  for (const area of [clone.header, clone.footer, clone.body].filter(Boolean) as PageFrameArea[]) {
    for (const box of area.boxes) {
      if (box.type === 'image' && box.content.includes('institucion.logo')) {
        box.content = LOGO_PLACEHOLDER;
      }
      if (box.type === 'pageNumber') {
        box.content = 'Página 1 de 1';
      } else {
        for (const [token, value] of Object.entries({
          ...PREVIEW_VARIABLES,
          ...(variables ?? {}),
        })) {
          box.content = box.content.split(token).join(value);
        }
      }
    }
  }
  return clone;
}

function PagePreview({
  frame,
  variables,
  onOverflowChange,
}: {
  frame: PageFrame;
  variables?: Record<string, string>;
  onOverflowChange?: (overflow: boolean) => void;
}) {
  const html = useMemo(() => {
    if (frame.mode === 'fullPage') {
      return fullPageFrameToHtml(previewFrame(frame, variables));
    }
    const base = PAGE_SIZES[frame.pageSize] ?? PAGE_SIZES.Letter;
    const dimensions =
      frame.orientation === 'landscape'
        ? { width: base.height, height: base.width }
        : base;
    const preview = previewFrame(frame, variables);
    const header = pageFrameToHeaderHtml(preview);
    const footer = pageFrameToFooterHtml(preview);
    return `<!doctype html><html><head><meta charset="utf-8"/><style>
      body { margin:0; background:#e5e7eb; font-family:Arial, sans-serif; }
      .page { position:relative; width:${dimensions.width}pt; height:${dimensions.height}pt; background:white; margin:0 auto; overflow:hidden; zoom:0.78; }
      .header { position:absolute; top:0; left:0; width:100%; height:${frame.margins.top}; }
      .footer { position:absolute; bottom:0; left:0; width:100%; height:${frame.margins.bottom}; }
      .body { position:absolute; top:${frame.margins.top}; bottom:${frame.margins.bottom}; left:${frame.margins.left}; right:${frame.margins.right}; border:1px dashed #cbd5e1; background:#f8fafc; display:flex; align-items:center; justify-content:center; color:#94a3b8; font-size:12pt; }
    </style></head><body><div class="page"><div class="header">${header}</div><div class="body">Contenido del documento</div><div class="footer">${footer}</div></div></body></html>`;
  }, [frame, variables]);

  return (
    <iframe
      title="Vista previa del marco de página"
      srcDoc={html}
      onLoad={(event) => {
        const node = event.currentTarget.contentDocument?.querySelector(
          '.richtext',
        ) as HTMLElement | null;
        onOverflowChange?.(
          Boolean(node && node.scrollHeight > node.clientHeight + 1),
        );
      }}
      className="h-[620px] w-full rounded-md border border-border bg-muted/30"
    />
  );
}

function BoxRow({
  box,
  onChange,
  onRemove,
}: {
  box: PageFrameBox;
  onChange: (patch: Partial<PageFrameBox>) => void;
  onRemove: () => void;
}) {
  const isImage = box.type === 'image';
  return (
    <div className="grid gap-2 rounded-md border border-border p-2 sm:grid-cols-[minmax(0,1fr)_70px_70px_70px_70px_auto_auto_auto]">
      <div className="space-y-1">
        <Input
          value={box.content}
          onChange={(event) => onChange({ content: event.target.value })}
          className="h-8 text-xs"
          aria-label={`Texto de ${box.id}`}
        />
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
          {box.type} · {box.id}
        </div>
      </div>
      <Input
        type="number"
        value={box.x}
        onChange={(event) => onChange({ x: Number(event.target.value) })}
        className="h-8"
        aria-label="X"
      />
      <Input
        type="number"
        value={box.y}
        onChange={(event) => onChange({ y: Number(event.target.value) })}
        className="h-8"
        aria-label="Y"
      />
      <Input
        type="number"
        value={box.width}
        onChange={(event) => onChange({ width: Number(event.target.value) })}
        className="h-8"
        aria-label="Ancho"
      />
      <Input
        type="number"
        value={box.fontSize}
        onChange={(event) => onChange({ fontSize: Number(event.target.value) })}
        className="h-8"
        aria-label="Tamaño de fuente"
        disabled={isImage}
      />
      <label className="flex items-center gap-1 text-xs">
        <input
          type="checkbox"
          checked={box.fontWeight === '700' || box.fontWeight === '900'}
          onChange={(event) =>
            onChange({ fontWeight: event.target.checked ? '700' : '400' })
          }
          disabled={isImage}
        />
        N
      </label>
      <label className="flex items-center gap-1 text-xs">
        <input
          type="checkbox"
          checked={box.fontStyle === 'italic'}
          onChange={(event) =>
            onChange({ fontStyle: event.target.checked ? 'italic' : 'normal' })
          }
          disabled={isImage}
        />
        I
      </label>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        onClick={onRemove}
        aria-label="Quitar caja"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function AreaEditor({
  title,
  area,
  onChange,
}: {
  title: string;
  area: PageFrameArea;
  onChange: (area: PageFrameArea) => void;
}) {
  const updateBox = (id: string, patch: Partial<PageFrameBox>) => {
    onChange({
      ...area,
      boxes: area.boxes.map((box) => (box.id === id ? { ...box, ...patch } : box)),
    });
  };

  const addBox = () => {
    const id = `custom-${Date.now()}`;
    onChange({
      ...area,
      boxes: [
        ...area.boxes,
        {
          id,
          type: 'text',
          x: 60,
          y: 30,
          width: 220,
          fontSize: 10,
          fontFamily: 'Arial, sans-serif',
          fontWeight: '400',
          fontStyle: 'normal',
          color: '#111827',
          align: 'left',
          content: 'Texto',
        },
      ],
    });
  };

  const removeBox = (id: string) => {
    onChange({ ...area, boxes: area.boxes.filter((box) => box.id !== id) });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <Button type="button" size="sm" variant="outline" onClick={addBox}>
          <Plus className="mr-1.5 h-4 w-4" /> Agregar texto
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="hidden gap-2 px-2 text-[10px] uppercase tracking-wide text-muted-foreground sm:grid sm:grid-cols-[minmax(0,1fr)_70px_70px_70px_70px_auto_auto_auto]">
          <span>Texto / variable</span>
          <span>X</span>
          <span>Y</span>
          <span>Ancho</span>
          <span>Tamaño</span>
          <span />
          <span />
          <span />
        </div>
        {area.boxes.map((box) => (
          <BoxRow
            key={box.id}
            box={box}
            onChange={(patch) => updateBox(box.id, patch)}
            onRemove={() => removeBox(box.id)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function isContentBox(box: PageFrameBox): boolean {
  if (box.role === 'frame') return false;
  if (box.role === 'content') return true;
  return box.y >= 90 && box.y < 700 && !/^_+$/.test(box.content.trim());
}

function contentSection(box: PageFrameBox): string {
  if (box.y < 150) return 'Título y fecha';
  if (box.y < 430) return 'Cuerpo';
  if (box.y < 700) return 'Firmas';
  return 'Contenido';
}

export function PageFrameEditor({
  value,
  onChange,
  variables,
  contentOnly = false,
}: {
  value: PageFrame;
  onChange: (value: PageFrame) => void;
  variables?: Record<string, string>;
  contentOnly?: boolean;
}) {
  const [bodyOverflows, setBodyOverflows] = useState(false);
  const update = (patch: Partial<PageFrame>) => onChange({ ...value, ...patch });

  if (value.mode === 'fullPage') {
    if (contentOnly) {
      const boxes = (value.body?.boxes ?? []).filter(
        (box) =>
          box.type !== 'richText' &&
          isContentBox(box) &&
          !/\{\{/.test(box.content),
      );
      return (
        <div className="space-y-4">
          <PagePreview
            frame={value}
            variables={variables}
            onOverflowChange={setBodyOverflows}
          />
          {bodyOverflows && (
            <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              El cuerpo supera el espacio de la primera página. El PDF generará
              páginas de continuación con el mismo marco y las firmas al final.
            </div>
          )}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Título y etiquetas de firmas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-xs text-muted-foreground">
                El cuerpo se edita arriba con el editor. Aquí puedes ajustar el
                título, el subtítulo y las etiquetas de firmas. Las líneas con
                variables se actualizan desde los campos superiores.
              </p>
              {boxes.map((box) => (
                <div key={box.id} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    {contentSection(box)}
                  </Label>
                  <textarea
                    className="min-h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={box.content}
                    onChange={(event) =>
                      update({
                        body: {
                          ...(value.body ?? { boxes: [] }),
                          boxes: (value.body?.boxes ?? []).map((item) =>
                            item.id === box.id
                              ? { ...item, content: event.target.value }
                              : item,
                          ),
                        },
                      })
                    }
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Diseño de página completa</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            El tamaño y los márgenes están fijados por el diseño original. Cada
            caja de texto es una línea del documento y se puede editar sin tocar
            HTML.
          </CardContent>
        </Card>
        <PagePreview frame={value} variables={variables} />
        <AreaEditor
          title="Contenido de la página"
          area={value.body ?? { boxes: [] }}
          onChange={(body) => update({ body })}
        />
        <p className="text-xs text-muted-foreground">
          El fondo, las franjas y el logo forman parte del diseño base. Los
          textos, posiciones, tamaños y estilos de cada línea son editables.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Marco de página</CardTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => onChange(JSON.parse(JSON.stringify(ACTA_PAGE_FRAME)))}
          >
            <LayoutTemplate className="mr-1.5 h-4 w-4" /> Usar diseño Acta
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label htmlFor="frame-page-size">Tamaño</Label>
            <select
              id="frame-page-size"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={value.pageSize}
              onChange={(event) =>
                update({ pageSize: event.target.value as PageFrame['pageSize'] })
              }
            >
              <option value="A4">A4</option>
              <option value="Letter">Carta</option>
              <option value="Legal">Legal</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="frame-orientation">Orientación</Label>
            <select
              id="frame-orientation"
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
              value={value.orientation}
              onChange={(event) =>
                update({
                  orientation: event.target.value as PageFrame['orientation'],
                })
              }
            >
              <option value="portrait">Vertical</option>
              <option value="landscape">Horizontal</option>
            </select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="frame-margin-top">Margen superior</Label>
            <Input
              id="frame-margin-top"
              value={value.margins.top}
              onChange={(event) =>
                update({ margins: { ...value.margins, top: event.target.value } })
              }
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="frame-margin-bottom">Margen inferior</Label>
            <Input
              id="frame-margin-bottom"
              value={value.margins.bottom}
              onChange={(event) =>
                update({ margins: { ...value.margins, bottom: event.target.value } })
              }
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="frame-margin-left">Margen izquierdo</Label>
            <Input
              id="frame-margin-left"
              value={value.margins.left}
              onChange={(event) =>
                update({ margins: { ...value.margins, left: event.target.value } })
              }
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="frame-margin-right">Margen derecho</Label>
            <Input
              id="frame-margin-right"
              value={value.margins.right}
              onChange={(event) =>
                update({ margins: { ...value.margins, right: event.target.value } })
              }
            />
          </div>
        </CardContent>
      </Card>

      <PagePreview frame={value} variables={variables} />

      <AreaEditor
        title="Encabezado"
        area={value.header}
        onChange={(header) => update({ header })}
      />
      <AreaEditor
        title="Pie de página"
        area={value.footer}
        onChange={(footer) => update({ footer })}
      />

      <p className="text-xs text-muted-foreground">
        El fondo, las franjas y el logo son parte del diseño base. Para cambiar
        la identidad gráfica completa se necesita un diseño nuevo. El logo se
        toma de Configuración → Institución.
      </p>
    </div>
  );
}
