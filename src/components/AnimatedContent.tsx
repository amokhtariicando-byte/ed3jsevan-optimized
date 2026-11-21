/**
 * AnimatedContent — zero-React-render scroll-reveal wrapper.
 *
 * Uses module-level shared IntersectionObservers (one for reveal, one for
 * pre-warm) and toggles `data-revealed="true"` + `will-change` directly on the
 * DOM element instead of calling React `setState`. Scrolling through 80+ cards
 * in SimpleMenuView triggers ZERO React re-renders for locked 60/120fps scroll.
 */
import React, {
  useEffect,
  useRef,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { prefersReducedMotion } from '../utils/motion';
import './AnimatedContent.css';

export interface AnimatedContentProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onAnimationStart'> {
  children?: ReactNode;
  distance?: number;
  direction?: 'vertical' | 'horizontal';
  reverse?: boolean;
  duration?: number;
  ease?: string;
  initialOpacity?: number;
  animateOpacity?: boolean;
  scale?: number;
  threshold?: number;
  rootMargin?: string;
  delay?: number;
  trigger?: 'scroll' | 'mount';
  once?: boolean;
  onStart?: () => void;
  onComplete?: () => void;
  className?: string;
  style?: CSSProperties;
}

const GSAP_EASES: Record<string, string> = {
  'power1.out': 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  'power2.out': 'cubic-bezier(0.215, 0.61, 0.355, 1)',
  'power3.out': 'cubic-bezier(0.165, 0.84, 0.44, 1)',
  'power4.out': 'cubic-bezier(0.23, 1, 0.32, 1)',
  'sine.out': 'cubic-bezier(0.39, 0.575, 0.565, 1)',
  'expo.out': 'cubic-bezier(0.19, 1, 0.22, 1)',
  'circ.out': 'cubic-bezier(0.075, 0.82, 0.165, 1)',
  'back.out': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
};

const DEFAULT_EASE = 'var(--ease-out, cubic-bezier(0.215, 0.61, 0.355, 1))';
const resolveEase = (ease: string): string => GSAP_EASES[ease] ?? ease;

const DEFAULT_ROOT_MARGIN = '0px 0px 100px 0px';
const PREWARM_ROOT_MARGIN = '0px 0px 360px 0px';

interface SharedObserverEntry {
  observer: IntersectionObserver;
  callbacks: Map<Element, (isIntersecting: boolean) => void>;
}

const sharedObservers = new Map<string, SharedObserverEntry>();

function getSharedObserver(
  threshold: number,
  rootMargin: string,
): SharedObserverEntry {
  const key = `${threshold}|${rootMargin}`;
  let entry = sharedObservers.get(key);
  if (!entry) {
    const callbacks = new Map<Element, (isIntersecting: boolean) => void>();
    const observer = new IntersectionObserver(
      (ioEntries) => {
        for (const ioEntry of ioEntries) {
          callbacks.get(ioEntry.target)?.(ioEntry.isIntersecting);
        }
      },
      { threshold, rootMargin },
    );
    entry = { observer, callbacks };
    sharedObservers.set(key, entry);
  }
  return entry;
}

export const AnimatedContent: React.FC<AnimatedContentProps> = ({
  children,
  distance = 100,
  direction = 'vertical',
  reverse = false,
  duration = 0.8,
  ease = DEFAULT_EASE,
  initialOpacity = 0,
  animateOpacity = true,
  scale = 1,
  threshold = 0.1,
  rootMargin = DEFAULT_ROOT_MARGIN,
  delay = 0,
  trigger = 'scroll',
  once = true,
  onStart,
  onComplete,
  className = '',
  style,
  ...props
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const callbacksRef = useRef({ onStart, onComplete });
  callbacksRef.current = { onStart, onComplete };

  const immediate =
    prefersReducedMotion() || typeof IntersectionObserver === 'undefined';

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    let settleTimer: number | undefined;
    let settled = false;
    let started = false;

    const reveal = () => {
      if (!started) {
        started = true;
        callbacksRef.current.onStart?.();
      }
      el.setAttribute('data-revealed', 'true');
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(
        () => {
          settled = true;
          el.style.willChange = '';
          callbacksRef.current.onComplete?.();
        },
        (Math.max(delay, 0) + duration) * 1000 + 40,
      );
    };

    if (immediate) {
      el.setAttribute('data-revealed', 'true');
      callbacksRef.current.onStart?.();
      callbacksRef.current.onComplete?.();
      return undefined;
    }

    if (trigger === 'mount') {
      el.style.willChange = 'opacity, transform';
      const raf = requestAnimationFrame(reveal);
      return () => {
        cancelAnimationFrame(raf);
        window.clearTimeout(settleTimer);
      };
    }

    const revealEntry = getSharedObserver(threshold, rootMargin);
    const prewarmEntry = getSharedObserver(0, PREWARM_ROOT_MARGIN);

    const onRevealIntersect = (isIntersecting: boolean) => {
      if (isIntersecting) {
        reveal();
        if (once) {
          revealEntry.observer.unobserve(el);
          revealEntry.callbacks.delete(el);
          prewarmEntry.observer.unobserve(el);
          prewarmEntry.callbacks.delete(el);
        }
      } else if (!once) {
        settled = false;
        window.clearTimeout(settleTimer);
        el.removeAttribute('data-revealed');
      }
    };

    const onPrewarmIntersect = (isIntersecting: boolean) => {
      if (isIntersecting && !settled) {
        el.style.willChange = 'opacity, transform';
      } else if (!isIntersecting) {
        el.style.willChange = '';
      }
    };

    revealEntry.callbacks.set(el, onRevealIntersect);
    revealEntry.observer.observe(el);
    prewarmEntry.callbacks.set(el, onPrewarmIntersect);
    prewarmEntry.observer.observe(el);

    return () => {
      window.clearTimeout(settleTimer);
      revealEntry.observer.unobserve(el);
      revealEntry.callbacks.delete(el);
      prewarmEntry.observer.unobserve(el);
      prewarmEntry.callbacks.delete(el);
    };
  }, [threshold, rootMargin, trigger, once, delay, duration, immediate]);

  const sign = reverse ? -1 : 1;
  const offset = distance * sign;
  const hiddenTransform = [
    direction === 'horizontal'
      ? `translate3d(${offset}px, 0, 0)`
      : `translate3d(0, ${offset}px, 0)`,
    scale !== 1 ? `scale(${scale})` : '',
  ]
    .filter(Boolean)
    .join(' ');

  const cssVars = {
    '--ac-initial-opacity': animateOpacity ? initialOpacity : 1,
    '--ac-hidden-transform': hiddenTransform,
    '--ac-duration': `${duration * 1000}ms`,
    '--ac-ease': resolveEase(ease),
    '--ac-delay': `${Math.max(delay, 0) * 1000}ms`,
    ...style,
  } as CSSProperties;

  return (
    <div
      ref={ref}
      data-revealed={immediate ? 'true' : undefined}
      className={['animated-content', className].filter(Boolean).join(' ')}
      style={cssVars}
      {...props}
    >
      {children}
    </div>
  );
};

export default AnimatedContent;
