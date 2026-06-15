import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Filter,
  GitBranch,
  LayoutList,
  Rows,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { Button, ConfirmationDialog, DatePicker, Input, Modal, RadioGroup, Select, Textarea } from '../../components/ui'
import type { SelectOption } from '../../components/ui'

// ── Types ──

type ApplicableValue = '576610000' | '576610001'

type Dependency = {
  applicable: ApplicableValue
  dateOfSupport: string
  entityName: string
  id: string
  typeOfSupport: string
}

type DepColumnKey = 'entityName' | 'dateOfSupport' | 'typeOfSupport' | 'applicable'
type FilterOperator = 'equals' | 'contains' | 'gt' | 'lt'
type ColumnFilter = { operator: FilterOperator; value: string }
type SortConfig = { column: DepColumnKey; direction: 'asc' | 'desc' } | null

// ── Constants ──

const TEXT_OPERATORS: FilterOperator[] = ['equals', 'contains']
const DATE_OPERATORS: FilterOperator[] = ['equals', 'gt', 'lt']
const OPERATOR_LABELS: Record<FilterOperator, string> = {
  equals: 'Equals',
  contains: 'Contains',
  gt: 'Greater than',
  lt: 'Less than',
}

const APPLICABLE_OPTIONS: SelectOption<string>[] = [
  { label: 'Discussed', value: '576610000', className: 'choice--discussed' },
  { label: 'Agreed', value: '576610001', className: 'choice--agreed' },
]

function getApplicableLabel(value: ApplicableValue): string {
  return value === '576610000' ? 'Discussed' : 'Agreed'
}

const INITIAL_DEPENDENCIES: Dependency[] = [
  { id: 'dep-01', entityName: 'Abu Dhabi Digital Authority (ADDA)', dateOfSupport: '2026-03-15', typeOfSupport: 'Data sharing agreement for citizen analytics platform.', applicable: '576610001' },
  { id: 'dep-02', entityName: 'Department of Finance (DOF)', dateOfSupport: '2026-03-20', typeOfSupport: 'Budget allocation confirmation for Q2 infrastructure projects.', applicable: '576610001' },
  { id: 'dep-03', entityName: 'Abu Dhabi Police GHQ', dateOfSupport: '2026-03-25', typeOfSupport: 'Security clearance and access protocols for data centre.', applicable: '576610000' },
  { id: 'dep-04', entityName: 'Abu Dhabi Municipality', dateOfSupport: '2026-04-01', typeOfSupport: 'Site permit and zoning approval for new server facility.', applicable: '576610000' },
  { id: 'dep-05', entityName: 'Department of Energy', dateOfSupport: '2026-04-05', typeOfSupport: 'Power supply and cooling infrastructure coordination.', applicable: '576610001' },
  { id: 'dep-06', entityName: 'Abu Dhabi Digital Authority', dateOfSupport: '2026-04-10', typeOfSupport: 'Cybersecurity audit and compliance framework.', applicable: '576610001' },
  { id: 'dep-07', entityName: 'Telecommunications Regulatory Authority', dateOfSupport: '2026-04-15', typeOfSupport: 'Spectrum and connectivity approvals for IoT rollout.', applicable: '576610000' },
  { id: 'dep-08', entityName: 'Abu Dhabi Housing Authority', dateOfSupport: '2026-04-20', typeOfSupport: 'Data integration for smart housing initiative.', applicable: '576610001' },
  { id: 'dep-09', entityName: 'Department of Transport', dateOfSupport: '2026-05-01', typeOfSupport: 'Mobility data integration for city dashboards.', applicable: '576610000' },
  { id: 'dep-10', entityName: 'Abu Dhabi Health Authority (DOH)', dateOfSupport: '2026-05-05', typeOfSupport: 'Health data exchange standards and API access.', applicable: '576610001' },
  { id: 'dep-11', entityName: 'Department of Culture and Tourism', dateOfSupport: '2026-05-10', typeOfSupport: 'Cultural heritage digitisation partnership.', applicable: '576610000' },
  { id: 'dep-12', entityName: 'Abu Dhabi Education Council', dateOfSupport: '2026-05-15', typeOfSupport: 'Student data integration for educational analytics.', applicable: '576610001' },
  { id: 'dep-13', entityName: 'Abu Dhabi Agriculture Authority', dateOfSupport: '2026-05-20', typeOfSupport: 'Food security data sharing agreement.', applicable: '576610000' },
  { id: 'dep-14', entityName: 'Federal Authority for Identity and Citizenship', dateOfSupport: '2026-05-25', typeOfSupport: 'Population register API integration for e-services.', applicable: '576610001' },
  { id: 'dep-15', entityName: 'Abu Dhabi Media Office', dateOfSupport: '2026-06-01', typeOfSupport: 'Communication and media campaign coordination.', applicable: '576610000' },
  { id: 'dep-16', entityName: 'Abu Dhabi Investment Office', dateOfSupport: '2026-06-05', typeOfSupport: 'Investment reporting dashboard data integration.', applicable: '576610001' },
  { id: 'dep-17', entityName: 'General Secretariat of the Executive Council', dateOfSupport: '2026-06-08', typeOfSupport: 'Strategic initiative progress reporting integration.', applicable: '576610001' },
  { id: 'dep-18', entityName: 'Department of Economic Development', dateOfSupport: '2026-06-10', typeOfSupport: 'Economic indicator data pipeline for business dashboards.', applicable: '576610000' },
  { id: 'dep-19', entityName: 'Abu Dhabi Civil Defence Authority', dateOfSupport: '2026-06-12', typeOfSupport: 'Emergency response system interoperability.', applicable: '576610001' },
  { id: 'dep-20', entityName: 'Statistics Centre Abu Dhabi', dateOfSupport: '2026-06-14', typeOfSupport: 'Statistical data exchange standards and governance.', applicable: '576610000' },
]

