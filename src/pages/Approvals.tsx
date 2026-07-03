import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  LayoutList,
  Rows,
  Sparkles,
} from 'lucide-react'
import { Badge, Button, ConfirmationDialog, EmptyState, SearchInput, Select, type SelectOption } from '../components/ui'
import type { Dga_project_planning_instances } from '../generated/models/Dga_project_planning_instancesModel'
import { Dga_aop_projectsesService } from '../generated/services/Dga_aop_projectsesService'
import { Dga_project_planning_instancesService } from '../generated/services/Dga_project_planning_instancesService'
import { SystemusersService } from '../generated/services/SystemusersService'
import { TeamsService } from '../generated/services/TeamsService'
import {
  Dga_aop_projectsesdga_project_categorized_under,
  type Dga_aop_projectsesBase,
  type Dga_aop_projectses,
} from '../generated/models/Dga_aop_projectsesModel'
import type { Systemusers } from '../generated/models/SystemusersModel'
import type { Teams } from '../generated/models/TeamsModel'
import { APP_ROUTE_PATHS } from '../routes/appRoutes'
import { fetchPlanningInstances } from '../store/appSlice'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { getResultValue } from './editActivity/helpers/activityInfoHelpers'
import { formatDate } from './editActivity/helpers/sharedHelpers'
import { getResultArray, validatePersistedActivitySubmission } from './editActivity/helpers/submissionValidation'
import '../styles/approvals.css'

type ApprovalPhase = 'Planning' | 'Execution'
type ApprovalBucket = 'to-approve' | 'approved'

type ApprovalRecord = {
  id: string
  planningInstanceId: string
  statusCode: number
  activityName: string
  sector: string
  division: string
  projectPhase: ApprovalPhase
  projectType: 'New' | 'Ongoing' | 'Operational'
  epmRegistered: boolean
  budgetRequired: boolean
  procurementRequired: boolean
  approvalStatus: string
  approvalBucket: ApprovalBucket
  pendingWith: string
  activityLead: string
  plannedStartDate: string
  plannedEndDate: string
  activityStatus: string
  summary: string
  scope: string
  strategies: string
  adeoRequired: boolean
  totalBudget: string
  requestedBudget: string
  createdOn: string
  modifiedOn: string
}

type ApprovalUpdatePayload = Partial<Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid'>> & {
  'ownerid@odata.bind'?: string
}

const PAGE_SIZE = 8
const LAZY_BATCH_SIZE = 8

const PHASE_OPTIONS: SelectOption<string>[] = [
  { label: 'All phases', value: '' },
  { label: 'Planning', value: 'Planning' },
  { label: 'Execution', value: 'Execution' },
]

const APPROVAL_OPTIONS: SelectOption<string>[] = [
  { label: 'All approvals', value: '' },
  { label: 'To Approve', value: 'to-approve' },
  { label: 'Approved', value: 'approved' },
]

const VALIDATION_SECTION_LABELS: Record<string, string> = {
  'activity-info': 'Activity Information',
  objectives: 'Objectives',
  milestones: 'Milestones',
  procurements: 'Procurement',
  budget: 'Budget',
}

const APPROVAL_STATUS_BY_ROLE: Array<{ match: string; statusCode: number }> = [
  { match: 'division director', statusCode: 776140001 },
  { match: 'strategy team', statusCode: 776140003 },
  { match: 'executive director', statusCode: 776140002 },
  { match: 'director general', statusCode: 776140014 },
]

const APPROVAL_PROJECT_SELECT = [
  'dga_aop_projectsid',
  'dga_name',
  '_dga_sector_value',
  '_dga_department_value',
  'dga_project_phase',
  'dga_project_type',
  'statuscode',
  '_owningteam_value',
  '_owninguser_value',
  '_dga_project_planning_instance_value',
  '_dga_activity_lead_value',
  'dga_registered_or_will_be_registered_in_epm',
  'dga_doesthisprojectrequirebudgetallocation',
  'dga_does_this_project_require_procurement',
  'dga_adeo_review_required',
  'dga_planned_start_date',
  'dga_planned_end_date',
  'dga_project_activity_status',
  'dga_description_summary',
  'dga_scope',
  'dga_project_categorized_under',
  'dga_total_project_budget',
  'dga_requested_budget',
  'createdon',
  'modifiedon',
]

