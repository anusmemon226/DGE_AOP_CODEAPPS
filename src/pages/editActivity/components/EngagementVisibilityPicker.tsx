import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'

export type SectorDivision = {
  sectorId: string
  sectorName: string
  divisions: { divisionId: string; divisionName: string }[]
}

function getIndeterminate(sector: SectorDivision, selected: string[]): boolean {
  const ids = sector.divisions.map((d) => d.divisionId)
  const count = ids.filter((id) => selected.includes(id)).length
  return count > 0 && count < ids.length
}

function isSectorFullySelected(sector: SectorDivision, selected: string[]): boolean {
  return sector.divisions.length > 0 && sector.divisions.every((d) => selected.includes(d.divisionId))
}

function isSectorSelected(sector: SectorDivision, selected: string[]): boolean {
  return selected.includes(sector.sectorId)
}

function getAllDivisionIds(sectorDivisions: SectorDivision[]): string[] {
  return sectorDivisions.flatMap((s) => s.divisions.map((d) => d.divisionId))
}

function getDivisionIdsForSector(sectorDivisions: SectorDivision[], sectorId: string): string[] {
  return sectorDivisions.find((s) => s.sectorId === sectorId)?.divisions.map((d) => d.divisionId) ?? []
}

function getSectorIdForDivision(sectorDivisions: SectorDivision[], divisionId: string): string | undefined {
  return sectorDivisions.find((s) => s.divisions.some((d) => d.divisionId === divisionId))?.sectorId
}

type EngagementVisibilityPickerProps = {
  error?: string
  label: string
  onChange: (value: string[]) => void
  required?: boolean
  sectorDivisions: SectorDivision[]
  value: string[]
}

export function EngagementVisibilityPicker({
  error,
  label,
  onChange,
  required = false,
  sectorDivisions,
  value,
}: EngagementVisibilityPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [expandedSectors, setExpandedSectors] = useState<string[]>([])
  const rootRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number } | null>(null)

  const allDivisionIds = useMemo(() => getAllDivisionIds(sectorDivisions), [sectorDivisions])
  const allSelected = allDivisionIds.length > 0 && allDivisionIds.every((id) => value.includes(id))
  const selectedSectorIds = useMemo(() => new Set(sectorDivisions.map((s) => s.sectorId)), [sectorDivisions])
  const sectorCount = sectorDivisions.filter((s) =>
    value.includes(s.sectorId) || s.divisions.some((d) => value.includes(d.divisionId)),
  ).length
  const divisionCount = value.filter((v) => !selectedSectorIds.has(v)).length

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

  function toggleAll() {
    onChange(allSelected ? [] : [...allDivisionIds])
    setExpandedSectors(allSelected ? [] : sectorDivisions.map((sector) => sector.sectorId))
  }

  function toggleSector(sector: SectorDivision) {
    const divisionIds = sector.divisions.map((d) => d.divisionId)
    const allChecked = divisionIds.every((id) => value.includes(id))

    if (allChecked || value.includes(sector.sectorId)) {
      onChange(value.filter((v) => !divisionIds.includes(v) && v !== sector.sectorId))
      setExpandedSectors((current) => current.filter((sectorId) => sectorId !== sector.sectorId))
      return
    }

    const next = [...value.filter((v) => v !== sector.sectorId)]
    divisionIds.forEach((id) => {
      if (!next.includes(id)) next.push(id)
    })
    if (!next.includes(sector.sectorId)) next.push(sector.sectorId)
    onChange(next)
    setExpandedSectors((current) => current.includes(sector.sectorId) ? current : [...current, sector.sectorId])
  }

  function toggleDivision(divisionId: string) {
    const sectorId = getSectorIdForDivision(sectorDivisions, divisionId)
    const next = value.includes(divisionId)
      ? value.filter((v) => v !== divisionId)
      : [...value, divisionId]

    if (sectorId) {
      const sector = sectorDivisions.find((s) => s.sectorId === sectorId)
      if (sector) {
        const divisionIds = sector.divisions.map((d) => d.divisionId)
        const allDivisionsSelected = divisionIds.every((id) => next.includes(id))
        if (allDivisionsSelected && !next.includes(sectorId)) {
          next.push(sectorId)
        }
        if (!next.includes(divisionId) && next.includes(sectorId)) {
          next.splice(next.indexOf(sectorId), 1)
        }
      }
      setExpandedSectors((current) => current.includes(sectorId) ? current : [...current, sectorId])
    }

    onChange(next)
  }

  function handleToggle() {
    if (isOpen) {
      setIsOpen(false)
      setMenuPos(null)
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

  function renderChips(): ReactNode {
    const groups: ReactNode[] = []

    for (const sector of sectorDivisions) {
      const selectedDivisions = sector.divisions.filter((d) => value.includes(d.divisionId))
      const sectorSelected = value.includes(sector.sectorId)

      if (!sectorSelected && selectedDivisions.length === 0) continue

      const chips: ReactNode[] = []

      chips.push(
        <span
          className="engagement-visibility__chip engagement-visibility__chip--sector"
          key={sector.sectorId}
          onClick={() => {
            const ids = [...getDivisionIdsForSector(sectorDivisions, sector.sectorId), sector.sectorId]
            onChange(value.filter((v) => !ids.includes(v)))
            setExpandedSectors((current) => current.filter((sectorId) => sectorId !== sector.sectorId))
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              const ids = [...getDivisionIdsForSector(sectorDivisions, sector.sectorId), sector.sectorId]
              onChange(value.filter((v) => !ids.includes(v)))
              setExpandedSectors((current) => current.filter((sectorId) => sectorId !== sector.sectorId))
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

  function renderMenu() {
    return (
      <div className="engagement-visibility__menu" ref={menuRef} role="listbox">
        <label className="engagement-visibility__option engagement-visibility__option--select-all">
          <input checked={allSelected} onChange={toggleAll} type="checkbox" />
          <span className="engagement-visibility__check" aria-hidden="true">
            {allSelected ? <Check size={13} /> : null}
          </span>
          <span className="engagement-visibility__label">SELECT ALL SECTORS & DIVISIONS</span>
        </label>

        <div className="engagement-visibility__divider" />

        {sectorDivisions.length === 0 ? (
          <div className="select-menu__empty">No sectors or divisions found.</div>
        ) : null}

        {sectorDivisions.map((sector) => {
          const isIndeterminate = getIndeterminate(sector, value)
          const isFullySelected = isSectorFullySelected(sector, value)
          const isSectorSel = isSectorSelected(sector, value)
          const isExpanded = expandedSectors.includes(sector.sectorId)

          return (
            <div className="engagement-visibility__sector-group" key={sector.sectorId}>
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

              {isExpanded ? sector.divisions.map((div) => (
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
              )) : null}
            </div>
          )
        })}
      </div>
    )
  }

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
                left: menuPos.left,
                maxWidth: Math.min(menuPos.width + 80, window.innerWidth - 16),
                minWidth: menuPos.width,
                position: 'fixed',
                top: menuPos.top,
                width: 'max-content',
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
