import type { TextareaHTMLAttributes } from 'react'
import './ui.css'

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  error?: string
  hint?: string
  label: string
}

export function Textarea({ className = '', error, hint, id, label, required, rows = 4, ...props }: TextareaProps) {
  const textareaId = id ?? label.toLowerCase().replace(/\s+/g, '-')

  return (
    <label className={`field ${className}`.trim()} htmlFor={textareaId}>
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
      <span className={error ? 'field__error' : hint ? 'field__hint' : 'field__message-placeholder'}>
        {error || hint || ''}
      </span>
    </label>
  )
}
