// Early preload for table plates:
// 1) Synchronously injects <link rel="preload"> for the default category's plates
//    (256px thumbs on mobile, 480px on desktop).
// 2) Right after initial paint (~180ms), preloads & decodes ALL 14 unique topdown
//    plates in the background (~134 KB total on mobile) so switching ANY category
//    is 100% instant with zero empty-table delay.
import { MENU_ITEMS } from './data/menuData';
import { preloadAndDecodeImage, toThumbSrc } from './components/FadeInImage';

const DEFAULT_CATEGORY_ID = 'hot-coffee';
const isMobileViewport =
  typeof window !== 'undefined' && window.innerWidth < 1024;

const navConn =
  typeof navigator !== 'undefined'
    ? (
        navigator as Navigator & {
          connection?: { saveData?: boolean; effectiveType?: string };
        }
      ).connection
    : undefined;
const isSaveData =
  Boolean(navConn?.saveData) ||
  navConn?.effectiveType === '2g' ||
  navConn?.effectiveType === 'slow-2g';

const toViewportPlate = (img: string) =>
  isMobileViewport ? toThumbSrc(img) : img;

const defaultTopdowns = Array.from(
  new Set(
    MENU_ITEMS.filter((item) => item.categoryId === DEFAULT_CATEGORY_ID).map(
      (item) => toViewportPlate(item.image),
    ),
  ),
);

const preloadList = isSaveData ? defaultTopdowns.slice(0, 1) : defaultTopdowns;

for (let i = 0; i < preloadList.length; i++) {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = preloadList[i];
  if (i === 0) {
    link.setAttribute('fetchpriority', 'high');
  }
  document.head.appendChild(link);
}

// Warm & pre-decode ALL remaining unique topdown plates right after first paint
// so switching categories never leaves an empty table.
if (!isSaveData && typeof window !== 'undefined') {
  const allUniquePlates = Array.from(
    new Set(MENU_ITEMS.map((item) => toViewportPlate(item.image))),
  );
  const warmAllPlates = () => {
    for (const src of allUniquePlates) {
      preloadAndDecodeImage(src);
    }
  };
  const idle = window as unknown as {
    requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
  };
  if (typeof idle.requestIdleCallback === 'function') {
    idle.requestIdleCallback(warmAllPlates, { timeout: 600 });
  } else {
    window.setTimeout(warmAllPlates, 180);
  }
}
