import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  LayoutList,
  RotateCcw,
  Rows,
  Sparkles,
  X,
} from 'lucide-react'
import { Badge, Button, DatePicker, EmptyState, Input, SearchInput, Select, Tabs } from '../components/ui'
import type { SelectOption, TabItem } from '../components/ui'
import { APP_ROUTE_PATHS } from '../routes/appRoutes'
import { fetchPlanningInstances } from '../store/appSlice'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import '../styles/activities-list.css'
import {
  Dga_aop_projectsesService,
} from '../generated/services/Dga_aop_projectsesService'
import { SystemusersService } from '../generated/services/SystemusersService'
import { TeamsService } from '../generated/services/TeamsService'
import { Dga_aop_projectsesdga_project_categorized_under } from '../generated/models/Dga_aop_projectsesModel'
import type { Dga_aop_projectses } from '../generated/models/Dga_aop_projectsesModel'
import type { Systemusers } from '../generated/models/SystemusersModel'
import type { Teams } from '../generated/models/TeamsModel'
import { formatDate } from './editActivity/helpers/sharedHelpers'

// ── Enum Helpers ──

function readableEnumLabel(value: string) {
  const labels: Record<string, string> = {
    AbuDhabiGovernmentDigitalStrategy: 'Abu Dhabi Government Digital Strategy',
    DGECorporateStrategy: 'DGE Corporate Strategy',
    GovernmentoftheFutureStrategy: 'Government of the Future Strategy',
  }

  if (labels[value]) {
    return labels[value]
  }

  return value.replace(/([a-z])([A-Z])/g, '$1 $2')
}

const CATEGORIZED_OPTIONS: SelectOption<string>[] = Object
  .entries(Dga_aop_projectsesdga_project_categorized_under)
  .map(([value, label]) => ({
    label: readableEnumLabel(label),
    value,
  }))

const CATEGORIZED_LABEL_BY_VALUE = CATEGORIZED_OPTIONS.reduce<Record<string, string>>((map, option) => {
  map[option.value] = option.label
  return map
}, {})

const AOP_ADEO_OPTIONS: SelectOption<string>[] = [
  { label: 'AOP / ADEO', value: '' },
  { label: 'AOP', value: 'aop' },
  { label: 'ADEO', value: 'adeo' },
]

const PAGE_SIZE = 10
const LAZY_BATCH_SIZE = 20

// ── Status code label & tone mapping ──

const STATUS_CODE_MAP: Record<number, { label: string; tone: 'neutral' | 'info' | 'warning' | 'success' }> = {
  1: { label: 'Draft', tone: 'neutral' },
  776140001: { label: 'Division Director Review', tone: 'warning' },
  776140003: { label: 'Strategy Team Review', tone: 'info' },
  2: { label: 'Inactive', tone: 'neutral' },
  776140004: { label: 'Pending ED Submission', tone: 'warning' },
  776140002: { label: 'Executive Director Review', tone: 'warning' },
  776140014: { label: 'Director General Review', tone: 'warning' },
  776140011: { label: 'Active', tone: 'success' },
  776140012: { label: 'Pending Clarification', tone: 'warning' },
  776140015: { label: 'Deleted', tone: 'neutral' },
}

const ACTIVITY_STATUS_MAP: Record<number, { label: string; tone: 'neutral' | 'info' | 'warning' | 'success' }> = {
  776140014: { label: 'Draft', tone: 'neutral' },
  776140007: { label: 'Not Started', tone: 'info' },
  776140005: { label: 'In Progress (Delayed)', tone: 'warning' },
  776140006: { label: 'In Progress (On Track)', tone: 'success' },
  776140009: { label: 'On Hold', tone: 'warning' },
  776140010: { label: 'Cancelled', tone: 'neutral' },
  776140013: { label: 'Completed', tone: 'success' },
  776140015: { label: 'Submitted for Approval', tone: 'info' },
}

const PHASE_LABEL_MAP: Record<number, string> = {
  776140000: 'Planning',
  776140001: 'Execution',
}

const PROJECT_TYPE_LABEL_MAP: Record<number, string> = {
  1: 'Strategic',
  2: 'Operational',
}

