import {
  CAFE_INFO,
  MENU_CATEGORIES,
  MENU_ITEMS,
  SYRUP_OPTIONS,
} from '../data/menuData';
import type {
  AdminApi,
  AdminCategory,
  AdminItem,
  CafeInfoEditable,
  FeaturedPick,
  MenuState,
  NewCategoryInput,
  NewItemInput,
  PublishState,
  SeoMeta,
  Syrup,
} from './types';

/**
 * Mock implementation of the AdminApi contract. The store is seeded from the
 * REAL menu data (menuData.ts), kept in memory, and persisted to localStorage
 * so edits survive a reload. A `draft` copy holds edits; a `published` copy
 * holds what customers see. Publish copies draft → published.
 *
 * The PHP backend will replace this class without touching the views.
 */

const STORAGE_KEY = 'eyvan-admin-mock-v1';
const LATENCY_MS = 200;

/** The 3 default featured items (پیشنهاد ویژه) from the printed menu. */
const DEFAULT_FEATURED: FeaturedPick = [
  'eyvan-iced-latte',
  'hot-mocha',
  'chocolate-milkshake',
];

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

const delay = (ms = LATENCY_MS): Promise<void> =>
  new Promise((resolve) => window.setTimeout(resolve, ms));

/** Lets the admin shell refresh its publish badge after any mutation. */
export function notifyAdminChanged(): void {
  window.dispatchEvent(new CustomEvent('eyvan-admin-changed'));
}

function seedState(): MenuState {
  const categoryOrder = new Map(
    MENU_CATEGORIES.map((c, i) => [c.id, i] as const),
  );
  const perCategoryCount = new Map<string, number>();
  return {
    categories: MENU_CATEGORIES.map((c, i) => ({
      ...c,
      sortOrder: i,
    })),
    items: MENU_ITEMS.map((item) => {
      const n = perCategoryCount.get(item.categoryId) ?? 0;
      perCategoryCount.set(item.categoryId, n + 1);
      return { ...item, available: true, sortOrder: n };
    }),
    syrups: SYRUP_OPTIONS.map((s) => ({ ...s })),
    cafeInfo: {
      brandName: CAFE_INFO.brandName,
      brandSubtitle: CAFE_INFO.brandSubtitle,
      tagline: CAFE_INFO.tagline,
      instagramHandle: CAFE_INFO.instagramHandle,
      instagramUrl: CAFE_INFO.instagramUrl,
      hours: CAFE_INFO.hours,
      milkTempNote: CAFE_INFO.milkTempNote,
      paymentNote: CAFE_INFO.paymentNote,
      // The public menu only has a placeholder sentence for the address;
      // the admin fills the real one here.
      address: '',
      coordinatesLabel: CAFE_INFO.coordinatesLabel,
    },
    featured: [...DEFAULT_FEATURED],
    seo: {
      title: 'ایوان | کافه و رستوران',
      description: CAFE_INFO.tagline,
    },
  };
}

interface PersistedStore {
  draft: MenuState;
  published: MenuState;
  lastPublishedAt: string | null;
}

function loadStore(): PersistedStore {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedStore;
      if (parsed?.draft?.items && parsed?.published?.items) return parsed;
    }
  } catch {
    // Corrupt storage: fall through to a fresh seed.
  }
  const fresh = seedState();
  return { draft: fresh, published: clone(fresh), lastPublishedAt: null };
}

