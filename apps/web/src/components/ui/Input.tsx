import * as React from 'react';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { label?: string; hint?: string; error?: string }>(
  ({ label, hint, error, className = '', id, ...rest }, ref) => {
    const inputId = id || rest.name;
    return (
      <label className="block">
        {label && (
          <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-subtle)] mb-1.5">
            {label}
          </span>
        )}
        <input id={inputId} ref={ref} className={`ef-input ${error ? 'border-[var(--color-danger)]' : ''} ${className}`} {...rest} />
        {hint && !error && <span className="block text-xs text-[var(--color-text-muted)] mt-1">{hint}</span>}
        {error && <span className="block text-xs text-[var(--color-danger)] mt-1">{error}</span>}
      </label>
    );
  },
);
Input.displayName = 'Input';

export function Select({
  label,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <label className="block">
      {label && (
        <span className="block text-xs font-semibold uppercase tracking-wider text-[var(--color-text-subtle)] mb-1.5">
          {label}
        </span>
      )}
      <select className="ef-input" {...rest}>
        {children}
      </select>
    </label>
  );
}
