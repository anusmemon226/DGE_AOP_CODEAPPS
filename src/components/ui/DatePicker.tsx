import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { formatDateDisplay } from '../../utils/formatting'
import './ui.css'

type DatePickerView = 'day' | 'month' | 'year'

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

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const

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

function doesMonthHaveSelectableDate(year: number, month: number, min?: string, max?: string) {
  const firstDay = toIsoDate(new Date(year, month, 1))
  const lastDay = toIsoDate(new Date(year, month + 1, 0))
  const normalizedMin = normalizeDateValue(min)
  const normalizedMax = normalizeDateValue(max)

  return !((normalizedMin && lastDay < normalizedMin) || (normalizedMax && firstDay > normalizedMax))
}

function doesYearHaveSelectableDate(year: number, min?: string, max?: string) {
  const firstDay = `${year}-01-01`
  const lastDay = `${year}-12-31`
  const normalizedMin = normalizeDateValue(min)
  const normalizedMax = normalizeDateValue(max)

  return !((normalizedMin && lastDay < normalizedMin) || (normalizedMax && firstDay > normalizedMax))
}

function getYearRangeStart(year: number) {
  return Math.floor(year / 12) * 12
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
  const [pickerView, setPickerView] = useState<DatePickerView>('day')
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

    setPickerView('day')

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

  function handlePreviousView() {
    if (pickerView === 'day') {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
      return
    }

    if (pickerView === 'month') {
      setViewDate(new Date(viewDate.getFullYear() - 1, viewDate.getMonth(), 1))
      return
    }

    setViewDate(new Date(viewDate.getFullYear() - 12, viewDate.getMonth(), 1))
  }

  function handleNextView() {
    if (pickerView === 'day') {
      setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
      return
    }

    if (pickerView === 'month') {
      setViewDate(new Date(viewDate.getFullYear() + 1, viewDate.getMonth(), 1))
      return
    }

    setViewDate(new Date(viewDate.getFullYear() + 12, viewDate.getMonth(), 1))
  }

  function handleSelectToday() {
    const today = new Date()

    if (isDateDisabled(today, min, max)) return

    const isoDate = toIsoDate(today)
    setSelectedValue(isoDate)
    setViewDate(today)
    onChange(isoDate)
    handleClose()
  }

  function handleClear() {
    setSelectedValue('')
    onChange('')
    handleClose()
  }

  const yearRangeStart = getYearRangeStart(viewDate.getFullYear())
  const yearRange = Array.from({ length: 12 }, (_, index) => yearRangeStart + index)

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
              onClick={(event) => event.stopPropagation()}
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
                  aria-label={pickerView === 'year' ? 'Previous years' : pickerView === 'month' ? 'Previous year' : 'Previous month'}
                  onClick={handlePreviousView}
                  type="button"
                >
                  <ChevronLeft size={16} />
                </button>
                <div className="date-picker__header-title">
                  {pickerView === 'day' ? (
                    <>
                      <button
                        className="date-picker__header-select"
                        onClick={() => setPickerView('month')}
                        type="button"
                      >
                        {MONTH_NAMES[viewDate.getMonth()]}
                      </button>
                      <button
                        className="date-picker__header-select"
                        onClick={() => setPickerView('year')}
                        type="button"
                      >
                        {viewDate.getFullYear()}
                      </button>
                    </>
                  ) : pickerView === 'month' ? (
                    <button
                      className="date-picker__header-select"
                      onClick={() => setPickerView('year')}
                      type="button"
                    >
                      {viewDate.getFullYear()}
                    </button>
                  ) : (
                    <strong>{yearRangeStart} - {yearRangeStart + 11}</strong>
                  )}
                </div>
                <button
                  aria-label={pickerView === 'year' ? 'Next years' : pickerView === 'month' ? 'Next year' : 'Next month'}
                  onClick={handleNextView}
                  type="button"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {pickerView === 'day' ? (
                <>
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
                </>
              ) : pickerView === 'month' ? (
                <div className="date-picker__month-grid">
                  {MONTH_NAMES.map((monthName, monthIndex) => {
                    const isSelected = viewDate.getMonth() === monthIndex
                    const isDisabled = !doesMonthHaveSelectableDate(viewDate.getFullYear(), monthIndex, min, max)

                    return (
                      <button
                        className={isSelected ? 'date-picker__period--selected' : ''}
                        disabled={isDisabled}
                        key={monthName}
                        onClick={() => {
                          setViewDate(new Date(viewDate.getFullYear(), monthIndex, 1))
                          setPickerView('day')
                        }}
                        type="button"
                      >
                        {monthName.slice(0, 3)}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="date-picker__year-grid">
                  {yearRange.map((year) => {
                    const isSelected = viewDate.getFullYear() === year
                    const isDisabled = !doesYearHaveSelectableDate(year, min, max)

                    return (
                    <button
                      className={isSelected ? 'date-picker__period--selected' : ''}
                      disabled={isDisabled}
                      key={year}
                      onClick={() => {
                        setViewDate(new Date(year, viewDate.getMonth(), 1))
                        setPickerView('month')
                      }}
                      type="button"
                    >
                      {year}
                    </button>
                    )
                  })}
                </div>
              )}

              <div className="date-picker__quick-actions">
                <button disabled={isDateDisabled(new Date(), min, max)} onClick={handleSelectToday} type="button">
                  Today
                </button>
                <button onClick={handleClear} type="button">
                  Clear
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}
