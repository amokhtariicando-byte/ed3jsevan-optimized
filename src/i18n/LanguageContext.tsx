import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  CAFE_INFO,
  MenuCategory,
  MenuItem,
  SyrupOption,
} from '../data/menuData';
import {
  AR_CAFE_INFO,
  AR_CATEGORIES,
  AR_ITEMS,
  AR_SYRUPS,
  Language,
  UI_STRINGS,
  UiStrings,
} from './translations';

const LANG_STORAGE_KEY = 'eyvan-lang';

const FA_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function formatLocaleDigits(
  value: string | number,
  lang: Language,
): string {
  const table = lang === 'ar' ? AR_DIGITS : FA_DIGITS;
  return String(value).replace(/\d/g, (d) => table[Number(d)] ?? d);
}

export function formatLocaleToman(amount: number, lang: Language): string {
  return `${formatLocaleDigits(Math.round(amount), lang)} ${UI_STRINGS[lang].currencyUnit}`;
}

export function localizeCategory(
  category: MenuCategory,
  lang: Language,
): MenuCategory {
  if (lang === 'fa') return category;
  const ar = AR_CATEGORIES[category.id];
  if (!ar) return category;
  return {
    ...category,
    name: ar.name,
    shortName: ar.shortName,
    subtitle: ar.subtitle,
    comingSoonDescription:
      ar.comingSoonDescription ?? category.comingSoonDescription,
  };
}

export function localizeItem(item: MenuItem, lang: Language): MenuItem {
  if (lang === 'fa') return item;
  const ar = AR_ITEMS[item.id];
  if (!ar) return item;
  return {
    ...item,
    name: ar.name,
    description: ar.description,
    highlight: ar.highlight ?? item.highlight,
  };
}

export function localizeSyrup(
  syrup: SyrupOption,
  lang: Language,
): SyrupOption {
  if (lang === 'fa') return syrup;
  const arName = AR_SYRUPS[syrup.id];
  if (!arName) return syrup;
  return { ...syrup, name: arName };
}

interface LanguageContextValue {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: UiStrings;
  cafeInfo: typeof CAFE_INFO;
  formatDigits: (value: string | number) => string;
  formatPrice: (amount: number) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getInitialLanguage(): Language {
  if (typeof window === 'undefined') return 'fa';
  try {
    const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'ar' || saved === 'fa') return saved;
  } catch {
    // Ignore storage errors in private mode
  }
  return 'fa';
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [lang, setLangState] = useState<Language>(getInitialLanguage);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = 'rtl';
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // Ignore storage errors
    }
  }, [lang]);

  const setLang = useCallback((next: Language) => {
    setLangState(next);
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => (prev === 'fa' ? 'ar' : 'fa'));
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      lang,
      setLang,
      toggleLang,
      t: UI_STRINGS[lang],
      cafeInfo:
        lang === 'ar'
          ? {
              ...CAFE_INFO,
              ...AR_CAFE_INFO,
            }
          : CAFE_INFO,
      formatDigits: (v) => formatLocaleDigits(v, lang),
      formatPrice: (amount) => formatLocaleToman(amount, lang),
    }),
    [lang, setLang, toggleLang],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return ctx;
}
