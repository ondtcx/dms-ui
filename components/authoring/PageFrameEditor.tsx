'use client';

import { useMemo } from 'react';
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

const PREVIEW_VARIABLES: Record<string, string> = {
  '{{institucion.nombre}}': 'UNIDAD EDUCATIVA VICENTE FIERRO',
  '{{institucion.direccion}}':
    'Ciudadela Sociedad Obrera Calle Juan XXIII y Caciques Tulcanaza',
  '{{institucion.telefono}}': '2980-466',
  '{{institucion.email}}': 'uevicentefierro@gmail.com',
};

function previewFrame(frame: PageFrame): PageFrame {
  const clone = JSON.parse(JSON.stringify(frame)) as PageFrame;
  for (const area of [clone.header, clone.footer]) {
    for (const box of area.boxes) {
      if (box.type === 'image' && box.content.includes('institucion.logo')) {
        box.content = LOGO_PLACEHOLDER;
      }
      if (box.type === 'pageNumber') {
        box.content = 'Página 1 de 1';
      } else {
        for (const [token, value] of Object.entries(PREVIEW_VARIABLES)) {
          box.content = box.content.split(token).join(value);
        }
      }
    }
  }
  return clone;
}

function PagePreview({ frame }: { frame: PageFrame }) {
  const html = useMemo(() => {
    const base = PAGE_SIZES[frame.pageSize] ?? PAGE_SIZES.Letter;
    const dimensions =
      frame.orientation === 'landscape'
        ? { width: base.height, height: base.width }
        : base;
    const preview = previewFrame(frame);
    const header = pageFrameToHeaderHtml(preview);
    const footer = pageFrameToFooterHtml(preview);
    return `<!doctype html><html><head><meta charset="utf-8"/><style>
      body { margin:0; background:#e5e7eb; font-family:Arial, sans-serif; }
      .page { position:relative; width:${dimensions.width}pt; height:${dimensions.height}pt; background:white; margin:0 auto; overflow:hidden; zoom:0.78; }
      .header { position:absolute; top:0; left:0; width:100%; height:${frame.margins.top}; }
      .footer { position:absolute; bottom:0; left:0; width:100%; height:${frame.margins.bottom}; }
      .body { position:absolute; top:${frame.margins.top}; bottom:${frame.margins.bottom}; left:${frame.margins.left}; right:${frame.margins.right}; border:1px dashed #cbd5e1; background:#f8fafc; display:flex; align-items:center; justify-content:center; color:#94a3b8; font-size:12pt; }
    </style></head><body><div class="page"><div class="header">${header}</div><div class="body">Contenido del documento</div><div class="footer">${footer}</div></div></body></html>`;
  }, [frame]);

  return (
    <iframe
      title="Vista previa del marco de página"
      srcDoc={html}
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

export function PageFrameEditor({
  value,
  onChange,
}: {
  value: PageFrame;
  onChange: (value: PageFrame) => void;
}) {
  const update = (patch: Partial<PageFrame>) => onChange({ ...value, ...patch });

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

      <PagePreview frame={value} />

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
