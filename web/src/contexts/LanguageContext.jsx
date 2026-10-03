import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'hajj_language';
const LANGUAGES = [
  { code: 'en', label: 'English', shortLabel: 'EN' },
  { code: 'fr', label: 'Français', shortLabel: 'FR' },
  { code: 'ar', label: 'العربية', shortLabel: 'AR' },
];

const MESSAGES = {
  en: {
    dashboard: 'Dashboard',
    overview: 'Overview',
    agencies: 'Agencies',
    dossiers: 'Applications',
    pilgrims: 'Pilgrims',
    notifications: 'Notifications',
    payments: 'Payments',
    documents: 'Documents',
    groups: 'Groups',
    guides: 'Guides',
    travel: 'Trips',
    presence: 'QR & Presence',
    logout: 'Log out',
    language: 'Language',
    welcome: 'Welcome',
    connected: 'Your account is connected to the backend.',
    myApplications: 'My applications',
    noApplications: 'No application yet.',
    loading: 'Loading...',
    allApplications: 'All applications',
    allAgencies: 'All agencies',
    registeredAgencies: 'Registered agencies',
    registeredPilgrims: 'Registered pilgrims',
    activeApplications: 'Active applications',
    noData: 'No data available yet.',
    search: 'Search',
    encadreurs: 'Guides',
    profile: 'Profile',
    operations: 'Operations',
  },
  fr: {
    dashboard: 'Tableau de bord',
    overview: "Vue d'ensemble",
    agencies: 'Agences',
    dossiers: 'Dossiers',
    pilgrims: 'Pèlerins',
    notifications: 'Notifications',
    payments: 'Paiements',
    documents: 'Documents',
    groups: 'Groupes',
    guides: 'Guides',
    travel: 'Voyages',
    presence: 'QR & Présence',
    logout: 'Déconnexion',
    language: 'Langue',
    welcome: 'Bienvenue',
    connected: 'Ton compte est connecté au backend.',
    myApplications: 'Mes dossiers',
    noApplications: 'Aucun dossier pour le moment.',
    loading: 'Chargement…',
    allApplications: 'Tous les dossiers',
    allAgencies: 'Toutes les agences',
    registeredAgencies: 'Agences enregistrées',
    registeredPilgrims: 'Pèlerins inscrits',
    activeApplications: 'Dossiers actifs',
    noData: 'Aucune donnée disponible pour le moment.',
    search: 'Rechercher',
    encadreurs: 'Encadreurs',
    profile: 'Profil',
    operations: 'Opérations',
  },
  ar: {
    dashboard: 'لوحة التحكم',
    overview: 'نظرة عامة',
    agencies: 'الوكالات',
    dossiers: 'الملفات',
    pilgrims: 'الحجاج',
    notifications: 'الإشعارات',
    payments: 'المدفوعات',
    documents: 'الوثائق',
    groups: 'المجموعات',
    guides: 'المرشدون',
    travel: 'الرحلات',
    presence: 'QR والحضور',
    logout: 'تسجيل الخروج',
    language: 'اللغة',
    welcome: 'مرحباً',
    connected: 'حسابك متصل بالخادم.',
    myApplications: 'ملفاتي',
    noApplications: 'لا يوجد ملف حتى الآن.',
    loading: 'جار التحميل...',
    allApplications: 'كل الملفات',
    allAgencies: 'كل الوكالات',
    registeredAgencies: 'الوكالات المسجلة',
    registeredPilgrims: 'الحجاج المسجلون',
    activeApplications: 'الملفات النشطة',
    noData: 'لا توجد بيانات متاحة حالياً.',
    search: 'بحث',
    encadreurs: 'المرشدون',
    profile: 'الملف الشخصي',
    operations: 'العمليات',
  },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => localStorage.getItem(STORAGE_KEY) || 'en');

  useEffect(() => {
    const selected = LANGUAGES.some((item) => item.code === language) ? language : 'en';
    localStorage.setItem(STORAGE_KEY, selected);
    document.documentElement.lang = selected;
    document.documentElement.dir = selected === 'ar' ? 'rtl' : 'ltr';
  }, [language]);

  const value = useMemo(() => ({
    language,
    languages: LANGUAGES,
    setLanguage,
    t: (key) => MESSAGES[language]?.[key] ?? MESSAGES.en[key] ?? key,
  }), [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage doit être utilisé à l’intérieur de <LanguageProvider>.');
  return context;
}
