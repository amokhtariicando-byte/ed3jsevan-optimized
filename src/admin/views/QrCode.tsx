import { useRef, useState } from 'react';
import { FileDown, ImageDown, Loader2 } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Alert } from '../../components/ui/alert';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { CopyButton } from '../../components/ui/copy-button';
import { QRCode } from '../../components/ui/qr-code';
import { useToast } from '../../components/ui/toast';

/** دامنه موقت تا زمانی که دامنه نهایی مشخص شود. */
const MENU_URL = 'https://eyvan.cafe';

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** QR کد منو: نمایش، کپی لینک و دانلود SVG / PNG. */
export function QrCodeView() {
  const { toast } = useToast();
  const qrRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState<'svg' | 'png' | null>(null);

  const serializeQr = (): string | null => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return null;
    return new XMLSerializer().serializeToString(svg);
  };

  const downloadSvg = () => {
    setDownloading('svg');
    try {
      const markup = serializeQr();
      if (!markup) throw new Error('svg-not-found');
      downloadBlob(
        new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }),
        'eyvan-qr.svg',
      );
      toast({ title: 'فایل SVG دانلود شد', variant: 'success' });
    } catch {
      toast({ title: 'دانلود SVG ناموفق بود', variant: 'error' });
    } finally {
      setDownloading(null);
    }
  };

  const downloadPng = () => {
    const markup = serializeQr();
    if (!markup) {
      toast({ title: 'دانلود PNG ناموفق بود', variant: 'error' });
      return;
    }
    setDownloading('png');
    const url = URL.createObjectURL(
      new Blob([markup], { type: 'image/svg+xml;charset=utf-8' }),
    );
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('no-context');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
          setDownloading(null);
          if (!blob) {
            toast({ title: 'دانلود PNG ناموفق بود', variant: 'error' });
            return;
          }
          downloadBlob(blob, 'eyvan-qr.png');
          toast({ title: 'فایل PNG دانلود شد', variant: 'success' });
        }, 'image/png');
      } catch {
        setDownloading(null);
        toast({ title: 'دانلود PNG ناموفق بود', variant: 'error' });
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      setDownloading(null);
      toast({ title: 'دانلود PNG ناموفق بود', variant: 'error' });
    };
    img.src = url;
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="QR کد منو"
        description="کد QR را چاپ کنید و روی میزها بگذارید تا مشتریان با اسکن آن به منو برسند."
      />

      <Alert variant="info">
        دامنه نهایی بعداً جایگزین می‌شود؛ QR فعلی با دامنه موقت ساخته شده است.
      </Alert>

      <Card className="mx-auto max-w-md bg-white">
        <CardContent className="flex flex-col items-center gap-5 pt-5">
          <div ref={qrRef} className="bg-white">
            <QRCode value={MENU_URL} size={220} color="#2F321C" rounded />
          </div>
          <p dir="ltr" className="text-sm text-muted-foreground">
            {MENU_URL}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              variant="outline"
              onClick={downloadSvg}
              disabled={downloading !== null}
            >
              {downloading === 'svg' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <FileDown className="size-4" />
              )}
              دانلود SVG
            </Button>
            <Button
              variant="outline"
              onClick={downloadPng}
              disabled={downloading !== null}
            >
              {downloading === 'png' ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <ImageDown className="size-4" />
              )}
              دانلود PNG
            </Button>
            <CopyButton value={MENU_URL} variant="outline">
              کپی لینک منو
            </CopyButton>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
