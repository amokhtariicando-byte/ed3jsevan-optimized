/**
 * AnimatedContent — scroll-reveal wrapper.
 *
 * Adapted, dependency-free vendoring of React Bits' "Animated Content"
 * (https://reactbits.dev/animations/animated-content, MIT-licensed, original
 * by DavidHDev / react-bits, fetched via the @react-bits shadcn registry).
 *
 * The original is built on GSAP + ScrollTrigger; this version reimplements
 * the same reveal behaviour with IntersectionObserver + CSS transitions and
 * has ZERO dependencies (package.json untouched). Dropped from the original
 * API: GSAP-only features that have no cheap CSS equivalent — scrub,
 * blur/rotate/tilt/wipe effects, child staggering, custom scroller
 * containers, and the disappear-after exit animation. Everything kept
 * (distance, direction, reverse, duration, ease, initialOpacity,
 * animateOpacity, scale, threshold, delay, trigger, once, callbacks)
 * behaves like the original; `rootMargin` is an addition for finer
 * trigger control.
 *
 * Reduced motion: content is shown immediately with no animation when
 * `prefers-reduced-motion` is set (matchMedia check in the effect, plus a
 * `!important` backstop in AnimatedContent.css), so content can never be
 * left hidden. Elements already in view on mount reveal right away
 * (IntersectionObserver fires on observe), and if IntersectionObserver is
 * unavailable the content is shown immediately.
 */
import React, {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import './AnimatedContent.css';

export interface AnimatedContentProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onAnimationStart'> {
  children?: ReactNode;
  /** Travel distance in px from the hidden state (default 100, as original). */
  distance?: number;
  /** Axis of the travel (default 'vertical'). */
  direction?: 'vertical' | 'horizontal';
  /** Flip the travel direction (default false). */
  reverse?: boolean;
  /** Reveal duration in seconds (default 0.8, as original). */
  duration?: number;
  /**
   * Easing: any valid CSS timing function, or a GSAP ease name
   * ('power1.out' … 'power4.out', 'sine.out', 'expo.out', 'circ.out',
   * 'back.out') mapped to its cubic-bezier equivalent.
   * Default: the repo motion token `var(--ease-out)`.
   */
  ease?: string;
  /** Starting opacity (default 0, as original). */
  initialOpacity?: number;
  /** Animate opacity alongside the transform (default true). */
  animateOpacity?: boolean;
  /** Starting scale; 1 means no scaling (default 1). */
  scale?: number;
  /** Fraction of the element that must be visible to trigger (default 0.1). */
  threshold?: number;
  /** IntersectionObserver rootMargin (default '0px'). */
  rootMargin?: string;
  /** Delay before the reveal starts, in seconds (default 0). */
  delay?: number;
  /** 'scroll' reveals on scroll into view; 'mount' reveals on mount. */
  trigger?: 'scroll' | 'mount';
  /** Reveal once and stay visible (default true); false re-hides on exit. */
  once?: boolean;
  onStart?: () => void;
  onComplete?: () => void;
  className?: string;
  style?: CSSProperties;
}

/** GSAP ease names mapped to their CSS cubic-bezier equivalents. */
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

const resolveEase = (ease: string): string =>
  GSAP_EASES[ease] ?? ease;

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
  rootMargin = '0px',
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
  const [visible, setVisible] = useState(false);
  const startedRef = useRef(false);
  const callbacksRef = useRef({ onStart, onComplete });
  callbacksRef.current = { onStart, onComplete };

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const reveal = () => {
      if (!startedRef.current) {
        startedRef.current = true;
        callbacksRef.current.onStart?.();
      }
      setVisible(true);
    };

    // Reduced motion or no IntersectionObserver: show content immediately.
    const reduce =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ??
      false;
    if (reduce || typeof IntersectionObserver === 'undefined') {
      reveal();
      return undefined;
    }

    if (trigger === 'mount') {
      // Wait a frame so the hidden state paints first and the transition runs.
      const raf = requestAnimationFrame(reveal);
      return () => cancelAnimationFrame(raf);
    }

    // IntersectionObserver fires immediately on observe for elements already
    // in view, so above-the-fold content reveals on mount without scrolling.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            reveal();
            if (once) observer.disconnect();
          } else if (!once) {
            setVisible(false);
          }
        }
      },
      { threshold, rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, trigger, once]);

  // Fire onComplete once the transition has had time to finish.
  useEffect(() => {
    if (!visible) return undefined;
    const reduce =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ??
      false;
    if (reduce) {
      callbacksRef.current.onComplete?.();
      return undefined;
    }
    const timer = window.setTimeout(
      () => callbacksRef.current.onComplete?.(),
      (Math.max(delay, 0) + duration) * 1000,
    );
    return () => window.clearTimeout(timer);
  }, [visible, delay, duration]);

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

  const mergedStyle: CSSProperties = {
    opacity: visible ? 1 : animateOpacity ? initialOpacity : 1,
    transform: visible ? 'none' : hiddenTransform,
    transitionProperty: 'opacity, transform',
    transitionDuration: `${duration * 1000}ms`,
    transitionTimingFunction: resolveEase(ease),
    transitionDelay: `${Math.max(delay, 0) * 1000}ms`,
    // Hint the compositor only while hidden/animating; dropped once revealed
    // so dozens of revealed cards don't hold compositor layers forever.
    willChange: visible ? undefined : 'opacity, transform',
    ...style,
  };

  return (
    <div
      ref={ref}
      className={['animated-content', className].filter(Boolean).join(' ')}
      style={mergedStyle}
      {...props}
    >
      {children}
    </div>
  );
};

export default AnimatedContent;
