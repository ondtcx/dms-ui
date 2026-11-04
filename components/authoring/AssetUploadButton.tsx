'use client';

import { useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { authoringService } from '@/lib/services/authoring.service';

export interface UploadedAsset {
  url: string;
  filename: string;
  mimeType: string;
  size: number;
}

interface AssetUploadButtonProps {
  label: string;
  onUploaded: (asset: UploadedAsset) => void;
  accept?: string;
  disabled?: boolean;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'icon';
  className?: string;
  testId?: string;
}

const DEFAULT_ACCEPT =
  'image/png,image/jpeg,image/gif,image/webp,image/svg+xml';

export function AssetUploadButton({
  label,
  onUploaded,
  accept = DEFAULT_ACCEPT,
  disabled = false,
  variant = 'outline',
  size = 'sm',
  className,
  testId,
}: AssetUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file?: File) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen supera los 5 MB');
      return;
    }

    setUploading(true);
    try {
      const asset = await authoringService.uploadAsset(file);
      onUploaded(asset);
    } catch {
      toast.error('No se pudo subir la imagen');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        disabled={disabled || uploading}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Upload className="mr-2 h-4 w-4" />
        )}
        {uploading ? 'Subiendo...' : label}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        aria-label={label}
        data-testid={testId}
        onChange={(event) => handleFile(event.target.files?.[0])}
      />
    </>
  );
}
