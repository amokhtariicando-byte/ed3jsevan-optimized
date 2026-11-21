import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Thermometer, X } from 'lucide-react';
import {
  BeanType,
  MenuItem,
  SYRUP_OPTIONS,
} from '../data/menuData';
import {
  calculateItemPrice,
  getDefaultBean,
  getSyrupById,
} from '../utils/menuLogic';
import { FadeInImage } from './FadeInImage';
import { useBodyScrollLock } from '../utils/motion';
import { localizeSyrup, useLanguage } from '../i18n/LanguageContext';

interface DrinkCustomizeDrawerProps {
  item: MenuItem | null;
  categoryName: string;
  selectedBean?: BeanType;
  onBeanChange: (bean: BeanType) => void;
  onClose: () => void;
}

export const DrinkCustomizeDrawer: React.FC<DrinkCustomizeDrawerProps> = ({
  item,
  categoryName,
  selectedBean,
  onBeanChange,
  onClose,
}) => {
  const { lang, t, cafeInfo, formatDigits, formatPrice } = useLanguage();
  const [syrupId, setSyrupId] = useState<string | null>(null);
  const [milkTemp, setMilkTemp] = useState<'standard' | 'extra-hot'>(
    'standard',
  );
  const [panelState, setPanelState] = useState<
    'closed' | 'open' | 'closing'
  >('closed');
  const closeTimerRef = useRef<number | undefined>(undefined);
  useBodyScrollLock(Boolean(item));

  useEffect(() => {
    if (!item) return;
    setSyrupId(null);
    setMilkTemp('standard');
  }, [item]);

  useEffect(() => {
    if (!item) return;
    window.clearTimeout(closeTimerRef.current);
    setPanelState('closed');
    const raf = requestAnimationFrame(() => setPanelState('open'));
    return () => cancelAnimationFrame(raf);
  }, [item]);

  useEffect(() => () => window.clearTimeout(closeTimerRef.current), []);

  const handleClose = useCallback(() => {
    setPanelState('closing');
    closeTimerRef.current = window.setTimeout(onClose, 200);
  }, [onClose]);

  useEffect(() => {
    if (!item) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [item, handleClose]);

  if (!item) return null;

  const hasDualBean =
    typeof item.priceBlend50 === 'number' &&
    typeof item.priceArabica100 === 'number';
  const isArabicaOnly =
    typeof item.priceBlend50 !== 'number' &&
    typeof item.priceArabica100 === 'number';
  const effectiveBean = selectedBean ?? getDefaultBean(item);
  const activeSyrup = getSyrupById(syrupId);
  const unitPrice = calculateItemPrice(item, effectiveBean, syrupId);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="customize-drawer-title"
      className="eyvan-overlay-backdrop fixed inset-0 z-50 flex justify-start bg-[#070B14]/65"
      data-state={panelState === 'open' ? 'open' : 'closed'}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <aside
        className="eyvan-overlay-panel eyvan-drawer-panel relative flex h-full w-full max-w-[460px] flex-col border-l border-[rgba(107,112,67,0.12)] bg-[#FFFFFF] shadow-2xl"
        data-state={panelState === 'open' ? 'open' : 'closed'}
      >
        {/* Drawer Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[rgba(107,112,67,0.09)] px-6 py-4">
          <div>
            <p className="text-xs text-[#9AA16A]">
              {categoryName}
              {item.highlight ? ` · ${item.highlight}` : ''}
            </p>
            <h2
              id="customize-drawer-title"
              className="mt-1 text-2xl font-semibold text-[#2F321C]"
            >
              {item.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="بستن جزئیات محصول"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border border-[rgba(107,112,67,0.12)] bg-[#FFFFFF] text-[#2F321C] transition-colors hover:border-[#B5945B] hover:text-[#6B7043] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6B7043]"
          >
            <X className="h-4 w-4" strokeWidth={1.6} />
          </button>
        </div>

        {/* Scrollable Details & Live Price Customization */}
        <div className="eyvan-scroll flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/* Eye-Level Front Glass Studio Photograph */}
          <div className="overflow-hidden rounded-[14px] border border-[rgba(107,112,67,0.1)] bg-[#FFFFFF]">
            <FadeInImage
              src={item.frontImage}
              fallbackSrc={item.image}
              alt={item.name}
              width={680}
              height={508}
              decoding="async"
              referrerPolicy="no-referrer"
              className="h-52 w-full object-cover"
            />
          </div>

          <p className="text-sm leading-7 text-[#57534E]">{item.description}</p>

          {/* 1. Bean Selector */}
          {(hasDualBean || isArabicaOnly) && (
            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-sm font-medium text-[#2F321C]">
                  {t.selectCoffeeBean}
                </span>
                {isArabicaOnly && (
                  <span className="text-xs text-[#6B7043]">
                    {t.arabicaExclusiveLong}
                  </span>
                )}
              </div>

              {hasDualBean ? (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => onBeanChange('blend50')}
                    className={`flex flex-col items-start rounded-[12px] border px-4 py-3 text-right transition-colors ${
                      effectiveBean === 'blend50'
                        ? 'border-[#B5945B] bg-[#FFFFFF] text-[#2F321C]'
                        : 'border-[rgba(107,112,67,0.1)] bg-[#FFFFFF] text-[#78716C] hover:border-[rgba(107,112,67,0.22)]'
                    }`}
                  >
                    <span className="text-xs text-[#78716C]">
                      {t.blend5050Full}
                    </span>
                    <span className="tabular-fa mt-1 text-base font-medium text-[#6B7043]">
                      {formatPrice(item.priceBlend50!)}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onBeanChange('arabica100')}
                    className={`flex flex-col items-start rounded-[12px] border px-4 py-3 text-right transition-colors ${
                      effectiveBean === 'arabica100'
                        ? 'border-[#B5945B] bg-[#FFFFFF] text-[#2F321C]'
                        : 'border-[rgba(107,112,67,0.1)] bg-[#FFFFFF] text-[#78716C] hover:border-[rgba(107,112,67,0.22)]'
                    }`}
                  >
                    <span className="text-xs text-[#78716C]">{t.arabica100}</span>
                    <span className="tabular-fa mt-1 text-base font-medium text-[#6B7043]">
                      {formatPrice(item.priceArabica100!)}
                    </span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between rounded-[12px] border border-[#B5945B]/45 bg-[#FFFFFF] px-4 py-3">
                  <span className="text-sm text-[#2F321C]">
                    دانه {t.arabica100} تخصصی
                  </span>
                  <span className="tabular-fa text-base font-medium text-[#6B7043]">
                    {formatPrice(item.priceArabica100!)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 2. Syrup Selector (Hot Bar & Coffee items) */}
          {item.supportsSyrup && (
            <div>
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-sm font-medium text-[#2F321C]">
                  {t.selectSyrup}
                </span>
                <span className="tabular-fa text-xs text-[#78716C]">
                  {t.optionalPlus}{formatDigits(SYRUP_OPTIONS[0].price)} {t.currencyUnit}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSyrupId(null)}
                  className={`flex items-center justify-between rounded-[10px] border px-3.5 py-2.5 text-xs transition-colors ${
                    syrupId === null
                      ? 'border-[#B5945B] bg-[#FFFFFF] font-medium text-[#2F321C]'
                      : 'border-[rgba(107,112,67,0.09)] bg-[#FFFFFF] text-[#78716C] hover:border-[rgba(107,112,67,0.22)]'
                  }`}
                >
                  <span>{t.noSyrup}</span>
                  {syrupId === null && (
                    <Check
                      className="h-3.5 w-3.5 text-[#6B7043]"
                      strokeWidth={1.8}
                    />
                  )}
                </button>

                {SYRUP_OPTIONS.map((rawSyrup) => {
                  const syrup = localizeSyrup(rawSyrup, lang);
                  const active = syrupId === syrup.id;
                  return (
                    <button
                      key={syrup.id}
                      type="button"
                      onClick={() => setSyrupId(active ? null : syrup.id)}
                      className={`flex items-center justify-between rounded-[10px] border px-3.5 py-2.5 text-xs transition-colors ${
                        active
                          ? 'border-[#B5945B] bg-[#FFFFFF] font-medium text-[#2F321C]'
                          : 'border-[rgba(107,112,67,0.09)] bg-[#FFFFFF] text-[#78716C] hover:border-[rgba(107,112,67,0.22)]'
                      }`}
                    >
                      <span>{t.syrupPrefix} {syrup.name}</span>
                      <span className="tabular-fa text-[11px] text-[#6B7043]">
                        +{formatDigits(syrup.price)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. Milk Temperature Guidance */}
          {item.supportsMilkTemp && (
            <div>
              <span className="mb-2.5 block text-sm font-medium text-[#2F321C]">
                {t.milkTemp}
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setMilkTemp('standard')}
                  className={`rounded-[10px] border px-3.5 py-2.5 text-right text-xs transition-colors ${
                    milkTemp === 'standard'
                      ? 'border-[#B5945B] bg-[#FFFFFF] font-medium text-[#2F321C]'
                      : 'border-[rgba(107,112,67,0.09)] bg-[#FFFFFF] text-[#78716C]'
                  }`}
                >
                  {t.milkTempStandard}
                </button>
                <button
                  type="button"
                  onClick={() => setMilkTemp('extra-hot')}
                  className={`rounded-[10px] border px-3.5 py-2.5 text-right text-xs transition-colors ${
                    milkTemp === 'extra-hot'
                      ? 'border-[#B5945B] bg-[#FFFFFF] font-medium text-[#2F321C]'
                      : 'border-[rgba(107,112,67,0.09)] bg-[#FFFFFF] text-[#78716C]'
                  }`}
                >
                  {t.milkTempExtraHot}
                </button>
              </div>
              <div className="mt-2.5 flex items-start gap-2 text-xs leading-6 text-[#78716C]">
                <Thermometer
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#6B7043]"
                  strokeWidth={1.5}
                />
                <span>{cafeInfo.milkTempNote}</span>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Footer: Live Final Price + Cashier Payment Notice (No Cart / No Waiter Card) */}
        <div className="border-t border-[rgba(107,112,67,0.09)] bg-[#F8F7F2] px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="block text-xs text-[#78716C]">
                {t.finalPriceLabel}
              </span>
              {syrupId && (
                <span className="mt-0.5 block text-[11px] text-[#9AA16A]">
                  {t.includesPrefix} {t.syrupPrefix} {localizeSyrup({ id: activeSyrup.id, name: activeSyrup.name.replace(/^سیروپ\s+/, ""), price: activeSyrup.price }, lang).name}
                </span>
              )}
            </div>
            <span className="tabular-fa text-2xl font-semibold text-[#6B7043]">
              {formatPrice(unitPrice)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="mt-3.5 w-full rounded-[10px] border border-[rgba(181,148,91,0.42)] bg-[#FFFFFF] px-4 py-2.5 text-sm font-medium text-[#2F321C] transition-colors hover:border-[#B5945B] hover:bg-[#E8EAD9]"
          >
            {t.closeDetails}
          </button>

          <p className="mt-2.5 text-center text-[11px] text-[#78716C]">
            {cafeInfo.paymentNote}
          </p>
        </div>
      </aside>
    </div>
  );
};
