import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import en, { Translations } from './locales/en';
import es from './locales/es';

export type SupportedLocale = 'en' | 'es';

const LOCALE_STORAGE_KEY = 'sportbetx-locale';

const translations: Record<SupportedLocale, Translations> = { en, es };

interface I18nContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: Translations;
  availableLocales: { code: SupportedLocale; name: string }[];
}

const I18nContext = createContext<I18nContextValue | null>(null);

function getInitialLocale(): SupportedLocale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === 'en' || stored === 'es') return stored;
    const browserLang = navigator.language.slice(0, 2);
    if (browserLang === 'es') return 'es';
  } catch {
    // localStorage unavailable
  }
  return 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(getInitialLocale);

  const setLocale = useCallback((newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
    } catch {
      // ignore
    }
  }, []);

  const t = translations[locale];

  const availableLocales = [
    { code: 'en' as SupportedLocale, name: 'English' },
    { code: 'es' as SupportedLocale, name: 'Español' },
  ];

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, availableLocales }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
