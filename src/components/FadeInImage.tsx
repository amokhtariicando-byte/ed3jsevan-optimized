import React, { useEffect, useRef, useState } from 'react';

/**
 * FadeInImage — onLoad-driven opacity fade (P0-4) for customer images.
 *
 * Images used to pop in with no transition (0 onLoad handlers anywhere).
 * This component starts each image at opacity 0 and fades it in over
 * 200ms once it has loaded. Opacity ONLY — never a transform transition,
 * so it is safe on rAF-driven stage elements (paintFrame in
 * RotaryTableStage writes opacity/transform to the plate buttons and seat
 * wrappers, never to the <img> elements themselves, so this fade never
 * fights a per-frame write).
 *
 * The fade runs ONCE per image load, never again on remount, item step, or
 * category switch: `loadedSrcs` remembers every src that has finished
 * loading anywhere in the app, and a src in that set renders at full
 * opacity immediately. Reduced-motion users skip the fade entirely.
 *
 * Attribute passthrough (P2-8): the props extend
 * `React.ImgHTMLAttributes`, so `width`, `height`, `loading`,
 * `fetchPriority`, `decoding`, `referrerPolicy`, `draggable`, etc. pass
 * straight through to the <img>. Callers SHOULD pass `width`/`height`
 * (intrinsic pixel size of `src`) to reserve the aspect ratio and prevent
 * layout shift, and may pass `fetchPriority="high"` for hero images
 * (React 19 prop name — camelCase).
 *
 * Fallback (P1-3): pass `fallbackSrc` to swap to a backup image if `src`
 * fails to load — e.g. the full-size photo when a 256px thumb 404s because
 * the thumbs haven't been uploaded yet. The swap happens AT MOST ONCE per
 * requested src: if the fallback also errors, the caller's `onError` runs
 * (if any) and no further swap is attempted, so an error can never loop.
 */

const loadedSrcs = new Set<string>();

const FADE_MS = 200;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}

/**
 * Maps a full-size menu photo URL to its 256px thumb variant (P1-3):
 * `src/assets/images/<name>.webp` → `src/assets/images/thumbs/<name>.webp`.
 * Thumbs keep the source basename; the front thumbs are 256×191 and the
 * topdown thumbs 256×256. Returns the input unchanged for anything that
 * isn't a flat file directly under `src/assets/images/` (absolute/CDN
 * URLs, already-a-thumb paths, and nested assets such as `cutouts/`
 * pass through untouched), so the mapping is idempotent and can never
 * mangle a URL it doesn't recognise.
 */
export function toThumbSrc(src: string): string {
  const prefix = 'src/assets/images/';
  if (!src.startsWith(prefix)) return src;
  const rest = src.slice(prefix.length);
  // Nested path (cutouts/, thumbs/, …) — not a flat full-size photo.
  if (rest.includes('/')) return src;
  return `${prefix}thumbs/${rest}`;
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
  // The src actually rendered: `src` until it errors, then `fallbackSrc`.
  const [currentSrc, setCurrentSrc] = useState(src);
  // Whether the one allowed fallback swap has already been spent.
  const [fellBack, setFellBack] = useState(false);
  const [loaded, setLoaded] = useState<boolean>(
    () => loadedSrcs.has(src) || prefersReducedMotion(),
  );
  const imgRef = useRef<HTMLImageElement | null>(null);

  // A new requested src resets the fallback: the one-swap budget is
  // per-src, so a fresh image gets a fresh fallback attempt.
  useEffect(() => {
    setCurrentSrc(src);
    setFellBack(false);
  }, [src]);

  useEffect(() => {
    if (loadedSrcs.has(currentSrc) || prefersReducedMotion()) {
      setLoaded(true);
      return;
    }
    setLoaded(false);
    // A cached image can finish loading before React attaches onLoad; the
    // `complete` check catches those so they never sit invisible.
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) {
      loadedSrcs.add(currentSrc);
      setLoaded(true);
    }
  }, [currentSrc]);

  const handleLoad = () => {
    loadedSrcs.add(currentSrc);
    setLoaded(true);
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    // Swap at most once: after the fallback, a second error goes to the
    // caller's onError (or nowhere) — never back to the failed src, so
    // this can never ping-pong between two broken URLs.
    if (fallbackSrc && !fellBack && currentSrc !== fallbackSrc) {
      setFellBack(true);
      setCurrentSrc(fallbackSrc);
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
        transition: `opacity ${FADE_MS}ms ease-out`,
        // A caller-supplied `transition` replaces the fade-only one — used
        // by card thumbs, whose hover scale needs its transform transition
        // carried in the same property.
        ...style,
      }}
      {...rest}
    />
  );
};
