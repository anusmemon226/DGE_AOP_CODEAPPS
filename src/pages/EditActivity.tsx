import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Briefcase,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  Edit3,
  FileText,
  Flag,
  HelpCircle,
  History,
  Save,
  Send,
  Sparkles,
  Target,
  UserCheck,
  UserRound,
  Wallet,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Badge, Button, ConfirmationDialog, Textarea, UnsavedChangesDialog, type SelectOption } from '../components/ui'
import { useNavigationGuard } from '../contexts/useNavigationGuard'
import {
  Dga_aop_projectsesdga_project_activity_status,
  Dga_aop_projectsesstatuscode,
  type Dga_aop_projectses,
  type Dga_aop_projectsesBase,
} from '../generated/models/Dga_aop_projectsesModel'
import type { Dga_aop_project_budgetsBase } from '../generated/models/Dga_aop_project_budgetsModel'
import type { Dga_aop_ai_summaries } from '../generated/models/Dga_aop_ai_summariesModel'
import type {
  Dga_aop_project_milestone_detailses,
  Dga_aop_project_milestone_detailsesBase,
} from '../generated/models/Dga_aop_project_milestone_detailsesModel'
import type { Dga_procurement_plansBase } from '../generated/models/Dga_procurement_plansModel'
import type { Dga_project_planning_instances } from '../generated/models/Dga_project_planning_instancesModel'
import { Dga_aop_project_budgetsService } from '../generated/services/Dga_aop_project_budgetsService'
import { Dga_aop_ai_summariesService } from '../generated/services/Dga_aop_ai_summariesService'
import { Dga_aop_project_milestone_detailsesService } from '../generated/services/Dga_aop_project_milestone_detailsesService'
import { Dga_aop_projectsesService } from '../generated/services/Dga_aop_projectsesService'
import { Dga_project_planning_instancesService } from '../generated/services/Dga_project_planning_instancesService'
import { Dga_procurement_plansService } from '../generated/services/Dga_procurement_plansService'
import { SystemusersService } from '../generated/services/SystemusersService'
import { TeamsService } from '../generated/services/TeamsService'
import type { Systemusers } from '../generated/models/SystemusersModel'
import type { Teams } from '../generated/models/TeamsModel'
import { APP_ROUTE_PATHS } from '../routes/appRoutes'
import { useAppSelector } from '../store/hooks'
import { ActivityInfoTab } from './editActivity/ActivityInfoTab'
import { MilestonesTab } from './editActivity/MilestonesTab'
import { ObjectivesTab, type ObjectiveHeaderAction } from './editActivity/ObjectivesTab'
import { ProcurementTab } from './editActivity/ProcurementTab'
import { BudgetTab, type BudgetHeaderAction } from './editActivity/BudgetTab'
import { ClarificationTab } from './editActivity/ClarificationTab'
import { EngagementPlanTab } from './editActivity/EngagementPlanTab'
import { LogTab } from './editActivity/LogTab'
import { ReviewChangesPanel } from './editActivity/ReviewChangesPanel'
import { AiSummaryPanel } from './editActivity/AiSummaryPanel'
import type { AiSummaryBlocks, AiSummaryMeta } from './editActivity/types/aiSummaryTypes'
import type { EditActivityOperationAlertPayload, EditActivityOperationNotifier } from './editActivity/types/operationAlert'
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
import { validateActivitySubmissionRequirements as validateSubmissionRequirements } from './editActivity/helpers/submissionValidation'
import { triggerActivityAiSummaryRefresh } from './editActivity/helpers/aiSummaryFlow'
import { validateExecutionUpdateSubmission } from './editActivity/helpers/executionUpdateValidation'
import {
  createApprovalWorkflowLog,
  createExecutionFieldLogs,
  EXECUTION_LOG_TYPES,
} from './editActivity/helpers/approvalWorkflowLogs'
import {
  calculateProjectMilestoneProgress,
  type ProjectMilestoneProgress,
} from './editActivity/helpers/milestoneProgress'
import { formatDate } from './editActivity/helpers/sharedHelpers'

// ── Types ──

type TabId =
  | 'activity-info'
  | 'objectives'
  | 'milestones'
  | 'procurements'
  | 'engagement-plans'
  | 'budget'
  | 'clarifications'
  | 'logs'

type PendingNavigation = {
  action: () => void
}

type TabConfig = {
  id: TabId
  label: string
  shortLabel: string
  icon: typeof ClipboardList
}

const TABS: TabConfig[] = [
  { id: 'activity-info', label: 'Activity Information', shortLabel: 'Info', icon: ClipboardList },
  { id: 'objectives', label: 'Objectives', shortLabel: 'Objectives', icon: Target },
  { id: 'milestones', label: 'Milestones', shortLabel: 'Milestones', icon: Flag },
  { id: 'procurements', label: 'Procurements', shortLabel: 'Procurements', icon: Briefcase },
  { id: 'engagement-plans', label: 'Engagement Plans', shortLabel: 'Engagement', icon: BarChart3 },
  { id: 'budget', label: 'Budget', shortLabel: 'Budget', icon: Wallet },
  { id: 'clarifications', label: 'Clarifications', shortLabel: 'Clarifications', icon: HelpCircle },
  { id: 'logs', label: 'Logs', shortLabel: 'Logs', icon: History },
]

function scrollPageToTop(behavior: ScrollBehavior = 'smooth') {
  window.scrollTo({ top: 0, behavior })
}

function formatActivityRailDate(value?: string | null) {
  return value ? formatDate(value) || '—' : '—'
}

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
  'dga_justification_for_activity_status',
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
  'dga_project_related_changes',
  'dga_is_rejected',
  'dga_rejection_reason',
  '_dga_project_planning_instance_value',
  '_createdby_value',
  'createdon',
  'modifiedon',
]

// ── Status helpers ──

