import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import './ui.css'

export type SelectOption<TValue extends string> = {
  label: string
  value: TValue
  description?: string
  meta?: string
  badge?: string
  actionLabel?: string
  onAction?: () => void
}

type SelectProps<TValue extends string> = {
  id: string
  label: string
  options: readonly SelectOption<TValue>[]
  value: TValue
  onChange: (value: TValue) => void
  className?: string
  hideLabel?: boolean
  menuHeader?: ReactNode
  renderOption?: (option: SelectOption<TValue>, isSelected: boolean) => ReactNode
  renderValue?: (option: SelectOption<TValue>) => ReactNode
}

export function Select<TValue extends string>({
  className = '',
  hideLabel = false,
  id,
  label,
  menuHeader,
  onChange,
  options,
  renderOption,
  renderValue,
  value,
}: SelectProps<TValue>) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listboxId = useId()
  const selectedOption = options.find((option) => option.value === value) ?? options[0]

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  function selectOption(nextValue: TValue) {
    onChange(nextValue)
    setIsOpen(false)
  }

  function handleOptionKeyDown(event: KeyboardEvent<HTMLDivElement>, nextValue: TValue) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      selectOption(nextValue)
    }
  }

  return (
    <div className={`select-field ${className}`.trim()} ref={rootRef}>
      <span className={`select-field__label ${hideLabel ? 'select-field__label--hidden' : ''}`} id={`${id}-label`}>
        {label}
      </span>
      <button
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-labelledby={`${id}-label ${id}-value`}
        className="select-field__control"
        id={id}
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span className="select-field__value" id={`${id}-value`}>
          {renderValue ? renderValue(selectedOption) : selectedOption.label}
        </span>
        <ChevronDown aria-hidden="true" className={isOpen ? 'select-field__chevron--open' : ''} size={15} />
      </button>

      {isOpen ? (
        <div aria-labelledby={`${id}-label`} className="select-menu" id={listboxId} role="listbox">
          {menuHeader ? <div className="select-menu__header">{menuHeader}</div> : null}
          {options.map((option) => {
            const isSelected = option.value === value

            return (
              <div
                aria-selected={isSelected}
                className={`select-menu__option ${isSelected ? 'select-menu__option--selected' : ''}`}
                key={option.value}
                onClick={() => selectOption(option.value)}
                onKeyDown={(event) => handleOptionKeyDown(event, option.value)}
                role="option"
                tabIndex={0}
              >
                {renderOption ? (
                  renderOption(option, isSelected)
                ) : (
                  <>
                    <div className="select-menu__copy">
                      <div className="select-menu__title-row">
                        <span className="select-menu__title">{option.label}</span>
                        {option.badge ? <span className="select-menu__badge">{option.badge}</span> : null}
                      </div>
                      {option.description ? <span className="select-menu__description">{option.description}</span> : null}
                      {option.meta ? <span className="select-menu__meta">{option.meta}</span> : null}
                    </div>

                    <div className="select-menu__actions">
                      {option.actionLabel && option.onAction ? (
                        <button
                          className="select-menu__action"
                          onClick={(event) => {
                            event.stopPropagation()
                            option.onAction?.()
                          }}
                          type="button"
                        >
                          {option.actionLabel}
                        </button>
                      ) : null}
                      {isSelected ? <Check aria-hidden="true" size={16} /> : null}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
