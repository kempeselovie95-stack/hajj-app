import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { LANGUAGES, LOCALES, translate } from '@hajj/shared';

const STORAGE_KEY = 'hajj_language';
const DEFAULT_LANGUAGE = 'fr';
const SUPPORTED = LANGUAGES.map((item) => item.code);

function readStoredLanguage() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (SUPPORTED.includes(stored)) return stored;
  } catch { /* stockage indisponible (navigation privée…) : on retombe sur la langue du navigateur */ }
  const browser = (typeof navigator !== 'undefined' ? navigator.language : '')?.slice(0, 2).toLowerCase();
  return SUPPORTED.includes(browser) ? browser : DEFAULT_LANGUAGE;
}

const LanguageContext = createContext(null);

/**
 * Source unique de la langue de l'application : le sélecteur de la page de
 * connexion (et celui de la barre du haut) modifient cet état, ce qui
 * re-rend tous les écrans. Fournit aussi les formateurs liés à la locale
 * (dates, nombres, montants) pour que rien ne reste figé en français.
 */
export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(readStoredLanguage);

  const setLanguage = useCallback((code) => {
    setLanguageState(SUPPORTED.includes(code) ? code : DEFAULT_LANGUAGE);
  }, []);

  useEffect(() => {
    try { window.localStorage.setItem(STORAGE_KEY, language); } catch { /* non bloquant */ }
    document.documentElement.lang = language;
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  const value = useMemo(() => {
    const locale = LOCALES[language] ?? LOCALES[DEFAULT_LANGUAGE];
    const toDate = (input) => {
      if (!input) return null;
      const date = input instanceof Date ? input : new Date(input);
      return Number.isNaN(date.getTime()) ? null : date;
    };
    const formatNumber = (input, options) => new Intl.NumberFormat(locale, { maximumFractionDigits: 0, ...options }).format(Number(input || 0));
    return {
      language,
      locale,
      dir: language === 'ar' ? 'rtl' : 'ltr',
      languages: LANGUAGES,
      setLanguage,
      t: (key, values) => translate(language, key, values),
      formatNumber,
      formatCurrency: (input, currency = 'XAF') => `${formatNumber(input)} ${currency === 'XAF' ? translate(language, 'ad_currency') : currency}`,
      formatDate: (input, options = { dateStyle: 'medium' }) => {
        const date = toDate(input);
        return date ? new Intl.DateTimeFormat(locale, options).format(date) : '—';
      },
      formatDateTime: (input) => {
        const date = toDate(input);
        return date ? new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date) : '—';
      },
      formatTime: (input) => {
        const date = toDate(input);
        return date ? new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(date) : '—';
      },
      formatRelativeTime: (input) => {
        const date = toDate(input);
        if (!date) return '—';
        const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000);
        const absolute = Math.abs(diffSeconds);
        const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
        if (absolute < 60) return rtf.format(0, 'second');
        if (absolute < 3600) return rtf.format(Math.round(diffSeconds / 60), 'minute');
        if (absolute < 86400) return rtf.format(Math.round(diffSeconds / 3600), 'hour');
        if (absolute < 7 * 86400) return rtf.format(Math.round(diffSeconds / 86400), 'day');
        return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(date);
      },
    };
  }, [language, setLanguage]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage doit être utilisé à l’intérieur de <LanguageProvider>.');
  return context;
}
