import { useEffect } from 'react';

let cachedMql: MediaQueryList | null = null;
let cachedReduced = false;

function initReducedMotion(): void {
  if (cachedMql || typeof window === 'undefined' || !window.matchMedia) return;
  cachedMql = window.matchMedia('(prefers-reduced-motion: reduce)');
  cachedReduced = cachedMql.matches;
  const onChange = (e: MediaQueryListEvent) => {
    cachedReduced = e.matches;
  };
  if (typeof cachedMql.addEventListener === 'function') {
    cachedMql.addEventListener('change', onChange);
  } else if (typeof cachedMql.addListener === 'function') {
    cachedMql.addListener(onChange);
  }
}

/**
 * Cached `prefers-reduced-motion: reduce` check.
 * Avoids repeatedly allocating MediaQueryList objects during renders,
 * pointer events, or rAF callbacks while staying reactive to OS changes.
 */
export function prefersReducedMotion(): boolean {
  initReducedMotion();
  return cachedReduced;
}

// Reference-counted body scroll lock so nested/overlapping overlays
// (e.g. drawer + modal) never prematurely unlock background scrolling.
let scrollLockCount = 0;
let savedOverflow = '';
let savedPaddingRight = '';

/**
 * Locks background page scroll while an overlay/drawer/modal is open.
 * Compensates for scrollbar width on desktop to prevent horizontal layout shift.
 */
export function useBodyScrollLock(locked: boolean): void {
  useEffect(() => {
    if (!locked || typeof document === 'undefined') return;

    if (scrollLockCount === 0) {
      const body = document.body;
      const docEl = document.documentElement;
      savedOverflow = body.style.overflow;
      savedPaddingRight = body.style.paddingRight;

      const scrollbarWidth = window.innerWidth - docEl.clientWidth;
      body.style.overflow = 'hidden';
      if (scrollbarWidth > 0) {
        body.style.paddingRight = `${scrollbarWidth}px`;
      }
    }
    scrollLockCount += 1;

    return () => {
      scrollLockCount = Math.max(0, scrollLockCount - 1);
      if (scrollLockCount === 0) {
        document.body.style.overflow = savedOverflow;
        document.body.style.paddingRight = savedPaddingRight;
      }
    };
  }, [locked]);
}
