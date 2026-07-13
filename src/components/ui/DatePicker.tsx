import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDateDisplay } from '../../utils/formatting'
import './ui.css'

type DatePickerProps = {
  className?: string
  disabled?: boolean
  error?: string
  hint?: string
  id: string
  label: string
  max?: string
  min?: string
  onChange: (value: string) => void
  readOnly?: boolean
  required?: boolean
  value?: string
}

function normalizeDateValue(value?: string) {
  if (!value) {
    return ''
  }

  const [datePart] = value.split('T')
  return datePart
}

function toDate(value?: string) {
  const normalizedValue = normalizeDateValue(value)

  if (!normalizedValue) {
    return new Date()
  }

  const [year, month, day] = normalizedValue.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  return Number.isNaN(date.getTime()) ? new Date() : date
}

function toIsoDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isDateDisabled(date: Date, min?: string, max?: string) {
  const isoDate = toIsoDate(date)
  const normalizedMin = normalizeDateValue(min)
  const normalizedMax = normalizeDateValue(max)
  return Boolean((normalizedMin && isoDate < normalizedMin) || (normalizedMax && isoDate > normalizedMax))
}

export function DatePicker({
  className = '',
  disabled = false,
  error,
  hint,
  id,
  label,
  max,
  min,
  onChange,
  readOnly = false,
  required = false,
  value,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedValue, setSelectedValue] = useState(value ?? '')
  const [lastPropValue, setLastPropValue] = useState(value ?? '')
  const [viewDate, setViewDate] = useState(() => toDate(value))
  const rootRef = useRef<HTMLDivElement>(null)
  const popoverRef = useRef<HTMLDivElement>(null)
  const [popoverRect, setPopoverRect] = useState<{ top: number; left: number } | null>(null)
  const activeValue = normalizeDateValue(value ?? selectedValue)

  if ((value ?? '') !== lastPropValue) {
    const nextValue = value ?? ''
    setLastPropValue(nextValue)
    setSelectedValue(nextValue)
  }

  // Close on outside click and Escape; reposition on scroll
  useEffect(() => {
    if (!isOpen) {
      return
    }

    function handleDocumentClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node) && !popoverRef.current?.contains(event.target as Node)) {
        setPopoverRect(null)
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setPopoverRect(null)
        setIsOpen(false)
      }
    }

    // Reposition using actual popover height so it stays attached on scroll
    function reposition() {
      const trigger = rootRef.current?.querySelector('.date-picker__trigger') as HTMLElement | null
      const popover = popoverRef.current
      if (!trigger || !popover) return

      const rect = trigger.getBoundingClientRect()
      const popoverHeight = popover.offsetHeight || 280
      const popoverWidth = popover.offsetWidth

      const spaceBelow = window.innerHeight - rect.bottom - 8
      const spaceAbove = rect.top - 8
      const openUp = popoverHeight > spaceBelow && spaceAbove > spaceBelow
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - popoverWidth - 8))

      setPopoverRect({
        top: openUp ? Math.max(8, rect.top - popoverHeight - 4) : rect.bottom + 4,
        left,
      })
    }

    // Refine position after actual layout is known
    const rafId = requestAnimationFrame(reposition)

    document.addEventListener('click', handleDocumentClick)
    document.addEventListener('keydown', handleKeyDown)
    // Scroll events don't bubble but can be captured at document level
    document.addEventListener('scroll', reposition, { capture: true })

    return () => {
      cancelAnimationFrame(rafId)
      document.removeEventListener('click', handleDocumentClick)
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('scroll', reposition, { capture: true })
    }
  }, [isOpen])

  const calendarDays = useMemo(() => {
    const start = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
    const startOffset = start.getDay()
    const days: Date[] = []

    for (let index = 0; index < 42; index += 1) {
      days.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), index - startOffset + 1))
    }

    return days
  }, [viewDate])

  function handleToggle() {
    if (readOnly) return

    if (isOpen) {
      setPopoverRect(null)
      setIsOpen(false)
      return
    }

    if (activeValue) {
      setViewDate(toDate(activeValue))
    }

    // Calculate fixed position from trigger
    const trigger = rootRef.current?.querySelector('.date-picker__trigger') as HTMLElement | null
    if (trigger) {
      const rect = trigger.getBoundingClientRect()
      // Estimate popover height for flip logic
      const estHeight = 280
      const spaceBelow = window.innerHeight - rect.bottom - 8
      const spaceAbove = rect.top - 8
      const openUp = estHeight > spaceBelow && spaceAbove > spaceBelow
      const left = Math.max(8, Math.min(rect.left, window.innerWidth - 280))

      setPopoverRect({
        top: openUp ? Math.max(8, rect.top - estHeight - 4) : rect.bottom + 4,
        left,
      })
    }

    setIsOpen(true)
  }

  function handleClose() {
    setPopoverRect(null)
    setIsOpen(false)
  }

  return (
    <div className={`field date-picker ${disabled ? 'field--disabled' : ''} ${className}`.trim()} ref={rootRef}>
      <span className="field__label" id={`${id}-label`}>
        {label}
        {required ? <span aria-hidden="true" className="field__required"> *</span> : null}
      </span>
      <div className="date-picker__control-wrap">
        <button
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-invalid={Boolean(error)}
          aria-labelledby={`${id}-label`}
          className="field__control date-picker__trigger"
          disabled={disabled}
          id={id}
          onClick={handleToggle}
          type="button"
        >
          <span>{formatDateDisplay(value) || 'DD/MM/YYYY'}</span>
          <Calendar aria-hidden="true" size={16} />
        </button>
      </div>

      {error ? (
        <span className="field__error">{error}</span>
      ) : hint ? (
        <span className="field__hint">{hint}</span>
      ) : null}

      {/* Portal popover to document.body so it never gets clipped */}
      {isOpen && popoverRect
        ? createPortal(
            <div
              className="date-picker__popover"
              ref={popoverRef}
              role="dialog"
              style={{
                position: 'fixed',
                top: popoverRect.top,
                left: popoverRect.left,
                zIndex: 99999,
              }}
            >
              <div className="date-picker__header">
                <button
                  aria-label="Previous month"
                  onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}
                  type="button"
                >
                  <ChevronLeft size={16} />
                </button>
                <strong>{viewDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}</strong>
                <button
                  aria-label="Next month"
                  onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}
                  type="button"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <div className="date-picker__weekdays">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
                  <span key={`${day}-${index}`}>{day}</span>
                ))}
              </div>
              <div className="date-picker__grid">
                {calendarDays.map((day) => {
                  const isoDate = toIsoDate(day)
                  const isMuted = day.getMonth() !== viewDate.getMonth()
                  const isSelected = isoDate === activeValue
                  const isDisabled = isDateDisabled(day, min, max)

                  return (
                    <button
                      className={`${isMuted ? 'date-picker__day--muted' : ''} ${isSelected ? 'date-picker__day--selected' : ''}`}
                      disabled={isDisabled}
                      key={isoDate}
                      onClick={() => {
                        setSelectedValue(isoDate)
                        setViewDate(day)
                        onChange(isoDate)
                        handleClose()
                      }}
                      type="button"
                    >
                      {day.getDate()}
                    </button>
                  )
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
