import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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
  selectionDisplay?: 'chips' | 'count'
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
  selectionDisplay = 'chips',
  value,
}: MultiSelectProps<TValue>) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number; maxHeight: number } | null>(null)
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

    function handleDocumentClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node) && !menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
        setMenuPos(null)
      }
    }

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
        setMenuPos(null)
      }
    }

    function reposition() {
      const control = rootRef.current?.querySelector('.multi-select__trigger') as HTMLElement | null
      const menu = menuRef.current
      if (!control) return

      const rect = control.getBoundingClientRect()
      const measuredMenuHeight = menu?.offsetHeight || 320
      const spaceBelow = window.innerHeight - rect.bottom - 8
      const spaceAbove = rect.top - 8
      const openUp = measuredMenuHeight > spaceBelow && spaceAbove > spaceBelow
      const availableSpace = Math.max(160, openUp ? spaceAbove : spaceBelow)
      const maxHeight = Math.min(360, availableSpace)

      setMenuPos({
        top: openUp ? Math.max(8, rect.top - Math.min(measuredMenuHeight, maxHeight) - 4) : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        maxHeight,
      })
    }

    const rafId = requestAnimationFrame(reposition)

    document.addEventListener('click', handleDocumentClick)
    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('scroll', reposition, { capture: true })

    return () => {
      cancelAnimationFrame(rafId)
      document.removeEventListener('click', handleDocumentClick)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('scroll', reposition, { capture: true })
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
        onClick={() => {
          const nextOpen = !isOpen

          if (nextOpen) {
            const el = rootRef.current?.querySelector('.multi-select__trigger') as HTMLElement | null
            if (el) {
              const rect = el.getBoundingClientRect()
              const estimatedHeight = 320
              const spaceBelow = window.innerHeight - rect.bottom - 8
              const spaceAbove = rect.top - 8
              const openUp = estimatedHeight > spaceBelow && spaceAbove > spaceBelow
              const maxHeight = Math.min(360, Math.max(160, openUp ? spaceAbove : spaceBelow))

              setMenuPos({
                top: openUp ? Math.max(8, rect.top - maxHeight - 4) : rect.bottom + 4,
                left: rect.left,
                width: rect.width,
                maxHeight,
              })
            }
          }

          setIsOpen(nextOpen)
          if (!nextOpen) {
            setMenuPos(null)
          }
        }}
        type="button"
      >
        <span className="multi-select__chips">
          {selectedOptions.length > 0 && selectionDisplay === 'count'
            ? `${selectedOptions.length} Selected`
            : selectedOptions.length > 0
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

      {isOpen && menuPos
        ? createPortal(
        <div
          className="multi-select__menu"
          ref={menuRef}
          role="listbox"
          style={{
            left: menuPos.left,
            maxHeight: menuPos.maxHeight,
            minWidth: menuPos.width,
            position: 'fixed',
            top: menuPos.top,
            width: 'max-content',
            zIndex: 99999,
          }}
        >
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
        </div>,
        document.body,
      ) : null}
    </div>
  )
}
