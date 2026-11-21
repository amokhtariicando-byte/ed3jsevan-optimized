import React, {
  lazy,
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
  formatToman,
  getBackdropHex,
  getDefaultBean,
  toPersianDigits,
} from './utils/menuLogic';
import { EyvanLogo } from './components/EyvanLogo';
import { SplashScreen } from './components/SplashScreen';
import { CameraAngle, RotaryTableStage } from './components/RotaryTableStage';
import { InstagramIcon } from './components/InstagramIcon';

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

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  );
}

export default function App() {
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
  const [splash, setSplash] = useState<'show' | 'leaving' | 'gone'>('show');

  // Splash screen: show the arch logo for 950ms, then fade out over 700ms
  // (same timing as the reference page). Reduced motion skips it entirely.
  useEffect(() => {
    if (prefersReducedMotion()) {
      setSplash('gone');
      return;
    }
    const t1 = window.setTimeout(() => setSplash('leaving'), 950);
    const t2 = window.setTimeout(() => setSplash('gone'), 1650);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);
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

  const activeCategory = useMemo(
    () =>
      MENU_CATEGORIES.find((c) => c.id === activeCategoryId) ??
      MENU_CATEGORIES[0],
    [activeCategoryId],
  );

  const categoryItems = useMemo(
    () => MENU_ITEMS.filter((item) => item.categoryId === activeCategoryId),
    [activeCategoryId],
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
    const onResize = () => syncDock('auto');
    window.addEventListener('resize', onResize);
    return () => {
      window.cancelAnimationFrame(raf);
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

  const handleJumpToTableItem = useCallback((item: MenuItem) => {
    const itemsInCat = MENU_ITEMS.filter(
      (i) => i.categoryId === item.categoryId,
    );
    const idx = Math.max(
      0,
      itemsInCat.findIndex((i) => i.id === item.id),
    );
    setActiveCategoryId(item.categoryId);
    setActiveItemIndex(idx);
    setOverviewMode(false);
    setCameraAngle(item.prefersFrontView ? 'front' : 'top');
    setViewMode('table');
    setDrawerItem(null);
    window.scrollTo({
      top: 0,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
    });
  }, []);

  const handleSetBeanForItem = useCallback((itemId: string, bean: BeanType) => {
    setSelectedBeans((prev) => ({ ...prev, [itemId]: bean }));
  }, []);

  const handleToggleViewMode = useCallback(() => {
    setOverviewMode(false);
    setDrawerItem(null);
    setViewMode((prev) => {
      const next = prev === 'table' ? 'simple' : 'table';
      if (next === 'simple') {
        window.scrollTo({
          top: 0,
          behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        });
      }
      return next;
    });
  }, []);

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
      MENU_CATEGORIES.find((c) => c.id === drawerItem.categoryId)?.name ??
      activeCategory.name
    );
  }, [drawerItem, activeCategory.name]);

  if (isAdmin) {
    return (
      <Suspense fallback={<SplashScreen compact />}>
        <AdminApp />
      </Suspense>
    );
  }

  return (
    <div
      className="relative min-h-screen w-full overflow-x-hidden text-[#2F321C] transition-[background-color] duration-400 ease-out"
      style={{ backgroundColor: backdropHex }}
    >
      {splash !== 'gone' && <SplashScreen leaving={splash === 'leaving'} />}
      {/* Top Bar — 3-Zone Editorial Header (Official Eyvan Logo · Clean Links · Simple Menu / Rotary Table Toggle) */}
      <header className="fixed inset-x-0 top-0 z-30 h-14 border-b border-[rgba(107,112,67,0.1)] bg-[#FFFFFF]/96 md:h-16 lg:bg-[#FFFFFF]/96">
        <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
          {/* Zone 1: Official Eyvan Brand Mark */}
          <button
            type="button"
            onClick={() => {
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
                نمای کلی میز
              </button>
            )}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="whitespace-nowrap shrink-0 transition-colors hover:text-[#2F321C]"
            >
              جستجو
            </button>
            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              className="whitespace-nowrap shrink-0 transition-colors hover:text-[#2F321C]"
            >
              مشخصات و نشانی
            </button>
            <a
              href={CAFE_INFO.instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors hover:text-[#6B7043]"
            >
              <InstagramIcon className="h-4 w-4" />
              <span>اینستاگرام</span>
            </a>
          </nav>

          {/* Zone 3: Mode Switcher — Simple Menu (منوی ساده) <-> Rotary Table (میز دوّار) */}
          <div className="flex shrink-0 items-center gap-2">
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
                  <span>منوی ساده</span>
                </>
              ) : (
                <>
                  <Disc
                    className="h-4 w-4 text-[#6B7043]"
                    strokeWidth={1.7}
                  />
                  <span>میز دوّار</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content: Either Rotary 3D Circular Table OR Classic Simple Menu */}
      <div key={viewMode} className="eyvan-view-enter">
        {viewMode === 'simple' ? (
        <main>
          <Suspense fallback={<SplashScreen compact />}>
            <SimpleMenuView
              selectedCategory={simpleCategoryId}
              onSelectCategory={setSimpleCategoryId}
              selectedBeans={selectedBeans}
              onSelectItemDetails={(item) => setDrawerItem(item)}
              onInspectOnTable={handleJumpToTableItem}
              onOpenMobileCategories={() => setMobileCatsOpen(true)}
            />
          </Suspense>
        </main>
      ) : (
        <main className="relative h-[100dvh] min-h-[600px] w-full overflow-hidden">
          {/* Mobile Always-Visible Top Category Bar (directly below header — never hidden by mobile browser toolbars!) */}
          <nav
            aria-label="انتخاب دسته‌بندی منو در موبایل"
            className="fixed inset-x-0 top-[56px] z-30 border-b border-[rgba(107,112,67,0.1)] bg-[#F8F7F2]/97 px-2.5 py-1.5 lg:hidden"
          >
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setMobileCatsOpen(true)}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-[8px] border border-[rgba(181,148,91,0.55)] bg-[#6B7043] px-2.5 text-[11.5px] font-medium text-white whitespace-nowrap transition-colors hover:bg-[#4F5330]"
              >
                <LayoutGrid className="h-3.5 w-3.5" strokeWidth={1.8} />
                <span>دسته‌ها</span>
              </button>

              <div className="eyvan-scroll-hidden flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
                {MENU_CATEGORIES.map((category) => {
                  const isActive = category.id === activeCategoryId;
                  return (
                    <button
                      key={`mob-${category.id}`}
                      ref={(el) => {
                        mobileDockButtonsRef.current[category.id] = el;
                      }}
                      type="button"
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
                          به‌زودی
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
            onSelectIndex={(idx) => setActiveItemIndex(idx)}
            onStep={handleStepItem}
            onExitOverviewToIndex={(idx) => {
              setActiveItemIndex(idx);
              setOverviewMode(false);
            }}
            onChangeCameraAngle={setCameraAngle}
          />

          {/* Mobile Soft Bottom Scrim for Ultra-Crisp Persian Text Legibility */}
          {!overviewMode && (
            <div
              aria-hidden="true"
              className={`pointer-events-none fixed inset-x-0 bottom-0 z-10 bg-gradient-to-t from-[#F8F7F2] via-[#F8F7F2]/92 to-transparent lg:hidden ${
                cameraAngle === 'front' ? 'h-[47%]' : 'h-[54%]'
              }`}
            />
          )}

          {/* Overview Mode Top Exit Bar */}
          {overviewMode && (
            <div className="eyvan-text-enter pointer-events-none fixed inset-x-0 top-[108px] z-20 flex justify-center px-4 lg:top-[72px]">
              <div className="pointer-events-auto flex items-center gap-3.5 rounded-[12px] border border-[rgba(107,112,67,0.16)] bg-[#F8F7F2]/94 px-4 py-1.5 text-xs text-[#2F321C]">
                <span>نمای کلی میز · {activeCategory.name}</span>
                <span aria-hidden="true" className="text-[#A8A29E]">
                  ·
                </span>
                <button
                  type="button"
                  onClick={() => setOverviewMode(false)}
                  className="font-medium text-[#6B7043] transition-colors hover:text-[#4F5330]"
                >
                  بازگشت به نمایش تکی
                </button>
              </div>
            </div>
          )}

          {/* Layer 2: Right-Side Editorial Product Showcase (Desktop RTL Right / Mobile Lower Sheet) */}
          <section
            aria-label="جزئیات محصول انتخاب‌شده روی میز"
            className={`eyvan-showcase-panel pointer-events-none relative z-20 mx-auto flex h-full max-w-[1440px] flex-col justify-end px-3 pt-28 pb-3 transition-[opacity,transform] duration-300 ease-out sm:px-6 lg:flex-row lg:items-center lg:justify-start lg:px-12 lg:pt-16 lg:pb-16 ${
              overviewMode
                ? 'translate-y-4 opacity-0'
                : 'translate-y-0 opacity-100'
            }`}
          >
            <div
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
                      <span>آشپزخانه کافه و رستوران ایوان</span>
                      <span aria-hidden="true">·</span>
                      <span>به‌زودی</span>
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
                      مشاهده بار قهوه گرم
                    </button>
                    <a
                      href={CAFE_INFO.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-[10px] border border-[rgba(107,112,67,0.22)] bg-[#FFFFFF]/80 px-3.5 py-2.5 text-xs text-[#2F321C] transition-colors hover:border-[#B5945B] sm:px-4 sm:text-sm"
                    >
                      <InstagramIcon className="h-4 w-4 text-[#6B7043]" />
                      <span>اطلاع از رونمایی در اینستاگرام</span>
                    </a>
                  </div>
                </div>
              ) : activeItem ? (
                <div
                  key={activeItem.id}
                  className="eyvan-text-enter space-y-2.5 lg:space-y-4"
                >
                  {/* Top Row: Category & Counter Metadata + Compact Mobile Quick Tools */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-[#6B7043]">
                      <span>{activeCategory.shortName}</span>
                      <span aria-hidden="true" className="text-[#A8A29E]">
                        ·
                      </span>
                      <span className="tabular-fa text-[#57534E]">
                        {toPersianDigits(safeIndex + 1)} از{' '}
                        {toPersianDigits(categoryItems.length)}
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
                        <span>نمای کلی</span>
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

                  {/* High-Contrast Persian Title */}
                  <h1 className="text-[24px] font-semibold leading-[1.2] text-[#2F321C] sm:text-3xl lg:text-[46px]">
                    {activeItem.name}
                  </h1>

                  {/* Bright, Scannable Tasting Description */}
                  <p className="line-clamp-2 text-[13px] leading-5 text-[#57534E] lg:line-clamp-none lg:text-[15px] lg:leading-7">
                    {activeItem.description}
                  </p>

                  {/* Live Bean Selector + Toman Price (No Trailing Zeros) */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5 border-y border-[rgba(107,112,67,0.13)] py-2.5 lg:py-3">
                    <div>
                      <span className="block text-[10.5px] text-[#78716C] lg:text-[11px]">
                        قیمت بدون صفر
                      </span>
                      <div className="tabular-fa mt-0.5 text-[22px] font-semibold text-[#6B7043] lg:text-[28px]">
                        {formatToman(activeUnitPrice)}
                      </div>
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
                          ۵۰٪/۵۰٪
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
                          ۱۰۰٪ عربیکا
                        </button>
                      </div>
                    ) : isArabicaOnly ? (
                      <span className="text-xs font-medium text-[#6B7043]">
                        سرو اختصاصی با ۱۰۰٪ عربیکا
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
                          <span>بازگشت به نمای بالا</span>
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5 shrink-0 lg:h-4 lg:w-4" strokeWidth={1.7} />
                          <span>
                            {activeItem.prefersFrontView
                              ? 'مشاهده نمای روبه‌رو'
                              : 'نمای روبه‌رو لیوان'}
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
                          ? 'سیروپ و جزئیات'
                          : 'جزئیات محصول'}
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
                        <span>{CAFE_INFO.milkTempNote}</span>
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
                      <span>نمای کامل سینی</span>
                    </button>

                    <span className="text-[11px] text-[#78716C] lg:hidden">
                      {cameraAngle === 'front'
                        ? 'برای چرخش میز بکشید یا روی نوشیدنی کناری بزنید'
                        : 'برای چرخش میز بکشید · روی نوشیدنی بزنید'}
                    </span>
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
                {MENU_CATEGORIES.map((category) => {
                  const isActive = category.id === activeCategoryId;
                  return (
                    <button
                      key={category.id}
                      ref={(el) => {
                        dockButtonsRef.current[category.id] = el;
                      }}
                      type="button"
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
                          به‌زودی
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
      >
        <div className="mx-auto flex max-w-[1320px] flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col items-start gap-3">
            <EyvanLogo
              variant="full"
              tone="gold"
              className="items-start text-right"
            />
            <p className="max-w-sm text-xs leading-6 text-[#78716C]">
              {CAFE_INFO.tagline}
            </p>
            <p className="text-xs text-[#6B7043]">
              {CAFE_INFO.paymentNote} · تمامی قیمت‌ها به تومان بدون صفرهای اضافه
              است.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 text-xs text-[#57534E] sm:grid-cols-2 sm:gap-10">
            <div className="space-y-3">
              <p className="text-sm font-medium text-[#2F321C]">
                اطلاعات و ساعات کاری
              </p>
              <div className="flex items-center gap-2">
                <Clock
                  className="h-4 w-4 shrink-0 text-[#6B7043]"
                  strokeWidth={1.5}
                />
                <span className="tabular-fa">{CAFE_INFO.hours}</span>
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
                  {CAFE_INFO.addressStatus}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-[#2F321C]">
                ارتباط و استاندارد سرو
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
                {CAFE_INFO.milkTempNote}
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Drawers & Modals */}
      {drawerItem && (
        <Suspense fallback={<SplashScreen compact />}>
          <DrinkCustomizeDrawer
            item={drawerItem}
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