const STATUS_CODE_MAP: Record<number, { label: string; tone: 'neutral' | 'info' | 'warning' | 'success' }> = {
  1: { label: 'Draft', tone: 'neutral' },
  776140001: { label: 'Division Director Review', tone: 'warning' },
  776140003: { label: 'Strategy Team Review', tone: 'info' },
  2: { label: 'Inactive', tone: 'neutral' },
  776140004: { label: 'Pending Executive Director Submission', tone: 'warning' },
  776140002: { label: 'Executive Director Review', tone: 'warning' },
  776140014: { label: 'Director General Review', tone: 'warning' },
  776140011: { label: 'Active', tone: 'success' },
  776140012: { label: 'Pending Clarification', tone: 'warning' },
  776140015: { label: 'Deleted', tone: 'neutral' },
}

const ACTIVITY_STATUS_MAP: Record<number, string> = {
  776140014: 'Draft',
  776140007: 'Not Started',
  776140005: 'In Progress (Delayed)',
  776140006: 'In Progress (On Track)',
  776140009: 'On Hold',
  776140010: 'Cancelled',
  776140013: 'Completed',
  776140015: 'Submitted for Approval',
}

const PROJECT_PHASE_MAP: Record<number, ApprovalPhase> = {
  776140000: 'Planning',
  776140001: 'Execution',
}

const PROJECT_TYPE_MAP: Record<number, ApprovalRecord['projectType']> = {
  1: 'New',
  2: 'Ongoing',
  3: 'Operational',
}

const CATEGORIZED_LABEL_BY_VALUE = Object
  .entries(Dga_aop_projectsesdga_project_categorized_under)
  .reduce<Record<string, string>>((map, [value, label]) => {
    map[value] = label
    return map
  }, {})

function getStatusTone(status: string): 'neutral' | 'info' | 'warning' | 'success' {
  const normalized = status.toLowerCase()
  if (normalized.includes('active') || normalized.includes('approved')) return 'success'
  if (normalized.includes('review') || normalized.includes('submitted')) return 'warning'
  if (normalized.includes('clarification')) return 'info'
  return 'neutral'
}

function yesNoLabel(value: boolean) {
  return value ? 'Yes' : 'No'
}

function normalizeId(id?: string | null) {
  return id?.replace(/[{}]/g, '').toLowerCase() ?? ''
}

function normalizeRoleName(roleName: string) {
  return roleName
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s+role$/i, '')
    .trim()
}

function toEntityBind(entitySetName: string, id: string) {
  return `/${entitySetName}(${normalizeId(id)})`
}

