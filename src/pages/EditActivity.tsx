import {
  ArrowLeft,
  BarChart3,
  Briefcase,
  ClipboardList,
  Edit3,
  FileText,
  Flag,
  GitBranch,
  HelpCircle,
  History,
  Save,
  Send,
  Sparkles,
  Target,
  UserRound,
  UsersRound,
  Wallet,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Badge, Button, type SelectOption } from '../components/ui'
import type { Dga_aop_projectses, Dga_aop_projectsesBase } from '../generated/models/Dga_aop_projectsesModel'
import { Dga_aop_projectsesService } from '../generated/services/Dga_aop_projectsesService'
import { SystemusersService } from '../generated/services/SystemusersService'
import { TeamsService } from '../generated/services/TeamsService'
import type { Systemusers } from '../generated/models/SystemusersModel'
import type { Teams } from '../generated/models/TeamsModel'
import { APP_ROUTE_PATHS } from '../routes/appRoutes'
import { useAppSelector } from '../store/hooks'
import { ActivityInfoTab } from './editActivity/ActivityInfoTab'
import { MembersTab } from './editActivity/MembersTab'
import { DependenciesTab } from './editActivity/DependenciesTab'
import { MilestonesTab } from './editActivity/MilestonesTab'
import { ObjectivesTab, type ObjectiveHeaderAction } from './editActivity/ObjectivesTab'
import { ProcurementTab } from './editActivity/ProcurementTab'
import { BudgetTab, type BudgetHeaderAction } from './editActivity/BudgetTab'
import { ClarificationTab } from './editActivity/ClarificationTab'
import { EngagementPlanTab } from './editActivity/EngagementPlanTab'
import { LogTab } from './editActivity/LogTab'
import {
  assertOperationSuccess,
  buildActivityInfoUpdatePayload,
  getResultValue,
  normalizeControlledRules,
  projectToActivityForm,
  validateForm,
  getRuntimeErrors,
  INITIAL_FORM,
  type ActivityForm,
  type FieldErrors,
} from './editActivity/helpers/activityInfoHelpers'

// ── Types ──

type TabId =
  | 'activity-info'
  | 'members'
  | 'dependencies'
  | 'objectives'
  | 'milestones'
  | 'procurements'
  | 'engagement-plans'
  | 'budget'
  | 'clarifications'
  | 'logs'

type TabConfig = {
  id: TabId
  label: string
  shortLabel: string
  icon: typeof ClipboardList
}

const TABS: TabConfig[] = [
  { id: 'activity-info', label: 'Activity Information', shortLabel: 'Info', icon: ClipboardList },
  { id: 'members', label: 'Members', shortLabel: 'Members', icon: UsersRound },
  { id: 'dependencies', label: 'Dependencies', shortLabel: 'Dependencies', icon: GitBranch },
  { id: 'objectives', label: 'Objectives', shortLabel: 'Objectives', icon: Target },
  { id: 'milestones', label: 'Milestones', shortLabel: 'Milestones', icon: Flag },
  { id: 'procurements', label: 'Procurements', shortLabel: 'Procurements', icon: Briefcase },
  { id: 'engagement-plans', label: 'Engagement Plans', shortLabel: 'Engagement', icon: BarChart3 },
  { id: 'budget', label: 'Budget', shortLabel: 'Budget', icon: Wallet },
  { id: 'clarifications', label: 'Clarifications', shortLabel: 'Clarifications', icon: HelpCircle },
  { id: 'logs', label: 'Logs', shortLabel: 'Logs', icon: History },
]

