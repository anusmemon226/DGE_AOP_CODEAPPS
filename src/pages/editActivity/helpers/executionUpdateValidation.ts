import type { Dga_aop_project_budgets } from '../../../generated/models/Dga_aop_project_budgetsModel'
import type { Dga_aop_project_milestone_detailses } from '../../../generated/models/Dga_aop_project_milestone_detailsesModel'
import type { Dga_procurement_plans } from '../../../generated/models/Dga_procurement_plansModel'
import { Dga_aop_project_budgetsService } from '../../../generated/services/Dga_aop_project_budgetsService'
import { Dga_aop_project_milestone_detailsesService } from '../../../generated/services/Dga_aop_project_milestone_detailsesService'
import { Dga_procurement_plansService } from '../../../generated/services/Dga_procurement_plansService'
import {
  assertOperationSuccess,
  getResultValue,
  validateForm,
  type ActivityForm,
  type FieldErrors,
} from './activityInfoHelpers'
import {
  getProjectRelatedChangeAt,
  isEmptyRelatedValue,
  isPlainObject,
  isRelatedChange,
  parseProjectRelatedChanges,
  resolveProjectRelatedValue,
  type ProjectRelatedChange,
  type ProjectRelatedChanges,
} from './projectRelatedChanges'

export type ExecutionUpdateValidationSection =
  | 'activity-info'
  | 'milestones'
  | 'procurements'
  | 'budget'

export type ExecutionUpdateValidationResult =
  | { valid: true }
  | {
      valid: false
      fieldErrors?: FieldErrors
      message: string
      section: ExecutionUpdateValidationSection
    }

const MILESTONE_SELECT_FIELDS = [
  'dga_aop_project_milestone_detailsid',
  'dga_name',
  'dga_planned_end_date',
  'dga_actual_start_date',
  'dga_actual_end_date',
  'dga_actual_progress',
  'dga_cancellation_reason',
  'dga_justification',
  'statuscode',
  '_dga_aop_project_value',
] as const

const PROCUREMENT_SELECT_FIELDS = [
  'dga_procurement_planid',
  'dga_name',
  'dga_purchase_request_raising_by_quarter',
  'dga_expected_awarding_by_quarter',
  'dga_does_this_project_require_tender',
  'dga_tender_type',
  'dga_current_procurement_status',
  'dga_pr_ticket_number',
  'dga_actual_contract_value',
  'dga_actual_contract_duration_in_months',
  'dga_stage_update_date',
  'dga_progress_update',
  'dga_justification_date',
  'dga_justification_of_the_change',
  '_dga_aop_project_value',
] as const

const BUDGET_MONTH_SELECT_FIELDS = [
  'dga_aop_project_budgetid',
  'dga_name',
  'dga_actual_budget',
  'dga_is_zero',
  '_dga_aop_project_value',
] as const

const AUTO_START_ACTIVITY_STATUS_OLD_VALUE = '776140006'
const AUTO_START_ACTIVITY_STATUS_NEW_VALUE = '776140007'
const CANCELLED_MILESTONE_STATUS = '576610001'
const JUSTIFICATION_MILESTONE_STATUSES = new Set(['1', '776140002'])
const ATTACH_CONTRACT_PROCUREMENT_STATUSES = new Set(['8', '15'])

function normalizeId(id?: string | null) {
  return id?.replace(/[{}]/g, '').toLowerCase() ?? ''
}