function escapeODataValue(value: string) {
  return value.replace(/'/g, "''")
}

function getApprovalStatusForRole(roleName?: string) {
  const normalizedRole = normalizeRoleName(roleName ?? '')
  return APPROVAL_STATUS_BY_ROLE.find((role) => normalizedRole.includes(role.match))?.statusCode
}

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

function getCategorizedLabels(project: Dga_aop_projectses) {
  const labels = parseCategorizedValues(project.dga_project_categorized_under)
    .map((value) => CATEGORIZED_LABEL_BY_VALUE[value] ?? value)

  return labels.length > 0 ? labels.join(', ') : '—'
}

function formatAmount(value?: number | null) {
  if (value == null) return '—'

  return Number(value).toLocaleString('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })
}

function formatCurrencyDetail(value: string) {
  return value === '—' ? '—' : `AED ${value}`
}

function formatLookupName(lookupId: string | null | undefined, nameById: Record<string, string>) {
  const id = normalizeId(lookupId)
  return id ? nameById[id] || '—' : '—'
}

function getPendingWith(project: Dga_aop_projectses, ownerNameById: Record<string, string>) {
  const ownerTeamId = normalizeId(project._owningteam_value)
  const ownerUserId = normalizeId(project._owninguser_value)

  if (ownerTeamId) return ownerNameById[ownerTeamId] || 'Team'
  if (ownerUserId) return ownerNameById[ownerUserId] || 'User'

  return '—'
}

async function loadDisplayNameMaps(projects: Dga_aop_projectses[]) {
  const teamIds = Array.from(new Set(projects.map((project) => normalizeId(project._owningteam_value)).filter(Boolean)))
  const userIds = Array.from(new Set(projects.flatMap((project) => [
    normalizeId(project._owninguser_value),
    normalizeId(project._dga_activity_lead_value),
  ]).filter(Boolean)))

  const ownerNameById: Record<string, string> = {}
  const userNameById: Record<string, string> = {}

  if (teamIds.length > 0) {
    const teamsResult = await TeamsService.getAll({
      filter: teamIds.map((id) => `teamid eq '${id}'`).join(' or '),
      select: ['teamid', 'name'],
    })
    assertOperationSuccess(teamsResult, 'Could not load approval owner teams.')

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
    assertOperationSuccess(usersResult, 'Could not load approval users.')

    ;((usersResult.data ?? []) as Systemusers[]).forEach((user) => {
      const userId = normalizeId(user.systemuserid)
      const userName = user.fullname || user.internalemailaddress
      if (userId && userName) {
        ownerNameById[userId] = userName
        userNameById[userId] = userName
      }
    })
  }

  return { ownerNameById, userNameById }
}

function mapProjectToApproval(
  project: Dga_aop_projectses,
  hierarchyNameById: Record<string, string>,
  ownerNameById: Record<string, string>,
  userNameById: Record<string, string>,
): ApprovalRecord {
  const statusCode = Number(project.statuscode)
  const phase = PROJECT_PHASE_MAP[Number(project.dga_project_phase)] ?? 'Planning'

  return {
    id: project.dga_aop_projectsid,
    planningInstanceId: normalizeId(project._dga_project_planning_instance_value),
    statusCode,
    activityName: project.dga_name || project.dga_project_name || 'Untitled activity',
    sector: formatLookupName(project._dga_sector_value, hierarchyNameById),
    division: formatLookupName(project._dga_department_value, hierarchyNameById),
    projectPhase: phase,
    projectType: PROJECT_TYPE_MAP[Number(project.dga_project_type)] ?? 'New',
    epmRegistered: Boolean(project.dga_registered_or_will_be_registered_in_epm),
    budgetRequired: Number(project.dga_doesthisprojectrequirebudgetallocation) === 1,
    procurementRequired: Number(project.dga_does_this_project_require_procurement) === 1,
    approvalStatus: STATUS_CODE_MAP[statusCode]?.label ?? 'Unknown',
    approvalBucket: statusCode === 776140011 ? 'approved' : 'to-approve',
    pendingWith: getPendingWith(project, ownerNameById),
    activityLead: formatLookupName(project._dga_activity_lead_value, userNameById),
    plannedStartDate: project.dga_planned_start_date ?? '',
    plannedEndDate: project.dga_planned_end_date ?? '',
    activityStatus: ACTIVITY_STATUS_MAP[Number(project.dga_project_activity_status)] ?? '—',
    summary: project.dga_description_summary || 'No summary has been provided for this activity.',
    scope: project.dga_scope || 'No scope description has been provided for this activity.',
    strategies: getCategorizedLabels(project),
    adeoRequired: Boolean(project.dga_adeo_review_required),
    totalBudget: formatAmount(project.dga_total_project_budget),
    requestedBudget: formatAmount(project.dga_requested_budget),
    createdOn: project.createdon ?? '',
    modifiedOn: project.modifiedon ?? project.createdon ?? '',
  }
}

export function Approvals() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const currentRole = useAppSelector((state) => state.user.currentRole)
  const divisionalHierarchies = useAppSelector((state) => state.user.divisionalHierarchies)
  const currentRoleDivisionalHierarchy = useAppSelector((state) => state.user.currentRoleDivisionalHierarchy)
  const selectedCycle = useAppSelector((state) => state.app.selectedCycle)
  const planningInstances = useAppSelector((state) => state.app.planningInstances)
  const planningInstancesCycleId = useAppSelector((state) => state.app.planningInstancesCycleId)
  const planningInstancesLoading = useAppSelector((state) => state.app.planningInstancesLoading)
  const [approvals, setApprovals] = useState<ApprovalRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [isApprovalConfirmOpen, setIsApprovalConfirmOpen] = useState(false)
  const [isApproving, setIsApproving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [phaseFilter, setPhaseFilter] = useState('')
  const [approvalFilter, setApprovalFilter] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [expandedIds, setExpandedIds] = useState<string[]>([])
  const [currentPage, setCurrentPage] = useState(1)
  const [viewMode, setViewMode] = useState<'pagination' | 'lazy'>('pagination')
  const [lazyCount, setLazyCount] = useState(LAZY_BATCH_SIZE)
  const [notice, setNotice] = useState('')
  const lazySentinelRef = useRef<HTMLDivElement>(null)

  const roleApprovalStatus = useMemo(() => getApprovalStatusForRole(currentRole?.roleName), [currentRole?.roleName])
  const hasApprovalQueue = roleApprovalStatus != null
  const hasSelectedCyclePlanningInstances = Boolean(
    selectedCycle && normalizeId(planningInstancesCycleId) === normalizeId(selectedCycle),
  )
  const cyclePlanningInstanceIds = useMemo(() => {
    if (!selectedCycle || !hasSelectedCyclePlanningInstances || planningInstances.length === 0) return []

    return planningInstances
      .filter((planningInstance) => normalizeId(planningInstance._dga_assessment_cycle_value) === normalizeId(selectedCycle))
      .map((planningInstance) => normalizeId(planningInstance.dga_project_planning_instanceid))
      .filter(Boolean)
  }, [hasSelectedCyclePlanningInstances, planningInstances, selectedCycle])
  const isCycleFilterReady = Boolean(
    selectedCycle && hasSelectedCyclePlanningInstances && !planningInstancesLoading,
  )
  const roleHierarchyFilter = useMemo(() => {
    const hierarchyId = normalizeId(currentRoleDivisionalHierarchy?.hierarchyId)
    if (!hierarchyId) return ''

    const normalizedRole = normalizeRoleName(currentRole?.roleName ?? '')
    if (normalizedRole.includes('division member') || normalizedRole.includes('division director')) {
      return `_dga_department_value eq ${hierarchyId}`
    }
    if (normalizedRole.includes('executive director')) {
      return `_dga_sector_value eq ${hierarchyId}`
    }

    return ''
  }, [currentRole?.roleName, currentRoleDivisionalHierarchy?.hierarchyId])
  const requiresHierarchyScope = useMemo(() => {
    const normalizedRole = normalizeRoleName(currentRole?.roleName ?? '')
    return normalizedRole.includes('division member')
      || normalizedRole.includes('division director')
      || normalizedRole.includes('executive director')
  }, [currentRole?.roleName])
  const hasRequiredHierarchyScope = !requiresHierarchyScope || Boolean(normalizeId(currentRoleDivisionalHierarchy?.hierarchyId))
  const selectedApprovals = useMemo(
    () => approvals.filter((approval) => selectedIds.includes(approval.id)),
    [approvals, selectedIds],
  )
  const hierarchyNameById = useMemo(() => {
    return divisionalHierarchies.reduce<Record<string, string>>((map, hierarchy) => {
      const id = normalizeId(hierarchy.dga_divisional_hierarchyid)
      if (id) {
        map[id] = hierarchy.dga_name || hierarchy.dga_short_name || '—'
      }
      return map
    }, {})
  }, [divisionalHierarchies])

  const resetGridView = useCallback(() => {
    setCurrentPage(1)
    setLazyCount(LAZY_BATCH_SIZE)
    setSelectedIds([])
    setExpandedIds([])
    setNotice('')
    setActionError('')
  }, [])

  useEffect(() => {
    if (selectedCycle && normalizeId(planningInstancesCycleId) !== normalizeId(selectedCycle)) {
      dispatch(fetchPlanningInstances(selectedCycle))
    }
  }, [dispatch, planningInstancesCycleId, selectedCycle])

  const loadApprovals = useCallback(async () => {
    resetGridView()

    if (!roleApprovalStatus || !selectedCycle) {
      setApprovals([])
      setError(null)
      setLoading(false)
      return
    }

    if (!hasRequiredHierarchyScope) {
      setApprovals([])
      setError(null)
      setLoading(false)
      return
    }

    if (!isCycleFilterReady) {
      setApprovals([])
      setError(null)
      setLoading(true)
      return
    }

    if (cyclePlanningInstanceIds.length === 0) {
      setApprovals([])
      setError(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const filterParts = [
        `statuscode eq ${roleApprovalStatus}`,
        `(${cyclePlanningInstanceIds.map((id) => `_dga_project_planning_instance_value eq ${id}`).join(' or ')})`,
      ]

      if (roleHierarchyFilter) {
        filterParts.push(roleHierarchyFilter)
      }

      const result = await Dga_aop_projectsesService.getAll({
        filter: filterParts.join(' and '),
        orderBy: ['modifiedon desc'],
        select: APPROVAL_PROJECT_SELECT,
      })
      assertOperationSuccess(result, 'Could not load approvals.')

      const projects = ((result.data ?? []) as Dga_aop_projectses[])
      const { ownerNameById, userNameById } = await loadDisplayNameMaps(projects)
      setApprovals(projects.map((project) => mapProjectToApproval(project, hierarchyNameById, ownerNameById, userNameById)))
    } catch (err) {
      console.error('Failed to load approvals:', err)
      setApprovals([])
      setError(err instanceof Error ? err.message : 'Could not load approvals.')
    } finally {
      setLoading(false)
    }
  }, [
    cyclePlanningInstanceIds,
    hasRequiredHierarchyScope,
    hierarchyNameById,
    isCycleFilterReady,
    resetGridView,
    roleApprovalStatus,
    roleHierarchyFilter,
    selectedCycle,
  ])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadApprovals()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadApprovals])

  const filteredApprovals = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase()

    return approvals.filter((approval) => {
      if (phaseFilter && approval.projectPhase !== phaseFilter) return false
      if (approvalFilter && approval.approvalBucket !== approvalFilter) return false

      if (!normalizedSearch) return true

      return [
        approval.activityName,
        approval.sector,
        approval.division,
        approval.approvalStatus,
        approval.pendingWith,
      ].some((value) => value.toLowerCase().includes(normalizedSearch))
    })
  }, [approvalFilter, approvals, phaseFilter, searchQuery])

  const totalCount = filteredApprovals.length
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
  const pageStart = (currentPage - 1) * PAGE_SIZE
  const visibleApprovals = viewMode === 'pagination'
    ? filteredApprovals.slice(pageStart, pageStart + PAGE_SIZE)
    : filteredApprovals.slice(0, lazyCount)
  const visibleIds = visibleApprovals.map((approval) => approval.id)
  const selectedVisibleCount = visibleIds.filter((id) => selectedIds.includes(id)).length
  const allVisibleSelected = visibleIds.length > 0 && selectedVisibleCount === visibleIds.length
  const showPagination = viewMode === 'pagination' && totalCount > PAGE_SIZE
  const showLoadMore = viewMode === 'lazy' && lazyCount < totalCount
  const rangeStart = totalCount > 0 ? (viewMode === 'pagination' ? pageStart + 1 : 1) : 0
  const rangeEnd = viewMode === 'pagination'
    ? Math.min(currentPage * PAGE_SIZE, totalCount)
    : Math.min(lazyCount, totalCount)

  useEffect(() => {
    if (viewMode !== 'lazy') return undefined
    const sentinel = lazySentinelRef.current
    if (!sentinel) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setLazyCount((count) => Math.min(totalCount, count + LAZY_BATCH_SIZE))
        }
      },
      { rootMargin: '120px' },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [totalCount, viewMode])

  function toggleSelected(id: string) {
    setNotice('')
    setActionError('')
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id],
    )
  }

  function toggleVisibleSelection() {
    setNotice('')
    setActionError('')
    setSelectedIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !visibleIds.includes(id))
      }

      return Array.from(new Set([...current, ...visibleIds]))
    })
  }

  function toggleExpanded(id: string) {
    setExpandedIds((current) =>
      current.includes(id) ? current.filter((expandedId) => expandedId !== id) : [...current, id],
    )
  }

  function handleApproveSelected() {
    setNotice('')
    setActionError('')
    if (selectedIds.length > 0 && hasApprovalQueue) {
      setIsApprovalConfirmOpen(true)
    }
  }

  async function resolveTeamByName(teamName: string) {
    const result = await TeamsService.getAll({
      filter: `name eq '${escapeODataValue(teamName)}'`,
      select: ['teamid', 'name'],
      top: 1,
    })
    assertOperationSuccess(result, `Unable to resolve ${teamName} owner.`)

    const team = getResultArray<Teams>(result)[0]
    const teamId = normalizeId(team?.teamid)
    if (!teamId) {
      throw new Error(`${teamName} team could not be found.`)
    }

    return teamId
  }

  async function resolvePlanningTeam(planningInstanceId: string, teamField: '_dga_executive_director_team_value' | '_dga_division_member_team_value') {
    if (!planningInstanceId) {
      throw new Error('Planning instance could not be resolved for the selected activity.')
    }

    const result = await Dga_project_planning_instancesService.get(planningInstanceId, {
      select: [
        'dga_project_planning_instanceid',
        teamField,
      ],
    })
    assertOperationSuccess(result, 'Unable to load owner team from the planning instance.')

    const planningInstance = getResultValue<Dga_project_planning_instances>(result)
    const teamId = normalizeId(planningInstance?.[teamField])
    if (!teamId) {
      throw new Error('Required owner team could not be resolved from the planning instance.')
    }

    return teamId
  }

  async function buildApprovalPayload(approval: ApprovalRecord): Promise<ApprovalUpdatePayload> {
    const normalizedRole = normalizeRoleName(currentRole?.roleName ?? '')

    if (normalizedRole.includes('division director')) {
      return {
        statuscode: 776140003,
        'ownerid@odata.bind': toEntityBind('teams', await resolveTeamByName('AOP - Strategy Team')),
      }
    }

    if (normalizedRole.includes('strategy team')) {
      return {
        statuscode: 776140002,
        'ownerid@odata.bind': toEntityBind('teams', await resolvePlanningTeam(approval.planningInstanceId, '_dga_executive_director_team_value')),
      }
    }

    if (normalizedRole.includes('executive director')) {
      return {
        statuscode: 776140014,
        'ownerid@odata.bind': toEntityBind('teams', await resolveTeamByName('AOP - Director General')),
      }
    }

    if (normalizedRole.includes('director general')) {
      return {
        statuscode: 776140011,
        dga_project_phase: 776140001,
        'ownerid@odata.bind': toEntityBind('teams', await resolvePlanningTeam(approval.planningInstanceId, '_dga_division_member_team_value')),
      }
    }

    throw new Error('No approval transition is configured for the current role.')
  }

  async function handleConfirmBulkApproval() {
    if (isApproving) return
    if (!roleApprovalStatus || selectedApprovals.length === 0) return

    setIsApproving(true)
    setNotice('')
    setActionError('')

    try {
      for (const approval of selectedApprovals) {
        if (approval.statusCode !== roleApprovalStatus) {
          throw new Error(`${approval.activityName}: this activity is no longer in your current approval queue.`)
        }

        const validation = await validatePersistedActivitySubmission(approval.id)
        if (!validation.valid) {
          throw new Error(`${approval.activityName}: ${VALIDATION_SECTION_LABELS[validation.section] ?? 'Validation'} - ${validation.message}`)
        }
      }

      const payloads = await Promise.all(selectedApprovals.map(async (approval) => ({
        approval,
        payload: await buildApprovalPayload(approval),
      })))

      for (const { approval, payload } of payloads) {
        const result = await Dga_aop_projectsesService.update(approval.id, payload)
        assertOperationSuccess(result, `Unable to approve ${approval.activityName}.`)
      }

      const approvedCount = selectedApprovals.length
      setIsApprovalConfirmOpen(false)
      setSelectedIds([])
      setExpandedIds([])
      await loadApprovals()
      setNotice(`${approvedCount} project(s) approved successfully.`)
    } catch (err) {
      console.error('Failed to approve selected activities:', err)
      setIsApprovalConfirmOpen(false)
      setActionError(err instanceof Error ? err.message : 'Unable to approve selected project(s).')
    } finally {
      setIsApproving(false)
    }
  }

  function renderSkeletonRows() {
    return Array.from({ length: PAGE_SIZE }).map((_, rowIndex) => (
      <div className="approvals-grid__row approvals-grid__skeleton-row" key={`approval-skeleton-${rowIndex}`} aria-hidden="true">
        <div className="approvals-grid__select-cell">
          <span className="approvals-grid__skeleton-check" />
        </div>
        <span><span className="approvals-grid__skeleton-bar approvals-grid__skeleton-bar--w70" /></span>
        <span><span className="approvals-grid__skeleton-bar approvals-grid__skeleton-bar--w60" /></span>
        <span><span className="approvals-grid__skeleton-bar approvals-grid__skeleton-bar--w60" /></span>
        <span><span className="approvals-grid__skeleton-bar approvals-grid__skeleton-bar--w45" /></span>
        <span><span className="approvals-grid__skeleton-bar approvals-grid__skeleton-bar--w70" /></span>
        <span><span className="approvals-grid__skeleton-bar approvals-grid__skeleton-bar--w55" /></span>
        <span><span className="approvals-grid__skeleton-bar approvals-grid__skeleton-bar--w35" /></span>
      </div>
    ))
  }

  return (
    <div className="approvals-page">
      <header className="approvals-page__header">
        <div className="approvals-page__header-text">
          <h1>
            Approvals
            <span className="approvals-page__count-badge">{totalCount} Records</span>
          </h1>
          <p>Review submitted AOP activities, inspect key details, and prepare bulk approvals.</p>
        </div>
        <div className="approvals-page__header-actions">
          {selectedIds.length > 0 ? (
            <span className="approvals-page__selected-count">{selectedIds.length} selected</span>
          ) : null}
          <Button disabled={selectedIds.length === 0 || loading || isApproving || !hasApprovalQueue} icon={<FileCheck2 size={16} />} onClick={handleApproveSelected}>
            {isApproving ? 'Approving...' : 'Approve'}
          </Button>
        </div>
      </header>

      {actionError ? (
        <div className="approvals-page__notice approvals-page__notice--error">
          <AlertTriangle size={15} />
          <span>{actionError}</span>
        </div>
      ) : null}

      {notice ? (
        <div className="approvals-page__notice">
          <Check size={15} />
          <span>{notice}</span>
        </div>
      ) : null}

      <section className="approvals-page__toolbar">
        <SearchInput
          label="Search approvals"
          onChange={(event) => {
            setSearchQuery(event.target.value)
            resetGridView()
          }}
          placeholder="Search by activity, sector, division, status..."
          value={searchQuery}
        />
        <Select
          id="approval-phase-filter"
          label="Project Phase"
          onChange={(value) => {
            setPhaseFilter(value)
            resetGridView()
          }}
          options={PHASE_OPTIONS}
          value={phaseFilter}
        />
        <Select
          id="approval-status-filter"
          label="Approval View"
          onChange={(value) => {
            setApprovalFilter(value)
            resetGridView()
          }}
          options={APPROVAL_OPTIONS}
          value={approvalFilter}
        />
        <div className="approvals-page__view-toggle" role="group" aria-label="View mode">
          <button
            className={`approvals-page__view-btn${viewMode === 'pagination' ? ' approvals-page__view-btn--active' : ''}`}
            onClick={() => {
              setViewMode('pagination')
              setCurrentPage(1)
            }}
            type="button"
          >
            <LayoutList size={14} />
            <span>Pages</span>
          </button>
          <button
            className={`approvals-page__view-btn${viewMode === 'lazy' ? ' approvals-page__view-btn--active' : ''}`}
            onClick={() => {
              setViewMode('lazy')
              setLazyCount(LAZY_BATCH_SIZE)
            }}
            type="button"
          >
            <Rows size={14} />
            <span>Scroll</span>
          </button>
        </div>
      </section>

      {error ? (
        <EmptyState
          action={<Button onClick={loadApprovals} variant="secondary">Retry</Button>}
          description={error}
          title="Could not load approvals"
        />
      ) : !hasApprovalQueue ? (
        <EmptyState
          description="No approvals available for this role."
          title="No approval queue"
        />
      ) : (
        <section className="approvals-grid" aria-label="Approvals grid">
          <div className="approvals-grid__head">
            <div className="approvals-grid__select-cell">
              <input
                aria-label="Select visible approvals"
                checked={allVisibleSelected}
                onChange={toggleVisibleSelection}
                type="checkbox"
              />
            </div>
            <span>Activity Name</span>
            <span>Sector</span>
            <span>Division</span>
            <span>Project Phase</span>
            <span>Approval Status</span>
            <span>Pending With</span>
            <span aria-label="Expand row" />
          </div>

          <div className="approvals-grid__body">
            {loading ? (
              renderSkeletonRows()
            ) : visibleApprovals.length === 0 ? (
              <div className="approvals-grid__empty">
                <EmptyState
                  action={(
                    <Button
                      onClick={() => {
                        setSearchQuery('')
                        setPhaseFilter('')
                        setApprovalFilter('')
                        resetGridView()
                      }}
                      variant="secondary"
                    >
                      Clear filters
                    </Button>
                  )}
                  description="Try changing your search or approval filters."
                  title="No approvals found"
                />
              </div>
            ) : visibleApprovals.map((approval) => {
              const isSelected = selectedIds.includes(approval.id)
              const isExpanded = expandedIds.includes(approval.id)

              return (
                <article className={`approvals-grid__record${isExpanded ? ' approvals-grid__record--expanded' : ''}`} key={approval.id}>
                  <div
                    className={`approvals-grid__row${isSelected ? ' approvals-grid__row--selected' : ''}`}
                    onClick={() => toggleExpanded(approval.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        toggleExpanded(approval.id)
                      }
                    }}
                  >
                    <div className="approvals-grid__select-cell">
                      <input
                        aria-label={`Select ${approval.activityName}`}
                        checked={isSelected}
                        onChange={(event) => {
                          event.stopPropagation()
                          toggleSelected(approval.id)
                        }}
                        onClick={(event) => event.stopPropagation()}
                        type="checkbox"
                      />
                    </div>
                    <button
                      className="approvals-grid__name"
                      onClick={(event) => {
                        event.stopPropagation()
                        navigate(`${APP_ROUTE_PATHS.editActivity}?id=${approval.id}`)
                      }}
                      type="button"
                    >
                      <strong>{approval.activityName}</strong>
                    </button>
                    <span>{approval.sector}</span>
                    <span>{approval.division}</span>
                    <span><Badge tone={approval.projectPhase === 'Planning' ? 'info' : 'success'}>{approval.projectPhase}</Badge></span>
                    <span><Badge tone={getStatusTone(approval.approvalStatus)}>{approval.approvalStatus}</Badge></span>
                    <span>{approval.pendingWith}</span>
                    <button
                      aria-expanded={isExpanded}
                      aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${approval.activityName}`}
                      className="approvals-grid__expand"
                      onClick={(event) => {
                        event.stopPropagation()
                        toggleExpanded(approval.id)
                      }}
                      type="button"
                    >
                      <ChevronDown size={16} />
                    </button>
                  </div>

                  {isExpanded ? (
                    <div className="approvals-grid__details">
                      <div className="approvals-grid__details-stack approvals-grid__details-stack--summary">
                        <div className="approvals-grid__details-panel approvals-grid__details-panel--ai">
                          <div className="approvals-grid__ai-heading">
                            <span className="approvals-grid__ai-icon" aria-hidden="true">
                              <Sparkles size={15} />
                            </span>
                            <span>AI Summary</span>
                          </div>
                          <p>{approval.summary}</p>
                        </div>
                        <div className="approvals-grid__details-panel approvals-grid__details-panel--summary">
                          <span>Activity Summary</span>
                          <p>{approval.summary}</p>
                          <span>Scope</span>
                          <p>{approval.scope}</p>
                        </div>
                      </div>
                      <div className="approvals-grid__details-panel approvals-grid__details-panel--timeline">
                        <span>Timeline</span>
                        <dl>
                          <div className="approvals-grid__details-inline">
                            <div><dt>Start</dt><dd>{formatDate(approval.plannedStartDate)}</dd></div>
                            <div><dt>End</dt><dd>{formatDate(approval.plannedEndDate)}</dd></div>
                          </div>
                        </dl>
                        <div className="approvals-grid__yes-no-section">
                          <span>Readiness Flags</span>
                          <dl>
                            <div><dt>EPM Registered</dt><dd>{yesNoLabel(approval.epmRegistered)}</dd></div>
                            <div><dt>Budget Required</dt><dd>{yesNoLabel(approval.budgetRequired)}</dd></div>
                            <div><dt>Procurement Required</dt><dd>{yesNoLabel(approval.procurementRequired)}</dd></div>
                            <div><dt>ADEO Required</dt><dd>{yesNoLabel(approval.adeoRequired)}</dd></div>
                          </dl>
                        </div>
                      </div>
                      <div className="approvals-grid__details-panel">
                        <span>Planning Details</span>
                        <dl>
                          <div className="approvals-grid__details-inline">
                            <div><dt>Project Type</dt><dd>{approval.projectType}</dd></div>
                            <div><dt>Activity Status</dt><dd>{approval.activityStatus}</dd></div>
                          </div>
                          <div><dt>Strategies</dt><dd>{approval.strategies}</dd></div>
                          <div className="approvals-grid__details-inline">
                            <div><dt>Total Budget</dt><dd>{formatCurrencyDetail(approval.totalBudget)}</dd></div>
                            <div><dt>Requested Budget</dt><dd>{formatCurrencyDetail(approval.requestedBudget)}</dd></div>
                          </div>
                          <div><dt>Modified</dt><dd>{formatDate(approval.modifiedOn)}</dd></div>
                        </dl>
                      </div>
                    </div>
                  ) : null}
                </article>
              )
            })}
          </div>
        </section>
      )}

      {totalCount > 0 ? (
        <footer className="approvals-page__pagination">
          <span>
            Showing <strong>{rangeStart}-{rangeEnd}</strong> of <strong>{totalCount}</strong> approval{totalCount === 1 ? '' : 's'}
          </span>
          {showPagination ? (
            <div className="approvals-page__pagination-controls">
              <button
                aria-label="Previous page"
                className="approvals-page__page-btn"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                type="button"
              >
                <ChevronLeft size={15} />
              </button>
              <div className="approvals-page__page-numbers">
                {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                  <button
                    className={`approvals-page__page-num${page === currentPage ? ' approvals-page__page-num--active' : ''}`}
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    type="button"
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                aria-label="Next page"
                className="approvals-page__page-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                type="button"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          ) : null}
        </footer>
      ) : null}

      {viewMode === 'lazy' && showLoadMore ? (
        <div className="approvals-page__sentinel" ref={lazySentinelRef} aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      ) : viewMode === 'lazy' && totalCount > 0 ? (
        <div className="approvals-page__sentinel-done">
          <Check size={13} />
          <span>All approvals loaded</span>
        </div>
      ) : null}

      <ConfirmationDialog
        confirmLabel={isApproving ? 'Approving...' : 'Approve'}
        description={`This action will approve ${selectedIds.length} project(s) and move them to the next workflow owner for ${currentRole?.roleName ?? 'the current role'}. Are you sure you want to proceed?`}
        isOpen={isApprovalConfirmOpen}
        onCancel={() => {
          if (!isApproving) setIsApprovalConfirmOpen(false)
        }}
        onConfirm={handleConfirmBulkApproval}
        title="Approve Selected Projects"
      />
    </div>
  )
}