function formatBudget(value: number | null | undefined): string {
  if (value == null) return '—'
  return `AED ${Number(value).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function statusCodeLabel(code: number): string {
  return STATUS_CODE_MAP[code]?.label ?? 'Unknown'
}

function statusCodeTone(code: number): 'neutral' | 'info' | 'warning' | 'success' {
  return STATUS_CODE_MAP[code]?.tone ?? 'neutral'
}

function activityStatusLabel(code: number): string {
  return ACTIVITY_STATUS_MAP[code]?.label ?? 'Unknown'
}

function activityStatusTone(code: number): 'neutral' | 'info' | 'warning' | 'success' {
  return ACTIVITY_STATUS_MAP[code]?.tone ?? 'neutral'
}

function phaseLabel(code: number): string {
  return PHASE_LABEL_MAP[code] ?? 'Unknown'
}

function projectTypeLabel(code: number | null | undefined): string {
  if (code == null) return '—'
  return PROJECT_TYPE_LABEL_MAP[Number(code)] ?? '—'
}

function yesNoLabel(value: boolean | number | null | undefined): string {
  if (value === true || value === 1) return 'Yes'
  return 'No'
}

function activitySummary(activity: Dga_aop_projectses): string {
  return activity.dga_description_summary || 'No summary has been provided for this activity.'
}

function activityScope(activity: Dga_aop_projectses): string {
  return activity.dga_scope || 'No scope description has been provided for this activity.'
}

function normalizeId(id?: string | null) {
  return id?.replace(/[{}]/g, '').toLowerCase() ?? ''
}

function getPendingWith(activity: Dga_aop_projectses, ownerNameById: Record<string, string> = {}): string {
  const ownerTeamId = normalizeId(activity._owningteam_value)
  const ownerUserId = normalizeId(activity._owninguser_value)

  if (ownerTeamId) {
    return ownerNameById[ownerTeamId] || 'Team'
  }

  if (ownerUserId) {
    return ownerNameById[ownerUserId] || 'User'
  }

  return '—'
}

function getLookupName(lookupId: string | null | undefined, nameById: Record<string, string>) {
  const id = normalizeId(lookupId)
  return id ? nameById[id] || '—' : '—'
}

function parseCategorizedValues(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }

  return String(value ?? '')
    .replace(/[[\]]/g, '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function getCategorizedLabels(activity: Dga_aop_projectses): string[] {
  return parseCategorizedValues(activity.dga_project_categorized_under)
    .map((value) => CATEGORIZED_LABEL_BY_VALUE[value] ?? value)
}

function getCategorizedExportValue(activity: Dga_aop_projectses) {
  const labels = getCategorizedLabels(activity)
  return labels.length > 0 ? labels.join(' | ') : '—'
}

async function loadOwnerNameMap(activities: Dga_aop_projectses[]) {
  const teamIds = Array.from(new Set(activities.map((activity) => normalizeId(activity._owningteam_value)).filter(Boolean)))
  const userIds = Array.from(new Set(activities.map((activity) => normalizeId(activity._owninguser_value)).filter(Boolean)))
  const ownerNameById: Record<string, string> = {}

  try {
    if (teamIds.length > 0) {
      const teamsResult = await TeamsService.getAll({
        filter: teamIds.map((id) => `teamid eq '${id}'`).join(' or '),
        select: ['teamid', 'name'],
      })

      ;((teamsResult.data ?? []) as Teams[]).forEach((team) => {
        const teamId = normalizeId(team.teamid)
        if (teamId && team.name) {
          ownerNameById[teamId] = team.name
        }
      })
    }

    if (userIds.length > 0) {
      const usersResult = await SystemusersService.getAll({
        filter: userIds.map((id) => `systemuserid eq '${id}'`).join(' or '),
        select: ['systemuserid', 'fullname', 'internalemailaddress'],
      })

      ;((usersResult.data ?? []) as Systemusers[]).forEach((user) => {
        const userId = normalizeId(user.systemuserid)
        const userName = user.fullname || user.internalemailaddress
        if (userId && userName) {
          ownerNameById[userId] = userName
        }
      })
    }
  } catch (error) {
    console.warn('Failed to resolve activity owner names:', error)
  }

  return ownerNameById
}

// ── Column Filter Types & Constants (DependenciesTab pattern) ──

type ActColumnKey =
  | 'dga_name'
  | 'dga_sectorname'
  | 'dga_departmentname'
  | 'statuscode'
  | 'dga_project_phase'
  | 'dga_project_activity_status'
  | 'dga_registered_or_will_be_registered_in_epm'
  | 'dga_adeo_review_required'
  | 'dga_doesthisprojectrequirebudgetallocation'
  | 'dga_does_this_project_require_procurement'
  | 'dga_total_project_budget'
  | 'dga_allocated_budget'
  | 'dga_requested_budget'
  | 'dga_planned_start_date'
  | 'dga_planned_end_date'
  | 'dga_project_categorized_under'
  | 'pending_with'

type FilterOperator = 'equals' | 'contains' | 'gt' | 'lt'
type ColumnFilter = { operator: FilterOperator; value: string }
type ColFilterType = 'text' | 'number' | 'date' | 'boolean' | 'multi'

const TEXT_OPERATORS: FilterOperator[] = ['contains', 'equals']
const NUMBER_OPERATORS: FilterOperator[] = ['equals', 'gt', 'lt']
const DATE_OPERATORS: FilterOperator[] = ['equals', 'gt', 'lt']
const OPERATOR_LABELS: Record<FilterOperator, string> = {
  equals: 'Equals',
  contains: 'Contains',
  gt: 'Greater than',
  lt: 'Less than',
}

type ColumnFilterConfig = {
  type: ColFilterType
  options?: { label: string; value: string }[]
}

const COLUMN_FILTER_CONFIG: Partial<Record<ActColumnKey, ColumnFilterConfig>> = {
  dga_name: { type: 'text' },
  dga_sectorname: { type: 'text' },
  dga_departmentname: { type: 'text' },
  statuscode: {
    type: 'multi',
    options: [
      { label: 'Draft', value: '1' },
      { label: 'Division Director Review', value: '776140001' },
      { label: 'Strategy Team Review', value: '776140003' },
      { label: 'Pending Clarification', value: '776140012' },
      { label: 'Pending ED Submission', value: '776140004' },
      { label: 'Executive Director Review', value: '776140002' },
      { label: 'Director General Review', value: '776140014' },
      { label: 'Active', value: '776140011' },
    ],
  },
  dga_project_phase: {
    type: 'multi',
    options: [
      { label: 'Planning', value: '776140000' },
      { label: 'Execution', value: '776140001' },
    ],
  },
  dga_project_activity_status: {
    type: 'multi',
    options: [
      { label: 'Draft', value: '776140014' },
      { label: 'Not Started', value: '776140007' },
      { label: 'In Progress (Delayed)', value: '776140005' },
      { label: 'In Progress (On Track)', value: '776140006' },
      { label: 'On Hold', value: '776140009' },
      { label: 'Cancelled', value: '776140010' },
      { label: 'Completed', value: '776140013' },
      { label: 'Submitted for Approval', value: '776140015' },
    ],
  },
  dga_registered_or_will_be_registered_in_epm: { type: 'boolean' },
  dga_adeo_review_required: { type: 'boolean' },
  dga_doesthisprojectrequirebudgetallocation: { type: 'boolean' },
  dga_does_this_project_require_procurement: { type: 'boolean' },
  dga_total_project_budget: { type: 'number' },
  dga_allocated_budget: { type: 'number' },
  dga_requested_budget: { type: 'number' },
  dga_planned_start_date: { type: 'date' },
  dga_planned_end_date: { type: 'date' },
  dga_project_categorized_under: {
    type: 'multi',
    options: CATEGORIZED_OPTIONS,
  },
  pending_with: { type: 'text' },
}

// ── Main Component ──

export function ActivitiesList() {
  const navigate = useNavigate()

  // Redux
  const dispatch = useAppDispatch()
  const currentRole = useAppSelector((state) => state.user.currentRole)
  const divisionalHierarchies = useAppSelector((state) => state.user.divisionalHierarchies)
  const currentRoleDivisionalHierarchy = useAppSelector((state) => state.user.currentRoleDivisionalHierarchy)
  const selectedCycle = useAppSelector((state) => state.app.selectedCycle)
  const planningInstances = useAppSelector((state) => state.app.planningInstances)
  const planningInstancesCycleId = useAppSelector((state) => state.app.planningInstancesCycleId)
  const planningInstancesLoading = useAppSelector((state) => state.app.planningInstancesLoading)

  // Derived role info
  const roleName = currentRole?.roleName ?? ''
  const isDivisionRole = roleName.toLowerCase().includes('division member') || roleName.toLowerCase().includes('division director')
  const isExecutiveDirector = roleName.toLowerCase().includes('executive director')
  const requiresHierarchyScope = isDivisionRole || isExecutiveDirector
  const hasRequiredHierarchyScope = !requiresHierarchyScope || Boolean(normalizeId(currentRoleDivisionalHierarchy?.hierarchyId))

  // Sector/Division options from hierarchies
  const sectorOptions = useMemo<SelectOption<string>[]>(() => {
    const sectors = divisionalHierarchies.filter((h) => Number(h.dga_type) === 776140001)
    if (isDivisionRole || isExecutiveDirector) {
      // Locked: only their assigned sector
      const assigned = currentRoleDivisionalHierarchy
      if (assigned) {
        // Find the parent sector for this division
        const division = divisionalHierarchies.find((h) => h.dga_divisional_hierarchyid === assigned.hierarchyId)
        if (division?._dga_parent_divisional_hierarchy_value) {
          const sector = sectors.find((s) => s.dga_divisional_hierarchyid === division._dga_parent_divisional_hierarchy_value)
          if (sector) return [{ label: sector.dga_name ?? '', value: sector.dga_divisional_hierarchyid }]
        }
      }
      // Fallback: if we have hierarchies with sector type, use the first one
      if (sectors.length > 0) return [{ label: sectors[0].dga_name ?? '', value: sectors[0].dga_divisional_hierarchyid }]
      return []
    }
    return sectors.map((s) => ({ label: s.dga_name ?? '', value: s.dga_divisional_hierarchyid }))
  }, [divisionalHierarchies, currentRoleDivisionalHierarchy, isDivisionRole, isExecutiveDirector])

  const divisionOptions = useMemo<SelectOption<string>[]>(() => {
    const divisions = divisionalHierarchies.filter((h) => Number(h.dga_type) === 776140002)
    if (isDivisionRole) {
      // Locked: only their assigned division
      const assigned = currentRoleDivisionalHierarchy
      if (assigned) {
        const div = divisions.find((h) => h.dga_divisional_hierarchyid === assigned.hierarchyId)
        if (div) return [{ label: div.dga_name ?? '', value: div.dga_divisional_hierarchyid }]
      }
      return []
    }
    if (isExecutiveDirector && currentRoleDivisionalHierarchy) {
      // Filter divisions by their sector
      const sectorId = currentRoleDivisionalHierarchy.hierarchyId
      return divisions
        .filter((d) => d._dga_parent_divisional_hierarchy_value === sectorId)
        .map((d) => ({ label: d.dga_name ?? '', value: d.dga_divisional_hierarchyid }))
    }
    return divisions.map((d) => ({ label: d.dga_name ?? '', value: d.dga_divisional_hierarchyid }))
  }, [divisionalHierarchies, currentRoleDivisionalHierarchy, isDivisionRole, isExecutiveDirector])

  const hierarchyNameById = useMemo(() => {
    return divisionalHierarchies.reduce<Record<string, string>>((map, hierarchy) => {
      const id = normalizeId(hierarchy.dga_divisional_hierarchyid)
      if (id && hierarchy.dga_name) {
        map[id] = hierarchy.dga_name
      }
      return map
    }, {})
  }, [divisionalHierarchies])

  // ── Planning instance IDs for cycle-based filtering ──
  const hasSelectedCyclePlanningInstances = Boolean(
    selectedCycle && normalizeId(planningInstancesCycleId) === normalizeId(selectedCycle),
  )

  const cyclePlanningInstanceIds = useMemo(() => {
    if (!selectedCycle || !hasSelectedCyclePlanningInstances || planningInstances.length === 0) return []
    return planningInstances
      .filter((pi) => normalizeId(pi._dga_assessment_cycle_value) === normalizeId(selectedCycle))
      .map((pi) => pi.dga_project_planning_instanceid)
      .map((id) => normalizeId(id))
      .filter(Boolean)
  }, [hasSelectedCyclePlanningInstances, planningInstances, selectedCycle])

  const isCycleFilterReady = Boolean(
    selectedCycle && hasSelectedCyclePlanningInstances && !planningInstancesLoading,
  )

  const roleHierarchyFilter = useMemo(() => {
    const hierarchyId = normalizeId(currentRoleDivisionalHierarchy?.hierarchyId)
    if (!hierarchyId) return ''

    const normalizedRoleName = roleName.toLowerCase()
    if (normalizedRoleName.includes('division member') || normalizedRoleName.includes('division director')) {
      return `_dga_department_value eq ${hierarchyId}`
    }
    if (normalizedRoleName.includes('executive director')) {
      return `_dga_sector_value eq ${hierarchyId}`
    }

    return ''
  }, [currentRoleDivisionalHierarchy?.hierarchyId, roleName])

  // Fetch planning instances if they aren't loaded for the current cycle
  useEffect(() => {
    if (selectedCycle && normalizeId(planningInstancesCycleId) !== normalizeId(selectedCycle)) {
      dispatch(fetchPlanningInstances(selectedCycle))
    }
  }, [dispatch, selectedCycle, planningInstancesCycleId])

  // ── Filter state ──
  const [searchQuery, setSearchQuery] = useState('')
  const [phaseFilter, setPhaseFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [aopAdeoFilter, setAopAdeoFilter] = useState('')
  const [sectorFilter, setSectorFilter] = useState('')
  const [divisionFilter, setDivisionFilter] = useState('')
  const [categorizedFilter, setCategorizedFilter] = useState<string[]>([])
  const [categorizedOpen, setCategorizedOpen] = useState(false)
  const categorizedRef = useRef<HTMLDivElement>(null)
  const [strategicFilter, setStrategicFilter] = useState('all')

  // ── Activity state (all records, paginated client-side) ──
  const [allActivities, setAllActivities] = useState<Dga_aop_projectses[]>([])
  const [ownerNameById, setOwnerNameById] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<'pagination' | 'lazy'>('pagination')
  const [lazyCount, setLazyCount] = useState(LAZY_BATCH_SIZE)
  const [expandedIds, setExpandedIds] = useState<string[]>([])
  const lazySentinelRef = useRef<HTMLDivElement>(null)


  // ── Sort state ──
  type ActSortConfig = { column: ActColumnKey; direction: 'asc' | 'desc' } | null
  const [actSort, setActSort] = useState<ActSortConfig>(null)

  // ── Column filter state (DependenciesTab pattern) ──
  const [actFilters, setActFilters] = useState<Partial<Record<ActColumnKey, ColumnFilter>>>({})
  const [openFilterColumn, setOpenFilterColumn] = useState<ActColumnKey | null>(null)
  const [filterPopoverPos, setFilterPopoverPos] = useState({ top: 0, left: 0 })
  const filterPopoverRef = useRef<HTMLDivElement>(null)
  const filterClickHandlerRef = useRef<((event: MouseEvent) => void) | null>(null)
  const tableWrapRef = useRef<HTMLDivElement>(null)
  const [editFilterOp, setEditFilterOp] = useState<FilterOperator>('contains')
  const [editFilterVal, setEditFilterVal] = useState('')
  // Track multi-select state separately (not committed until Apply)
  const [editMultiVals, setEditMultiVals] = useState<string[]>([])

  // ── Search debounce ──
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setDebouncedSearch(searchQuery)
      setCurrentPage(1)
      setLazyCount(LAZY_BATCH_SIZE)
    }, 350)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [searchQuery])

  // ── Categorized filter outside-click ──
  useEffect(() => {
    if (!categorizedOpen) return
    function handleClick(e: MouseEvent) {
      if (categorizedRef.current && !categorizedRef.current.contains(e.target as Node)) {
        setCategorizedOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [categorizedOpen])

  const categorizedAllSelected = categorizedFilter.length === CATEGORIZED_OPTIONS.length
  const categorizedLabel = categorizedFilter.length === 0
    ? 'All categories'
    : categorizedAllSelected
      ? 'All categories'
      : `${categorizedFilter.length} selected`

  function toggleCategorized(value: string) {
    setCategorizedFilter(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value])
    setCurrentPage(1)
  }
  function handleSelectAllCategorized() {
    setCategorizedFilter(categorizedAllSelected ? [] : CATEGORIZED_OPTIONS.map(o => o.value))
    setCurrentPage(1)
  }

  // ── Status tabs based on role ──
  const statusTabItems = useMemo<TabItem<string>[]>(() => {
    if (roleName.toLowerCase().includes('division member')) {
      return [
        { label: 'All', value: 'all' },
        { label: 'My Drafts', value: 'draft' },
        { label: 'Submitted', value: 'submitted' },
      ]
    }
    return [
      { label: 'All', value: 'all' },
      { label: 'To Approve', value: 'to-approve' },
      { label: 'Approved', value: 'approved' },
    ]
  }, [roleName])

  const phaseTabItems: TabItem<string>[] = [
    { label: 'All', value: 'all' },
    { label: 'Planning', value: '776140000' },
    { label: 'Execution', value: '776140001' },
  ]

  const strategicTabItems: TabItem<string>[] = [
    { label: 'All', value: 'all' },
    { label: 'Strategic', value: '1' },
    { label: 'Operations', value: '2' },
  ]

  // ── Build OData filter ──
  const odataFilter = useMemo(() => {
    const parts: string[] = []

    if (debouncedSearch) {
      parts.push(`contains(dga_name, '${debouncedSearch.replace(/'/g, "''")}')`)
    }

    if (phaseFilter !== 'all') {
      parts.push(`dga_project_phase eq ${phaseFilter}`)
    }

    // Status filter
    if (statusFilter === 'draft') {
      parts.push('statuscode eq 1')
    } else if (statusFilter === 'submitted') {
      parts.push('statuscode eq 776140015')
    } else if (statusFilter === 'to-approve') {
      parts.push(
        '(statuscode eq 776140001 or statuscode eq 776140003 or statuscode eq 776140002 or statuscode eq 776140004 or statuscode eq 776140014 or statuscode eq 776140012)',
      )
    } else if (statusFilter === 'approved') {
      parts.push('statuscode eq 776140011')
    }

    // AOP / ADEO
    if (aopAdeoFilter === 'aop') {
      parts.push('(dga_strategic_vs_operation eq 1 or dga_strategic_vs_operation eq 2)')
    } else if (aopAdeoFilter === 'adeo') {
      parts.push('dga_adeo_review_required eq true')
    }

    // Sector
    if (sectorFilter) {
      parts.push(`_dga_sector_value eq ${sectorFilter}`)
    }

    // Division
    if (divisionFilter) {
      parts.push(`_dga_department_value eq ${divisionFilter}`)
    }

    // Strategic / Operational
    if (strategicFilter !== 'all') {
      parts.push(`dga_strategic_vs_operation eq ${strategicFilter}`)
    }

    // Filter by cycle's planning instances
    if (cyclePlanningInstanceIds.length > 0) {
      parts.push(`(${cyclePlanningInstanceIds.map((id) => `_dga_project_planning_instance_value eq ${id}`).join(' or ')})`)
    }

    if (roleHierarchyFilter) {
      parts.push(roleHierarchyFilter)
    }

    return parts.join(' and ')
  }, [debouncedSearch, phaseFilter, statusFilter, aopAdeoFilter, sectorFilter, divisionFilter, strategicFilter, cyclePlanningInstanceIds, roleHierarchyFilter])

  // ── Fetch activities ──
  const fetchActivities = useCallback(async () => {
    if (!selectedCycle) {
      setIsLoading(false)
      setError(null)
      setOwnerNameById({})
      setAllActivities([])
      return
    }

    if (!hasRequiredHierarchyScope) {
      setIsLoading(false)
      setError(null)
      setOwnerNameById({})
      setAllActivities([])
      return
    }

    if (!isCycleFilterReady) {
      setIsLoading(true)
      setError(null)
      setOwnerNameById({})
      setAllActivities([])
      return
    }

    if (cyclePlanningInstanceIds.length === 0) {
      setIsLoading(false)
      setError(null)
      setOwnerNameById({})
      setAllActivities([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const selectFields = [
        'dga_aop_projectsid',
        'dga_name',
        '_dga_sector_value',
        '_dga_department_value',
        'dga_registered_or_will_be_registered_in_epm',
        'dga_adeo_review_required',
        'dga_doesthisprojectrequirebudgetallocation',
        'dga_does_this_project_require_procurement',
        'dga_project_categorized_under',
        'statuscode',
        'dga_project_phase',
        'dga_project_activity_status',
        'dga_total_project_budget',
        'dga_allocated_budget',
        'dga_requested_budget',
        'dga_planned_start_date',
        'dga_planned_end_date',
        'dga_description_summary',
        'dga_scope',
        'createdon',
        'modifiedon',
        'dga_strategic_vs_operation',
        '_dga_project_planning_instance_value',
        '_owningteam_value',
        '_owninguser_value',
      ]

      const result = await Dga_aop_projectsesService.getAll({
        select: selectFields,
        filter: odataFilter || undefined,
        orderBy: ['createdon desc'],
      })

      const records = (result.data ?? []) as Dga_aop_projectses[]
      const nextOwnerNameById = await loadOwnerNameMap(records)
      setOwnerNameById(nextOwnerNameById)
      setAllActivities(records)
    } catch (err) {
      console.error('Failed to fetch activities:', err)
      setError(err instanceof Error ? err.message : 'Failed to load activities. Please try again.')
      setOwnerNameById({})
      setAllActivities([])
    } finally {
      setIsLoading(false)
    }
  }, [cyclePlanningInstanceIds.length, hasRequiredHierarchyScope, isCycleFilterReady, odataFilter, selectedCycle])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchActivities()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [fetchActivities])

  // Reset page when filters change
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCurrentPage(1)
      setLazyCount(LAZY_BATCH_SIZE)
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [odataFilter])

  // ── Export to CSV ──
  function exportToCsv() {
    if (activities.length === 0) return

    const headers = [
      'Activity Name', 'Sector', 'Division', 'Reported in EPM', 'ADEO Required',
      'Budget Required', 'Procurement Required', 'Project Categorized', 'Pending With',
      'Approval Status', 'Activity Phase', 'Activity Status',
      'Total Budget (AED)', 'Allocated Budget (AED)', 'Requested Budget (AED)',
      'Start Date', 'End Date',
    ]

    const rows = activities.map((a) => [
      a.dga_name ?? '',
      getLookupName(a._dga_sector_value, hierarchyNameById),
      getLookupName(a._dga_department_value, hierarchyNameById),
      a.dga_registered_or_will_be_registered_in_epm ? 'Yes' : 'No',
      a.dga_adeo_review_required ? 'Yes' : 'No',
      a.dga_doesthisprojectrequirebudgetallocation ? 'Yes' : 'No',
      a.dga_does_this_project_require_procurement === 1 ? 'Yes' : 'No',
      getCategorizedExportValue(a),
      getPendingWith(a, ownerNameById),
      a.statuscodename ?? '',
      a.dga_project_phasename ?? '',
      a.dga_project_activity_statusname ?? '',
      a.dga_total_project_budget?.toString() ?? '',
      a.dga_allocated_budget?.toString() ?? '',
      a.dga_requested_budget?.toString() ?? '',
      a.dga_planned_start_date ? formatDate(a.dga_planned_start_date) : '',
      a.dga_planned_end_date ? formatDate(a.dga_planned_end_date) : '',
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((r) =>
        r.map((cell) => {
          if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
            return `"${cell.replace(/"/g, '""')}"`
          }
          return cell
        }).join(','),
      ),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `activities-list-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // ── Sort handlers ──
  function handleSort(column: ActColumnKey) {
    setActSort((prev) => {
      if (!prev || prev.column !== column) return { column, direction: 'asc' }
      if (prev.direction === 'asc') return { column, direction: 'desc' }
      return null
    })
  }

  function toggleExpanded(activityId?: string | null) {
    if (!activityId) return
    setExpandedIds((current) =>
      current.includes(activityId)
        ? current.filter((expandedId) => expandedId !== activityId)
        : [...current, activityId],
    )
  }

  function getSortIcon(column: ActColumnKey) {
    if (!actSort || actSort.column !== column) {
      return <ArrowUp size={12} className="edit-activity__deps-sort-icon edit-activity__deps-sort-icon--inactive" />
    }
    if (actSort.direction === 'asc') return <ArrowUp size={12} className="edit-activity__deps-sort-icon edit-activity__deps-sort-icon--active" />
    return <ArrowDown size={12} className="edit-activity__deps-sort-icon edit-activity__deps-sort-icon--active" />
  }

  // ── Column filter handlers (DependenciesTab pattern) ──
  function handleOpenFilter(column: ActColumnKey, e: React.MouseEvent) {
    e.stopPropagation()
    if (openFilterColumn === column) {
      setOpenFilterColumn(null)
      return
    }
    if (tableWrapRef.current) {
      const cellEl = (e.currentTarget as HTMLElement).closest('[data-filter-anchor]') as HTMLElement
      const cellRect = cellEl?.getBoundingClientRect()
      if (cellRect) {
        setFilterPopoverPos({
          top: cellRect.bottom + 6,
          left: Math.max(8, Math.min(cellRect.left, window.innerWidth - 280)),
        })
      }
    }
    const config = COLUMN_FILTER_CONFIG[column]
    if (config?.type === 'multi') {
      const current = actFilters[column]
      setEditMultiVals(current ? current.value.split(',') : [])
    } else {
      const current = actFilters[column]
      const defaultOperator = config?.type === 'date' || config?.type === 'number' ? 'equals' : 'contains'
      setEditFilterOp(current?.operator ?? defaultOperator)
      setEditFilterVal(current?.value ?? '')
    }
    setOpenFilterColumn(column)
  }

  function handleApplyFilter() {
    if (!openFilterColumn) return
    const config = COLUMN_FILTER_CONFIG[openFilterColumn]
    if (config?.type === 'multi') {
      if (editMultiVals.length > 0) {
        setActFilters((prev) => ({ ...prev, [openFilterColumn]: { operator: 'equals', value: editMultiVals.join(',') } }))
      } else {
        setActFilters((prev) => { const n = { ...prev }; delete n[openFilterColumn]; return n })
      }
    } else if (editFilterVal) {
      setActFilters((prev) => ({ ...prev, [openFilterColumn]: { operator: editFilterOp, value: editFilterVal } }))
    } else {
      setActFilters((prev) => { const n = { ...prev }; delete n[openFilterColumn]; return n })
    }
    setCurrentPage(1)
    setLazyCount(LAZY_BATCH_SIZE)
    setOpenFilterColumn(null)
  }

  function handleCancelFilter() {
    setOpenFilterColumn(null)
  }

  function handleClearAllColumnFilters() {
    setActFilters({})
    setCurrentPage(1)
    setLazyCount(LAZY_BATCH_SIZE)
    setOpenFilterColumn(null)
  }

  const getColumnValue = useCallback((act: Dga_aop_projectses, column: ActColumnKey) => {
    if (column === 'pending_with') return getPendingWith(act, ownerNameById)
    if (column === 'dga_sectorname') return getLookupName(act._dga_sector_value, hierarchyNameById)
    if (column === 'dga_departmentname') return getLookupName(act._dga_department_value, hierarchyNameById)
    if (column === 'dga_project_categorized_under') return parseCategorizedValues(act.dga_project_categorized_under).join(',')
    return (act as unknown as Record<string, unknown>)[column]
  }, [hierarchyNameById, ownerNameById])

  // Close filter popover on click outside / escape
  useEffect(() => {
    if (!openFilterColumn) return
    const popover = filterPopoverRef.current
    if (!popover) return

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

  // ── Client-side column filter memo ──
  const columnFilteredActivities = useMemo(() => {
    const categorizedFilteredActivities = categorizedFilter.length === 0
      ? allActivities
      : allActivities.filter((activity) => {
        const values = parseCategorizedValues(activity.dga_project_categorized_under)
        return categorizedFilter.some((filterValue) => values.includes(filterValue))
      })
    const activeFilters = Object.entries(actFilters).filter(([, f]) => f.value !== '')
    if (activeFilters.length === 0) return categorizedFilteredActivities

    return categorizedFilteredActivities.filter((act) =>
      activeFilters.every(([column, filter]) => {
        const colKey = column as ActColumnKey
        const config = COLUMN_FILTER_CONFIG[colKey]
        if (!config) return true

        switch (config.type) {
          case 'multi': {
            const vals = filter.value.split(',').filter(Boolean)
            if (vals.length === 0) return true
            const fieldVals = String(getColumnValue(act, colKey) ?? '').split(',').map((value) => value.trim())
            return vals.some((v) => fieldVals.includes(v))
          }
          case 'boolean': {
            const fieldVal = Boolean(getColumnValue(act, colKey))
            return String(fieldVal) === filter.value
          }
          case 'number': {
            const fieldVal = Number(getColumnValue(act, colKey))
            const filterVal = Number(filter.value)
            if (isNaN(fieldVal) || isNaN(filterVal)) return true
            switch (filter.operator) {
              case 'equals': return fieldVal === filterVal
              case 'gt': return fieldVal > filterVal
              case 'lt': return fieldVal < filterVal
              default: return true
            }
          }
          case 'date': {
            const fieldVal = String(getColumnValue(act, colKey) ?? '')
            const filterVal = filter.value
            if (!fieldVal || !filterVal) return true
            switch (filter.operator) {
              case 'equals': return fieldVal.startsWith(filterVal)
              case 'gt': return fieldVal > filterVal
              case 'lt': return fieldVal < filterVal
              default: return true
            }
          }
          case 'text':
          default: {
            const fieldVal = String(getColumnValue(act, colKey) ?? '')
            const filterVal = filter.value
            if (!filterVal) return true
            switch (filter.operator) {
              case 'contains': return fieldVal.toLowerCase().includes(filterVal.toLowerCase())
              case 'equals': return fieldVal.toLowerCase() === filterVal.toLowerCase()
              default: return true
            }
          }
        }
      })
    )
  }, [actFilters, allActivities, categorizedFilter, getColumnValue])

  // ── Client-side sort memo (applied after column filter) ──
  const sortedActivities = useMemo(() => {
    if (!actSort) return columnFilteredActivities
    const { column, direction } = actSort
    return [...columnFilteredActivities].sort((a, b) => {
      const aVal = String(getColumnValue(a, column) ?? '')
      const bVal = String(getColumnValue(b, column) ?? '')
      const cmp = aVal.localeCompare(bVal, undefined, { numeric: true })
      return direction === 'asc' ? cmp : -cmp
    })
  }, [columnFilteredActivities, actSort, getColumnValue])

  // Update pagination to use filtered + sorted data
  const totalCount = sortedActivities.length
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const showPagination = viewMode === 'pagination' && totalCount > PAGE_SIZE
  const showLoadMore = viewMode === 'lazy' && lazyCount < totalCount
  const rangeStart = totalCount > 0 ? (viewMode === 'pagination' ? (currentPage - 1) * PAGE_SIZE + 1 : 1) : 0
  const rangeEnd = viewMode === 'pagination' ? Math.min(currentPage * PAGE_SIZE, totalCount) : Math.min(lazyCount, totalCount)
  const activityPageStart = (currentPage - 1) * PAGE_SIZE
  const activities = viewMode === 'pagination'
    ? sortedActivities.slice(activityPageStart, activityPageStart + PAGE_SIZE)
    : sortedActivities.slice(0, lazyCount)

  useEffect(() => {
    if (viewMode !== 'lazy') return undefined
    const sentinel = lazySentinelRef.current
    if (!sentinel) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return

        setLazyCount((currentCount) => {
          const nextCount = currentCount + LAZY_BATCH_SIZE
          return nextCount >= totalCount ? totalCount : nextCount
        })
      },
      { rootMargin: '100px' },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [viewMode, totalCount])

  // ── Render skeleton rows ──
  function renderSkeletonRows() {
    return Array.from({ length: 8 }).map((_, rowIdx) => (
      <div className="activities-grid__row activities-grid__skeleton-row" key={`skel-${rowIdx}`} aria-hidden="true">
        <span><span className="activities-list__skeleton-bar activities-list__skeleton-bar--w70" /></span>
        <span><span className="activities-list__skeleton-bar activities-list__skeleton-bar--w60" /></span>
        <span><span className="activities-list__skeleton-bar activities-list__skeleton-bar--w60" /></span>
        <span><span className="activities-list__skeleton-bar activities-list__skeleton-bar--w55" /></span>
        <span><span className="activities-list__skeleton-bar activities-list__skeleton-bar--w60" /></span>
        <span><span className="activities-list__skeleton-bar activities-list__skeleton-bar--w45" /></span>
        <span><span className="activities-list__skeleton-bar activities-list__skeleton-bar--w30" /></span>
      </div>
    ))
  }

  // ── Render ──

  const sectorSelectDisabled = (isDivisionRole || isExecutiveDirector) && sectorOptions.length <= 1
  const divisionSelectDisabled = isDivisionRole

  return (
    <div className="activities-list">
      {/* ── Header ── */}
      <div className="activities-list__header">
        <div className="activities-list__header-text">
          <h1>
            Activities List
            <span className="activities-list__count-badge">{totalCount} {totalCount === 1 ? 'Activity' : 'Activities'}</span>
          </h1>
          <p>View and manage all AOP activities.</p>
        </div>
        <div className="activities-list__header-actions">
          <Button icon={<Download size={15} />} onClick={exportToCsv} variant="secondary">
            Export to Excel
          </Button>
        </div>
      </div>

      {/* ── Filter Row 1 ── */}
      <div className="activities-list__filters-row">
        <SearchInput
          label="Search activities"
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by activity name..."
          value={searchQuery}
        />

        <Select
          id="aop-adeo-filter"
          label="AOP / ADEO"
          onChange={setAopAdeoFilter}
          options={AOP_ADEO_OPTIONS}
          value={aopAdeoFilter}
        />

        <Select
          id="sector-filter"
          label="Sector"
          onChange={(v) => { setSectorFilter(v); setCurrentPage(1) }}
          options={sectorOptions}
          value={sectorFilter}
          className={sectorSelectDisabled ? 'field--disabled' : ''}
        />

        <Select
          id="division-filter"
          label="Division"
          onChange={(v) => { setDivisionFilter(v); setCurrentPage(1) }}
          options={divisionOptions}
          value={divisionFilter}
          className={divisionSelectDisabled ? 'field--disabled' : ''}
        />

        <div className="activities-list__col-filter-wrap" ref={categorizedRef}>
          <button
            className={`activities-list__cat-trigger${categorizedOpen ? ' activities-list__cat-trigger--active' : ''}`}
            onClick={() => setCategorizedOpen(o => !o)}
            type="button"
          >
            <span className="activities-list__cat-trigger-label">Project Categorized</span>
            <span className="activities-list__cat-trigger-value">
              {categorizedLabel}
            </span>
            <ChevronDown size={14} />
          </button>
          {categorizedOpen ? (
            <div className="activities-list__cat-dropdown">
              <label className="activities-list__cat-option">
                <input
                  checked={categorizedAllSelected}
                  onChange={handleSelectAllCategorized}
                  type="checkbox"
                />
                <span>Select All</span>
              </label>
              {CATEGORIZED_OPTIONS.map(opt => (
                <label
                  key={opt.value}
                  className="activities-list__cat-option"
                >
                  <input
                    checked={categorizedFilter.includes(opt.value)}
                    onChange={() => toggleCategorized(opt.value)}
                    type="checkbox"
                  />
                  <span>{opt.label}</span>
                </label>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {/* ── Tab Filters ── */}
      <div className="activities-list__tabs-row">
        <div className="activities-list__tab-group activities-list__tab-group--phase">
          <span className="activities-list__tab-group-label">Phase</span>
          <Tabs items={phaseTabItems} onChange={(v) => { setPhaseFilter(v); setCurrentPage(1) }} value={phaseFilter} />
        </div>

        <div className="activities-list__tab-group activities-list__tab-group--status">
          <span className="activities-list__tab-group-label">Status</span>
          <Tabs items={statusTabItems} onChange={(v) => { setStatusFilter(v); setCurrentPage(1) }} value={statusFilter} />
        </div>

        <div className="activities-list__tab-group activities-list__tab-group--type">
          <span className="activities-list__tab-group-label">Type</span>
          <Tabs items={strategicTabItems} onChange={(v) => { setStrategicFilter(v); setCurrentPage(1) }} value={strategicFilter} />
        </div>

        <div className="activities-list__view-toggle" role="group" aria-label="View mode">
          <button
            className={`activities-list__view-btn${viewMode === 'pagination' ? ' activities-list__view-btn--active' : ''}`}
            onClick={() => {
              setViewMode('pagination')
              setCurrentPage(1)
            }}
            title="Paginated view"
            type="button"
          >
            <LayoutList size={14} />
            <span>Pages</span>
          </button>
          <button
            className={`activities-list__view-btn${viewMode === 'lazy' ? ' activities-list__view-btn--active' : ''}`}
            onClick={() => {
              setViewMode('lazy')
              setLazyCount(LAZY_BATCH_SIZE)
            }}
            title="Scroll-to-load view"
            type="button"
          >
            <Rows size={14} />
            <span>Scroll</span>
          </button>
        </div>
      </div>

      {/* ── Error Banner ── */}
      {error ? (
        <div className="activities-list__error">
          <p>{error}</p>
          <button onClick={fetchActivities} type="button">
            <RotateCcw size={13} style={{ marginRight: '0.3rem' }} />
            Retry
          </button>
        </div>
      ) : null}

      {/* ── Data Grid ── */}
      <section className="activities-grid" ref={tableWrapRef} aria-label="Activities grid">
        <div className="activities-grid__head">
          <div className="activities-list__header-content" data-filter-anchor>
            <button className="activities-list__sort-btn" onClick={() => handleSort('dga_name')} type="button">
              <span>Activity Name</span>
              {getSortIcon('dga_name')}
            </button>
            <button
              className={`activities-list__header-filter-btn${actFilters.dga_name ? ' activities-list__header-filter-btn--active' : ''}`}
              onClick={(e) => handleOpenFilter('dga_name', e)}
              type="button"
              aria-label="Filter by name"
            >
              <Filter size={11} />
            </button>
          </div>
          <div className="activities-list__header-content" data-filter-anchor>
            <button className="activities-list__sort-btn" onClick={() => handleSort('dga_sectorname')} type="button">
              <span>Sector</span>
              {getSortIcon('dga_sectorname')}
            </button>
            <button
              className={`activities-list__header-filter-btn${actFilters.dga_sectorname ? ' activities-list__header-filter-btn--active' : ''}`}
              onClick={(e) => handleOpenFilter('dga_sectorname', e)}
              type="button"
              aria-label="Filter by sector"
            >
              <Filter size={11} />
            </button>
          </div>
          <div className="activities-list__header-content" data-filter-anchor>
            <button className="activities-list__sort-btn" onClick={() => handleSort('dga_departmentname')} type="button">
              <span>Division</span>
              {getSortIcon('dga_departmentname')}
            </button>
            <button
              className={`activities-list__header-filter-btn${actFilters.dga_departmentname ? ' activities-list__header-filter-btn--active' : ''}`}
              onClick={(e) => handleOpenFilter('dga_departmentname', e)}
              type="button"
              aria-label="Filter by division"
            >
              <Filter size={11} />
            </button>
          </div>
          <div className="activities-list__header-content" data-filter-anchor>
            <button className="activities-list__sort-btn" onClick={() => handleSort('pending_with')} type="button">
              <span>Pending With</span>
              {getSortIcon('pending_with')}
            </button>
            <button
              className={`activities-list__header-filter-btn${actFilters.pending_with ? ' activities-list__header-filter-btn--active' : ''}`}
              onClick={(e) => handleOpenFilter('pending_with', e)}
              type="button"
              aria-label="Filter by pending with"
            >
              <Filter size={11} />
            </button>
          </div>
          <div className="activities-list__header-content" data-filter-anchor>
            <button className="activities-list__sort-btn" onClick={() => handleSort('statuscode')} type="button">
              <span>Approval Status</span>
              {getSortIcon('statuscode')}
            </button>
            <button
              className={`activities-list__header-filter-btn${actFilters.statuscode ? ' activities-list__header-filter-btn--active' : ''}`}
              onClick={(e) => handleOpenFilter('statuscode', e)}
              type="button"
              aria-label="Filter by approval status"
            >
              <Filter size={11} />
            </button>
          </div>
          <div className="activities-list__header-content" data-filter-anchor>
            <button className="activities-list__sort-btn" onClick={() => handleSort('dga_project_phase')} type="button">
              <span>Phase</span>
              {getSortIcon('dga_project_phase')}
            </button>
            <button
              className={`activities-list__header-filter-btn${actFilters.dga_project_phase ? ' activities-list__header-filter-btn--active' : ''}`}
              onClick={(e) => handleOpenFilter('dga_project_phase', e)}
              type="button"
              aria-label="Filter by phase"
            >
              <Filter size={11} />
            </button>
          </div>
          <span aria-label="Expand row" />
        </div>

        <div className="activities-grid__body">
          {isLoading ? (
            renderSkeletonRows()
          ) : activities.length === 0 ? (
            <div className="activities-grid__empty">
              <EmptyState
                description="Try adjusting your search or filter criteria."
                title="No activities found"
              />
            </div>
          ) : (
            activities.map((act) => {
              const activityId = act.dga_aop_projectsid
              const isExpanded = Boolean(activityId && expandedIds.includes(activityId))
              const strategies = getCategorizedLabels(act)

              return (
                <article className={`activities-grid__record${isExpanded ? ' activities-grid__record--expanded' : ''}`} key={activityId}>
                  <div
                    className="activities-grid__row"
                    onClick={() => toggleExpanded(activityId)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        toggleExpanded(activityId)
                      }
                    }}
                  >
                    <button
                      className="activities-grid__name"
                      onClick={(event) => {
                        event.stopPropagation()
                        navigate(`${APP_ROUTE_PATHS.editActivity}?id=${activityId}`)
                      }}
                      type="button"
                    >
                      <strong>{act.dga_name || 'Untitled Activity'}</strong>
                    </button>
                    <span>{getLookupName(act._dga_sector_value, hierarchyNameById)}</span>
                    <span>{getLookupName(act._dga_department_value, hierarchyNameById)}</span>
                    <span>{getPendingWith(act, ownerNameById)}</span>
                    <span>
                      <Badge tone={statusCodeTone(Number(act.statuscode))}>
                        {statusCodeLabel(Number(act.statuscode))}
                      </Badge>
                    </span>
                    <span>
                      <Badge tone={act.dga_project_phase === 776140001 ? 'success' : 'info'}>
                        {phaseLabel(Number(act.dga_project_phase))}
                      </Badge>
                    </span>
                    <button
                      aria-expanded={isExpanded}
                      aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${act.dga_name || 'activity'}`}
                      className="activities-grid__expand"
                      onClick={(event) => {
                        event.stopPropagation()
                        toggleExpanded(activityId)
                      }}
                      type="button"
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>

                  {isExpanded ? (
                    <div className="activities-grid__details">
                      <div className="activities-grid__details-stack activities-grid__details-stack--summary">
                        <div className="activities-grid__details-panel activities-grid__details-panel--ai">
                          <div className="activities-grid__ai-heading">
                            <span className="activities-grid__ai-icon" aria-hidden="true">
                              <Sparkles size={15} />
                            </span>
                            <span>AI Summary</span>
                          </div>
                          <p>{activitySummary(act)}</p>
                        </div>
                        <div className="activities-grid__details-panel activities-grid__details-panel--summary">
                          <span>Activity Description</span>
                          <p>{activitySummary(act)}</p>
                          <span>Scope</span>
                          <p>{activityScope(act)}</p>
                        </div>
                      </div>
                      <div className="activities-grid__details-panel activities-grid__details-panel--timeline">
                        <span>Timeline</span>
                        <dl>
                          <div className="activities-grid__details-inline">
                            <div><dt>Start</dt><dd>{act.dga_planned_start_date ? formatDate(act.dga_planned_start_date) : '—'}</dd></div>
                            <div><dt>End</dt><dd>{act.dga_planned_end_date ? formatDate(act.dga_planned_end_date) : '—'}</dd></div>
                          </div>
                        </dl>
                        <div className="activities-grid__yes-no-section">
                          <span>Readiness Flags</span>
                          <dl>
                            <div><dt>EPM Registered</dt><dd>{yesNoLabel(act.dga_registered_or_will_be_registered_in_epm)}</dd></div>
                            <div><dt>ADEO Required</dt><dd>{yesNoLabel(act.dga_adeo_review_required)}</dd></div>
                            <div><dt>Budget Required</dt><dd>{yesNoLabel(act.dga_doesthisprojectrequirebudgetallocation)}</dd></div>
                            <div><dt>Procurement Required</dt><dd>{yesNoLabel(act.dga_does_this_project_require_procurement)}</dd></div>
                          </dl>
                        </div>
                      </div>
                      <div className="activities-grid__details-panel">
                        <span>Planning Details</span>
                        <dl>
                          <div className="activities-grid__details-inline">
                            <div><dt>Project Type</dt><dd>{projectTypeLabel(act.dga_strategic_vs_operation)}</dd></div>
                            <div><dt>Activity Status</dt><dd>{activityStatusLabel(Number(act.dga_project_activity_status))}</dd></div>
                          </div>
                          <div>
                            <dt>Strategies</dt>
                            <dd>
                              {strategies.length > 0 ? (
                                <div className="activities-grid__strategy-chips">
                                  {strategies.map((label) => (
                                    <span className="activities-list__category-chip" key={label}>{label}</span>
                                  ))}
                                </div>
                              ) : '—'}
                            </dd>
                          </div>
                          <div className="activities-grid__details-inline">
                            <div><dt>Total Budget</dt><dd>{formatBudget(act.dga_total_project_budget)}</dd></div>
                            <div><dt>Requested Budget</dt><dd>{formatBudget(act.dga_requested_budget)}</dd></div>
                          </div>
                          <div className="activities-grid__details-inline">
                            <div><dt>Allocated Budget</dt><dd>{formatBudget(act.dga_allocated_budget)}</dd></div>
                            <div><dt>Modified</dt><dd>{act.modifiedon ? formatDate(act.modifiedon) : '—'}</dd></div>
                          </div>
                        </dl>
                      </div>
                    </div>
                  ) : null}
                </article>
              )
            })
          )}
        </div>
      </section>

      <div className="data-grid activities-list__legacy-grid" aria-hidden="true" style={{ position: 'relative' }}>
        <table>
          <thead>
            <tr>
              <th>
                <div className="activities-list__header-content">
                  <button className="activities-list__sort-btn" onClick={() => handleSort('dga_name')} type="button">
                    <span>Activity Name</span>
                    {getSortIcon('dga_name')}
                  </button>
                  <button
                    className={`activities-list__header-filter-btn${actFilters.dga_name ? ' activities-list__header-filter-btn--active' : ''}`}
                    onClick={(e) => handleOpenFilter('dga_name', e)}
                    type="button"
                    aria-label="Filter by name"
                  >
                    <Filter size={11} />
                  </button>
                </div>
              </th>
              <th>
                <div className="activities-list__header-content">
                  <button className="activities-list__sort-btn" onClick={() => handleSort('dga_sectorname')} type="button">
                    <span>Sector</span>
                    {getSortIcon('dga_sectorname')}
                  </button>
                  <button
                    className={`activities-list__header-filter-btn${actFilters.dga_sectorname ? ' activities-list__header-filter-btn--active' : ''}`}
                    onClick={(e) => handleOpenFilter('dga_sectorname', e)}
                    type="button"
                    aria-label="Filter by sector"
                  >
                    <Filter size={11} />
                  </button>
                </div>
              </th>
              <th>
                <div className="activities-list__header-content">
                  <button className="activities-list__sort-btn" onClick={() => handleSort('dga_departmentname')} type="button">
                    <span>Division</span>
                    {getSortIcon('dga_departmentname')}
                  </button>
                  <button
                    className={`activities-list__header-filter-btn${actFilters.dga_departmentname ? ' activities-list__header-filter-btn--active' : ''}`}
                    onClick={(e) => handleOpenFilter('dga_departmentname', e)}
                    type="button"
                    aria-label="Filter by division"
                  >
                    <Filter size={11} />
                  </button>
                </div>
              </th>
              <th>
                <div className="activities-list__header-content">
                  <button className="activities-list__sort-btn" onClick={() => handleSort('dga_registered_or_will_be_registered_in_epm')} type="button">
                    <span>EPM</span>
                    {getSortIcon('dga_registered_or_will_be_registered_in_epm')}
                  </button>
                  <button
                    className={`activities-list__header-filter-btn${actFilters.dga_registered_or_will_be_registered_in_epm ? ' activities-list__header-filter-btn--active' : ''}`}
                    onClick={(e) => handleOpenFilter('dga_registered_or_will_be_registered_in_epm', e)}
                    type="button"
                    aria-label="Filter by EPM"
                  >
                    <Filter size={11} />
                  </button>
                </div>
              </th>
              <th>
                <div className="activities-list__header-content">
                  <button className="activities-list__sort-btn" onClick={() => handleSort('dga_adeo_review_required')} type="button">
                    <span>ADEO</span>
                    {getSortIcon('dga_adeo_review_required')}
                  </button>
                  <button
                    className={`activities-list__header-filter-btn${actFilters.dga_adeo_review_required ? ' activities-list__header-filter-btn--active' : ''}`}
                    onClick={(e) => handleOpenFilter('dga_adeo_review_required', e)}
                    type="button"
                    aria-label="Filter by ADEO"
                  >
                    <Filter size={11} />
                  </button>
                </div>
              </th>
              <th>
                <div className="activities-list__header-content">
                  <button className="activities-list__sort-btn" onClick={() => handleSort('dga_doesthisprojectrequirebudgetallocation')} type="button">
                    <span>Budget</span>
                    {getSortIcon('dga_doesthisprojectrequirebudgetallocation')}
                  </button>
                  <button
                    className={`activities-list__header-filter-btn${actFilters.dga_doesthisprojectrequirebudgetallocation ? ' activities-list__header-filter-btn--active' : ''}`}
                    onClick={(e) => handleOpenFilter('dga_doesthisprojectrequirebudgetallocation', e)}
                    type="button"
                    aria-label="Filter by budget"
                  >
                    <Filter size={11} />
                  </button>
                </div>
              </th>
              <th>
                <div className="activities-list__header-content">
                  <button className="activities-list__sort-btn" onClick={() => handleSort('dga_does_this_project_require_procurement')} type="button">
                    <span>Procurement</span>
                    {getSortIcon('dga_does_this_project_require_procurement')}
                  </button>
                  <button
                    className={`activities-list__header-filter-btn${actFilters.dga_does_this_project_require_procurement ? ' activities-list__header-filter-btn--active' : ''}`}
                    onClick={(e) => handleOpenFilter('dga_does_this_project_require_procurement', e)}
                    type="button"
                    aria-label="Filter by procurement"
                  >
                    <Filter size={11} />
                  </button>
                </div>
              </th>
              <th>
                <div className="activities-list__header-content">
                  <button className="activities-list__sort-btn" onClick={() => handleSort('dga_project_categorized_under')} type="button">
                    <span>Categorized</span>
                    {getSortIcon('dga_project_categorized_under')}
                  </button>
                  <button
                    className={`activities-list__header-filter-btn${actFilters.dga_project_categorized_under ? ' activities-list__header-filter-btn--active' : ''}`}
                    onClick={(e) => handleOpenFilter('dga_project_categorized_under', e)}
                    type="button"
                    aria-label="Filter by categorized strategy"
                  >
                    <Filter size={11} />
                  </button>
                </div>
              </th>
              <th>
                <div className="activities-list__header-content">
                  <button className="activities-list__sort-btn" onClick={() => handleSort('pending_with')} type="button">
                    <span>Pending With</span>
                    {getSortIcon('pending_with')}
                  </button>
                  <button
                    className={`activities-list__header-filter-btn${actFilters.pending_with ? ' activities-list__header-filter-btn--active' : ''}`}
                    onClick={(e) => handleOpenFilter('pending_with', e)}
                    type="button"
                    aria-label="Filter by pending with"
                  >
                    <Filter size={11} />
                  </button>
                </div>
              </th>
              <th>
                <div className="activities-list__header-content">
                  <button className="activities-list__sort-btn" onClick={() => handleSort('statuscode')} type="button">
                    <span>Approval Status</span>
                    {getSortIcon('statuscode')}
                  </button>
                  <button
                    className={`activities-list__header-filter-btn${actFilters.statuscode ? ' activities-list__header-filter-btn--active' : ''}`}
                    onClick={(e) => handleOpenFilter('statuscode', e)}
                    type="button"
                    aria-label="Filter by approval status"
                  >
                    <Filter size={11} />
                  </button>
                </div>
              </th>
              <th>
                <div className="activities-list__header-content">
                  <button className="activities-list__sort-btn" onClick={() => handleSort('dga_project_phase')} type="button">
                    <span>Phase</span>
                    {getSortIcon('dga_project_phase')}
                  </button>
                  <button
                    className={`activities-list__header-filter-btn${actFilters.dga_project_phase ? ' activities-list__header-filter-btn--active' : ''}`}
                    onClick={(e) => handleOpenFilter('dga_project_phase', e)}
                    type="button"
                    aria-label="Filter by phase"
                  >
                    <Filter size={11} />
                  </button>
                </div>
              </th>
              <th>
                <div className="activities-list__header-content">
                  <button className="activities-list__sort-btn" onClick={() => handleSort('dga_project_activity_status')} type="button">
                    <span>Activity Status</span>
                    {getSortIcon('dga_project_activity_status')}
                  </button>
                  <button
                    className={`activities-list__header-filter-btn${actFilters.dga_project_activity_status ? ' activities-list__header-filter-btn--active' : ''}`}
                    onClick={(e) => handleOpenFilter('dga_project_activity_status', e)}
                    type="button"
                    aria-label="Filter by activity status"
                  >
                    <Filter size={11} />
                  </button>
                </div>
              </th>
              <th>
                <div className="activities-list__header-content">
                  <button className="activities-list__sort-btn" onClick={() => handleSort('dga_total_project_budget')} type="button">
                    <span>Total Budget</span>
                    {getSortIcon('dga_total_project_budget')}
                  </button>
                  <button
                    className={`activities-list__header-filter-btn${actFilters.dga_total_project_budget ? ' activities-list__header-filter-btn--active' : ''}`}
                    onClick={(e) => handleOpenFilter('dga_total_project_budget', e)}
                    type="button"
                    aria-label="Filter by total budget"
                  >
                    <Filter size={11} />
                  </button>
                </div>
              </th>
              <th>
                <div className="activities-list__header-content">
                  <button className="activities-list__sort-btn" onClick={() => handleSort('dga_allocated_budget')} type="button">
                    <span>Allocated Budget</span>
                    {getSortIcon('dga_allocated_budget')}
                  </button>
                  <button
                    className={`activities-list__header-filter-btn${actFilters.dga_allocated_budget ? ' activities-list__header-filter-btn--active' : ''}`}
                    onClick={(e) => handleOpenFilter('dga_allocated_budget', e)}
                    type="button"
                    aria-label="Filter by allocated budget"
                  >
                    <Filter size={11} />
                  </button>
                </div>
              </th>
              <th>
                <div className="activities-list__header-content">
                  <button className="activities-list__sort-btn" onClick={() => handleSort('dga_requested_budget')} type="button">
                    <span>Requested Budget</span>
                    {getSortIcon('dga_requested_budget')}
                  </button>
                  <button
                    className={`activities-list__header-filter-btn${actFilters.dga_requested_budget ? ' activities-list__header-filter-btn--active' : ''}`}
                    onClick={(e) => handleOpenFilter('dga_requested_budget', e)}
                    type="button"
                    aria-label="Filter by requested budget"
                  >
                    <Filter size={11} />
                  </button>
                </div>
              </th>
              <th>
                <div className="activities-list__header-content">
                  <button className="activities-list__sort-btn" onClick={() => handleSort('dga_planned_start_date')} type="button">
                    <span>Start Date</span>
                    {getSortIcon('dga_planned_start_date')}
                  </button>
                  <button
                    className={`activities-list__header-filter-btn${actFilters.dga_planned_start_date ? ' activities-list__header-filter-btn--active' : ''}`}
                    onClick={(e) => handleOpenFilter('dga_planned_start_date', e)}
                    type="button"
                    aria-label="Filter by start date"
                  >
                    <Filter size={11} />
                  </button>
                </div>
              </th>
              <th>
                <div className="activities-list__header-content">
                  <button className="activities-list__sort-btn" onClick={() => handleSort('dga_planned_end_date')} type="button">
                    <span>End Date</span>
                    {getSortIcon('dga_planned_end_date')}
                  </button>
                  <button
                    className={`activities-list__header-filter-btn${actFilters.dga_planned_end_date ? ' activities-list__header-filter-btn--active' : ''}`}
                    onClick={(e) => handleOpenFilter('dga_planned_end_date', e)}
                    type="button"
                    aria-label="Filter by end date"
                  >
                    <Filter size={11} />
                  </button>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              renderSkeletonRows()
            ) : activities.length === 0 ? (
              <tr>
                <td colSpan={17}>
                  <EmptyState
                    description="Try adjusting your search or filter criteria."
                    title="No activities found"
                  />
                </td>
              </tr>
            ) : (
              activities.map((act) => (
                <tr key={act.dga_aop_projectsid}>
                  <td className="activities-list__category-cell">
                    <button
                      className="activities-list__name-link"
                      onClick={() => navigate(`${APP_ROUTE_PATHS.editActivity}?id=${act.dga_aop_projectsid}`)}
                      type="button"
                    >
                      {act.dga_name}
                    </button>
                  </td>
                  <td>{getLookupName(act._dga_sector_value, hierarchyNameById)}</td>
                  <td>{getLookupName(act._dga_department_value, hierarchyNameById)}</td>
                  <td>
                    <Badge tone={act.dga_registered_or_will_be_registered_in_epm ? 'success' : 'neutral'}>
                      {act.dga_registered_or_will_be_registered_in_epm ? 'Yes' : 'No'}
                    </Badge>
                  </td>
                  <td>
                    <Badge tone={act.dga_adeo_review_required ? 'warning' : 'neutral'}>
                      {act.dga_adeo_review_required ? 'Yes' : 'No'}
                    </Badge>
                  </td>
                  <td>
                    <Badge tone={act.dga_doesthisprojectrequirebudgetallocation ? 'info' : 'neutral'}>
                      {act.dga_doesthisprojectrequirebudgetallocation ? 'Yes' : 'No'}
                    </Badge>
                  </td>
                  <td>
                    <Badge tone={act.dga_does_this_project_require_procurement === 1 ? 'warning' : 'neutral'}>
                      {act.dga_does_this_project_require_procurement === 1 ? 'Yes' : 'No'}
                    </Badge>
                  </td>
                  <td>
                    {getCategorizedLabels(act).length > 0 ? (
                      <div className="activities-list__category-chips">
                        {getCategorizedLabels(act).map((label) => (
                          <span className="activities-list__category-chip" key={label}>
                            {label}
                          </span>
                        ))}
                      </div>
                    ) : '—'}
                  </td>
                  <td>{getPendingWith(act, ownerNameById)}</td>
                  <td>
                    <Badge tone={statusCodeTone(Number(act.statuscode))}>
                      {statusCodeLabel(Number(act.statuscode))}
                    </Badge>
                  </td>
                  <td>
                    <Badge tone={act.dga_project_phase === 776140001 ? 'success' : 'info'}>
                      {phaseLabel(Number(act.dga_project_phase))}
                    </Badge>
                  </td>
                  <td>
                    <Badge tone={activityStatusTone(Number(act.dga_project_activity_status))}>
                      {activityStatusLabel(Number(act.dga_project_activity_status))}
                    </Badge>
                  </td>
                  <td className="activities-list__budget">{formatBudget(act.dga_total_project_budget)}</td>
                  <td className="activities-list__budget">{formatBudget(act.dga_allocated_budget)}</td>
                  <td className="activities-list__budget">{formatBudget(act.dga_requested_budget)}</td>
                  <td>{act.dga_planned_start_date ? formatDate(act.dga_planned_start_date) : '—'}</td>
                  <td>{act.dga_planned_end_date ? formatDate(act.dga_planned_end_date) : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── Inline Column Filter Popover (DependenciesTab pattern) ── */}
      {openFilterColumn ? (() => {
        const config = COLUMN_FILTER_CONFIG[openFilterColumn]
        if (!config) return null

        return (
          <div
            className="activities-list__col-filter-popover"
            ref={filterPopoverRef}
            style={{ position: 'fixed', top: filterPopoverPos.top, left: filterPopoverPos.left }}
          >
            {config.type === 'multi' ? (
              <div className="edit-activity__deps-filter-section">
                <div className="edit-activity__deps-filter-checkbox-group">
                  {config.options?.map((opt) => (
                    <label key={opt.value} className="edit-activity__deps-filter-checkbox-label">
                      <input
                        type="checkbox"
                        checked={editMultiVals.includes(opt.value)}
                        onChange={() => {
                          setEditMultiVals((prev) =>
                            prev.includes(opt.value)
                              ? prev.filter((v) => v !== opt.value)
                              : [...prev, opt.value]
                          )
                        }}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : config.type === 'boolean' ? (
              <div className="edit-activity__deps-filter-section">
                <Select
                  id={`filter-val-${openFilterColumn}`}
                  hideLabel
                  label="Value"
                  value={editFilterVal}
                  onChange={(value) => setEditFilterVal(value)}
                  options={[
                    { label: 'All', value: '' },
                    { label: 'Yes', value: 'true' },
                    { label: 'No', value: 'false' },
                  ]}
                />
              </div>
            ) : (
              <div className="edit-activity__deps-filter-section">
                <Select
                  id={`filter-op-${openFilterColumn}`}
                  hideLabel
                  label="Operator"
                  onChange={(val) => setEditFilterOp(val as FilterOperator)}
                  options={(config.type === 'number' ? NUMBER_OPERATORS : config.type === 'date' ? DATE_OPERATORS : TEXT_OPERATORS).map((op) => ({
                    label: OPERATOR_LABELS[op],
                    value: op,
                  }))}
                  value={editFilterOp}
                />
                {config.type === 'date' ? (
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
                    type={config.type === 'number' ? 'number' : 'text'}
                  />
                )}
              </div>
            )}
            <div className="edit-activity__deps-filter-actions">
              <button className="edit-activity__deps-filter-cancel" onClick={handleCancelFilter} type="button">Cancel</button>
              <button className="edit-activity__deps-filter-apply" onClick={handleApplyFilter} type="button">Apply</button>
            </div>
          </div>
        )
      })() : null}

      {/* ── Clear All Column Filters ── */}
      {Object.keys(actFilters).length > 0 ? (
        <div className="activities-list__clear-filters">
          <button onClick={handleClearAllColumnFilters} type="button">
            <X size={13} />
            <span>Clear all filters</span>
          </button>
        </div>
      ) : null}

      {/* ── Pagination ── */}
      {totalCount > 0 ? (
        <div className="activities-list__pagination">
          <span className="activities-list__pagination-info">
            {isLoading ? (
              'Loading...'
            ) : (
              <>
                Showing <strong>{rangeStart}–{rangeEnd}</strong> of <strong>{totalCount}</strong> {totalCount === 1 ? 'activity' : 'activities'}
              </>
            )}
          </span>
          {viewMode === 'pagination' && showPagination ? (
          <div className="activities-list__pagination-controls">
            <button
              className="activities-list__page-btn"
              disabled={currentPage <= 1 || isLoading}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              type="button"
              aria-label="Previous page"
            >
              <ChevronLeft size={15} />
            </button>
            <div className="activities-list__page-numbers">
              {(() => {
                const pages: (number | 'ellipsis')[] = []
                const total = totalPages
                const current = currentPage
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
                    <span className="activities-list__page-ellipsis" key={`ellipsis-${idx}`}>...</span>
                  ) : (
                    <button
                      key={page}
                      className={`activities-list__page-num${page === current ? ' activities-list__page-num--active' : ''}`}
                      disabled={isLoading}
                      onClick={() => setCurrentPage(page)}
                      type="button"
                    >
                      {page}
                    </button>
                  ),
                )
              })()}
            </div>
            <button
              className="activities-list__page-btn"
              disabled={currentPage >= totalPages || isLoading}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              type="button"
              aria-label="Next page"
            >
              <ChevronRight size={15} />
            </button>
          </div>
          ) : null}
        </div>
      ) : null}

      {viewMode === 'lazy' && showLoadMore ? (
        <div className="activities-list__sentinel" ref={lazySentinelRef} aria-hidden="true">
          <span className="activities-list__sentinel-dot" />
          <span className="activities-list__sentinel-dot" />
          <span className="activities-list__sentinel-dot" />
        </div>
      ) : viewMode === 'lazy' && totalCount > 0 ? (
        <div className="activities-list__sentinel--done" aria-hidden="true">
          <Check size={13} />
          <span>All {totalCount} {totalCount === 1 ? 'activity' : 'activities'} loaded</span>
        </div>
      ) : null}
    </div>
  )
}