let newIdCounter = 0;
function newId(prefix: string): string {
  newIdCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${newIdCounter}`;
}

export class MockAdminApi implements AdminApi {
  private store: PersistedStore = loadStore();

  private persist(): void {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.store));
    } catch {
      // Storage full or unavailable: the in-memory store still works.
    }
    notifyAdminChanged();
  }

  private get draft(): MenuState {
    return this.store.draft;
  }

  async getMenu(): Promise<MenuState> {
    await delay();
    return clone(this.draft);
  }

  async getPublishedMenu(): Promise<MenuState> {
    await delay();
    return clone(this.store.published);
  }

  async updateItem(
    id: string,
    patch: Partial<AdminItem>,
  ): Promise<AdminItem> {
    await delay();
    const item = this.draft.items.find((i) => i.id === id);
    if (!item) throw new Error('آیتم پیدا نشد.');
    Object.assign(item, patch);
    this.persist();
    return clone(item);
  }

  async createItem(input: NewItemInput): Promise<AdminItem> {
    await delay();
    const siblings = this.draft.items.filter(
      (i) => i.categoryId === input.categoryId,
    );
    const item: AdminItem = {
      id: newId('item'),
      categoryId: input.categoryId,
      name: input.name,
      description: input.description ?? '',
      price: input.price,
      priceBlend50: input.priceBlend50,
      priceArabica100: input.priceArabica100,
      supportsSyrup: input.supportsSyrup ?? false,
      supportsMilkTemp: input.supportsMilkTemp ?? false,
      highlight: input.highlight,
      isHot: input.isHot ?? false,
      image: input.image ?? '',
      frontImage: input.frontImage ?? '',
      cutoutImage: input.cutoutImage ?? '',
      vesselType: input.vesselType ?? 'cup',
      prefersFrontView: input.prefersFrontView ?? false,
      plateAngle: input.plateAngle ?? 0,
      backdropTone: input.backdropTone ?? 'olive',
      available: input.available ?? true,
      sortOrder: siblings.length,
    };
    this.draft.items.push(item);
    this.persist();
    return clone(item);
  }

  async deleteItem(id: string): Promise<void> {
    await delay();
    this.draft.items = this.draft.items.filter((i) => i.id !== id);
    this.draft.featured = this.draft.featured.filter((f) => f !== id);
    this.persist();
  }

  async reorderItems(categoryId: string, orderedIds: string[]): Promise<void> {
    await delay();
    const order = new Map(orderedIds.map((id, i) => [id, i] as const));
    for (const item of this.draft.items) {
      if (item.categoryId === categoryId && order.has(item.id)) {
        item.sortOrder = order.get(item.id) as number;
      }
    }
    this.persist();
  }

  async updateCategory(
    id: string,
    patch: Partial<AdminCategory>,
  ): Promise<AdminCategory> {
    await delay();
    const category = this.draft.categories.find((c) => c.id === id);
    if (!category) throw new Error('دسته پیدا نشد.');
    Object.assign(category, patch);
    this.persist();
    return clone(category);
  }

  async createCategory(input: NewCategoryInput): Promise<AdminCategory> {
    await delay();
    const category: AdminCategory = {
      id: newId('cat'),
      name: input.name,
      shortName: input.shortName,
      subtitle: input.subtitle ?? '',
      defaultTone: input.defaultTone ?? 'olive',
      comingSoon: input.comingSoon ?? false,
      comingSoonDescription: input.comingSoonDescription,
      isHotCategory: input.isHotCategory ?? false,
      sortOrder: this.draft.categories.length,
    };
    this.draft.categories.push(category);
    this.persist();
    return clone(category);
  }

  async deleteCategory(id: string): Promise<void> {
    await delay();
    const hasItems = this.draft.items.some((i) => i.categoryId === id);
    if (hasItems) {
      throw new Error('این دسته آیتم دارد؛ اول آیتم‌هایش را جابه‌جا یا حذف کنید.');
    }
    this.draft.categories = this.draft.categories.filter((c) => c.id !== id);
    this.persist();
  }

  async reorderCategories(orderedIds: string[]): Promise<void> {
    await delay();
    const order = new Map(orderedIds.map((id, i) => [id, i] as const));
    for (const category of this.draft.categories) {
      if (order.has(category.id)) {
        category.sortOrder = order.get(category.id) as number;
      }
    }
    this.persist();
  }

  async updateSyrups(syrups: Syrup[]): Promise<Syrup[]> {
    await delay();
    this.draft.syrups = syrups.map((s) => ({ ...s }));
    this.persist();
    return clone(this.draft.syrups);
  }

  async updateFeatured(ids: FeaturedPick): Promise<FeaturedPick> {
    await delay();
    const valid = ids
      .slice(0, 3)
      .filter((id) => this.draft.items.some((i) => i.id === id));
    this.draft.featured = [...valid];
    this.persist();
    return [...this.draft.featured];
  }

  async updateCafeInfo(
    patch: Partial<CafeInfoEditable>,
  ): Promise<CafeInfoEditable> {
    await delay();
    Object.assign(this.draft.cafeInfo, patch);
    this.persist();
    return clone(this.draft.cafeInfo);
  }

  async updateSeo(seo: SeoMeta): Promise<SeoMeta> {
    await delay();
    this.draft.seo = { ...seo };
    this.persist();
    return clone(this.draft.seo);
  }

  async getPublishState(): Promise<PublishState> {
    await delay(60);
    return {
      hasDraft:
        JSON.stringify(this.draft) !== JSON.stringify(this.store.published),
      lastPublishedAt: this.store.lastPublishedAt,
    };
  }

  async publish(): Promise<PublishState> {
    await delay();
    this.store.published = clone(this.draft);
    this.store.lastPublishedAt = new Date().toISOString();
    this.persist();
    return {
      hasDraft: false,
      lastPublishedAt: this.store.lastPublishedAt,
    };
  }

  async discardDraft(): Promise<MenuState> {
    await delay();
    this.store.draft = clone(this.store.published);
    this.persist();
    return clone(this.draft);
  }

  async login(password: string): Promise<boolean> {
    await delay();
    // Mock mode: any non-empty password is accepted. The real check arrives
    // with the PHP backend.
    return password.trim().length > 0;
  }

  async changePassword(current: string, next: string): Promise<boolean> {
    await delay();
    if (current.trim().length === 0 || next.trim().length < 6) return false;
    return true;
  }

  async exportBackup(): Promise<string> {
    await delay();
    return JSON.stringify(
      {
        version: 1,
        exportedAt: new Date().toISOString(),
        draft: this.draft,
        published: this.store.published,
        lastPublishedAt: this.store.lastPublishedAt,
      },
      null,
      2,
    );
  }
}

/** The single API instance the admin views use. */
export const adminApi: AdminApi = new MockAdminApi();
