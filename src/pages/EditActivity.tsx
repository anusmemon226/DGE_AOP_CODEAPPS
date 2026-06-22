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
  Send,
  Sparkles,
  Target,
  UserRound,
  UsersRound,
  Wallet,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, type SelectOption } from '../components/ui'
import { type AopRole } from '../constants/app'
import { Dga_divisional_hierarchiesService } from '../generated/services/Dga_divisional_hierarchiesService'
import { Dga_project_planning_instancesService } from '../generated/services/Dga_project_planning_instancesService'
import { SystemusersService } from '../generated/services/SystemusersService'
import type { Dga_divisional_hierarchies } from '../generated/models/Dga_divisional_hierarchiesModel'
import type { Dga_project_planning_instances } from '../generated/models/Dga_project_planning_instancesModel'
import type { Systemusers } from '../generated/models/SystemusersModel'
import { APP_ROUTE_PATHS } from '../routes/appRoutes'
import { useAppSelector } from '../store/hooks'
import { ActivityInfoTab } from './editActivity/ActivityInfoTab'
import { MembersTab } from './editActivity/MembersTab'
import { DependenciesTab } from './editActivity/DependenciesTab'
import { MilestonesTab } from './editActivity/MilestonesTab'
import { ObjectivesTab } from './editActivity/ObjectivesTab'
import { ProcurementTab } from './editActivity/ProcurementTab'
import { EngagementPlanTab } from './editActivity/EngagementPlanTab'
import {
  normalizeControlledRules,
  validateForm,
  getRuntimeErrors,
  INITIAL_FORM,
  type ActivityForm,
  type ActivityContext,
  type FieldErrors,
} from './editActivity/activityInfoHelpers'

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

function getPendingWithRole(statusCode: number, currentRole: AopRole): string {
  switch (statusCode) {
    case 1: return 'Division Member'
    case 776140001: return 'Division Director'
    case 776140012: return 'Division Member'
    case 776140003: return 'Strategy Team'
    case 776140004: return 'Executive Director'
    case 776140002: return 'Director General'
    default: return currentRole
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


// ── Component ──

export function EditActivity() {
  const navigate = useNavigate()
  const selectedRole = useAppSelector((state) => state.app.selectedRole)
  const [activeTab, setActiveTab] = useState<TabId>('activity-info')
  const [form, setForm] = useState<ActivityForm>(INITIAL_FORM)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [_context, setContext] = useState<ActivityContext | null>(null)
  const [activityLeadOptions, setActivityLeadOptions] = useState<SelectOption<string>[]>([])
  const [isContextLoading, setIsContextLoading] = useState(true)

  // ── Placeholder activity data ──
  const activityName = 'Digital Infrastructure Upgrade'
  const aiSummary = 'This project aims to modernize the digital backbone to support 99.9% uptime across all government service channels.'
  const statusCode = 1 // Draft
  const projectPhase = 776140000 // Planning
  const pendingWith = getPendingWithRole(statusCode, selectedRole)
  const isStrategic = form.activityScope === '1'
  const isPaymentOnly = form.activityClassification === '576610002'
  const isBudgetNo = form.budgetRequired === '0'
  const isAdeoVisible = form.adeoReported === '1'

  const activityLeadName = activityLeadOptions.find((o) => o.value === form.activityLeadId)?.label ?? ''
  const isDivisionMember = selectedRole === 'AOP - Division Member'
  const isDivisionDirector = selectedRole === 'AOP - Division Director'

  // ── Context loading ──

  useEffect(() => {
    let isMounted = true

    async function loadContext() {
      setIsContextLoading(true)
      setErrors((currentErrors) => ({ ...currentErrors, context: undefined }))

      try {
        const [usersResult, hierarchyResult, planningResult] = await Promise.all([
          SystemusersService.getAll({
            select: ['systemuserid', 'fullname', 'internalemailaddress']
          }),
          Dga_divisional_hierarchiesService.getAll({
            select: ['dga_divisional_hierarchyid', 'dga_name', 'dga_type', '_dga_parent_divisional_hierarchy_value'],
          }),
          Dga_project_planning_instancesService.getAll({
            select: ['dga_project_planning_instanceid', 'dga_name', '_dga_assessment_cycle_value'],
          }),
        ])

        if (!isMounted) return

        const users = (usersResult?.data ?? []) as Systemusers[]
        const hierarchy = (hierarchyResult?.data ?? []) as Dga_divisional_hierarchies[]
        const planningInstances = (planningResult?.data ?? []) as Dga_project_planning_instances[]

        const activityLeadUsers = (users ?? [])
          .filter((user) => user.fullname)
          .map((user) => ({
            label: user.fullname!,
            value: user.systemuserid ?? '',
          }))

        const divisions = (hierarchy ?? []).filter((item) => item.dga_type === 776140000)
        const sectors = (hierarchy ?? []).filter((item) => item.dga_type === 776140001)
        const sector = sectors[0]
        const division = divisions[0]

        setActivityLeadOptions(activityLeadUsers)
        setContext({
          currentUserId: users?.[0]?.systemuserid ?? '',
          currentUserName: users?.[0]?.fullname ?? 'User',
          division,
          sector,
          planningInstance: planningInstances?.[0],
        })
        setForm((prev) => ({
          ...prev,
          sectorId: sector?.dga_divisional_hierarchyid ?? '',
          sectorName: sector?.dga_name ?? '',
          divisionId: division?.dga_divisional_hierarchyid ?? '',
          divisionName: division?.dga_name ?? '',
        }))
      } catch (error) {
        if (isMounted) {
          setErrors({ context: error instanceof Error ? error.message : 'Failed to load context.' })
        }
      } finally {
        if (isMounted) setIsContextLoading(false)
      }
    }

    loadContext()
    return () => { isMounted = false }
  }, [])

  // ── Form handlers ──

  function updateForm(nextFields: Partial<ActivityForm>) {
    const changedFields = Object.keys(nextFields) as Array<keyof ActivityForm>
    const normalizedForm = normalizeControlledRules({ ...form, ...nextFields })

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
        return <MembersTab />
      case 'dependencies':
        return <DependenciesTab />
      case 'objectives':
        return <ObjectivesTab />
      case 'milestones':
        return <MilestonesTab isAdeoVisible={isAdeoVisible} />
      case 'procurements':
        return <ProcurementTab />
      case 'engagement-plans':
        return (
          <EngagementPlanTab
            activityLeadName={activityLeadName}
            activityName={activityName}
            activitySummary={form.summary}
            divisionName={form.divisionName}
            sectorName={form.sectorName}
          />
        )
      case 'budget':
        return <div className="edit-activity__placeholder">Budget Information form will appear here.</div>
      case 'clarifications':
        return <div className="edit-activity__placeholder">Clarifications will appear here.</div>
      case 'logs':
        return <div className="edit-activity__placeholder">Activity logs table will appear here.</div>
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

      {/* Premium stage tabs */}
      <div className="edit-activity__stages">
        <nav className="edit-activity__stage-tabs" role="tablist" aria-label="Activity stages">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                className={`edit-activity__stage-tab ${isActive ? 'edit-activity__stage-tab--active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                aria-selected={isActive}
                title={tab.label}
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