const ACTIVITY_INFO_SELECT_FIELDS = [
  'dga_aop_projectsid',
  'dga_name',
  'dga_activity_type',
  'dga_activity_classification',
  'dga_strategic_vs_operation',
  'dga_project_categorized_under',
  'dga_doesthisprojectrequirebudgetallocation',
  'dga_does_this_project_require_procurement',
  'dga_adeo_review_required',
  '_dga_activity_lead_value',
  'dga_planned_start_date',
  'dga_planned_end_date',
  'dga_scope',
  'dga_description_summary',
  'dga_project_name',
  'dga_project_description',
  'dga_longtermimpactprojectlongtermimpact',
  'dga_project_long_term_impact',
  'dga_project_overall_long_term_impact',
  'dga_stakeholders',
  'dga_project_kpi',
  'dga_project_plan_if_any',
  'dga_risks',
  '_dga_sector_value',
  '_dga_department_value',
  '_dga_dge_corporate_strategy_pillar_value',
  '_dga_govdigital_pillar_value',
  '_dga_link_to_dge_strategic_objective_value',
  '_dga_link_to_strategic_kpis_value',
  '_owningteam_value',
  '_owninguser_value',
  'statuscode',
  'dga_project_phase',
  'dga_project_activity_status',
]

// ── Status helpers ──

function getStatusTone(status: string): 'neutral' | 'info' | 'warning' | 'success' {
  switch (status) {
    case 'Submitted':
    case 'SubmittedtoDivisionDirector':
      return 'info'
    case 'ApprovedByDivisionDirector':
    case 'ApprovedByStrategyTeam':
    case 'ApprovedByExecutiveDirector':
    case 'ApprovedByDirectorGeneral':
    case 'Active':
      return 'success'
    case 'ClarificationNeeded':
    case 'InProgress_Delayed_':
      return 'warning'
    case 'Cancelled':
    case 'Inactive':
      return 'neutral'
    default:
      return 'neutral'
  }
}

function getTabLockReason(tabId: TabId): string {
  switch (tabId) {
    case 'milestones': return 'Activity classification is Payment Only'
    case 'budget': return 'Budget is not required for this activity'
    case 'procurements': return 'Procurement is not required for this activity'
    case 'dependencies': return 'ADEO reporting is not enabled'
    default: return ''
  }
}

function formatStatusCode(code: number): string {
  const labels: Record<number, string> = {
    1: 'Draft',
    776140001: 'Submitted to Division Director',
    776140002: 'Approved by Executive Director',
    776140003: 'Approved by Division Director',
    776140004: 'Approved by Strategy Team',
    776140011: 'Active',
    776140012: 'Clarification Needed',
    776140014: 'Approved by Director General',
  }
  return labels[code] ?? 'Unknown'
}

function normalizeId(id?: string | null) {
  return id?.replace(/[{}]/g, '').toLowerCase() ?? ''
}


// ── Component ──

