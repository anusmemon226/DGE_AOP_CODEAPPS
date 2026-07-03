import type { TextareaHTMLAttributes } from 'react'
import './ui.css'

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: string
  hint?: string
  label: string
}

export function Textarea({ className = '', error, hint, id, label, required, rows = 4, ...props }: TextareaProps) {
  const textareaId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  const isDisabled = Boolean(props.disabled)

  return (
    <label className={`field ${isDisabled ? 'field--disabled' : ''} ${className}`.trim()} htmlFor={textareaId}>
      <span className="field__label">
        {label}
        {required ? <span aria-hidden="true" className="field__required"> *</span> : null}
      </span>
      <textarea
        aria-invalid={Boolean(error)}
        className="field__control field__control--textarea"
        id={textareaId}
        required={required}
        rows={rows}
        {...props}
      />
      {error ? (
        <span className="field__error">{error}</span>
      ) : hint ? (
        <span className="field__hint">{hint}</span>
      ) : null}
    </label>
  )
}
