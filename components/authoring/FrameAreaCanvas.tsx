'use client';

import { useMemo, useState } from 'react';
import type { PageFrameArea, PageFrameBox } from '@/lib/types/authoring';
import { assetUrl, resolveAssetHtml } from '@/lib/authoring/assets';

interface FrameAreaCanvasProps {
  area: PageFrameArea;
  widthPt: number;
  heightPt: number;
  onChange: (area: PageFrameArea) => void;
  readOnly?: boolean;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

export function FrameAreaCanvas({
  area,
  widthPt,
  heightPt,
  onChange,
  readOnly = false,
}: FrameAreaCanvasProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const boxes = area.boxes ?? [];

  const updateBox = (id: string, patch: Partial<PageFrameBox>) => {
    onChange({
      ...area,
      boxes: area.boxes.map((box) =>
        box.id === id ? { ...box, ...patch } : box,
      ),
    });
  };

  const beginDrag = (
    event: React.PointerEvent<HTMLDivElement>,
    box: PageFrameBox,
  ) => {
    if (readOnly) return;
    if ((event.target as HTMLElement).dataset.resizeHandle === 'true') return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(box.id);

    const startX = event.clientX;
    const startY = event.clientY;
    const originX = box.x;
    const originY = box.y;
    const maxX = Math.max(0, widthPt - Math.min(box.width, widthPt));
    const maxY = Math.max(0, heightPt - 10);

    const onMove = (moveEvent: PointerEvent) => {
      const x = clamp(originX + (moveEvent.clientX - startX) * 0.75, 0, maxX);
      const y = clamp(originY + (moveEvent.clientY - startY) * 0.75, 0, maxY);
      updateBox(box.id, { x: round(x), y: round(y) });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const beginResize = (
    event: React.PointerEvent<HTMLSpanElement>,
    box: PageFrameBox,
  ) => {
    if (readOnly) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(box.id);

    const startX = event.clientX;
    const startY = event.clientY;
    const startWidth = box.width;
    const startHeight = box.height ?? 50;
    const maxWidth = Math.max(20, widthPt - box.x);
    const maxHeight = Math.max(20, heightPt - box.y);

    const onMove = (moveEvent: PointerEvent) => {
      const width = clamp(
        startWidth + (moveEvent.clientX - startX) * 0.75,
        20,
        maxWidth,
      );
      const height = clamp(
        startHeight + (moveEvent.clientY - startY) * 0.75,
        20,
        maxHeight,
      );
      updateBox(box.id, {
        width: round(width),
        height: round(height),
      });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const background = useMemo(
    () => resolveAssetHtml(area.backgroundSvg ?? ''),
    [area.backgroundSvg],
  );

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Arrastra los elementos sobre el área; usa la tabla para valores exactos.
        Las imágenes muestran un tirador para cambiar su tamaño.
      </p>
      <div className="overflow-auto rounded-md border border-border bg-muted/20 p-3">
        <div
          data-frame-canvas
          className="relative overflow-hidden border border-dashed border-border bg-white"
          style={{ width: `${widthPt}pt`, height: `${heightPt}pt` }}
          onPointerDown={() => setSelectedId(null)}
        >
          <div
            className="pointer-events-none absolute inset-0"
            dangerouslySetInnerHTML={{ __html: background }}
          />
          {boxes.map((box) => {
            const selected = selectedId === box.id;
            const boxStyle: React.CSSProperties = {
              position: 'absolute',
              left: `${box.x}pt`,
              top: `${box.y}pt`,
              width: `${box.width}pt`,
              height: box.height
                ? `${box.height}pt`
                : box.type === 'image'
                  ? '50pt'
                  : undefined,
              fontSize: `${box.fontSize}pt`,
              fontFamily: box.fontFamily,
              fontWeight: box.fontWeight,
              fontStyle: box.fontStyle,
              color: box.color,
              textAlign: box.center ? 'center' : box.align ?? 'left',
              lineHeight: 1.15,
              whiteSpace: box.type === 'richText' ? 'normal' : 'pre-wrap',
              overflow: box.type === 'richText' || box.type === 'image' ? 'hidden' : 'visible',
              opacity: box.opacity ?? 1,
              transform: box.rotation ? `rotate(${box.rotation}deg)` : undefined,
              transformOrigin: 'center',
              cursor: readOnly ? 'default' : 'move',
              outline: selected ? '1px solid #2563eb' : undefined,
              touchAction: 'none',
              userSelect: 'none',
            };

            return (
              <div
                key={box.id}
                data-box-id={box.id}
                style={boxStyle}
                onPointerDown={(event) => beginDrag(event, box)}
              >
                {box.type === 'image' ? (
                  <img
                    src={assetUrl(box.content)}
                    alt=""
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: box.fit === 'cover' ? 'cover' : 'contain',
                      objectPosition: box.objectPosition ?? 'center',
                    }}
                    draggable={false}
                  />
                ) : box.type === 'richText' ||
                  box.type === 'pageNumber' ||
                  box.raw ? (
                  <div
                    dangerouslySetInnerHTML={{
                      __html: resolveAssetHtml(box.content),
                    }}
                  />
                ) : (
                  box.content
                )}
                {selected &&
                  !readOnly &&
                  (box.type === 'image' || box.type === 'richText') && (
                    <span
                      data-resize-handle="true"
                      className="absolute -bottom-1 -right-1 h-2.5 w-2.5 cursor-nwse-resize rounded-sm border border-primary bg-primary"
                      onPointerDown={(event) => beginResize(event, box)}
                    />
                  )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