function projectLookupFilter(projectId: string) {
  return `_dga_aop_project_value eq '${normalizeId(projectId)}'`
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

function normalizeValue(value: unknown) {
  if (value === undefined || value === null) return ''
  return String(value).trim()
}

function hasMeaningfulRelatedChange(
  fieldName: string,
  change: ProjectRelatedChange,
  path: string[],
) {
  if (fieldName === 'planned_value' || fieldName === 'name' || fieldName === 'month_name') {
    return false
  }

  const oldValue = normalizeValue(change.old_value)
  const newValue = normalizeValue(change.new_value)

  if (!oldValue && !newValue) return false
  if (oldValue === newValue) return false

  if (
    path.join('.') === 'activity_information.dga_project_activity_status'
    && oldValue === AUTO_START_ACTIVITY_STATUS_OLD_VALUE
    && newValue === AUTO_START_ACTIVITY_STATUS_NEW_VALUE
  ) {
    return false
  }

  return true
}

function hasAnyMeaningfulExecutionChange(
  node: ProjectRelatedChanges | ProjectRelatedChange | unknown,
  path: string[] = [],
): boolean {
  if (isRelatedChange(node)) {
    return hasMeaningfulRelatedChange(path[path.length - 1] ?? '', node, path)
  }

  if (!isPlainObject(node)) return false

  return Object.entries(node).some(([key, value]) => (
    hasAnyMeaningfulExecutionChange(value, [...path, key])
  ))
}

function relatedValue(
  changes: ProjectRelatedChanges,
  path: string[],
  fallback: unknown = '',
) {
  const value = resolveProjectRelatedValue(getProjectRelatedChangeAt(changes, path))
  return isEmptyRelatedValue(value) ? fallback : value
}

function getQuarterNumber(value?: string | null) {
  const match = String(value ?? '').match(/[1-4]/)
  return match ? Number(match[0]) : 0
}

function getDateQuarter(dateValue?: string | null) {
  if (!dateValue) return 0
  const date = new Date(dateValue)
  if (Number.isNaN(date.getTime())) return 0
  return Math.floor(date.getMonth() / 3) + 1
}

function getCurrentQuarterNumber() {
  return Math.floor(new Date().getMonth() / 3) + 1
}

function isFutureQuarter(quarterNumber: number) {
  return quarterNumber > 0 && quarterNumber > getCurrentQuarterNumber()
}

function getMonthIndex(monthName?: string | null) {
  const month = String(monthName ?? '').trim().toLowerCase()
  return [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'august',
    'september',
    'october',
    'november',
    'december',
  ].findIndex((label) => label === month)
}

function isFutureMonth(monthName?: string | null) {
  const monthIndex = getMonthIndex(monthName)
  if (monthIndex < 0) return false
  return monthIndex > new Date().getMonth()
}

function isMissing(value: unknown) {
  return isEmptyRelatedValue(value)
}

function isInvalidNumber(value: unknown) {
  if (isMissing(value)) return true
  const numeric = Number(value)
  return !Number.isFinite(numeric) || numeric < 0
}

function getMilestoneExecutionValue(
  changes: ProjectRelatedChanges,
  milestoneId: string,
  fieldName: string,
  fallback: unknown,
) {
  return relatedValue(
    changes,
    ['milestones', 'by_record', milestoneId.replace(/[{}]/g, ''), fieldName],
    fallback,
  )
}

function getProcurementExecutionValue(
  changes: ProjectRelatedChanges,
  procurementId: string,
  fieldName: string,
  fallback: unknown,
) {
  return relatedValue(
    changes,
    ['procurements', 'by_record', procurementId.replace(/[{}]/g, ''), fieldName],
    fallback,
  )
}

function getBudgetExecutionValue(
  changes: ProjectRelatedChanges,
  monthId: string,
  fieldName: string,
  fallback: unknown,
) {
  return relatedValue(
    changes,
    ['budget', 'by_month', monthId.replace(/[{}]/g, ''), fieldName],
    fallback,
  )
}

function formatRecordLabel(value?: string | null, fallback = 'record') {
  return String(value ?? '').trim() || fallback
}

function getBooleanValue(value: unknown) {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value === 1
  const text = String(value ?? '').trim().toLowerCase()
  if (['true', '1', 'yes'].includes(text)) return true
  if (['false', '0', 'no'].includes(text)) return false
  return undefined
}

function budgetZeroError(monthNames: string[]) {
  return [
    'The following months have zero actual budget but are not marked as "Zero":',
    '',
    ...monthNames.map((month) => `• ${month}`),
    '',
    'Please either update the actual budget amount or set the "Zero" toggle to "Yes" for these months before submitting.',
  ].join('\n')
}

async function validateMilestones(projectId: string, changes: ProjectRelatedChanges): Promise<ExecutionUpdateValidationResult> {
  const result = await Dga_aop_project_milestone_detailsesService.getAll({
    filter: projectLookupFilter(projectId),
    select: [...MILESTONE_SELECT_FIELDS],
    orderBy: ['dga_planned_end_date asc', 'createdon asc'],
  })
  assertOperationSuccess(result, 'Unable to validate milestone execution updates.')

  const milestones = getResultArray<Dga_aop_project_milestone_detailses>(result)
  for (const milestone of milestones) {
    const milestoneId = milestone.dga_aop_project_milestone_detailsid
    if (!milestoneId) continue
    if (isFutureQuarter(getDateQuarter(milestone.dga_planned_end_date))) continue

    const milestoneName = formatRecordLabel(milestone.dga_name, 'Milestone')
    const actualStartDate = getMilestoneExecutionValue(changes, milestoneId, 'dga_actual_start_date', milestone.dga_actual_start_date)
    const actualEndDate = getMilestoneExecutionValue(changes, milestoneId, 'dga_actual_end_date', milestone.dga_actual_end_date)
    const status = getMilestoneExecutionValue(changes, milestoneId, 'statuscode', milestone.statuscode)
    const actualProgress = getMilestoneExecutionValue(changes, milestoneId, 'dga_actual_progress', milestone.dga_actual_progress)
    const cancellationReason = getMilestoneExecutionValue(changes, milestoneId, 'dga_cancellation_reason', milestone.dga_cancellation_reason)
    const justification = getMilestoneExecutionValue(changes, milestoneId, 'dga_justification', milestone.dga_justification)
    const uploadedFile = getMilestoneExecutionValue(changes, milestoneId, 'uploaded_file', '')
    const statusText = normalizeValue(status)

    if (isMissing(actualStartDate)) {
      return { valid: false, section: 'milestones', message: `${milestoneName}: Actual Start Date is required.` }
    }
    if (isMissing(actualEndDate)) {
      return { valid: false, section: 'milestones', message: `${milestoneName}: Actual End Date is required.` }
    }
    if (String(actualStartDate) > String(actualEndDate)) {
      return { valid: false, section: 'milestones', message: `${milestoneName}: Actual Start Date must be on or before Actual End Date.` }
    }
    if (isMissing(status)) {
      return { valid: false, section: 'milestones', message: `${milestoneName}: Milestone Status is required.` }
    }
    if (isInvalidNumber(actualProgress) || Number(actualProgress) > 100) {
      return { valid: false, section: 'milestones', message: `${milestoneName}: Actual Progress % must be between 0 and 100.` }
    }
    if (statusText === CANCELLED_MILESTONE_STATUS && isMissing(cancellationReason)) {
      return { valid: false, section: 'milestones', message: `${milestoneName}: Cancellation Reason is required.` }
    }
    if (JUSTIFICATION_MILESTONE_STATUSES.has(statusText) && isMissing(justification)) {
      return { valid: false, section: 'milestones', message: `${milestoneName}: Justification is required.` }
    }
    if (isMissing(uploadedFile)) {
      return { valid: false, section: 'milestones', message: `${milestoneName}: Upload File is required.` }
    }
  }

  return { valid: true }
}

async function validateProcurements(projectId: string, changes: ProjectRelatedChanges): Promise<ExecutionUpdateValidationResult> {
  const result = await Dga_procurement_plansService.getAll({
    filter: projectLookupFilter(projectId),
    select: [...PROCUREMENT_SELECT_FIELDS],
    orderBy: ['createdon desc'],
  })
  assertOperationSuccess(result, 'Unable to validate procurement execution updates.')

  const procurements = getResultArray<Dga_procurement_plans>(result)
  for (const procurement of procurements) {
    const procurementId = procurement.dga_procurement_planid
    if (!procurementId) continue

    const quarter = getQuarterNumber(procurement.dga_purchase_request_raising_by_quarter || procurement.dga_expected_awarding_by_quarter)
    if (isFutureQuarter(quarter)) continue

    const procurementName = formatRecordLabel(procurement.dga_name, 'Procurement')
    const tenderRequired = getProcurementExecutionValue(
      changes,
      procurementId,
      'dga_does_this_project_require_tender',
      procurement.dga_does_this_project_require_tender,
    )
    const tenderType = getProcurementExecutionValue(changes, procurementId, 'dga_tender_type', procurement.dga_tender_type)
    const status = getProcurementExecutionValue(
      changes,
      procurementId,
      'dga_current_procurement_status',
      procurement.dga_current_procurement_status,
    )
    const stageUpdateDate = getProcurementExecutionValue(changes, procurementId, 'dga_stage_update_date', procurement.dga_stage_update_date)
    const attachContractFile = getProcurementExecutionValue(changes, procurementId, 'attach_contract_file', '')
    const tenderRequiredBoolean = getBooleanValue(tenderRequired)
    const statusText = normalizeValue(status)
    const tenderTypeText = normalizeValue(tenderType)

    if (tenderRequiredBoolean === undefined) {
      return { valid: false, section: 'procurements', message: `${procurementName}: Tender Required is required.` }
    }
    if (tenderRequiredBoolean && isMissing(tenderType)) {
      return { valid: false, section: 'procurements', message: `${procurementName}: Tender Type is required.` }
    }
    if (isMissing(status)) {
      return { valid: false, section: 'procurements', message: `${procurementName}: Procurement Status is required.` }
    }

    const isRaisedPath = !tenderRequiredBoolean || (tenderRequiredBoolean && tenderTypeText === '1')
    if (isRaisedPath && isMissing(stageUpdateDate)) {
      return { valid: false, section: 'procurements', message: `${procurementName}: Stage Update Date is required.` }
    }
    if (isRaisedPath && ATTACH_CONTRACT_PROCUREMENT_STATUSES.has(statusText) && isMissing(attachContractFile)) {
      return { valid: false, section: 'procurements', message: `${procurementName}: Attach Contract file is required.` }
    }
  }

  return { valid: true }
}

async function validateBudget(projectId: string, changes: ProjectRelatedChanges): Promise<ExecutionUpdateValidationResult> {
  const result = await Dga_aop_project_budgetsService.getAll({
    filter: projectLookupFilter(projectId),
    select: [...BUDGET_MONTH_SELECT_FIELDS],
    orderBy: ['createdon asc'],
  })
  assertOperationSuccess(result, 'Unable to validate budget execution updates.')

  const zeroMonths = getResultArray<Dga_aop_project_budgets>(result)
    .filter((month) => !isFutureMonth(month.dga_name))
    .filter((month) => {
      const monthId = month.dga_aop_project_budgetid
      if (!monthId) return false
      const actualBudget = Number(getBudgetExecutionValue(changes, monthId, 'dga_actual_budget', month.dga_actual_budget ?? 0))
      return actualBudget === 0 && !month.dga_is_zero
    })
    .map((month) => String(month.dga_name ?? '').trim())
    .filter(Boolean)

  if (zeroMonths.length > 0) {
    return {
      valid: false,
      section: 'budget',
      message: budgetZeroError(zeroMonths),
    }
  }

  return { valid: true }
}

export async function validateExecutionUpdateSubmission(options: {
  form: ActivityForm
  projectId: string
  relatedChanges?: string | null
}): Promise<ExecutionUpdateValidationResult> {
  const { form, projectId, relatedChanges } = options
  const changes = parseProjectRelatedChanges(relatedChanges)

  if (!hasAnyMeaningfulExecutionChange(changes)) {
    return {
      valid: false,
      section: 'activity-info',
      message: 'No execution updates were found. Please update at least one execution field before submitting activity updates.',
    }
  }

  const activityInfoErrors = validateForm(form, true)
  if (Object.keys(activityInfoErrors).length > 0) {
    return {
      valid: false,
      section: 'activity-info',
      fieldErrors: activityInfoErrors,
      message: 'Please complete all required Activity Information fields before submitting activity updates.',
    }
  }

  const milestoneValidation = await validateMilestones(projectId, changes)
  if (!milestoneValidation.valid) return milestoneValidation

  const procurementValidation = await validateProcurements(projectId, changes)
  if (!procurementValidation.valid) return procurementValidation

  const budgetValidation = await validateBudget(projectId, changes)
  if (!budgetValidation.valid) return budgetValidation

  return { valid: true }
}
