import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { I18nManager, Platform } from 'react-native';
import { LANGUAGES, LOCALES, translate } from '@hajj/shared';
import { storage } from '../storage.js';

const STORAGE_KEY = 'hajj_language';
const SUPPORTED = LANGUAGES.map((item) => item.code);

function deviceLanguage() {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || '';
    const code = locale.slice(0, 2).toLowerCase();
    if (SUPPORTED.includes(code)) return code;
  } catch { /* Intl indisponible */ }
  return 'fr';
}

const LanguageContext = createContext(null);

/**
 * Langue de l'application mobile. Elle est mémorisée, appliquée à tous les écrans
 * et partagée avec les mêmes dictionnaires que le web (@hajj/shared).
 * Pour l'arabe, le sens d'écriture (RTL) de la mise en page natif ne change qu'après
 * redémarrage de l'application : `needsRestart` permet d'en informer l'utilisateur.
 */
export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(deviceLanguage);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    storage.get(STORAGE_KEY).then((stored) => {
      if (mounted && SUPPORTED.includes(stored)) setLanguageState(stored);
    }).finally(() => { if (mounted) setReady(true); });
    return () => { mounted = false; };
  }, []);

  const wantsRTL = language === 'ar';
  useEffect(() => {
    if (Platform.OS === 'web') return;
    I18nManager.allowRTL(true);
    if (I18nManager.isRTL !== wantsRTL) I18nManager.forceRTL(wantsRTL);
  }, [wantsRTL]);

  const setLanguage = useCallback((code) => {
    if (!SUPPORTED.includes(code)) return;
    setLanguageState(code);
    storage.set(STORAGE_KEY, code);
  }, []);

  const value = useMemo(() => {
    const locale = LOCALES[language] ?? LOCALES.fr;
    const toDate = (input) => {
      if (!input) return null;
      const date = input instanceof Date ? input : new Date(input);
      return Number.isNaN(date.getTime()) ? null : date;
    };
    const t = (key, values) => translate(language, key, values);
    const safeFormat = (date, options, fallback) => {
      try { return new Intl.DateTimeFormat(locale, options).format(date); } catch { return fallback(date); }
    };
    const formatNumber = (input) => {
      try { return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Number(input || 0)); } catch { return String(Math.round(Number(input || 0))); }
    };
    return {
      language, locale, ready, languages: LANGUAGES, setLanguage, t,
      isRTL: wantsRTL,
      needsRestart: Platform.OS !== 'web' && I18nManager.isRTL !== wantsRTL,
      formatNumber,
      formatCurrency: (input, currency = 'XAF') => `${formatNumber(input)} ${currency === 'XAF' ? t('ad_currency') : currency}`,
      formatDate: (input, options = { dateStyle: 'medium' }) => { const date = toDate(input); return date ? safeFormat(date, options, (d) => d.toDateString()) : '—'; },
      formatDateTime: (input) => { const date = toDate(input); return date ? safeFormat(date, { dateStyle: 'medium', timeStyle: 'short' }, (d) => d.toLocaleString()) : '—'; },
      formatTime: (input) => { const date = toDate(input); return date ? safeFormat(date, { hour: '2-digit', minute: '2-digit' }, (d) => d.toLocaleTimeString()) : '—'; },
      // Temps relatif sans Intl.RelativeTimeFormat (absent de certains moteurs mobiles).
      formatRelativeTime: (input) => {
        const date = toDate(input);
        if (!date) return '—';
        const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
        if (minutes < 1) return t('rel_now');
        if (minutes < 60) return t('rel_minutes', { count: minutes });
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return t('rel_hours', { count: hours });
        const days = Math.floor(hours / 24);
        if (days < 7) return t('rel_days', { count: days });
        return safeFormat(date, { dateStyle: 'medium' }, (d) => d.toDateString());
      },
    };
  }, [language, ready, setLanguage, wantsRTL]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage doit être utilisé à l’intérieur de <LanguageProvider>.');
  return context;
}
