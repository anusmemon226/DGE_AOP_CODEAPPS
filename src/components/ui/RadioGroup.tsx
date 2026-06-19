import './ui.css'

type RadioOption<TValue extends string> = {
  className?: string
  description?: string
  label: string
  value: TValue
}

type RadioGroupProps<TValue extends string> = {
  className?: string
  error?: string
  label: string
  name: string
  onChange: (value: TValue) => void
  options: readonly RadioOption<TValue>[]
  required?: boolean
  value: TValue
}

export function RadioGroup<TValue extends string>({
  className = '',
  error,
  label,
  name,
  onChange,
  options,
  required = false,
  value,
}: RadioGroupProps<TValue>) {
  return (
    <fieldset className={`radio-group ${error ? 'radio-group--invalid' : ''} ${className}`.trim()}>
      <legend className="field__label">
        {label}
        {required ? <span aria-hidden="true" className="field__required"> *</span> : null}
      </legend>
      <div className="radio-group__options">
        {options.map((option) => (
          <label className={`choice choice--radio ${option.className || ''}`.trim()} key={option.value}>
            <input checked={option.value === value} name={name} onChange={() => onChange(option.value)} type="radio" />
            <span className="choice__box" aria-hidden="true" />
            <span className="choice__copy">
              <span>{option.label}</span>
              {option.description ? <small>{option.description}</small> : null}
            </span>
          </label>
        ))}
      </div>
      {error ? <span className="field__error">{error}</span> : null}
    </fieldset>
  )
}
