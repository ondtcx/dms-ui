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
import { assetUrl, resolveAssetHtml } from '@/lib/authoring/assets';
import { AssetUploadButton } from './AssetUploadButton';

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
  readOnly = false,
}: {
  value: PageFrame;
  onChange: (value: PageFrame) => void;
  readOnly?: boolean;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const bodyId = value.body?.boxes.find((box) => box.type === 'richText')?.id;
    return bodyId ? [bodyId] : [];
  });
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
  const activePointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; zoom: number } | null>(null);
  const drag = useRef<{
    id: string;
    items: Array<{ id: string; startX: number; startY: number }>;
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
  const groupResize = useRef<{
    bounds: { left: number; top: number; width: number; height: number };
    pointerX: number;
    pointerY: number;
    startFrame: PageFrame;
    changed: boolean;
    items: Array<{
      id: string;
      startX: number;
      startY: number;
      startWidth: number;
      startHeight: number;
      isRichText: boolean;
      isImage: boolean;
    }>;
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
  const selectedId = selectedIds.length
    ? selectedIds[selectedIds.length - 1]
    : null;
  const selected = boxes.find((box) => box.id === selectedId) ?? null;
  const setSelectedId = (id: string | null) =>
    setSelectedIds(id ? [id] : []);
  const isSelected = (id: string) => selectedIds.includes(id);

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

  const addImageBox = (asset: { url: string }) => {
    const next: PageFrameBox = {
      id: `image-${Date.now()}`,
      type: 'image',
      role: 'content',
      x: 120,
      y: 180,
      width: 160,
      height: 90,
      fontSize: 0,
      fit: 'contain',
      objectPosition: 'center',
      content: asset.url,
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

  const setBodyBackground = (asset: { url: string }) => {
    commit({
      ...value,
      body: {
        ...(value.body ?? { boxes: [] }),
        backgroundSvg: `<img src="${asset.url}" style="position:absolute;left:0;top:0;width:100%;height:100%;object-fit:cover;" />`,
      },
    });
  };

  const clearBodyBackground = () => {
    commit({
      ...value,
      body: { ...(value.body ?? { boxes: [] }), backgroundSvg: undefined },
    });
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
    const removable = boxes.filter(
      (box) =>
        selectedIds.includes(box.id) &&
        !isLockedBox(box) &&
        box.type !== 'richText',
    );
    if (!removable.length) return;
    commit({
      ...value,
      body: {
        ...(value.body ?? { boxes: [] }),
        boxes: boxes.filter(
          (box) => !removable.some((item) => item.id === box.id),
        ),
      },
    });
    setSelectedIds([]);
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

  const selectedMovable = boxes.filter(
    (box) => selectedIds.includes(box.id) && !isLockedBox(box),
  );

  const selectionBounds = () => {
    if (!selectedMovable.length) return null;
    const left = Math.min(...selectedMovable.map((box) => box.x));
    const top = Math.min(...selectedMovable.map((box) => box.y));
    const right = Math.max(
      ...selectedMovable.map((box) => box.x + (box.width ?? 0)),
    );
    const bottom = Math.max(
      ...selectedMovable.map((box) => box.y + (box.height ?? 0)),
    );
    return { left, top, right, bottom, width: right - left, height: bottom - top };
  };

  const onCanvasPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    activePointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    if (activePointers.current.size === 2) {
      const [a, b] = [...activePointers.current.values()];
      pinch.current = {
        distance: Math.hypot(a.x - b.x, a.y - b.y),
        zoom,
      };
    }
  };

  const onCanvasPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!activePointers.current.has(event.pointerId)) return;
    activePointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    if (activePointers.current.size < 2 || !pinch.current) return;
    const [a, b] = [...activePointers.current.values()];
    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    if (pinch.current.distance > 0) {
      event.preventDefault();
      setZoom(
        Math.max(
          0.35,
          Math.min(1.6, pinch.current.zoom * (distance / pinch.current.distance)),
        ),
      );
    }
  };

  const onCanvasPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
    activePointers.current.delete(event.pointerId);
    if (activePointers.current.size < 2) pinch.current = null;
  };

  const startGroupResize = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = selectionBounds();
    if (!bounds || selectedMovable.length < 2) return;
    event.preventDefault();
    event.stopPropagation();
    groupResize.current = {
      bounds,
      pointerX: event.clientX,
      pointerY: event.clientY,
      startFrame: cloneFrame(value),
      changed: false,
      items: selectedMovable.map((box) => ({
        id: box.id,
        startX: box.x,
        startY: box.y,
        startWidth: box.width ?? 0,
        startHeight: box.height ?? 0,
        isRichText: box.type === 'richText',
        isImage: box.type === 'image',
      })),
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const moveGroupResize = (event: React.PointerEvent<HTMLDivElement>) => {
    const current = groupResize.current;
    if (!current) return;
    const width = Math.max(20, current.bounds.width + (event.clientX - current.pointerX) / zoom);
    const height = Math.max(20, current.bounds.height + (event.clientY - current.pointerY) / zoom);
    const scaleX = current.bounds.width ? width / current.bounds.width : 1;
    const scaleY = current.bounds.height ? height / current.bounds.height : 1;
    const updated = new Map(
      current.items.map((item) => [
        item.id,
        {
          x: current.bounds.left + (item.startX - current.bounds.left) * scaleX,
          y: current.bounds.top + (item.startY - current.bounds.top) * scaleY,
          width: item.startWidth ? item.startWidth * scaleX : 0,
          ...(item.isRichText || item.isImage
            ? { height: Math.max(10, item.startHeight * scaleY) }
            : {}),
        },
      ]),
    );
    current.changed = true;
    onChange({
      ...value,
      body: {
        ...(value.body ?? { boxes: [] }),
        boxes: boxes.map((box) =>
          updated.has(box.id) ? { ...box, ...updated.get(box.id) } : box,
        ),
      },
    });
  };

  const finishGroupResize = () => {
    const current = groupResize.current;
    if (current?.changed) {
      recordHistory(current.startFrame);
    }
    groupResize.current = null;
  };

  const alignSelection = (
    mode: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom',
  ) => {
    const bounds = selectionBounds();
    if (!bounds || selectedMovable.length < 2) return;
    commit({
      ...value,
      body: {
        ...(value.body ?? { boxes: [] }),
        boxes: boxes.map((box) => {
          if (!selectedIds.includes(box.id) || isLockedBox(box)) return box;
          if (mode === 'left') return { ...box, x: bounds.left };
          if (mode === 'right')
            return { ...box, x: bounds.right - (box.width ?? 0) };
          if (mode === 'center')
            return {
              ...box,
              x: bounds.left + bounds.width / 2 - (box.width ?? 0) / 2,
            };
          if (mode === 'top') return { ...box, y: bounds.top };
          if (mode === 'bottom')
            return { ...box, y: bounds.bottom - (box.height ?? 0) };
          return {
            ...box,
            y: bounds.top + bounds.height / 2 - (box.height ?? 0) / 2,
          };
        }),
      },
    });
  };

  const distributeSelection = (axis: 'horizontal' | 'vertical') => {
    if (selectedMovable.length < 3) return;
    const sorted = [...selectedMovable].sort((a, b) =>
      axis === 'horizontal' ? a.x - b.x : a.y - b.y,
    );
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const start = axis === 'horizontal' ? first.x : first.y;
    const end =
      axis === 'horizontal'
        ? last.x + (last.width ?? 0)
        : last.y + (last.height ?? 0);
    const total =
      sorted.reduce(
        (sum, box) =>
          sum + (axis === 'horizontal' ? box.width ?? 0 : box.height ?? 0),
        0,
      ) || 0;
    const gap = (end - start - total) / (sorted.length - 1);
    let cursor = start;
    const positions = new Map<string, number>();
    for (const box of sorted) {
      positions.set(box.id, cursor);
      cursor +=
        (axis === 'horizontal' ? box.width ?? 0 : box.height ?? 0) + gap;
    }
    commit({
      ...value,
      body: {
        ...(value.body ?? { boxes: [] }),
        boxes: boxes.map((box) => {
          const position = positions.get(box.id);
          if (position === undefined) return box;
          return axis === 'horizontal'
            ? { ...box, x: position }
            : { ...box, y: position };
        }),
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
      const nudgeIds = selectedIds.filter((id) => {
        const box = boxes.find((item) => item.id === id);
        return box && !isLockedBox(box);
      });
      if (!event.key.startsWith('Arrow') || !nudgeIds.length) {
        return;
      }
      event.preventDefault();
      const step = event.shiftKey ? 10 : 1;
      const dx =
        event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0;
      const dy =
        event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0;
      commit({
        ...value,
        body: {
          ...(value.body ?? { boxes: [] }),
          boxes: boxes.map((box) =>
            nudgeIds.includes(box.id)
              ? {
                  ...box,
                  x: Math.max(0, Math.min(pageWidth - 10, box.x + dx)),
                  y: Math.max(0, Math.min(pageHeight - 10, box.y + dy)),
                }
              : box,
          ),
        },
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
    if (readOnly) {
      setSelectedId(box.id);
      return;
    }
    if (event.metaKey || event.ctrlKey) {
      event.preventDefault();
      setSelectedIds((current) =>
        current.includes(box.id)
          ? current.filter((id) => id !== box.id)
          : [...current, box.id],
      );
      return;
    }
    const nextIds = selectedIds.includes(box.id)
      ? [...selectedIds.filter((id) => id !== box.id), box.id]
      : [box.id];
    setSelectedIds(nextIds);
    if (isLockedBox(box)) return;
    event.preventDefault();
    drag.current = {
      id: box.id,
      items: boxes
        .filter((item) => nextIds.includes(item.id) && !isLockedBox(item))
        .map((item) => ({
          id: item.id,
          startX: item.x,
          startY: item.y,
        })),
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
    const primaryItem =
      current.items.find((item) => item.id === current.id) ?? current.items[0];
    const currentBox = boxes.find((box) => box.id === current.id);
    let x = (primaryItem?.startX ?? currentBox?.x ?? 0) +
      (event.clientX - current.pointerX) / zoom;
    let y = (primaryItem?.startY ?? currentBox?.y ?? 0) +
      (event.clientY - current.pointerY) / zoom;
    if (snap) {
      x = Math.round(x / 5) * 5;
      y = Math.round(y / 5) * 5;
    }
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
    const deltaX = x - (primaryItem?.startX ?? currentBox?.x ?? 0);
    const deltaY = y - (primaryItem?.startY ?? currentBox?.y ?? 0);
    const moved = new Map(
      current.items.map((item) => [
        item.id,
        {
          x:
            Math.round(
              Math.max(
                0,
                Math.min(pageWidth - 10, item.startX + deltaX),
              ) * 100,
            ) / 100,
          y:
            Math.round(
              Math.max(
                0,
                Math.min(pageHeight - 10, item.startY + deltaY),
              ) * 100,
            ) / 100,
        },
      ]),
    );
    onChange({
      ...value,
      body: {
        ...(value.body ?? { boxes: [] }),
        boxes: boxes.map((box) =>
          moved.has(box.id) ? { ...box, ...moved.get(box.id) } : box,
        ),
      },
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
      cursor: readOnly || isLockedBox(box) ? 'default' : 'move',
      userSelect: 'none' as const,
      touchAction: 'none' as const,
      zIndex: isSelected(box.id) ? 3 : 1,
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
          <Button type="button" size="sm" variant="outline" onClick={addTextBox} disabled={readOnly}>
            <Plus className="mr-1 h-4 w-4" /> Agregar texto
          </Button>
          <AssetUploadButton
            label="Imagen"
            testId="simple-add-image"
            onUploaded={addImageBox}
            disabled={readOnly}
            size="sm"
          />
          <AssetUploadButton
            label="Fondo"
            testId="simple-add-background"
            onUploaded={setBodyBackground}
            disabled={readOnly}
            size="sm"
          />
          {value.body?.backgroundSvg && !readOnly && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={clearBodyBackground}
            >
              Quitar fondo
            </Button>
          )}
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
            disabled={readOnly || history.current.length === 0}
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
            disabled={readOnly || future.current.length === 0}
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
                        isSelected(box.id)
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                      onClick={(event) => {
                        if (event.metaKey || event.ctrlKey) {
                          setSelectedIds((current) =>
                            current.includes(box.id)
                              ? current.filter((id) => id !== box.id)
                              : [...current, box.id],
                          );
                        } else {
                          setSelectedId(box.id);
                        }
                      }}
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

        <div
          className="min-w-0 overflow-auto rounded-md border border-border bg-muted/40 p-4"
          style={{ touchAction: 'none' }}
          onPointerDown={onCanvasPointerDown}
          onPointerMove={onCanvasPointerMove}
          onPointerUp={onCanvasPointerEnd}
          onPointerCancel={onCanvasPointerEnd}
        >
          <style>{resolveAssetHtml(value.styles ?? '')}</style>
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
                  __html: resolveAssetHtml(value.body?.backgroundSvg ?? ''),
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
              {selectedIds.length > 1 && (() => {
                const bounds = selectionBounds();
                if (!bounds) return null;
                return (
                  <div
                    style={{
                      position: 'absolute',
                      left: `${bounds.left}pt`,
                      top: `${bounds.top}pt`,
                      width: `${Math.max(1, bounds.width)}pt`,
                      height: `${Math.max(1, bounds.height)}pt`,
                      border: '1px dashed #2563eb',
                      zIndex: 4,
                      pointerEvents: 'none',
                    }}
                  >
                    {!readOnly && (
                      <div
                        data-group-resize
                        className="pointer-events-auto absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize rounded-sm border border-primary bg-primary"
                        style={{ touchAction: 'none' }}
                        onPointerDown={startGroupResize}
                        onPointerMove={moveGroupResize}
                        onPointerUp={finishGroupResize}
                        onPointerCancel={finishGroupResize}
                      />
                    )}
                  </div>
                );
              })()}
              {boxes.map((box) => {
                const shown = previewById.get(box.id) ?? box;
                const selectedNow = isSelected(box.id);
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
                        readOnly ||
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
                    {selectedNow &&
                      selectedIds.length === 1 &&
                      !readOnly &&
                      !isLockedBox(box) &&
                      editingId !== box.id && (
                        <div
                          className="absolute -top-8 left-0 flex items-center gap-0.5 rounded-md border border-border bg-background px-1 py-0.5 shadow-sm"
                          style={{ zIndex: 7, pointerEvents: 'auto' }}
                          onPointerDown={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            className={`h-6 w-6 rounded text-xs font-bold ${
                              box.fontWeight === '700' ? 'bg-muted' : ''
                            }`}
                            title="Negrita"
                            onClick={() =>
                              updateBox(box.id, {
                                fontWeight:
                                  box.fontWeight === '700' ? '400' : '700',
                              })
                            }
                          >
                            B
                          </button>
                          <button
                            type="button"
                            className={`h-6 w-6 rounded text-xs italic ${
                              box.fontStyle === 'italic' ? 'bg-muted' : ''
                            }`}
                            title="Cursiva"
                            onClick={() =>
                              updateBox(box.id, {
                                fontStyle:
                                  box.fontStyle === 'italic'
                                    ? 'normal'
                                    : 'italic',
                              })
                            }
                          >
                            I
                          </button>
                          <span className="mx-0.5 h-4 w-px bg-border" />
                          <button
                            type="button"
                            className="h-6 w-6 rounded text-xs"
                            title="Reducir tamaño"
                            onClick={() =>
                              updateBox(box.id, {
                                fontSize: Math.max(6, box.fontSize - 0.5),
                              })
                            }
                          >
                            A-
                          </button>
                          <span className="text-[10px] text-muted-foreground">
                            {box.fontSize}
                          </span>
                          <button
                            type="button"
                            className="h-6 w-6 rounded text-xs"
                            title="Aumentar tamaño"
                            onClick={() =>
                              updateBox(box.id, {
                                fontSize: Math.min(48, box.fontSize + 0.5),
                              })
                            }
                          >
                            A+
                          </button>
                          <span className="mx-0.5 h-4 w-px bg-border" />
                          {(['left', 'center', 'right'] as const).map(
                            (align) => (
                              <button
                                key={align}
                                type="button"
                                className={`h-6 w-6 rounded text-[10px] ${
                                  box.align === align ? 'bg-muted' : ''
                                }`}
                                title={`Alinear ${align}`}
                                onClick={() =>
                                  updateBox(box.id, { align, center: false })
                                }
                              >
                                {align === 'left'
                                  ? 'L'
                                  : align === 'center'
                                    ? 'C'
                                    : 'R'}
                              </button>
                            ),
                          )}
                        </div>
                      )}

                    {selectedNow && selectedIds.length === 1 && !readOnly && !isLockedBox(box) && editingId !== box.id && (
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
                        dangerouslySetInnerHTML={{ __html: resolveAssetHtml(shown.content) }}
                      />
                    ) : box.type === 'image' ? (
                      <img
                        src={assetUrl(shown.content)}
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
            {selectedIds.length > 1 ? (
              <div className="space-y-3 text-xs">
                <p className="text-muted-foreground">
                  {selectedIds.length} elementos seleccionados. Arrastra uno
                  para mover el grupo.
                </p>
                <div className="grid grid-cols-3 gap-1">
                  <Button type="button" size="sm" variant="outline" onClick={() => alignSelection('left')} disabled={readOnly}>Izq.</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => alignSelection('center')} disabled={readOnly}>Centro</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => alignSelection('right')} disabled={readOnly}>Der.</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => alignSelection('top')} disabled={readOnly}>Arriba</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => alignSelection('middle')} disabled={readOnly}>Medio</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => alignSelection('bottom')} disabled={readOnly}>Abajo</Button>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <Button type="button" size="sm" variant="outline" onClick={() => distributeSelection('horizontal')} disabled={readOnly || selectedIds.length < 3}>Distribuir H</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => distributeSelection('vertical')} disabled={readOnly || selectedIds.length < 3}>Distribuir V</Button>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={deleteSelected}
                  disabled={readOnly || selectedIds.length === 0}
                >
                  Eliminar seleccionados
                </Button>
              </div>
            ) : !selected ? (
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
                      disabled={readOnly || isLockedBox(selected)}
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
                      disabled={readOnly || isLockedBox(selected)}
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
                      disabled={readOnly || isLockedBox(selected)}
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
                      disabled={
                        readOnly ||
                        isLockedBox(selected) ||
                        selected.type === 'image'
                      }
                      onChange={(event) =>
                        updateBox(selected.id, {
                          fontSize: Number(event.target.value),
                        })
                      }
                      className="h-8"
                    />
                  </div>
                </div>
                {selected.type === 'image' ? (
                  <div className="space-y-2">
                    <Label className="text-xs">Imagen</Label>
                    <div className="flex items-center gap-2">
                      <img
                        src={assetUrl(selected.content)}
                        alt=""
                        className="h-12 w-20 rounded border border-border bg-muted/30 object-contain"
                      />
                      <AssetUploadButton
                        label="Cambiar imagen"
                        testId="simple-replace-image"
                        onUploaded={(asset) =>
                          updateBox(selected.id, { content: asset.url })
                        }
                        disabled={readOnly || isLockedBox(selected)}
                        size="sm"
                      />
                    </div>
                    <Input
                      value={selected.content}
                      onChange={(event) =>
                        updateBox(selected.id, { content: event.target.value })
                      }
                      aria-label="URL de imagen"
                      disabled={readOnly || isLockedBox(selected)}
                      className="h-8 text-xs"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Ajuste</Label>
                        <select
                          className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                          value={selected.fit ?? 'contain'}
                          onChange={(event) =>
                            updateBox(selected.id, {
                              fit: event.target.value as PageFrameBox['fit'],
                            })
                          }
                          disabled={readOnly || isLockedBox(selected)}
                        >
                          <option value="contain">Contener</option>
                          <option value="cover">Recortar</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Posición</Label>
                        <select
                          className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
                          value={selected.objectPosition ?? 'center'}
                          onChange={(event) =>
                            updateBox(selected.id, {
                              objectPosition: event.target
                                .value as PageFrameBox['objectPosition'],
                            })
                          }
                          disabled={readOnly || isLockedBox(selected)}
                        >
                          <option value="center">Centro</option>
                          <option value="top">Arriba</option>
                          <option value="bottom">Abajo</option>
                          <option value="left">Izquierda</option>
                          <option value="right">Derecha</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Alto (pt)</Label>
                      <Input
                        type="number"
                        value={selected.height ?? 50}
                        onChange={(event) =>
                          updateBox(selected.id, {
                            height: Number(event.target.value),
                          })
                        }
                        disabled={readOnly || isLockedBox(selected)}
                        className="h-8"
                      />
                    </div>
                  </div>
                ) : (
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
                )}
                <div className="flex flex-wrap gap-2 text-xs">
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={
                        selected.fontWeight === '700' ||
                        selected.fontWeight === '900'
                      }
                      disabled={
                        readOnly ||
                        isLockedBox(selected) ||
                        selected.type === 'image'
                      }
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
                      disabled={
                        readOnly ||
                        isLockedBox(selected) ||
                        selected.type === 'image'
                      }
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
                      readOnly || isLockedBox(selected) || selected.type === 'richText'
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
                      readOnly || isLockedBox(selected) || selected.type === 'richText'
                    }
                  >
                    Copiar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={pasteClipboard}
                    disabled={readOnly || !clipboardReady}
                  >
                    Pegar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={deleteSelected}
                    disabled={
                      readOnly || isLockedBox(selected) || selected.type === 'richText'
                    }
                  >
                    Eliminar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => moveLayer(true)}
                    disabled={readOnly}
                  >
                    Al frente
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => moveLayer(false)}
                    disabled={readOnly}
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
