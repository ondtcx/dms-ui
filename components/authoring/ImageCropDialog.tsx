'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { authoringService } from '@/lib/services/authoring.service';
import { assetUrl } from '@/lib/authoring/assets';
import type { UploadedAsset } from './AssetUploadButton';

interface ImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  onCropped: (asset: UploadedAsset) => void;
}

interface ImageSize {
  width: number;
  height: number;
  scale: number;
}

interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MAX_WIDTH = 520;
const MAX_HEIGHT = 340;
const LOCAL_ASSET_PREFIX = '/files/active/authoring/assets/';

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function ImageCropDialog({
  open,
  onOpenChange,
  imageUrl,
  onCropped,
}: ImageCropDialogProps) {
  const [image, setImage] = useState<ImageSize | null>(null);
  const [crop, setCrop] = useState<CropRect>({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [saving, setSaving] = useState(false);
  const isLocal = imageUrl.startsWith(LOCAL_ASSET_PREFIX);
  const displayWidth = image ? image.width * image.scale : 0;
  const displayHeight = image ? image.height * image.scale : 0;

  useEffect(() => {
    if (!open) {
      setImage(null);
      setCrop({ x: 0, y: 0, width: 0, height: 0 });
      setSaving(false);
    }
  }, [open]);

  const handleLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    const target = event.currentTarget;
    const width = target.naturalWidth;
    const height = target.naturalHeight;
    if (!width || !height) return;
    const scale = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height, 1);
    setImage({ width, height, scale });
    setCrop({ x: 0, y: 0, width: width * scale, height: height * scale });
  };

  const startMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!image) return;
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startY = event.clientY;
    const startCrop = { ...crop };
    const onMove = (moveEvent: PointerEvent) => {
      const x = clamp(
        startCrop.x + (moveEvent.clientX - startX),
        0,
        displayWidth - startCrop.width,
      );
      const y = clamp(
        startCrop.y + (moveEvent.clientY - startY),
        0,
        displayHeight - startCrop.height,
      );
      setCrop({ ...startCrop, x, y });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const startResize = (event: React.PointerEvent<HTMLSpanElement>) => {
    if (!image) return;
    event.preventDefault();
    event.stopPropagation();
    const startX = event.clientX;
    const startY = event.clientY;
    const startCrop = { ...crop };
    const onMove = (moveEvent: PointerEvent) => {
      const width = clamp(
        startCrop.width + (moveEvent.clientX - startX),
        20,
        displayWidth - startCrop.x,
      );
      const height = clamp(
        startCrop.height + (moveEvent.clientY - startY),
        20,
        displayHeight - startCrop.y,
      );
      setCrop({ ...startCrop, width, height });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const confirm = async () => {
    if (!image || !isLocal) return;
    const x = Math.max(0, Math.round(crop.x / image.scale));
    const y = Math.max(0, Math.round(crop.y / image.scale));
    const width = Math.max(
      1,
      Math.min(image.width - x, Math.round(crop.width / image.scale)),
    );
    const height = Math.max(
      1,
      Math.min(image.height - y, Math.round(crop.height / image.scale)),
    );

    setSaving(true);
    try {
      const asset = await authoringService.cropAsset({
        url: imageUrl,
        x,
        y,
        width,
        height,
      });
      onCropped(asset);
      onOpenChange(false);
    } catch {
      toast.error('No se pudo recortar la imagen');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Recortar imagen</DialogTitle>
          <DialogDescription>
            Ajusta el recuadro y confirma. Se guardará una imagen nueva; la
            original se conserva.
          </DialogDescription>
        </DialogHeader>

        {!isLocal ? (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Solo se pueden recortar imágenes subidas a la plantilla.
          </p>
        ) : (
          <div className="space-y-2">
            <div
              className="relative mx-auto overflow-hidden rounded-md border border-border bg-muted/20"
              style={{
                width: displayWidth || 320,
                height: displayHeight || 200,
              }}
            >
              <img
                src={assetUrl(imageUrl)}
                alt=""
                className="h-full w-full object-contain"
                draggable={false}
                onLoad={handleLoad}
              />
              {image && (
                <div
                  className="absolute border-2 border-white"
                  style={{
                    left: crop.x,
                    top: crop.y,
                    width: crop.width,
                    height: crop.height,
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)',
                    cursor: 'move',
                  }}
                  onPointerDown={startMove}
                >
                  <span
                    data-resize-handle="true"
                    className="absolute -bottom-1.5 -right-1.5 h-3 w-3 cursor-nwse-resize rounded-sm border border-primary bg-primary"
                    onPointerDown={startResize}
                  />
                </div>
              )}
            </div>
            {image && (
              <p className="text-xs text-muted-foreground">
                Imagen: {image.width} × {image.height} px · recorte:{' '}
                {Math.round(crop.width / image.scale)} ×{' '}
                {Math.round(crop.height / image.scale)} px
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={confirm}
            disabled={!isLocal || !image || saving}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Recortar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
