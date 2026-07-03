import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown, Search } from 'lucide-react'
import './ui.css'

export type SelectOption<TValue extends string> = {
  label: string
  value: TValue
  className?: string
  description?: string
  meta?: string
  badge?: string
  disabled?: boolean
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
  disabled?: boolean
  error?: string
  hideLabel?: boolean
  menuHeader?: ReactNode
  renderOption?: (option: SelectOption<TValue>, isSelected: boolean) => ReactNode
  renderValue?: (option: SelectOption<TValue>) => ReactNode
  required?: boolean
}

export function Select<TValue extends string>({
  className = '',
  disabled = false,
  error,
  hideLabel = false,
  id,
  label,
  menuHeader,
  onChange,
  options,
  renderOption,
  renderValue,
  required = false,
  value,
}: SelectProps<TValue>) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null)
  const listboxId = useId()
  const selectedOption = options.find((option) => option.value === value) ?? options[0]
  const shouldSearch = options.length > 10
  const visibleOptions = useMemo(() => {
    if (!shouldSearch || !searchValue.trim()) {
      return options
    }

    const normalizedSearch = searchValue.trim().toLowerCase()

    return options.filter((option) =>
      [option.label, option.description, option.meta].filter(Boolean).some((text) => text!.toLowerCase().includes(normalizedSearch)),
    )
  }, [options, searchValue, shouldSearch])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node) && !menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    function reposition() {
      const control = rootRef.current?.querySelector('.select-field__control') as HTMLElement | null
      const menu = menuRef.current
      if (!control || !menu) return

      const rect = control.getBoundingClientRect()
      const menuHeight = menu.offsetHeight
      const spaceBelow = window.innerHeight - rect.bottom - 8
      const openUp = menuHeight > spaceBelow && rect.top - 8 > spaceBelow

      setMenuPos({
        top: openUp ? Math.max(8, rect.top - menuHeight - 4) : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      })
    }

    const rafId = requestAnimationFrame(reposition)

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('scroll', reposition, { capture: true })

    return () => {
      cancelAnimationFrame(rafId)
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('scroll', reposition, { capture: true })
    }
  }, [isOpen])

  function selectOption(nextValue: TValue) {
    if (disabled) {
      return
    }

    const nextOption = options.find((option) => option.value === nextValue)

    if (nextOption?.disabled) {
      return
    }

    onChange(nextValue)
    setIsOpen(false)
    setSearchValue('')
  }

  function handleOptionKeyDown(event: KeyboardEvent<HTMLDivElement>, nextValue: TValue) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      selectOption(nextValue)
    }
  }

  return (
    <div className={`select-field ${disabled ? 'select-field--disabled' : ''} ${className}`.trim()} ref={rootRef}>
      <span className={`select-field__label ${hideLabel ? 'select-field__label--hidden' : ''}`} id={`${id}-label`}>
        {label}
        {required ? <span aria-hidden="true" className="field__required"> *</span> : null}
      </span>
      <button
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-invalid={Boolean(error)}
        aria-labelledby={`${id}-label ${id}-value`}
        className="select-field__control"
        disabled={disabled}
        id={id}
        onClick={() => {
          if (disabled) return
          const nextOpen = !isOpen
          if (nextOpen) {
            const el = rootRef.current?.querySelector('.select-field__control') as HTMLElement | null
            if (el) {
              const rect = el.getBoundingClientRect()
              const estHeight = 260
              const spaceBelow = window.innerHeight - rect.bottom - 8
              const openUp = estHeight > spaceBelow && rect.top - 8 > spaceBelow
              setMenuPos({
                top: openUp ? Math.max(8, rect.top - estHeight - 4) : rect.bottom + 4,
                left: rect.left,
                width: rect.width,
              })
            }
          } else {
            setMenuPos(null)
          }
          setIsOpen(nextOpen)
        }}
        type="button"
      >
        <span className="select-field__value" id={`${id}-value`}>
          {renderValue ? renderValue(selectedOption) : selectedOption.label}
        </span>
        <ChevronDown aria-hidden="true" className={isOpen ? 'select-field__chevron--open' : ''} size={15} />
      </button>
      {error ? <span className="field__error">{error}</span> : null}

      {isOpen && menuPos
        ? createPortal(
            <div
              aria-labelledby={`${id}-label`}
              className="select-menu"
              id={listboxId}
              ref={menuRef}
              role="listbox"
              style={{
                position: 'fixed',
                top: menuPos.top,
                left: menuPos.left,
                minWidth: menuPos.width,
                width: 'max-content',
                zIndex: 99999,
              }}
            >
          {menuHeader ? <div className="select-menu__header">{menuHeader}</div> : null}
          {shouldSearch ? (
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
          ) : null}
          {visibleOptions.length === 0 ? <div className="select-menu__empty">No options found</div> : null}
          {visibleOptions.map((option) => {
            const isSelected = option.value === value

            return (
              <div
                aria-selected={isSelected}
                className={`select-menu__option ${isSelected ? 'select-menu__option--selected' : ''} ${
                  option.disabled ? 'select-menu__option--disabled' : ''
                }`}
                key={option.value}
                onClick={() => selectOption(option.value)}
                onKeyDown={(event) => handleOptionKeyDown(event, option.value)}
                role="option"
                tabIndex={option.disabled ? -1 : 0}
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
        </div>,
        document.body,
      ) : null}
    </div>
  )
}
