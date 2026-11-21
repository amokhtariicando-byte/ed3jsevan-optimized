import {
  BackdropTone,
  BeanType,
  CategoryId,
  MenuCategory,
  MenuItem,
  SYRUP_OPTIONS,
} from '../data/menuData';

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/**
 * Convert Latin digits (0-9) in a string or number to Persian digits (۰-۹).
 */
export function toPersianDigits(value: string | number): string {
  return String(value).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)] ?? d);
}

/**
 * Format Toman price without trailing zeros, matching the printed menu convention.
 * Example: 175 -> "۱۷۵ تومان"
 */
export function formatToman(amount: number): string {
  return `${toPersianDigits(Math.round(amount))} تومان`;
}

/**
 * Normalize Persian and Arabic character variants so search works seamlessly
 * across all Persian keyboards (ي/ی, ك/ک, zero-width non-joiner, extra spaces).
 */
export function normalizePersian(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/أ|إ|آ/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/\u200c/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Determine the default bean choice for an item that supports bean pricing.
 */
export function getDefaultBean(item: MenuItem): BeanType | undefined {
  if (typeof item.priceBlend50 === 'number') {
    return 'blend50';
  }
  if (typeof item.priceArabica100 === 'number') {
    return 'arabica100';
  }
  return undefined;
}

/**
 * Calculate the live unit price (in Toman, no trailing zeros) for a menu item
 * given an optional bean selection and optional syrup ID.
 */
export function calculateItemPrice(
  item: MenuItem,
  bean?: BeanType,
  syrupId?: string | null,
): number {
  let base = 0;

  if (bean === 'arabica100' && typeof item.priceArabica100 === 'number') {
    base = item.priceArabica100;
  } else if (bean === 'blend50' && typeof item.priceBlend50 === 'number') {
    base = item.priceBlend50;
  } else if (typeof item.price === 'number') {
    base = item.price;
  } else if (typeof item.priceBlend50 === 'number') {
    base = item.priceBlend50;
  } else if (typeof item.priceArabica100 === 'number') {
    base = item.priceArabica100;
  }

  if (syrupId && item.supportsSyrup) {
    const syrup = SYRUP_OPTIONS.find((s) => s.id === syrupId);
    if (syrup) {
      base += syrup.price;
    }
  }

  return base;
}

/**
 * Filter menu items by active category, or across ALL categories when searchQuery is non-empty.
 */
export function filterMenuItems(
  items: MenuItem[],
  activeCategoryId: CategoryId,
  searchQuery: string,
): MenuItem[] {
  const q = normalizePersian(searchQuery);
  if (!q) {
    return items.filter((item) => item.categoryId === activeCategoryId);
  }
  return items.filter((item) => {
    const haystack = normalizePersian(`${item.name} ${item.description}`);
    return haystack.includes(q);
  });
}

export interface SimpleMenuSection {
  category: MenuCategory;
  items: MenuItem[];
}

/**
 * Group menu items into categorized sections for Simple Menu mode (منوی ساده).
 * - When `selectedCategory === 'all'` and search is empty, returns all 11 sections (8 active + 3 coming soon).
 * - When a specific category is selected and search is empty, returns that single section.
 * - When searchQuery is non-empty, filters matching items across all categories (or within selectedCategory).
 */
export function groupMenuForSimpleView(
  categories: MenuCategory[],
  items: MenuItem[],
  selectedCategory: CategoryId | 'all',
  searchQuery: string,
): SimpleMenuSection[] {
  const q = normalizePersian(searchQuery);
  const scopedCategories =
    selectedCategory === 'all'
      ? categories
      : categories.filter((c) => c.id === selectedCategory);

  if (!q) {
    return scopedCategories.map((category) => ({
      category,
      items: items.filter((i) => i.categoryId === category.id),
    }));
  }

  const sections: SimpleMenuSection[] = [];
  for (const category of scopedCategories) {
    if (category.comingSoon) continue;
    const matched = items.filter((item) => {
      if (item.categoryId !== category.id) return false;
      const haystack = normalizePersian(
        `${item.name} ${item.description} ${category.name} ${category.shortName}`,
      );
      return haystack.includes(q);
    });
    if (matched.length > 0) {
      sections.push({ category, items: matched });
    }
  }
  return sections;
}

export function getBeanLabel(bean: BeanType): string {
  return bean === 'arabica100' ? '۱۰۰٪ عربیکا' : '۵۰٪/۵۰٪ ترکیب قهوه';
}

export function getMilkTempLabel(temp: 'standard' | 'extra-hot'): string {
  return temp === 'extra-hot'
    ? 'شیر داغ‌تر از استاندارد'
    : 'شیر استاندارد (۶۰ تا ۷۰ درجه)';
}

export function getSyrupById(syrupId?: string | null) {
  if (!syrupId) {
    return { id: 'none', name: 'بدون سیروپ', price: 0 };
  }
  const found = SYRUP_OPTIONS.find((s) => s.id === syrupId);
  return found
    ? { id: found.id, name: `سیروپ ${found.name}`, price: found.price }
    : { id: 'none', name: 'بدون سیروپ', price: 0 };
}

/**
 * Eyvan Official Logo-Derived Atmospheric Backdrop Palette.
 * Strictly anchored in Eyvan's brand logo colors: Deep Navy, Olive Green, Antique Bronze-Gold, Midnight Black.
 */
export const BACKDROP_HEX_MAP: Record<BackdropTone, string> = {
  navy: '#E7E9DC',
  midnight: '#F2F1E9',
  olive: '#E3E7CE',
  bronze: '#F4EBD6',
  plum: '#F0E7E2',
};

export function getBackdropHex(tone: BackdropTone): string {
  return BACKDROP_HEX_MAP[tone] ?? BACKDROP_HEX_MAP.navy;
}

/**
 * Compute the continuous shortest-path rotation angle (in degrees) for the circular
 * rotary tabletop so wrapping from last item -> first item (or first -> last)
 * always glides forward/backward by one smooth step instead of unwinding ~320deg.
 *
 * Slot `index` is placed at clockwise angle `(index / itemCount) * 360` from 12 o'clock.
 * To bring `targetIndex` to `focalAngleDeg`, the table angle mod 360 must equal
 * `(focalAngleDeg - slotAngle) mod 360`.
 */
export function computeShortestWheelAngle(
  currentAngleDeg: number,
  targetIndex: number,
  itemCount: number,
  focalAngleDeg = 32,
): number {
  if (itemCount <= 1) {
    return focalAngleDeg;
  }
  const normalizedIndex =
    ((targetIndex % itemCount) + itemCount) % itemCount;
  const slotAngle = (normalizedIndex / itemCount) * 360;
  const desiredMod = (((focalAngleDeg - slotAngle) % 360) + 360) % 360;
  const currentMod = ((currentAngleDeg % 360) + 360) % 360;

  let delta = desiredMod - currentMod;
  if (delta > 180) {
    delta -= 360;
  } else if (delta <= -180) {
    delta += 360;
  }

  return currentAngleDeg + delta;
}

export interface WheelSlotPosition {
  xPct: number;
  yPct: number;
  angleDeg: number;
}

/**
 * Compute radial coordinates (% of circular table box, centered at 50%, 50%)
 * for each dish resting around the perimeter of the circular marble tabletop.
 * Angle 0deg is 12 o'clock (top), progressing clockwise.
 */
export function getWheelSlotPosition(
  index: number,
  itemCount: number,
  ringRadiusPct = 36,
): WheelSlotPosition {
  const safeCount = Math.max(1, itemCount);
  const angleDeg = (index / safeCount) * 360;
  const rad = (angleDeg * Math.PI) / 180;
  const xPct = 50 + Math.sin(rad) * ringRadiusPct;
  const yPct = 50 - Math.cos(rad) * ringRadiusPct;

  return { xPct, yPct, angleDeg };
}