function formatGeneratedChoiceLabel(label?: string) {
  return (label || '')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatActivityStatusLogValue(value: unknown) {
  const numericValue = Number(value)
  const generatedLabel = Number.isFinite(numericValue)
    ? (Dga_aop_projectsesdga_project_activity_status as Record<number, string>)[numericValue]
    : ''

  return generatedLabel ? formatGeneratedChoiceLabel(generatedLabel) : value
}

function getStatusTone(statusCode: number): 'neutral' | 'info' | 'warning' | 'success' {
  switch (statusCode) {
    case 776140001:
    case 776140004:
    case 776140002:
    case 776140014:
      return 'warning'
    case 776140003:
      return 'info'
    case 776140011:
      return 'success'
    case 776140012:
      return 'warning'
    case 2:
    case 776140015:
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
    default: return ''
  }
}

function formatStatusCode(code: number): string {
  const generatedLabel = (Dga_aop_projectsesstatuscode as Record<number, string>)[code]

  if (!generatedLabel) {
    return 'Unknown'
  }

  return generatedLabel
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeId(id?: string | null) {
  return id?.replace(/[{}]/g, '').toLowerCase() ?? ''
}

type ObjectiveAiSummaryResponse = {
  'Objective Summary'?: unknown
  ObjectiveSummary?: unknown
}

type AiSummaryResponseJson = Partial<Record<
  | 'Project Summary'
  | 'ProjectSummary'
  | 'Milestone Summary'
  | 'milestoneSummary'
  | 'Procurement Summary'
  | 'ProcurementSummary'
  | 'Budget Summary'
  | 'BudgetSummary'
  | 'Engagement Plan Summary'
  | 'EngagementPlanSummary',
  unknown
>> & {
  Objective?: ObjectiveAiSummaryResponse
}

type TabAiSummaries = Partial<Record<
  'activityInfo' | 'objectives' | 'milestones' | 'procurement' | 'engagementPlan' | 'budget',
  AiSummaryBlocks
>>

function getAiSummaryText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function parseAiSummaryResponseJson(responseJson?: string | null): AiSummaryResponseJson | null {
  if (!responseJson?.trim()) return null

  try {
    const parsed = JSON.parse(responseJson) as unknown
    if (typeof parsed === 'string') {
      return parseAiSummaryResponseJson(parsed)
    }
    return parsed && typeof parsed === 'object' ? parsed as AiSummaryResponseJson : null
  } catch {
    return null
  }
}

function mapAiSummaryResponse(response: AiSummaryResponseJson | null): TabAiSummaries {
  if (!response) return {}

  return {
    activityInfo: {
      summary: getAiSummaryText(response['Project Summary'] ?? response.ProjectSummary),
    },
    objectives: {
      summary: getAiSummaryText(response.Objective?.['Objective Summary'] ?? response.Objective?.ObjectiveSummary),
    },
    budget: {
      summary: getAiSummaryText(response['Budget Summary'] ?? response.BudgetSummary),
    },
    engagementPlan: {
      summary: getAiSummaryText(response['Engagement Plan Summary'] ?? response.EngagementPlanSummary),
    },
    milestones: {
      summary: getAiSummaryText(response['Milestone Summary'] ?? response.milestoneSummary),
    },
    procurement: {
      summary: getAiSummaryText(response['Procurement Summary'] ?? response.ProcurementSummary),
    },
  }
}

type ProjectRelatedChange = {
  new_value?: unknown
  old_value: unknown
  planned_value?: unknown
}

type ProjectRelatedChanges = {
  [key: string]:
    | ProjectRelatedChange
    | ProjectRelatedChanges
    | ProjectRelatedChanges[]
    | string
    | number
    | boolean
    | null
    | undefined
}

function emptyRelatedChange(): ProjectRelatedChange {
  return {
    old_value: '',
    new_value: '',
  }
}

function buildExecutionRelatedChangesTemplate(): ProjectRelatedChanges {
  return {
    activity_information: {
      dga_project_activity_status: emptyRelatedChange(),
      dga_justification_for_activity_status: emptyRelatedChange(),
    },
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function cleanProjectRelatedRecordId(id?: string | null) {
  return id?.replace(/[{}]/g, '') || ''
}

function legacyRecordMapToArray(source: unknown): ProjectRelatedChanges[] {
  if (!isPlainObject(source)) return []

  return Object.entries(source)
    .filter((entry): entry is [string, ProjectRelatedChanges] => isPlainObject(entry[1]))
    .map(([id, record]) => ({
      id: cleanProjectRelatedRecordId(id),
      ...record,
    }))
}

function normalizeProjectRelatedChangesShape(changes: ProjectRelatedChanges): ProjectRelatedChanges {
  const normalized: ProjectRelatedChanges = { ...changes }

  const milestones = normalized.milestones
  if (isPlainObject(milestones) && Array.isArray((milestones as Record<string, unknown>).records)) {
    normalized.milestones = (milestones as Record<string, unknown>).records as ProjectRelatedChanges[]
  } else if (isPlainObject(milestones) && isPlainObject((milestones as Record<string, unknown>).by_record)) {
    normalized.milestones = legacyRecordMapToArray((milestones as Record<string, unknown>).by_record)
  }

  const procurements = normalized.procurements
  if (isPlainObject(procurements) && Array.isArray((procurements as Record<string, unknown>).records)) {
    normalized.procurements = (procurements as Record<string, unknown>).records as ProjectRelatedChanges[]
  } else if (isPlainObject(procurements) && isPlainObject((procurements as Record<string, unknown>).by_record)) {
    normalized.procurements = legacyRecordMapToArray((procurements as Record<string, unknown>).by_record)
  }

  const budget = normalized.budget
  if (isPlainObject(budget) && Array.isArray((budget as Record<string, unknown>).records)) {
    normalized.budget = (budget as Record<string, unknown>).records as ProjectRelatedChanges[]
  } else if (isPlainObject(budget) && isPlainObject((budget as Record<string, unknown>).by_month)) {
    normalized.budget = legacyRecordMapToArray((budget as Record<string, unknown>).by_month)
  }

  return normalized
}

function mergeProjectRelatedRecords(
  base: ProjectRelatedChanges[],
  override: ProjectRelatedChanges[],
): ProjectRelatedChanges[] {
  const merged = base.map((record) => ({ ...record }))

  override.forEach((record) => {
    const recordId = cleanProjectRelatedRecordId(String(record.id ?? ''))
    const existingIndex = recordId
      ? merged.findIndex((existing) => cleanProjectRelatedRecordId(String(existing.id ?? '')) === recordId)
      : -1

    if (existingIndex >= 0) {
      merged[existingIndex] = mergeProjectRelatedChanges(merged[existingIndex], record)
      return
    }

    merged.push(record)
  })

  return merged
}

function mergeProjectRelatedChanges(base: ProjectRelatedChanges, override: ProjectRelatedChanges): ProjectRelatedChanges {
  const merged: ProjectRelatedChanges = { ...normalizeProjectRelatedChangesShape(base) }

  Object.entries(normalizeProjectRelatedChangesShape(override)).forEach(([key, value]) => {
    const existingValue = merged[key]

    if (Array.isArray(existingValue) && Array.isArray(value)) {
      merged[key] = mergeProjectRelatedRecords(existingValue, value)
      return
    }

    if (isPlainObject(existingValue) && isPlainObject(value) && !('old_value' in value) && !('new_value' in value)) {
      merged[key] = mergeProjectRelatedChanges(existingValue as ProjectRelatedChanges, value as ProjectRelatedChanges)
      return
    }

    if (
      isPlainObject(existingValue)
      && isPlainObject(value)
      && ('old_value' in existingValue || 'new_value' in existingValue)
      && ('old_value' in value || 'new_value' in value)
    ) {
      merged[key] = {
        ...existingValue,
        ...value,
        new_value: value.new_value === undefined || value.new_value === ''
          ? existingValue.new_value ?? ''
          : value.new_value,
        planned_value: value.planned_value === undefined
          ? existingValue.planned_value
          : value.planned_value,
      } as ProjectRelatedChange
      return
    }

    merged[key] = value
  })

  return merged
}

function getProjectRelatedChangeAt(changes: ProjectRelatedChanges, path: string[]): ProjectRelatedChange | undefined {
  let current: unknown = changes

  for (const segment of path) {
    if (!isPlainObject(current)) {
      return undefined
    }

    current = (current as ProjectRelatedChanges)[segment]
  }

  if (isPlainObject(current) && ('old_value' in current || 'new_value' in current)) {
    return current as ProjectRelatedChange
  }

  return undefined
}

function isEmptyRelatedValue(value: unknown) {
  return value === undefined || value === null || String(value).trim() === ''
}

function resolveProjectRelatedValue(change: ProjectRelatedChange | undefined): unknown {
  if (!change) return undefined

  if (isEmptyRelatedValue(change.new_value)) {
    return change.old_value
  }

  if (String(change.old_value ?? '') === String(change.new_value ?? '')) {
    return change.new_value
  }

  return change.old_value
}

function transformProjectRelatedChangesValues(
  node: ProjectRelatedChange | ProjectRelatedChanges | unknown,
  mode: 'approve' | 'reject',
): ProjectRelatedChange | ProjectRelatedChanges | unknown {
  if (Array.isArray(node)) {
    return node.map((record) => transformProjectRelatedChangesValues(record, mode))
  }

  if (!isPlainObject(node)) {
    return node
  }

  if ('old_value' in node || 'new_value' in node) {
    const change = node as ProjectRelatedChange
    return {
      ...change,
      old_value: mode === 'reject' ? change.new_value ?? '' : change.old_value ?? '',
      new_value: mode === 'approve' ? change.old_value ?? '' : change.new_value ?? '',
    }
  }

  return Object.entries(node).reduce<ProjectRelatedChanges>((next, [key, value]) => {
    next[key] = transformProjectRelatedChangesValues(value, mode) as ProjectRelatedChange | ProjectRelatedChanges
    return next
  }, {})
}

function approveProjectRelatedChanges(relatedChanges?: string | null) {
  return JSON.stringify(transformProjectRelatedChangesValues(
    normalizeProjectRelatedChangesShape(parseProjectRelatedChanges(relatedChanges)),
    'approve',
  ))
}

function rejectProjectRelatedChanges(relatedChanges?: string | null) {
  return JSON.stringify(transformProjectRelatedChangesValues(
    normalizeProjectRelatedChangesShape(parseProjectRelatedChanges(relatedChanges)),
    'reject',
  ))
}

function getRecordEntries(source: unknown): Array<[string, ProjectRelatedChanges]> {
  if (Array.isArray(source)) {
    return source
      .filter((record): record is ProjectRelatedChanges => isPlainObject(record))
      .map((record): [string, ProjectRelatedChanges] => [String(record.id ?? ''), record])
      .filter(([recordId]) => Boolean(recordId))
  }

  if (!isPlainObject(source)) return []

  return Object.entries(source)
    .filter((entry): entry is [string, ProjectRelatedChanges] => isPlainObject(entry[1]))
}

function getSection(source: ProjectRelatedChanges, path: string[]): unknown {
  return path.reduce<unknown>((current, key) => (
    isPlainObject(current) ? current[key] : undefined
  ), source)
}

function hasPendingRelatedChange(change: ProjectRelatedChange | undefined) {
  if (!change) return false
  const oldValue = String(change.old_value ?? '').trim()
  const newValue = String(change.new_value ?? '').trim()
  return oldValue !== newValue && Boolean(oldValue || newValue)
}

function pendingRelatedValue(record: ProjectRelatedChanges, fieldName: string) {
  const change = record[fieldName] as ProjectRelatedChange | undefined
  return hasPendingRelatedChange(change) ? change?.old_value : undefined
}

function toPendingString(value: unknown) {
  return isEmptyRelatedValue(value) ? '' : String(value)
}

function toPendingNumber(value: unknown) {
  if (isEmptyRelatedValue(value)) return undefined
  const parsed = Number(String(value).replace(/,/g, '').trim())
  return Number.isNaN(parsed) ? undefined : parsed
}

function toPendingBoolean(value: unknown) {
  if (value === true || value === false) return value
  const normalized = String(value ?? '').trim().toLowerCase()
  if (['1', 'yes', 'true'].includes(normalized)) return true
  if (['0', 'no', 'false'].includes(normalized)) return false
  return undefined
}

function addStringField<TPayload extends Record<string, unknown>>(payload: TPayload, fieldName: string, value: unknown) {
  if (value !== undefined) {
    payload[fieldName as keyof TPayload] = toPendingString(value) as TPayload[keyof TPayload]
  }
}

function addNumberField<TPayload extends Record<string, unknown>>(payload: TPayload, fieldName: string, value: unknown) {
  if (value !== undefined) {
    const parsed = toPendingNumber(value)
    if (parsed !== undefined) {
      payload[fieldName as keyof TPayload] = parsed as TPayload[keyof TPayload]
    }
  }
}

function addBooleanField<TPayload extends Record<string, unknown>>(payload: TPayload, fieldName: string, value: unknown) {
  if (value !== undefined) {
    const parsed = toPendingBoolean(value)
    if (parsed !== undefined) {
      payload[fieldName as keyof TPayload] = parsed as TPayload[keyof TPayload]
    }
  }
}

async function persistApprovedExecutionRelatedChanges(
  relatedChanges?: string | null,
): Promise<Partial<Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid'>>> {
  const parsed = normalizeProjectRelatedChangesShape(parseProjectRelatedChanges(relatedChanges))
  const activityPayload: Partial<Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid'>> = {}
  const activityInformation = getSection(parsed, ['activity_information'])

  if (isPlainObject(activityInformation)) {
    const activityStatus = pendingRelatedValue(activityInformation as ProjectRelatedChanges, 'dga_project_activity_status')
    const activityStatusJustification = pendingRelatedValue(activityInformation as ProjectRelatedChanges, 'dga_justification_for_activity_status')

    if (activityStatus !== undefined) {
      const parsedStatus = toPendingNumber(activityStatus)
      if (parsedStatus !== undefined) {
        activityPayload.dga_project_activity_status = parsedStatus as Dga_aop_projectsesBase['dga_project_activity_status']
      }
    }
    if (activityStatusJustification !== undefined) {
      activityPayload.dga_justification_for_activity_status = toPendingString(activityStatusJustification)
    }
  }

  const milestoneUpdates = getRecordEntries(getSection(parsed, ['milestones'])).map(async ([milestoneId, record]) => {
    const payload: Partial<Omit<Dga_aop_project_milestone_detailsesBase, 'dga_aop_project_milestone_detailsid'>> = {}

    addStringField(payload, 'dga_actual_start_date', pendingRelatedValue(record, 'dga_actual_start_date'))
    addStringField(payload, 'dga_actual_end_date', pendingRelatedValue(record, 'dga_actual_end_date'))
    addNumberField(payload, 'statuscode', pendingRelatedValue(record, 'statuscode'))
    addNumberField(payload, 'dga_actual_progress', pendingRelatedValue(record, 'dga_actual_progress'))
    addStringField(payload, 'dga_cancellation_reason', pendingRelatedValue(record, 'dga_cancellation_reason'))
    addStringField(payload, 'dga_justification', pendingRelatedValue(record, 'dga_justification'))

    if (Object.keys(payload).length === 0) return

    const result = await Dga_aop_project_milestone_detailsesService.update(
      milestoneId,
      payload,
    )
    assertOperationSuccess(result, `Failed to apply approved execution changes to milestone ${record.name ?? milestoneId}.`)
  })

  const procurementUpdates = getRecordEntries(getSection(parsed, ['procurements'])).map(async ([procurementId, record]) => {
    const payload: Partial<Omit<Dga_procurement_plansBase, 'dga_procurement_planid'>> = {}

    addBooleanField(payload, 'dga_does_this_project_require_tender', pendingRelatedValue(record, 'dga_does_this_project_require_tender'))
    addNumberField(payload, 'dga_tender_type', pendingRelatedValue(record, 'dga_tender_type'))
    addNumberField(payload, 'dga_current_procurement_status', pendingRelatedValue(record, 'dga_current_procurement_status'))
    addStringField(payload, 'dga_pr_ticket_number', pendingRelatedValue(record, 'dga_pr_ticket_number'))
    addNumberField(payload, 'dga_actual_contract_value', pendingRelatedValue(record, 'dga_actual_contract_value'))
    addNumberField(payload, 'dga_actual_contract_duration_in_months', pendingRelatedValue(record, 'dga_actual_contract_duration_in_months'))
    addStringField(payload, 'dga_stage_update_date', pendingRelatedValue(record, 'dga_stage_update_date'))
    addStringField(payload, 'dga_progress_update', pendingRelatedValue(record, 'dga_progress_update'))
    addStringField(payload, 'dga_justification_date', pendingRelatedValue(record, 'dga_justification_date'))
    addStringField(payload, 'dga_justification_of_the_change', pendingRelatedValue(record, 'dga_justification_of_the_change'))

    if (Object.keys(payload).length === 0) return

    const result = await Dga_procurement_plansService.update(
      procurementId,
      payload,
    )
    assertOperationSuccess(result, `Failed to apply approved execution changes to procurement ${record.name ?? procurementId}.`)
  })

  const budgetUpdates = getRecordEntries(getSection(parsed, ['budget'])).map(async ([monthId, record]) => {
    const payload: Partial<Omit<Dga_aop_project_budgetsBase, 'dga_aop_project_budgetid'>> = {}

    addNumberField(payload, 'dga_actual_budget', pendingRelatedValue(record, 'dga_actual_budget'))
    addNumberField(payload, 'dga_delivered_amount', pendingRelatedValue(record, 'dga_delivered_amount'))

    if (Object.keys(payload).length === 0) return

    const result = await Dga_aop_project_budgetsService.update(
      monthId,
      payload,
    )
    assertOperationSuccess(result, `Failed to apply approved execution changes to ${record.month_name ?? 'budget month'}.`)
  })

  await Promise.all([...milestoneUpdates, ...procurementUpdates, ...budgetUpdates])

  if (Object.keys(activityPayload).length === 0) {
    return {}
  }

  return activityPayload
}

function hasApprovedProjectRelatedChange(node: ProjectRelatedChange | ProjectRelatedChanges | unknown): boolean {
  if (Array.isArray(node)) {
    return node.some((value) => hasApprovedProjectRelatedChange(value))
  }

  if (!isPlainObject(node)) return false

  if ('old_value' in node || 'new_value' in node) {
    const change = node as ProjectRelatedChange
    const oldValue = String(change.old_value ?? '').trim()
    const newValue = String(change.new_value ?? '').trim()
    return Boolean(oldValue && newValue && oldValue === newValue)
  }

  return Object.values(node).some((value) => hasApprovedProjectRelatedChange(value))
}

function applyActivityInformationRelatedChanges(form: ActivityForm, relatedChanges?: string | null): ActivityForm {
  const changes = parseProjectRelatedChanges(relatedChanges)
  const activityStatus = resolveProjectRelatedValue(getProjectRelatedChangeAt(
    changes,
    ['activity_information', 'dga_project_activity_status'],
  ))
  const activityStatusJustification = resolveProjectRelatedValue(getProjectRelatedChangeAt(
    changes,
    ['activity_information', 'dga_justification_for_activity_status'],
  ))

  return normalizeControlledRules({
    ...form,
    activityStatus: isEmptyRelatedValue(activityStatus)
      ? form.activityStatus
      : String(activityStatus) as ActivityForm['activityStatus'],
    activityStatusJustification: isEmptyRelatedValue(activityStatusJustification)
      ? form.activityStatusJustification
      : String(activityStatusJustification),
  })
}

function buildRelatedOldValueChange(
  nextOldValue: unknown,
): ProjectRelatedChange {
  return {
    old_value: nextOldValue ?? '',
  }
}

function parseProjectRelatedChanges(value?: string | null): ProjectRelatedChanges {
  if (!value?.trim()) {
    return {}
  }

  try {
    const parsed = JSON.parse(value) as unknown

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }

    return parsed as ProjectRelatedChanges
  } catch {
    return {}
  }
}

function buildProjectRelatedChangesJson(
  existingValue: string | undefined,
  changes: ProjectRelatedChanges,
) {
  return JSON.stringify(mergeProjectRelatedChanges(parseProjectRelatedChanges(existingValue), changes))
}

function getResultArray<T>(result: unknown): T[] {
  const value = getResultValue<T[]>(result)

  if (Array.isArray(value)) {
    return value
  }

  if (Array.isArray(result)) {
    return result as T[]
  }

  return []
}

function toEntityBind(entitySetName: string, id: string) {
  return `/${entitySetName}(${normalizeId(id)})`
}

function escapeODataValue(value: string) {
  return value.replace(/'/g, "''")
}

function buildPmoActivityInfoUpdatePayload(form: ActivityForm): Partial<Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid'>> {
  return {
    dga_activity_classification: form.activityClassification
      ? Number(form.activityClassification) as Dga_aop_projectsesBase['dga_activity_classification']
      : undefined,
    dga_registered_or_will_be_registered_in_epm: form.activityClassification === '576610000',
  }
}

function areActivityFormsEqual(left: ActivityForm, right: ActivityForm) {
  return (Object.keys(INITIAL_FORM) as Array<keyof ActivityForm>).every((key) => {
    const leftValue = left[key]
    const rightValue = right[key]

    if (Array.isArray(leftValue) || Array.isArray(rightValue)) {
      return JSON.stringify(leftValue ?? []) === JSON.stringify(rightValue ?? [])
    }

    return String(leftValue ?? '') === String(rightValue ?? '')
  })
}


// ── Component ──

export function EditActivity() {
  const navigate = useNavigate()
  const { confirmNavigation, registerNavigationGuard } = useNavigationGuard()
  const [searchParams] = useSearchParams()
  const projectId = searchParams.get('id') ?? ''
  const selectedRole = useAppSelector((state) => state.app.selectedRole)
  const { currentRole, currentRoleDivisionalHierarchy, divisionalHierarchies: allHierarchies, systemUser } = useAppSelector((state) => state.user)
  const [activeTab, setActiveTab] = useState<TabId>('activity-info')
  const stageTabsRef = useRef<HTMLElement | null>(null)
  const [isStickyStageTabsVisible, setIsStickyStageTabsVisible] = useState(false)
  const [activity, setActivity] = useState<Dga_aop_projectses | null>(null)
  const [form, setForm] = useState<ActivityForm>(INITIAL_FORM)
  const [activityInfoSavedForm, setActivityInfoSavedForm] = useState<ActivityForm>(INITIAL_FORM)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [activityLeadOptions, setActivityLeadOptions] = useState<SelectOption<string>[]>([])
  const [isContextLoading, setIsContextLoading] = useState(true)
  const [isSavingActivityInfo, setIsSavingActivityInfo] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [tabOperationAlert, setTabOperationAlert] = useState<EditActivityOperationAlertPayload | null>(null)
  const previousSelectedRoleRef = useRef(selectedRole)
  const [pendingWith, setPendingWith] = useState('Loading...')
  const [createdByName, setCreatedByName] = useState('')
  const [objectiveHeaderAction, setObjectiveHeaderAction] = useState<ObjectiveHeaderAction | null>(null)
  const [budgetHeaderAction, setBudgetHeaderAction] = useState<BudgetHeaderAction | null>(null)
  const [pendingNavigation, setPendingNavigation] = useState<PendingNavigation | null>(null)
  const [isUnsavedDialogSaving, setIsUnsavedDialogSaving] = useState(false)
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false)
  const [isSubmittingToDirector, setIsSubmittingToDirector] = useState(false)
  const [isStrategySubmitConfirmOpen, setIsStrategySubmitConfirmOpen] = useState(false)
  const [isSubmittingToStrategyTeam, setIsSubmittingToStrategyTeam] = useState(false)
  const [isExecutiveSubmitConfirmOpen, setIsExecutiveSubmitConfirmOpen] = useState(false)
  const [isSubmittingToExecutiveDirector, setIsSubmittingToExecutiveDirector] = useState(false)
  const [isDirectorGeneralSubmitConfirmOpen, setIsDirectorGeneralSubmitConfirmOpen] = useState(false)
  const [isSubmittingToDirectorGeneral, setIsSubmittingToDirectorGeneral] = useState(false)
  const [isDirectorGeneralApproveConfirmOpen, setIsDirectorGeneralApproveConfirmOpen] = useState(false)
  const [isApprovingAsDirectorGeneral, setIsApprovingAsDirectorGeneral] = useState(false)
  const [isStartingActivity, setIsStartingActivity] = useState(false)
  const [isSubmittingActivityUpdates, setIsSubmittingActivityUpdates] = useState(false)
  const [isActivityUpdateSubmitConfirmOpen, setIsActivityUpdateSubmitConfirmOpen] = useState(false)
  const [isExecutionApproveConfirmOpen, setIsExecutionApproveConfirmOpen] = useState(false)
  const [isApprovingExecutionUpdates, setIsApprovingExecutionUpdates] = useState(false)
  const [isExecutionRejectFormOpen, setIsExecutionRejectFormOpen] = useState(false)
  const [isRejectingExecutionUpdates, setIsRejectingExecutionUpdates] = useState(false)
  const [executionRejectionReason, setExecutionRejectionReason] = useState('')
  const [executionRejectionError, setExecutionRejectionError] = useState('')
  const [aiSummaryBlocks, setAiSummaryBlocks] = useState<TabAiSummaries>({})
  const [aiSummaryMeta, setAiSummaryMeta] = useState<AiSummaryMeta | undefined>()
  const [isAiSummaryLoading, setIsAiSummaryLoading] = useState(false)
  const [aiSummaryError, setAiSummaryError] = useState('')
  const [milestoneProjectProgress, setMilestoneProjectProgress] = useState<ProjectMilestoneProgress>({
    actual: 0,
    eligibleCount: 0,
    planned: 0,
    resultsById: {},
  })

  const loadActivityAiSummary = useCallback(async () => {
    if (!projectId) {
      setAiSummaryBlocks({})
      setAiSummaryMeta(undefined)
      return
    }

    setIsAiSummaryLoading(true)
    setAiSummaryError('')

    try {
      const normalizedProjectId = normalizeId(projectId)
      const result = await Dga_aop_ai_summariesService.getAll({
        filter: `_dga_reference_record_id_value eq ${normalizedProjectId} or dga_summary_id eq '${normalizedProjectId}'`,
        orderBy: ['modifiedon desc', 'createdon desc'],
        select: [
          'dga_aop_ai_summaryid',
          'dga_response_json',
          'dga_model_version',
          'dga_response_time',
          'dga_summary_id',
          'createdon',
          'modifiedon',
          '_dga_reference_record_id_value',
        ],
        top: 5,
      })
      assertOperationSuccess(result, 'Unable to load AI summaries.')

      const latestSummary = ((result.data ?? []) as Dga_aop_ai_summaries[])
        .find((summary) => (
          normalizeId(summary._dga_reference_record_id_value) === normalizedProjectId
          || normalizeId(summary.dga_summary_id) === normalizedProjectId
        ) && summary.dga_response_json)

      const parsed = parseAiSummaryResponseJson(latestSummary?.dga_response_json)
      setAiSummaryBlocks(mapAiSummaryResponse(parsed))
      setAiSummaryMeta(latestSummary ? {
        modelVersion: latestSummary.dga_model_version,
        refreshedOn: latestSummary.modifiedon ?? latestSummary.createdon,
        responseTime: latestSummary.dga_response_time,
      } : undefined)
    } catch (error) {
      console.warn('Unable to load activity AI summaries', { error, projectId })
      setAiSummaryBlocks({})
      setAiSummaryMeta(undefined)
      setAiSummaryError('AI summary is temporarily unavailable.')
    } finally {
      setIsAiSummaryLoading(false)
    }
  }, [projectId])

  const refreshActivityAiSummary = useCallback((reason: string) => {
    if (!projectId) return

    void triggerActivityAiSummaryRefresh(projectId)
      .then((result) => {
        assertOperationSuccess(result, 'AI summary refresh flow failed.')
        console.log('Activity AI summary refresh triggered', { projectId, reason, result })
        void loadActivityAiSummary()
      })
      .catch((error) => {
        console.warn('Activity AI summary refresh failed', {
          error,
          projectId,
          reason,
        })
      })
  }, [loadActivityAiSummary, projectId])

  const handleObjectivesActivityDataChanged = useCallback(() => {
    refreshActivityAiSummary('objectives-save')
  }, [refreshActivityAiSummary])

  const handleBudgetActivityDataChanged = useCallback(() => {
    refreshActivityAiSummary('budget-crud')
  }, [refreshActivityAiSummary])

  // ── Loaded activity data ──
  const loadMilestoneProjectProgress = useCallback(async (relatedChanges?: string | null) => {
    if (!projectId) {
      setMilestoneProjectProgress({
        actual: 0,
        eligibleCount: 0,
        planned: 0,
        resultsById: {},
      })
      return
    }

    try {
      const result = await Dga_aop_project_milestone_detailsesService.getAll({
        filter: `_dga_aop_project_value eq '${normalizeId(projectId)}'`,
        select: [
          'dga_aop_project_milestone_detailsid',
          'dga_planned_start_date',
          'dga_planned_end_date',
          'dga_planned_progress',
          'dga_actual_progress',
          'statuscode',
        ],
      })
      assertOperationSuccess(result, 'Unable to load milestone progress.')

      const milestones = ((result.data ?? []) as Dga_aop_project_milestone_detailses[])
        .filter((milestone) => milestone.dga_aop_project_milestone_detailsid)
        .map((milestone) => ({
          actualProgress: milestone.dga_actual_progress,
          id: milestone.dga_aop_project_milestone_detailsid,
          plannedEndDate: milestone.dga_planned_end_date,
          plannedProgress: milestone.dga_planned_progress,
          plannedStartDate: milestone.dga_planned_start_date,
          statuscode: milestone.statuscode,
        }))

      setMilestoneProjectProgress(calculateProjectMilestoneProgress(milestones, relatedChanges))
    } catch (error) {
      console.warn('Unable to calculate milestone project progress', error)
      setMilestoneProjectProgress({
        actual: 0,
        eligibleCount: 0,
        planned: 0,
        resultsById: {},
      })
    }
  }, [projectId])

  const logApprovalWorkflowTransition = useCallback((
    actionName: string,
    nextStatusCode: Dga_aop_projectsesBase['statuscode'] | number,
  ) => {
    void createApprovalWorkflowLog({
      actionName,
      newStatusCode: nextStatusCode,
      oldStatusCode: activity?.statuscode,
      projectId,
    })
  }, [activity?.statuscode, projectId])

  const activityName = activity?.dga_name || form.activityName || 'Edit Activity'
  const aiSummary = activity?.dga_description_summary || form.summary || 'No summary is available for this activity yet.'
  const statusCode = activity?.statuscode ?? 1 // Draft
  const projectPhase = activity?.dga_project_phase ?? 776140000 // Planning
  const projectPhaseCode = Number(projectPhase)
  const isExecutionPhase = projectPhaseCode === 776140001
  const shouldShowExecutionFields = isExecutionPhase && form.activityStatus !== '776140007'
  const isStrategic = form.activityScope === '1'
  const isPaymentOnly = form.activityClassification === '576610002'
  const isBudgetNo = form.budgetRequired === '0'
  const isAdeoVisible = form.adeoReported === '1'
  const isMilestoneProgressDisabled = isPaymentOnly
  const plannedMilestoneProgress = isMilestoneProgressDisabled ? 0 : milestoneProjectProgress.planned
  const actualMilestoneProgress = isMilestoneProgressDisabled ? 0 : milestoneProjectProgress.actual
  const displayedMilestoneProgress = isExecutionPhase ? actualMilestoneProgress : plannedMilestoneProgress
  const displayedMilestoneProgressLabel = isExecutionPhase ? 'Actual Progress' : 'Planned Progress'
  const headerProgressAriaLabel = isMilestoneProgressDisabled
    ? 'Milestone progress is unavailable for Payment Only activities'
    : `${displayedMilestoneProgressLabel} ${Math.round(displayedMilestoneProgress)}%`
  const operationInProgressLabel = isSavingActivityInfo
    ? 'Saving activity information'
    : objectiveHeaderAction?.isSaving
      ? objectiveHeaderAction.savingLabel
      : budgetHeaderAction?.isSaving
        ? budgetHeaderAction.savingLabel
        : isSubmittingToDirector || isSubmittingToStrategyTeam || isSubmittingToExecutiveDirector || isSubmittingToDirectorGeneral
          ? 'Submitting activity for review'
          : isApprovingAsDirectorGeneral || isApprovingExecutionUpdates
            ? 'Approving activity updates'
            : isRejectingExecutionUpdates
              ? 'Rejecting activity updates'
              : isStartingActivity
                ? 'Starting activity'
              : isSubmittingActivityUpdates
                ? 'Submitting activity updates'
                : ''
  const operationAlert = operationInProgressLabel
    ? { kind: 'processing' as const, title: operationInProgressLabel }
    : successMessage
      ? { kind: 'success' as const, message: successMessage, title: 'Changes saved' }
      : tabOperationAlert
  const operationAlertKey = operationAlert
    ? `${operationAlert.kind}:${operationAlert.title}:${operationAlert.message ?? ''}`
    : ''

  // ── Tab lock conditions ──
  const tabLocked: Partial<Record<TabId, boolean>> = {
    milestones: isPaymentOnly,
    budget: isBudgetNo,
    procurements: isBudgetNo || form.procurementRequired === '0',
  }

  const activityLeadName = activityLeadOptions.find((o) => o.value === form.activityLeadId)?.label ?? ''
  const isDivisionMember = selectedRole === 'AOP - Division Member'
  const isDivisionDirector = selectedRole === 'AOP - Division Director'
  const isStrategyTeam = selectedRole === 'AOP - Strategy Team'
  const isExecutiveDirector = selectedRole === 'AOP - Executive Director'
  const isDirectorGeneral = selectedRole === 'AOP - Director General'
  const ownerTeamId = normalizeId(activity?._owningteam_value)
  const ownerUserId = normalizeId(activity?._owninguser_value)
  const currentRoleTeamId = normalizeId(currentRole?.teamId)
  const currentUserId = normalizeId(systemUser?.systemuserid)
  const isOwnedByCurrentRoleTeam = Boolean(ownerTeamId && currentRoleTeamId && ownerTeamId === currentRoleTeamId)
  const isOwnedByCurrentUser = Boolean(ownerUserId && currentUserId && ownerUserId === currentUserId)
  const hasOwnerMismatch = Boolean(
    activity
    && !isStrategyTeam
    && (
      (ownerUserId && currentUserId && !isOwnedByCurrentUser)
      || (!ownerUserId && ownerTeamId && currentRoleTeamId && !isOwnedByCurrentRoleTeam)
    ),
  )
  const isExecutionApprovalPending = isExecutionPhase && [776140001, 776140003, 776140002].includes(Number(statusCode))
  const canApproveExecutionAsDivisionDirector = isDivisionDirector && isOwnedByCurrentRoleTeam && isExecutionPhase && statusCode === 776140001
  const canApproveExecutionAsStrategyTeam = isStrategyTeam && isOwnedByCurrentRoleTeam && isExecutionPhase && statusCode === 776140003
  const canApproveExecutionAsExecutiveDirector = isExecutiveDirector && isOwnedByCurrentRoleTeam && isExecutionPhase && statusCode === 776140002
  const canReviewExecutionUpdates = canApproveExecutionAsDivisionDirector || canApproveExecutionAsStrategyTeam || canApproveExecutionAsExecutiveDirector
  const hasApprovedExecutionBaseline = hasApprovedProjectRelatedChange(parseProjectRelatedChanges(activity?.dga_project_related_changes))
  const showExecutionPendingNotice = isDivisionMember && isExecutionApprovalPending
  const showExecutionRejectedNotice = Boolean(activity?.dga_is_rejected && activity?.dga_rejection_reason)
  const showExecutionApprovedNotice = (
    isExecutionPhase
    && statusCode === 776140011
    && !showExecutionRejectedNotice
    && hasApprovedExecutionBaseline
  )
  const showRespondentActionsNotice = showExecutionPendingNotice && !hasOwnerMismatch
  const persistentAlertKey = [
    errors.submit ? `submit:${errors.submit}` : '',
    showExecutionRejectedNotice ? `rejected:${activity?.dga_rejection_reason ?? ''}` : '',
    hasOwnerMismatch ? 'owner-mismatch' : '',
    showRespondentActionsNotice ? 'respondent-actions' : '',
    showExecutionApprovedNotice ? 'execution-approved' : '',
  ].filter(Boolean).join('|')
  const canShowSubmitActivityUpdates = (
    isDivisionMember
    && isOwnedByCurrentRoleTeam
    && statusCode === 776140011
    && isExecutionPhase
    && !['', '2', '776140007', '776140014'].includes(form.activityStatus)
  )
  const editPermissions = useMemo(() => {
    const ownerTeamId = normalizeId(activity?._owningteam_value)
    const currentRoleTeamId = normalizeId(currentRole?.teamId)
    const isOwnedByCurrentRoleTeam = Boolean(ownerTeamId && currentRoleTeamId && ownerTeamId === currentRoleTeamId)
    const hasFullEdit = (
      selectedRole === 'AOP - Strategy Team'
      || (
        selectedRole === 'AOP - Division Member'
        && isOwnedByCurrentRoleTeam
        && (statusCode === 1 || statusCode === 776140012)
      )
      || (
        selectedRole === 'AOP - Division Director'
        && isOwnedByCurrentRoleTeam
        && statusCode === 776140001
        && !isExecutionPhase
      )
    )
    const canEditExecutionStatusOnly = (
      selectedRole === 'AOP - Division Member'
      && isOwnedByCurrentRoleTeam
      && statusCode === 776140011
      && isExecutionPhase
      && form.activityStatus !== '776140007'
    )
    const canEditExecutionBudget = (
      selectedRole === 'AOP - Strategy Team'
      || canEditExecutionStatusOnly
    )
    const canEditMilestoneExecutionOnly = (
      selectedRole === 'AOP - Division Member'
      && isOwnedByCurrentRoleTeam
      && statusCode === 776140011
      && isExecutionPhase
      && form.activityStatus !== '776140007'
    )
    const isProcurementOnly = selectedRole === 'AOP - Procurement Team'
    const isPmoClassificationOnly = selectedRole === 'AOP - PMO'
    const activityInfoEditableFields = isPmoClassificationOnly
      ? ['activityClassification'] as Array<keyof ActivityForm>
      : canEditExecutionStatusOnly
        ? ['activityStatus', 'activityStatusJustification'] as Array<keyof ActivityForm>
        : undefined

    return {
      activityInfoCanSave: hasFullEdit || isPmoClassificationOnly || canEditExecutionStatusOnly,
      activityInfoEditableFields,
      activityInfoReadOnly: !hasFullEdit,
      activityInfoHasFullEdit: hasFullEdit,
      budgetReadOnly: !hasFullEdit,
      canSubmitToDivisionDirector: selectedRole === 'AOP - Division Member' && hasFullEdit,
      canSubmitToStrategyTeam: selectedRole === 'AOP - Division Director' && hasFullEdit && !isExecutionPhase,
      canSubmitToExecutiveDirector: selectedRole === 'AOP - Strategy Team' && isOwnedByCurrentRoleTeam && statusCode === 776140003 && !isExecutionPhase,
      canSubmitToDirectorGeneral: selectedRole === 'AOP - Executive Director' && isOwnedByCurrentRoleTeam && statusCode === 776140002 && !isExecutionPhase,
      canApproveAsDirectorGeneral: selectedRole === 'AOP - Director General' && isOwnedByCurrentRoleTeam && statusCode === 776140014 && !isExecutionPhase,
      canEditExecutionBudget,
      canStartActivity: selectedRole === 'AOP - Division Member' && isOwnedByCurrentRoleTeam && statusCode === 776140011 && isExecutionPhase && form.activityStatus === '776140007',
      canEditExecutionStatusOnly,
      canEditMilestoneExecutionOnly,
      milestonesReadOnly: !hasFullEdit && !canEditMilestoneExecutionOnly,
      objectivesReadOnly: !hasFullEdit,
      procurementReadOnly: !hasFullEdit && !isProcurementOnly,
      isPmoClassificationOnly,
    }
  }, [activity?._owningteam_value, currentRole?.teamId, form.activityStatus, isExecutionPhase, selectedRole, statusCode])
  const canShowDivisionMemberEditActions = !isDivisionMember || editPermissions.canSubmitToDivisionDirector || editPermissions.canEditExecutionStatusOnly
  const canShowDivisionDirectorReviewActions = !isDivisionDirector || editPermissions.canSubmitToStrategyTeam
  const canShowExecutiveDirectorReviewActions = !isExecutiveDirector
  const canShowDirectorGeneralReviewActions = !isDirectorGeneral
  const canShowHeaderSaveActions = canShowDivisionMemberEditActions && canShowDivisionDirectorReviewActions && canShowExecutiveDirectorReviewActions && canShowDirectorGeneralReviewActions
  const activityInfoHasUnsavedChanges = !areActivityFormsEqual(form, activityInfoSavedForm)
  const activeTabHasUnsavedChanges = activeTab === 'activity-info'
    ? activityInfoHasUnsavedChanges && editPermissions.activityInfoCanSave
    : activeTab === 'objectives'
      ? Boolean(objectiveHeaderAction?.hasUnsavedChanges)
      : activeTab === 'budget'
        ? Boolean(budgetHeaderAction?.hasUnsavedChanges)
        : false
  const activeSaveLabel = activeTab === 'objectives'
    ? objectiveHeaderAction?.label ?? (statusCode === 1 ? 'Save Draft' : 'Save Changes')
    : activeTab === 'budget'
      ? budgetHeaderAction?.label ?? (statusCode === 1 ? 'Save Draft' : 'Save Changes')
      : statusCode === 1 ? 'Save Draft' : 'Save Changes'

  // ── Context loading ──

  useEffect(() => {
    const tabsElement = stageTabsRef.current
    if (!tabsElement) return

    const viewport = window as Window & typeof globalThis

    if (!('IntersectionObserver' in window)) {
      const updateStickyVisibility = () => {
        const rect = tabsElement.getBoundingClientRect()
        setIsStickyStageTabsVisible(rect.bottom < 0 || rect.top > viewport.innerHeight)
      }

      updateStickyVisibility()
      viewport.addEventListener('scroll', updateStickyVisibility, { passive: true })
      viewport.addEventListener('resize', updateStickyVisibility)

      return () => {
        viewport.removeEventListener('scroll', updateStickyVisibility)
        viewport.removeEventListener('resize', updateStickyVisibility)
      }
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsStickyStageTabsVisible(!entry.isIntersecting)
      },
      { threshold: 0.01 },
    )

    observer.observe(tabsElement)

    return () => observer.disconnect()
  }, [isContextLoading])

  useEffect(() => {
    if (!operationAlertKey) return

    scrollPageToTop()
  }, [operationAlertKey])

  useEffect(() => {
    if (!persistentAlertKey) return

    scrollPageToTop()
  }, [persistentAlertKey])

  useEffect(() => {
    if (previousSelectedRoleRef.current === selectedRole) return

    previousSelectedRoleRef.current = selectedRole
    setSuccessMessage('')
    setTabOperationAlert(null)
    setExecutionRejectionError('')
    setErrors((currentErrors) => (
      currentErrors.context ? { context: currentErrors.context } : {}
    ))
  }, [selectedRole])

  useEffect(() => {
    if (!successMessage) return

    setTabOperationAlert(null)

    const timeoutId = window.setTimeout(() => {
      setSuccessMessage('')
    }, 10000)

    return () => window.clearTimeout(timeoutId)
  }, [successMessage])

  useEffect(() => {
    if (!tabOperationAlert || tabOperationAlert.kind === 'processing') return

    const timeoutId = window.setTimeout(() => {
      setTabOperationAlert(null)
    }, 10000)

    return () => window.clearTimeout(timeoutId)
  }, [tabOperationAlert])

  const showTabOperationAlert = useCallback<EditActivityOperationNotifier>((payload) => {
    if (payload) {
      setSuccessMessage('')
    }
    setTabOperationAlert(payload)
  }, [])

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
        setCreatedByName('')
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

        const createdById = normalizeId(project._createdby_value)
        let nextCreatedByName = ''

        if (createdById) {
          const createdByUser = users.find((user) => normalizeId(user.systemuserid) === createdById)
          nextCreatedByName = createdByUser?.fullname ?? createdByUser?.internalemailaddress ?? ''

          if (!nextCreatedByName) {
            const createdByResult = await SystemusersService.get(createdById, {
              select: ['systemuserid', 'fullname', 'internalemailaddress'],
            })
            assertOperationSuccess(createdByResult, 'Failed to load activity creator user.')
            const createdByUserResult = getResultValue<Systemusers>(createdByResult)
            nextCreatedByName = createdByUserResult?.fullname ?? createdByUserResult?.internalemailaddress ?? ''
          }
        }

        if (!isMounted) return

        const projectSectorId = normalizeId(project._dga_sector_value)
        const projectDivisionId = normalizeId(project._dga_department_value)
        const sector = projectSectorId
          ? allHierarchies.find((h) => normalizeId(h.dga_divisional_hierarchyid) === projectSectorId)
          : undefined
        const division = projectDivisionId
          ? allHierarchies.find((h) => normalizeId(h.dga_divisional_hierarchyid) === projectDivisionId)
          : undefined
        setActivityLeadOptions(activityLeadUsers)
        setPendingWith(ownerName || 'Not assigned')
        setCreatedByName(nextCreatedByName)
        setActivity(project)
        const loadedForm = applyActivityInformationRelatedChanges(
          projectToActivityForm(project, {
            sectorId: project._dga_sector_value ?? sector?.dga_divisional_hierarchyid ?? '',
            sectorName: sector?.dga_name ?? '',
            divisionId: project._dga_department_value ?? division?.dga_divisional_hierarchyid ?? '',
            divisionName: division?.dga_name ?? '',
          }),
          project.dga_project_related_changes,
        )
        setForm(loadedForm)
        setActivityInfoSavedForm(loadedForm)
      } catch (error) {
        if (isMounted) {
          setErrors({ context: error instanceof Error ? error.message : 'Failed to load context.' })
          setActivity(null)
          setPendingWith('Not assigned')
          setCreatedByName('')
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

  useEffect(() => {
    void loadActivityAiSummary()
  }, [loadActivityAiSummary])

  useEffect(() => {
    void loadMilestoneProjectProgress(activity?.dga_project_related_changes)
  }, [activity?.dga_project_related_changes, loadMilestoneProjectProgress])

  function updateForm(nextFields: Partial<ActivityForm>) {
    const changedFields = Object.keys(nextFields) as Array<keyof ActivityForm>
    const normalizedForm = normalizeControlledRules({ ...form, ...nextFields })

    setSuccessMessage('')
    setForm(normalizedForm)
    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors }
      const allRuntimeErrors = validateForm(normalizedForm, isExecutionPhase)
      const runtimeErrors = getRuntimeErrors(normalizedForm, changedFields, isExecutionPhase)

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

  async function saveActiveTabForNavigation() {
    if (activeTab === 'activity-info') {
      return handleSaveActivityInfo()
    }

    if (activeTab === 'objectives' && objectiveHeaderAction) {
      const result = await objectiveHeaderAction.onSave()
      return result !== false
    }

    if (activeTab === 'budget' && budgetHeaderAction) {
      const result = await budgetHeaderAction.onSave()
      return result !== false
    }

    return true
  }

  const discardActiveTabChanges = useCallback(() => {
    if (activeTab === 'activity-info') {
      setForm(activityInfoSavedForm)
      setErrors((currentErrors) => ({ ...currentErrors, submit: undefined }))
      return
    }

    if (activeTab === 'objectives') {
      objectiveHeaderAction?.discardChanges?.()
      return
    }

    if (activeTab === 'budget') {
      budgetHeaderAction?.discardChanges?.()
    }
  }, [activeTab, activityInfoSavedForm, budgetHeaderAction, objectiveHeaderAction])

  const handleNavigationGuardRequest = useCallback((action: () => void) => {
    if (!activeTabHasUnsavedChanges) {
      action()
      return true
    }

    setPendingNavigation({ action })
    return false
  }, [activeTabHasUnsavedChanges])

  useEffect(() => {
    return registerNavigationGuard(handleNavigationGuardRequest)
  }, [handleNavigationGuardRequest, registerNavigationGuard])

  useEffect(() => {
    if (!activeTabHasUnsavedChanges) return undefined

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [activeTabHasUnsavedChanges])

  async function handleSaveUnsavedChangesAndContinue() {
    if (!pendingNavigation || isUnsavedDialogSaving) return

    setIsUnsavedDialogSaving(true)
    try {
      const saved = await saveActiveTabForNavigation()
      if (!saved) {
        setPendingNavigation(null)
        return
      }

      const nextAction = pendingNavigation.action
      setPendingNavigation(null)
      nextAction()
    } finally {
      setIsUnsavedDialogSaving(false)
    }
  }

  function handleDiscardUnsavedChangesAndContinue() {
    if (!pendingNavigation || isUnsavedDialogSaving) return

    discardActiveTabChanges()
    const nextAction = pendingNavigation.action
    setPendingNavigation(null)
    nextAction()
  }

  function handleDismissUnsavedChangesDialog() {
    if (isUnsavedDialogSaving) return
    setPendingNavigation(null)
  }

  function handleGuardedRouteClick(event: MouseEvent<HTMLAnchorElement>, path: string) {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return
    }

    event.preventDefault()
    confirmNavigation(() => navigate(path))
  }

  // ── Action handlers ──

  async function handleSaveActivityInfo() {
    setSuccessMessage('')

    if (!editPermissions.activityInfoCanSave) {
      setTabOperationAlert({
        kind: 'error',
        message: 'You do not have permission to edit Activity Information for this activity.',
        title: 'Activity information was not saved',
      })
      return false
    }

    if (!projectId) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        context: 'Activity id is missing from the edit URL.',
      }))
      return false
    }

    const nextErrors = editPermissions.isPmoClassificationOnly
      ? getRuntimeErrors(form, ['activityClassification'])
      : editPermissions.canEditExecutionStatusOnly
        ? getRuntimeErrors(form, ['activityStatus', 'activityStatusJustification'], isExecutionPhase)
      : validateForm(form, isExecutionPhase)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      setActiveTab('activity-info')
      return false
    }

    setIsSavingActivityInfo(true)
    try {
      const payload = (() => {
        if (editPermissions.isPmoClassificationOnly) {
          return buildPmoActivityInfoUpdatePayload(form)
        }

        if (editPermissions.canEditExecutionStatusOnly) {
          const projectRelatedChanges = buildProjectRelatedChangesJson(
            activity?.dga_project_related_changes,
            {
              activity_information: {
                dga_project_activity_status: buildRelatedOldValueChange(
                  form.activityStatus ? Number(form.activityStatus) : '',
                ),
                dga_justification_for_activity_status: buildRelatedOldValueChange(
                  form.activityStatusJustification,
                ),
              },
            },
          )

          return {
            dga_project_related_changes: projectRelatedChanges,
          } satisfies Partial<Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid'>>
        }

        return buildActivityInfoUpdatePayload(form, isExecutionPhase)
      })()
      console.log('Edit activity information payload', payload)
      const result = await Dga_aop_projectsesService.update(
        projectId,
        payload as unknown as Partial<Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid'>>,
      )

      assertOperationSuccess(result, 'Failed to save activity information.')

      if (editPermissions.canEditExecutionStatusOnly && activity) {
        const existingRelatedChanges = parseProjectRelatedChanges(activity.dga_project_related_changes)
        const previousStatus = resolveProjectRelatedValue(getProjectRelatedChangeAt(
          existingRelatedChanges,
          ['activity_information', 'dga_project_activity_status'],
        ))
        const previousJustification = resolveProjectRelatedValue(getProjectRelatedChangeAt(
          existingRelatedChanges,
          ['activity_information', 'dga_justification_for_activity_status'],
        ))
        const nextStatus = form.activityStatus ? Number(form.activityStatus) : ''
        void createExecutionFieldLogs(projectId, [
          {
            logType: EXECUTION_LOG_TYPES.project,
            name: 'Activity Status',
            oldValue: formatActivityStatusLogValue(
              isEmptyRelatedValue(previousStatus)
                ? activity.dga_project_activity_status ?? ''
                : previousStatus,
            ),
            newValue: formatActivityStatusLogValue(nextStatus),
          },
          {
            logType: EXECUTION_LOG_TYPES.project,
            name: 'Activity Status Justification',
            oldValue: isEmptyRelatedValue(previousJustification)
              ? activity.dga_justification_for_activity_status ?? ''
              : previousJustification,
            newValue: form.activityStatusJustification,
          },
        ])
      }

      setActivity((currentActivity) => currentActivity ? {
        ...currentActivity,
        dga_name: form.activityName.trim(),
        dga_description_summary: form.summary,
        dga_activity_classification: payload.dga_activity_classification ?? currentActivity.dga_activity_classification,
        dga_activity_type: payload.dga_activity_type ?? currentActivity.dga_activity_type,
        dga_adeo_review_required: payload.dga_adeo_review_required ?? currentActivity.dga_adeo_review_required,
        dga_does_this_project_require_procurement: payload.dga_does_this_project_require_procurement ?? currentActivity.dga_does_this_project_require_procurement,
        dga_doesthisprojectrequirebudgetallocation: payload.dga_doesthisprojectrequirebudgetallocation ?? currentActivity.dga_doesthisprojectrequirebudgetallocation,
        dga_justification_for_activity_status: editPermissions.canEditExecutionStatusOnly
          ? currentActivity.dga_justification_for_activity_status
          : payload.dga_justification_for_activity_status ?? currentActivity.dga_justification_for_activity_status,
        dga_planned_end_date: form.plannedEndDate,
        dga_planned_start_date: form.plannedStartDate,
        dga_project_activity_status: editPermissions.canEditExecutionStatusOnly
          ? currentActivity.dga_project_activity_status
          : payload.dga_project_activity_status ?? currentActivity.dga_project_activity_status,
        dga_project_related_changes: payload.dga_project_related_changes ?? currentActivity.dga_project_related_changes,
        dga_project_kpi: form.activityKpi,
        dga_registered_or_will_be_registered_in_epm: payload.dga_registered_or_will_be_registered_in_epm ?? currentActivity.dga_registered_or_will_be_registered_in_epm,
        dga_scope: form.scopeDescription,
        dga_strategic_vs_operation: payload.dga_strategic_vs_operation ?? currentActivity.dga_strategic_vs_operation,
      } : currentActivity)
      setErrors((currentErrors) => ({ ...currentErrors, submit: undefined }))
      setSuccessMessage('Activity information saved successfully.')
      setActivityInfoSavedForm(form)
      refreshActivityAiSummary('activity-information-save')
      return true
    } catch (error) {
      setTabOperationAlert({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Failed to save activity information.',
        title: 'Activity information was not saved',
      })
      return false
    } finally {
      setIsSavingActivityInfo(false)
    }
  }

  const validateActivitySubmissionRequirements = useCallback(async () => {
    setSuccessMessage('')

    if (!projectId) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        context: 'Activity id is missing from the edit URL.',
      }))
      return false
    }

    try {
      const validationResult = await validateSubmissionRequirements({
        form,
        isExecutionPhase,
        projectId,
        tabLocks: {
          budget: tabLocked.budget,
          milestones: tabLocked.milestones,
          procurements: tabLocked.procurements,
        },
      })

      if (!validationResult.valid) {
        setErrors({
          ...(validationResult.fieldErrors ?? {}),
          submit: validationResult.message,
        })
        setActiveTab(validationResult.section)
        return false
      }

      setErrors((currentErrors) => ({ ...currentErrors, submit: undefined }))
      return true
    } catch (error) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        submit: error instanceof Error ? error.message : 'Unable to validate activity submission requirements.',
      }))
      return false
    }
  }, [form, isExecutionPhase, projectId, tabLocked.budget, tabLocked.milestones, tabLocked.procurements])

  const validateSubmitToDivisionDirector = useCallback(async () => {
    if (!isDivisionMember || !editPermissions.canSubmitToDivisionDirector) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        submit: 'You can submit this activity only when it is assigned to your Division Member team and is editable.',
      }))
      return false
    }

    return validateActivitySubmissionRequirements()
  }, [
    editPermissions.canSubmitToDivisionDirector,
    isDivisionMember,
    validateActivitySubmissionRequirements,
  ])

  const validateSubmitToStrategyTeam = useCallback(async () => {
    if (!isDivisionDirector || !editPermissions.canSubmitToStrategyTeam) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        submit: 'You can submit this activity only when it is assigned to your Division Director team and is in Division Director Review.',
      }))
      return false
    }

    return validateActivitySubmissionRequirements()
  }, [
    editPermissions.canSubmitToStrategyTeam,
    isDivisionDirector,
    validateActivitySubmissionRequirements,
  ])

  const validateSubmitToExecutiveDirector = useCallback(async () => {
    if (!isStrategyTeam || !editPermissions.canSubmitToExecutiveDirector) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        submit: 'You can submit this activity only when it is assigned to your Strategy Team and is in Strategy Team Review.',
      }))
      return false
    }

    return validateActivitySubmissionRequirements()
  }, [
    editPermissions.canSubmitToExecutiveDirector,
    isStrategyTeam,
    validateActivitySubmissionRequirements,
  ])

  const validateSubmitToDirectorGeneral = useCallback(async () => {
    if (!isExecutiveDirector || !editPermissions.canSubmitToDirectorGeneral) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        submit: 'You can submit this activity only when it is assigned to your Executive Director team and is in Executive Director Review.',
      }))
      return false
    }

    return validateActivitySubmissionRequirements()
  }, [
    editPermissions.canSubmitToDirectorGeneral,
    isExecutiveDirector,
    validateActivitySubmissionRequirements,
  ])

  const validateApproveAsDirectorGeneral = useCallback(async () => {
    if (!isDirectorGeneral || !editPermissions.canApproveAsDirectorGeneral) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        submit: 'You can approve this activity only when it is assigned to your Director General team and is in Director General Review.',
      }))
      return false
    }

    return validateActivitySubmissionRequirements()
  }, [
    editPermissions.canApproveAsDirectorGeneral,
    isDirectorGeneral,
    validateActivitySubmissionRequirements,
  ])

  const handleSubmitToDivisionDirector = useCallback(async () => {
    if (isSubmittingToDirector) return

    const canSubmit = await validateSubmitToDivisionDirector()
    if (canSubmit) {
      setIsSubmitConfirmOpen(true)
    }
  }, [isSubmittingToDirector, validateSubmitToDivisionDirector])

  const handleConfirmSubmitToDivisionDirector = useCallback(async () => {
    if (isSubmittingToDirector) return

    const canSubmit = await validateSubmitToDivisionDirector()
    if (!canSubmit) {
      setIsSubmitConfirmOpen(false)
      return
    }

    const planningInstanceId = normalizeId(activity?._dga_project_planning_instance_value)
    if (!planningInstanceId) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        submit: 'Planning instance could not be resolved for this activity.',
      }))
      setIsSubmitConfirmOpen(false)
      return
    }

    setIsSubmittingToDirector(true)
    setSuccessMessage('')

    try {
      const planningInstanceResult = await Dga_project_planning_instancesService.get(planningInstanceId, {
        select: [
          'dga_project_planning_instanceid',
          '_dga_division_director_team_value',
        ],
      })
      assertOperationSuccess(planningInstanceResult, 'Unable to load Division Director team from the planning instance.')

      const planningInstance = getResultValue<Dga_project_planning_instances>(planningInstanceResult)
      const divisionDirectorTeamId = normalizeId(planningInstance?._dga_division_director_team_value)

      if (!divisionDirectorTeamId) {
        throw new Error('Division Director team could not be resolved from the current planning instance.')
      }

      const payload = {
        dga_is_rejected: false,
        dga_rejection_reason: '',
        statuscode: 776140001 as Dga_aop_projectsesBase['statuscode'],
        'ownerid@odata.bind': toEntityBind('teams', divisionDirectorTeamId),
      }

      console.log('Submit to Division Director payload', payload)
      const submitResult = await Dga_aop_projectsesService.update(
        projectId,
        payload as unknown as Partial<Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid'>>,
      )
      assertOperationSuccess(submitResult, 'Failed to submit activity to Division Director.')

      let nextPendingWith = 'Division Director'
      try {
        const teamResult = await TeamsService.get(divisionDirectorTeamId, {
          select: ['teamid', 'name'],
        })
        assertOperationSuccess(teamResult, 'Unable to load Division Director team name.')
        nextPendingWith = getResultValue<Teams>(teamResult)?.name || nextPendingWith
      } catch {
        // Owner assignment succeeded; pending-with display can safely fall back.
      }

      logApprovalWorkflowTransition('Submit to Division Director', 776140001)

      setActivity((currentActivity) => currentActivity ? {
        ...currentActivity,
        _owningteam_value: divisionDirectorTeamId,
        _owninguser_value: undefined,
        dga_is_rejected: false,
        dga_rejection_reason: '',
        owneridname: nextPendingWith,
        statuscode: 776140001,
      } : currentActivity)
      setPendingWith(nextPendingWith)
      setErrors((currentErrors) => ({ ...currentErrors, submit: undefined }))
      setSuccessMessage('Activity submitted to Division Director successfully.')
      setIsSubmitConfirmOpen(false)
    } catch (error) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        submit: error instanceof Error ? error.message : 'Failed to submit activity to Division Director.',
      }))
      setIsSubmitConfirmOpen(false)
    } finally {
      setIsSubmittingToDirector(false)
    }
  }, [
    activity?._dga_project_planning_instance_value,
    isSubmittingToDirector,
    logApprovalWorkflowTransition,
    projectId,
    validateSubmitToDivisionDirector,
  ])

  const resolveStrategyTeam = useCallback(async () => {
    const strategyTeamResult = await TeamsService.getAll({
      filter: `name eq '${escapeODataValue('AOP - Strategy Team')}'`,
      select: ['teamid', 'name'],
      top: 1,
    })
    assertOperationSuccess(strategyTeamResult, 'Unable to resolve Strategy Team owner.')

    const strategyTeam = getResultArray<Teams>(strategyTeamResult)[0]
    const strategyTeamId = normalizeId(strategyTeam?.teamid)

    if (!strategyTeamId) {
      throw new Error('AOP - Strategy Team team could not be found.')
    }

    return {
      id: strategyTeamId,
      name: strategyTeam.name || 'AOP - Strategy Team',
    }
  }, [])

  const resolvePlanningInstanceTeam = useCallback(async (
    teamField:
      | '_dga_division_member_team_value'
      | '_dga_division_director_team_value'
      | '_dga_executive_director_team_value',
    fallbackName: string,
  ) => {
    const planningInstanceId = normalizeId(activity?._dga_project_planning_instance_value)
    if (!planningInstanceId) {
      throw new Error('Planning instance could not be resolved for this activity.')
    }

    const planningInstanceResult = await Dga_project_planning_instancesService.get(planningInstanceId, {
      select: ['dga_project_planning_instanceid', teamField],
    })
    assertOperationSuccess(planningInstanceResult, `Unable to load ${fallbackName} team from the planning instance.`)

    const planningInstance = getResultValue<Dga_project_planning_instances>(planningInstanceResult) as Dga_project_planning_instances & Record<string, unknown>
    const teamId = normalizeId(planningInstance?.[teamField] as string | undefined)

    if (!teamId) {
      throw new Error(`${fallbackName} team could not be resolved from the current planning instance.`)
    }

    let teamName = fallbackName
    try {
      const teamResult = await TeamsService.get(teamId, {
        select: ['teamid', 'name'],
      })
      assertOperationSuccess(teamResult, `Unable to load ${fallbackName} team name.`)
      teamName = getResultValue<Teams>(teamResult)?.name || teamName
    } catch {
      // Owner assignment can proceed with the resolved id; display name can fall back.
    }

    return {
      id: teamId,
      name: teamName,
    }
  }, [activity?._dga_project_planning_instance_value])

  const handleSubmitToStrategyTeam = useCallback(async () => {
    if (isSubmittingToStrategyTeam) return

    const canSubmit = await validateSubmitToStrategyTeam()
    if (canSubmit) {
      setIsStrategySubmitConfirmOpen(true)
    }
  }, [isSubmittingToStrategyTeam, validateSubmitToStrategyTeam])

  const handleConfirmSubmitToStrategyTeam = useCallback(async () => {
    if (isSubmittingToStrategyTeam) return

    const canSubmit = await validateSubmitToStrategyTeam()
    if (!canSubmit) {
      setIsStrategySubmitConfirmOpen(false)
      return
    }

    setIsSubmittingToStrategyTeam(true)
    setSuccessMessage('')

    try {
      const strategyTeam = await resolveStrategyTeam()
      const payload = {
        statuscode: 776140003 as Dga_aop_projectsesBase['statuscode'],
        'ownerid@odata.bind': toEntityBind('teams', strategyTeam.id),
      }

      console.log('Submit to Strategy Team payload', payload)
      const submitResult = await Dga_aop_projectsesService.update(
        projectId,
        payload as unknown as Partial<Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid'>>,
      )
      assertOperationSuccess(submitResult, 'Failed to submit activity to Strategy Team.')
      logApprovalWorkflowTransition('Submit to Strategy Team', 776140003)

      setActivity((currentActivity) => currentActivity ? {
        ...currentActivity,
        _owningteam_value: strategyTeam.id,
        _owninguser_value: undefined,
        owneridname: strategyTeam.name,
        statuscode: 776140003,
      } : currentActivity)
      setPendingWith(strategyTeam.name)
      setErrors((currentErrors) => ({ ...currentErrors, submit: undefined }))
      setSuccessMessage('Activity submitted to Strategy Team successfully.')
      setIsStrategySubmitConfirmOpen(false)
    } catch (error) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        submit: error instanceof Error ? error.message : 'Failed to submit activity to Strategy Team.',
      }))
      setIsStrategySubmitConfirmOpen(false)
    } finally {
      setIsSubmittingToStrategyTeam(false)
    }
  }, [
    isSubmittingToStrategyTeam,
    logApprovalWorkflowTransition,
    projectId,
    resolveStrategyTeam,
    validateSubmitToStrategyTeam,
  ])

  const handleSubmitToExecutiveDirector = useCallback(async () => {
    if (isSubmittingToExecutiveDirector) return

    const canSubmit = await validateSubmitToExecutiveDirector()
    if (canSubmit) {
      setIsExecutiveSubmitConfirmOpen(true)
    }
  }, [isSubmittingToExecutiveDirector, validateSubmitToExecutiveDirector])

  const handleConfirmSubmitToExecutiveDirector = useCallback(async () => {
    if (isSubmittingToExecutiveDirector) return

    const canSubmit = await validateSubmitToExecutiveDirector()
    if (!canSubmit) {
      setIsExecutiveSubmitConfirmOpen(false)
      return
    }

    const planningInstanceId = normalizeId(activity?._dga_project_planning_instance_value)
    if (!planningInstanceId) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        submit: 'Planning instance could not be resolved for this activity.',
      }))
      setIsExecutiveSubmitConfirmOpen(false)
      return
    }

    setIsSubmittingToExecutiveDirector(true)
    setSuccessMessage('')

    try {
      const planningInstanceResult = await Dga_project_planning_instancesService.get(planningInstanceId, {
        select: [
          'dga_project_planning_instanceid',
          '_dga_executive_director_team_value',
        ],
      })
      assertOperationSuccess(planningInstanceResult, 'Unable to load Executive Director team from the planning instance.')

      const planningInstance = getResultValue<Dga_project_planning_instances>(planningInstanceResult)
      const executiveDirectorTeamId = normalizeId(planningInstance?._dga_executive_director_team_value)

      if (!executiveDirectorTeamId) {
        throw new Error('Executive Director team could not be resolved from the current planning instance.')
      }

      const payload = {
        statuscode: 776140002 as Dga_aop_projectsesBase['statuscode'],
        'ownerid@odata.bind': toEntityBind('teams', executiveDirectorTeamId),
      }

      console.log('Submit to Executive Director payload', payload)
      const submitResult = await Dga_aop_projectsesService.update(
        projectId,
        payload as unknown as Partial<Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid'>>,
      )
      assertOperationSuccess(submitResult, 'Failed to submit activity to Executive Director.')

      let nextPendingWith = 'Executive Director'
      try {
        const teamResult = await TeamsService.get(executiveDirectorTeamId, {
          select: ['teamid', 'name'],
        })
        assertOperationSuccess(teamResult, 'Unable to load Executive Director team name.')
        nextPendingWith = getResultValue<Teams>(teamResult)?.name || nextPendingWith
      } catch {
        // Owner assignment succeeded; pending-with display can safely fall back.
      }

      logApprovalWorkflowTransition('Submit to Executive Director', 776140002)

      setActivity((currentActivity) => currentActivity ? {
        ...currentActivity,
        _owningteam_value: executiveDirectorTeamId,
        _owninguser_value: undefined,
        owneridname: nextPendingWith,
        statuscode: 776140002,
      } : currentActivity)
      setPendingWith(nextPendingWith)
      setErrors((currentErrors) => ({ ...currentErrors, submit: undefined }))
      setSuccessMessage('Activity submitted to Executive Director successfully.')
      setIsExecutiveSubmitConfirmOpen(false)
    } catch (error) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        submit: error instanceof Error ? error.message : 'Failed to submit activity to Executive Director.',
      }))
      setIsExecutiveSubmitConfirmOpen(false)
    } finally {
      setIsSubmittingToExecutiveDirector(false)
    }
  }, [
    activity?._dga_project_planning_instance_value,
    isSubmittingToExecutiveDirector,
    logApprovalWorkflowTransition,
    projectId,
    validateSubmitToExecutiveDirector,
  ])

  const resolveDirectorGeneralTeam = useCallback(async () => {
    const directorGeneralTeamResult = await TeamsService.getAll({
      filter: `name eq '${escapeODataValue('AOP - Director General')}'`,
      select: ['teamid', 'name'],
      top: 1,
    })
    assertOperationSuccess(directorGeneralTeamResult, 'Unable to resolve Director General owner.')

    const directorGeneralTeam = getResultArray<Teams>(directorGeneralTeamResult)[0]
    const directorGeneralTeamId = normalizeId(directorGeneralTeam?.teamid)

    if (!directorGeneralTeamId) {
      throw new Error('AOP - Director General team could not be found.')
    }

    return {
      id: directorGeneralTeamId,
      name: directorGeneralTeam.name || 'AOP - Director General',
    }
  }, [])

  const handleSubmitToDirectorGeneral = useCallback(async () => {
    if (isSubmittingToDirectorGeneral) return

    const canSubmit = await validateSubmitToDirectorGeneral()
    if (canSubmit) {
      setIsDirectorGeneralSubmitConfirmOpen(true)
    }
  }, [isSubmittingToDirectorGeneral, validateSubmitToDirectorGeneral])

  const handleConfirmSubmitToDirectorGeneral = useCallback(async () => {
    if (isSubmittingToDirectorGeneral) return

    const canSubmit = await validateSubmitToDirectorGeneral()
    if (!canSubmit) {
      setIsDirectorGeneralSubmitConfirmOpen(false)
      return
    }

    setIsSubmittingToDirectorGeneral(true)
    setSuccessMessage('')

    try {
      const directorGeneralTeam = await resolveDirectorGeneralTeam()
      const payload = {
        statuscode: 776140014 as Dga_aop_projectsesBase['statuscode'],
        'ownerid@odata.bind': toEntityBind('teams', directorGeneralTeam.id),
      }

      console.log('Submit to Director General payload', payload)
      const submitResult = await Dga_aop_projectsesService.update(
        projectId,
        payload as unknown as Partial<Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid'>>,
      )
      assertOperationSuccess(submitResult, 'Failed to submit activity to Director General.')
      logApprovalWorkflowTransition('Submit to Director General', 776140014)

      setActivity((currentActivity) => currentActivity ? {
        ...currentActivity,
        _owningteam_value: directorGeneralTeam.id,
        _owninguser_value: undefined,
        owneridname: directorGeneralTeam.name,
        statuscode: 776140014,
      } : currentActivity)
      setPendingWith(directorGeneralTeam.name)
      setErrors((currentErrors) => ({ ...currentErrors, submit: undefined }))
      setSuccessMessage('Activity submitted to Director General successfully.')
      setIsDirectorGeneralSubmitConfirmOpen(false)
    } catch (error) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        submit: error instanceof Error ? error.message : 'Failed to submit activity to Director General.',
      }))
      setIsDirectorGeneralSubmitConfirmOpen(false)
    } finally {
      setIsSubmittingToDirectorGeneral(false)
    }
  }, [
    isSubmittingToDirectorGeneral,
    logApprovalWorkflowTransition,
    projectId,
    resolveDirectorGeneralTeam,
    validateSubmitToDirectorGeneral,
  ])

  const handleApproveAsDirectorGeneral = useCallback(async () => {
    if (isApprovingAsDirectorGeneral) return

    const canApprove = await validateApproveAsDirectorGeneral()
    if (canApprove) {
      setIsDirectorGeneralApproveConfirmOpen(true)
    }
  }, [isApprovingAsDirectorGeneral, validateApproveAsDirectorGeneral])

  const handleConfirmApproveAsDirectorGeneral = useCallback(async () => {
    if (isApprovingAsDirectorGeneral) return

    const canApprove = await validateApproveAsDirectorGeneral()
    if (!canApprove) {
      setIsDirectorGeneralApproveConfirmOpen(false)
      return
    }

    const planningInstanceId = normalizeId(activity?._dga_project_planning_instance_value)
    if (!planningInstanceId) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        submit: 'Planning instance could not be resolved for this activity.',
      }))
      setIsDirectorGeneralApproveConfirmOpen(false)
      return
    }

    setIsApprovingAsDirectorGeneral(true)
    setSuccessMessage('')

    try {
      const planningInstanceResult = await Dga_project_planning_instancesService.get(planningInstanceId, {
        select: [
          'dga_project_planning_instanceid',
          '_dga_division_member_team_value',
        ],
      })
      assertOperationSuccess(planningInstanceResult, 'Unable to load Division Member team from the planning instance.')

      const planningInstance = getResultValue<Dga_project_planning_instances>(planningInstanceResult)
      const divisionMemberTeamId = normalizeId(planningInstance?._dga_division_member_team_value)

      if (!divisionMemberTeamId) {
        throw new Error('Division Member team could not be resolved from the current planning instance.')
      }

      const payload = {
        dga_project_activity_status: 776140007 as Dga_aop_projectsesBase['dga_project_activity_status'],
        dga_project_phase: 776140001 as Dga_aop_projectsesBase['dga_project_phase'],
        statuscode: 776140011 as Dga_aop_projectsesBase['statuscode'],
        'ownerid@odata.bind': toEntityBind('teams', divisionMemberTeamId),
      }

      console.log('Director General approve payload', payload)
      const approveResult = await Dga_aop_projectsesService.update(
        projectId,
        payload as unknown as Partial<Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid'>>,
      )
      assertOperationSuccess(approveResult, 'Failed to approve activity.')

      let nextPendingWith = 'Division Member'
      try {
        const teamResult = await TeamsService.get(divisionMemberTeamId, {
          select: ['teamid', 'name'],
        })
        assertOperationSuccess(teamResult, 'Unable to load Division Member team name.')
        nextPendingWith = getResultValue<Teams>(teamResult)?.name || nextPendingWith
      } catch {
        // Approval succeeded; pending-with display can safely fall back.
      }

      logApprovalWorkflowTransition('Approve Activity', 776140011)

      setActivity((currentActivity) => currentActivity ? {
        ...currentActivity,
        dga_project_activity_status: 776140007,
        _owningteam_value: divisionMemberTeamId,
        _owninguser_value: undefined,
        dga_project_phase: 776140001,
        owneridname: nextPendingWith,
        statuscode: 776140011,
      } : currentActivity)
      setForm((currentForm) => ({
        ...currentForm,
        activityStatus: '776140007',
        activityStatusJustification: '',
      }))
      setPendingWith(nextPendingWith)
      setErrors((currentErrors) => ({ ...currentErrors, submit: undefined }))
      setSuccessMessage('Activity approved successfully.')
      setIsDirectorGeneralApproveConfirmOpen(false)
    } catch (error) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        submit: error instanceof Error ? error.message : 'Failed to approve activity.',
      }))
      setIsDirectorGeneralApproveConfirmOpen(false)
    } finally {
      setIsApprovingAsDirectorGeneral(false)
    }
  }, [
    activity?._dga_project_planning_instance_value,
    isApprovingAsDirectorGeneral,
    logApprovalWorkflowTransition,
    projectId,
    validateApproveAsDirectorGeneral,
  ])

  const handleRequestClarification = useCallback(() => {
    // TODO: Implement clarification request logic
    console.log('Request Clarification')
  }, [])

  const handleStartActivity = useCallback(async () => {
    if (isStartingActivity) return
    if (!isDivisionMember || !editPermissions.canStartActivity) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        submit: 'You can start this activity only when it is active, in execution, assigned to your Division Member team, and still not started.',
      }))
      return
    }

    setIsStartingActivity(true)
    setSuccessMessage('')

    try {
      const nextActivityStatus = 776140006 as Dga_aop_projectsesBase['dga_project_activity_status']
      const nextActivityStatusJustification = ''
      const projectRelatedChanges = buildProjectRelatedChangesJson(
        activity?.dga_project_related_changes,
        mergeProjectRelatedChanges(
          buildExecutionRelatedChangesTemplate(),
          {
            activity_information: {
              dga_project_activity_status: {
                old_value: nextActivityStatus,
                new_value: activity?.dga_project_activity_status ?? '',
              },
              dga_justification_for_activity_status: {
                old_value: activity?.dga_justification_for_activity_status ?? '',
                new_value: '',
              },
            },
          },
        ),
      )
      const payload = {
        dga_project_activity_status: nextActivityStatus,
        dga_justification_for_activity_status: nextActivityStatusJustification,
        dga_project_related_changes: projectRelatedChanges,
      }

      console.log('Start Activity payload', payload)
      const startResult = await Dga_aop_projectsesService.update(
        projectId,
        payload as unknown as Partial<Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid'>>,
      )
      assertOperationSuccess(startResult, 'Failed to start activity.')

      setActivity((currentActivity) => currentActivity ? {
        ...currentActivity,
        dga_project_activity_status: nextActivityStatus,
        dga_justification_for_activity_status: nextActivityStatusJustification,
        dga_project_related_changes: projectRelatedChanges,
      } : currentActivity)
      setForm((currentForm) => ({
        ...currentForm,
        activityStatus: '776140006',
        activityStatusJustification: '',
      }))
      setErrors((currentErrors) => ({ ...currentErrors, submit: undefined }))
      setSuccessMessage('Activity started successfully.')
    } catch (error) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        submit: error instanceof Error ? error.message : 'Failed to start activity.',
      }))
    } finally {
      setIsStartingActivity(false)
    }
  }, [
    activity?.dga_justification_for_activity_status,
    activity?.dga_project_activity_status,
    activity?.dga_project_related_changes,
    editPermissions.canStartActivity,
    isDivisionMember,
    isStartingActivity,
    projectId,
  ])

  const validateSubmitActivityUpdates = useCallback(async () => {
    if (!canShowSubmitActivityUpdates) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        submit: 'You can submit activity updates only when this active execution activity is assigned to your Division Member team.',
      }))
      return false
    }

    if (!projectId) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        submit: 'Activity id is missing from the edit URL.',
      }))
      return false
    }

    const validation = await validateExecutionUpdateSubmission({
      form,
      projectId,
      relatedChanges: activity?.dga_project_related_changes,
    })

    if (!validation.valid) {
      setErrors({
        ...(validation.fieldErrors ?? {}),
        submit: validation.message,
      })
      setActiveTab(validation.section)
      return false
    }

    setErrors((currentErrors) => ({ ...currentErrors, submit: undefined }))
    return true
  }, [
    activity?.dga_project_related_changes,
    canShowSubmitActivityUpdates,
    form,
    projectId,
  ])

  const handleSubmitActivityUpdates = useCallback(async () => {
    if (isSubmittingActivityUpdates) return

    const canSubmit = await validateSubmitActivityUpdates()
    if (canSubmit) {
      setIsActivityUpdateSubmitConfirmOpen(true)
    }
  }, [isSubmittingActivityUpdates, validateSubmitActivityUpdates])

  const handleConfirmSubmitActivityUpdates = useCallback(async () => {
    if (isSubmittingActivityUpdates) return

    const canSubmit = await validateSubmitActivityUpdates()
    if (!canSubmit) {
      setIsActivityUpdateSubmitConfirmOpen(false)
      return
    }

    const planningInstanceId = normalizeId(activity?._dga_project_planning_instance_value)
    if (!planningInstanceId) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        submit: 'Planning instance could not be resolved for this activity.',
      }))
      setIsActivityUpdateSubmitConfirmOpen(false)
      return
    }

    setIsSubmittingActivityUpdates(true)
    setSuccessMessage('')

    try {
      const planningInstanceResult = await Dga_project_planning_instancesService.get(planningInstanceId, {
        select: [
          'dga_project_planning_instanceid',
          '_dga_division_director_team_value',
        ],
      })
      assertOperationSuccess(planningInstanceResult, 'Unable to load Division Director team from the planning instance.')

      const planningInstance = getResultValue<Dga_project_planning_instances>(planningInstanceResult)
      const divisionDirectorTeamId = normalizeId(planningInstance?._dga_division_director_team_value)

      if (!divisionDirectorTeamId) {
        throw new Error('Division Director team could not be resolved from the current planning instance.')
      }

      const payload = {
        dga_is_rejected: false,
        dga_rejection_reason: '',
        statuscode: 776140001 as Dga_aop_projectsesBase['statuscode'],
        'ownerid@odata.bind': toEntityBind('teams', divisionDirectorTeamId),
      }

      console.log('Submit Activity Updates payload', payload)
      const submitResult = await Dga_aop_projectsesService.update(
        projectId,
        payload as unknown as Partial<Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid'>>,
      )
      assertOperationSuccess(submitResult, 'Failed to submit activity updates.')

      let nextPendingWith = 'Division Director'
      try {
        const teamResult = await TeamsService.get(divisionDirectorTeamId, {
          select: ['teamid', 'name'],
        })
        assertOperationSuccess(teamResult, 'Unable to load Division Director team name.')
        nextPendingWith = getResultValue<Teams>(teamResult)?.name || nextPendingWith
      } catch {
        // Owner assignment succeeded; pending-with display can safely fall back.
      }

      logApprovalWorkflowTransition('Submit Activity Updates', 776140001)

      setActivity((currentActivity) => currentActivity ? {
        ...currentActivity,
        _owningteam_value: divisionDirectorTeamId,
        _owninguser_value: undefined,
        dga_is_rejected: false,
        dga_rejection_reason: '',
        owneridname: nextPendingWith,
        statuscode: 776140001,
      } : currentActivity)
      setPendingWith(nextPendingWith)
      setErrors((currentErrors) => ({ ...currentErrors, submit: undefined }))
      setSuccessMessage('Activity updates submitted to Division Director successfully.')
      setIsActivityUpdateSubmitConfirmOpen(false)
      refreshActivityAiSummary('submit-activity-updates')
    } catch (error) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        submit: error instanceof Error ? error.message : 'Failed to submit activity updates.',
      }))
      setIsActivityUpdateSubmitConfirmOpen(false)
    } finally {
      setIsSubmittingActivityUpdates(false)
    }
  }, [
    activity?._dga_project_planning_instance_value,
    isSubmittingActivityUpdates,
    logApprovalWorkflowTransition,
    projectId,
    refreshActivityAiSummary,
    validateSubmitActivityUpdates,
  ])

  const executionApproveDescription = useMemo(() => {
    if (canApproveExecutionAsDivisionDirector) {
      return 'This action will approve the submitted project updates at the Division Director level and forward them to the Strategy Team for review. Are you sure you want to proceed?'
    }

    if (canApproveExecutionAsStrategyTeam) {
      return 'This action will approve the submitted project updates at the Sector Director level, and the approved changes will be reflected. Are you sure you want to proceed?'
    }

    if (canApproveExecutionAsExecutiveDirector) {
      return 'This action will approve the submitted project updates at the Strategy Team level. You will need to send it to the Executive Director after approval to move it forward. Are you sure you want to proceed?'
    }

    return 'This action will approve the submitted project updates. Are you sure you want to proceed?'
  }, [
    canApproveExecutionAsDivisionDirector,
    canApproveExecutionAsExecutiveDirector,
    canApproveExecutionAsStrategyTeam,
  ])

  const handleApproveExecutionUpdates = useCallback(() => {
    if (!canReviewExecutionUpdates || isApprovingExecutionUpdates) return
    setIsExecutionApproveConfirmOpen(true)
  }, [canReviewExecutionUpdates, isApprovingExecutionUpdates])

  const handleConfirmApproveExecutionUpdates = useCallback(async () => {
    if (!canReviewExecutionUpdates || isApprovingExecutionUpdates) return

    setIsApprovingExecutionUpdates(true)
    setSuccessMessage('')

    try {
      const next = await (async () => {
        if (canApproveExecutionAsDivisionDirector) {
          const strategyTeam = await resolveStrategyTeam()
          return {
            applyRealFields: false,
            owner: strategyTeam,
            relatedChanges: activity?.dga_project_related_changes,
            statuscode: 776140003 as Dga_aop_projectsesBase['statuscode'],
            success: 'Activity updates approved and forwarded to Strategy Team.',
          }
        }

        if (canApproveExecutionAsStrategyTeam) {
          const executiveDirectorTeam = await resolvePlanningInstanceTeam('_dga_executive_director_team_value', 'Executive Director')
          return {
            applyRealFields: false,
            owner: executiveDirectorTeam,
            relatedChanges: activity?.dga_project_related_changes,
            statuscode: 776140002 as Dga_aop_projectsesBase['statuscode'],
            success: 'Activity updates approved and forwarded to Executive Director.',
          }
        }

        const divisionMemberTeam = await resolvePlanningInstanceTeam('_dga_division_member_team_value', 'Division Member')
        return {
          applyRealFields: true,
          owner: divisionMemberTeam,
          relatedChanges: approveProjectRelatedChanges(activity?.dga_project_related_changes),
          statuscode: 776140011 as Dga_aop_projectsesBase['statuscode'],
          success: 'Activity updates approved successfully.',
        }
      })()

      const approvedExecutionPayload = next.applyRealFields
        ? await persistApprovedExecutionRelatedChanges(activity?.dga_project_related_changes)
        : {}
      const payload = {
        ...approvedExecutionPayload,
        dga_is_rejected: false,
        dga_project_related_changes: next.relatedChanges,
        dga_rejection_reason: '',
        statuscode: next.statuscode,
        'ownerid@odata.bind': toEntityBind('teams', next.owner.id),
      }

      console.log('Approve execution updates payload', payload)
      const approveResult = await Dga_aop_projectsesService.update(
        projectId,
        payload as unknown as Partial<Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid'>>,
      )
      assertOperationSuccess(approveResult, 'Failed to approve activity updates.')
      logApprovalWorkflowTransition('Approve Activity Updates', next.statuscode)

      setActivity((currentActivity) => currentActivity ? {
        ...currentActivity,
        _owningteam_value: next.owner.id,
        _owninguser_value: undefined,
        dga_is_rejected: false,
        dga_project_related_changes: next.relatedChanges,
        dga_rejection_reason: '',
        owneridname: next.owner.name,
        statuscode: next.statuscode,
      } : currentActivity)
      setPendingWith(next.owner.name)
      setErrors((currentErrors) => ({ ...currentErrors, submit: undefined }))
      setSuccessMessage(next.success)
      setIsExecutionApproveConfirmOpen(false)
      refreshActivityAiSummary('approve-execution-updates')
    } catch (error) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        submit: error instanceof Error ? error.message : 'Failed to approve activity updates.',
      }))
      setIsExecutionApproveConfirmOpen(false)
    } finally {
      setIsApprovingExecutionUpdates(false)
    }
  }, [
    activity?.dga_project_related_changes,
    canApproveExecutionAsDivisionDirector,
    canApproveExecutionAsStrategyTeam,
    canReviewExecutionUpdates,
    isApprovingExecutionUpdates,
    logApprovalWorkflowTransition,
    projectId,
    refreshActivityAiSummary,
    resolvePlanningInstanceTeam,
    resolveStrategyTeam,
  ])

  const handleOpenRejectExecutionUpdates = useCallback(() => {
    if (!canReviewExecutionUpdates || isRejectingExecutionUpdates) return
    setExecutionRejectionReason('')
    setExecutionRejectionError('')
    setIsExecutionRejectFormOpen(true)
  }, [canReviewExecutionUpdates, isRejectingExecutionUpdates])

  const handleCancelRejectExecutionUpdates = useCallback(() => {
    if (isRejectingExecutionUpdates) return
    setExecutionRejectionReason('')
    setExecutionRejectionError('')
    setIsExecutionRejectFormOpen(false)
  }, [isRejectingExecutionUpdates])

  const handleConfirmRejectExecutionUpdates = useCallback(async () => {
    if (!canReviewExecutionUpdates || isRejectingExecutionUpdates) return

    const reason = executionRejectionReason.trim()
    if (!reason) {
      setExecutionRejectionError('Enter rejection reason.')
      return
    }

    setIsRejectingExecutionUpdates(true)
    setSuccessMessage('')

    try {
      const divisionMemberTeam = await resolvePlanningInstanceTeam('_dga_division_member_team_value', 'Division Member')
      const rejectedRelatedChanges = rejectProjectRelatedChanges(activity?.dga_project_related_changes)
      const payload = {
        dga_is_rejected: true,
        dga_project_related_changes: rejectedRelatedChanges,
        dga_rejection_reason: reason,
        statuscode: 776140011 as Dga_aop_projectsesBase['statuscode'],
        'ownerid@odata.bind': toEntityBind('teams', divisionMemberTeam.id),
      }

      console.log('Reject execution updates payload', payload)
      const rejectResult = await Dga_aop_projectsesService.update(
        projectId,
        payload as unknown as Partial<Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid'>>,
      )
      assertOperationSuccess(rejectResult, 'Failed to reject activity updates.')
      logApprovalWorkflowTransition('Reject Activity Updates', 776140011)

      setActivity((currentActivity) => currentActivity ? {
        ...currentActivity,
        _owningteam_value: divisionMemberTeam.id,
        _owninguser_value: undefined,
        dga_is_rejected: true,
        dga_project_related_changes: rejectedRelatedChanges,
        dga_rejection_reason: reason,
        owneridname: divisionMemberTeam.name,
        statuscode: 776140011,
      } : currentActivity)
      setForm((currentForm) => applyActivityInformationRelatedChanges(currentForm, rejectedRelatedChanges))
      setPendingWith(divisionMemberTeam.name)
      setErrors((currentErrors) => ({ ...currentErrors, submit: undefined }))
      setExecutionRejectionReason('')
      setExecutionRejectionError('')
      setSuccessMessage('Activity updates rejected and returned to Division Member.')
      setIsExecutionRejectFormOpen(false)
      refreshActivityAiSummary('reject-execution-updates')
    } catch (error) {
      setExecutionRejectionError(error instanceof Error ? error.message : 'Failed to reject activity updates.')
    } finally {
      setIsRejectingExecutionUpdates(false)
    }
  }, [
    activity?.dga_project_related_changes,
    canReviewExecutionUpdates,
    executionRejectionReason,
    isRejectingExecutionUpdates,
    logApprovalWorkflowTransition,
    projectId,
    refreshActivityAiSummary,
    resolvePlanningInstanceTeam,
  ])

  const handleProjectRelatedChangesUpdate = useCallback((relatedChanges: string) => {
    setActivity((currentActivity) => currentActivity
      ? {
          ...currentActivity,
          dga_project_related_changes: relatedChanges,
        }
      : currentActivity)
    void loadMilestoneProjectProgress(relatedChanges)
  }, [loadMilestoneProjectProgress])

  // ── Tab content ──

  function handleStageTabClick(tabId: TabId, locked: boolean) {
    if (locked) return
    if (tabId === activeTab) return

    confirmNavigation(() => {
      setActiveTab(tabId)
      scrollPageToTop()
    })
  }

  function renderStageTabs({
    ariaLabel,
    className = '',
    isSticky = false,
  }: {
    ariaLabel: string
    className?: string
    isSticky?: boolean
  }) {
    return (
      <nav
        aria-label={ariaLabel}
        className={`edit-activity__stage-tabs ${className}`.trim()}
        ref={isSticky ? undefined : stageTabsRef}
        role="tablist"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          const locked = tabLocked[tab.id] ?? false

          return (
            <button
              key={`${isSticky ? 'sticky-' : ''}${tab.id}`}
              className={`edit-activity__stage-tab ${isActive ? 'edit-activity__stage-tab--active' : ''} ${locked ? 'edit-activity__stage-tab--locked' : ''}`}
              onClick={() => handleStageTabClick(tab.id, locked)}
              role="tab"
              aria-selected={isActive}
              aria-disabled={locked}
              title={locked ? `Locked - ${getTabLockReason(tab.id)}` : tab.label}
              type="button"
            >
              <Icon size={16} />
              <span className="edit-activity__stage-tab-label">{tab.shortLabel}</span>
              <span className="edit-activity__stage-tab-full">{tab.label}</span>
            </button>
          )
        })}
      </nav>
    )
  }

  function renderTabContent() {
    switch (activeTab) {
      case 'activity-info':
        return (
          <ActivityInfoTab
            activityLeadOptions={activityLeadOptions}
            aiSummaryBlocks={aiSummaryBlocks.activityInfo}
            aiSummaryError={aiSummaryError}
            aiSummaryMeta={aiSummaryMeta}
            editableFields={editPermissions.activityInfoEditableFields}
            errors={errors}
            form={form}
            hasFullEdit={editPermissions.activityInfoHasFullEdit}
            isAiSummaryLoading={isAiSummaryLoading}
            isExecutionPhase={isExecutionPhase}
            showExecutionTracking={shouldShowExecutionFields}
            isReadOnly={editPermissions.activityInfoReadOnly}
            isAdeoVisible={isAdeoVisible}
            isBudgetNo={isBudgetNo}
            isPaymentOnly={isPaymentOnly}
            isStrategic={isStrategic}
            projectId={projectId}
            onActivityDataChanged={() => refreshActivityAiSummary('activity-information-related-crud')}
            updateForm={updateForm}
          />
        )
      case 'objectives':
        return (
          <ObjectivesTab
            aiSummaryBlocks={aiSummaryBlocks.objectives}
            aiSummaryError={aiSummaryError}
            aiSummaryMeta={aiSummaryMeta}
            isAiSummaryLoading={isAiSummaryLoading}
            isReadOnly={editPermissions.objectivesReadOnly}
            onActivityDataChanged={handleObjectivesActivityDataChanged}
            onHeaderActionChange={setObjectiveHeaderAction}
            onOperationAlert={showTabOperationAlert}
            projectId={projectId}
            statusCode={statusCode}
          />
        )
      case 'milestones':
        return (
          <MilestonesTab
            activityPlannedEndDate={form.plannedEndDate}
            activityPlannedStartDate={form.plannedStartDate}
            canEditExecutionFieldsOnly={editPermissions.canEditMilestoneExecutionOnly}
            isExecutionPhase={shouldShowExecutionFields}
            isReadOnly={editPermissions.milestonesReadOnly}
            isAdeoVisible={isAdeoVisible}
            onActivityDataChanged={() => {
              refreshActivityAiSummary('milestone-crud')
              void loadMilestoneProjectProgress(activity?.dga_project_related_changes)
            }}
            onOperationAlert={showTabOperationAlert}
            onProgressChange={setMilestoneProjectProgress}
            onProjectRelatedChangesChange={handleProjectRelatedChangesUpdate}
            projectId={projectId}
            projectRelatedChanges={activity?.dga_project_related_changes}
          />
        )
      case 'procurements':
        return (
          <ProcurementTab
            activityPlannedEndDate={form.plannedEndDate}
            activityPlannedStartDate={form.plannedStartDate}
            activityScope={form.activityScope}
            canEditExecutionFieldsOnly={editPermissions.canEditExecutionStatusOnly}
            isExecutionPhase={isExecutionPhase}
            isReadOnly={editPermissions.procurementReadOnly}
            onActivityDataChanged={() => refreshActivityAiSummary('procurement-crud')}
            onOperationAlert={showTabOperationAlert}
            onProjectRelatedChangesChange={handleProjectRelatedChangesUpdate}
            projectId={projectId}
            projectRelatedChanges={activity?.dga_project_related_changes}
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
            onActivityDataChanged={() => refreshActivityAiSummary('engagement-plan-crud')}
            onOperationAlert={showTabOperationAlert}
            projectId={projectId}
            selectedRole={selectedRole}
            sectorName={form.sectorName}
          />
        )
      case 'budget':
        return (
          <BudgetTab
            activityScope={form.activityScope}
            aiSummaryBlocks={aiSummaryBlocks.budget}
            aiSummaryError={aiSummaryError}
            aiSummaryMeta={aiSummaryMeta}
            canEditExecutionBudget={editPermissions.canEditExecutionBudget}
            hierarchyId={form.divisionId}
            isAiSummaryLoading={isAiSummaryLoading}
            isExecutionPhase={isExecutionPhase}
            isReadOnly={editPermissions.budgetReadOnly}
            onHeaderActionChange={setBudgetHeaderAction}
            onActivityDataChanged={handleBudgetActivityDataChanged}
            onOperationAlert={showTabOperationAlert}
            plannedEndDate={form.plannedEndDate}
            plannedStartDate={form.plannedStartDate}
            onProjectRelatedChangesChange={handleProjectRelatedChangesUpdate}
            projectId={projectId}
            projectRelatedChanges={activity?.dga_project_related_changes}
            statusCode={statusCode}
          />
        )
      case 'clarifications':
        return <ClarificationTab />
      case 'logs':
        return <LogTab isExecutionPhase={isExecutionPhase} projectId={projectId} />
    }
  }

  function renderPostReviewAiSummary() {
    switch (activeTab) {
      case 'milestones':
        return (
          <AiSummaryPanel
            error={aiSummaryError}
            isLoading={isAiSummaryLoading}
            meta={aiSummaryMeta}
            summaries={aiSummaryBlocks.milestones}
            title="Milestones"
          />
        )
      case 'procurements':
        return (
          <AiSummaryPanel
            error={aiSummaryError}
            isLoading={isAiSummaryLoading}
            meta={aiSummaryMeta}
            summaries={aiSummaryBlocks.procurement}
            title="Procurement"
          />
        )
      case 'engagement-plans':
        return (
          <AiSummaryPanel
            error={aiSummaryError}
            isLoading={isAiSummaryLoading}
            meta={aiSummaryMeta}
            summaries={aiSummaryBlocks.engagementPlan}
            title="Engagement Plan"
          />
        )
      default:
        return null
    }
  }

  function renderWorkflowActions() {
    return (
      <>
        {activeTab === 'activity-info' && canShowHeaderSaveActions ? (
          <Button
            disabled={!editPermissions.activityInfoCanSave || isSavingActivityInfo || Boolean(errors.context)}
            icon={<Save size={16} />}
            onClick={handleSaveActivityInfo}
          >
            {isSavingActivityInfo ? 'Saving...' : statusCode === 1 ? 'Save Draft' : 'Save Changes'}
          </Button>
        ) : null}
        {activeTab === 'objectives' && objectiveHeaderAction && canShowHeaderSaveActions ? (
          <Button
            disabled={editPermissions.objectivesReadOnly || !objectiveHeaderAction.canSave || objectiveHeaderAction.isSaving || Boolean(errors.context)}
            icon={<Save size={16} />}
            onClick={objectiveHeaderAction.onSave}
          >
            {objectiveHeaderAction.isSaving ? objectiveHeaderAction.savingLabel : objectiveHeaderAction.label}
          </Button>
        ) : null}
        {activeTab === 'budget' && budgetHeaderAction && canShowHeaderSaveActions ? (
          <Button
            disabled={editPermissions.budgetReadOnly || !budgetHeaderAction.canSave || budgetHeaderAction.isSaving || Boolean(errors.context)}
            icon={<Save size={16} />}
            onClick={budgetHeaderAction.onSave}
          >
            {budgetHeaderAction.isSaving ? budgetHeaderAction.savingLabel : budgetHeaderAction.label}
          </Button>
        ) : null}
        {isDivisionMember && editPermissions.canSubmitToDivisionDirector ? (
          <Button
            disabled={isSubmittingToDirector || Boolean(errors.context)}
            icon={<Send size={16} />}
            onClick={handleSubmitToDivisionDirector}
          >
            {isSubmittingToDirector ? 'Submitting...' : 'Submit to Division Director'}
          </Button>
        ) : null}
        {isDivisionDirector && editPermissions.canSubmitToStrategyTeam ? (
          <Button
            disabled={isSubmittingToStrategyTeam || Boolean(errors.context)}
            icon={<Send size={16} />}
            onClick={handleSubmitToStrategyTeam}
          >
            {isSubmittingToStrategyTeam ? 'Submitting...' : 'Submit to Strategy Team'}
          </Button>
        ) : null}
        {isDivisionDirector && editPermissions.canSubmitToStrategyTeam ? (
          <Button icon={<HelpCircle size={16} />} onClick={handleRequestClarification} variant="secondary">
            Request Clarification
          </Button>
        ) : null}
        {isStrategyTeam && editPermissions.canSubmitToExecutiveDirector ? (
          <Button
            disabled={isSubmittingToExecutiveDirector || Boolean(errors.context)}
            icon={<Send size={16} />}
            onClick={handleSubmitToExecutiveDirector}
          >
            {isSubmittingToExecutiveDirector ? 'Submitting...' : 'Submit to Executive Director'}
          </Button>
        ) : null}
        {isStrategyTeam && editPermissions.canSubmitToExecutiveDirector ? (
          <Button icon={<HelpCircle size={16} />} onClick={handleRequestClarification} variant="secondary">
            Request Clarification
          </Button>
        ) : null}
        {isExecutiveDirector && editPermissions.canSubmitToDirectorGeneral ? (
          <Button
            disabled={isSubmittingToDirectorGeneral || Boolean(errors.context)}
            icon={<Send size={16} />}
            onClick={handleSubmitToDirectorGeneral}
          >
            {isSubmittingToDirectorGeneral ? 'Submitting...' : 'Submit to Director General'}
          </Button>
        ) : null}
        {isExecutiveDirector && editPermissions.canSubmitToDirectorGeneral ? (
          <Button icon={<HelpCircle size={16} />} onClick={handleRequestClarification} variant="secondary">
            Request Clarification
          </Button>
        ) : null}
        {isDirectorGeneral && editPermissions.canApproveAsDirectorGeneral ? (
          <Button
            disabled={isApprovingAsDirectorGeneral || Boolean(errors.context)}
            icon={<Send size={16} />}
            onClick={handleApproveAsDirectorGeneral}
          >
            {isApprovingAsDirectorGeneral ? 'Approving...' : 'Approve'}
          </Button>
        ) : null}
        {isDirectorGeneral && editPermissions.canApproveAsDirectorGeneral ? (
          <Button icon={<HelpCircle size={16} />} onClick={handleRequestClarification} variant="secondary">
            Request Clarification
          </Button>
        ) : null}
        {canReviewExecutionUpdates ? (
          <Button
            disabled={isApprovingExecutionUpdates || Boolean(errors.context)}
            icon={<Send size={16} />}
            onClick={handleApproveExecutionUpdates}
          >
            {isApprovingExecutionUpdates ? 'Approving...' : 'Approve Activity'}
          </Button>
        ) : null}
        {canReviewExecutionUpdates && !isExecutionRejectFormOpen ? (
          <Button
            className="button--danger"
            disabled={isRejectingExecutionUpdates || Boolean(errors.context)}
            icon={<AlertTriangle size={16} />}
            onClick={handleOpenRejectExecutionUpdates}
            variant="secondary"
          >
            {isRejectingExecutionUpdates ? 'Rejecting...' : 'Reject Activity'}
          </Button>
        ) : null}
        {canReviewExecutionUpdates && isExecutionRejectFormOpen ? (
          <div className="edit-activity__inline-rejection">
            <p>
              Please provide a rejection reason. The submitted execution updates will be discarded and the activity will return to the Division Member.
            </p>
            <Textarea
              disabled={isRejectingExecutionUpdates}
              error={executionRejectionError}
              label="Rejection Reason"
              onChange={(event) => {
                setExecutionRejectionReason(event.target.value)
                if (executionRejectionError) setExecutionRejectionError('')
              }}
              required
              rows={4}
              value={executionRejectionReason}
            />
            <div className="edit-activity__inline-rejection-actions">
              <Button
                disabled={isRejectingExecutionUpdates}
                onClick={handleCancelRejectExecutionUpdates}
                variant="secondary"
              >
                Cancel
              </Button>
              <Button
                className="button--danger"
                disabled={isRejectingExecutionUpdates}
                onClick={handleConfirmRejectExecutionUpdates}
              >
                {isRejectingExecutionUpdates ? 'Rejecting...' : 'Confirm Reject'}
              </Button>
            </div>
          </div>
        ) : null}
        {isDivisionMember && editPermissions.canStartActivity ? (
          <Button disabled={isStartingActivity || Boolean(errors.context)} icon={<Send size={16} />} onClick={handleStartActivity}>
            {isStartingActivity ? 'Starting...' : 'Start Activity'}
          </Button>
        ) : null}
        {canShowSubmitActivityUpdates ? (
          <Button
            disabled={isSubmittingActivityUpdates || Boolean(errors.context)}
            icon={<Send size={16} />}
            onClick={handleSubmitActivityUpdates}
          >
            {isSubmittingActivityUpdates ? 'Submitting...' : 'Submit Activity Updates'}
          </Button>
        ) : null}
      </>
    )
  }

  function renderRailHeader(Icon: typeof ClipboardList, title: string) {
    return (
      <div className="edit-activity__rail-card-header">
        <Icon aria-hidden="true" size={16} />
        <h2>{title}</h2>
      </div>
    )
  }

  function renderRightRail() {
    return (
      <aside aria-label="Activity side panel" className="edit-activity__right-rail">
        <section className="edit-activity__rail-card edit-activity__rail-card--actions">
          {renderRailHeader(ClipboardList, 'Workflow Actions')}
          <div className="edit-activity__workflow-panel-actions">
            {renderWorkflowActions()}
          </div>
        </section>

        <section className="edit-activity__rail-card">
          {renderRailHeader(UserCheck, 'Activity Info')}
          <div className="edit-activity__activity-info-list">
            <div className="edit-activity__activity-info-row">
              <span>Status</span>
              <Badge tone={getStatusTone(statusCode)}>
                {formatStatusCode(statusCode)}
              </Badge>
            </div>
            <div className="edit-activity__activity-info-row">
              <span>Phase</span>
              <Badge tone={isExecutionPhase ? 'success' : 'info'}>
                {isExecutionPhase ? 'Execution' : 'Planning'}
              </Badge>
            </div>
            <div className="edit-activity__activity-info-row edit-activity__activity-info-row--pending">
              <span>Pending with</span>
              <strong>
                <UserRound size={14} />
                {pendingWith}
              </strong>
            </div>
          </div>
        </section>

        <section className="edit-activity__rail-card">
          {renderRailHeader(Clock3, 'Activity Creation Details')}
          <dl className="edit-activity__creation-details">
            <div>
              <dt>Created By</dt>
              <dd>{createdByName || '—'}</dd>
            </div>
            <div>
              <dt>Created On</dt>
              <dd>{formatActivityRailDate(activity?.createdon)}</dd>
            </div>
            <div>
              <dt>Modified On</dt>
              <dd>{formatActivityRailDate(activity?.modifiedon)}</dd>
            </div>
          </dl>
        </section>
      </aside>
    )
  }

  if (isContextLoading) {
    return (
      <div className="create-activity" aria-label="Loading Edit Activity context...">
        {/* Hero header skeleton */}
        <header className="create-activity__hero create-activity__hero--skeleton" aria-hidden="true">
          <div className="skeleton-line skeleton-shimmer" style={{ width: '13rem', height: '0.7rem' }} />
          <div className="edit-activity__hero-top">
            <div className="skeleton-button skeleton-shimmer" style={{ width: '9rem' }} />
            <div className="skeleton-button skeleton-shimmer" style={{ width: '11rem' }} />
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
            <div className="skeleton-button skeleton-shimmer" style={{ width: '7rem' }} />
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

        </div>
      </div>
    )
  }

  return (
    <div className="create-activity edit-activity">
      {hasOwnerMismatch || showRespondentActionsNotice || showExecutionRejectedNotice || showExecutionApprovedNotice || errors.submit ? (
        <div className="edit-activity__persistent-alerts">
          {errors.submit ? (
            <div className="edit-activity__persistent-alert edit-activity__persistent-alert--error" role="alert">
              <AlertTriangle aria-hidden="true" size={16} />
              <div>
                <strong>Action could not be completed</strong>
                {errors.submit.split('\n').map((line, index) => (
                  <span key={`${line}-${index}`}>{line || '\u00A0'}</span>
                ))}
              </div>
            </div>
          ) : null}

          {showExecutionRejectedNotice ? (
            <div className="edit-activity__persistent-alert edit-activity__persistent-alert--error" role="alert">
              <AlertTriangle aria-hidden="true" size={16} />
              <div>
                <strong>Activity updates were rejected</strong>
                <span>Your submitted activity updates were rejected and have been discarded. You may apply the updates again and resubmit for approval.</span>
                <span>Rejection Reason: {activity?.dga_rejection_reason}</span>
              </div>
            </div>
          ) : null}

          {hasOwnerMismatch ? (
            <div className="edit-activity__persistent-alert edit-activity__persistent-alert--warning" role="status">
              <AlertTriangle aria-hidden="true" size={16} />
              <div>
                <strong>Pending response from another user</strong>
                <span>This project is pending response from another user. You cannot edit it at this stage.</span>
              </div>
            </div>
          ) : null}

          {showRespondentActionsNotice ? (
            <div className="edit-activity__persistent-alert edit-activity__persistent-alert--info" role="status">
              <CheckCircle2 aria-hidden="true" size={16} />
              <div>
                <strong>Respondent actions available</strong>
                <span>This project is currently assigned to Respondent. You can edit it and continue the workflow actions from the panel on the right.</span>
              </div>
            </div>
          ) : null}

          {showExecutionApprovedNotice ? (
            <div className="edit-activity__persistent-alert edit-activity__persistent-alert--success" role="status">
              <CheckCircle2 aria-hidden="true" size={16} />
              <div>
                <strong>Activity updates approved</strong>
                <span>Your submitted activity updates have been approved. The approved values are now available as the latest execution baseline.</span>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <header className="create-activity__hero">
        <div className="edit-activity__hero-top">
          <Button
            className="edit-activity__back-link"
            icon={<ArrowLeft size={14} />}
            onClick={() => confirmNavigation(() => navigate(APP_ROUTE_PATHS.activitiesList))}
            variant="ghost"
          >
            Back to Activities
          </Button>
          {isExecutionPhase ? (
            <div className="edit-activity__header-progress-group">
              <div
                aria-disabled={isMilestoneProgressDisabled}
                aria-label={isMilestoneProgressDisabled ? 'Planned Progress unavailable' : `Planned Progress ${Math.round(plannedMilestoneProgress)}%`}
                className={`edit-activity__header-progress${isMilestoneProgressDisabled ? ' edit-activity__header-progress--disabled' : ''}`}
              >
                <div className="edit-activity__header-progress-copy">
                  <span>Planned Progress</span>
                  <strong>{isMilestoneProgressDisabled ? 'Unavailable' : `${Math.round(plannedMilestoneProgress)}%`}</strong>
                </div>
                <div
                  aria-hidden="true"
                  className="edit-activity__header-progress-ring"
                  style={{ '--progress': `${plannedMilestoneProgress}%` } as CSSProperties}
                >
                  <span>{isMilestoneProgressDisabled ? '—' : `${Math.round(plannedMilestoneProgress)}%`}</span>
                </div>
              </div>
              <div
                aria-disabled={isMilestoneProgressDisabled}
                aria-label={isMilestoneProgressDisabled ? 'Actual Progress unavailable' : `Actual Progress ${Math.round(actualMilestoneProgress)}%`}
                className={`edit-activity__header-progress${isMilestoneProgressDisabled ? ' edit-activity__header-progress--disabled' : ''}`}
              >
                <div className="edit-activity__header-progress-copy">
                  <span>Actual Progress</span>
                  <strong>{isMilestoneProgressDisabled ? 'Unavailable' : `${Math.round(actualMilestoneProgress)}%`}</strong>
                </div>
                <div
                  aria-hidden="true"
                  className="edit-activity__header-progress-ring edit-activity__header-progress-ring--actual"
                  style={{ '--progress': `${actualMilestoneProgress}%` } as CSSProperties}
                >
                  <span>{isMilestoneProgressDisabled ? '—' : `${Math.round(actualMilestoneProgress)}%`}</span>
                </div>
              </div>
            </div>
          ) : (
            <div
              aria-disabled={isMilestoneProgressDisabled}
              aria-label={headerProgressAriaLabel}
              className={`edit-activity__header-progress${isMilestoneProgressDisabled ? ' edit-activity__header-progress--disabled' : ''}`}
            >
              <div className="edit-activity__header-progress-copy">
                <span>{displayedMilestoneProgressLabel}</span>
                <strong>{isMilestoneProgressDisabled ? 'Unavailable' : `${Math.round(displayedMilestoneProgress)}%`}</strong>
              </div>
              <div
                aria-hidden="true"
                className="edit-activity__header-progress-ring"
                style={{ '--progress': `${displayedMilestoneProgress}%` } as CSSProperties}
              >
                <span>{isMilestoneProgressDisabled ? '—' : `${Math.round(displayedMilestoneProgress)}%`}</span>
              </div>
            </div>
          )}
        </div>

        <nav aria-label="Breadcrumb" className="create-activity__breadcrumb">
          <Link onClick={(event) => handleGuardedRouteClick(event, APP_ROUTE_PATHS.dashboard)} to={APP_ROUTE_PATHS.dashboard}>Dashboard</Link>
          <ChevronRight aria-hidden="true" size={14} />
          <Link onClick={(event) => handleGuardedRouteClick(event, APP_ROUTE_PATHS.activitiesList)} to={APP_ROUTE_PATHS.activitiesList}>Activities</Link>
          <ChevronRight aria-hidden="true" size={14} />
          <span title={activityName}>{activityName}</span>
        </nav>

        <div className="edit-activity__hero-main">
          <div className="edit-activity__hero-title-row">
            <div className="create-activity__hero-icon" aria-hidden="true">
              <Edit3 size={22} />
            </div>
            <div className="create-activity__hero-content">
              <h1>{activityName}</h1>
              <p className="edit-activity__ai-summary">
                <Sparkles size={14} />
                {aiSummary}
              </p>
            </div>
          </div>
        </div>

        <div className="create-activity__hero-footer edit-activity__hero-footer">
          <Button icon={<FileText size={16} />} variant="ghost" className="edit-activity__card-btn">
            Activity Card
          </Button>
        </div>
      </header>

      {operationAlert ? (
        <div
          className={`edit-activity__operation-alert edit-activity__operation-alert--${operationAlert.kind}`}
          key={`${operationAlert.kind}-${operationAlert.title}-${operationAlert.message ?? ''}`}
          role={operationAlert.kind === 'error' ? 'alert' : 'status'}
        >
          <div className="edit-activity__operation-alert-header">
            <span aria-hidden="true" className="edit-activity__operation-alert-icon">
              {operationAlert.kind === 'processing'
                ? <span />
                : operationAlert.kind === 'error'
                  ? <AlertTriangle size={18} />
                  : <CheckCircle2 size={18} />}
            </span>
            <div>
              <span>{operationAlert.kind === 'processing' ? 'Processing' : operationAlert.kind === 'error' ? 'Failed' : 'Completed'}</span>
              <strong>{operationAlert.title}</strong>
            </div>
            {operationAlert.kind !== 'processing' ? (
              <button
                aria-label="Dismiss notification"
                className="edit-activity__operation-alert-close"
                onClick={() => {
                  setSuccessMessage('')
                  setTabOperationAlert(null)
                }}
                type="button"
              >
                <X size={15} />
              </button>
            ) : null}
          </div>
          {operationAlert.kind !== 'processing' && operationAlert.message ? <p>{operationAlert.message}</p> : null}
          <span aria-hidden="true" className="edit-activity__operation-alert-progress" />
        </div>
      ) : null}

      {/* Stage tabs */}
      <div className="edit-activity__stages">
        {renderStageTabs({ ariaLabel: 'Activity stages' })}
      </div>

      {isStickyStageTabsVisible ? (
        <div className="edit-activity__sticky-tabs-shell edit-activity__sticky-tabs-shell--visible">
          {renderStageTabs({
            ariaLabel: 'Sticky activity stages',
            className: 'edit-activity__stage-tabs--sticky',
            isSticky: true,
          })}
        </div>
      ) : null}

      {/* Stage content */}
      <div className="edit-activity__workspace">
        <div className="edit-activity__stage-content" role="tabpanel">
          {shouldShowExecutionFields ? (
            <ReviewChangesPanel
              key={activeTab}
              activeTab={activeTab}
              relatedChanges={activity?.dga_project_related_changes}
            />
          ) : null}
          {renderPostReviewAiSummary()}
          {renderTabContent()}
        </div>

        {renderRightRail()}
      </div>

      <ConfirmationDialog
        confirmLabel={isSubmittingToDirector ? 'Submitting...' : 'Submit'}
        description="This action will submit the project to the Division Director for review and approval. Once submitted, you will no longer be able to edit the project. Are you sure you want to proceed?"
        isOpen={isSubmitConfirmOpen}
        onCancel={() => {
          if (!isSubmittingToDirector) setIsSubmitConfirmOpen(false)
        }}
        onConfirm={handleConfirmSubmitToDivisionDirector}
        title="Submit for Approval"
      />

      <ConfirmationDialog
        confirmLabel={isSubmittingToStrategyTeam ? 'Submitting...' : 'Submit'}
        description="This action will submit the project to the Strategy Team for review and approval. Once submitted, you will no longer be able to edit the project. Are you sure you want to proceed?"
        isOpen={isStrategySubmitConfirmOpen}
        onCancel={() => {
          if (!isSubmittingToStrategyTeam) setIsStrategySubmitConfirmOpen(false)
        }}
        onConfirm={handleConfirmSubmitToStrategyTeam}
        title="Submit for Approval"
      />

      <ConfirmationDialog
        confirmLabel={isSubmittingToExecutiveDirector ? 'Submitting...' : 'Submit'}
        description="This action will submit the project to the Executive Director for review and approval. Once submitted, you will no longer be able to edit the project. Are you sure you want to proceed?"
        isOpen={isExecutiveSubmitConfirmOpen}
        onCancel={() => {
          if (!isSubmittingToExecutiveDirector) setIsExecutiveSubmitConfirmOpen(false)
        }}
        onConfirm={handleConfirmSubmitToExecutiveDirector}
        title="Submit for Approval"
      />

      <ConfirmationDialog
        confirmLabel={isSubmittingToDirectorGeneral ? 'Submitting...' : 'Submit'}
        description="This action will submit the project to the Director General for review and approval. Once submitted, you will no longer be able to edit the project. Are you sure you want to proceed?"
        isOpen={isDirectorGeneralSubmitConfirmOpen}
        onCancel={() => {
          if (!isSubmittingToDirectorGeneral) setIsDirectorGeneralSubmitConfirmOpen(false)
        }}
        onConfirm={handleConfirmSubmitToDirectorGeneral}
        title="Submit for Approval"
      />

      <ConfirmationDialog
        confirmLabel={isApprovingAsDirectorGeneral ? 'Approving...' : 'Approve'}
        description="This action will approve the project and move it to execution. Ownership will return to the Division Member team. Are you sure you want to proceed?"
        isOpen={isDirectorGeneralApproveConfirmOpen}
        onCancel={() => {
          if (!isApprovingAsDirectorGeneral) setIsDirectorGeneralApproveConfirmOpen(false)
        }}
        onConfirm={handleConfirmApproveAsDirectorGeneral}
        title="Approve Activity"
      />

      <ConfirmationDialog
        confirmLabel={isSubmittingActivityUpdates ? 'Submitting...' : 'Submit Updates'}
        description="This action will submit your project updates for review and approval. Once submitted, you will not be able to edit them until reviewed. Are you sure you want to proceed?"
        isOpen={isActivityUpdateSubmitConfirmOpen}
        onCancel={() => {
          if (!isSubmittingActivityUpdates) setIsActivityUpdateSubmitConfirmOpen(false)
        }}
        onConfirm={handleConfirmSubmitActivityUpdates}
        title="Submit Activity Updates"
      />

      <ConfirmationDialog
        confirmLabel={isApprovingExecutionUpdates ? 'Approving...' : 'Approve'}
        description={executionApproveDescription}
        isOpen={isExecutionApproveConfirmOpen}
        onCancel={() => {
          if (!isApprovingExecutionUpdates) setIsExecutionApproveConfirmOpen(false)
        }}
        onConfirm={handleConfirmApproveExecutionUpdates}
        title="Approve Activity Updates"
      />

      <UnsavedChangesDialog
        description="You have unsaved changes on this activity. Save your changes before leaving, or discard them to continue without saving."
        isOpen={Boolean(pendingNavigation)}
        isSaving={isUnsavedDialogSaving}
        onDiscard={handleDiscardUnsavedChangesAndContinue}
        onDismiss={handleDismissUnsavedChangesDialog}
        onSave={handleSaveUnsavedChangesAndContinue}
        saveLabel={activeSaveLabel}
        title="Unsaved changes"
      />

    </div>
  )
}
