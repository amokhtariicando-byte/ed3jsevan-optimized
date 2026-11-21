import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Clock, Copy, ExternalLink, MapPin, Thermometer, X } from 'lucide-react';
import { CAFE_INFO } from '../data/menuData';
import { EyvanLogo } from './EyvanLogo';
import { InstagramIcon } from './InstagramIcon';
import { useBodyScrollLock } from '../utils/motion';
import { useLanguage } from '../i18n/LanguageContext';

interface CafeInfoModalProps {
  open: boolean;
  onClose: () => void;
}

export const CafeInfoModal: React.FC<CafeInfoModalProps> = ({
  open,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [panelState, setPanelState] = useState<
    'closed' | 'open' | 'closing'
  >('closed');
  const closeTimerRef = useRef<number | undefined>(undefined);
  const { t, cafeInfo } = useLanguage();
  useBodyScrollLock(open);

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

  const handleCopyInstagram = async () => {
    try {
      await navigator.clipboard.writeText(CAFE_INFO.instagramUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cafe-info-title"
      className="eyvan-overlay-backdrop fixed inset-0 z-50 flex items-end justify-center bg-[#060B14]/78 p-0 sm:items-center sm:p-6"
      data-state={panelState === 'open' ? 'open' : 'closed'}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="eyvan-overlay-panel eyvan-modal-panel flex max-h-[90vh] w-full max-w-[600px] flex-col overflow-hidden rounded-t-[20px] border border-[rgba(107,112,67,0.12)] bg-[#FFFFFF] sm:rounded-[20px]"
        data-state={panelState === 'open' ? 'open' : 'closed'}
      >
        <div className="flex items-center justify-between border-b border-[rgba(107,112,67,0.09)] px-6 py-4">
          <h2
            id="cafe-info-title"
            className="text-lg font-semibold text-[#2F321C]"
          >
            {t.cafeInfoModalTitle}
          </h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="بستن پنجره مشخصات کافه"
            className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-[rgba(107,112,67,0.12)] text-[#78716C] transition-colors hover:border-[#B5945B] hover:text-[#2F321C]"
          >
            <X className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </div>

        <div className="eyvan-scroll flex-1 space-y-6 overflow-y-auto px-6 py-6">
          {/* Official Full Vertical Logo */}
          <div className="flex flex-col items-center rounded-[14px] border border-[rgba(107,112,67,0.08)] bg-[#F8F7F2] py-6">
            <EyvanLogo variant="full" tone="gold" />
            <p className="mt-3 max-w-sm text-center text-xs leading-6 text-[#78716C]">
              {cafeInfo.tagline}
            </p>
          </div>

          {/* Info rows */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <MapPin
                className="mt-0.5 h-4 w-4 shrink-0 text-[#6B7043]"
                strokeWidth={1.5}
              />
              <div>
                <h3 className="text-sm font-medium text-[#2F321C]">
                  {t.addressHeading}
                </h3>
                <p className="mt-1 text-xs leading-6 text-[#78716C]">
                  {cafeInfo.addressStatus}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock
                className="mt-0.5 h-4 w-4 shrink-0 text-[#6B7043]"
                strokeWidth={1.5}
              />
              <div>
                <h3 className="text-sm font-medium text-[#2F321C]">
                  {t.hoursHeading}
                </h3>
                <p className="mt-1 tabular-fa text-xs text-[#78716C]">
                  {cafeInfo.hours}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Thermometer
                className="mt-0.5 h-4 w-4 shrink-0 text-[#9AA16A]"
                strokeWidth={1.5}
              />
              <div>
                <h3 className="text-sm font-medium text-[#2F321C]">
                  {t.hotBarStandardHeading}
                </h3>
                <p className="mt-1 text-xs leading-6 text-[#78716C]">
                  {cafeInfo.milkTempNote}
                </p>
              </div>
            </div>
          </div>

          {/* Stylized Architectural Location Frame */}
          <div className="relative overflow-hidden rounded-[14px] border border-[rgba(107,112,67,0.09)] bg-[#F8F7F2] p-5">
            <svg
              viewBox="0 0 480 140"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              className="w-full opacity-80"
            >
              <path
                d="M0 32H480M0 78H480M0 118H480M84 0V140M196 0V140M312 0V140M418 0V140"
                stroke="rgba(107,112,67,0.08)"
                strokeWidth="1"
              />
              <path
                d="M40 120C120 96 184 78 240 72C298 66 364 48 446 24"
                stroke="#6B7043"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
              <circle
                cx="240"
                cy="72"
                r="22"
                stroke="#B5945B"
                strokeWidth="1.2"
                fill="rgba(175,137,75,0.12)"
              />
              <circle cx="240" cy="72" r="5" fill="#B5945B" />
            </svg>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#78716C]">
              <span>{cafeInfo.coordinatesLabel}</span>
              <span className="text-[#A8A29E]">{cafeInfo.paymentNote}</span>
            </div>
          </div>

          {/* Official Instagram actions */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-[rgba(181,148,91,0.22)] bg-[#FFFFFF] p-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[#F8F7F2] text-[#6B7043]">
                <InstagramIcon className="h-5 w-5" />
              </span>
              <div>
                <div className="text-sm font-medium text-[#2F321C]">
                  {t.officialInstagram}
                </div>
                <div dir="ltr" className="mt-0.5 text-right text-xs text-[#6B7043]">
                  {CAFE_INFO.instagramHandle}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyInstagram}
                className="inline-flex items-center gap-1.5 rounded-[8px] border border-[rgba(107,112,67,0.12)] px-3 py-2 text-xs text-[#2F321C] transition-colors hover:border-[#B5945B]"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-[#9AA16A]" strokeWidth={1.75} />
                    <span>{t.copied}</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <span>{t.copyLink}</span>
                  </>
                )}
              </button>
              <a
                href={CAFE_INFO.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-[8px] bg-[#6B7043] px-3.5 py-2 text-xs font-medium text-[#F8F7F2] transition-colors hover:bg-[#4F5330]"
              >
                <span>{t.visitPage}</span>
                <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.6} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
