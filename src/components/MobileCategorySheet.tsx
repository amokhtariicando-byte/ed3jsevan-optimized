import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { CategoryId, MENU_CATEGORIES, MENU_ITEMS } from '../data/menuData';
import { useBodyScrollLock } from '../utils/motion';
import { localizeCategory, useLanguage } from '../i18n/LanguageContext';

interface MobileCategorySheetProps {
  open: boolean;
  activeCategoryId: CategoryId | 'all';
  includeAllOption?: boolean;
  onSelect: (categoryId: CategoryId | 'all') => void;
  onClose: () => void;
}

export const MobileCategorySheet: React.FC<MobileCategorySheetProps> = ({
  open,
  activeCategoryId,
  includeAllOption = false,
  onSelect,
  onClose,
}) => {
  const [panelState, setPanelState] = useState<
    'closed' | 'open' | 'closing'
  >('closed');
  const closeTimerRef = useRef<number | undefined>(undefined);
  const { lang, t, formatDigits } = useLanguage();
  useBodyScrollLock(open);
  const localizedCategories = useMemo(() => MENU_CATEGORIES.map((c) => localizeCategory(c, lang)), [lang]);

  const categoryCounts = useMemo(() => {
    const map = new Map<CategoryId, number>();
    for (const item of MENU_ITEMS) {
      map.set(item.categoryId, (map.get(item.categoryId) ?? 0) + 1);
    }
    return map;
  }, []);

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
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, handleClose]);

  if (!open) return null;

  return (
    // P2-10: translucent solid backdrop, deliberately NO backdrop-blur —
    // a full-screen blur is the most expensive filter in the app while
    // the sheet is open.
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-categories-title"
      className="eyvan-overlay-backdrop fixed inset-0 z-50 flex items-end justify-center bg-[#060A13]/72"
      data-state={panelState === 'open' ? 'open' : 'closed'}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="eyvan-overlay-panel eyvan-sheet-panel w-full max-w-[540px] rounded-t-[20px] border-t border-x border-[rgba(107,112,67,0.14)] bg-[#FFFFFF] px-5 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-2xl"
        data-state={panelState === 'open' ? 'open' : 'closed'}
      >
        <div className="mx-auto mb-3.5 h-1 w-10 rounded-full bg-[rgba(107,112,67,0.18)]" />

        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2
              id="mobile-categories-title"
              className="text-base font-semibold text-[#2F321C]"
            >
              {t.categoriesTitle}
            </h2>
            <p className="mt-0.5 text-xs text-[#78716C]">
              {t.quickSelectPrefix} {formatDigits(MENU_CATEGORIES.length)} {t.quickSelectSuffix}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="بستن فهرست دسته‌بندی‌ها"
            className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[rgba(107,112,67,0.14)] bg-[#FFFFFF] text-[#2F321C] transition-colors hover:border-[#B5945B]"
          >
            <X className="h-4 w-4" strokeWidth={1.7} />
          </button>
        </div>

        <div className="eyvan-scroll grid max-h-[62vh] grid-cols-2 gap-2.5 overflow-y-auto pb-1">
          {includeAllOption && (
            <button
              type="button"
              onClick={() => {
                onSelect('all');
                handleClose();
              }}
              className={`col-span-2 flex items-center justify-between rounded-[12px] border px-4 py-3 text-right transition-colors ${
                activeCategoryId === 'all'
                  ? 'border-[#B5945B] bg-[#FFFFFF] text-[#2F321C]'
                  : 'border-[rgba(107,112,67,0.1)] bg-[#FFFFFF] text-[#57534E] hover:border-[rgba(107,112,67,0.24)]'
              }`}
            >
              <div>
                <p className="text-sm font-medium">{t.allSections}</p>
                <p className="mt-0.5 text-[11px] text-[#78716C]">
                  {t.allSectionsSubtitlePrefix} {formatDigits(MENU_ITEMS.length)} {t.allSectionsSubtitleSuffix}
                </p>
              </div>
              {activeCategoryId === 'all' && (
                <Check className="h-4 w-4 shrink-0 text-[#6B7043]" strokeWidth={1.8} />
              )}
            </button>
          )}

          {localizedCategories.map((category) => {
            const isActive = activeCategoryId === category.id;
            const count = categoryCounts.get(category.id) ?? 0;

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => {
                  onSelect(category.id);
                  handleClose();
                }}
                className={`flex flex-col items-start justify-between rounded-[12px] border px-3.5 py-3 text-right transition-colors ${
                  isActive
                    ? 'border-[#B5945B] bg-[#FFFFFF] text-[#2F321C]'
                    : 'border-[rgba(107,112,67,0.1)] bg-[#FFFFFF] text-[#57534E] hover:border-[rgba(107,112,67,0.24)]'
                }`}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="text-sm font-medium leading-snug">
                    {category.shortName}
                  </span>
                  {isActive && (
                    <Check
                      className="h-3.5 w-3.5 shrink-0 text-[#6B7043]"
                      strokeWidth={1.9}
                    />
                  )}
                </div>
                <span
                  className={`tabular-fa mt-1.5 text-[11px] ${
                    category.comingSoon ? 'text-[#9AA16A]' : 'text-[#78716C]'
                  }`}
                >
                  {category.comingSoon
                    ? t.comingSoon
                    : `${formatDigits(count)} ${t.itemCountShort}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
