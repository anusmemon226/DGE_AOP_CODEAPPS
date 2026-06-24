import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
import {
  getAllDivisionIds,
  getDivisionIdsForSector,
  getSectorIdForDivision,
  SECTOR_DIVISIONS,
  type SectorDivision,
} from '../data/adgesData'

// ── Helpers ──

function getIndeterminate(
  sector: SectorDivision,
  selected: string[],
): boolean {
  const ids = sector.divisions.map((d) => d.divisionId)
  const count = ids.filter((id) => selected.includes(id)).length
  return count > 0 && count < ids.length
}

function isSectorFullySelected(sector: SectorDivision, selected: string[]): boolean {
  return sector.divisions.every((d) => selected.includes(d.divisionId))
}

function isSectorSelected(sector: SectorDivision, selected: string[]): boolean {
  return selected.includes(sector.sectorId)
}

// ── Props ──

type EngagementVisibilityPickerProps = {
  error?: string
  label: string
  onChange: (value: string[]) => void
  required?: boolean
  value: string[]
}

// ── Component ──

export function EngagementVisibilityPicker({
  error,
  label,
  onChange,
  required = false,
  value,
}: EngagementVisibilityPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null)

  // ── Derived ──
  const allDivisionIds = useMemo(() => getAllDivisionIds(), [])
  const allSelected = allDivisionIds.every((id) => value.includes(id))
  const sectorCount = SECTOR_DIVISIONS.filter((s) =>
    s.divisions.some((d) => value.includes(d.divisionId)),
  ).length
  const divisionCount = value.filter((v) => !SECTOR_DIVISIONS.some((s) => s.sectorId === v)).length

  // ── Click-outside / Escape / scroll reposition (same pattern as Select) ──
  useEffect(() => {
    if (!isOpen) {
      setMenuPos(null)
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
      const trigger = rootRef.current?.querySelector('.engagement-visibility__trigger') as HTMLElement | null
      const menu = menuRef.current
      if (!trigger || !menu) return

      const rect = trigger.getBoundingClientRect()
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

  // ── Toggle handlers ──

  function toggleAll() {
    onChange(allSelected ? [] : [...allDivisionIds])
  }

  function toggleSector(sector: SectorDivision) {
    const divisionIds = sector.divisions.map((d) => d.divisionId)
    const allChecked = divisionIds.every((id) => value.includes(id))

    if (allChecked) {
      onChange(value.filter((v) => !divisionIds.includes(v) && v !== sector.sectorId))
    } else {
      const next = [...value.filter((v) => v !== sector.sectorId)]
      divisionIds.forEach((id) => {
        if (!next.includes(id)) next.push(id)
      })
      onChange(next)
    }
  }

  function toggleDivision(divisionId: string) {
    const sectorId = getSectorIdForDivision(divisionId)
    const next = value.includes(divisionId)
      ? value.filter((v) => v !== divisionId)
      : [...value, divisionId]

    // If all divisions in the sector are now selected, auto-select the sector too
    if (sectorId) {
      const sector = SECTOR_DIVISIONS.find((s) => s.sectorId === sectorId)
      if (sector) {
        const divisionIds = sector.divisions.map((d) => d.divisionId)
        const allDivisionsSelected = divisionIds.every((id) => next.includes(id))
        if (allDivisionsSelected && !next.includes(sectorId)) {
          next.push(sectorId)
        }
        // If a division was deselected, remove the sector if it was selected
        if (!next.includes(divisionId) && next.includes(sectorId)) {
          const idx = next.indexOf(sectorId)
          next.splice(idx, 1)
        }
      }
    }

    onChange(next)
  }

  function handleToggle() {
    if (isOpen) {
      setIsOpen(false)
      return
    }

    const trigger = rootRef.current?.querySelector('.engagement-visibility__trigger') as HTMLElement | null
    if (trigger) {
      const rect = trigger.getBoundingClientRect()
      const estHeight = 320
      const spaceBelow = window.innerHeight - rect.bottom - 8
      const spaceAbove = rect.top - 8
      const openUp = estHeight > spaceBelow && spaceAbove > spaceBelow
      setMenuPos({
        top: openUp ? Math.max(8, rect.top - estHeight - 4) : rect.bottom + 4,
        left: rect.left,
        width: rect.width,
      })
    }
    setIsOpen(true)
  }

  // ── Render chips ──

  function renderChips(): ReactNode {
    const groups: ReactNode[] = []

    for (const sector of SECTOR_DIVISIONS) {
      const selectedDivisions = sector.divisions.filter((d) => value.includes(d.divisionId))
      const sectorSelected = value.includes(sector.sectorId)

      if (!sectorSelected && selectedDivisions.length === 0) continue

      const chips: ReactNode[] = []

      // Sector chip (blue)
      chips.push(
        <span
          className="engagement-visibility__chip engagement-visibility__chip--sector"
          key={sector.sectorId}
          onClick={() => {
            const ids = [...getDivisionIdsForSector(sector.sectorId), sector.sectorId]
            onChange(value.filter((v) => !ids.includes(v)))
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              const ids = [...getDivisionIdsForSector(sector.sectorId), sector.sectorId]
              onChange(value.filter((v) => !ids.includes(v)))
            }
          }}
          role="button"
          tabIndex={0}
        >
          {sector.sectorName}
          <span className="engagement-visibility__chip-remove" aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </span>
        </span>,
      )

      // Individual division chips (purple)
      for (const div of selectedDivisions) {
        chips.push(
          <span
            className="engagement-visibility__chip engagement-visibility__chip--division"
            key={div.divisionId}
            onClick={() => toggleDivision(div.divisionId)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                toggleDivision(div.divisionId)
              }
            }}
            role="button"
            tabIndex={0}
          >
            {div.divisionName}
            <span className="engagement-visibility__chip-remove" aria-hidden="true">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </span>
          </span>,
        )
      }

      groups.push(
        <div className="engagement-visibility__chip-group" key={sector.sectorId}>
          {chips}
        </div>,
      )
    }

    return groups.length > 0 ? (
      <div className="engagement-visibility__chips">{groups}</div>
    ) : null
  }

  // ── Render menu content ──

  function renderMenu() {
    return (
      <div className="engagement-visibility__menu" ref={menuRef} role="listbox">
        {/* Select All */}
        <label className="engagement-visibility__option engagement-visibility__option--select-all">
          <input
            checked={allSelected}
            onChange={toggleAll}
            type="checkbox"
          />
          <span className="engagement-visibility__check" aria-hidden="true">
            {allSelected ? <Check size={13} /> : null}
          </span>
          <span className="engagement-visibility__label">SELECT ALL SECTORS & DIVISIONS</span>
        </label>

        <div className="engagement-visibility__divider" />

        {/* Sectors */}
        {SECTOR_DIVISIONS.map((sector) => {
          const isIndeterminate = getIndeterminate(sector, value)
          const isFullySelected = isSectorFullySelected(sector, value)
          const isSectorSel = isSectorSelected(sector, value)

          return (
            <div className="engagement-visibility__sector-group" key={sector.sectorId}>
              {/* Sector row */}
              <label className="engagement-visibility__option engagement-visibility__option--sector">
                <input
                  checked={isFullySelected || isSectorSel}
                  onChange={() => toggleSector(sector)}
                  ref={(el) => {
                    if (el) el.indeterminate = isIndeterminate && !isFullySelected && !isSectorSel
                  }}
                  type="checkbox"
                />
                <span className="engagement-visibility__check" aria-hidden="true">
                  {isFullySelected || isSectorSel ? <Check size={13} /> : null}
                </span>
                <span className="engagement-visibility__label">{sector.sectorName}</span>
              </label>

              {/* Divisions */}
              {sector.divisions.map((div) => (
                <label className="engagement-visibility__option engagement-visibility__option--division" key={div.divisionId}>
                  <input
                    checked={value.includes(div.divisionId)}
                    onChange={() => toggleDivision(div.divisionId)}
                    type="checkbox"
                  />
                  <span className="engagement-visibility__check" aria-hidden="true">
                    {value.includes(div.divisionId) ? <Check size={13} /> : null}
                  </span>
                  <span className="engagement-visibility__label">{div.divisionName}</span>
                </label>
              ))}
            </div>
          )
        })}
      </div>
    )
  }

  // ── Render ──

  return (
    <div className={`field engagement-visibility ${error ? 'engagement-visibility--invalid' : ''}`.trim()} ref={rootRef}>
      <span className="field__label">
        {label}
        {required ? <span aria-hidden="true" className="field__required"> *</span> : null}
      </span>

      <button
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-invalid={Boolean(error)}
        className="field__control engagement-visibility__trigger"
        onClick={handleToggle}
        type="button"
      >
        <span className="engagement-visibility__trigger-text">
          {sectorCount > 0 || divisionCount > 0
            ? `${sectorCount} Sector${sectorCount !== 1 ? 's' : ''}, ${divisionCount} Division${divisionCount !== 1 ? 's' : ''}`
            : 'Select sectors & divisions...'}
        </span>
        <ChevronDown aria-hidden="true" className={isOpen ? 'select-field__chevron--open' : ''} size={15} />
      </button>

      {sectorCount > 0 || divisionCount > 0 ? renderChips() : null}

      {error ? <span className="field__error">{error}</span> : null}

      {isOpen && menuPos
        ? createPortal(
            <div
              className="engagement-visibility__popover"
              role="dialog"
              style={{
                position: 'fixed',
                top: menuPos.top,
                left: menuPos.left,
                minWidth: menuPos.width,
                width: 'max-content',
                maxWidth: Math.min(menuPos.width + 80, window.innerWidth - 16),
                zIndex: 99999,
              }}
            >
              {renderMenu()}
            </div>,
            document.body,
          )
        : null}
    </div>
  )
}

// ── Exports for label lookup ──
export { getVisibilityLabel } from '../data/adgesData'
