'use client';

import { useMemo, useRef, useState } from 'react';
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
  const canvasRef = useRef<HTMLDivElement>(null);
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
    if ((event.target as HTMLElement).dataset.rotateHandle === 'true') return;
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

  const beginRotate = (
    event: React.PointerEvent<HTMLSpanElement>,
    box: PageFrameBox,
  ) => {
    if (readOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(box.id);

    const rect = canvas.getBoundingClientRect();
    const pxPerPt = widthPt > 0 ? rect.width / widthPt : 1;
    const centerX = rect.left + (box.x + box.width / 2) * pxPerPt;
    const centerY = rect.top + (box.y + (box.height ?? 50) / 2) * pxPerPt;

    const onMove = (moveEvent: PointerEvent) => {
      let angle =
        (Math.atan2(
          moveEvent.clientY - centerY,
          moveEvent.clientX - centerX,
        ) *
          180) /
          Math.PI +
        90;
      if (moveEvent.shiftKey) {
        angle = Math.round(angle / 15) * 15;
      }
      while (angle > 180) angle -= 360;
      while (angle < -180) angle += 360;
      updateBox(box.id, { rotation: round(angle) });
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
          ref={canvasRef}
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
                {selected && !readOnly && box.type === 'image' && (
                  <span
                    data-rotate-handle="true"
                    className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 cursor-grab rounded-full border border-primary bg-background"
                    style={{ zIndex: 4 }}
                    title="Girar"
                    onPointerDown={(event) => beginRotate(event, box)}
                  />
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
