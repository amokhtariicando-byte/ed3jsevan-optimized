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
 */

const loadedSrcs = new Set<string>();

const FADE_MS = 200;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}

interface FadeInImageProps
  extends Omit<
    React.ImgHTMLAttributes<HTMLImageElement>,
    'onLoad' | 'src' | 'alt'
  > {
  src: string;
  alt: string;
}

export const FadeInImage: React.FC<FadeInImageProps> = ({
  src,
  alt,
  className,
  style,
  onError,
  ...rest
}) => {
  const [loaded, setLoaded] = useState<boolean>(
    () => loadedSrcs.has(src) || prefersReducedMotion(),
  );
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (loadedSrcs.has(src) || prefersReducedMotion()) {
      setLoaded(true);
      return;
    }
    setLoaded(false);
    // A cached image can finish loading before React attaches onLoad; the
    // `complete` check catches those so they never sit invisible.
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) {
      loadedSrcs.add(src);
      setLoaded(true);
    }
  }, [src]);

  const handleLoad = () => {
    loadedSrcs.add(src);
    setLoaded(true);
  };

  return (
    <img
      ref={imgRef}
      src={src}
      alt={alt}
      onLoad={handleLoad}
      onError={onError}
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
