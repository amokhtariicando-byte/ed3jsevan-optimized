import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { FileUpload } from '../../components/ui/file-upload';

/**
 * One photo slot in the item editor: resizes the image in the browser
 * (max 960px on the long edge) and encodes as compact WebP (which supports
 * both transparency and small file sizes), falling back to PNG/JPEG only on
 * legacy browsers that cannot encode WebP on canvas.
 */

const MAX_EDGE = 960;

function encodeCanvasOptimal(
  canvas: HTMLCanvasElement,
  preserveTransparency: boolean,
): string {
  const webp = canvas.toDataURL('image/webp', 0.84);
  if (webp.startsWith('data:image/webp')) {
    return webp;
  }
  return preserveTransparency
    ? canvas.toDataURL('image/png')
    : canvas.toDataURL('image/jpeg', 0.84);
}

function fileToDataUrl(
  file: File,
  preserveTransparency: boolean,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('خواندن فایل ناموفق بود.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('فایل یک عکس معتبر نیست.'));
      img.onload = () => {
        const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(encodeCanvasOptimal(canvas, preserveTransparency));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export function PhotoSlot({
  label,
  hint,
  imageSrc,
  onFile,
  onRemove,
  preserveTransparency = false,
  tall = false,
}: {
  label: string;
  hint?: string;
  imageSrc: string | undefined;
  onFile: (dataUrl: string) => void;
  onRemove?: () => void;
  preserveTransparency?: boolean;
  tall?: boolean;
}) {
  const [error, setError] = useState('');

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-foreground/90">{label}</p>
      <div
        className={`flex items-center justify-center overflow-hidden rounded-lg border border-border bg-muted ${
          tall ? 'aspect-[3/4]' : 'aspect-square'
        }`}
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt={label}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="flex flex-col items-center gap-2 p-4 text-center text-xs text-muted-foreground">
            <ImageOff className="size-6" />
            عکسی انتخاب نشده است
          </span>
        )}
      </div>
      <FileUpload
        accept="image/*"
        multiple={false}
        maxSize={8 * 1024 * 1024}
        hint={hint ?? 'JPG ،PNG یا WebP — تبدیل خودکار به WebP کم‌حجم'}
        onFiles={(files) => {
          const file = files[0];
          if (!file) return;
          setError('');
          void fileToDataUrl(file, preserveTransparency)
            .then(onFile)
            .catch((err: unknown) => {
              setError(
                err instanceof Error ? err.message : 'خطایی رخ داد.',
              );
            });
        }}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      {imageSrc && onRemove && (
        <Button variant="ghost" size="sm" onClick={onRemove}>
          حذف عکس
        </Button>
      )}
    </div>
  );
}
