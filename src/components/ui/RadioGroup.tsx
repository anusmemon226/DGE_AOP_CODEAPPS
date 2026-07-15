import type { ReactNode } from 'react'
import { Tooltip } from './Tooltip'
import './ui.css'

type RadioOption<TValue extends string> = {
  className?: string
  description?: string
  disabled?: boolean
  label: string
  value: TValue
}

type RadioGroupProps<TValue extends string> = {
  className?: string
  disabled?: boolean
  error?: string
  label: string
  name: string
  onChange: (value: TValue) => void
  options: readonly RadioOption<TValue>[]
  required?: boolean
  tooltip?: ReactNode
  tooltipTone?: 'info' | 'warning'
  value: TValue
}

export function RadioGroup<TValue extends string>({
  className = '',
  disabled = false,
  error,
  label,
  name,
  onChange,
  options,
  required = false,
  tooltip,
  tooltipTone,
  value,
}: RadioGroupProps<TValue>) {
  return (
    <fieldset className={`radio-group ${error ? 'radio-group--invalid' : ''} ${disabled ? 'radio-group--disabled' : ''} ${className}`.trim()} disabled={disabled}>
      <legend className={`field__label${tooltip ? ' field__label--with-tooltip' : ''}`}>
        {label}
        {required ? <span aria-hidden="true" className="field__required"> *</span> : null}
        {tooltip ? <Tooltip content={tooltip} label={`More information about ${label}`} tone={tooltipTone} /> : null}
      </legend>
      <div className="radio-group__options">
        {options.map((option) => {
          const isOptionDisabled = disabled || Boolean(option.disabled)

          return (
          <label className={`choice choice--radio ${option.className || ''}`.trim()} key={option.value}>
            <input checked={option.value === value} disabled={isOptionDisabled} name={name} onChange={() => onChange(option.value)} type="radio" />
            <span className="choice__box" aria-hidden="true" />
            <span className="choice__copy">
              <span>{option.label}</span>
              {option.description ? <small>{option.description}</small> : null}
            </span>
          </label>
          )
        })}
      </div>
      {error ? <span className="field__error">{error}</span> : null}
    </fieldset>
  )
}
