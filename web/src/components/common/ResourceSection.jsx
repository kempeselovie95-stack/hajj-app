import { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext.jsx';

/**
 * Tableau + formulaire modal pilotés par configuration. Sert aux écrans
 * d'opérations (vols, hôtels, transports…) pour éviter de dupliquer le même
 * markup. `fields` : [{ name, label, type: text|number|date|datetime-local|select|textarea, options?, required?, max?, min? }]
 */
export default function ResourceSection({ title, subtitle, items, loading, columns, fields, canEdit = true, onSave, onDelete, rowActions, emptyText, createLabel, extra }) {
  const { t } = useLanguage();
  const [editor, setEditor] = useState(null); // { item|null, values }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function openEditor(item) {
    const values = {};
    for (const field of fields) values[field.name] = item?.[field.name] ?? field.defaultValue ?? '';
    setError('');
    setEditor({ item, values });
  }

  const setValue = (name, value) => setEditor((current) => ({ ...current, values: { ...current.values, [name]: value } }));

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {};
      for (const field of fields) {
        const value = editor.values[field.name];
        if (value === '') payload[field.name] = editor.item ? null : undefined;
        else payload[field.name] = field.type === 'number' || field.numeric ? Number(value) : value;
      }
      await onSave(editor.item, payload);
      setEditor(null);
    } catch (requestError) {
      const data = requestError.response?.data;
      setError(data?.message ? `${data.message}${data.erreurs?.length ? ` (${data.erreurs.map((e) => e.champ).join(', ')})` : ''}` : t('res_saveError'));
    } finally { setSaving(false); }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-4">
        <div><h2 className="font-semibold text-slate-800">{title}</h2>{subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}</div>
        {canEdit && onSave && <button type="button" onClick={() => openEditor(null)} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800">{createLabel || t('res_add')}</button>}
      </header>
      {extra}
      {loading ? <p className="p-6 text-center text-sm text-slate-500">{t('loading')}</p> : !items.length ? <p className="p-8 text-center text-sm text-slate-500">{emptyText || t('res_empty')}</p> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-start text-sm">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500"><tr>
              {columns.map((column) => <th key={column.key} className="px-4 py-3 font-medium">{column.label}</th>)}
              {canEdit && <th className="px-4 py-3 text-end font-medium">{t('c_actions')}</th>}
            </tr></thead>
            <tbody className="divide-y divide-slate-100">{items.map((item) => (
              <tr key={item.id} className="align-top">
                {columns.map((column) => <td key={column.key} className="px-4 py-3 text-slate-700">{column.render ? column.render(item) : (item[column.key] ?? '—')}</td>)}
                {canEdit && <td className="px-4 py-3"><div className="flex flex-wrap justify-end gap-2">
                  {rowActions?.(item)}
                  {onSave && <button type="button" onClick={() => openEditor(item)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">{t('c_edit')}</button>}
                  {onDelete && <button type="button" onClick={() => { if (window.confirm(t('res_confirmDelete'))) onDelete(item); }} className="rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50">{t('c_delete')}</button>}
                </div></td>}
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {editor && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-950/40 sm:items-center sm:p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setEditor(null); }}>
          <form onSubmit={submit} className="max-h-[92dvh] w-full space-y-4 overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-2xl">
            <h3 className="text-lg font-semibold text-slate-900">{editor.item ? t('c_edit') : (createLabel || t('res_add'))} — {title}</h3>
            {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <div className="grid gap-3 sm:grid-cols-2">
              {fields.map((field) => (
                <label key={field.name} className={`block text-xs font-medium text-slate-600 ${field.type === 'textarea' ? 'sm:col-span-2' : ''}`}>
                  {field.label}{field.required && <span className="text-red-600"> *</span>}
                  {field.type === 'select' ? (
                    <select value={editor.values[field.name]} required={field.required} onChange={(event) => setValue(field.name, event.target.value)} className="field">
                      {!field.required && <option value="">—</option>}
                      {field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                  ) : field.type === 'textarea' ? (
                    <textarea rows="2" maxLength={field.max} value={editor.values[field.name]} onChange={(event) => setValue(field.name, event.target.value)} className="field" />
                  ) : (
                    <input type={field.type || 'text'} required={field.required} maxLength={field.max} min={field.min} step={field.type === 'number' ? (field.step ?? 1) : undefined} value={editor.values[field.name]} onChange={(event) => setValue(field.name, event.target.value)} className="field" />
                  )}
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditor(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600">{t('cancel')}</button>
              <button type="submit" disabled={saving} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? t('c_saving') : t('c_save')}</button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}
