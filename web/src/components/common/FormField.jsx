/**
 * Champ de formulaire standard : label, input, message d'erreur.
 * Centralise le markup pour que tous les formulaires (login, register,
 * création de dossier...) restent visuellement cohérents.
 */
import { useState } from 'react';

export default function FormField({
  id,
  label,
  error,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  required = false,
}) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === 'password';
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block font-body text-sm font-medium text-text-primary">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      <div className="relative">
      <input
        id={id}
        name={id}
        type={isPassword && visible ? 'text' : type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`input-field ${isPassword ? 'pe-11' : ''} ${error ? 'border-danger focus:border-danger' : ''}`}
      />
      {isPassword && (
        <button type="button" onClick={() => setVisible((current) => !current)} aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible} className="absolute end-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-text-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
          {visible ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A9.8 9.8 0 0 1 12 5c5 0 8.5 4 9.5 7a11 11 0 0 1-2.6 3.9M6.3 6.4C4.3 7.8 3 10 2.5 12c1 3 4.5 7 9.5 7 1.5 0 2.8-.4 4-1" /></svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true"><path d="M2.5 12C3.5 9 7 5 12 5s8.5 4 9.5 7c-1 3-4.5 7-9.5 7s-8.5-4-9.5-7Z" /><circle cx="12" cy="12" r="3" /></svg>
          )}
        </button>
      )}
      </div>
      {error && (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
