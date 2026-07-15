import type { InputHTMLAttributes, ReactNode } from 'react'
import { Tooltip } from './Tooltip'
import './ui.css'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  error?: string
  hint?: string
  label: string
  rightIcon?: ReactNode
  tooltip?: ReactNode
}

export function Input({ className = '', error, hint, id, label, required, rightIcon, tooltip, ...props }: InputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')
  const isDisabled = Boolean(props.disabled)

  return (
    <label className={`field ${isDisabled ? 'field--disabled' : ''} ${className}`.trim()} htmlFor={inputId}>
      <span className={`field__label${tooltip ? ' field__label--with-tooltip' : ''}`}>
        {label}
        {required ? <span aria-hidden="true" className="field__required"> *</span> : null}
        {tooltip ? <Tooltip content={tooltip} label={`More information about ${label}`} /> : null}
      </span>
      <span className={rightIcon ? 'field__input-wrap' : undefined}>
        <input
          aria-invalid={Boolean(error)}
          className="field__control"
          id={inputId}
          required={required}
          {...props}
        />
        {rightIcon ? <span className="field__right-icon">{rightIcon}</span> : null}
      </span>
      {error ? (
        <span className="field__error">{error}</span>
      ) : hint ? (
        <span className="field__hint">{hint}</span>
      ) : null}
    </label>
  )
}
