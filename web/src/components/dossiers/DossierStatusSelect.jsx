import { getAllowedNextStatuses } from '@hajj/shared';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

/**
 * @param {{ currentStatus: string, onChange: (nextStatus: string) => void }} props
 */
export default function DossierStatusSelect({ currentStatus, onChange }) {
  const { t } = useLanguage();
  const nextOptions = getAllowedNextStatuses(currentStatus);

  if (nextOptions.length === 0) {
    return (
      <p className="font-body text-sm text-text-secondary">
        {t('dss_final')}
      </p>
    );
  }

  return (
    <label className="flex items-center gap-2">
      <span className="font-body text-sm text-text-secondary">{t('dss_moveTo')}</span>
      <select
        defaultValue=""
        onChange={(e) => {
          if (e.target.value) onChange(e.target.value);
          e.target.value = '';
        }}
        className="rounded-md border border-border bg-surface px-3 py-1.5 font-body text-sm text-text-primary focus:border-primary focus:outline-none"
      >
        <option value="" disabled>
          {t('dss_choose')}
        </option>
        {nextOptions.map((status) => (
          <option key={status} value={status}>
            {t(`status_${status}`)}
          </option>
        ))}
      </select>
    </label>
  );
}
