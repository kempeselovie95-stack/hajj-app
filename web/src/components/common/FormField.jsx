/**
 * Champ de formulaire standard : label, input, message d'erreur.
 * Centralise le markup pour que tous les formulaires (login, register,
 * création de dossier...) restent visuellement cohérents.
 */
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
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block font-body text-sm font-medium text-text-primary">
        {label}
        {required && <span className="text-danger"> *</span>}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`input-field ${error ? 'border-danger focus:border-danger' : ''}`}
      />
      {error && (
        <p id={`${id}-error`} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
