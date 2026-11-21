import React, {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { MenuCategory, MenuItem } from '../data/menuData';
import {
  calculateItemPrice,
  computeShortestWheelAngle,
  getDefaultBean,
  getWheelSlotPosition,
} from '../utils/menuLogic';
import {
  easeInOutCubic,
  easeSoftOut,
  projectTableSeat,
} from '../utils/tableProjection';
import { EyvanLogo } from './EyvanLogo';
import {
  FadeInImage,
  getCutoutDimensions,
  isPrebakedTopdownSrc,
  preloadAndDecodeImage,
  toMobileCutoutSrc,
  toThumbSrc,
} from './FadeInImage';
import { prefersReducedMotion } from '../utils/motion';
import { getDeviceProfile } from '../utils/deviceTier';
import { useLanguage } from '../i18n/LanguageContext';

export type CameraAngle = 'top' | 'front';

interface RotaryTableStageProps {
  category: MenuCategory;
  items: MenuItem[];
  activeIndex: number;
  overviewMode: boolean;
  cameraAngle: CameraAngle;
  drawerOpen: boolean;
  onSelectIndex: (index: number) => void;
  onStep: (delta: number) => void;
  onExitOverviewToIndex: (index: number) => void;
  onChangeCameraAngle: (angle: CameraAngle) => void;
}

interface AnimatedCameraState {
  wheelAngle: number;
  pitch: number;
  cx: number;
  cy: number;
  scale: number;
  perspective: number;
}

const FOCAL_ANGLE_DEG = 180; // 6 o'clock front-center in BOTH top-down and eye-level modes

/** Smooth Hermite interpolation for natural camera cross-dissolve curves. */
function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * Cached style writer: skips the DOM write when the value is unchanged for
 * that element+property. WeakMap entries die with the element, so no cleanup
 * is needed when seats unmount/remount.
 */
const styleCache = new WeakMap<HTMLElement, Record<string, string>>();

function writeStyle(
  el: HTMLElement | null,
  prop: 'transform' | 'opacity' | 'zIndex' | 'pointerEvents' | 'visibility',
  value: string,
): void {
  if (!el) return;
  let cache = styleCache.get(el);
  if (!cache) {
    cache = {};
    styleCache.set(el, cache);
  }
  if (cache[prop] === value) return;
  cache[prop] = value;
  (el.style as unknown as Record<string, string>)[prop] = value;
}

/**
 * Numeric-keyed style writer (P2-3): compares the numeric inputs BEFORE
 * building the CSS string, so a frame where a value didn't move allocates
 * no string and touches no DOM. `writeStyle` builds the string first and
 * lets the dirty check discard it — during a top-view wheel turn ~25 of
 * ~27 strings per frame were built then thrown away (only the disc angle
 * actually moves).
 *
 * Exact numeric equality is used: equal numbers always format equally, so
 * a skipped write is never wrong. A value that moved below the format's
 * precision may rarely re-write an identical string — harmless.
 *
 * RULE: a given (element, prop) pair must be written through exactly ONE
 * of `writeStyle` / `writeStyleNums`, or the two caches desync. In
 * paintFrame, numeric-derived values use this helper and only the literal
 * strings ('none'/'auto', 'visible'/'hidden') use `writeStyle`.
 */
const styleNumsCache = new WeakMap<
  HTMLElement,
  Record<string, readonly number[]>
>();

function writeStyleNums(
  el: HTMLElement | null,
  prop: 'transform' | 'opacity' | 'zIndex',
  nums: readonly number[],
  build: () => string,
): void {
  if (!el) return;
  let cache = styleNumsCache.get(el);
  if (!cache) {
    cache = {};
    styleNumsCache.set(el, cache);
  }
  const prev = cache[prop];
  if (prev !== undefined && prev.length === nums.length) {
    let same = true;
    for (let i = 0; i < nums.length; i++) {
      if (prev[i] !== nums[i]) {
        same = false;
        break;
      }
    }
    if (same) return;
  }
  cache[prop] = nums;
  (el.style as unknown as Record<string, string>)[prop] = build();
}



/**
 * Wraps an angle delta to (-180, 180] so a drag crossing the ±180° seam
 * doesn't jump the wheel.
 */
function wrapDeltaDeg(delta: number): number {
  return ((delta + 540) % 360) - 180;
}

/**
 * Pointer angle in degrees around a center point, in screen coordinates
 * (y down), so increasing angle = clockwise — the same sense as rotateZ.
 */
function pointerAngleDeg(
  clientX: number,
  clientY: number,
  centerX: number,
  centerY: number,
): number {
  return (Math.atan2(clientY - centerY, clientX - centerX) * 180) / Math.PI;
}

/**
 * Returns a subtle colored caustic light-bounce RGBA for translucent iced glassware on white marble.
 */
function getGlassCausticTint(cutoutPath: string): string | null {
  if (cutoutPath.includes('red_mocktail') || cutoutPath.includes('berry_shake')) {
    return 'rgba(186, 36, 56, 0.22)';
  }
  if (
    cutoutPath.includes('green_mojito') ||
    cutoutPath.includes('matcha_latte') ||
    cutoutPath.includes('strawberry_matcha')
  ) {
    return 'rgba(54, 152, 74, 0.18)';
  }
  if (cutoutPath.includes('blue_spirulina')) {
    return 'rgba(38, 122, 178, 0.2)';
  }
  if (
    cutoutPath.includes('iced_latte') ||
    cutoutPath.includes('persian_cold') ||
    cutoutPath.includes('choco_shake')
  ) {
    return 'rgba(175, 126, 62, 0.17)';
  }
  return null;
}

/**
 * Builds a single zero-blur multi-stop CSS radial-gradient background combining:
 * 1) Crisp tight ambient-occlusion contact seam directly under the vessel rim
 * 2) Optional subtle refracted glass caustic tint on white marble
 * 3) Soft directional studio cast shadow angled gently left-rear
 * Using pure multi-stop gradients avoids 30+ live CSS blur passes per frame on mobile GPUs.
 */
function buildGroundingShadowBackground(causticTint: string | null): string {
  const layers: string[] = [
    'radial-gradient(ellipse 34% 26% at 50% 52%, rgba(8, 12, 22, 0.84) 0%, rgba(10, 15, 28, 0.44) 50%, rgba(10, 15, 28, 0) 100%)',
  ];
  if (causticTint) {
    layers.push(
      `radial-gradient(ellipse 36% 32% at 58% 54%, ${causticTint} 0%, rgba(0, 0, 0, 0) 100%)`,
    );
  }
  layers.push(
    'radial-gradient(ellipse 46% 42% at 44% 52%, rgba(14, 18, 30, 0.3) 0%, rgba(14, 18, 30, 0.12) 55%, rgba(14, 18, 30, 0) 100%)',
  );
  return layers.join(', ');
}

/**
 * Overhead brushed antique-gold dining cloche SVG rendered cleanly onto the
 * circular marble tabletop for the 3 "Coming Soon" sections (صبحانه، پیش‌غذا، غذای اصلی).
 */
const ComingSoonClochePlate = memo(function ComingSoonClochePlate({
  label,
}: {
  label: string;
}) {
  return (
    <div className="relative flex h-full w-full items-center justify-center select-none">
      <svg
        viewBox="0 0 260 260"
        className="h-[88%] w-[88%]"
        aria-label={`سرویس ${label} به‌زودی`}
      >
        <defs>
          <radialGradient id="clochePlate" cx="45%" cy="42%" r="56%">
            <stop offset="0%" stopColor="#FAF8F4" />
            <stop offset="78%" stopColor="#EBE6DC" />
            <stop offset="100%" stopColor="#D6CFC1" />
          </radialGradient>
          <radialGradient id="clocheGold" cx="38%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#F0D8A8" />
            <stop offset="35%" stopColor="#CFA864" />
            <stop offset="74%" stopColor="#9A763B" />
            <stop offset="100%" stopColor="#6D5224" />
          </radialGradient>
          <radialGradient id="clocheKnob" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FAF0D7" />
            <stop offset="55%" stopColor="#C8A05A" />
            <stop offset="100%" stopColor="#6E5122" />
          </radialGradient>
        </defs>

        <circle cx="130" cy="134" r="109" fill="rgba(14,21,37,0.16)" />
        <circle cx="130" cy="130" r="108" fill="url(#clochePlate)" />
        <circle
          cx="130"
          cy="130"
          r="102"
          fill="none"
          stroke="#6B7043"
          strokeWidth="4.5"
        />
        <circle
          cx="130"
          cy="130"
          r="95"
          fill="none"
          stroke="#B5945B"
          strokeWidth="1.2"
          strokeOpacity="0.65"
        />

        <circle cx="130" cy="130" r="72" fill="url(#clocheGold)" />
        <circle
          cx="130"
          cy="130"
          r="66"
          fill="none"
          stroke="#F7E6C2"
          strokeOpacity="0.45"
          strokeWidth="1"
        />
        <path
          d="M 86 104 A 52 52 0 0 1 154 84"
          fill="none"
          stroke="#FFF7E6"
          strokeWidth="3"
          strokeLinecap="round"
          strokeOpacity="0.4"
        />

        <circle cx="130" cy="130" r="14" fill="rgba(14,21,37,0.22)" />
        <circle cx="130" cy="130" r="11" fill="url(#clocheKnob)" />
        <circle cx="127" cy="127" r="3" fill="#FFF8E8" fillOpacity="0.7" />
      </svg>
    </div>
  );
});

/**
 * Handcrafted architectural alabaster-marble veining and radial antique-gold inlays
 * baked directly onto the rotating tabletop so every degree of table rotation is unmistakably physical.
 */
const MarbleTableInlays = memo(function MarbleTableInlays({
  slotCount,
}: {
  slotCount: number;
}) {
  const safeCount = Math.max(4, slotCount);
  const spokes = useMemo(
    () =>
      Array.from({ length: safeCount }, (_, i) => {
        const angleRad = ((i / safeCount) * 360 * Math.PI) / 180;
        const x1 = 500 + Math.sin(angleRad) * 186;
        const y1 = 500 - Math.cos(angleRad) * 186;
        const x2 = 500 + Math.sin(angleRad) * 468;
        const y2 = 500 - Math.cos(angleRad) * 468;
        const tx = 500 + Math.sin(angleRad) * 480;
        const ty = 500 - Math.cos(angleRad) * 480;
        return { i, x1, y1, x2, y2, tx, ty };
      }),
    [safeCount],
  );

  return (
    <svg
      viewBox="0 0 1000 1000"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full rounded-full"
    >
      {/* Subtle asymmetric natural stone veining */}
      <g fill="none" strokeLinecap="round">
        <path
          d="M 110 340 C 245 310, 310 420, 445 395 C 580 370, 665 245, 865 280"
          stroke="#9E9483"
          strokeOpacity="0.2"
          strokeWidth="3"
        />
        <path
          d="M 140 358 C 260 335, 325 438, 456 410 C 578 384, 678 272, 845 302"
          stroke="#B5945B"
          strokeOpacity="0.14"
          strokeWidth="1.3"
        />
        <path
          d="M 180 680 C 310 615, 420 675, 560 620 C 690 570, 770 635, 910 565"
          stroke="#8E8473"
          strokeOpacity="0.18"
          strokeWidth="2.6"
        />
        <path
          d="M 290 120 C 360 260, 465 310, 485 480 C 505 645, 430 760, 520 910"
          stroke="#9B9180"
          strokeOpacity="0.14"
          strokeWidth="2"
        />
        <path
          d="M 650 115 C 615 240, 680 355, 620 495 C 565 620, 690 740, 745 875"
          stroke="#B5945B"
          strokeOpacity="0.13"
          strokeWidth="1.5"
        />
        <path
          d="M 95 535 C 215 490, 295 570, 395 545"
          stroke="#8A806E"
          strokeOpacity="0.16"
          strokeWidth="1.8"
        />
      </g>

      {/* Architectural brass inlaid concentric circles */}
      <circle
        cx="500"
        cy="500"
        r="476"
        fill="none"
        stroke="#B5945B"
        strokeOpacity="0.32"
        strokeWidth="1.5"
      />
      <circle
        cx="500"
        cy="500"
        r="464"
        fill="none"
        stroke="#6B7043"
        strokeOpacity="0.09"
        strokeWidth="1"
      />
      <circle
        cx="500"
        cy="500"
        r="182"
        fill="none"
        stroke="#B5945B"
        strokeOpacity="0.22"
        strokeWidth="1.3"
      />
      <circle
        cx="500"
        cy="500"
        r="164"
        fill="none"
        stroke="#6B7043"
        strokeOpacity="0.08"
        strokeWidth="1"
      />

      {/* Radial antique-gold divider lines & rim compass markers */}
      {spokes.map((s) => (
        <g key={s.i}>
          <line
            x1={s.x1}
            y1={s.y1}
            x2={s.x2}
            y2={s.y2}
            stroke="#B5945B"
            strokeOpacity="0.14"
            strokeWidth="1.1"
            strokeDasharray="4 7"
          />
          <circle cx={s.tx} cy={s.ty} r="3" fill="#B5945B" fillOpacity="0.48" />
        </g>
      ))}
    </svg>
  );
});

// P1-2: memoised so an item step / bean switch in App doesn't re-render
// the whole stage tree (reconciliation only, but ~4-5x/s while stepping).
// Effective once App passes stable callbacks (useCallback) — `category`
// and `items` are already useMemo'd there, and the remaining props are
// primitives or stable setState fns.
export const RotaryTableStage = memo(function RotaryTableStage({
  category,
  items,
  activeIndex,
  overviewMode,
  cameraAngle,
  drawerOpen,
  onSelectIndex,
  onStep,
  onExitOverviewToIndex,
  onChangeCameraAngle,
}: RotaryTableStageProps) {
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1440,
    height: typeof window !== 'undefined' ? window.innerHeight : 900,
  }));
  const [hoveredOverviewIndex, setHoveredOverviewIndex] = useState<
    number | null
  >(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  const { t, formatDigits, formatPrice } = useLanguage();
  const deviceProfile = getDeviceProfile();
  const isMobile = viewport.width < 1024;
  const isFrontCamera =
    cameraAngle === 'front' && !overviewMode && !category.comingSoon;

  // Mount standing cutouts lazily when front camera enters, and keep mounted during exit transition
  const [standingMounted, setStandingMounted] = useState<boolean>(isFrontCamera);

  useEffect(() => {
    if (isFrontCamera) {
      setStandingMounted(true);
    }
  }, [isFrontCamera]);

  // Idle-preload the active category's tiny WebP cutouts (~25KB each) so entering Front View is instant.
  // On mobile only the ringDist <= 2 seats around the active item are
  // actually rendered (see the cull in the standing layer below), so
  // preloading the whole category wastes ~30-80 KB per category on phones
  // (P1-8) — restrict the preload set to the rendered seats. Re-runs on
  // activeIndex so the window follows the wheel as the user steps; already-
  // cached srcs are cheap no-ops. Desktop renders every seat, so it keeps
  // the full set.
  useEffect(() => {
    if (category.comingSoon || items.length === 0 || !deviceProfile.allowIdlePreload) return;
    const preloadCutouts = isMobile
      ? Array.from(
          new Set(
            items
              .filter((_, idx) => {
                const rawDiff = Math.abs(idx - activeIndex);
                return Math.min(rawDiff, items.length - rawDiff) <= deviceProfile.maxMobileRingDist;
              })
              .map((i) => toMobileCutoutSrc(i.cutoutImage)),
          ),
        )
      : Array.from(new Set(items.map((i) => i.cutoutImage)));
    const preload = () => {
      for (const srcUrl of preloadCutouts) {
        preloadAndDecodeImage(srcUrl);
      }
    };
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(preload, { timeout: 2000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = window.setTimeout(preload, 1200);
    return () => window.clearTimeout(timer);
  }, [category.id, category.comingSoon, items, isMobile, activeIndex]);

  useEffect(() => {
    let timer: number | undefined;
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const nextW = window.innerWidth;
        const nextH = window.innerHeight;
        setViewport((prev) => {
          // On mobile, browser address-bar show/hide changes height by ~56-100px
          // without changing width; ignoring those prevents vertical table jumps during scroll.
          if (
            nextW < 1024 &&
            nextW === prev.width &&
            Math.abs(nextH - prev.height) < 120
          ) {
            return prev;
          }
          return { width: nextW, height: nextH };
        });
      }, 150);
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  // Target camera & turntable geometry for the current viewport and mode
  const targetGeo = useMemo(() => {
    const vw = viewport.width;
    const vh = viewport.height;

    if (vw < 1024) {
      // Dynamic Arc Geometry: scale the marble ring diameter proportionally to
      // item count so adjacent cups ALWAYS have ~42–50px of clean marble space
      // (zero overlap even for 9–10 item categories like hot-coffee & tea-herbal).
      const itemCount = Math.max(4, items.length);
      const dishSize = Math.round(Math.min(116, Math.max(96, vw * 0.285)));
      const ringRadiusPct = 37.5;
      const targetChordPx = dishSize * 1.44;
      const minRingRadiusPx =
        targetChordPx / (2 * Math.sin(Math.PI / itemCount));
      const tableDiameter = Math.round(
        Math.min(760, Math.max(440, minRingRadiusPx / (ringRadiusPct / 100))),
      );
      const ringRadiusPx = (tableDiameter * ringRadiusPct) / 100;

      const overviewScale = Math.min(
        (vw - 24) / tableDiameter,
        (vh - 220) / tableDiameter,
      );

      // Pin the 6-o'clock focal cup at a consistent luxury sweet-spot regardless of itemCount
      const isCompactPhone = vh < 720;
      const topScale = 0.96;
      const frontScale = 0.92;
      const desiredTopFocalY = isCompactPhone
        ? Math.max(208, vh * 0.31)
        : Math.max(236, vh * 0.305);
      const topCx = vw * 0.5;
      const topCy = desiredTopFocalY - ringRadiusPx * topScale;

      // Project the front-view focal coaster to a consistent Y above the lower card
      const frontPitchRad = (72 * Math.PI) / 180;
      const frontLocalY = ringRadiusPx * frontScale;
      const frontRotY = frontLocalY * Math.cos(frontPitchRad);
      const frontRotZ = frontLocalY * Math.sin(frontPitchRad);
      const frontPerspScale = 1320 / Math.max(240, 1320 - frontRotZ);
      const desiredFrontFocalY = isCompactPhone
        ? Math.max(320, vh * 0.48)
        : Math.max(370, vh * 0.485);
      const frontCx = vw * 0.5;
      const frontCy = desiredFrontFocalY - frontRotY * frontPerspScale;

      const overviewCx = vw * 0.5;
      const overviewCy = vh * 0.53;

      return {
        tableDiameter,
        ringRadiusPct,
        dishSize,
        tallCutoutH: Math.round(
          isCompactPhone
            ? Math.min(148, vh * 0.222)
            : Math.min(194, Math.max(162, vh * 0.23)),
        ),
        cupCutoutH: Math.round(
          isCompactPhone
            ? Math.min(118, vh * 0.175)
            : Math.min(148, Math.max(126, vh * 0.175)),
        ),
        cx: overviewMode ? overviewCx : isFrontCamera ? frontCx : topCx,
        cy: overviewMode ? overviewCy : isFrontCamera ? frontCy : topCy,
        scale: overviewMode
          ? overviewScale
          : isFrontCamera
            ? frontScale
            : topScale,
        pitch: isFrontCamera ? 72 : 0,
        perspective: isFrontCamera ? 1320 : 1700,
      };
    }

    // Desktop (>= 1024px): Push marble turntable firmly to the LEFT
    // leaving a wide, calm dark-navy editorial zone on the right for Persian typography
    const tableDiameter = Math.min(920, Math.max(730, vw * 0.64));
    const overviewScale = Math.min(
      (vh - 200) / tableDiameter,
      (vw - 140) / tableDiameter,
      0.74,
    );

    const stageCx = drawerOpen ? vw * 0.195 : vw * 0.245;
    const topCy = vh * 0.255;
    const frontCy = vh * 0.645;
    const overviewCx = vw * 0.5;
    const overviewCy = vh * 0.51;

    const count = Math.max(items.length, 6);
    const dishRatio = count >= 10 ? 0.24 : count >= 8 ? 0.255 : 0.27;

    return {
      tableDiameter,
      ringRadiusPct: 30.5,
      dishSize: Math.round(tableDiameter * dishRatio),
      tallCutoutH: Math.round(Math.min(344, Math.max(268, vh * 0.38))),
      cupCutoutH: Math.round(Math.min(216, Math.max(172, vh * 0.238))),
      cx: overviewMode ? overviewCx : stageCx,
      cy: overviewMode ? overviewCy : isFrontCamera ? frontCy : topCy,
      scale: overviewMode ? overviewScale : isFrontCamera ? 0.94 : 1.0,
      pitch: isFrontCamera ? 71 : 0,
      perspective: isFrontCamera ? 1340 : 1750,
    };
  }, [
    viewport.width,
    viewport.height,
    overviewMode,
    isFrontCamera,
    drawerOpen,
    items.length,
  ]);

  // Direct DOM refs for 100% GPU-composited, ZERO-React-re-render 60fps animation
  const stageRef = useRef<HTMLDivElement | null>(null);
  const topGlowRef = useRef<HTMLDivElement | null>(null);
  const frontGlowRef = useRef<HTMLDivElement | null>(null);
  const cameraRigRef = useRef<HTMLDivElement | null>(null);
  const slabEdgeRef = useRef<HTMLDivElement | null>(null);
  const wheelDiscRef = useRef<HTMLDivElement | null>(null);
  const standingLayerRef = useRef<HTMLDivElement | null>(null);

  const coasterRefs = useRef<(HTMLDivElement | null)[]>([]);
  const plateBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const seatWrapperRefs = useRef<(HTMLDivElement | null)[]>([]);
  const seatShadowRefs = useRef<(HTMLDivElement | null)[]>([]);
  const seatBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const targetWheelAngleRef = useRef<number>(
    computeShortestWheelAngle(
      FOCAL_ANGLE_DEG,
      activeIndex,
      Math.max(1, items.length),
      FOCAL_ANGLE_DEG,
    ),
  );
  const prevCategoryRef = useRef<string>(category.id);
  const prevActiveIndexRef = useRef<number>(activeIndex);

  useEffect(() => {
    if (prevActiveIndexRef.current !== activeIndex) {
      prevActiveIndexRef.current = activeIndex;
      if (isMobile && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try {
          navigator.vibrate(6);
        } catch {
          // Ignore if browser blocks vibration before gesture
        }
      }
    }
  }, [activeIndex, isMobile]);

  const animRef = useRef<AnimatedCameraState>({
    wheelAngle: targetWheelAngleRef.current,
    pitch: targetGeo.pitch,
    cx: targetGeo.cx,
    cy: targetGeo.cy,
    scale: targetGeo.scale,
    perspective: targetGeo.perspective,
  });
  const rafIdRef = useRef<number | null>(null);

  // Latest metadata ref so the rAF loop always reads current props without triggering re-renders
  const frameMetaRef = useRef({
    tableDiameter: targetGeo.tableDiameter,
    ringRadiusPx: (targetGeo.tableDiameter * targetGeo.ringRadiusPct) / 100,
    items,
    activeIndex,
    overviewMode,
    isFrontCamera,
    comingSoon: Boolean(category.comingSoon),
  });
  frameMetaRef.current = {
    tableDiameter: targetGeo.tableDiameter,
    ringRadiusPx: (targetGeo.tableDiameter * targetGeo.ringRadiusPct) / 100,
    items,
    activeIndex,
    overviewMode,
    isFrontCamera,
    comingSoon: Boolean(category.comingSoon),
  };

  /**
   * Paints a single animation frame directly onto GPU-composited DOM transforms & opacities.
   * Zero React setState, zero Layout reflow (left/top/width/height untouched), zero live filter blur!
   */
  const paintFrame = useCallback((state: AnimatedCameraState) => {
    const meta = frameMetaRef.current;
    const pitchRatio = Math.max(0, Math.min(1, state.pitch / 71));
    // Smoothstep overlap eliminates the mid-tilt hollow gap between top plates and standing drinks
    const plateOpacityFactor = 1 - smoothstep(0.06, 0.56, pitchRatio);
    const standingReveal = smoothstep(0.14, 0.88, pitchRatio);
    const halfD = meta.tableDiameter / 2;

    // P2-3: numeric-keyed writes — compare the numbers BEFORE building the
    // CSS string. During a top-view wheel turn only the disc angle moves,
    // so nearly every other string used to be built then discarded.
    const topGlowOp = 1 - pitchRatio;
    writeStyleNums(topGlowRef.current, 'opacity', [topGlowOp], () =>
      topGlowOp.toFixed(3),
    );
    writeStyleNums(frontGlowRef.current, 'opacity', [pitchRatio], () =>
      pitchRatio.toFixed(3),
    );

    const rigX = state.cx - halfD;
    const rigY = state.cy - halfD;
    writeStyleNums(
      cameraRigRef.current,
      'transform',
      [rigX, rigY, state.perspective, state.pitch, state.scale],
      () =>
        `translate3d(${rigX.toFixed(2)}px, ${rigY.toFixed(2)}px, 0) perspective(${state.perspective.toFixed(0)}px) rotateX(${state.pitch.toFixed(3)}deg) scale(${state.scale.toFixed(4)})`,
    );

    const slabOp = Math.min(1, pitchRatio * 1.4);
    writeStyleNums(slabEdgeRef.current, 'opacity', [slabOp], () =>
      slabOp.toFixed(3),
    );

    writeStyleNums(wheelDiscRef.current, 'transform', [state.wheelAngle], () =>
      `rotateZ(${state.wheelAngle.toFixed(3)}deg)`,
    );

    if (!meta.comingSoon) {
      const count = Math.max(1, meta.items.length);
      const coasterOp = Math.min(1, standingReveal * 1.2);
      const buildCoasterOp = () => coasterOp.toFixed(3);

      for (let i = 0; i < count; i++) {
        writeStyleNums(
          coasterRefs.current[i],
          'opacity',
          [coasterOp],
          buildCoasterOp,
        );
        const plateBtn = plateBtnRefs.current[i];
        if (plateBtn) {
          // Keep all ceramic plates fully opaque so marble veining never bleeds through cups;
          // active vs inactive hierarchy is expressed via scale + contact shadow.
          const baseOp = 1;
          const plateOp = plateOpacityFactor * baseOp;
          writeStyleNums(plateBtn, 'opacity', [plateOp], () =>
            plateOp.toFixed(3),
          );
          writeStyle(
            plateBtn,
            'pointerEvents',
            meta.isFrontCamera || plateOpacityFactor <= 0.02 ? 'none' : 'auto',
          );
        }
      }

      const standingLayer = standingLayerRef.current;
      if (standingLayer) {
        const visible = standingReveal > 0.01;
        writeStyle(
          standingLayer,
          'visibility',
          visible ? 'visible' : 'hidden',
        );

        if (visible) {
          const revealScaleY = 0.72 + standingReveal * 0.28;
          // P2-3: pitch is constant across items within a frame — compute
          // its trig once and pass it into projectTableSeat instead of
          // recomputing sin/cos per item.
          const pitchRad = (state.pitch * Math.PI) / 180;
          const pitchTrig = {
            cosPitch: Math.cos(pitchRad),
            sinPitch: Math.sin(pitchRad),
          };
          for (let i = 0; i < count; i++) {
            const wrapper = seatWrapperRefs.current[i];
            if (!wrapper) continue;

            const item = meta.items[i];
            const slotAngleDeg = (i / count) * 360;
            const proj = projectTableSeat({
              perspectivePx: state.perspective,
              tableCenterX: state.cx,
              tableCenterY: state.cy,
              ringRadiusPx: meta.ringRadiusPx,
              tableScale: state.scale,
              pitchDeg: state.pitch,
              pitchTrig,
              wheelAngleDeg: state.wheelAngle,
              slotAngleDeg,
            });

            // Smooth depth fade for far-rear glasses (especially on compact mobile screens)
            const rearFade =
              proj.frontness >= -0.05
                ? 1
                : 0.25 + 0.75 * smoothstep(-0.92, -0.05, proj.frontness);
            const seatOpacity = standingReveal * rearFade;

            writeStyleNums(
              wrapper,
              'transform',
              [proj.screenX, proj.screenY],
              () =>
                `translate3d(${proj.screenX.toFixed(2)}px, ${proj.screenY.toFixed(2)}px, 0)`,
            );
            writeStyleNums(wrapper, 'zIndex', [proj.zIndex], () =>
              String(proj.zIndex),
            );
            writeStyleNums(wrapper, 'opacity', [seatOpacity], () =>
              seatOpacity.toFixed(3),
            );

            writeStyleNums(
              seatShadowRefs.current[i],
              'transform',
              [proj.perspScale],
              () =>
                `translate3d(-50%, -44%, 0) scale(${proj.perspScale.toFixed(4)})`,
            );

            const btnEl = seatBtnRefs.current[i];
            if (btnEl) {
              const isCup = item.vesselType === 'cup';
              // shiftPct/yOff are per-item constants (cup vs tall) and the
              // button element is keyed by item.id, so they are excluded
              // from the numeric key — only the moving scales are compared.
              const shiftPct = isCup ? -45.5 : -50;
              const yOff = isCup ? 9 : 6;
              const sx = proj.perspScale;
              const sy = proj.perspScale * revealScaleY;
              writeStyleNums(btnEl, 'transform', [sx, sy], () =>
                `translate3d(${shiftPct}%, ${yOff}px, 0) scale(${sx.toFixed(4)}, ${sy.toFixed(4)})`,
              );
            }
          }
        }
      }
    }
  }, []);

  // Synchronously paint current refs whenever DOM nodes mount/resize so there is zero 1-frame flash
  useLayoutEffect(() => {
    coasterRefs.current.length = items.length;
    plateBtnRefs.current.length = items.length;
    seatWrapperRefs.current.length = items.length;
    seatShadowRefs.current.length = items.length;
    seatBtnRefs.current.length = items.length;
    paintFrame(animRef.current);
  }, [
    paintFrame,
    standingMounted,
    category.id,
    items.length,
    activeIndex,
    overviewMode,
    isFrontCamera,
    targetGeo.tableDiameter,
    targetGeo.tallCutoutH,
    targetGeo.cupCutoutH,
  ]);

  // Ref-driven 60fps camera + turntable animation (zero React setState during motion!)
  useEffect(() => {
    const count = Math.max(1, items.length);
    const categoryChanged = prevCategoryRef.current !== category.id;
    prevCategoryRef.current = category.id;

    let nextWheelAngle: number;
    if (categoryChanged) {
      const slotAngle = (activeIndex / count) * 360;
      nextWheelAngle = FOCAL_ANGLE_DEG - slotAngle;
      setHoveredOverviewIndex(null);
    } else {
      nextWheelAngle = computeShortestWheelAngle(
        animRef.current.wheelAngle,
        activeIndex,
        count,
        FOCAL_ANGLE_DEG,
      );
    }
    targetWheelAngleRef.current = nextWheelAngle;

    const target: AnimatedCameraState = {
      wheelAngle: nextWheelAngle,
      pitch: targetGeo.pitch,
      cx: targetGeo.cx,
      cy: targetGeo.cy,
      scale: targetGeo.scale,
      perspective: targetGeo.perspective,
    };

    const reducedMotion = prefersReducedMotion();

    if (reducedMotion) {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      const snapped: AnimatedCameraState = { ...target };
      animRef.current = snapped;
      paintFrame(snapped);
      if (!isFrontCamera) {
        setStandingMounted(false);
      }
      return;
    }

    // On category switch, glide smoothly by 20deg into the new tray instead of snapping dryly
    const start: AnimatedCameraState = categoryChanged
      ? { ...target, wheelAngle: nextWheelAngle - 20 }
      : { ...animRef.current };
    if (categoryChanged) {
      animRef.current = start;
      paintFrame(start);
    }
    const startTime = performance.now();
    const isCameraMove = Math.abs(target.pitch - start.pitch) > 1;
    const wheelDelta = Math.abs(nextWheelAngle - animRef.current.wheelAngle);
    // Soft wheel turns (FIX 1): a single slot step takes ~420ms and a
    // half-turn ~600ms, so the table glides instead of lurching. The 380ms
    // floor only binds for tiny deltas (e.g. a drag released just short of
    // a slot), where it reads as a gentle detent settle. Camera moves run
    // 480ms (P1-4: was 600ms — the longest tap-response duration in the
    // app; 480ms keeps the move coherent with the wheel while feeling
    // ~20% snappier on the tap path).
    const durationMs = categoryChanged
      ? 420
      : isCameraMove
        ? 540
        : Math.min(600, Math.max(380, 360 + wheelDelta * 1.3));

    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }

    const tick = (now: number) => {
      const t = Math.min(1, (now - startTime) / durationMs);
      // P2-3: solve the soft-out curve ONCE per tick. The wheel always
      // uses it and the camera reuses it on non-camera moves — it was
      // solved twice before (Newton-Raphson, up to 8 iterations each).
      const softEase = easeSoftOut(t);
      const camEase = isCameraMove ? easeInOutCubic(t) : softEase;
      const wheelEase = softEase;

      const current: AnimatedCameraState = {
        wheelAngle:
          start.wheelAngle + (target.wheelAngle - start.wheelAngle) * wheelEase,
        pitch: start.pitch + (target.pitch - start.pitch) * camEase,
        cx: start.cx + (target.cx - start.cx) * camEase,
        cy: start.cy + (target.cy - start.cy) * camEase,
        scale: start.scale + (target.scale - start.scale) * camEase,
        perspective:
          start.perspective + (target.perspective - start.perspective) * camEase,
      };

      animRef.current = current;
      paintFrame(current);

      if (t < 1) {
        rafIdRef.current = requestAnimationFrame(tick);
      } else {
        rafIdRef.current = null;
        if (!frameMetaRef.current.isFrontCamera) {
          setStandingMounted(false);
        }
      }
    };

    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [
    activeIndex,
    items.length,
    category.id,
    isFrontCamera,
    targetGeo.pitch,
    targetGeo.cx,
    targetGeo.cy,
    targetGeo.scale,
    targetGeo.perspective,
    paintFrame,
  ]);

  // Wheel scroll & touch-swipe drag handling on the circular stage
  const wheelLockRef = useRef<number>(0);
  // rAF-coalesced drag moves (P2-4): pointermove can fire at 120 Hz on
  // touch, faster than paintFrame needs. Only the latest position per
  // frame is processed; finishDrag flushes any pending move first so the
  // release velocity and final angle include the last pointer position.
  const pendingDragMoveRef = useRef<{
    x: number;
    y: number;
    buttons: number;
  } | null>(null);
  const dragRafRef = useRef<number | null>(null);
  const dragStartRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    lastX: number;
    startWheelAngle: number;
    lastPointerAngle: number;
    snapshotWheelAngle: number;
    snapshotTime: number;
    centerX: number;
    centerY: number;
    pointerId: number;
    captureSet: boolean;
    isLinearMobile: boolean;
    axisLock: 'none' | 'horizontal' | 'vertical';
  }>({
    active: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    startWheelAngle: 0,
    lastPointerAngle: 0,
    snapshotWheelAngle: 0,
    snapshotTime: 0,
    centerX: 0,
    centerY: 0,
    pointerId: -1,
    captureSet: false,
    isLinearMobile: false,
    axisLock: 'none',
  });

  const handleStageWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    if (overviewMode || category.comingSoon || items.length <= 1) return;
    const now = Date.now();
    if (now - wheelLockRef.current < 280) return;
    const primary =
      Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (Math.abs(primary) < 18) return;
    wheelLockRef.current = now;
    onStep(primary > 0 ? 1 : -1);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (overviewMode || category.comingSoon || items.length <= 1) return;
    // Catch any in-flight spin/camera move so the drag starts from the live angle
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    // Compute disc pivot from live animation state + scroll offset (avoids
    // Forced Synchronous Layout via getBoundingClientRect() on pointerdown).
    const centerX = animRef.current.cx;
    const centerY = animRef.current.cy - (window.scrollY || 0);
    const angle = pointerAngleDeg(e.clientX, e.clientY, centerX, centerY);
    const now = performance.now();
    // A previous drag's coalesced frame must never leak into this one.
    if (dragRafRef.current !== null) {
      cancelAnimationFrame(dragRafRef.current);
      dragRafRef.current = null;
    }
    pendingDragMoveRef.current = null;
    dragStartRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      startWheelAngle: animRef.current.wheelAngle,
      lastPointerAngle: angle,
      snapshotWheelAngle: animRef.current.wheelAngle,
      snapshotTime: now,
      centerX,
      centerY,
      pointerId: e.pointerId,
      captureSet: false,
      isLinearMobile: isMobile,
      axisLock: 'none',
    };
  };

  // Applies one drag position: angular 1:1 tracking + velocity snapshot.
  // Called at most once per animation frame (see handlePointerMove) and
  // synchronously from finishDrag to flush the final position.
  const processDragMove = (
    clientX: number,
    clientY: number,
    buttons: number,
  ) => {
    const drag = dragStartRef.current;
    // If the press was lost (pointerup missed, e.g. released outside the
    // window), finish the drag as a cancel instead of tracking a hover.
    if (buttons === 0) {
      finishDrag(clientX, clientY, false);
      return;
    }
    const dxTotal = clientX - drag.startX;
    const dyTotal = clientY - drag.startY;
    const distFromStart = Math.hypot(dxTotal, dyTotal);

    // Directional lock on mobile: if the user is clearly scrolling vertically down
    // toward the footer, yield immediately instead of fighting the scroll.
    if (drag.isLinearMobile && drag.axisLock === 'none' && distFromStart >= 8) {
      drag.axisLock =
        Math.abs(dxTotal) >= Math.abs(dyTotal) * 0.85
          ? 'horizontal'
          : 'vertical';
    }
    if (drag.axisLock === 'vertical') {
      return;
    }

    if (!drag.captureSet && distFromStart >= 10) {
      drag.captureSet = true;
      try {
        stageRef.current?.setPointerCapture(drag.pointerId);
      } catch {
        // Pointer already gone — capture is best-effort.
      }
    }

    let delta = 0;
    if (drag.isLinearMobile) {
      // Intuitive one-handed horizontal swipe on mobile: swiping right rotates
      // the front focal cup smoothly rightward (counter-clockwise = -delta).
      const stepX = clientX - drag.lastX;
      drag.lastX = clientX;
      delta = -stepX * 0.38;
    } else {
      const angle = pointerAngleDeg(
        clientX,
        clientY,
        drag.centerX,
        drag.centerY,
      );
      const radius = Math.hypot(clientX - drag.centerX, clientY - drag.centerY);
      if (radius < 24) {
        drag.lastPointerAngle = angle;
        return;
      }
      delta = wrapDeltaDeg(angle - drag.lastPointerAngle);
      drag.lastPointerAngle = angle;
    }

    const nextWheel = animRef.current.wheelAngle + delta;
    animRef.current = {
      ...animRef.current,
      wheelAngle: nextWheel,
    };
    paintFrame(animRef.current);
    const now = performance.now();
    if (now - drag.snapshotTime >= 90) {
      drag.snapshotWheelAngle = nextWheel;
      drag.snapshotTime = now;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStartRef.current;
    if (!drag.active) return;
    // rAF-coalesce: keep only the latest position; the frame callback
    // processes it once, so a 120 Hz touch stream costs at most one
    // paintFrame per frame. 1:1 feel is unchanged — every frame still
    // applies the freshest angle.
    pendingDragMoveRef.current = {
      x: e.clientX,
      y: e.clientY,
      buttons: e.buttons,
    };
    if (dragRafRef.current === null) {
      dragRafRef.current = requestAnimationFrame(() => {
        dragRafRef.current = null;
        const pending = pendingDragMoveRef.current;
        pendingDragMoveRef.current = null;
        if (pending && dragStartRef.current.active) {
          processDragMove(pending.x, pending.y, pending.buttons);
        }
      });
    }
  };

  const finishDrag = (
    clientX: number,
    clientY: number,
    allowFlick: boolean,
  ) => {
    const drag = dragStartRef.current;
    if (!drag.active) return;
    // Flush any coalesced move not yet processed so the release velocity
    // and final angle include the very last pointer position. Mark
    // inactive FIRST: a flushed move with buttons === 0 calls finishDrag
    // again from processDragMove, and must hit the guard above.
    if (dragRafRef.current !== null) {
      cancelAnimationFrame(dragRafRef.current);
      dragRafRef.current = null;
    }
    const pending = pendingDragMoveRef.current;
    pendingDragMoveRef.current = null;
    drag.active = false;
    if (pending) {
      processDragMove(pending.x, pending.y, pending.buttons);
    }

    const now = performance.now();
    const dx = clientX - drag.startX;
    const dy = clientY - drag.startY;
    const dist = Math.hypot(dx, dy);

    // Tap: snap back instantly to the pre-drag angle — no step, no settle.
    // 16px absorbs normal finger drift on phones so taps reliably select.
    if (dist < 16) {
      animRef.current = {
        ...animRef.current,
        wheelAngle: drag.startWheelAngle,
      };
      paintFrame(animRef.current);
      return;
    }

    // If mobile gesture locked to vertical scroll, restore angle cleanly without stepping
    if (drag.axisLock === 'vertical') {
      animRef.current = {
        ...animRef.current,
        wheelAngle: drag.startWheelAngle,
      };
      paintFrame(animRef.current);
      return;
    }

    // Release angular velocity over the trailing ~90ms window (works for both mobile swipe & desktop polar drag)
    const angleDelta = animRef.current.wheelAngle - drag.snapshotWheelAngle;
    const velocityDegPerMs =
      angleDelta / Math.max(1, now - drag.snapshotTime);

    // Momentum projection: project the wheel forward proportionally to release
    // velocity so a deliberate flick glides naturally 1–3 slots forward and
    // never snaps backward after a multi-slot drag.
    const count = Math.max(1, items.length);
    const momentumDeg =
      allowFlick && Math.abs(velocityDegPerMs) > 0.1
        ? Math.max(-135, Math.min(135, velocityDegPerMs * 185))
        : 0;
    const projectedWheel = animRef.current.wheelAngle + momentumDeg;
    let nearestIndex = activeIndex;
    let bestDelta = Infinity;
    for (let i = 0; i < count; i++) {
      const slotAngle = (i / count) * 360 + projectedWheel;
      const delta = (((slotAngle - FOCAL_ANGLE_DEG) % 360) + 540) % 360 - 180;
      const absDelta = Math.abs(delta);
      if (absDelta < bestDelta) {
        bestDelta = absDelta;
        nearestIndex = i;
      }
    }
    // Guarantee at least a 1-slot step on a crisp short flick that didn't cross a slot midpoint
    if (
      nearestIndex === activeIndex &&
      allowFlick &&
      Math.abs(velocityDegPerMs) > 0.14
    ) {
      onStep(velocityDegPerMs < 0 ? 1 : -1);
      return;
    }

    if (nearestIndex !== activeIndex) {
      onSelectIndex(nearestIndex);
      return;
    }

    // Already on the nearest item: local 360ms soft ease-out settle back to
    // the exact slot angle. (Calling onSelectIndex(activeIndex) would NOT
    // re-run the animation effect — React bails out on identical state.)
    // Reduced motion snaps instantly, like the main animation loop.
    const targetAngle = computeShortestWheelAngle(
      animRef.current.wheelAngle,
      activeIndex,
      count,
      FOCAL_ANGLE_DEG,
    );
    targetWheelAngleRef.current = targetAngle;
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
    }
    const reducedMotion = prefersReducedMotion();
    if (reducedMotion) {
      animRef.current = { ...animRef.current, wheelAngle: targetAngle };
      paintFrame(animRef.current);
      return;
    }
    const startAngle = animRef.current.wheelAngle;
    const settleStart = performance.now();
    const settleDurationMs = 360;
    const settleTick = (tickNow: number) => {
      const t = Math.min(1, (tickNow - settleStart) / settleDurationMs);
      const eased = easeSoftOut(t);
      const current: AnimatedCameraState = {
        ...animRef.current,
        wheelAngle: startAngle + (targetAngle - startAngle) * eased,
      };
      animRef.current = current;
      paintFrame(current);
      if (t < 1) {
        rafIdRef.current = requestAnimationFrame(settleTick);
      } else {
        rafIdRef.current = null;
      }
    };
    rafIdRef.current = requestAnimationFrame(settleTick);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    finishDrag(e.clientX, e.clientY, true);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    finishDrag(e.clientX, e.clientY, false);
  };

  const hoveredOverviewItem =
    overviewMode && hoveredOverviewIndex !== null
      ? items[hoveredOverviewIndex]
      : null;

  const activeItem = items[activeIndex];
  const displayCenterItem = hoveredOverviewItem ?? activeItem;
  const comingSoonSlots = [0, 1, 2, 3];

  return (
    <div
      ref={stageRef}
      onWheel={handleStageWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      aria-label="میز دوّار نمایش محصولات کافه ایوان"
      className="pointer-events-auto absolute inset-0 overflow-hidden select-none touch-pan-y"
      style={{ contain: "layout style paint" }}
    >
      {/* Static GPU-crossfaded softbox studio backdrop illumination (zero per-frame gradient repaints) */}
      {/* Opacity on both glows (and the slab edge + coasters below) is
          owned SOLELY by paintFrame — React must not set it, or the two
          writers desync: on a camera toggle React forced 0/1 while
          paintFrame's dirty check skipped the in-between values, flashing
          the glows swapped for one frame. The layout-effect paint runs
          before first paint, so there is no unstyled initial frame. */}
      <div
        ref={topGlowRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at ${isMobile ? '50% 32%' : '25% 50%'}, rgba(212, 180, 124, 0.08) 0%, rgba(248, 247, 242, 0) 60%)`,
        }}
      />
      <div
        ref={frontGlowRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: isMobile
            ? 'radial-gradient(ellipse 74% 40% at 50% 34%, rgba(212, 180, 124, 0.2) 0%, rgba(248, 247, 242, 0) 70%)'
            : `radial-gradient(ellipse 44% 58% at ${drawerOpen ? 20 : 25}% 48%, rgba(212, 180, 124, 0.18) 0%, rgba(248, 247, 242, 0) 68%)`,
        }}
      />

      {/* LAYER 1 (z-10): True 3D Tilted Rotating Alabaster-Marble Tabletop + Stone Slab Thickness + Flush Gold Coasters + Overhead Plates */}
      <div className="pointer-events-none absolute inset-0 z-10 isolate">
        <div
          ref={cameraRigRef}
          className="pointer-events-auto absolute top-0 left-0 will-change-transform"
          style={{
            width: `${targetGeo.tableDiameter}px`,
            height: `${targetGeo.tableDiameter}px`,
            transformStyle: 'preserve-3d',
          }}
        >
          {/* Solid 3D Bevelled Alabaster Marble Slab Edge Thickness */}
          <div
            ref={slabEdgeRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{
              transform: 'translateZ(-18px)',
              background:
                'linear-gradient(180deg, #D5CEC1 0%, #BDB3A1 50%, #8F8574 100%)',
              boxShadow: '0 22px 48px rgba(3, 6, 15, 0.72)',
              // Opacity owned solely by paintFrame (see the glow note above).
            }}
          />

          {/* Non-rotating ambient shadow beneath the marble disc (zero-blur gradient, physically grounded) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-[5.5%] rounded-full"
            style={{
              transform: 'translate3d(0, 2.2%, 0) translateZ(-20px)',
              background:
                'radial-gradient(circle at 50% 50%, rgba(15, 20, 28, 0.34) 68%, rgba(15, 20, 28, 0.14) 84%, rgba(15, 20, 28, 0) 100%)',
            }}
          />

          {/* Outer Subtle Antique-Gold Trim Rim */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-[3px] rounded-full"
            style={{
              border: '1px solid rgba(212, 180, 124, 0.34)',
              transform: 'translateZ(-4px)',
            }}
          />

          {/* Physically Rotating Circular Alabaster-Marble Disc */}
          <div
            key={category.id}
            ref={wheelDiscRef}
            className="eyvan-table-swap eyvan-rotary-table relative h-full w-full rounded-full will-change-transform"
          >
            {/* Asymmetric natural stone veining + brass radial compass inlays */}
            <MarbleTableInlays
              slotCount={category.comingSoon ? 4 : items.length}
            />

            {/* Flush Brass Coaster Rings & Overhead Saucers physically seated ON the rotating marble disc */}
            {category.comingSoon
              ? comingSoonSlots.map((slotIdx) => {
                  const pos = getWheelSlotPosition(
                    slotIdx,
                    comingSoonSlots.length,
                    targetGeo.ringRadiusPct,
                  );
                  return (
                    <div
                      key={slotIdx}
                      className="absolute flex items-center justify-center"
                      style={{
                        left: `${pos.xPct}%`,
                        top: `${pos.yPct}%`,
                        width: `${targetGeo.dishSize * 1.12}px`,
                        height: `${targetGeo.dishSize * 1.12}px`,
                        transform: 'translate(-50%, -50%)',
                      }}
                    >
                      <ComingSoonClochePlate label={category.name} />
                    </div>
                  );
                })
              : items.map((item, idx) => {
                  const pos = getWheelSlotPosition(
                    idx,
                    items.length,
                    targetGeo.ringRadiusPct,
                  );
                  const isActive = idx === activeIndex;
                  const isHovered = overviewMode && hoveredOverviewIndex === idx;
                  const plateScale = overviewMode
                    ? isHovered
                      ? 1.16
                      : 0.98
                    : isActive
                      ? isMobile
                        ? 1.16
                        : 1.32
                      : isMobile
                        ? 0.86
                        : 0.88;
                  const isBroken = Boolean(brokenImages[item.id]);

                  return (
                    <div
                      key={item.id}
                      className="absolute"
                      style={{
                        left: `${pos.xPct}%`,
                        top: `${pos.yPct}%`,
                        width: `${targetGeo.dishSize}px`,
                        height: `${targetGeo.dishSize}px`,
                        transform: 'translate(-50%, -50%)',
                        zIndex: isActive || isHovered ? 20 : 10,
                      }}
                    >
                      {/* Delicate Flush Inlaid Gold Coaster Hairline */}
                      <div
                        ref={(el) => {
                          coasterRefs.current[idx] = el;
                        }}
                        aria-hidden="true"
                        className="pointer-events-none absolute top-1/2 left-1/2 rounded-full"
                        style={{
                          width: item.vesselType === 'tall' ? '42%' : '56%',
                          height: item.vesselType === 'tall' ? '42%' : '56%',
                          transform: 'translate(-50%, -50%)',
                          border: isActive
                            ? '1.2px solid rgba(175, 137, 75, 0.44)'
                            : '1px solid rgba(175, 137, 75, 0.24)',
                          // Opacity owned solely by paintFrame (see the glow note above).
                        }}
                      />

                      {/* Overhead 90° Studio Plate */}
                      <button
                        ref={(el) => {
                          plateBtnRefs.current[idx] = el;
                        }}
                        type="button"
                        onClick={() => {
                          if (overviewMode) {
                            onExitOverviewToIndex(idx);
                          } else if (isActive) {
                            onChangeCameraAngle('front');
                          } else {
                            onSelectIndex(idx);
                          }
                        }}
                        onMouseEnter={() => {
                          if (overviewMode) setHoveredOverviewIndex(idx);
                        }}
                        onMouseLeave={() => {
                          if (overviewMode) setHoveredOverviewIndex(null);
                        }}
                        tabIndex={isFrontCamera ? -1 : 0}
                        aria-hidden={isFrontCamera}
                        aria-label={
                          isActive
                            ? `${item.name} — پایین آمدن دوربین به نمای روبه‌رو`
                            : `${item.name} — انتخاب روی میز`
                        }
                        aria-pressed={isActive}
                        className="eyvan-stage-btn eyvan-plate-scale group absolute inset-0 cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B7043]"
                        style={{
                          transform: `scale(${plateScale})`,
                          transition: 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)',
                        }}
                      >
                        {!overviewMode && isActive && (
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-[12%] rounded-full"
                            style={{
                              background:
                                'radial-gradient(circle at 50% 54%, rgba(28, 30, 18, 0.22) 38%, rgba(28, 30, 18, 0.08) 66%, rgba(28, 30, 18, 0) 88%)',
                            }}
                          />
                        )}
                        {overviewMode && (isActive || isHovered) && (
                          <span
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-[14%] rounded-full border-2 border-[#B5945B]/70"
                          />
                        )}

                        {/* Warm alabaster saucer base so slot never looks empty while decoding on slow networks */}
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-[16%] rounded-full border border-[#B5945B]/16 bg-[#E9E4DA]/70"
                        />
                        {!isBroken ? (
                          <FadeInImage
                            src={isMobile ? toThumbSrc(item.image) : item.image}
                            fallbackSrc={item.image}
                            alt={item.name}
                            width={isMobile ? 256 : 480}
                            height={isMobile ? 256 : 480}
                            decoding="async"
                            fetchPriority={isActive ? 'high' : undefined}
                            referrerPolicy="no-referrer"
                            draggable={false}
                            onError={() =>
                              setBrokenImages((prev) => ({
                                ...prev,
                                [item.id]: true,
                              }))
                            }
                            className={`${
                              isPrebakedTopdownSrc(item.image)
                                ? 'eyvan-plate-img-baked'
                                : 'eyvan-plate-img'
                            } pointer-events-none h-full w-full rounded-full object-cover`}
                            style={{
                              transform: `rotate(${item.plateAngle ?? 0}deg)`,
                            }}
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center rounded-full border border-[#B5945B]/40 bg-[#FFFFFF] p-4 text-center text-xs font-medium text-[#2F321C]">
                            {item.name}
                          </div>
                        )}
                      </button>
                    </div>
                  );
                })}
          </div>

          {/* Non-Rotating Center Medallion (Full-Table Overview Mode only) */}
          <div
            className={`pointer-events-none absolute top-1/2 left-1/2 flex h-[34%] w-[34%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-[#B5945B]/28 bg-[#F2EFE9]/92 px-6 text-center transition-[opacity,transform] duration-300 ${
              overviewMode ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              transform: overviewMode
                ? 'translate(-50%, -50%) translateZ(3px) scale(1)'
                : 'translate(-50%, -50%) translateZ(3px) scale(0.95)',
              transitionDelay: overviewMode ? '80ms' : '0ms',
            }}
          >
            <EyvanLogo variant="mark" tone="navy" className="scale-90" />
            {category.comingSoon ? (
              <>
                <p className="mt-2 text-lg font-semibold text-[#2F321C]">
                  {category.name}
                </p>
                <p className="mt-1 text-xs font-medium text-[#6B7043]">
                  {t.comingSoonAtEyvan}
                </p>
              </>
            ) : displayCenterItem ? (
              <>
                <p className="mt-2 text-xs text-[#6B7043]">
                  {category.shortName}
                </p>
                <p className="mt-0.5 text-lg font-semibold text-[#2F321C] leading-snug">
                  {displayCenterItem.name}
                </p>
                <p className="tabular-fa mt-1 text-sm font-medium text-[#6B7043]">
                  {formatPrice(
                    calculateItemPrice(
                      displayCenterItem,
                      getDefaultBean(displayCenterItem),
                      null,
                    ),
                  )}
                </p>
                <p className="mt-2 text-[11px] text-[#78716C]">
                  {t.clickAnyDrink}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-[#78716C]">
                {formatDigits(items.length)} {t.itemsOnTableSuffix}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* LAYER 2 (z-20): Mathematically Projected GPU-Composited Standing Drinks
          Zero-blur feathered studio grounding shadows + cached static depth-of-field bokeh */}
      {!category.comingSoon && standingMounted && (
        <div
          ref={standingLayerRef}
          className="pointer-events-none absolute inset-0 z-20 isolate"
          style={{ visibility: 'hidden' }}
        >
          {items.map((item, idx) => {
            const rawDiff = Math.abs(idx - activeIndex);
            const ringDist = Math.min(rawDiff, items.length - rawDiff);

            // All category seats stay mounted so rotating the table never pops glasses in/out abruptly.

            const isActive = idx === activeIndex;
            const isCup = item.vesselType === 'cup';
            const baseHeight = isCup
              ? targetGeo.cupCutoutH
              : targetGeo.tallCutoutH;
            const baseFootW = isCup ? baseHeight * 0.64 : baseHeight * 0.29;
            const shadowBoxW = Math.round(baseFootW * 1.9);
            const shadowBoxH = Math.round(Math.max(24, baseFootW * 0.52));
            const causticTint = isCup
              ? null
              : getGlassCausticTint(item.cutoutImage);
            const shadowBg = buildGroundingShadowBackground(causticTint);

            // Zero-blur depth treatment: live CSS blur() combined with per-frame
            // scale() forces texture re-rasterization on mobile GPUs & Safari.
            // Depth hierarchy is handled by perspective scale + opacity + subtle tone.
            const cachedImgFilter = isMobile
              ? undefined
              : ringDist === 0
                ? undefined
                : ringDist === 1
                  ? 'brightness(0.95) saturate(0.94)'
                  : 'brightness(0.88) saturate(0.88)';
            const cutoutSrc = isMobile
              ? toMobileCutoutSrc(item.cutoutImage)
              : item.cutoutImage;
            const cutoutDims = getCutoutDimensions(item.cutoutImage);

            return (
              <div
                key={`projected-${item.id}`}
                ref={(el) => {
                  seatWrapperRefs.current[idx] = el;
                }}
                className="pointer-events-none absolute top-0 left-0 will-change-transform"
              >
                {/* Unified 3-Layer Zero-Blur Grounding Shadow (Contact Seam + Caustic Bounce + Studio Cast) */}
                <div
                  ref={(el) => {
                    seatShadowRefs.current[idx] = el;
                  }}
                  aria-hidden="true"
                  className="pointer-events-none absolute top-0 left-0"
                  style={{
                    width: `${shadowBoxW}px`,
                    height: `${shadowBoxH}px`,
                    transformOrigin: '50% 50%',
                    backgroundImage: shadowBg,

                  }}
                />

                {/* Standing Background-Free Cutout Glass / Cup (100% GPU transform scaling, zero Layout reflow) */}
                <button
                  ref={(el) => {
                    seatBtnRefs.current[idx] = el;
                  }}
                  type="button"
                  onClick={() => {
                    if (!isFrontCamera) return;
                    if (isActive) {
                      onChangeCameraAngle('top');
                    } else {
                      onSelectIndex(idx);
                    }
                  }}
                  tabIndex={isFrontCamera ? 0 : -1}
                  aria-hidden={!isFrontCamera}
                  aria-label={
                    isActive
                      ? `${item.name} — بازگشت به نمای بالا`
                      : `${item.name} — چرخاندن میز و نمایش از روبه‌رو`
                  }
                  className="eyvan-stage-btn pointer-events-auto absolute bottom-0 left-0 cursor-pointer border-0 bg-transparent p-0 focus-visible:outline-none"
                  style={{
                    height: `${baseHeight}px`,
                    width: 'auto',
                    transformOrigin: isCup ? '45.5% 100%' : '50% 100%',

                  }}
                >
                  <FadeInImage
                    src={cutoutSrc}
                    fallbackSrc={item.cutoutImage}
                    alt={`نمای روبه‌رو ${item.name}`}
                    width={cutoutDims?.width}
                    height={cutoutDims?.height}
                    decoding="async"
                    referrerPolicy="no-referrer"
                    draggable={false}
                    className="pointer-events-none block h-full w-auto max-w-none object-contain select-none"
                    style={
                      cachedImgFilter ? { filter: cachedImgFilter } : undefined
                    }
                  />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Subtle Rising Steam Overlay positioned over the focal hot beverage (Top-Down Desktop Hero Mode only) */}
      {!overviewMode &&
        !isFrontCamera &&
        !category.comingSoon &&
        activeItem?.isHot &&
        !isMobile &&
        deviceProfile.enableSteam && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute z-30 flex gap-3 opacity-75"
            style={{
              left: drawerOpen ? '19.5%' : '24.5%',
              top: '51%',
              transform: 'translate(-50%, -50%)',
            }}
          >
            {[0, 1, 2].map((w) => (
              <span
                key={w}
                className="eyvan-steam-line block h-12 w-1 rounded-full bg-gradient-to-t from-transparent via-[#9AA16A]/35 to-transparent blur-[1px]"
                style={{ animationDelay: `${w * 0.9}s` }}
              />
            ))}
          </div>
        )}
    </div>
  );
});
