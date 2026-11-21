import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { FileUpload } from '../../components/ui/file-upload';

/**
 * One photo slot in the item editor: shows the current image, lets the admin
 * pick a replacement, and previews it immediately. The file is resized in the
 * browser (max 1200px on the long edge) and handed up as a data URL — the
 * mock stores the data URL; the real upload arrives with the PHP backend.
 *
 * When `preserveTransparency` is set (the cutout slot), the resized image is
 * encoded as PNG so the transparent background survives; otherwise JPEG.
 */

const MAX_EDGE = 1200;

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
        resolve(
          preserveTransparency
            ? canvas.toDataURL('image/png')
            : canvas.toDataURL('image/jpeg', 0.85),
        );
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
        hint={hint ?? 'JPG ،PNG یا WebP — حداکثر ۸ مگابایت'}
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
