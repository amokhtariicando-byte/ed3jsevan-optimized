import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { MENU_CATEGORIES, MENU_ITEMS, MenuItem } from '../data/menuData';
import {
  calculateItemPrice,
  filterMenuItems,
  getDefaultBean,
} from '../utils/menuLogic';
import { FadeInImage, toThumbSrc } from './FadeInImage';
import { useBodyScrollLock } from '../utils/motion';
import { localizeCategory, localizeItem, useLanguage } from '../i18n/LanguageContext';

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
  onSelectMenuItem: (item: MenuItem) => void;
}

export const SearchOverlay: React.FC<SearchOverlayProps> = ({
  open,
  onClose,
  onSelectMenuItem,
}) => {
  const { lang, t, formatDigits, formatPrice } = useLanguage();
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  useBodyScrollLock(open);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [panelState, setPanelState] = useState<
    'closed' | 'open' | 'closing'
  >('closed');
  const closeTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    window.clearTimeout(closeTimerRef.current);
    setPanelState('closed');
    const raf = requestAnimationFrame(() => setPanelState('open'));
    return () => cancelAnimationFrame(raf);
  }, [open]);

  useEffect(() => () => window.clearTimeout(closeTimerRef.current), []);

  const handleClose = useCallback(() => {
    setPanelState('closing');
    closeTimerRef.current = window.setTimeout(onClose, 200);
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    const t = window.setTimeout(() => inputRef.current?.focus(), 60);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open, handleClose]);

  const categoryNameMap = useMemo(
    () =>
      new Map(
        MENU_CATEGORIES.map((c) => {
          const loc = localizeCategory(c, lang);
          return [loc.id, loc.shortName];
        }),
      ),
    [lang],
  );

  const localizedItems = useMemo(
    () => MENU_ITEMS.map((i) => localizeItem(i, lang)),
    [lang],
  );

  const results = useMemo(() => {
    if (!deferredQuery.trim()) return localizedItems.slice(0, 12);
    return filterMenuItems(localizedItems, 'hot-coffee', deferredQuery);
  }, [localizedItems, deferredQuery]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="جستجو در منوی کافه ایوان"
      className="eyvan-overlay-backdrop fixed inset-0 z-50 flex items-start justify-center bg-[#070B14]/76 p-4 pt-16 sm:pt-24"
      data-state={panelState === 'open' ? 'open' : 'closed'}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="eyvan-overlay-panel eyvan-search-panel w-full max-w-[580px] overflow-hidden rounded-[16px] border border-[rgba(107,112,67,0.12)] bg-[#FFFFFF] shadow-2xl"
        data-state={panelState === 'open' ? 'open' : 'closed'}
      >
        <div className="flex items-center gap-3 border-b border-[rgba(107,112,67,0.09)] px-4 py-3.5">
          <Search className="h-4 w-4 shrink-0 text-[#6B7043]" strokeWidth={1.6} />
          <input
            ref={inputRef}
            id="eyvan-global-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.searchPlaceholder}
            className="w-full bg-transparent text-sm text-[#2F321C] placeholder:text-[#A8A29E] focus:outline-none"
          />
          <button
            type="button"
            onClick={handleClose}
            aria-label="بستن جستجو"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[8px] text-[#A8A29E] transition-colors hover:bg-[#FFFFFF] hover:text-[#2F321C]"
          >
            <X className="h-4 w-4" strokeWidth={1.6} />
          </button>
        </div>

        <div className="eyvan-scroll max-h-[60vh] overflow-y-auto p-3">
          <p className="px-2 pb-2 text-xs text-[#A8A29E]">
            {query.trim()
              ? `${formatDigits(results.length)} ${t.resultsFoundSuffix}`
              : t.popularSuggestions}
          </p>

          {results.length === 0 ? (
            <div className="py-10 text-center text-sm text-[#78716C]">
              {t.noSearchMatchPrefix}{query}{t.noSearchMatchSuffix}
            </div>
          ) : (
            <ul className="space-y-1">
              {results.map((item) => {
                const basePrice = calculateItemPrice(
                  item,
                  getDefaultBean(item),
                  null,
                );
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectMenuItem(item);
                        handleClose();
                      }}
                      className="flex w-full items-center justify-between gap-3 rounded-[10px] px-2.5 py-2 text-right transition-colors hover:bg-[#FFFFFF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B7043]"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[#EFECE6]">
                          <FadeInImage
                            src={toThumbSrc(item.image)}
                            fallbackSrc={item.image}
                            alt={item.name}
                            width={256}
                            height={256}
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-[#2F321C]">
                            {item.name}
                          </p>
                          <p className="truncate text-xs text-[#A8A29E]">
                            {categoryNameMap.get(item.categoryId)}
                            {item.supportsSyrup ? ` · ${t.syrupAvailableTag}` : ''}
                          </p>
                        </div>
                      </div>
                      <span className="tabular-fa shrink-0 text-xs font-medium text-[#6B7043]">
                        {formatPrice(basePrice)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
