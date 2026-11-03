'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Grid3X3,
  Lock,
  Magnet,
  Minus,
  Move,
  Plus,
  Redo2,
  Undo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PageFrame, PageFrameBox } from '@/lib/types/authoring';
import {
  PREVIEW_VARIABLES,
  previewFrame,
} from './PageFrameEditor';

const PAGE_SIZES: Record<string, { width: number; height: number }> = {
  A4: { width: 595, height: 842 },
  Letter: { width: 612, height: 792 },
  Legal: { width: 612, height: 1008 },
};

const SIMPLE_RICH_TEXT_CSS = `
.richtext { white-space: normal !important; line-height: 1.35 !important; text-align: justify; overflow: hidden; }
.richtext p { margin: 0 0 8pt; line-height: 1.35; text-align: justify; }
.richtext p:last-child { margin-bottom: 0; }
.richtext ul, .richtext ol { margin: 0 0 8pt 18pt; padding: 0; }
.richtext h1 { font-size: 15pt; margin: 0 0 8pt; }
.richtext h2 { font-size: 13pt; margin: 0 0 8pt; }
.richtext h3 { font-size: 11.5pt; margin: 0 0 8pt; }
.richtext table { width: 100%; border-collapse: collapse; margin: 6pt 0; }
.richtext th, .richtext td { border: 1px solid #000; padding: 3pt 4pt; vertical-align: top; }
`;

const SECTIONS = [
  'Marco institucional',
  'Título y fecha',
  'Cuerpo',
  'Firmas',
  'Pie',
] as const;

type Section = (typeof SECTIONS)[number];
type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

function sectionOf(box: PageFrameBox): Section {
  if (box.role === 'frame' && box.y < 90) return 'Marco institucional';
  if (box.type === 'richText') return 'Cuerpo';
  if (['acta-5', 'acta-6', 'acta-7'].includes(box.id)) {
    return 'Título y fecha';
  }
  if (box.role === 'frame' && box.y >= 700) return 'Pie';
  if (box.y >= 700) return 'Pie';
  return 'Firmas';
}

function labelOf(box: PageFrameBox): string {
  if (box.type === 'richText') return 'Cuerpo del documento';
  if (box.type === 'image') return 'Logo';
  const byId: Record<string, string> = {
    'acta-1': 'Institución',
    'acta-2': 'Lema',
    'acta-3': 'Fundación (1)',
    'acta-4': 'Fundación (2)',
    'acta-5': 'Título',
    'acta-6': 'Subtítulo',
    'acta-7': 'Fecha',
    'acta-19': 'Etiqueta de firma 1',
    'acta-20': 'Etiqueta de firma 2',
    'acta-23': 'Nombre del firmante 1',
    'acta-24': 'Nombre del firmante 2',
    'acta-25': 'Cargo del firmante 1',
    'acta-26': 'Cargo del firmante 2',
    'acta-27': 'Etiqueta de firma',
    'acta-29': 'Nombre del firmante',
    'acta-30': 'Cargo del firmante',
    'acta-31': 'Dirección (etiqueta)',
    'acta-32': 'Dirección (texto)',
    'acta-33': 'Teléfono (etiqueta)',
    'acta-34': 'Teléfono (número)',
    'acta-35': 'Correo (etiqueta)',
    'acta-36': 'Correo (dirección)',
  };
  if (byId[box.id]) return byId[box.id];
  if (/^_+$/.test(box.content.trim())) return 'Línea de firma';
  if (box.content.includes('UNIDAD EDUCATIVA')) return 'Institución';
  if (box.content.includes('Pioneros')) return 'Lema';
  if (box.content.includes('Fundado')) return 'Fundación';
  if (box.content.includes('Dirección')) return 'Dirección';
  if (box.content.includes('Teléfono')) return 'Teléfono';
  if (box.content.includes('Correo')) return 'Correo';
  const clean = box.content.replace(/\{\{[^}]+\}\}/g, '').trim();
  return clean ? clean.slice(0, 34) : box.id;
}

