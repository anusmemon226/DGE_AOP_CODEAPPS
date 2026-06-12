import { useEffect, useMemo, useRef, useState } from 'react'
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

function toDate(value?: string) {
  if (!value) {
    return new Date()
  }

  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function toIsoDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function isDateDisabled(date: Date, min?: string, max?: string) {
  const isoDate = toIsoDate(date)
  return Boolean((min && isoDate < min) || (max && isoDate > max))
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
  const [viewDate, setViewDate] = useState(() => toDate(value))
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
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

  const calendarDays = useMemo(() => {
    const start = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
    const startOffset = start.getDay()
    const days: Date[] = []

    for (let index = 0; index < 42; index += 1) {
      days.push(new Date(viewDate.getFullYear(), viewDate.getMonth(), index - startOffset + 1))
    }

    return days
  }, [viewDate])

  return (
    <div className={`field date-picker ${className}`.trim()} ref={rootRef}>
      <span className="field__label" id={`${id}-label`}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </span>
      <button
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-invalid={Boolean(error)}
        aria-labelledby={`${id}-label`}
        className="field__control date-picker__trigger"
        disabled={disabled}
        id={id}
        onClick={() => {
          if (!readOnly) {
            setIsOpen((open) => !open)
          }
        }}
        type="button"
      >
        <span>{formatDateDisplay(value) || 'DD/MM/YYYY'}</span>
        <Calendar aria-hidden="true" size={16} />
      </button>
      {hint ? <span className="field__hint">{hint}</span> : null}
      {error ? <span className="field__error">{error}</span> : null}

      {isOpen ? (
        <div className="date-picker__popover" role="dialog">
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
              const isSelected = isoDate === value
              const isDisabled = isDateDisabled(day, min, max)

              return (
                <button
                  className={`${isMuted ? 'date-picker__day--muted' : ''} ${isSelected ? 'date-picker__day--selected' : ''}`}
                  disabled={isDisabled}
                  key={isoDate}
                  onClick={() => {
                    onChange(isoDate)
                    setIsOpen(false)
                  }}
                  type="button"
                >
                  {day.getDate()}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}
