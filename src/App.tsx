import React, {
  lazy,
  memo,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Disc,
  Eye,
  Globe,
  LayoutGrid,
  List,
  MapPin,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Thermometer,
} from 'lucide-react';
import {
  BeanType,
  CAFE_INFO,
  CategoryId,
  MENU_CATEGORIES,
  MENU_ITEMS,
  MenuItem,
} from './data/menuData';
import {
  calculateItemPrice,
  getBackdropHex,
  getDefaultBean,
} from './utils/menuLogic';
import { EyvanLogo } from './components/EyvanLogo';
import { SplashScreen } from './components/SplashScreen';
import { CameraAngle, RotaryTableStage } from './components/RotaryTableStage';
import { InstagramIcon } from './components/InstagramIcon';
import { preloadAndDecodeImage, toThumbSrc } from './components/FadeInImage';
import { prefersReducedMotion } from './utils/motion';
import { getDeviceProfile } from './utils/deviceTier';
import { localizeCategory, localizeItem, useLanguage } from './i18n/LanguageContext';

const SimpleMenuView = lazy(() =>
  import('./components/SimpleMenuView').then((m) => ({
    default: m.SimpleMenuView,
  })),
);
const DrinkCustomizeDrawer = lazy(() =>
  import('./components/DrinkCustomizeDrawer').then((m) => ({
    default: m.DrinkCustomizeDrawer,
  })),
);
const CafeInfoModal = lazy(() =>
  import('./components/CafeInfoModal').then((m) => ({
    default: m.CafeInfoModal,
  })),
);
const SearchOverlay = lazy(() =>
  import('./components/SearchOverlay').then((m) => ({
    default: m.SearchOverlay,
  })),
);
const MobileCategorySheet = lazy(() =>
  import('./components/MobileCategorySheet').then((m) => ({
    default: m.MobileCategorySheet,
  })),
);
const AdminApp = lazy(() =>
  import('./admin/AdminApp').then((m) => ({ default: m.AdminApp })),
);

type ViewMode = 'table' | 'simple';



/**
 * Jump to the top of the page synchronously, with no animation.
 * `behavior: 'instant'` (not 'auto') is required: index.css sets
 * `scroll-behavior: smooth` on <html>, so 'auto' would still animate.
 * Call BEFORE switching views — a smooth scroll started at the switch races
 * the content swap and the browser's scroll anchoring: the table page is
 * short (100dvh + footer) and the simple menu is very tall, so when the tall
 * menu mounts, anchoring tries to keep the visible footer in place and drags
 * the viewport to the end of the page for a moment. Instant is also the
 * reduced-motion-friendly choice (no animation at all).
 */
function scrollToTopInstant(): void {
  window.scrollTo({ top: 0, behavior: 'instant' });
}

/**
 * How long (ms) the outgoing text layer stays mounted after an item change.
 * Must stay in sync with `.eyvan-crossfade-out` in index.css (250ms) plus a
 * small margin, so the layer unmounts only after its fade has finished.
 */
const CROSSFADE_OUT_MS = 260;

/**
 * Resize debounce for the category-dock centering listener (P2-5), matching
 * the stage's debounced resize listener (RotaryTableStage, 150ms).
 */
const RESIZE_DEBOUNCE_MS = 150;

/**
 * Background tone crossfade duration (P1-6). Must stay in sync with the
 * `duration-400` on the background overlay layer in the App root.
 */
const BG_FADE_MS = 400;

/**
 * Splash gate timings (P0-1). The splash used to hold 950ms + fade 700ms
 * (1,650ms fixed), hiding content that was already rendered underneath.
 * The 500ms hold lets the 500ms arch draw finish exactly as the fade
 * starts, so the splash still looks complete, not truncated; the 400ms
 * fade keeps the exit soft. Total ~900ms. SPLASH_FADE_MS must stay in sync
 * with the `duration-400` on the splash root in SplashScreen.tsx, and
 * SPLASH_HOLD_MS with the `.eyvan-draw-arch` duration in index.css.
 */
const SPLASH_HOLD_MS = 500;
const SPLASH_FADE_MS = 400;

/**
 * True crossfade for a single text spot (title, description, or price) when
 * the active item changes: the previous text fades out with a slight
 * downward drift while the new text fades in with a small rise, overlapping
 * the wheel turn so the swap reads as one gesture.
 *
 * Rapid-step safe: only ONE outgoing layer ever exists — each new change
 * replaces it with the latest previous text and restarts the unmount timer,
 * so hammering next/prev can never stack stale or duplicated text. Content
 * changes that don't change `itemKey` (e.g. the price updating on a bean
 * switch) swap instantly with no crossfade. Under prefers-reduced-motion no
 * outgoing layer is rendered at all (instant swap; the CSS animations are
 * neutralized in index.css too).
 *
 * The outgoing layer is absolutely positioned over the incoming one and is
 * aria-hidden + pointer-events-none, so it never affects layout, focus, or
 * screen readers. Only ever wrap plain text — never interactive controls.
 */
function CrossfadeText({
  itemKey,
  children,
}: {
  itemKey: string;
  children: React.ReactNode;
}) {
  const [outgoing, setOutgoing] = useState<{
    key: string;
    node: React.ReactNode;
  } | null>(null);
  const lastRef = useRef({ key: itemKey, node: children });
  const latestChildrenRef = useRef(children);
  latestChildrenRef.current = children;

  useEffect(() => {
    const prev = lastRef.current;
    lastRef.current = { key: itemKey, node: latestChildrenRef.current };
    if (prev.key === itemKey) return;
    if (prefersReducedMotion() || !getDeviceProfile().enableCrossfade) {
      setOutgoing(null);
      return;
    }
    setOutgoing({ key: prev.key, node: prev.node });
  }, [itemKey]);

  useEffect(() => {
    if (!outgoing) return;
    const timer = window.setTimeout(
      () => setOutgoing(null),
      CROSSFADE_OUT_MS,
    );
    return () => window.clearTimeout(timer);
  }, [outgoing]);

  return (
    <div className="relative">
      {outgoing && (
        <div
          key={outgoing.key}
          aria-hidden="true"
          className="eyvan-crossfade-out pointer-events-none absolute inset-0"
        >
          {outgoing.node}
        </div>
      )}
      <div key={itemKey} className="eyvan-crossfade-in relative">
        {children}
      </div>
    </div>
  );
}

/**
 * Isolated zero-App-rerender background tone crossfade layer.
 * Uses direct DOM style writes on two layers so changing backdrop tone
 * never triggers the 4x cascading re-render on the 1300-line App tree.
 */
