import React, { useMemo, useState } from 'react';
import {
  Disc,
  LayoutGrid,
  Search,
  SlidersHorizontal,
  Thermometer,
  X,
} from 'lucide-react';
import {
  BeanType,
  CAFE_INFO,
  CategoryId,
  MENU_CATEGORIES,
  MENU_ITEMS,
  MenuItem,
} from '../data/menuData';
import {
  formatToman,
  groupMenuForSimpleView,
  toPersianDigits,
} from '../utils/menuLogic';
import { InstagramIcon } from './InstagramIcon';

interface SimpleMenuViewProps {
  selectedCategory: CategoryId | 'all';
  onSelectCategory: (id: CategoryId | 'all') => void;
  selectedBeans: Record<string, BeanType | undefined>;
  onSelectItemDetails: (item: MenuItem) => void;
  onInspectOnTable: (item: MenuItem) => void;
  onOpenMobileCategories: () => void;
}

export const SimpleMenuView: React.FC<SimpleMenuViewProps> = ({
  selectedCategory,
  onSelectCategory,
  selectedBeans,
  onSelectItemDetails,
  onInspectOnTable,
  onOpenMobileCategories,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const sections = useMemo(
    () =>
      groupMenuForSimpleView(
        MENU_CATEGORIES,
        MENU_ITEMS,
        selectedCategory,
        searchQuery,
      ),
    [selectedCategory, searchQuery],
  );

  const totalVisibleItems = useMemo(
    () => sections.reduce((acc, s) => acc + s.items.length, 0),
    [sections],
  );

  return (
    <div className="min-h-screen bg-[#0E1525] pt-20 pb-14 text-[#F8F5EE]">
      <div className="mx-auto max-w-[1320px] px-4 sm:px-6 lg:px-10">
        {/* Top Heading + Search Bar */}
        <div className="flex flex-col gap-5 border-b border-[rgba(244,241,234,0.1)] pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-medium text-[#D4B47C]">
              منوی ساده و دسته‌بندی‌شده · کافه و رستوران ایوان
            </p>
            <h1 className="mt-1.5 text-2xl font-semibold text-[#F8F5EE] sm:text-3xl">
              فهرست کامل نوشیدنی‌ها و بخش‌های منو
            </h1>
            <p className="mt-1.5 text-xs leading-6 text-[#C4CCD8] sm:text-sm">
              {CAFE_INFO.paymentNote} · تمامی قیمت‌ها بدون صفر و به تومان درج شده است
            </p>
          </div>

          <div className="relative w-full lg:max-w-[360px]">
            <Search
              className="pointer-events-none absolute top-1/2 right-3.5 h-4 w-4 -translate-y-1/2 text-[#D4B47C]"
              strokeWidth={1.6}
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجو در منو (لاته، موهیتو، چای کرک...)"
              aria-label="جستجو در منوی ساده"
              className="w-full rounded-[10px] border border-[rgba(244,241,234,0.14)] bg-[#142035] py-2.5 pr-10 pl-9 text-sm text-[#F8F5EE] placeholder:text-[#96A2B5] focus:border-[#D4B47C] focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="پاک کردن جستجو"
                className="absolute top-1/2 left-2.5 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-[6px] text-[#A8B3C5] hover:text-[#F8F5EE]"
              >
                <X className="h-3.5 w-3.5" strokeWidth={1.7} />
              </button>
            )}
          </div>
        </div>

        {/* Sticky Category Filter Bar (Desktop full strip + Mobile pinned Categories Sheet trigger) */}
        <div className="sticky top-16 z-20 -mx-4 border-b border-[rgba(244,241,234,0.09)] bg-[#0E1525]/97 px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-10 lg:px-10">
          <div className="flex items-center gap-2">
            {/* Pinned Mobile Category Sheet Trigger */}
            <button
              type="button"
              onClick={onOpenMobileCategories}
              className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[10px] border border-[rgba(212,180,124,0.45)] bg-[#1B2B48] px-3 text-xs font-medium text-[#D4B47C] transition-colors hover:bg-[#23375B] md:hidden"
            >
              <LayoutGrid className="h-3.5 w-3.5" strokeWidth={1.7} />
              <span>دسته‌ها</span>
            </button>

            <div className="eyvan-scroll-hidden flex flex-1 items-center gap-1.5 overflow-x-auto">
              <button
                type="button"
                onClick={() => onSelectCategory('all')}
                className={`inline-flex h-10 shrink-0 items-center rounded-[10px] px-3.5 text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === 'all'
                    ? 'border border-[#D4B47C]/55 bg-[#1B2B48] text-[#D4B47C]'
                    : 'border border-transparent bg-[#131E33] text-[#D5DCE6] hover:bg-[#192740] hover:text-[#F8F5EE]'
                }`}
              >
                همه بخش‌ها
              </button>

              {MENU_CATEGORIES.map((category) => {
                const isActive = selectedCategory === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => onSelectCategory(category.id)}
                    className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[10px] px-3.5 text-xs font-medium whitespace-nowrap transition-colors ${
                      isActive
                        ? 'border border-[#D4B47C]/55 bg-[#1B2B48] text-[#D4B47C]'
                        : 'border border-transparent bg-[#131E33] text-[#D5DCE6] hover:bg-[#192740] hover:text-[#F8F5EE]'
                    }`}
                  >
                    <span>{category.shortName}</span>
                    {category.comingSoon && (
                      <span className="text-[10px] font-normal text-[#9AA16A]">
                        به‌زودی
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Search result count line */}
        {searchQuery.trim() && (
          <p className="mt-5 text-xs text-[#C4CCD8]">
            {totalVisibleItems > 0
              ? `${toPersianDigits(totalVisibleItems)} محصول منطبق با «${searchQuery.trim()}»`
              : `محصولی با عبارت «${searchQuery.trim()}» یافت نشد`}
          </p>
        )}

        {/* Categorized Sections */}
        {sections.length === 0 ? (
          <div className="mt-10 rounded-[16px] border border-[rgba(244,241,234,0.1)] bg-[#131E33] px-6 py-12 text-center">
            <p className="text-sm font-medium text-[#F8F5EE]">
              نتیجه‌ای برای جستجوی شما پیدا نشد
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                onSelectCategory('all');
              }}
              className="mt-4 rounded-[10px] bg-[#D4B47C] px-4 py-2 text-xs font-medium text-[#0E1525] transition-colors hover:bg-[#E1C48F]"
            >
              نمایش همه محصولات
            </button>
          </div>
        ) : (
          <div key={selectedCategory} className="mt-8 space-y-12">
            {sections.map(({ category, items }) => (
              <section
                key={category.id}
                aria-labelledby={`simple-cat-${category.id}`}
                className="scroll-mt-32"
              >
                {/* Section Header */}
                <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-[rgba(244,241,234,0.1)] pb-3.5">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h2
                        id={`simple-cat-${category.id}`}
                        className="text-xl font-semibold text-[#F8F5EE] sm:text-2xl"
                      >
                        {category.name}
                      </h2>
                      {category.comingSoon ? (
                        <span className="text-xs font-medium text-[#9AA16A]">
                          · به‌زودی
                        </span>
                      ) : (
                        <span className="tabular-fa text-xs text-[#A8B3C5]">
                          ({toPersianDigits(items.length)} مورد)
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs leading-6 text-[#B7C2D4] sm:text-sm">
                      {category.subtitle}
                    </p>
                  </div>

                  {category.isHotCategory && !category.comingSoon && (
                    <div className="flex items-center gap-2 text-[11px] text-[#C4CCD8]">
                      <Thermometer
                        className="h-3.5 w-3.5 shrink-0 text-[#D4B47C]"
                        strokeWidth={1.6}
                      />
                      <span>{CAFE_INFO.milkTempNote}</span>
                    </div>
                  )}
                </div>

                {/* Coming Soon Card vs Active Item Grid */}
                {category.comingSoon ? (
                  <div className="flex flex-col justify-between gap-4 rounded-[16px] border border-[rgba(154,161,106,0.28)] bg-[#141E30] p-6 sm:flex-row sm:items-center">
                    <div className="max-w-2xl">
                      <p className="text-xs font-medium text-[#9AA16A]">
                        آشپزخانه کافه و رستوران ایوان · به‌زودی
                      </p>
                      <p className="mt-2 text-sm leading-7 text-[#DCE2EC]">
                        {category.comingSoonDescription}
                      </p>
                    </div>
                    <a
                      href={CAFE_INFO.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-2 self-start rounded-[10px] border border-[rgba(212,180,124,0.36)] bg-[#1A2842] px-4 py-2.5 text-xs font-medium text-[#F8F5EE] transition-colors hover:border-[#D4B47C] sm:self-center"
                    >
                      <InstagramIcon className="h-4 w-4 text-[#D4B47C]" />
                      <span>اطلاع از رونمایی</span>
                    </a>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {items.map((item, idx) => {
                      const hasDualBean =
                        typeof item.priceBlend50 === 'number' &&
                        typeof item.priceArabica100 === 'number';
                      const isArabicaOnly =
                        typeof item.priceBlend50 !== 'number' &&
                        typeof item.priceArabica100 === 'number';
                      const preferredBean = selectedBeans[item.id];

                      return (
                        <article
                          key={item.id}
                          className="group flex flex-col overflow-hidden rounded-[14px] border border-[rgba(244,241,234,0.1)] bg-[#131E33] transition-colors hover:border-[rgba(212,180,124,0.38)] eyvan-card-enter"
                          style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                        >
                          {/* Top Row: Studio Eye-Level Photo + Name + Description */}
                          <div className="flex gap-3.5 p-3.5">
                            <button
                              type="button"
                              onClick={() => onSelectItemDetails(item)}
                              aria-label={`مشاهده جزئیات ${item.name}`}
                              className="h-24 w-24 shrink-0 overflow-hidden rounded-[10px] border border-[rgba(244,241,234,0.08)] bg-[#0E1525] sm:h-28 sm:w-28"
                            >
                              <img
                                src={item.frontImage}
                                alt={item.name}
                                loading="lazy"
                                decoding="async"
                                referrerPolicy="no-referrer"
                                className="h-full w-full object-cover transition-transform duration-250 eyvan-card-img"
                              />
                            </button>

                            <div className="flex min-w-0 flex-1 flex-col justify-between">
                              <div>
                                <div className="flex items-start justify-between gap-2">
                                  <h3 className="text-base font-semibold leading-snug text-[#F8F5EE]">
                                    {item.name}
                                  </h3>
                                  {item.highlight && (
                                    <span className="shrink-0 text-[11px] font-medium text-[#9AA16A]">
                                      {item.highlight}
                                    </span>
                                  )}
                                </div>
                                <p className="mt-1.5 line-clamp-2 text-xs leading-6 text-[#C4CCD8]">
                                  {item.description}
                                </p>
                              </div>

                              {/* Pricing Row (No Trailing Zeros) */}
                              <div className="mt-2.5">
                                {hasDualBean ? (
                                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                                    <span
                                      className={`tabular-fa ${
                                        preferredBean === 'arabica100'
                                          ? 'text-[#A8B3C5]'
                                          : 'font-semibold text-[#D4B47C]'
                                      }`}
                                    >
                                      ۵۰/۵۰: {formatToman(item.priceBlend50!)}
                                    </span>
                                    <span
                                      aria-hidden="true"
                                      className="text-[#5B677B]"
                                    >
                                      ·
                                    </span>
                                    <span
                                      className={`tabular-fa ${
                                        preferredBean === 'arabica100'
                                          ? 'font-semibold text-[#D4B47C]'
                                          : 'text-[#DCE2EC]'
                                      }`}
                                    >
                                      عربیکا: {formatToman(item.priceArabica100!)}
                                    </span>
                                  </div>
                                ) : isArabicaOnly ? (
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="tabular-fa text-sm font-semibold text-[#D4B47C]">
                                      {formatToman(item.priceArabica100!)}
                                    </span>
                                    <span className="text-[11px] text-[#9AA16A]">
                                      ۱۰۰٪ عربیکا
                                    </span>
                                  </div>
                                ) : (
                                  <span className="tabular-fa text-sm font-semibold text-[#D4B47C]">
                                    {formatToman(item.price ?? 0)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Card Footer Actions */}
                          <div className="mt-auto flex items-center justify-between gap-2 border-t border-[rgba(244,241,234,0.08)] bg-[#10192B] px-3.5 py-2.5">
                            <button
                              type="button"
                              onClick={() => onSelectItemDetails(item)}
                              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#E7E2D8] transition-colors hover:text-[#D4B47C]"
                            >
                              <SlidersHorizontal
                                className="h-3.5 w-3.5 text-[#D4B47C]"
                                strokeWidth={1.6}
                              />
                              <span>
                                {item.supportsSyrup
                                  ? 'سیروپ و جزئیات'
                                  : 'جزئیات محصول'}
                              </span>
                            </button>

                            <button
                              type="button"
                              onClick={() => onInspectOnTable(item)}
                              className="inline-flex items-center gap-1.5 text-xs text-[#A8B3C5] transition-colors hover:text-[#F8F5EE]"
                            >
                              <Disc className="h-3.5 w-3.5" strokeWidth={1.6} />
                              <span>نمایش روی میز</span>
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
