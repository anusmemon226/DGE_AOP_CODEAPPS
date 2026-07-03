import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { Button, ConfirmationDialog, DatePicker, Input, RadioGroup, Select, SideDrawer, Textarea } from '../../components/ui'
import type { SelectOption } from '../../components/ui'
import type { Dga_dependencies, Dga_dependenciesBase } from '../../generated/models/Dga_dependenciesModel'
import { Dga_dependenciesService } from '../../generated/services/Dga_dependenciesService'
import { useAppSelector } from '../../store/hooks'
import { formatDateDisplay } from '../../utils/formatting'

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
type DependenciesTabProps = {
  embedded?: boolean
  isReadOnly?: boolean
  onDependencyCountChange?: (count: number) => void
  projectId: string
}
type DependencyCreatePayload = Omit<Dga_dependenciesBase, 'dga_dependencyid' | 'ownerid' | 'owneridtype'> & {
  'ownerid@odata.bind': string
}

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

const DEP_ITEMS_PER_PAGE = 5
const DEP_EMBEDDED_ITEMS_PER_PAGE = 5
const DEP_LAZY_BATCH = 12

function getOperationErrorMessage(result: unknown, fallbackMessage: string) {
  const error = (result as { error?: { message?: string } | string })?.error
  const message = typeof error === 'string' ? error : error?.message

  if (!message) return fallbackMessage

  try {
    const parsed = JSON.parse(message) as { error?: { message?: string } }
    return parsed.error?.message ?? message
  } catch {
    return message
  }
}

function assertOperationSuccess(result: unknown, fallbackMessage: string) {
  if ((result as { success?: boolean })?.success === false) {
    throw new Error(getOperationErrorMessage(result, fallbackMessage))
  }
}

function normalizeId(id?: string | null) {
  return id?.replace(/[{}]/g, '') ?? ''
}

function projectLookupFilter(projectId: string) {
  return `_dga_aop_project_value eq '${normalizeId(projectId)}'`
}

function dependencyToUi(record: Dga_dependencies): Dependency | null {
  if (!record.dga_dependencyid) return null

  return {
    applicable: String(record.dga_please_check_where_applicable ?? '') as ApplicableValue,
    dateOfSupport: record.dga_date_of_support ?? '',
    entityName: record.dga_name_of_external_entity ?? record.dga_name ?? '',
    id: record.dga_dependencyid,
    typeOfSupport: record.dga_type_of_support ?? '',
  }
}

function buildDependencyPayload(
  form: Omit<Dependency, 'id'>,
  projectId: string,
  ownerId: string,
): DependencyCreatePayload {
  return {
    'dga_aop_project@odata.bind': `/dga_aop_projectses(${normalizeId(projectId)})`,
    dga_date_of_support: form.dateOfSupport,
    dga_name: form.entityName.trim(),
    dga_name_of_external_entity: form.entityName.trim(),
    dga_please_check_where_applicable: Number(form.applicable) as Dga_dependenciesBase['dga_please_check_where_applicable'],
    dga_type_of_support: form.typeOfSupport.trim(),
    'ownerid@odata.bind': `/systemusers(${normalizeId(ownerId)})`,
    statecode: 0,
    statuscode: 1,
  }
}

// ── Component ──

