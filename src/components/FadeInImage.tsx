import React, { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from '../utils/motion';

/**
 * FadeInImage — onLoad-driven opacity fade (zero-flash, minimal re-renders).
 *
 * - `loadedSrcs` remembers every src that has finished loading anywhere in
 *   the app so remounts, item steps, and category switches render immediately
 *   at opacity 1 with zero extra renders.
 * - Fallback swaps at most once per requested `src` without chained effects.
 */

const loadedSrcs = new Set<string>();
const decodedSrcs = new Set<string>();

const FADE_MS = 180;

/**
 * Preload and pre-decode an image off the main animation path so the first
 * frame it enters the viewport (e.g. entering 3D Front View) never drops frames.
 */
export function preloadAndDecodeImage(src: string): void {
  if (!src || decodedSrcs.has(src)) return;
  decodedSrcs.add(src);
  const img = new Image();
  img.decoding = 'async';
  img.src = src;
  const markLoaded = () => {
    loadedSrcs.add(src);
  };
  if (typeof img.decode === 'function') {
    img.decode().then(markLoaded).catch(() => {
      // Fallback: if decode rejects (e.g. aborted or unsupported), allow retry later
      decodedSrcs.delete(src);
    });
  } else {
    img.onload = markLoaded;
  }
}

/**
 * Maps a full-size menu photo URL to its 256px thumb variant:
 * `src/assets/images/<name>.webp` → `src/assets/images/thumbs/<name>.webp`.
 */
export function toThumbSrc(src: string): string {
  const prefix = 'src/assets/images/';
  if (!src.startsWith(prefix)) return src;
  const rest = src.slice(prefix.length);
  if (rest.includes('/')) return src;
  return `${prefix}thumbs/${rest}`;
}

/**
 * Maps a desktop cutout image URL to its mobile-sized WebP variant:
 * `src/assets/images/cutouts/<name>.webp` → `src/assets/images/cutouts/mobile/<name>.webp`.
 * Passes through external/backend URLs unchanged so backend uploads keep working.
 */
export function toMobileCutoutSrc(src: string): string {
  const prefix = 'src/assets/images/cutouts/';
  if (!src.startsWith(prefix)) return src;
  const rest = src.slice(prefix.length);
  if (rest.includes('/')) return src;
  return `${prefix}mobile/${rest}`;
}

/**
 * Returns true if the URL is one of our pre-baked RGBA topdown plates
 * (which already have brightness/contrast/radial-alpha baked into the WebP
 * so the GPU doesn't need live mix-blend-mode + filter + mask-image).
 */
export function isPrebakedTopdownSrc(src: string): boolean {
  return (
    src.startsWith('src/assets/images/topdown_') ||
    src.startsWith('src/assets/images/thumbs/topdown_')
  );
}

/** Intrinsic desktop dimensions of bundled cutouts to prevent layout shift. */
const CUTOUT_DIMENSIONS: Record<string, { width: number; height: number }> = {
  'berry_shake.webp': { width: 199, height: 540 },
  'blue_spirulina.webp': { width: 190, height: 540 },
  'choco_shake.webp': { width: 199, height: 540 },
  'green_mojito.webp': { width: 247, height: 540 },
  'hot_espresso.webp': { width: 688, height: 513 },
  'hot_latte.webp': { width: 806, height: 511 },
  'hot_mocha.webp': { width: 806, height: 511 },
  'iced_espresso.webp': { width: 190, height: 540 },
  'iced_latte.webp': { width: 190, height: 540 },
  'matcha_latte.webp': { width: 190, height: 540 },
  'persian_cold.webp': { width: 247, height: 540 },
  'persian_tea.webp': { width: 603, height: 514 },
  'red_mocktail.webp': { width: 254, height: 540 },
  'strawberry_matcha.webp': { width: 190, height: 540 },
};

export function getCutoutDimensions(
  src: string,
): { width: number; height: number } | undefined {
  const filename = src.split('/').pop();
  return filename ? CUTOUT_DIMENSIONS[filename] : undefined;
}

interface FadeInImageProps
  extends Omit<
    React.ImgHTMLAttributes<HTMLImageElement>,
    'onLoad' | 'src' | 'alt'
  > {
  src: string;
  alt: string;
  /**
   * Backup image used if `src` fails to load. Swaps at most once; a
   * failure of the fallback itself is handed to `onError` (if any).
   */
  fallbackSrc?: string;
}

export const FadeInImage: React.FC<FadeInImageProps> = ({
  src,
  alt,
  fallbackSrc,
  className,
  style,
  onError,
  ...rest
}) => {
  // Track which requested `src` has already fallen back (single-state, zero effect cascade)
  const [failedForSrc, setFailedForSrc] = useState<string | null>(null);
  const currentSrc =
    failedForSrc === src && fallbackSrc && fallbackSrc !== src
      ? fallbackSrc
      : src;

  const isAlreadyLoaded =
    loadedSrcs.has(currentSrc) || prefersReducedMotion();
  const [loadedSrcState, setLoadedSrcState] = useState<string | null>(
    isAlreadyLoaded ? currentSrc : null,
  );
  const imgRef = useRef<HTMLImageElement | null>(null);

  const loaded = isAlreadyLoaded || loadedSrcState === currentSrc;

  useEffect(() => {
    if (loaded) return;
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) {
      loadedSrcs.add(currentSrc);
      setLoadedSrcState(currentSrc);
    }
  }, [currentSrc, loaded]);

  const handleLoad = () => {
    loadedSrcs.add(currentSrc);
    setLoadedSrcState(currentSrc);
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    if (fallbackSrc && failedForSrc !== src && currentSrc !== fallbackSrc) {
      setFailedForSrc(src);
      return;
    }
    onError?.(e);
  };

  return (
    <img
      ref={imgRef}
      src={currentSrc}
      alt={alt}
      onLoad={handleLoad}
      onError={handleError}
      className={className}
      style={{
        opacity: loaded ? 1 : 0,
        transition: loaded ? undefined : `opacity ${FADE_MS}ms ease-out`,
        ...style,
      }}
      {...rest}
    />
  );
};
