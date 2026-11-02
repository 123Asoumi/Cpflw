import { forwardRef, useId } from 'react';
import { Search, X } from 'lucide-react';

export function Field({ label, error, hint, children, className = '', required }) {
  return (
    <div className={className}>
      {label && (
        <span className="label">
          {label}{required && <span className="text-danger"> *</span>}
        </span>
      )}
      {children}
      {error ? <p className="mt-1 text-xs text-danger" role="alert">{error}</p> : hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
    </div>
  );
}

export const Input = forwardRef(function Input({ label, error, hint, className = '', required, id, ...props }, ref) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <Field label={label && <label htmlFor={inputId}>{label}</label>} error={error} hint={hint} className={className} required={required}>
      <input ref={ref} id={inputId} aria-invalid={!!error} required={required} className={`input ${error ? 'input-error' : ''}`} {...props} />
    </Field>
  );
});

export function Select({ label, error, hint, className = '', options = [], placeholder, required, id, ...props }) {
  const autoId = useId();
  const selectId = id || autoId;
  return (
    <Field label={label && <label htmlFor={selectId}>{label}</label>} error={error} hint={hint} className={className} required={required}>
      <select id={selectId} aria-invalid={!!error} required={required} className={`input pr-8 ${error ? 'input-error' : ''}`} {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  );
}

export function Textarea({ label, error, hint, className = '', required, id, rows = 4, ...props }) {
  const autoId = useId();
  const taId = id || autoId;
  return (
    <Field label={label && <label htmlFor={taId}>{label}</label>} error={error} hint={hint} className={className} required={required}>
      <textarea id={taId} rows={rows} aria-invalid={!!error} required={required} className={`input h-auto py-2 resize-y ${error ? 'input-error' : ''}`} {...props} />
    </Field>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Rechercher…', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="input pl-8 pr-7 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button type="button" onClick={() => onChange('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink" aria-label="Effacer la recherche">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
