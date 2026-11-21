import type {
  BackdropTone,
  MenuCategory,
  MenuItem,
  SyrupOption,
} from '../data/menuData';

/**
 * Admin-side types. IDs are plain strings here (the public menu types them as
 * the fixed CategoryId union, but the admin can create new categories).
 */

/** A menu item as the admin edits it. */
export interface AdminItem extends Omit<MenuItem, 'categoryId'> {
  categoryId: string;
  /** Shown on the menu when true; hidden when false (ناموجود). */
  available: boolean;
  /** Order inside its category (0-based). */
  sortOrder: number;
}

/** A menu category as the admin edits it. */
export interface AdminCategory extends Omit<MenuCategory, 'id'> {
  id: string;
  /** Order in the category list (0-based). */
  sortOrder: number;
}

/** The 3 featured items (پیشنهاد ویژه), in display order. Item ids, max 3. */
export type FeaturedPick = string[];

/** Editable cafe info. `address` starts empty (the public menu only has a
 * placeholder sentence for it today); the admin fills the real address. */
export interface CafeInfoEditable {
  brandName: string;
  brandSubtitle: string;
  tagline: string;
  instagramHandle: string;
  instagramUrl: string;
  hours: string;
  milkTempNote: string;
  paymentNote: string;
  address: string;
  coordinatesLabel: string;
}

export type Syrup = SyrupOption;

/** SEO meta for the public menu page. */
export interface SeoMeta {
  title: string;
  description: string;
}

export interface PublishState {
  /** True when the draft differs from the published menu. */
  hasDraft: boolean;
  /** ISO timestamp of the last publish, or null when never published. */
  lastPublishedAt: string | null;
}

/** The whole menu state: everything the admin edits, in one snapshot. */
export interface MenuState {
  categories: AdminCategory[];
  items: AdminItem[];
  syrups: Syrup[];
  cafeInfo: CafeInfoEditable;
  featured: FeaturedPick;
  seo: SeoMeta;
}

/** Fields for creating a new item. Everything except category + name is optional. */
export interface NewItemInput {
  categoryId: string;
  name: string;
  description?: string;
  price?: number;
  priceBlend50?: number;
  priceArabica100?: number;
  supportsSyrup?: boolean;
  supportsMilkTemp?: boolean;
  highlight?: string;
  isHot?: boolean;
  image?: string;
  frontImage?: string;
  cutoutImage?: string;
  vesselType?: 'tall' | 'cup';
  prefersFrontView?: boolean;
  plateAngle?: number;
  backdropTone?: BackdropTone;
  available?: boolean;
}

/** Fields for creating a new category. */
export interface NewCategoryInput {
  name: string;
  shortName: string;
  subtitle?: string;
  defaultTone?: BackdropTone;
  comingSoon?: boolean;
  comingSoonDescription?: string;
  isHotCategory?: boolean;
}

/**
 * The admin API contract. Every method is async and REST-shaped; the JSDoc on
 * each method names the future PHP endpoint it maps to. The mock
 * implementation (MockAdminApi) and the later PHP backend both implement this
 * interface, so the views never change when the backend arrives.
 */
export interface AdminApi {
  /** GET /api/admin/menu — the current DRAFT menu state (edits land here). */
  getMenu(): Promise<MenuState>;
  /** GET /api/menu — the PUBLISHED menu state (what customers see). */
  getPublishedMenu(): Promise<MenuState>;

  /** PATCH /api/admin/items/:id */
  updateItem(id: string, patch: Partial<AdminItem>): Promise<AdminItem>;
  /** POST /api/admin/items */
  createItem(input: NewItemInput): Promise<AdminItem>;
  /** DELETE /api/admin/items/:id */
  deleteItem(id: string): Promise<void>;
  /** POST /api/admin/items/reorder { categoryId, orderedIds } */
  reorderItems(categoryId: string, orderedIds: string[]): Promise<void>;

  /** PATCH /api/admin/categories/:id */
  updateCategory(
    id: string,
    patch: Partial<AdminCategory>,
  ): Promise<AdminCategory>;
  /** POST /api/admin/categories */
  createCategory(input: NewCategoryInput): Promise<AdminCategory>;
  /** DELETE /api/admin/categories/:id — fails when the category still has items. */
  deleteCategory(id: string): Promise<void>;
  /** POST /api/admin/categories/reorder { orderedIds } */
  reorderCategories(orderedIds: string[]): Promise<void>;

  /** PUT /api/admin/syrups — replaces the whole syrup list. */
  updateSyrups(syrups: Syrup[]): Promise<Syrup[]>;
  /** PUT /api/admin/featured — ordered item ids, max 3. */
  updateFeatured(ids: FeaturedPick): Promise<FeaturedPick>;
  /** PATCH /api/admin/cafe-info */
  updateCafeInfo(
    patch: Partial<CafeInfoEditable>,
  ): Promise<CafeInfoEditable>;
  /** PUT /api/admin/seo */
  updateSeo(seo: SeoMeta): Promise<SeoMeta>;

  /** GET /api/admin/publish-state */
  getPublishState(): Promise<PublishState>;
  /** POST /api/admin/publish — copies draft over published. */
  publish(): Promise<PublishState>;
  /** POST /api/admin/discard-draft — restores the draft from published. */
  discardDraft(): Promise<MenuState>;

  /** POST /api/admin/login */
  login(password: string): Promise<boolean>;
  /** POST /api/admin/change-password */
  changePassword(current: string, next: string): Promise<boolean>;
  /** GET /api/admin/backup — the whole store as a JSON string. */
  exportBackup(): Promise<string>;
}