const BackdropToneLayer = memo(function BackdropToneLayer({
  hex,
  active,
}: {
  hex: string;
  active: boolean;
}) {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const committedHexRef = useRef<string>(hex);

  useEffect(() => {
    const baseEl = baseRef.current;
    const overlayEl = overlayRef.current;
    if (!baseEl || !overlayEl) return;

    if (!active) {
      committedHexRef.current = hex;
      baseEl.style.backgroundColor = hex;
      overlayEl.style.opacity = '0';
      return;
    }

    if (hex === committedHexRef.current) return;

    overlayEl.style.backgroundColor = hex;
    let raf1 = 0;
    let raf2 = 0;
    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        if (overlayRef.current) {
          overlayRef.current.style.opacity = '1';
        }
      });
    });

    const timer = window.setTimeout(() => {
      committedHexRef.current = hex;
      if (baseRef.current) baseRef.current.style.backgroundColor = hex;
      if (overlayRef.current) overlayRef.current.style.opacity = '0';
    }, BG_FADE_MS + 40);

    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
      window.clearTimeout(timer);
    };
  }, [hex, active]);

  return (
    <>
      <div
        ref={baseRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10"
        style={{ backgroundColor: committedHexRef.current }}
      />
      {active && (
        <div
          ref={overlayRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 transition-opacity duration-400 ease-out"
          style={{ opacity: 0 }}
        />
      )}
    </>
  );
});