export function DependenciesTab({ embedded = false, isReadOnly = false, onDependencyCountChange, projectId }: DependenciesTabProps) {
  const systemUser = useAppSelector((state) => state.user.systemUser)
  // ── Data state ──
  const [dependencies, setDependencies] = useState<Dependency[]>([])
  const [depSearch, setDepSearch] = useState('')
  const [depViewMode, setDepViewMode] = useState<'pagination' | 'lazy'>('pagination')
  const [depCurrentPage, setDepCurrentPage] = useState(1)
  const [depLazyCount, setDepLazyCount] = useState(12)
  const [isDepsLoading, setIsDepsLoading] = useState(false)
  const [isDepSaving, setIsDepSaving] = useState(false)
  const [isDepDeleting, setIsDepDeleting] = useState(false)
  const [depError, setDepError] = useState('')
  const [depNotice, setDepNotice] = useState('')
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
  const filterClickHandlerRef = useRef<((event: MouseEvent) => void) | null>(null)
  const depsTableWrapRef = useRef<HTMLDivElement>(null)

  // Local editing state for filter popover
  const [editFilterOp, setEditFilterOp] = useState<FilterOperator>('contains')
  const [editFilterVal, setEditFilterVal] = useState('')
  const [editApplicableVal, setEditApplicableVal] = useState('')

  const loadDependencies = useCallback(async () => {
    if (!projectId) {
      setDepError('Activity id is missing from the edit URL.')
      setDependencies([])
      return
    }

    setIsDepsLoading(true)
    setDepError('')

    try {
      const result = await Dga_dependenciesService.getAll({
        select: [
          'dga_dependencyid',
          'dga_name',
          'dga_name_of_external_entity',
          'dga_date_of_support',
          'dga_type_of_support',
          'dga_please_check_where_applicable',
          '_dga_aop_project_value',
        ],
        filter: projectLookupFilter(projectId),
        orderBy: ['createdon desc'],
      })

      assertOperationSuccess(result, 'Unable to load dependencies.')

      const mapped = (result.data ?? [])
        .map((dependency) => dependencyToUi(dependency as Dga_dependencies))
        .filter((dependency): dependency is Dependency => Boolean(dependency))

      setDependencies(mapped)
      setSelectedDepIds(new Set())
    } catch (error) {
      setDepError(error instanceof Error ? error.message : 'Unable to load dependencies.')
      setDependencies([])
    } finally {
      setIsDepsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDependencies()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadDependencies])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      onDependencyCountChange?.(dependencies.length)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [dependencies.length, onDependencyCountChange])

  useEffect(() => {
    if (!depNotice) return

    const timeoutId = window.setTimeout(() => {
      setDepNotice('')
    }, 10000)

    return () => window.clearTimeout(timeoutId)
  }, [depNotice])

  // ── Derived data ──

  const filteredDeps = useMemo(() => {
    if (embedded) return dependencies
    if (!depSearch.trim()) return dependencies
    const q = depSearch.toLowerCase()
    return dependencies.filter((d) => d.entityName.toLowerCase().includes(q) || d.typeOfSupport.toLowerCase().includes(q))
  }, [dependencies, depSearch, embedded])

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
    if (embedded) return undefined
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
  }, [depViewMode, embedded, totalFilteredCount])

  const depPageSize = embedded ? DEP_EMBEDDED_ITEMS_PER_PAGE : DEP_ITEMS_PER_PAGE
  const depTotalPages = Math.max(1, Math.ceil(totalFilteredCount / depPageSize))

  const visibleDeps = useMemo(() => {
    if (embedded) {
      return displayDeps.slice((depCurrentPage - 1) * DEP_EMBEDDED_ITEMS_PER_PAGE, depCurrentPage * DEP_EMBEDDED_ITEMS_PER_PAGE)
    }
    if (depViewMode === 'pagination') {
      return displayDeps.slice((depCurrentPage - 1) * DEP_ITEMS_PER_PAGE, depCurrentPage * DEP_ITEMS_PER_PAGE)
    }
    return displayDeps.slice(0, depLazyCount)
  }, [depCurrentPage, depLazyCount, depViewMode, displayDeps, embedded])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDepCurrentPage(1)
      setDepLazyCount(12)
    }, 0)

    return () => window.clearTimeout(timeoutId)
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
      filterClickHandlerRef.current = handleClick
    })

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpenFilterColumn(null)
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('keydown', handleKeyDown)
      if (filterClickHandlerRef.current) {
        document.removeEventListener('mousedown', filterClickHandlerRef.current)
        filterClickHandlerRef.current = null
      }
    }
  }, [openFilterColumn])

  // ── CRUD handlers ──

  function handleOpenDepModal(dep?: Dependency) {
    if (isReadOnly) return
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
    if (isReadOnly) return
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

  async function handleSaveDep() {
    if (isReadOnly) return
    if (!validateDepForm()) return

    if (!projectId) {
      setDepError('Activity id is missing from the edit URL.')
      return
    }

    if (!systemUser?.systemuserid) {
      setDepError('Current system user could not be resolved.')
      return
    }

    setIsDepSaving(true)
    setDepError('')
    setDepNotice('')

    try {
      const payload = buildDependencyPayload(depForm, projectId, systemUser.systemuserid)

      if (editingDep) {
        const result = await Dga_dependenciesService.update(
          editingDep.id,
          {
            dga_date_of_support: payload.dga_date_of_support,
            dga_name: payload.dga_name,
            dga_name_of_external_entity: payload.dga_name_of_external_entity,
            dga_please_check_where_applicable: payload.dga_please_check_where_applicable,
            dga_type_of_support: payload.dga_type_of_support,
          },
        )
        assertOperationSuccess(result, 'Unable to update dependency.')
        setDepNotice('Dependency updated successfully.')
      } else {
        const result = await Dga_dependenciesService.create(
          payload as unknown as Omit<Dga_dependenciesBase, 'dga_dependencyid'>,
        )
        assertOperationSuccess(result, 'Unable to create dependency.')
        setDepNotice('Dependency created successfully.')
      }

      handleCloseDepModal()
      await loadDependencies()
    } catch (error) {
      setDepError(error instanceof Error ? error.message : 'Unable to save dependency.')
    } finally {
      setIsDepSaving(false)
    }
  }

  async function handleConfirmDeleteDep() {
    if (isReadOnly) return
    if (!depToDelete) return
    setIsDepDeleting(true)
    setDepError('')
    setDepNotice('')

    try {
      await Dga_dependenciesService.delete(depToDelete.id)
      setDependencies((prev) => prev.filter((d) => d.id !== depToDelete.id))
      setSelectedDepIds((prev) => { const next = new Set(prev); next.delete(depToDelete.id); return next })
      setDepToDelete(null)
      setDepNotice('Dependency deleted successfully.')
    } catch (error) {
      setDepError(error instanceof Error ? error.message : 'Unable to delete dependency.')
    } finally {
      setIsDepDeleting(false)
    }
  }

  async function handleBulkDelete() {
    if (isReadOnly) return
    setIsDepDeleting(true)
    setDepError('')
    setDepNotice('')

    const idsToDelete = Array.from(selectedDepIds)
    const results = await Promise.allSettled(idsToDelete.map((id) => Dga_dependenciesService.delete(id)))
    const failedCount = results.filter((result) => result.status === 'rejected').length

    setIsDepDeleting(false)
    setIsBulkDeleteConfirm(false)

    if (failedCount > 0) {
      setDepError(`${idsToDelete.length - failedCount} of ${idsToDelete.length} dependencies deleted. ${failedCount} failed.`)
    } else {
      setDepNotice(`${idsToDelete.length} dependenc${idsToDelete.length !== 1 ? 'ies' : 'y'} deleted successfully.`)
    }

    await loadDependencies()
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
  const showPagination = embedded
    ? filteredCount > DEP_EMBEDDED_ITEMS_PER_PAGE
    : depViewMode === 'pagination' && filteredCount > DEP_ITEMS_PER_PAGE
  const showLoadMore = !embedded && depViewMode === 'lazy' && depLazyCount < filteredCount
  const rangeStart = filteredCount > 0 ? (depCurrentPage - 1) * depPageSize + 1 : 0
  const rangeEnd = Math.min(depCurrentPage * depPageSize, filteredCount)

  return (
    <div className={`edit-activity__dependencies${embedded ? ' card create-activity__section edit-activity__dependencies--embedded' : ''}`}>
      {/* Header */}
      <div className={embedded ? 'create-activity__section-header edit-activity__members-header' : 'edit-activity__members-header'}>
        {embedded ? (
          <div className="create-activity__section-header-inner">
            <span className="create-activity__section-header-icon" aria-hidden="true">
              <GitBranch size={18} />
            </span>
            <div>
              <span>Dependencies</span>
              <h2>
                External dependency support
                <span className="edit-activity__members-count-badge">
                  {depCount} Dependenc{depCount !== 1 ? 'ies' : 'y'}
                </span>
              </h2>
            </div>
          </div>
        ) : (
          <div className="edit-activity__members-header-text">
            <h2>
              Dependencies
              <span className="edit-activity__members-count-badge">
                {depCount} Dependenc{depCount !== 1 ? 'ies' : 'y'}
              </span>
            </h2>
            <p>Manage external dependencies for this activity.</p>
          </div>
        )}
        <div className="edit-activity__dependencies-header-actions">
          {!isReadOnly && selectedCount > 0 ? (
            <Button
              disabled={isDepDeleting}
              icon={<Trash2 size={16} />}
              onClick={() => setIsBulkDeleteConfirm(true)}
              variant="secondary"
              className="button--danger"
            >
              Delete ({selectedCount})
            </Button>
          ) : null}
          <Button disabled={isReadOnly || !projectId || isDepsLoading} icon={<GitBranch size={16} />} onClick={() => handleOpenDepModal()}>
            Create Dependency
          </Button>
        </div>
      </div>

      {depError ? (
        <div className="create-activity__notice create-activity__notice--error edit-activity__members-notice" role="alert">
          <X size={13} />
          <span>{depError}</span>
        </div>
      ) : depNotice ? (
        <div className="create-activity__notice create-activity__notice--success edit-activity__members-notice" role="status">
          <Check size={14} />
          <span>{depNotice}</span>
        </div>
      ) : null}

      {/* Toolbar */}
      {!embedded && depCount > 0 ? (
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
      {isDepsLoading ? (
        <div className="edit-activity__members-empty">
          <GitBranch size={40} strokeWidth={1.2} />
          <h3>Loading dependencies...</h3>
          <p>Fetching dependencies for this activity.</p>
        </div>
      ) : filteredCount === 0 ? (
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
                    disabled={isReadOnly}
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
                        disabled={isReadOnly}
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
                    disabled={isReadOnly}
                    onClick={() => handleOpenDepModal(dep)}
                    title={`Edit dependency: ${dep.entityName}`}
                    type="button"
                  >
                    {dep.entityName}
                  </button>
                  <div className="edit-activity__deps-table-cell edit-activity__deps-table-cell--date">
                    {formatDateDisplay(dep.dateOfSupport) || '—'}
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
                    {!isReadOnly ? (
                      <>
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
                      </>
                    ) : null}
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
      ) : !embedded && depViewMode === 'lazy' && filteredCount > 0 ? (
        <div className="edit-activity__members-sentinel--done" aria-hidden="true">
          <Check size={13} />
          <span>All {filteredCount} dependenc{filteredCount !== 1 ? 'ies' : 'y'} loaded</span>
        </div>
      ) : null}

      {/* Create / Edit dependency side drawer */}
      <SideDrawer
        actions={
          <div className="edit-activity__deps-drawer-actions">
            <Button onClick={handleCloseDepModal} variant="secondary">
              Cancel
            </Button>
            <Button disabled={isReadOnly || isDepSaving} icon={<Check size={16} />} onClick={handleSaveDep}>
              {isDepSaving ? 'Saving...' : editingDep ? 'Update Dependency' : 'Create Dependency'}
            </Button>
          </div>
        }
        isOpen={isDepModalOpen}
        onClose={handleCloseDepModal}
        title={editingDep ? 'Edit Dependency' : 'Create Dependency'}
      >
        <div className="edit-activity__deps-drawer">
          <div className="edit-activity__procurement-section">
            <div className="create-activity__section-header">
              <div className="create-activity__section-header-inner">
                <span className="create-activity__section-header-icon" aria-hidden="true">
                  <GitBranch size={16} />
                </span>
                <div>
                  <span>Dependency Information</span>
                  <h2>Entity & Support Details</h2>
                </div>
              </div>
            </div>

            <div className="edit-activity__procurement-drawer-section">
              <Textarea
                disabled={isReadOnly}
                error={depFormErrors.entityName}
                label="External Entity Name"
                onChange={(e) => handleDepFormChange('entityName', e.target.value)}
                placeholder="Enter the external entity or organisation name"
                required
                rows={4}
                value={depForm.entityName}
              />
              <DatePicker
                disabled={isReadOnly}
                error={depFormErrors.dateOfSupport}
                id="dep-date-of-support"
                label="Date of Support"
                onChange={(value) => handleDepFormChange('dateOfSupport', value)}
                required
                value={depForm.dateOfSupport}
              />
              <Textarea
                disabled={isReadOnly}
                error={depFormErrors.typeOfSupport}
                label="Type of Support"
                onChange={(e) => handleDepFormChange('typeOfSupport', e.target.value)}
                placeholder="Describe the type of support or arrangement"
                required
                rows={4}
                value={depForm.typeOfSupport}
              />
              <RadioGroup
                disabled={isReadOnly}
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
        </div>
      </SideDrawer>

      {/* Single delete confirmation */}
      <ConfirmationDialog
        confirmLabel={isDepDeleting ? 'Deleting...' : 'Delete Dependency'}
        danger
        description="This dependency will be permanently removed. This action cannot be undone."
        isOpen={depToDelete !== null}
        onCancel={() => setDepToDelete(null)}
        onConfirm={handleConfirmDeleteDep}
        title={depToDelete ? `Are you sure you want to delete the dependency ${depToDelete.entityName}?` : ''}
      />

      {/* Bulk delete confirmation */}
      <ConfirmationDialog
        confirmLabel={isDepDeleting ? 'Deleting...' : `Delete ${selectedCount} Dependenc${selectedCount !== 1 ? 'ies' : 'y'}`}
        danger
        description="These dependencies will be permanently removed. This action cannot be undone."
        isOpen={isBulkDeleteConfirm}
        onCancel={() => setIsBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title={`Are you sure you want to delete ${selectedCount} selected ${selectedCount !== 1 ? 'dependencies' : 'dependency'}?`}
      />
    </div>
  )
}
