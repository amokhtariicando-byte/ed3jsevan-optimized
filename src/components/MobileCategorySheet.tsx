import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { CategoryId, MENU_CATEGORIES, MENU_ITEMS } from '../data/menuData';
import { toPersianDigits } from '../utils/menuLogic';

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
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-categories-title"
      className="eyvan-overlay-backdrop fixed inset-0 z-50 flex items-end justify-center bg-[#060A13]/72 backdrop-blur-[2px]"
      data-state={panelState === 'open' ? 'open' : 'closed'}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="eyvan-overlay-panel eyvan-sheet-panel w-full max-w-[540px] rounded-t-[20px] border-t border-x border-[rgba(244,241,234,0.14)] bg-[#101829] px-5 pt-4 pb-6 shadow-2xl"
        data-state={panelState === 'open' ? 'open' : 'closed'}
      >
        <div className="mx-auto mb-3.5 h-1 w-10 rounded-full bg-[rgba(244,241,234,0.18)]" />

        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2
              id="mobile-categories-title"
              className="text-base font-semibold text-[#F8F5EE]"
            >
              دسته‌بندی‌های منوی ایوان
            </h2>
            <p className="mt-0.5 text-xs text-[#A8B3C5]">
              انتخاب سریع از میان {toPersianDigits(MENU_CATEGORIES.length)} بخش منو
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="بستن فهرست دسته‌بندی‌ها"
            className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-[rgba(244,241,234,0.14)] bg-[#17233B] text-[#F8F5EE] transition-colors hover:border-[#D4B47C]"
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
                  ? 'border-[#D4B47C] bg-[#1C2C49] text-[#F8F5EE]'
                  : 'border-[rgba(244,241,234,0.1)] bg-[#152036] text-[#DCE2EC] hover:border-[rgba(244,241,234,0.24)]'
              }`}
            >
              <div>
                <p className="text-sm font-medium">همه بخش‌های منو</p>
                <p className="mt-0.5 text-[11px] text-[#A8B3C5]">
                  نمایش یکپارچه {toPersianDigits(MENU_ITEMS.length)} نوشیدنی و بخش‌های به‌زودی
                </p>
              </div>
              {activeCategoryId === 'all' && (
                <Check className="h-4 w-4 shrink-0 text-[#D4B47C]" strokeWidth={1.8} />
              )}
            </button>
          )}

          {MENU_CATEGORIES.map((category) => {
            const isActive = activeCategoryId === category.id;
            const count = MENU_ITEMS.filter(
              (item) => item.categoryId === category.id,
            ).length;

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
                    ? 'border-[#D4B47C] bg-[#1C2C49] text-[#F8F5EE]'
                    : 'border-[rgba(244,241,234,0.1)] bg-[#152036] text-[#DCE2EC] hover:border-[rgba(244,241,234,0.24)]'
                }`}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="text-sm font-medium leading-snug">
                    {category.shortName}
                  </span>
                  {isActive && (
                    <Check
                      className="h-3.5 w-3.5 shrink-0 text-[#D4B47C]"
                      strokeWidth={1.9}
                    />
                  )}
                </div>
                <span
                  className={`tabular-fa mt-1.5 text-[11px] ${
                    category.comingSoon ? 'text-[#9AA16A]' : 'text-[#A8B3C5]'
                  }`}
                >
                  {category.comingSoon
                    ? 'به‌زودی'
                    : `${toPersianDigits(count)} آیتم`}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