export default function App() {
  const { lang, toggleLang, t, cafeInfo, formatDigits, formatPrice } = useLanguage();
  const deviceProfile = getDeviceProfile();
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [activeCategoryId, setActiveCategoryId] =
    useState<CategoryId>('hot-coffee');
  const [simpleCategoryId, setSimpleCategoryId] = useState<CategoryId | 'all'>(
    'all',
  );
  const [activeItemIndex, setActiveItemIndex] = useState<number>(0);
  const [overviewMode, setOverviewMode] = useState<boolean>(false);
  const [cameraAngle, setCameraAngle] = useState<CameraAngle>('top');
  const [drawerItem, setDrawerItem] = useState<MenuItem | null>(null);
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [infoOpen, setInfoOpen] = useState<boolean>(false);
  const [mobileCatsOpen, setMobileCatsOpen] = useState<boolean>(false);
  const [splash, setSplash] = useState<'show' | 'leaving' | 'gone'>(
    // Reduced motion skips the splash from the very first render — deciding
    // here (not in a useEffect) means reduced-motion users never see even a
    // 1-frame splash flash.
    () => (prefersReducedMotion() ? 'gone' : 'show'),
  );
  // Explicit view-switch loading flag. The simple menu's chunk is lazy, and
  // the Suspense fallback alone cannot cover the load gap: it renders
  // inside the `.eyvan-view-enter` div, whose opacity animation (0→1) makes
  // it the containing block for the fixed fallback, so the fallback is
  // positioned relative to the ~0-height view div and effectively
  // invisible — the collapsed page (header + footer) shows crisply for ~1s
  // on a slow mobile connection. The overlay below renders at App root
  // level instead, is set synchronously in the switch handler, and lifts
  // only when the new view reports it has mounted.
  const [viewLoading, setViewLoading] = useState<boolean>(false);

  // Splash screen: show the arch logo for SPLASH_HOLD_MS, then fade out
  // over SPLASH_FADE_MS. Reduced motion is already 'gone' via the initial
  // state above, so no timers run for those users.
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const t1 = window.setTimeout(() => setSplash('leaving'), SPLASH_HOLD_MS);
    const t2 = window.setTimeout(
      () => setSplash('gone'),
      SPLASH_HOLD_MS + SPLASH_FADE_MS,
    );
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);
  // Preload the simple-menu chunk when the browser is idle after first
  // paint, so switching to «منوی ساده» is instant on repeat visits. Only
  // this chunk — never the admin chunk. The cast keeps TypeScript from
  // narrowing `window` to `never` in the fallback branch: lib.dom declares
  // requestIdleCallback as always present, but Safari doesn't implement it.
  useEffect(() => {
    if (!deviceProfile.allowIdlePreload) return;
    const preload = () => {
      import('./components/SimpleMenuView').catch(() => {
        // A failed preload is simply retried when the user switches views.
      });
    };
    const idle = window as unknown as {
      requestIdleCallback?: (
        cb: () => void,
        opts?: { timeout?: number },
      ) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    if (typeof idle.requestIdleCallback === 'function') {
      const handle = idle.requestIdleCallback(preload, { timeout: 3000 });
      return () => idle.cancelIdleCallback?.(handle);
    }
    const timer = window.setTimeout(preload, 1200);
    return () => window.clearTimeout(timer);
  }, []);
  // Safety net for the view-loading overlay: never leave it up forever if
  // the chunk import hangs (it normally resolves in well under a second),
  // and lift it immediately if the view flips back to the table before the
  // menu mounts (only reachable by keyboard while the overlay is up — the
  // overlay itself blocks pointer taps).
  useEffect(() => {
    if (!viewLoading) return;
    if (viewMode === 'table') {
      setViewLoading(false);
      return;
    }
    const timer = window.setTimeout(() => setViewLoading(false), 10000);
    return () => window.clearTimeout(timer);
  }, [viewMode, viewLoading]);
  // Admin panel: `#/admin` (and any `#/admin/...` route) renders the admin
  // app instead of the customer menu. The admin bundle stays lazy-loaded.
  const [isAdmin, setIsAdmin] = useState<boolean>(
    () =>
      typeof window !== 'undefined' &&
      window.location.hash.startsWith('#/admin'),
  );
  useEffect(() => {
    const onHashChange = () => {
      setIsAdmin(window.location.hash.startsWith('#/admin'));
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  const [selectedBeans, setSelectedBeans] = useState<
    Record<string, BeanType | undefined>
  >({});

  const dockButtonsRef = useRef<Record<string, HTMLButtonElement | null>>({});
  const mobileDockButtonsRef = useRef<Record<string, HTMLButtonElement | null>>(
    {},
  );

  const lastKeyStepRef = useRef<number>(0);
  const cardSwipeRef = useRef<{ x: number; y: number } | null>(null);

  const warmCategoryPlates = useCallback((catId: CategoryId) => {
    const mobile = typeof window !== 'undefined' && window.innerWidth < 1024;
    const urls = new Set(
      MENU_ITEMS.filter((i) => i.categoryId === catId).map((i) =>
        mobile ? toThumbSrc(i.image) : i.image,
      ),
    );
    for (const u of urls) preloadAndDecodeImage(u);
  }, []);

  const localizedCategories = useMemo(
    () => MENU_CATEGORIES.map((c) => localizeCategory(c, lang)),
    [lang],
  );

  const activeCategory = useMemo(
    () =>
      localizedCategories.find((c) => c.id === activeCategoryId) ??
      localizedCategories[0],
    [localizedCategories, activeCategoryId],
  );

  const categoryItems = useMemo(
    () =>
      MENU_ITEMS.filter((item) => item.categoryId === activeCategoryId).map(
        (item) => localizeItem(item, lang),
      ),
    [activeCategoryId, lang],
  );

  const safeIndex =
    categoryItems.length > 0
      ? ((activeItemIndex % categoryItems.length) + categoryItems.length) %
        categoryItems.length
      : 0;
  const activeItem: MenuItem | undefined = categoryItems[safeIndex];

  const activeBean: BeanType | undefined = activeItem
    ? (selectedBeans[activeItem.id] ?? getDefaultBean(activeItem))
    : undefined;

  const activeUnitPrice = activeItem
    ? calculateItemPrice(activeItem, activeBean, null)
    : 0;

  const backdropHex = useMemo(() => {
    if (viewMode === 'simple') return '#F8F7F2';
    const tone = activeItem?.backdropTone ?? activeCategory.defaultTone;
    return getBackdropHex(tone);
  }, [viewMode, activeItem, activeCategory.defaultTone]);

  // Background tone crossfade (P1-6). The root div used to animate
  // `background-color` over 400ms on every tone-changing item step — a
  // full-viewport repaint for the whole duration. Instead the committed
  // tone sits on the root with NO transition, and tone changes crossfade
  // through an opacity-only overlay layer (compositor-only, no repaint):
  // the overlay fades in with the new tone, then the tone commits to the
  // root and the overlay hides (its fade-out is invisible — the same color
  // is underneath by then).
  //
  // The overlay is safe in table view because every piece of table content
  // is positioned (stage absolute, showcase/footer relative, header/navs
  // fixed) and later in DOM order, so all of it paints above the overlay.
  // In simple view the menu content is in-flow (non-positioned) and a
  // positioned overlay would paint ABOVE it, so tone changes there commit
  // instantly instead — the switch is covered by the opaque loading
  // overlay anyway.
  //
  // Opacity-only fades are deliberately kept under prefers-reduced-motion
  // (same precedent as .eyvan-view-enter and the overlay backdrops in
  // index.css), so there is no motion guard here.
  // Backdrop tone crossfade is isolated inside <BackdropToneLayer />.

  // Keep the active category pill centered horizontally inside its own scroll rail (without ever vertically scrolling the page!)
  useEffect(() => {
    if (viewMode !== 'table') return;
    const centerInRail = (
      btn: HTMLButtonElement | null | undefined,
      behavior: ScrollBehavior,
    ) => {
      if (!btn || !btn.parentElement) return;
      const rail = btn.parentElement;
      if (rail.clientWidth === 0) return;
      const btnRect = btn.getBoundingClientRect();
      const railRect = rail.getBoundingClientRect();
      const delta =
        btnRect.left -
        railRect.left -
        railRect.width / 2 +
        btnRect.width / 2;
      rail.scrollTo({
        left: rail.scrollLeft + delta,
        behavior,
      });
    };
    const syncDock = (behavior: ScrollBehavior) => {
      centerInRail(dockButtonsRef.current[activeCategoryId], behavior);
      centerInRail(mobileDockButtonsRef.current[activeCategoryId], behavior);
    };
    const raf = window.requestAnimationFrame(() =>
      syncDock(prefersReducedMotion() ? 'auto' : 'smooth'),
    );
    // Debounced (P2-5): an undebounced resize fires syncDock's 4x
    // getBoundingClientRect + 2x scrollTo on every resize event (dozens
    // while rotating / dragging a window edge).
    let resizeTimer: number | undefined;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(
        () => syncDock('auto'),
        RESIZE_DEBOUNCE_MS,
      );
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.cancelAnimationFrame(raf);
      window.clearTimeout(resizeTimer);
      window.removeEventListener('resize', onResize);
    };
  }, [activeCategoryId, viewMode]);

  const handleSelectCategory = useCallback((id: CategoryId) => {
    const nextCat = MENU_CATEGORIES.find((c) => c.id === id);
    setActiveCategoryId(id);
    setActiveItemIndex(0);
    if (nextCat?.comingSoon) {
      setCameraAngle('top');
    }
    setDrawerItem(null);
  }, []);

  const handleStepItem = useCallback(
    (delta: number) => {
      if (categoryItems.length <= 1) return;
      setActiveItemIndex(
        (prev) => (prev + delta + categoryItems.length) % categoryItems.length,
      );
    },
    [categoryItems.length],
  );

  // Stable callbacks for RotaryTableStage (P1-2): the stage is memoized,
  // and fresh inline closures on every render defeated that memo on every
  // item step. Both use only stable setState functions, so the deps are
  // empty. (The component memo itself lives in RotaryTableStage.tsx.)
  const handleSelectIndex = useCallback((idx: number) => {
    setActiveItemIndex(idx);
  }, []);

  const handleExitOverviewToIndex = useCallback((idx: number) => {
    setActiveItemIndex(idx);
    setOverviewMode(false);
  }, []);

  // Stable callback for SimpleMenuView (P1-2): the card row is memoized,
  // and a fresh inline closure on every App render defeated that memo.
  const handleSelectItemDetails = useCallback((item: MenuItem) => {
    setDrawerItem(item);
  }, []);

  const handleJumpToTableItem = useCallback((item: MenuItem) => {
    const itemsInCat = MENU_ITEMS.filter(
      (i) => i.categoryId === item.categoryId,
    );
    const idx = Math.max(
      0,
      itemsInCat.findIndex((i) => i.id === item.id),
    );
    // Jump to the top BEFORE the view swaps (see scrollToTopInstant): the
    // user may be deep in the long simple menu, and the table page is short,
    // so without this the browser clamps the scroll to the bottom of the
    // table page and the footer flashes first.
    scrollToTopInstant();
    setActiveCategoryId(item.categoryId);
    setActiveItemIndex(idx);
    setOverviewMode(false);
    setCameraAngle(item.prefersFrontView ? 'front' : 'top');
    setViewMode('table');
    setDrawerItem(null);
  }, []);

  const handleSetBeanForItem = useCallback((itemId: string, bean: BeanType) => {
    setSelectedBeans((prev) => ({ ...prev, [itemId]: bean }));
  }, []);

  // SimpleMenuView calls this once it has mounted, so the state-driven
  // loading overlay lifts exactly when the menu is ready to paint.
  const handleSimpleMenuReady = useCallback(() => {
    setViewLoading(false);
  }, []);

  const handleOpenMobileCategories = useCallback(() => {
    setMobileCatsOpen(true);
  }, []);

  const handleToggleViewMode = useCallback(() => {
    // Jump to the top synchronously BEFORE the view swaps, in BOTH
    // directions (see scrollToTopInstant). The old code scrolled smoothly
    // from inside the setViewMode updater — a side effect in an updater,
    // which must stay pure — and only when switching TO the simple menu, so
    // switching back to the table landed at the clamped bottom of the short
    // table page. The smooth scroll also raced the lazy-chunk mount and the
    // browser's scroll anchoring, flashing the end of the long menu.
    scrollToTopInstant();
    setOverviewMode(false);
    setDrawerItem(null);
    if (viewMode === 'table') {
      // Switching TO the simple menu: its chunk is lazy, so engage the
      // loading overlay synchronously BEFORE the swap. The overlay renders
      // at App root level (outside the animating view div) and lifts when
      // SimpleMenuView reports it has mounted. The table view is
      // synchronous (direct import, no Suspense), so no overlay is needed
      // going back.
      setViewLoading(true);
    }
    setViewMode((prev) => (prev === 'table' ? 'simple' : 'table'));
  }, [viewMode]);

  // Keyboard navigation in Rotary Table mode
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        viewMode !== 'table' ||
        drawerItem ||
        searchOpen ||
        infoOpen ||
        mobileCatsOpen
      ) {
        return;
      }
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (e.key === 'Escape') {
        if (overviewMode) setOverviewMode(false);
        else if (cameraAngle === 'front') setCameraAngle('top');
      } else if (e.key === 'ArrowLeft' && !overviewMode) {
        const now = Date.now();
        if (now - lastKeyStepRef.current < 220) return;
        lastKeyStepRef.current = now;
        handleStepItem(1);
      } else if (e.key === 'ArrowRight' && !overviewMode) {
        const now = Date.now();
        if (now - lastKeyStepRef.current < 220) return;
        lastKeyStepRef.current = now;
        handleStepItem(-1);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    viewMode,
    drawerItem,
    searchOpen,
    infoOpen,
    mobileCatsOpen,
    overviewMode,
    cameraAngle,
    handleStepItem,
  ]);

  const hasDualBean =
    activeItem &&
    typeof activeItem.priceBlend50 === 'number' &&
    typeof activeItem.priceArabica100 === 'number';
  const isArabicaOnly =
    activeItem &&
    typeof activeItem.priceBlend50 !== 'number' &&
    typeof activeItem.priceArabica100 === 'number';

  const drawerCategoryName = useMemo(() => {
    if (!drawerItem) return activeCategory.name;
    return (
      localizedCategories.find((c) => c.id === drawerItem.categoryId)?.name ??
      activeCategory.name
    );
  }, [drawerItem, activeCategory.name, localizedCategories]);

  if (isAdmin) {
    return (
      <Suspense fallback={<SplashScreen compact />}>
        <AdminApp />
      </Suspense>
    );
  }

  return (
    <div
      className="relative min-h-screen w-full overflow-x-hidden text-[#2F321C]"
      style={{ backgroundColor: viewMode === 'simple' ? '#F8F7F2' : undefined }}
    >
      <BackdropToneLayer hex={backdropHex} active={viewMode === 'table'} />
      {splash !== 'gone' && <SplashScreen leaving={splash === 'leaving'} />}
      {/* View-switch loading overlay: rendered at App root level, OUTSIDE
      the `.eyvan-view-enter` div — an ancestor with opacity < 1 becomes the
      containing block for this fixed overlay and breaks its positioning
      (that is exactly why the old in-view Suspense fallback let the footer
      show through for ~1s). Fully opaque; lifts when the new view reports
      it has mounted. */}
      {viewLoading && <SplashScreen compact />}
      {/* Top Bar — 3-Zone Editorial Header (Official Eyvan Logo · Clean Links · Simple Menu / Rotary Table Toggle) */}
      <header className="fixed inset-x-0 top-0 z-30 h-14 border-b border-[rgba(107,112,67,0.1)] bg-[#FFFFFF]/96 md:h-16 lg:bg-[#FFFFFF]/96">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
          {/* Zone 1: Official Eyvan Brand Mark */}
          <button
            type="button"
            onClick={() => {
              scrollToTopInstant();
              setViewMode('table');
              setOverviewMode(false);
              setCameraAngle('top');
              setDrawerItem(null);
              handleSelectCategory('hot-coffee');
            }}
            aria-label="بازگشت به ابتدای منوی کافه و رستوران ایوان"
            className="shrink-0 rounded-[8px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B7043]"
          >
            <EyvanLogo variant="header" tone="gold" />
          </button>

          {/* Zone 2: Desktop Single-Line Navigation Links */}
          <nav
            aria-label="ناوبری اصلی"
            className="hidden items-center gap-7 text-sm font-normal text-[#57534E] md:flex"
          >
            {viewMode === 'table' && (
              <button
                type="button"
                onClick={() => {
                  setCameraAngle('top');
                  setOverviewMode((v) => !v);
                }}
                className={`whitespace-nowrap shrink-0 transition-colors hover:text-[#2F321C] ${
                  overviewMode ? 'text-[#6B7043]' : ''
                }`}
              >
                {t.overviewTable}
              </button>
            )}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="whitespace-nowrap shrink-0 transition-colors hover:text-[#2F321C]"
            >
              {t.search}
            </button>
            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              className="whitespace-nowrap shrink-0 transition-colors hover:text-[#2F321C]"
            >
              {t.cafeInfo}
            </button>
            <a
              href={CAFE_INFO.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors hover:text-[#6B7043]"
            >
              <InstagramIcon className="h-4 w-4" />
              <span>{t.instagram}</span>
            </a>
          </nav>

          {/* Zone 3: Language Switcher (FA <-> AR) + Mode Switcher */}
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={toggleLang}
              aria-label={t.switchLangAria}
              className="inline-flex items-center gap-1.5 rounded-[10px] border border-[rgba(107,112,67,0.2)] bg-[#F8F7F2] px-2.5 py-2 text-xs font-medium text-[#2F321C] transition-colors hover:border-[#B5945B] hover:bg-[#E8EAD9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B7043] whitespace-nowrap shrink-0 sm:px-3"
            >
              <Globe className="h-3.5 w-3.5 text-[#6B7043]" strokeWidth={1.7} />
              <span>{t.langShort}</span>
            </button>
            <button
              type="button"
              onClick={handleToggleViewMode}
              className="inline-flex items-center gap-2 rounded-[10px] border border-[rgba(181,148,91,0.44)] bg-[#FFFFFF]/95 px-3.5 py-2 text-xs font-medium text-[#2F321C] transition-colors hover:border-[#B5945B] hover:bg-[#E8EAD9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B7043] whitespace-nowrap shrink-0 sm:px-4 sm:text-sm"
            >
              {viewMode === 'table' ? (
                <>
                  <List
                    className="h-4 w-4 text-[#6B7043]"
                    strokeWidth={1.7}
                  />
                  <span>{t.simpleMenu}</span>
                </>
              ) : (
                <>
                  <Disc
                    className="h-4 w-4 text-[#6B7043]"
                    strokeWidth={1.7}
                  />
                  <span>{t.rotaryTable}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content: Either Rotary 3D Circular Table OR Classic Simple Menu */}
      <div key={viewMode} className="eyvan-view-enter">
        {viewMode === 'simple' ? (
        // min-h belt and braces: while the lazy chunk loads, the Suspense
        // fallback takes no layout space, so without this the footer jumps
        // up under the header. The min-height keeps it below the fold even
        // if the overlay is ever absent.
        <main className="min-h-[100dvh]">
          <Suspense fallback={<SplashScreen compact />}>
            <SimpleMenuView
              selectedCategory={simpleCategoryId}
              onSelectCategory={setSimpleCategoryId}
              selectedBeans={selectedBeans}
              onSelectItemDetails={handleSelectItemDetails}
              onInspectOnTable={handleJumpToTableItem}
              onOpenMobileCategories={handleOpenMobileCategories}
              onReady={handleSimpleMenuReady}
            />
          </Suspense>
        </main>
      ) : (
        <main className="relative h-[100dvh] min-h-[600px] w-full overflow-hidden">
          {/* Mobile Always-Visible Top Category Bar (directly below header — never hidden by mobile browser toolbars!) */}
          <nav
            aria-label="انتخاب دسته‌بندی منو در موبایل"
            className="fixed inset-x-0 top-[56px] z-30 border-b border-[rgba(107,112,67,0.1)] bg-[#F8F7F2]/97 px-2.5 py-1.5 md:top-16 lg:hidden"
          >
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setMobileCatsOpen(true)}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[8px] border border-[rgba(181,148,91,0.55)] bg-[#6B7043] px-2.5 text-[11.5px] font-medium text-white whitespace-nowrap transition-colors hover:bg-[#4F5330]"
              >
                <LayoutGrid className="h-3.5 w-3.5" strokeWidth={1.8} />
                <span>{t.categoriesBtn}</span>
              </button>

              <div className="eyvan-scroll-hidden flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
                {localizedCategories.map((category) => {
                  const isActive = category.id === activeCategoryId;
                  return (
                    <button
                      key={`mob-${category.id}`}
                      ref={(el) => {
                        mobileDockButtonsRef.current[category.id] = el;
                      }}
                      type="button"
                      onPointerDown={() => warmCategoryPlates(category.id)}
                      onMouseEnter={() => warmCategoryPlates(category.id)}
                      onClick={() => handleSelectCategory(category.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-[8px] px-2.5 text-[11.5px] font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B7043] ${
                        isActive
                          ? 'border border-[rgba(181,148,91,0.58)] bg-[#6B7043] text-white'
                          : 'border border-transparent text-[#57534E] hover:bg-[#FFFFFF] hover:text-[#2F321C]'
                      }`}
                    >
                      <span>{category.shortName}</span>
                      {category.comingSoon && (
                        <span className="text-[9.5px] font-normal text-[#6B7043]">
                          {t.comingSoon}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </nav>
          {/* Layer 1: Giant Rotating Circular Marble Tabletop + 3D Forward Camera Tilt */}
          <RotaryTableStage
            category={activeCategory}
            items={categoryItems}
            activeIndex={safeIndex}
            overviewMode={overviewMode}
            cameraAngle={cameraAngle}
            drawerOpen={Boolean(drawerItem)}
            onSelectIndex={handleSelectIndex}
            onStep={handleStepItem}
            onExitOverviewToIndex={handleExitOverviewToIndex}
            onChangeCameraAngle={setCameraAngle}
          />

          {/* Mobile Soft Bottom Scrim for Ultra-Crisp Persian Text Legibility.
          Two heights crossfade (opacity-only) instead of one layer snapping
          h-[54%] <-> h-[47%] on camera toggle — the snap moved the fade's
          top edge ~7% of the viewport instantly while the camera glided
          600ms. Opacity-only fades are kept under prefers-reduced-motion
          (see index.css), so no motion guard is needed. */}
          {!overviewMode && (
            <>
              <div
                aria-hidden="true"
                className={`pointer-events-none fixed inset-x-0 bottom-0 z-10 h-[54%] bg-gradient-to-t from-[#F8F7F2] via-[#F8F7F2]/92 to-transparent transition-opacity duration-500 ease-out lg:hidden ${
                  cameraAngle === 'front' ? 'opacity-0' : 'opacity-100'
                }`}
              />
              <div
                aria-hidden="true"
                className={`pointer-events-none fixed inset-x-0 bottom-0 z-10 h-[47%] bg-gradient-to-t from-[#F8F7F2] via-[#F8F7F2]/92 to-transparent transition-opacity duration-500 ease-out lg:hidden ${
                  cameraAngle === 'front' ? 'opacity-100' : 'opacity-0'
                }`}
              />
            </>
          )}

          {/* Overview Mode Top Exit Bar */}
          {overviewMode && (
            <div className="eyvan-text-enter pointer-events-none fixed inset-x-0 top-[108px] z-20 flex justify-center px-4 lg:top-[72px]">
              <div className="pointer-events-auto flex items-center gap-3.5 rounded-[12px] border border-[rgba(107,112,67,0.16)] bg-[#F8F7F2]/94 px-4 py-1.5 text-xs text-[#2F321C]">
                <span>{t.overviewBarPrefix} · {activeCategory.name}</span>
                <span aria-hidden="true" className="text-[#A8A29E]">
                  ·
                </span>
                <button
                  type="button"
                  onClick={() => setOverviewMode(false)}
                  className="font-medium text-[#6B7043] transition-colors hover:text-[#4F5330]"
                >
                  {t.backToSingleView}
                </button>
              </div>
            </div>
          )}

          {/* Layer 2: Right-Side Editorial Product Showcase (Desktop RTL Right / Mobile Lower Sheet) */}
          <section
            aria-label="جزئیات محصول انتخاب‌شده روی میز"
            className={`eyvan-showcase-panel pointer-events-none relative z-20 mx-auto flex h-full max-w-[1440px] flex-col justify-end px-3 pt-28 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-[opacity,transform] duration-300 ease-out sm:px-6 lg:flex-row lg:items-center lg:justify-start lg:px-12 lg:pt-16 lg:pb-16 ${
              overviewMode
                ? 'translate-y-4 opacity-0'
                : 'translate-y-0 opacity-100'
            }`}
          >
            <div
              onTouchStart={(e) => {
                if (overviewMode || activeCategory.comingSoon || categoryItems.length <= 1) return;
                const touch = e.touches[0];
                if (touch) cardSwipeRef.current = { x: touch.clientX, y: touch.clientY };
              }}
              onTouchEnd={(e) => {
                const start = cardSwipeRef.current;
                cardSwipeRef.current = null;
                if (!start || overviewMode || activeCategory.comingSoon || categoryItems.length <= 1) return;
                const touch = e.changedTouches[0];
                if (!touch) return;
                const dx = touch.clientX - start.x;
                const dy = touch.clientY - start.y;
                if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.2) {
                  handleStepItem(dx > 0 ? -1 : 1);
                }
              }}
              className={`pointer-events-auto w-full max-w-[460px] rounded-[18px] border border-[rgba(107,112,67,0.12)] bg-[#F8F7F2]/94 px-4 py-3.5 lg:max-w-[440px] lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0 ${
                overviewMode ? 'pointer-events-none' : ''
              }`}
            >
              {activeCategory.comingSoon ? (
                <div
                  key={activeCategory.id}
                  className="eyvan-text-enter space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-medium text-[#6B7043]">
                      <span>{t.eyvanKitchen}</span>
                      <span aria-hidden="true">·</span>
                      <span>{t.comingSoon}</span>
                    </div>
                    <div className="flex items-center gap-1.5 lg:hidden">
                      <button
                        type="button"
                        onClick={() => setSearchOpen(true)}
                        aria-label="جستجو در منو"
                        className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[rgba(107,112,67,0.16)] bg-[#FFFFFF]/90 text-[#2F321C]"
                      >
                        <Search className="h-3.5 w-3.5" strokeWidth={1.7} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setInfoOpen(true)}
                        aria-label="مشخصات و نشانی کافه"
                        className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[rgba(107,112,67,0.16)] bg-[#FFFFFF]/90 text-[#6B7043]"
                      >
                        <MapPin className="h-3.5 w-3.5" strokeWidth={1.7} />
                      </button>
                    </div>
                  </div>

                  <h1 className="text-2xl font-semibold leading-tight text-[#2F321C] sm:text-4xl lg:text-[46px]">
                    {activeCategory.name}
                  </h1>

                  <p className="text-[13px] leading-6 text-[#57534E] sm:text-[15px] sm:leading-7">
                    {activeCategory.comingSoonDescription}
                  </p>

                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleSelectCategory('hot-coffee')}
                      className="rounded-[10px] bg-[#6B7043] px-4 py-2.5 text-xs font-medium text-[#F8F7F2] transition-colors hover:bg-[#4F5330] sm:px-5 sm:text-sm"
                    >
                      {t.viewHotCoffee}
                    </button>
                    <a
                      href={CAFE_INFO.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-[10px] border border-[rgba(107,112,67,0.22)] bg-[#FFFFFF]/80 px-3.5 py-2.5 text-xs text-[#2F321C] transition-colors hover:border-[#B5945B] sm:px-4 sm:text-sm"
                    >
                      <InstagramIcon className="h-4 w-4 text-[#6B7043]" />
                      <span>{t.followLaunchInstagram}</span>
                    </a>
                  </div>
                </div>
              ) : activeItem ? (
                <div className="space-y-2.5 lg:space-y-4">
                  {/* Top Row: Category & Counter Metadata + Compact Mobile Quick Tools */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-[#6B7043]">
                      <span>{activeCategory.shortName}</span>
                      <span aria-hidden="true" className="text-[#A8A29E]">
                        ·
                      </span>
                      <span className="tabular-fa text-[#57534E]">
                        {formatDigits(safeIndex + 1)} {t.ofWord}{' '}
                        {formatDigits(categoryItems.length)}
                      </span>
                      {activeItem.highlight && (
                        <>
                          <span aria-hidden="true" className="text-[#A8A29E]">
                            ·
                          </span>
                          <span className="text-[#6B7043]">
                            {activeItem.highlight}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Mobile Compact Utility Buttons */}
                    <div className="flex shrink-0 items-center gap-1.5 lg:hidden">
                      <button
                        type="button"
                        onClick={() => {
                          setCameraAngle('top');
                          setOverviewMode(true);
                        }}
                        aria-label="نمای کلی میز"
                        className="inline-flex h-8 items-center gap-1 rounded-[8px] border border-[rgba(107,112,67,0.16)] bg-[#FFFFFF]/90 px-2.5 text-[11px] font-medium text-[#2F321C] transition-colors hover:border-[#B5945B]"
                      >
                        <Disc
                          className="h-3.5 w-3.5 text-[#6B7043]"
                          strokeWidth={1.7}
                        />
                        <span>{t.overviewShort}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSearchOpen(true)}
                        aria-label="جستجو در منو"
                        className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[rgba(107,112,67,0.16)] bg-[#FFFFFF]/90 text-[#2F321C]"
                      >
                        <Search className="h-3.5 w-3.5" strokeWidth={1.7} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setInfoOpen(true)}
                        aria-label="مشخصات و نشانی کافه"
                        className="flex h-8 w-8 items-center justify-center rounded-[8px] border border-[rgba(107,112,67,0.16)] bg-[#FFFFFF]/90 text-[#6B7043]"
                      >
                        <MapPin className="h-3.5 w-3.5" strokeWidth={1.7} />
                      </button>
                    </div>
                  </div>

                  {/* High-Contrast Persian Title (crossfades with the wheel turn) */}
                  <CrossfadeText itemKey={activeItem.id}>
                    <h1 className="text-[24px] font-semibold leading-[1.2] text-[#2F321C] sm:text-3xl lg:text-[46px]">
                      {activeItem.name}
                    </h1>
                  </CrossfadeText>

                  {/* Bright, Scannable Tasting Description (crossfades with the wheel turn) */}
                  <CrossfadeText itemKey={activeItem.id}>
                    <p className="line-clamp-2 text-[13px] leading-5 text-[#57534E] lg:line-clamp-none lg:text-[15px] lg:leading-7">
                      {activeItem.description}
                    </p>
                  </CrossfadeText>

                  {/* Live Bean Selector + Toman Price (No Trailing Zeros) */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 border-y border-[rgba(107,112,67,0.13)] py-2.5 lg:py-3">
                    <div>
                      <span className="block text-[10.5px] text-[#78716C] lg:text-[11px]">
                        {t.priceNoZeros}
                      </span>
                      <CrossfadeText itemKey={activeItem.id}>
                        <div className="tabular-fa mt-0.5 text-[22px] font-semibold text-[#6B7043] lg:text-[28px]">
                          {formatPrice(activeUnitPrice)}
                        </div>
                      </CrossfadeText>
                    </div>

                    {hasDualBean ? (
                      <div
                        role="group"
                        aria-label="انتخاب نوع دانه قهوه"
                        className="flex items-center gap-1 rounded-[10px] border border-[rgba(107,112,67,0.18)] bg-[#FFFFFF]/88 p-1"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            handleSetBeanForItem(activeItem.id, 'blend50')
                          }
                          className={`rounded-[7px] px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors lg:px-3 ${
                            activeBean === 'blend50'
                              ? 'bg-[#6B7043] text-[#F8F7F2]'
                              : 'text-[#57534E] hover:text-[#2F321C]'
                          }`}
                        >
                          {t.blend5050}
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleSetBeanForItem(activeItem.id, 'arabica100')
                          }
                          className={`rounded-[7px] px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors lg:px-3 ${
                            activeBean === 'arabica100'
                              ? 'bg-[#6B7043] text-[#F8F7F2]'
                              : 'text-[#57534E] hover:text-[#2F321C]'
                          }`}
                        >
                          {t.arabica100}
                        </button>
                      </div>
                    ) : isArabicaOnly ? (
                      <span className="text-xs font-medium text-[#6B7043]">
                        {t.arabicaExclusive}
                      </span>
                    ) : null}
                  </div>

                  {/* Primary & Secondary Actions: Balanced 2-Column Touch Grid on Mobile / Inline on Desktop */}
                  <div className="grid grid-cols-2 gap-2 pt-0.5 lg:flex lg:flex-wrap lg:items-center lg:gap-2.5">
                    <button
                      type="button"
                      onClick={() =>
                        setCameraAngle((prev) =>
                          prev === 'front' ? 'top' : 'front',
                        )
                      }
                      className={`inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-[10px] px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B7043] whitespace-nowrap lg:px-4 lg:py-2.5 lg:text-sm ${
                        cameraAngle === 'front'
                          ? 'border border-[#B5945B] bg-[#6B7043] text-white hover:bg-[#4F5330]'
                          : activeItem.prefersFrontView
                            ? 'bg-[#6B7043] text-[#F8F7F2] hover:bg-[#4F5330]'
                            : 'border border-[rgba(181,148,91,0.46)] bg-[#FFFFFF]/85 text-[#2F321C] hover:border-[#B5945B] hover:bg-[#FFFFFF]'
                      }`}
                    >
                      {cameraAngle === 'front' ? (
                        <>
                          <RotateCcw className="h-3.5 w-3.5 shrink-0 lg:h-4 lg:w-4" strokeWidth={1.7} />
                          <span>{t.backToTopView}</span>
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5 shrink-0 lg:h-4 lg:w-4" strokeWidth={1.7} />
                          <span>
                            {activeItem.prefersFrontView
                              ? t.viewFrontAngle
                              : t.frontCupView}
                          </span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setDrawerItem(activeItem)}
                      className={`inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-[10px] px-3 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B7043] whitespace-nowrap lg:px-4 lg:py-2.5 lg:text-sm ${
                        activeItem.prefersFrontView && cameraAngle !== 'front'
                          ? 'border border-[rgba(107,112,67,0.22)] bg-[#FFFFFF]/85 text-[#2F321C] hover:border-[#B5945B]'
                          : 'bg-[#FFFFFF] text-[#2F321C] hover:bg-[#E8EAD9]'
                      }`}
                    >
                      <SlidersHorizontal
                        className="h-3.5 w-3.5 shrink-0 lg:h-4 lg:w-4"
                        strokeWidth={1.6}
                      />
                      <span>
                        {activeItem.supportsSyrup
                          ? t.syrupAndDetails
                          : t.productDetails}
                      </span>
                    </button>
                  </div>

                  {/* Official Printed Milk Temperature Notice on Hot Bar */}
                  {activeCategory.isHotCategory &&
                    activeItem.supportsMilkTemp && (
                      <p className="flex items-start gap-2 text-[11px] leading-5 text-[#78716C]">
                        <Thermometer
                          className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6B7043]"
                          strokeWidth={1.6}
                        />
                        <span>{cafeInfo.milkTempNote}</span>
                      </p>
                    )}

                  {/* Rotary Table Prev / Next Controls + Desktop Overview Trigger / Mobile Swipe Cue */}
                  <div className="flex items-center justify-between gap-3 pt-0.5 lg:justify-start lg:gap-5 lg:pt-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleStepItem(-1)}
                        aria-label="نوشیدنی قبلی روی میز"
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(107,112,67,0.24)] bg-[#FFFFFF]/90 text-[#2F321C] transition-colors hover:border-[#B5945B] hover:text-[#6B7043] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B7043] lg:h-10 lg:w-10"
                      >
                        <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStepItem(1)}
                        aria-label="نوشیدنی بعدی روی میز"
                        className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(107,112,67,0.24)] bg-[#FFFFFF]/90 text-[#2F321C] transition-colors hover:border-[#B5945B] hover:text-[#6B7043] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B7043] lg:h-10 lg:w-10"
                      >
                        <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setCameraAngle('top');
                        setOverviewMode(true);
                      }}
                      className="hidden items-center gap-1.5 text-xs font-medium text-[#6B7043] transition-colors hover:text-[#4F5330] lg:inline-flex"
                    >
                      <Disc className="h-3.5 w-3.5" strokeWidth={1.7} />
                      <span>{t.fullTrayView}</span>
                    </button>

                    {/* Interactive pagination dots on mobile for effortless one-thumb navigation */}
                    {categoryItems.length > 1 && (
                      <div
                        className="flex items-center gap-1.5 lg:hidden"
                        role="tablist"
                        aria-label={activeCategory.name}
                      >
                        {categoryItems.map((it, idx) => {
                          const activeDot = idx === safeIndex;
                          return (
                            <button
                              key={it.id}
                              type="button"
                              role="tab"
                              aria-selected={activeDot}
                              aria-label={it.name}
                              onClick={() => handleSelectIndex(idx)}
                              className={`h-2 rounded-full transition-[width,background-color] duration-200 ${
                                activeDot
                                  ? 'w-5 bg-[#6B7043]'
                                  : 'w-2 bg-[#6B7043]/25 hover:bg-[#6B7043]/50'
                              }`}
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          {/* Desktop Bottom Spatial Category Dock (Mobile uses the always-visible top category bar below header) */}
          <nav
            aria-label="دسته‌بندی‌های منوی کافه و رستوران ایوان"
            className="pointer-events-none fixed inset-x-0 bottom-3 z-30 hidden justify-center px-3 lg:flex"
          >
            <div className="pointer-events-auto flex h-[52px] w-auto max-w-[1180px] items-center gap-1.5 rounded-[14px] border border-[rgba(107,112,67,0.16)] bg-[#FFFFFF]/95 p-1.5 shadow-xl">
              <div className="eyvan-scroll-hidden flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
                {localizedCategories.map((category) => {
                  const isActive = category.id === activeCategoryId;
                  return (
                    <button
                      key={category.id}
                      ref={(el) => {
                        dockButtonsRef.current[category.id] = el;
                      }}
                      type="button"
                      onPointerDown={() => warmCategoryPlates(category.id)}
                      onMouseEnter={() => warmCategoryPlates(category.id)}
                      onClick={() => handleSelectCategory(category.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[10px] px-3 text-xs font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B7043] ${
                        isActive
                          ? 'border border-[rgba(181,148,91,0.52)] bg-[#6B7043] text-white'
                          : 'border border-transparent text-[#57534E] hover:bg-[#FFFFFF] hover:text-[#2F321C]'
                      }`}
                    >
                      <span>{category.shortName}</span>
                      {category.comingSoon && (
                        <span className="text-[10px] font-normal text-[#6B7043]">
                          {t.comingSoon}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </nav>
        </main>
        )}
      </div>

      {/* Grounded Editorial Footer (Official Eyvan Logo, Hours, Location, Cashier Note & Instagram) */}
      <footer
        className={`relative z-20 border-t border-[rgba(107,112,67,0.1)] bg-[#FFFFFF] px-5 pt-12 sm:px-8 lg:px-12 ${
          viewMode === 'table' ? 'pb-24' : 'pb-12'
        }`}
        style={{ contentVisibility: 'auto', containIntrinsicSize: 'auto 320px' }}
      >
        <div className="mx-auto flex max-w-[1320px] flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col items-start gap-3">
            <EyvanLogo
              variant="full"
              tone="gold"
              className="items-start text-right"
            />
            <p className="max-w-sm text-xs leading-6 text-[#78716C]">
              {cafeInfo.tagline}
            </p>
            <p className="text-xs text-[#6B7043]">
              {cafeInfo.paymentNote} · {t.priceTomanNote}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 text-xs text-[#57534E] sm:grid-cols-2 sm:gap-10">
            <div className="space-y-3">
              <p className="text-sm font-medium text-[#2F321C]">
                {t.infoAndHours}
              </p>
              <div className="flex items-center gap-2">
                <Clock
                  className="h-4 w-4 shrink-0 text-[#6B7043]"
                  strokeWidth={1.5}
                />
                <span className="tabular-fa">{cafeInfo.hours}</span>
              </div>
              <div className="flex items-start gap-2">
                <MapPin
                  className="mt-0.5 h-4 w-4 shrink-0 text-[#6B7043]"
                  strokeWidth={1.5}
                />
                <button
                  type="button"
                  onClick={() => setInfoOpen(true)}
                  className="text-right transition-colors hover:text-[#6B7043]"
                >
                  {cafeInfo.addressStatus}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-[#2F321C]">
                {t.contactAndStandard}
              </p>
              <a
                href={CAFE_INFO.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-[#6B7043] transition-colors hover:text-[#4F5330]"
              >
                <InstagramIcon className="h-4 w-4 shrink-0" />
                <span dir="ltr">{CAFE_INFO.instagramHandle}</span>
              </a>
              <p className="max-w-xs leading-6 text-[#78716C]">
                {cafeInfo.milkTempNote}
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Drawers & Modals */}
      {drawerItem && (
        <Suspense fallback={<SplashScreen compact />}>
          <DrinkCustomizeDrawer
            item={localizeItem(drawerItem, lang)}
            categoryName={drawerCategoryName}
            selectedBean={
              drawerItem
                ? (selectedBeans[drawerItem.id] ?? getDefaultBean(drawerItem))
                : undefined
            }
            onBeanChange={(bean) => {
              if (drawerItem) handleSetBeanForItem(drawerItem.id, bean);
            }}
            onClose={() => setDrawerItem(null)}
          />
        </Suspense>
      )}

      {searchOpen && (
        <Suspense fallback={<SplashScreen compact />}>
          <SearchOverlay
            open={searchOpen}
            onClose={() => setSearchOpen(false)}
            onSelectMenuItem={handleJumpToTableItem}
          />
        </Suspense>
      )}

      {mobileCatsOpen && (
        <Suspense fallback={<SplashScreen compact />}>
          <MobileCategorySheet
            open={mobileCatsOpen}
            activeCategoryId={
              viewMode === 'simple' ? simpleCategoryId : activeCategoryId
            }
            includeAllOption={viewMode === 'simple'}
            onSelect={(catId) => {
              if (viewMode === 'simple') {
                setSimpleCategoryId(catId);
              } else if (catId !== 'all') {
                handleSelectCategory(catId);
              }
            }}
            onClose={() => setMobileCatsOpen(false)}
          />
        </Suspense>
      )}

      {infoOpen && (
        <Suspense fallback={<SplashScreen compact />}>
          <CafeInfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
        </Suspense>
      )}
    </div>
  );
}