const DEP_ITEMS_PER_PAGE = 5
const DEP_LAZY_BATCH = 12

// ── Component ──

export function DependenciesTab() {
  // ── Data state ──
  const [dependencies, setDependencies] = useState<Dependency[]>(INITIAL_DEPENDENCIES)
  const [depSearch, setDepSearch] = useState('')
  const [depViewMode, setDepViewMode] = useState<'pagination' | 'lazy'>('pagination')
  const [depCurrentPage, setDepCurrentPage] = useState(1)
  const [depLazyCount, setDepLazyCount] = useState(12)
  const depSentinelRef = useRef<HTMLDivElement>(null)

  // ── CRUD state ──
  const [isDepModalOpen, setIsDepModalOpen] = useState(false)
  const [editingDep, setEditingDep] = useState<Dependency | null>(null)
  const [depForm, setDepForm] = useState<Omit<Dependency, 'id'>>({ entityName: '', dateOfSupport: '', typeOfSupport: '', applicable: '' as ApplicableValue })
  const emptyDepForm = { entityName: '', dateOfSupport: '', typeOfSupport: '', applicable: '' as ApplicableValue }
  const [depFormErrors, setDepFormErrors] = useState<Partial<Record<keyof Omit<Dependency, 'id'>, string>>>({})
  const [selectedDepIds, setSelectedDepIds] = useState<Set<string>>(new Set())
  const [depToDelete, setDepToDelete] = useState<Dependency | null>(null)
  const [isBulkDeleteConfirm, setIsBulkDeleteConfirm] = useState(false)

  // ── Column filter / sort state ──
  const [depFilters, setDepFilters] = useState<Partial<Record<DepColumnKey, ColumnFilter>>>({})
  const [depSort, setDepSort] = useState<SortConfig>(null)
  const [openFilterColumn, setOpenFilterColumn] = useState<DepColumnKey | null>(null)
  const [filterPopoverPos, setFilterPopoverPos] = useState({ top: 0, left: 0 })
  const filterPopoverRef = useRef<HTMLDivElement>(null)
  const depsTableWrapRef = useRef<HTMLDivElement>(null)

  // Local editing state for filter popover
  const [editFilterOp, setEditFilterOp] = useState<FilterOperator>('contains')
  const [editFilterVal, setEditFilterVal] = useState('')
  const [editApplicableVal, setEditApplicableVal] = useState('')

  // ── Derived data ──

  const filteredDeps = useMemo(() => {
    if (!depSearch.trim()) return dependencies
    const q = depSearch.toLowerCase()
    return dependencies.filter((d) => d.entityName.toLowerCase().includes(q) || d.typeOfSupport.toLowerCase().includes(q))
  }, [dependencies, depSearch])

  const columnFilteredDeps = useMemo(() => {
    const activeFilters = Object.entries(depFilters).filter(([, f]) => f.value !== '')
    if (activeFilters.length === 0) return filteredDeps

    return filteredDeps.filter((dep) =>
      activeFilters.every(([column, filter]) => {
        const depValue = String(dep[column as DepColumnKey] ?? '')
        switch (filter.operator) {
          case 'equals': return depValue === filter.value
          case 'contains': return depValue.toLowerCase().includes(filter.value.toLowerCase())
          case 'gt': return depValue > filter.value
          case 'lt': return depValue < filter.value
          default: return true
        }
      }),
    )
  }, [filteredDeps, depFilters])

  const sortedDeps = useMemo(() => {
    if (!depSort) return columnFilteredDeps
    const { column, direction } = depSort
    const mult = direction === 'asc' ? 1 : -1
    return [...columnFilteredDeps].sort((a, b) => {
      const aVal = String(a[column] ?? '')
      const bVal = String(b[column] ?? '')
      if (aVal < bVal) return -1 * mult
      if (aVal > bVal) return 1 * mult
      return 0
    })
  }, [columnFilteredDeps, depSort])

  const displayDeps = sortedDeps
  const totalFilteredCount = columnFilteredDeps.length

  // Lazy sentinel observer
  useEffect(() => {
    if (depViewMode !== 'lazy') return undefined
    const sentinel = depSentinelRef.current
    if (!sentinel) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setDepLazyCount((prev) => {
            const next = prev + DEP_LAZY_BATCH
            return next >= totalFilteredCount ? totalFilteredCount : next
          })
        }
      },
      { rootMargin: '100px' },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [depViewMode, totalFilteredCount])

  const depTotalPages = Math.max(1, Math.ceil(totalFilteredCount / DEP_ITEMS_PER_PAGE))

  const visibleDeps = useMemo(() => {
    if (depViewMode === 'pagination') {
      return displayDeps.slice((depCurrentPage - 1) * DEP_ITEMS_PER_PAGE, depCurrentPage * DEP_ITEMS_PER_PAGE)
    }
    return displayDeps.slice(0, depLazyCount)
  }, [displayDeps, depViewMode, depCurrentPage, depLazyCount])

  useEffect(() => {
    setDepCurrentPage(1)
    setDepLazyCount(12)
  }, [depSearch, dependencies.length, depFilters])

  // ── Filter/sort handlers ──

  const activeFilterCount = Object.values(depFilters).filter((f) => f.value !== '').length
  const hasActiveFilters = activeFilterCount > 0

  function handleSort(column: DepColumnKey) {
    setDepSort((prev) => {
      if (!prev || prev.column !== column) return { column, direction: 'asc' }
      if (prev.direction === 'asc') return { column, direction: 'desc' }
      return null
    })
  }

  function getSortIcon(column: DepColumnKey) {
    if (!depSort || depSort.column !== column) {
      return <ArrowUp size={12} className="edit-activity__deps-sort-icon edit-activity__deps-sort-icon--inactive" />
    }
    if (depSort.direction === 'asc') return <ArrowUp size={12} className="edit-activity__deps-sort-icon edit-activity__deps-sort-icon--active" />
    return <ArrowDown size={12} className="edit-activity__deps-sort-icon edit-activity__deps-sort-icon--active" />
  }

  function handleOpenFilter(column: DepColumnKey, e: React.MouseEvent) {
    e.stopPropagation()
    if (openFilterColumn === column) {
      setOpenFilterColumn(null)
      return
    }
    if (depsTableWrapRef.current) {
      const headerRow = depsTableWrapRef.current.querySelector('.edit-activity__deps-table-row--header') as HTMLElement
      const cellEl = (e.currentTarget as HTMLElement).closest('.edit-activity__deps-table-cell') as HTMLElement
      if (headerRow) {
        const headerRect = headerRow.getBoundingClientRect()
        const wrapRect = depsTableWrapRef.current.getBoundingClientRect()
        const cellRect = cellEl?.getBoundingClientRect()
        setFilterPopoverPos({
          top: headerRect.bottom - wrapRect.top,
          left: Math.max(0, (cellRect?.left ?? cellEl?.getBoundingClientRect().left ?? 0) - wrapRect.left),
        })
      }
    }
    const current = depFilters[column]
    if (column === 'applicable') {
      setEditApplicableVal(current?.value ?? '')
    } else {
      setEditFilterOp(current?.operator ?? (column === 'dateOfSupport' ? 'equals' : 'contains'))
      setEditFilterVal(current?.value ?? '')
    }
    setOpenFilterColumn(column)
  }

  function handleClearAllFilters() {
    setDepFilters({})
    setOpenFilterColumn(null)
  }

  function handleApplyFilter() {
    if (!openFilterColumn) return
    if (openFilterColumn === 'applicable') {
      if (editApplicableVal) {
        setDepFilters((prev) => ({ ...prev, applicable: { operator: 'equals', value: editApplicableVal } }))
      } else {
        setDepFilters((prev) => { const n = { ...prev }; delete n.applicable; return n })
      }
    } else if (editFilterVal) {
      setDepFilters((prev) => ({ ...prev, [openFilterColumn]: { operator: editFilterOp, value: editFilterVal } }))
    } else {
      setDepFilters((prev) => { const n = { ...prev }; delete n[openFilterColumn]; return n })
    }
    setOpenFilterColumn(null)
  }

  function handleCancelFilter() {
    setOpenFilterColumn(null)
  }

  function getOperatorsForColumn(column: DepColumnKey): FilterOperator[] {
    if (column === 'dateOfSupport') return DATE_OPERATORS
    return TEXT_OPERATORS
  }

  // Close filter popover on click outside
  useEffect(() => {
    if (!openFilterColumn) return undefined
    const popover = filterPopoverRef.current
    if (!popover) return undefined

    const raf = requestAnimationFrame(() => {
      const el = popover!
      function handleClick(e: MouseEvent) {
        if (!el.contains(e.target as Node)) {
          setOpenFilterColumn(null)
        }
      }
      document.addEventListener('mousedown', handleClick)
      ;(el as any).__clickHandler = handleClick
    })

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenFilterColumn(null)
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', handleKeyDown)
      if (popover && (popover as any).__clickHandler) {
        document.removeEventListener('mousedown', (popover as any).__clickHandler)
      }
    }
  }, [openFilterColumn])

  // ── CRUD handlers ──

  function handleOpenDepModal(dep?: Dependency) {
    if (dep) {
      setEditingDep(dep)
      setDepForm({ entityName: dep.entityName, dateOfSupport: dep.dateOfSupport, typeOfSupport: dep.typeOfSupport, applicable: dep.applicable })
    } else {
      setEditingDep(null)
      setDepForm(emptyDepForm)
    }
    setDepFormErrors({})
    setIsDepModalOpen(true)
  }

  function handleCloseDepModal() {
    setIsDepModalOpen(false)
    setEditingDep(null)
    setDepForm(emptyDepForm)
    setDepFormErrors({})
  }

  function handleDepFormChange(field: keyof Omit<Dependency, 'id'>, value: string) {
    setDepForm((prev) => ({ ...prev, [field]: value }))
    if (depFormErrors[field]) {
      setDepFormErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  function validateDepForm(): boolean {
    const errors: Partial<Record<keyof Omit<Dependency, 'id'>, string>> = {}
    if (!depForm.entityName.trim()) errors.entityName = 'Enter the external entity name.'
    if (!depForm.dateOfSupport) errors.dateOfSupport = 'Select the date of support.'
    if (!depForm.typeOfSupport.trim()) errors.typeOfSupport = 'Enter the type of support.'
    if (!depForm.applicable) errors.applicable = 'Select Discussed or Agreed.'
    setDepFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  function handleSaveDep() {
    if (!validateDepForm()) return
    if (editingDep) {
      setDependencies((prev) => prev.map((d) => d.id === editingDep.id ? { ...d, ...depForm } : d))
    } else {
      const newId = `dep-${String(dependencies.length + 1).padStart(2, '0')}-${Date.now()}`
      setDependencies((prev) => [...prev, { id: newId, ...depForm }])
    }
    handleCloseDepModal()
  }

  function handleConfirmDeleteDep() {
    if (!depToDelete) return
    setDependencies((prev) => prev.filter((d) => d.id !== depToDelete.id))
    setSelectedDepIds((prev) => { const next = new Set(prev); next.delete(depToDelete.id); return next })
    setDepToDelete(null)
  }

  function handleBulkDelete() {
    setDependencies((prev) => prev.filter((d) => !selectedDepIds.has(d.id)))
    setSelectedDepIds(new Set())
    setIsBulkDeleteConfirm(false)
  }

  function handleToggleDepSelection(id: string) {
    setSelectedDepIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  function handleToggleAllDepSelection() {
    if (selectedDepIds.size === visibleDeps.length) {
      setSelectedDepIds(new Set())
    } else {
      setSelectedDepIds(new Set(visibleDeps.map((d) => d.id)))
    }
  }

  // ── Render helpers ──

  const depCount = dependencies.length
  const filteredCount = totalFilteredCount
  const hasFilter = depSearch.trim().length > 0
  const selectedCount = selectedDepIds.size
  const showPagination = depViewMode === 'pagination' && filteredCount > DEP_ITEMS_PER_PAGE
  const showLoadMore = depViewMode === 'lazy' && depLazyCount < filteredCount
  const rangeStart = filteredCount > 0 ? (depCurrentPage - 1) * DEP_ITEMS_PER_PAGE + 1 : 0
  const rangeEnd = Math.min(depCurrentPage * DEP_ITEMS_PER_PAGE, filteredCount)

  return (
    <div className="edit-activity__dependencies">
      {/* Header */}
      <div className="edit-activity__dependencies-header">
        <div className="edit-activity__members-header-text">
          <h2>
            Dependencies
            <span className="edit-activity__members-count-badge">
              {depCount} dependenc{depCount !== 1 ? 'ies' : 'y'}
            </span>
          </h2>
          <p>Manage external dependencies for this activity.</p>
        </div>
        <div className="edit-activity__dependencies-header-actions">
          {selectedCount > 0 ? (
            <Button
              icon={<Trash2 size={16} />}
              onClick={() => setIsBulkDeleteConfirm(true)}
              variant="secondary"
              className="button--danger"
            >
              Delete ({selectedCount})
            </Button>
          ) : null}
          <Button icon={<GitBranch size={16} />} onClick={() => handleOpenDepModal()}>
            Create Dependency
          </Button>
        </div>
      </div>

      {/* Toolbar */}
      {depCount > 0 ? (
        <div className="edit-activity__members-toolbar">
          <div className="edit-activity__members-search">
            <Search size={15} />
            <input
              className="edit-activity__members-search-input"
              onChange={(e) => setDepSearch(e.target.value)}
              placeholder="Search by entity name or support type..."
              type="text"
              value={depSearch}
            />
            {depSearch ? (
              <button className="edit-activity__members-search-clear" onClick={() => setDepSearch('')} type="button">
                <X size={14} />
              </button>
            ) : null}
          </div>
          {hasActiveFilters ? (
            <button className="edit-activity__deps-clear-all-btn" onClick={handleClearAllFilters} type="button">
              <X size={13} />
              Clear All ({activeFilterCount})
            </button>
          ) : null}
          <div className="edit-activity__members-view-toggle" role="group" aria-label="View mode">
            <button
              className={`edit-activity__members-view-btn${depViewMode === 'pagination' ? ' edit-activity__members-view-btn--active' : ''}`}
              onClick={() => { setDepViewMode('pagination'); setDepCurrentPage(1) }}
              title="Paginated view"
              type="button"
            >
              <LayoutList size={14} />
              <span>Pages</span>
            </button>
            <button
              className={`edit-activity__members-view-btn${depViewMode === 'lazy' ? ' edit-activity__members-view-btn--active' : ''}`}
              onClick={() => { setDepViewMode('lazy'); setDepLazyCount(12) }}
              title="Scroll-to-load view"
              type="button"
            >
              <Rows size={14} />
              <span>Scroll</span>
            </button>
          </div>
        </div>
      ) : null}

      {/* Table */}
      {filteredCount === 0 ? (
        <div className="edit-activity__members-empty">
          {hasFilter ? (
            <>
              <Search size={36} strokeWidth={1.2} />
              <h3>No dependencies match your search</h3>
              <p>Try a different name or keyword.</p>
            </>
          ) : (
            <>
              <GitBranch size={40} strokeWidth={1.2} />
              <h3>No dependencies added yet</h3>
              <p>Click <strong>Create Dependency</strong> to add an external dependency.</p>
            </>
          )}
        </div>
      ) : (
        <div ref={depsTableWrapRef} className="edit-activity__deps-table-container">
          <div className="edit-activity__deps-table">
            {/* Table header */}
            <div className="edit-activity__deps-table-row edit-activity__deps-table-row--header">
              <div className="edit-activity__deps-table-cell edit-activity__deps-table-cell--check">
                <label className="edit-activity__deps-check-label">
                  <input
                    checked={selectedDepIds.size === visibleDeps.length && visibleDeps.length > 0}
                    className="edit-activity__deps-check-input"
                    onChange={handleToggleAllDepSelection}
                    type="checkbox"
                  />
                  <span className="edit-activity__deps-check-visual">
                    {selectedDepIds.size === visibleDeps.length && visibleDeps.length > 0 ? <Check size={11} strokeWidth={3} /> : null}
                  </span>
                </label>
              </div>
              {([
                { key: 'entityName', label: 'External Entity Name' },
                { key: 'dateOfSupport', label: 'Date of Support' },
                { key: 'typeOfSupport', label: 'Type of Support' },
                { key: 'applicable', label: 'Applicable' },
              ] as { key: DepColumnKey; label: string }[]).map(({ key, label }) => {
                const hasFilter = depFilters[key]?.value
                return (
                  <div className="edit-activity__deps-table-cell" key={key}>
                    <div className="edit-activity__deps-header-content">
                      <button
                        className="edit-activity__deps-header-label"
                        onClick={() => handleSort(key)}
                        type="button"
                      >
                        {label}
                        {getSortIcon(key)}
                      </button>
                      <button
                        className={`edit-activity__deps-filter-btn${hasFilter ? ' edit-activity__deps-filter-btn--active' : ''}`}
                        onClick={(e) => handleOpenFilter(key, e)}
                        type="button"
                      >
                        <Filter size={11} />
                      </button>
                    </div>
                  </div>
                )
              })}
              <div className="edit-activity__deps-table-cell edit-activity__deps-table-cell--actions">Actions</div>
            </div>

            {/* Table rows */}
            {visibleDeps.map((dep) => {
              const isSelected = selectedDepIds.has(dep.id)
              const applicableLabel = getApplicableLabel(dep.applicable)
              return (
                <div
                  key={dep.id}
                  className={`edit-activity__deps-table-row ${isSelected ? 'edit-activity__deps-table-row--selected' : ''}`}
                >
                  <div className="edit-activity__deps-table-cell edit-activity__deps-table-cell--check">
                    <label className="edit-activity__deps-check-label">
                      <input
                        checked={isSelected}
                        className="edit-activity__deps-check-input"
                        onChange={() => handleToggleDepSelection(dep.id)}
                        type="checkbox"
                      />
                      <span className={`edit-activity__deps-check-visual ${isSelected ? 'edit-activity__deps-check-visual--checked' : ''}`}>
                        {isSelected ? <Check size={11} strokeWidth={3} /> : null}
                      </span>
                    </label>
                  </div>
                  <button
                    className="edit-activity__deps-table-cell edit-activity__deps-table-cell--entity"
                    onClick={() => handleOpenDepModal(dep)}
                    title={`Edit dependency: ${dep.entityName}`}
                    type="button"
                  >
                    {dep.entityName}
                  </button>
                  <div className="edit-activity__deps-table-cell edit-activity__deps-table-cell--date">
                    {dep.dateOfSupport || '—'}
                  </div>
                  <div className="edit-activity__deps-table-cell edit-activity__deps-table-cell--type" title={dep.typeOfSupport}>
                    {dep.typeOfSupport}
                  </div>
                  <div className="edit-activity__deps-table-cell edit-activity__deps-table-cell--applicable">
                    <span className={`edit-activity__deps-badge ${dep.applicable === '576610001' ? 'edit-activity__deps-badge--agreed' : 'edit-activity__deps-badge--discussed'}`}>
                      {applicableLabel}
                    </span>
                  </div>
                  <div className="edit-activity__deps-table-cell edit-activity__deps-table-cell--actions">
                    <button
                      className="edit-activity__deps-action-btn"
                      onClick={() => handleOpenDepModal(dep)}
                      title="Edit dependency"
                      type="button"
                    >
                      <Edit3 size={14} />
                    </button>
                    <button
                      className="edit-activity__deps-action-btn edit-activity__deps-action-btn--delete"
                      onClick={() => setDepToDelete(dep)}
                      title="Delete dependency"
                      type="button"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Filter popover */}
          {openFilterColumn ? (
            <div className="edit-activity__deps-filter-popover" ref={filterPopoverRef} style={{ top: filterPopoverPos.top, left: filterPopoverPos.left }}>
              {openFilterColumn === 'applicable' ? (
                <div className="edit-activity__deps-filter-section">
                  <Select
                    id="filter-applicable"
                    hideLabel
                    label="Status"
                    onChange={(val) => setEditApplicableVal(val)}
                    options={[
                      { label: 'All', value: '' },
                      { label: 'Discussed', value: '576610000' },
                      { label: 'Agreed', value: '576610001' },
                    ]}
                    value={editApplicableVal}
                  />
                </div>
              ) : (
                <div className="edit-activity__deps-filter-section">
                  <Select
                    id={`filter-op-${openFilterColumn}`}
                    hideLabel
                    label="Operator"
                    onChange={(val) => setEditFilterOp(val)}
                    options={getOperatorsForColumn(openFilterColumn).map((op) => ({
                      label: OPERATOR_LABELS[op],
                      value: op,
                    }))}
                    value={editFilterOp}
                  />
                  {openFilterColumn === 'dateOfSupport' ? (
                    <DatePicker
                      id={`filter-val-${openFilterColumn}`}
                      label=""
                      onChange={(val) => setEditFilterVal(val)}
                      value={editFilterVal}
                    />
                  ) : (
                    <Input
                      id={`filter-val-${openFilterColumn}`}
                      label=""
                      onChange={(e) => setEditFilterVal(e.target.value)}
                      placeholder="Filter value..."
                      value={editFilterVal}
                    />
                  )}
                </div>
              )}
              <div className="edit-activity__deps-filter-actions">
                <button className="edit-activity__deps-filter-cancel" onClick={handleCancelFilter} type="button">
                  Cancel
                </button>
                <button className="edit-activity__deps-filter-apply" onClick={handleApplyFilter} type="button">
                  Apply
                </button>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Pagination */}
      {showPagination ? (
        <div className="edit-activity__members-pagination">
          <span className="edit-activity__members-pagination-info">
            Showing <strong>{rangeStart}–{rangeEnd}</strong> of <strong>{filteredCount}</strong> dependenc{filteredCount !== 1 ? 'ies' : 'y'}
          </span>
          <div className="edit-activity__members-pagination-controls">
            <button
              className="edit-activity__members-page-btn"
              disabled={depCurrentPage <= 1}
              onClick={() => setDepCurrentPage((p) => Math.max(1, p - 1))}
              type="button"
              aria-label="Previous page"
            >
              <ChevronLeft size={15} />
            </button>
            <div className="edit-activity__members-page-numbers">
              {(() => {
                const pages: (number | 'ellipsis')[] = []
                const total = depTotalPages
                const current = depCurrentPage
                const siblingCount = 1
                if (total <= 7) {
                  for (let i = 1; i <= total; i++) pages.push(i)
                } else {
                  pages.push(1)
                  if (current > siblingCount + 2) pages.push('ellipsis')
                  const start = Math.max(2, current - siblingCount)
                  const end = Math.min(total - 1, current + siblingCount)
                  for (let i = start; i <= end; i++) pages.push(i)
                  if (current < total - siblingCount - 1) pages.push('ellipsis')
                  if (total > 1) pages.push(total)
                }
                return pages.map((page, idx) =>
                  page === 'ellipsis' ? (
                    <span className="edit-activity__members-page-ellipsis" key={`ellipsis-${idx}`}>...</span>
                  ) : (
                    <button
                      key={page}
                      className={`edit-activity__members-page-num${page === current ? ' edit-activity__members-page-num--active' : ''}`}
                      onClick={() => setDepCurrentPage(page)}
                      type="button"
                    >
                      {page}
                    </button>
                  ),
                )
              })()}
            </div>
            <button
              className="edit-activity__members-page-btn"
              disabled={depCurrentPage >= depTotalPages}
              onClick={() => setDepCurrentPage((p) => Math.min(depTotalPages, p + 1))}
              type="button"
              aria-label="Next page"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      ) : null}

      {/* Lazy sentinel */}
      {showLoadMore ? (
        <div className="edit-activity__members-sentinel" ref={depSentinelRef} aria-hidden="true">
          <span className="edit-activity__members-sentinel-dot" />
          <span className="edit-activity__members-sentinel-dot" />
          <span className="edit-activity__members-sentinel-dot" />
        </div>
      ) : depViewMode === 'lazy' && filteredCount > 0 ? (
        <div className="edit-activity__members-sentinel--done" aria-hidden="true">
          <Check size={13} />
          <span>All {filteredCount} dependenc{filteredCount !== 1 ? 'ies' : 'y'} loaded</span>
        </div>
      ) : null}

      {/* Create / Edit dependency modal */}
      <Modal
        actions={
          <div className="edit-activity__deps-modal-actions">
            <Button onClick={handleCloseDepModal} variant="secondary">
              Cancel
            </Button>
            <Button icon={<Check size={16} />} onClick={handleSaveDep}>
              {editingDep ? 'Update Dependency' : 'Create Dependency'}
            </Button>
          </div>
        }
        isOpen={isDepModalOpen}
        onClose={handleCloseDepModal}
        title={editingDep ? 'Edit External Dependency' : 'Create External Dependency'}
      >
        <div className="edit-activity__deps-modal">
          <div className="edit-activity__deps-modal-row">
            <Textarea
              error={depFormErrors.entityName}
              label="External Entity Name"
              onChange={(e) => handleDepFormChange('entityName', e.target.value)}
              placeholder="Enter the external entity or organisation name"
              required
              rows={5}
              value={depForm.entityName}
            />
            <Textarea
              error={depFormErrors.typeOfSupport}
              label="Type of Support"
              onChange={(e) => handleDepFormChange('typeOfSupport', e.target.value)}
              placeholder="Describe the type of support or arrangement"
              required
              rows={5}
              value={depForm.typeOfSupport}
            />
          </div>
          <div className="edit-activity__deps-modal-row">
            <DatePicker
              error={depFormErrors.dateOfSupport}
              id="dep-date-of-support"
              label="Date of Support"
              onChange={(value) => handleDepFormChange('dateOfSupport', value)}
              required
              value={depForm.dateOfSupport}
            />
            <RadioGroup
              error={depFormErrors.applicable}
              label="Applicable"
              name="dep-applicable"
              onChange={(value) => handleDepFormChange('applicable', value)}
              options={APPLICABLE_OPTIONS}
              required
              value={depForm.applicable}
            />
          </div>
        </div>
      </Modal>

      {/* Single delete confirmation */}
      <ConfirmationDialog
        confirmLabel="Delete Dependency"
        danger
        description={depToDelete ? `Are you sure you want to delete the dependency <strong>${depToDelete.entityName}</strong>? This action cannot be undone.` : ''}
        isOpen={depToDelete !== null}
        onCancel={() => setDepToDelete(null)}
        onConfirm={handleConfirmDeleteDep}
        title="Delete Dependency"
      />

      {/* Bulk delete confirmation */}
      <ConfirmationDialog
        confirmLabel={`Delete ${selectedCount} Dependenc${selectedCount !== 1 ? 'ies' : 'y'}`}
        danger
        description={`Are you sure you want to delete <strong>${selectedCount}</strong> selected dependenc${selectedCount !== 1 ? 'ies' : 'y'}? This action cannot be undone.`}
        isOpen={isBulkDeleteConfirm}
        onCancel={() => setIsBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Delete Dependencies"
      />
    </div>
  )
}