function isVariableBox(box: PageFrameBox): boolean {
  return box.type === 'richText' || /\{\{/.test(box.content);
}

function isLockedBox(box: PageFrameBox): boolean {
  return box.role === 'frame';
}

function initialZoom(frame: PageFrame): number {
  return frame.pageSize === 'Legal' ? 0.55 : 0.72;
}

function cloneFrame(frame: PageFrame): PageFrame {
  return JSON.parse(JSON.stringify(frame)) as PageFrame;
}

export function PageFrameSimpleEditor({
  value,
  onChange,
}: {
  value: PageFrame;
  onChange: (value: PageFrame) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    () => value.body?.boxes.find((box) => box.type === 'richText')?.id ?? null,
  );
  const [zoom, setZoom] = useState(() => initialZoom(value));
  const [showGrid, setShowGrid] = useState(true);
  const [snap, setSnap] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingValue, setEditingValue] = useState('');
  const [clipboardReady, setClipboardReady] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0);
  const [guides, setGuides] = useState<{ x: number | null; y: number | null }>({
    x: null,
    y: null,
  });
  const history = useRef<PageFrame[]>([]);
  const future = useRef<PageFrame[]>([]);
  const clipboard = useRef<PageFrameBox | null>(null);
  const drag = useRef<{
    id: string;
    startX: number;
    startY: number;
    pointerX: number;
    pointerY: number;
    startFrame: PageFrame;
    changed: boolean;
  } | null>(null);
  const resize = useRef<{
    id: string;
    direction: ResizeDirection;
    startLeft: number;
    startTop: number;
    startWidth: number;
    startHeight: number;
    pointerX: number;
    pointerY: number;
    startFrame: PageFrame;
    changed: boolean;
    isRichText: boolean;
    isImage: boolean;
  } | null>(null);

  const dimensions = PAGE_SIZES[value.pageSize] ?? PAGE_SIZES.Letter;
  const pageWidth =
    value.orientation === 'landscape' ? dimensions.height : dimensions.width;
  const pageHeight =
    value.orientation === 'landscape' ? dimensions.width : dimensions.height;
  const preview = useMemo(() => previewFrame(value, PREVIEW_VARIABLES), [value]);
  const previewById = useMemo(
    () => new Map((preview.body?.boxes ?? []).map((box) => [box.id, box])),
    [preview],
  );
  const boxes = value.body?.boxes ?? [];
  const selected = boxes.find((box) => box.id === selectedId) ?? null;

  const frameWithPatch = (id: string, patch: Partial<PageFrameBox>) => ({
    ...value,
    body: {
      ...(value.body ?? { boxes: [] }),
      boxes: (value.body?.boxes ?? []).map((box) =>
        box.id === id ? { ...box, ...patch } : box,
      ),
    },
  });

  const updateBoxRaw = (id: string, patch: Partial<PageFrameBox>) => {
    onChange(frameWithPatch(id, patch));
  };

  const recordHistory = (previous: PageFrame) => {
    history.current.push(cloneFrame(previous));
    if (history.current.length > 50) history.current.shift();
    future.current = [];
    setHistoryVersion((current) => current + 1);
  };

  const commit = (next: PageFrame) => {
    recordHistory(value);
    onChange(next);
  };

  const updateBox = (id: string, patch: Partial<PageFrameBox>) => {
    commit(frameWithPatch(id, patch));
  };

  const addTextBox = () => {
    const next: PageFrameBox = {
      id: `custom-${Date.now()}`,
      type: 'text',
      role: 'content',
      x: 121,
      y: 200,
      width: 200,
      fontSize: 11,
      fontFamily: 'Arial, sans-serif',
      fontWeight: '400',
      fontStyle: 'normal',
      color: '#000000',
      align: 'left',
      content: 'Texto nuevo',
    };
    commit({
      ...value,
      body: {
        ...(value.body ?? { boxes: [] }),
        boxes: [...(value.body?.boxes ?? []), next],
      },
    });
    setSelectedId(next.id);
  };

  const duplicateSelected = () => {
    if (!selected || isLockedBox(selected) || selected.type === 'richText') {
      return;
    }
    const clone: PageFrameBox = {
      ...selected,
      id: `custom-${Date.now()}`,
      x: selected.x + 10,
      y: selected.y + 10,
    };
    commit({
      ...value,
      body: {
        ...(value.body ?? { boxes: [] }),
        boxes: [...(value.body?.boxes ?? []), clone],
      },
    });
    setSelectedId(clone.id);
  };

  const copySelected = () => {
    if (!selected || isLockedBox(selected) || selected.type === 'richText') {
      return;
    }
    clipboard.current = JSON.parse(JSON.stringify(selected)) as PageFrameBox;
    setClipboardReady(true);
  };

  const pasteClipboard = () => {
    if (!clipboard.current) return;
    const clone: PageFrameBox = {
      ...clipboard.current,
      id: `custom-${Date.now()}`,
      x: clipboard.current.x + 10,
      y: clipboard.current.y + 10,
    };
    commit({
      ...value,
      body: {
        ...(value.body ?? { boxes: [] }),
        boxes: [...(value.body?.boxes ?? []), clone],
      },
    });
    setSelectedId(clone.id);
  };

  const deleteSelected = () => {
    if (!selected || isLockedBox(selected) || selected.type === 'richText') {
      return;
    }
    commit({
      ...value,
      body: {
        ...(value.body ?? { boxes: [] }),
        boxes: (value.body?.boxes ?? []).filter(
          (box) => box.id !== selected.id,
        ),
      },
    });
    setSelectedId(null);
  };

  const moveLayer = (toFront: boolean) => {
    if (!selected) return;
    const rest = (value.body?.boxes ?? []).filter(
      (box) => box.id !== selected.id,
    );
    commit({
      ...value,
      body: {
        ...(value.body ?? { boxes: [] }),
        boxes: toFront ? [...rest, selected] : [selected, ...rest],
      },
    });
  };

  const undo = () => {
    const previous = history.current.pop();
    if (!previous) return;
    future.current.push(cloneFrame(value));
    setHistoryVersion((current) => current + 1);
    onChange(previous);
  };

  const redo = () => {
    const next = future.current.pop();
    if (!next) return;
    history.current.push(cloneFrame(value));
    setHistoryVersion((current) => current + 1);
    onChange(next);
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const target = event.target as HTMLElement | null;
      if (
        target?.closest(
          'input, textarea, select, [contenteditable="true"]',
        )
      ) {
        return;
      }
      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if ((key === 'z' && event.shiftKey) || key === 'y') {
        event.preventDefault();
        redo();
      }
    };
    const onNudge = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) {
        return;
      }
      if (selected && (event.ctrlKey || event.metaKey)) {
        const key = event.key.toLowerCase();
        if (key === 'c') {
          event.preventDefault();
          copySelected();
          return;
        }
        if (key === 'v') {
          event.preventDefault();
          pasteClipboard();
          return;
        }
      }
      if (
        selected &&
        (event.key === 'Delete' || event.key === 'Backspace') &&
        !isLockedBox(selected) &&
        selected.type !== 'richText'
      ) {
        event.preventDefault();
        deleteSelected();
        return;
      }
      if (!event.key.startsWith('Arrow') || !selected || isLockedBox(selected)) {
        return;
      }
      event.preventDefault();
      const step = event.shiftKey ? 10 : 1;
      const dx =
        event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0;
      const dy =
        event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0;
      updateBox(selected.id, {
        x: Math.max(0, Math.min(pageWidth - 10, selected.x + dx)),
        y: Math.max(0, Math.min(pageHeight - 10, selected.y + dy)),
      });
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keydown', onNudge);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keydown', onNudge);
    };
  });

  const onPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    box: PageFrameBox,
  ) => {
    setSelectedId(box.id);
    if (isLockedBox(box)) return;
    event.preventDefault();
    drag.current = {
      id: box.id,
      startX: box.x,
      startY: box.y,
      pointerX: event.clientX,
      pointerY: event.clientY,
      startFrame: cloneFrame(value),
      changed: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    if (!current) return;
    let x = current.startX + (event.clientX - current.pointerX) / zoom;
    let y = current.startY + (event.clientY - current.pointerY) / zoom;
    if (snap) {
      x = Math.round(x / 5) * 5;
      y = Math.round(y / 5) * 5;
    }
    const currentBox = boxes.find((box) => box.id === current.id);
    const boxWidth = currentBox?.width ?? 0;
    const boxHeight = currentBox?.height ?? 0;
    const threshold = 4;
    const xCandidates = [0, pageWidth / 2, pageWidth];
    const yCandidates = [0, pageHeight / 2, pageHeight];
    for (const other of boxes) {
      if (other.id === current.id || other.role === 'frame') continue;
      xCandidates.push(other.x);
      if (other.width > 0) {
        xCandidates.push(other.x + other.width / 2, other.x + other.width);
      }
      yCandidates.push(other.y);
      if (other.height) {
        yCandidates.push(other.y + other.height / 2, other.y + other.height);
      }
    }
    let guideX: number | null = null;
    let guideY: number | null = null;
    for (const [index, offset] of [0, boxWidth / 2, boxWidth].entries()) {
      const edgeX = x + offset;
      const nearest = xCandidates.reduce((best, candidate) =>
        Math.abs(candidate - edgeX) < Math.abs(best - edgeX) ? candidate : best,
      );
      if (index === 0 || boxWidth > 0) {
        if (Math.abs(nearest - edgeX) <= threshold) {
          x += nearest - edgeX;
          guideX = nearest;
          break;
        }
      }
    }
    for (const [index, offset] of [0, boxHeight / 2, boxHeight].entries()) {
      const edgeY = y + offset;
      const nearest = yCandidates.reduce((best, candidate) =>
        Math.abs(candidate - edgeY) < Math.abs(best - edgeY) ? candidate : best,
      );
      if (index === 0 || boxHeight > 0) {
        if (Math.abs(nearest - edgeY) <= threshold) {
          y += nearest - edgeY;
          guideY = nearest;
          break;
        }
      }
    }
    setGuides({ x: guideX, y: guideY });
    x = Math.max(0, Math.min(pageWidth - 10, x));
    y = Math.max(0, Math.min(pageHeight - 10, y));
    current.changed = true;
    updateBoxRaw(current.id, {
      x: Math.round(x * 100) / 100,
      y: Math.round(y * 100) / 100,
    });
  };

  const finishDrag = () => {
    const current = drag.current;
    if (current?.changed) {
      recordHistory(current.startFrame);
    }
    drag.current = null;
    setGuides({ x: null, y: null });
  };

  const boxStyle = (box: PageFrameBox) => {
    const center = box.center
      ? { left: '50%', transform: 'translateX(-50%)' }
      : { left: `${box.x}pt` };
    return {
      position: 'absolute' as const,
      ...center,
      top: `${box.y}pt`,
      width: box.width > 0 ? `${box.width}pt` : undefined,
      height: box.type === 'richText' ? `${box.height ?? 240}pt` : undefined,
      fontSize: `${box.fontSize}pt`,
      fontFamily: box.fontFamily ?? 'Arial, sans-serif',
      fontWeight: box.fontWeight ?? '400',
      fontStyle: box.fontStyle ?? 'normal',
      color: box.color ?? '#000',
      textAlign: (box.center ? 'center' : box.align ?? 'left') as any,
      whiteSpace: box.type === 'richText' ? 'normal' : 'pre',
      lineHeight: box.type === 'richText' ? 1.35 : 1.15,
      cursor: isLockedBox(box) ? 'default' : 'move',
      userSelect: 'none' as const,
      touchAction: 'none' as const,
      zIndex: selectedId === box.id ? 3 : 1,
    };
  };

  const startResize = (
    event: React.PointerEvent<HTMLDivElement>,
    box: PageFrameBox,
    direction: ResizeDirection,
  ) => {
    if (isLockedBox(box)) return;
    event.preventDefault();
    event.stopPropagation();
    const element = event.currentTarget.parentElement as HTMLElement | null;
    resize.current = {
      id: box.id,
      direction,
      startLeft: box.x,
      startTop: box.y,
      startWidth: box.width > 0 ? box.width : (element?.offsetWidth ?? 120) / zoom,
      startHeight:
        box.height ??
        (element?.offsetHeight ?? (box.type === 'richText' ? 240 : 40)) / zoom,
      pointerX: event.clientX,
      pointerY: event.clientY,
      startFrame: cloneFrame(value),
      changed: false,
      isRichText: box.type === 'richText',
      isImage: box.type === 'image',
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveResize = (event: React.PointerEvent<HTMLDivElement>) => {
    const current = resize.current;
    if (!current) return;
    const dx = (event.clientX - current.pointerX) / zoom;
    const dy = (event.clientY - current.pointerY) / zoom;
    const direction = current.direction;
    let left = current.startLeft;
    let top = current.startTop;
    let width = current.startWidth;
    let height = current.startHeight;
    if (direction.includes('e')) width += dx;
    if (direction.includes('w')) {
      left += dx;
      width -= dx;
    }
    if (direction.includes('s')) height += dy;
    if (direction.includes('n')) {
      top += dy;
      height -= dy;
    }
    if (width < 20) {
      if (direction.includes('w')) left = current.startLeft + current.startWidth - 20;
      width = 20;
    }
    if (height < 20) {
      if (direction.includes('n')) top = current.startTop + current.startHeight - 20;
      height = 20;
    }
    current.changed = true;
    updateBoxRaw(current.id, {
      x: Math.round(left * 100) / 100,
      y: Math.round(top * 100) / 100,
      width: Math.round(width * 100) / 100,
      ...(current.isRichText || current.isImage
        ? { height: Math.round(height * 100) / 100 }
        : {}),
    });
  };

  const finishResize = () => {
    const current = resize.current;
    if (current?.changed) {
      recordHistory(current.startFrame);
    }
    resize.current = null;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
        <p className="text-xs text-muted-foreground">
          Arrastra los elementos. El marco institucional está bloqueado en este
          modo; usa Avanzado para modificarlo.
        </p>
        <div className="flex flex-wrap items-center gap-1">
          <Button type="button" size="sm" variant="outline" onClick={addTextBox}>
            <Plus className="mr-1 h-4 w-4" /> Agregar texto
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setZoom((current) => Math.max(0.35, current - 0.1))}
            aria-label="Alejar"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-12 text-center text-xs text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setZoom((current) => Math.min(1.4, current + 0.1))}
            aria-label="Acercar"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={showGrid ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowGrid((current) => !current)}
            aria-label="Cuadrícula"
            title="Cuadrícula"
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={snap ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8"
            onClick={() => setSnap((current) => !current)}
            aria-label="Ajustar a cuadrícula"
            title="Ajustar a cuadrícula"
          >
            <Magnet className="h-4 w-4" />
          </Button>
          <span className="mx-1 h-5 w-px bg-border" />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={undo}
            disabled={history.current.length === 0}
            aria-label="Deshacer"
            title="Deshacer"
          >
            <Undo2 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={redo}
            disabled={future.current.length === 0}
            aria-label="Rehacer"
            title="Rehacer"
          >
            <Redo2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[220px_minmax(0,1fr)_270px]">
        <Card className="h-fit">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Elementos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {SECTIONS.map((section) => {
              const items = boxes.filter((box) => sectionOf(box) === section);
              if (!items.length) return null;
              return (
                <div key={section} className="space-y-1">
                  <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                    {section}
                  </div>
                  {items.map((box) => (
                    <button
                      key={box.id}
                      type="button"
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition ${
                        selectedId === box.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => setSelectedId(box.id)}
                    >
                      {isLockedBox(box) ? (
                        <Lock className="h-3 w-3 shrink-0 opacity-70" />
                      ) : (
                        <Move className="h-3 w-3 shrink-0 opacity-70" />
                      )}
                      <span className="truncate">{labelOf(box)}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="min-w-0 overflow-auto rounded-md border border-border bg-muted/40 p-4">
          <style>{value.styles ?? ''}</style>
          <style>{SIMPLE_RICH_TEXT_CSS}</style>
          <div
            className="relative mx-auto"
            style={{ width: pageWidth * zoom, height: pageHeight * zoom }}
          >
            <div
              className="sheet"
              style={{
                width: pageWidth,
                height: pageHeight,
                margin: 0,
                transform: `scale(${zoom})`,
                transformOrigin: 'top left',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: 'none',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  zIndex: 0,
                  pointerEvents: 'none',
                }}
                dangerouslySetInnerHTML={{
                  __html: value.body?.backgroundSvg ?? '',
                }}
              />
              {showGrid && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 0,
                    marginLeft: 57,
                    backgroundImage:
                      'linear-gradient(to right, rgba(15,23,42,.10) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,.10) 1px, transparent 1px)',
                    backgroundSize: '20pt 20pt',
                    pointerEvents: 'none',
                  }}
                />
              )}
              {guides.x !== null && (
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    bottom: 0,
                    left: `${guides.x}pt`,
                    borderLeft: '1px dashed #e11d48',
                    zIndex: 4,
                    pointerEvents: 'none',
                  }}
                />
              )}
              {guides.y !== null && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: `${guides.y}pt`,
                    borderTop: '1px dashed #e11d48',
                    zIndex: 4,
                    pointerEvents: 'none',
                  }}
                />
              )}
              {boxes.map((box) => {
                const shown = previewById.get(box.id) ?? box;
                const selectedNow = selectedId === box.id;
                return (
                  <div
                    key={box.id}
                    data-box-id={box.id}
                    className={box.type === 'richText' ? 'richtext' : ''}
                    style={boxStyle(box)}
                    onPointerDown={(event) => onPointerDown(event, box)}
                    onPointerMove={onPointerMove}
                    onPointerUp={finishDrag}
                    onPointerCancel={finishDrag}
                    onDoubleClick={() => {
                      if (
                        isLockedBox(box) ||
                        isVariableBox(box) ||
                        box.type === 'richText'
                      ) {
                        return;
                      }
                      setSelectedId(box.id);
                      setEditingValue(box.content);
                      setEditingId(box.id);
                    }}
                    title={labelOf(box)}
                  >
                    {selectedNow && (
                      <div
                        className="pointer-events-none absolute -inset-1 rounded-sm border-2 border-primary"
                        style={{ zIndex: 5 }}
                      />
                    )}
                    {selectedNow && !isLockedBox(box) && editingId !== box.id && (
                      <div
                        className="pointer-events-none absolute inset-0"
                        style={{ zIndex: 6 }}
                      >
                        {[
                          { direction: 'n' as const, className: 'left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize' },
                          { direction: 's' as const, className: 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize' },
                          { direction: 'e' as const, className: 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2 cursor-ew-resize' },
                          { direction: 'w' as const, className: 'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-ew-resize' },
                          { direction: 'ne' as const, className: 'right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize' },
                          { direction: 'nw' as const, className: 'left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize' },
                          { direction: 'se' as const, className: 'bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize' },
                          { direction: 'sw' as const, className: 'bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize' },
                        ]
                          .filter(
                            (handle) =>
                              box.type === 'richText' ||
                              box.type === 'image' ||
                              handle.direction === 'e' ||
                              handle.direction === 'w',
                          )
                          .map((handle) => (
                            <div
                              key={handle.direction}
                              role="presentation"
                              className={`pointer-events-auto absolute h-2.5 w-2.5 rounded-sm border border-primary bg-primary ${handle.className}`}
                              style={{ touchAction: 'none' }}
                              onPointerDown={(event) =>
                                startResize(event, box, handle.direction)
                              }
                              onPointerMove={moveResize}
                              onPointerUp={finishResize}
                              onPointerCancel={finishResize}
                            />
                          ))}
                      </div>
                    )}
                    {editingId === box.id ? (
                      <textarea
                        autoFocus
                        value={editingValue}
                        className="absolute inset-0 z-10 resize-none rounded-sm border-2 border-primary bg-white/95 p-1 text-black outline-none"
                        style={{
                          fontSize: `${box.fontSize}pt`,
                          minWidth: '160px',
                          minHeight: '28px',
                          width: box.width > 0 ? '100%' : 'max-content',
                        }}
                        onPointerDown={(event) => event.stopPropagation()}
                        onChange={(event) => setEditingValue(event.target.value)}
                        onBlur={() => {
                          updateBox(box.id, { content: editingValue });
                          setEditingId(null);
                        }}
                        onKeyDown={(event) => {
                          event.stopPropagation();
                          if (event.key === 'Escape') {
                            setEditingId(null);
                          } else if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault();
                            updateBox(box.id, { content: editingValue });
                            setEditingId(null);
                          }
                        }}
                      />
                    ) : box.type === 'richText' ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: shown.content }}
                      />
                    ) : box.type === 'image' ? (
                      <img
                        src={shown.content}
                        alt=""
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                        }}
                      />
                    ) : (
                      shown.content
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <Card className="h-fit">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Propiedades</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!selected ? (
              <p className="text-xs text-muted-foreground">
                Selecciona un elemento del lienzo o de la lista.
              </p>
            ) : (
              <>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Elemento
                  </Label>
                  <div className="text-sm font-medium">{labelOf(selected)}</div>
                </div>
                {isLockedBox(selected) && (
                  <p className="rounded-md border border-amber-300 bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
                    Marco institucional bloqueado. Edítalo en el modo Avanzado.
                  </p>
                )}
                {selected.type === 'richText' && (
                  <p className="rounded-md border border-sky-300 bg-sky-50 px-2 py-1.5 text-xs text-sky-900">
                    El cuerpo se edita por documento. Aquí solo puedes moverlo.
                  </p>
                )}
                {isVariableBox(selected) && selected.type !== 'richText' && (
                  <p className="rounded-md border border-sky-300 bg-sky-50 px-2 py-1.5 text-xs text-sky-900">
                    Este dato se toma de los campos del documento.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">X (pt)</Label>
                    <Input
                      type="number"
                      value={selected.x}
                      disabled={isLockedBox(selected)}
                      onChange={(event) =>
                        updateBox(selected.id, { x: Number(event.target.value) })
                      }
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Y (pt)</Label>
                    <Input
                      type="number"
                      value={selected.y}
                      disabled={isLockedBox(selected)}
                      onChange={(event) =>
                        updateBox(selected.id, { y: Number(event.target.value) })
                      }
                      className="h-8"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Ancho (pt)</Label>
                    <Input
                      type="number"
                      value={selected.width}
                      disabled={isLockedBox(selected)}
                      onChange={(event) =>
                        updateBox(selected.id, {
                          width: Number(event.target.value),
                        })
                      }
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Tamaño</Label>
                    <Input
                      type="number"
                      value={selected.fontSize}
                      disabled={isLockedBox(selected)}
                      onChange={(event) =>
                        updateBox(selected.id, {
                          fontSize: Number(event.target.value),
                        })
                      }
                      className="h-8"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Texto</Label>
                  <textarea
                    className="min-h-20 w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-60"
                    value={selected.content}
                    disabled={
                      isLockedBox(selected) ||
                      isVariableBox(selected) ||
                      selected.type === 'richText'
                    }
                    onChange={(event) =>
                      updateBox(selected.id, { content: event.target.value })
                    }
                  />
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={
                        selected.fontWeight === '700' ||
                        selected.fontWeight === '900'
                      }
                      disabled={isLockedBox(selected)}
                      onChange={(event) =>
                        updateBox(selected.id, {
                          fontWeight: event.target.checked ? '700' : '400',
                        })
                      }
                    />
                    Negrita
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={selected.fontStyle === 'italic'}
                      disabled={isLockedBox(selected)}
                      onChange={(event) =>
                        updateBox(selected.id, {
                          fontStyle: event.target.checked ? 'italic' : 'normal',
                        })
                      }
                    />
                    Cursiva
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={duplicateSelected}
                    disabled={
                      isLockedBox(selected) || selected.type === 'richText'
                    }
                  >
                    Duplicar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={copySelected}
                    disabled={
                      isLockedBox(selected) || selected.type === 'richText'
                    }
                  >
                    Copiar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={pasteClipboard}
                    disabled={!clipboardReady}
                  >
                    Pegar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={deleteSelected}
                    disabled={
                      isLockedBox(selected) || selected.type === 'richText'
                    }
                  >
                    Eliminar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => moveLayer(true)}
                  >
                    Al frente
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => moveLayer(false)}
                  >
                    Al fondo
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
