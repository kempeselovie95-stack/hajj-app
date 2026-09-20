import { useLanguage } from '../../contexts/LanguageContext.jsx';

export default function LanguageSelector() {
  const { language, languages, setLanguage, t } = useLanguage();

  return (
    <label className="flex items-center gap-2 font-body text-xs text-text-secondary">
      <span className="sr-only">{t('language')}</span>
      <span aria-hidden="true">文</span>
      <select
        value={language}
        onChange={(event) => setLanguage(event.target.value)}
        aria-label={t('language')}
        className="rounded-md border border-border bg-surface px-2 py-1.5 font-body text-xs text-text-primary focus:border-primary focus:outline-none"
      >
        {languages.map((item) => (
          <option key={item.code} value={item.code}>{item.label}</option>
        ))}
      </select>
    </label>
  );
}
