import type { InputHTMLAttributes } from 'react'
import { formatCurrencyAmount } from '../../utils/formatting'
import { DirhamIcon } from './DirhamIcon'
import './ui.css'

type CurrencyDisplayProps = {
  className?: string
  value: number | string | null | undefined
}

type CurrencyInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  error?: string
  hint?: string
  label: string
}

export function CurrencyDisplay({ className = '', value }: CurrencyDisplayProps) {
  return (
    <span className={`currency-display ${className}`.trim()}>
      <DirhamIcon />
      <span>{formatCurrencyAmount(value) || '0'}</span>
    </span>
  )
}

export function CurrencyInput({ className = '', error, hint, id, label, required, ...props }: CurrencyInputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-')

  return (
    <label className={`field currency-input ${className}`.trim()} htmlFor={inputId}>
      <span className="field__label">
        {label}
        {required ? <span aria-hidden="true" className="field__required"> *</span> : null}
      </span>
      <span className="currency-input__control">
        <DirhamIcon />
        <input aria-invalid={Boolean(error)} id={inputId} inputMode="decimal" required={required} type="text" {...props} />
      </span>
      {hint ? <span className="field__hint">{hint}</span> : null}
      {error ? <span className="field__error">{error}</span> : null}
    </label>
  )
}