export function EditActivity() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('id') ?? ''
  const selectedRole = useAppSelector((state) => state.app.selectedRole)
  const { currentRoleDivisionalHierarchy, divisionalHierarchies: allHierarchies } = useAppSelector((state) => state.user)
  const [activeTab, setActiveTab] = useState<TabId>('activity-info')
  const [activity, setActivity] = useState<Dga_aop_projectses | null>(null)
  const [form, setForm] = useState<ActivityForm>(INITIAL_FORM)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [activityLeadOptions, setActivityLeadOptions] = useState<SelectOption<string>[]>([])
  const [isContextLoading, setIsContextLoading] = useState(true)
  const [isSavingActivityInfo, setIsSavingActivityInfo] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [pendingWith, setPendingWith] = useState('Loading...')
  const [objectiveHeaderAction, setObjectiveHeaderAction] = useState<ObjectiveHeaderAction | null>(null)
  const [budgetHeaderAction, setBudgetHeaderAction] = useState<BudgetHeaderAction | null>(null)

  // ── Loaded activity data ──
  const activityName = activity?.dga_name || form.activityName || 'Edit Activity'
  const aiSummary = activity?.dga_description_summary || form.summary || 'No summary is available for this activity yet.'
  const statusCode = activity?.statuscode ?? 1 // Draft
  const projectPhase = activity?.dga_project_phase ?? 776140000 // Planning
  const isStrategic = form.activityScope === '1'
  const isPaymentOnly = form.activityClassification === '576610002'
  const isBudgetNo = form.budgetRequired === '0'
  const isAdeoVisible = form.adeoReported === '1'

  // ── Tab lock conditions ──
  const tabLocked: Partial<Record<TabId, boolean>> = {
    milestones: isPaymentOnly,
    budget: isBudgetNo,
    procurements: isBudgetNo || form.procurementRequired === '0',
    dependencies: form.adeoReported === '0',
  }

  const activityLeadName = activityLeadOptions.find((o) => o.value === form.activityLeadId)?.label ?? ''
  const isDivisionMember = selectedRole === 'AOP - Division Member'
  const isDivisionDirector = selectedRole === 'AOP - Division Director'

  // ── Context loading ──

  useEffect(() => {
    if (!successMessage) return

    const timeoutId = window.setTimeout(() => {
      setSuccessMessage('')
    }, 10000)

    return () => window.clearTimeout(timeoutId)
  }, [successMessage])

  useEffect(() => {
    let isMounted = true

    async function loadContext() {
      setIsContextLoading(true)
      setSuccessMessage('')
      setPendingWith('Loading...')
      setErrors((currentErrors) => ({ ...currentErrors, context: undefined }))

      if (!projectId) {
        setErrors((currentErrors) => ({
          ...currentErrors,
          context: 'Activity id is missing from the edit URL.',
        }))
        setActivity(null)
        setPendingWith('Not assigned')
        setIsContextLoading(false)
        return
      }

      try {
        const [usersResult, projectResult] = await Promise.all([
          SystemusersService.getAll({
            select: ['systemuserid', 'fullname', 'internalemailaddress']
          }),
          Dga_aop_projectsesService.get(projectId, {
            select: ACTIVITY_INFO_SELECT_FIELDS,
          }),
        ])

        if (!isMounted) return

        assertOperationSuccess(usersResult, 'Failed to load activity leads.')
        assertOperationSuccess(projectResult, 'Failed to load activity information.')
        const project = getResultValue<Dga_aop_projectses>(projectResult)
        

        if (!project) {
          throw new Error('Activity information could not be found.')
        }

        const users = (usersResult?.data ?? []) as Systemusers[]

        const activityLeadUsers = (users ?? [])
          .filter((user) => user.fullname)
          .map((user) => ({
            label: user.fullname!,
            value: user.systemuserid ?? '',
          }))

        const ownerUserId = normalizeId(project._owninguser_value)
        const ownerTeamId = normalizeId(project._owningteam_value)
        let ownerName = ''

        if (ownerTeamId) {
          if (project.owneridname && !ownerUserId) {
            ownerName = project.owneridname
          }

          if (!ownerName) {
            const teamResult = await TeamsService.get(ownerTeamId, {
              select: ['teamid', 'name'],
            })
            assertOperationSuccess(teamResult, 'Failed to load activity owner team.')
            const team = getResultValue<Teams>(teamResult)
            ownerName = team?.name ?? ''
          }
        }

        if (!ownerName && ownerUserId) {
          if (project.owneridname) {
            ownerName = project.owneridname
          }

          if (!ownerName) {
            const ownerUser = users.find((user) => normalizeId(user.systemuserid) === ownerUserId)
            ownerName = ownerUser?.fullname ?? ownerUser?.internalemailaddress ?? ''
          }

          if (!ownerName) {
            const ownerUserResult = await SystemusersService.get(ownerUserId, {
              select: ['systemuserid', 'fullname', 'internalemailaddress'],
            })
            assertOperationSuccess(ownerUserResult, 'Failed to load activity owner user.')
            const ownerUser = getResultValue<Systemusers>(ownerUserResult)
            ownerName = ownerUser?.fullname ?? ownerUser?.internalemailaddress ?? ''
          }
        }

        if (!isMounted) return

        const division = currentRoleDivisionalHierarchy
          ? allHierarchies.find((h) => h.dga_divisional_hierarchyid === currentRoleDivisionalHierarchy.hierarchyId)
          : undefined
        const sector = division?._dga_parent_divisional_hierarchy_value
          ? allHierarchies.find((h) => h.dga_divisional_hierarchyid === division._dga_parent_divisional_hierarchy_value)
          : undefined
        setActivityLeadOptions(activityLeadUsers)
        setPendingWith(ownerName || 'Not assigned')
        setActivity(project)
        setForm(projectToActivityForm(project, {
          sectorId: sector?.dga_divisional_hierarchyid ?? '',
          sectorName: sector?.dga_name ?? '',
          divisionId: division?.dga_divisional_hierarchyid ?? '',
          divisionName: division?.dga_name ?? '',
        }))
      } catch (error) {
        if (isMounted) {
          setErrors({ context: error instanceof Error ? error.message : 'Failed to load context.' })
          setActivity(null)
          setPendingWith('Not assigned')
        }
      } finally {
        if (isMounted) setIsContextLoading(false)
      }
    }

    loadContext()
    return () => { isMounted = false }
  }, [
    allHierarchies,
    currentRoleDivisionalHierarchy,
    projectId,
  ])

  // ── Form handlers ──

  function updateForm(nextFields: Partial<ActivityForm>) {
    const changedFields = Object.keys(nextFields) as Array<keyof ActivityForm>
    const normalizedForm = normalizeControlledRules({ ...form, ...nextFields })

    setSuccessMessage('')
    setForm(normalizedForm)
    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors }
      const allRuntimeErrors = validateForm(normalizedForm)
      const runtimeErrors = getRuntimeErrors(normalizedForm, changedFields)

      Object.keys(INITIAL_FORM).forEach((key) => {
        const field = key as keyof ActivityForm
        if (field in INITIAL_FORM && !allRuntimeErrors[field]) {
          delete nextErrors[field]
        }
      })

      changedFields.forEach((key) => {
        if (runtimeErrors[key]) {
          nextErrors[key] = runtimeErrors[key]
        } else {
          delete nextErrors[key]
        }
      })

      if (changedFields.includes('plannedStartDate') || changedFields.includes('plannedEndDate')) {
        if (runtimeErrors.plannedStartDate) nextErrors.plannedStartDate = runtimeErrors.plannedStartDate
        else delete nextErrors.plannedStartDate
        if (runtimeErrors.plannedEndDate) nextErrors.plannedEndDate = runtimeErrors.plannedEndDate
        else delete nextErrors.plannedEndDate
      }

      delete nextErrors.submit
      return nextErrors
    })
  }

  // ── Action handlers ──

  async function handleSaveActivityInfo() {
    setSuccessMessage('')

    if (!projectId) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        context: 'Activity id is missing from the edit URL.',
      }))
      return
    }

    const nextErrors = validateForm(form)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      setActiveTab('activity-info')
      return
    }

    setIsSavingActivityInfo(true)
    try {
      const payload = buildActivityInfoUpdatePayload(form)
      console.log('Edit activity information payload', payload)
      const result = await Dga_aop_projectsesService.update(
        projectId,
        payload as unknown as Partial<Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid'>>,
      )

      assertOperationSuccess(result, 'Failed to save activity information.')

      setActivity((currentActivity) => currentActivity ? {
        ...currentActivity,
        dga_name: form.activityName.trim(),
        dga_description_summary: form.summary,
        dga_activity_classification: payload.dga_activity_classification ?? currentActivity.dga_activity_classification,
        dga_activity_type: payload.dga_activity_type ?? currentActivity.dga_activity_type,
        dga_adeo_review_required: payload.dga_adeo_review_required ?? currentActivity.dga_adeo_review_required,
        dga_does_this_project_require_procurement: payload.dga_does_this_project_require_procurement ?? currentActivity.dga_does_this_project_require_procurement,
        dga_doesthisprojectrequirebudgetallocation: payload.dga_doesthisprojectrequirebudgetallocation ?? currentActivity.dga_doesthisprojectrequirebudgetallocation,
        dga_planned_end_date: form.plannedEndDate,
        dga_planned_start_date: form.plannedStartDate,
        dga_project_kpi: form.activityKpi,
        dga_scope: form.scopeDescription,
        dga_strategic_vs_operation: payload.dga_strategic_vs_operation ?? currentActivity.dga_strategic_vs_operation,
      } : currentActivity)
      setErrors((currentErrors) => ({ ...currentErrors, submit: undefined }))
      setSuccessMessage('Activity information saved successfully.')
    } catch (error) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        submit: error instanceof Error ? error.message : 'Failed to save activity information.',
      }))
    } finally {
      setIsSavingActivityInfo(false)
    }
  }

  const handleSubmitToDivisionDirector = useCallback(() => {
    // TODO: Implement submit logic
    console.log('Submit to Division Director')
  }, [])

  const handleRequestClarification = useCallback(() => {
    // TODO: Implement clarification request logic
    console.log('Request Clarification')
  }, [])

  // ── Tab content ──

  function renderTabContent() {
    switch (activeTab) {
      case 'activity-info':
        return (
          <ActivityInfoTab
            activityLeadOptions={activityLeadOptions}
            errors={errors}
            form={form}
            isAdeoVisible={isAdeoVisible}
            isBudgetNo={isBudgetNo}
            isPaymentOnly={isPaymentOnly}
            isStrategic={isStrategic}
            updateForm={updateForm}
          />
        )
      case 'members':
        return <MembersTab projectId={projectId} />
      case 'dependencies':
        return <DependenciesTab projectId={projectId} />
      case 'objectives':
        return (
          <ObjectivesTab
            onHeaderActionChange={setObjectiveHeaderAction}
            projectId={projectId}
            statusCode={statusCode}
          />
        )
      case 'milestones':
        return (
          <MilestonesTab
            activityPlannedEndDate={form.plannedEndDate}
            activityPlannedStartDate={form.plannedStartDate}
            isAdeoVisible={isAdeoVisible}
            projectId={projectId}
          />
        )
      case 'procurements':
        return (
          <ProcurementTab
            activityPlannedEndDate={form.plannedEndDate}
            activityPlannedStartDate={form.plannedStartDate}
            activityScope={form.activityScope}
            projectId={projectId}
          />
        )
      case 'engagement-plans':
        return (
          <EngagementPlanTab
            activityLeadName={activityLeadName}
            activityName={activityName}
            activityPlannedEndDate={form.plannedEndDate}
            activityPlannedStartDate={form.plannedStartDate}
            activitySummary={form.summary}
            currentHierarchyId={currentRoleDivisionalHierarchy?.hierarchyId}
            divisionName={form.divisionName}
            hierarchies={allHierarchies}
            projectId={projectId}
            selectedRole={selectedRole}
            sectorName={form.sectorName}
          />
        )
      case 'budget':
        return (
          <BudgetTab
            onHeaderActionChange={setBudgetHeaderAction}
            plannedEndDate={form.plannedEndDate}
            plannedStartDate={form.plannedStartDate}
            projectId={projectId}
            statusCode={statusCode}
          />
        )
      case 'clarifications':
        return <ClarificationTab />
      case 'logs':
        return <LogTab />
    }
  }

  if (isContextLoading) {
    return (
      <div className="create-activity" aria-label="Loading Edit Activity context...">
        {/* Hero header skeleton */}
        <header className="create-activity__hero create-activity__hero--skeleton" aria-hidden="true">
          <div className="edit-activity__back-row">
            <div className="skeleton-button skeleton-shimmer" style={{ width: '9rem' }} />
          </div>
          <div className="create-activity__hero-body">
            <div className="skeleton-icon-box skeleton-shimmer" />
            <div className="create-activity__hero-content">
              <div className="skeleton-line skeleton-shimmer" style={{ width: '28%', height: '0.7rem', marginBottom: '0.15rem' }} />
              <div className="skeleton-line skeleton-shimmer" style={{ width: '45%', height: '1.5rem', marginBottom: '0.15rem' }} />
              <div className="skeleton-line skeleton-shimmer" style={{ width: '55%', height: '0.85rem' }} />
            </div>
          </div>
          <div className="create-activity__hero-footer">
            <div className="create-activity__hero-chips">
              <span className="skeleton-chip skeleton-shimmer" />
              <span className="skeleton-chip skeleton-shimmer" />
              <span className="skeleton-chip skeleton-shimmer" />
            </div>
            <div className="edit-activity__actions">
              <div className="skeleton-button skeleton-shimmer" style={{ width: '7rem' }} />
              <div className="skeleton-button skeleton-shimmer" style={{ width: '6rem' }} />
            </div>
          </div>
        </header>

        {/* Stage tabs skeleton */}
        <div className="edit-activity__stages">
          <nav className="edit-activity__stage-tabs" aria-hidden="true">
            <div className="skeleton-line skeleton-shimmer" style={{ width: '100%', height: '2.35rem', borderRadius: '0.6rem' }} />
          </nav>
        </div>

        {/* Two-column layout skeleton */}
        <div className="create-activity__manual-layout">
          <div className="create-activity__manual-form">
            {/* First card skeleton */}
            <div className="card create-activity__section create-activity__section--skeleton" aria-hidden="true">
              <div className="create-activity__section-header">
                <div className="create-activity__section-header-inner">
                  <div className="skeleton-section-icon skeleton-shimmer" />
                  <div>
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '40%', height: '0.65rem', marginBottom: '0.35rem' }} />
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '55%', height: '0.95rem' }} />
                  </div>
                </div>
              </div>
              <div className="create-activity__form-stack">
                <div className="create-activity__form-row create-activity__form-row--two">
                  <div className="skeleton-field">
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '35%', height: '0.7rem', marginBottom: '0.35rem' }} />
                    <div className="skeleton-input skeleton-shimmer" />
                  </div>
                  <div className="skeleton-field">
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '45%', height: '0.7rem', marginBottom: '0.35rem' }} />
                    <div className="skeleton-input skeleton-shimmer" />
                  </div>
                </div>
                <div className="create-activity__form-row create-activity__form-row--two">
                  <div className="skeleton-field">
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '25%', height: '0.7rem', marginBottom: '0.35rem' }} />
                    <div className="skeleton-input skeleton-shimmer" />
                  </div>
                  <div className="skeleton-field">
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '30%', height: '0.7rem', marginBottom: '0.35rem' }} />
                    <div className="skeleton-input skeleton-shimmer" />
                  </div>
                </div>
                <div className="create-activity__form-row">
                  <div className="skeleton-field">
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '30%', height: '0.7rem', marginBottom: '0.5rem' }} />
                    <div className="skeleton-radio-row">
                      <div className="skeleton-radio skeleton-shimmer" />
                      <div className="skeleton-radio skeleton-shimmer" />
                    </div>
                  </div>
                </div>
                <div className="create-activity__form-row">
                  <div className="skeleton-field">
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '38%', height: '0.7rem', marginBottom: '0.5rem' }} />
                    <div className="skeleton-radio-row">
                      <div className="skeleton-radio skeleton-shimmer" />
                      <div className="skeleton-radio skeleton-shimmer" />
                      <div className="skeleton-radio skeleton-shimmer" />
                    </div>
                  </div>
                </div>
                <div className="create-activity__form-row create-activity__form-row--three">
                  <div className="skeleton-field">
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '55%', height: '0.7rem', marginBottom: '0.5rem' }} />
                    <div className="skeleton-radio-row">
                      <div className="skeleton-radio skeleton-shimmer" />
                      <div className="skeleton-radio skeleton-shimmer" />
                    </div>
                  </div>
                  <div className="skeleton-field">
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '60%', height: '0.7rem', marginBottom: '0.5rem' }} />
                    <div className="skeleton-radio-row">
                      <div className="skeleton-radio skeleton-shimmer" />
                      <div className="skeleton-radio skeleton-shimmer" />
                    </div>
                  </div>
                  <div className="skeleton-field">
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '50%', height: '0.7rem', marginBottom: '0.5rem' }} />
                    <div className="skeleton-radio-row">
                      <div className="skeleton-radio skeleton-shimmer" />
                      <div className="skeleton-radio skeleton-shimmer" />
                    </div>
                  </div>
                </div>
                <div className="create-activity__form-row">
                  <div className="skeleton-field">
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '40%', height: '0.7rem', marginBottom: '0.35rem' }} />
                    <div className="skeleton-input skeleton-shimmer" />
                  </div>
                </div>
                <div className="create-activity__date-range">
                  <div className="skeleton-field">
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '40%', height: '0.7rem', marginBottom: '0.35rem' }} />
                    <div className="skeleton-input skeleton-shimmer" />
                  </div>
                  <div className="skeleton-date-connector skeleton-shimmer" />
                  <div className="skeleton-field">
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '38%', height: '0.7rem', marginBottom: '0.35rem' }} />
                    <div className="skeleton-input skeleton-shimmer" />
                  </div>
                </div>
                <div className="create-activity__form-row create-activity__form-row--two">
                  <div className="skeleton-field">
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '50%', height: '0.7rem', marginBottom: '0.35rem' }} />
                    <div className="skeleton-textarea skeleton-shimmer" />
                  </div>
                  <div className="skeleton-field">
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '30%', height: '0.7rem', marginBottom: '0.35rem' }} />
                    <div className="skeleton-textarea skeleton-shimmer" />
                  </div>
                </div>
              </div>
            </div>

            {/* Second card skeleton (ADEO) */}
            <div className="card create-activity__section create-activity__section--skeleton" aria-hidden="true">
              <div className="create-activity__section-header">
                <div className="create-activity__section-header-inner">
                  <div className="skeleton-section-icon skeleton-shimmer" />
                  <div>
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '35%', height: '0.65rem', marginBottom: '0.35rem' }} />
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '48%', height: '0.95rem' }} />
                  </div>
                </div>
              </div>
              <div className="create-activity__form-stack">
                <div className="create-activity__form-row create-activity__form-row--two">
                  <div className="skeleton-field">
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '30%', height: '0.7rem', marginBottom: '0.35rem' }} />
                    <div className="skeleton-input skeleton-shimmer" />
                  </div>
                  <div className="skeleton-field">
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '30%', height: '0.7rem', marginBottom: '0.35rem' }} />
                    <div className="skeleton-input skeleton-shimmer" />
                  </div>
                </div>
                <div className="create-activity__form-row create-activity__form-row--two">
                  <div className="skeleton-field">
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '35%', height: '0.7rem', marginBottom: '0.35rem' }} />
                    <div className="skeleton-textarea skeleton-shimmer" />
                  </div>
                  <div className="skeleton-field">
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '42%', height: '0.7rem', marginBottom: '0.35rem' }} />
                    <div className="skeleton-textarea skeleton-shimmer" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Guidance panel skeleton */}
          <aside className="create-activity__guidance" aria-hidden="true">
            <div className="create-activity__guidance-card">
              <div className="create-activity__guidance-inner" style={{ padding: '1.15rem' }}>
                <div className="skeleton-guidance-header">
                  <div className="skeleton-guidance-icon skeleton-shimmer" />
                  <div>
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '60%', height: '0.85rem', marginBottom: '0.3rem' }} />
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '45%', height: '0.7rem' }} />
                  </div>
                </div>
                <div className="skeleton-progress-ring skeleton-shimmer" />
                <div className="skeleton-line skeleton-shimmer" style={{ width: '100%', height: '0.75rem' }} />
                <div className="skeleton-guidance-items">
                  <div className="skeleton-line skeleton-shimmer" style={{ width: '75%', height: '0.7rem' }} />
                  <div className="skeleton-line skeleton-shimmer" style={{ width: '60%', height: '0.7rem' }} />
                  <div className="skeleton-line skeleton-shimmer" style={{ width: '80%', height: '0.7rem' }} />
                  <div className="skeleton-line skeleton-shimmer" style={{ width: '50%', height: '0.7rem' }} />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    )
  }

  return (
    <div className="create-activity">
      <header className="create-activity__hero">
        <div className="edit-activity__back-row">
          <Button
            icon={<ArrowLeft size={16} />}
            onClick={() => navigate(APP_ROUTE_PATHS.activitiesList)}
            variant="secondary"
          >
            Back to Activities
          </Button>
        </div>

        <div className="create-activity__hero-body">
          <div className="create-activity__hero-icon" aria-hidden="true">
            <Edit3 size={22} />
          </div>
          <div className="create-activity__hero-content">
            <span>Edit Activity</span>
            <h1>{activityName}</h1>
            <p className="edit-activity__ai-summary">
              <Sparkles size={14} />
              {aiSummary}
            </p>
          </div>
        </div>

        <div className="create-activity__hero-footer">
          <div className="create-activity__hero-chips">
            <span className="create-activity__chip">
              <span className="create-activity__chip-label">Status</span>
              <Badge tone={getStatusTone(formatStatusCode(statusCode))}>
                {formatStatusCode(statusCode)}
              </Badge>
            </span>
            <span className="create-activity__chip">
              <span className="create-activity__chip-label">Phase</span>
              <Badge tone="info">
                {projectPhase === 776140000 ? 'Planning' : 'Execution'}
              </Badge>
            </span>
            <span className="create-activity__chip create-activity__chip--user">
              <span className="create-activity__chip-label">Pending with</span>
              <strong>
                <UserRound size={14} />
                {pendingWith}
              </strong>
            </span>
          </div>

          <div className="edit-activity__actions">
            {activeTab === 'activity-info' ? (
              <Button
                disabled={isSavingActivityInfo || Boolean(errors.context)}
                icon={<Save size={16} />}
                onClick={handleSaveActivityInfo}
              >
                {isSavingActivityInfo ? 'Saving...' : statusCode === 1 ? 'Save Draft' : 'Save Changes'}
              </Button>
            ) : null}
            {activeTab === 'objectives' && objectiveHeaderAction ? (
              <Button
                disabled={!objectiveHeaderAction.canSave || objectiveHeaderAction.isSaving || Boolean(errors.context)}
                icon={<Save size={16} />}
                onClick={objectiveHeaderAction.onSave}
              >
                {objectiveHeaderAction.isSaving ? objectiveHeaderAction.savingLabel : objectiveHeaderAction.label}
              </Button>
            ) : null}
            {activeTab === 'budget' && budgetHeaderAction ? (
              <Button
                disabled={!budgetHeaderAction.canSave || budgetHeaderAction.isSaving || Boolean(errors.context)}
                icon={<Save size={16} />}
                onClick={budgetHeaderAction.onSave}
              >
                {budgetHeaderAction.isSaving ? budgetHeaderAction.savingLabel : budgetHeaderAction.label}
              </Button>
            ) : null}
            {isDivisionMember ? (
              <Button icon={<Send size={16} />} onClick={handleSubmitToDivisionDirector}>
                Submit to Division Director
              </Button>
            ) : null}
            {isDivisionDirector ? (
              <Button icon={<HelpCircle size={16} />} onClick={handleRequestClarification} variant="secondary">
                Request Clarification
              </Button>
            ) : null}
            <Button icon={<FileText size={16} />} variant="ghost" className="edit-activity__card-btn">
              Activity Card
            </Button>
          </div>
        </div>
      </header>

      {successMessage ? (
        <div className="create-activity__notice create-activity__notice--success" role="status">
          {successMessage}
        </div>
      ) : null}

      {errors.submit ? (
        <div className="create-activity__notice create-activity__notice--error" role="alert">
          {errors.submit}
        </div>
      ) : null}

      {/* Premium stage tabs */}
      <div className="edit-activity__stages">
        <nav className="edit-activity__stage-tabs" role="tablist" aria-label="Activity stages">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            const locked = tabLocked[tab.id] ?? false

            return (
              <button
                key={tab.id}
                className={`edit-activity__stage-tab ${isActive ? 'edit-activity__stage-tab--active' : ''} ${locked ? 'edit-activity__stage-tab--locked' : ''}`}
                onClick={() => {
                  if (!locked) setActiveTab(tab.id)
                }}
                role="tab"
                aria-selected={isActive}
                aria-disabled={locked}
                title={locked ? `Locked — ${getTabLockReason(tab.id)}` : tab.label}
                type="button"
              >
                <Icon size={16} />
                <span className="edit-activity__stage-tab-label">{tab.shortLabel}</span>
                <span className="edit-activity__stage-tab-full">{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Stage content */}
      <div className="edit-activity__stage-content" role="tabpanel">
        {renderTabContent()}
      </div>
    </div>
  )
}
