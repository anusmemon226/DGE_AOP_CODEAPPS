import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import type { SelectOption } from './Select'
import './ui.css'

type MultiSelectProps<TValue extends string> = {
  className?: string
  error?: string
  hint?: string
  id: string
  label: string
  onChange: (value: TValue[]) => void
  options: readonly SelectOption<TValue>[]
  placeholder?: string
  required?: boolean
  value: TValue[]
}

export function MultiSelect<TValue extends string>({
  className = '',
  error,
  hint,
  id,
  label,
  onChange,
  options,
  placeholder = 'Select options',
  required = false,
  value,
}: MultiSelectProps<TValue>) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const selectedOptions = options.filter((option) => value.includes(option.value))
  const visibleOptions = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase()

    if (!normalizedSearch) {
      return options
    }

    return options.filter((option) => option.label.toLowerCase().includes(normalizedSearch))
  }, [options, searchValue])

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [isOpen])

  function toggleValue(nextValue: TValue) {
    if (value.includes(nextValue)) {
      onChange(value.filter((currentValue) => currentValue !== nextValue))
      return
    }

    onChange([...value, nextValue])
  }

  return (
    <div className={`field multi-select ${className}`.trim()} ref={rootRef}>
      <span className="field__label" id={`${id}-label`}>
        {label}
        {required ? <span aria-hidden="true" className="field__required"> *</span> : null}
      </span>
      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-invalid={Boolean(error)}
        aria-labelledby={`${id}-label`}
        className="field__control multi-select__trigger"
        id={id}
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span className="multi-select__chips">
          {selectedOptions.length > 0
            ? selectedOptions.map((option) => (
                <span className="multi-select__chip" key={option.value}>
                  {option.label}
                  <X aria-hidden="true" size={12} />
                </span>
              ))
            : placeholder}
        </span>
        <ChevronDown aria-hidden="true" className={isOpen ? 'select-field__chevron--open' : ''} size={15} />
      </button>
      {hint ? <span className="field__hint">{hint}</span> : null}
      {error ? <span className="field__error">{error}</span> : null}

      {isOpen ? (
        <div className="multi-select__menu" role="listbox">
          <label className="select-menu__search">
            <Search aria-hidden="true" size={15} />
            <input
              aria-label={`Search ${label}`}
              autoFocus
              onChange={(event) => setSearchValue(event.target.value)}
              placeholder="Search options..."
              value={searchValue}
            />
          </label>
          {visibleOptions.map((option) => {
            const isSelected = value.includes(option.value)

            return (
              <button
                aria-selected={isSelected}
                className={`multi-select__option ${isSelected ? 'multi-select__option--selected' : ''}`}
                key={option.value}
                onClick={() => toggleValue(option.value)}
                type="button"
              >
                <span>{option.label}</span>
                {isSelected ? <Check size={16} /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
