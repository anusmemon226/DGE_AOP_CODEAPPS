import './ui.css'

type RadioOption<TValue extends string> = {
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
  value: TValue
}

export function RadioGroup<TValue extends string>({
  className = '',
  error,
  label,
  name,
  onChange,
  options,
  value,
}: RadioGroupProps<TValue>) {
  return (
    <fieldset className={`radio-group ${className}`.trim()}>
      <legend className="field__label">{label}</legend>
      <div className="radio-group__options">
        {options.map((option) => (
          <label className="choice choice--radio" key={option.value}>
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
