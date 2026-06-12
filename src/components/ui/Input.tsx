import type { InputHTMLAttributes } from 'react'
import './ui.css'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string
  hint?: string
  label: string
}

export function Input({ className = '', error, hint, id, label, required, ...props }: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')

  return (
    <label className={`field ${className}`.trim()} htmlFor={inputId}>
      <span className="field__label">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </span>
      <input
        aria-invalid={Boolean(error)}
        className="field__control"
        id={inputId}
        required={required}
        {...props}
      />
      {hint ? <span className="field__hint">{hint}</span> : null}
      {error ? <span className="field__error">{error}</span> : null}
    </label>
  )
}
