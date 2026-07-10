import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { FileText, LockKeyhole, Upload, X } from 'lucide-react'
import {
  Badge,
  Button,
  ConfirmationDialog,
  CurrencyInput,
  DatePicker,
  Input,
  RadioGroup,
  Select,
  type SelectOption,
  SideDrawer,
  Textarea,
} from '../../components/ui'
import type { Dga_aop_cost_centers } from '../../generated/models/Dga_aop_cost_centersModel'
import type { Dga_aop_projectsesBase } from '../../generated/models/Dga_aop_projectsesModel'
import type { Dga_categories } from '../../generated/models/Dga_categoriesModel'
import type { Dga_procurement_plans, Dga_procurement_plansBase } from '../../generated/models/Dga_procurement_plansModel'
import { Dga_aop_cost_centersService } from '../../generated/services/Dga_aop_cost_centersService'
import { Dga_aop_projectsesService } from '../../generated/services/Dga_aop_projectsesService'
import { Dga_categoriesService } from '../../generated/services/Dga_categoriesService'
import { Dga_procurement_plansService } from '../../generated/services/Dga_procurement_plansService'
import { formatCurrencyAmount } from '../../utils/formatting'
import { formatDate, getQuarter } from './helpers/sharedHelpers'

// ── Types ──

type TenderRequiredValue = '' | '1' | '0'
type TenderTypeValue = '' | '1' | '2'
type RequestTypeValue = '' | '1' | '2' | '3' | '4' | '5' | '6'
type TenderingMethodValue = '' | '1' | '2' | '3' | '4' | '5' | '6'
type SolicitationChannelValue = '' | '1' | '2' | '3' | '4' | '5'
type OpexCapexValue = '' | '1' | '2'
type StrategicPlanValue = '' | '1' | '0'
type OutcomeValue = '' | '1' | '2'

type Procurement = {
  id: string
  tenderRequired: TenderRequiredValue
  tenderType: TenderTypeValue
  procurementStatus: string
  procurementName: string
  requestType: RequestTypeValue
  contractNumber: string
  recommendedSuppliers: string
  tenderingMethod: TenderingMethodValue
  solicitationChannel: SolicitationChannelValue
  costCenter: string
  costCenterCode: string
  opexCapex: OpexCapexValue
  alignedStrategicPlan: StrategicPlanValue
  outcome: OutcomeValue
  categoryDescription: string
  categoryCode: string
  endUserComments: string
  itemServiceDescription: string
  totalEstimatedValue: string
  prExpectedValue2026: string
  expectedContractDuration: string
  plannedPrCreationDate: string
  purchaseRequestRaisingQuarter: string
  expectedAwardingDate: string
  expectedAwardingQuarter: string
}

type ProcurementFormData = Omit<Procurement, 'id'>
type FormErrors = Partial<Record<keyof ProcurementFormData, string>>
type ExecutionProcurementFormData = {
  actualContractDuration: string
  actualContractValue: string
  attachContractFile: File | null
  justification: string
  justificationDate: string
  procurementStatus: string
  progressUpdate: string
  prTicketNumber: string
  stageUpdateDate: string
  tenderRequired: TenderRequiredValue
  tenderType: TenderTypeValue
}
type ExecutionProcurementFormErrors = Partial<Record<keyof ExecutionProcurementFormData, string>>
type ProcurementCostCenter = Dga_aop_cost_centers & {
  dga_cost_center?: string
}
type LookupOption = SelectOption<string>
type ActivityScopeValue = '' | '1' | '2'
type ProcurementPlanPayload = Partial<Omit<Dga_procurement_plansBase, 'dga_procurement_planid' | 'ownerid' | 'owneridtype'>>

type ProcurementTabProps = {
  activityScope: ActivityScopeValue
  activityPlannedEndDate: string
  activityPlannedStartDate: string
  canEditExecutionFieldsOnly?: boolean
  isExecutionPhase?: boolean
  isReadOnly?: boolean
  onActivityDataChanged?: () => void
  onProjectRelatedChangesChange?: (relatedChanges: string) => void
  projectId: string
  projectRelatedChanges?: string | null
}

// ── Constants ──

const EMPTY_FORM: ProcurementFormData = {
  tenderRequired: '',
  tenderType: '',
  procurementStatus: '',
  procurementName: '',
  requestType: '',
  contractNumber: '',
  recommendedSuppliers: '',
  tenderingMethod: '',
  solicitationChannel: '',
  costCenter: '',
  costCenterCode: '',
  opexCapex: '',
  alignedStrategicPlan: '',
  outcome: '',
  categoryDescription: '',
  categoryCode: '',
  endUserComments: '',
  itemServiceDescription: '',
  totalEstimatedValue: '',
  prExpectedValue2026: '',
  expectedContractDuration: '',
  plannedPrCreationDate: '',
  purchaseRequestRaisingQuarter: '',
  expectedAwardingDate: '',
  expectedAwardingQuarter: '',
}

const EMPTY_EXECUTION_FORM: ExecutionProcurementFormData = {
  actualContractDuration: '',
  actualContractValue: '',
  attachContractFile: null,
  justification: '',
  justificationDate: '',
  procurementStatus: '',
  progressUpdate: '',
  prTicketNumber: '',
  stageUpdateDate: '',
  tenderRequired: '',
  tenderType: '',
}

const TENDER_REQUIRED_OPTIONS = [
  { label: 'Yes', value: '1' },
  { label: 'No', value: '0' },
] as const

const TENDER_TYPE_OPTIONS = [
  { label: 'Raised', value: '1' },
  { label: 'Not Raised', value: '2' },
] as const

const PROCUREMENT_STATUS_YES_RAISED = [
  { label: 'Not Floated', value: '17' },
  { label: 'Floated', value: '1' },
  { label: 'Technical Evaluation', value: '4' },
  { label: 'Commercial Evaluation', value: '3' },
  { label: 'Pending Approval', value: '6' },
  { label: 'Awarded', value: '2' },
  { label: 'Contracting', value: '7' },
  { label: 'Execution Started', value: '8' },
  { label: 'Completed', value: '15' },
  { label: 'Postponed', value: '5' },
] as const

const PROCUREMENT_STATUS_NO = [
  { label: 'Not Started', value: '9' },
  { label: 'On Track', value: '14' },
  { label: 'Under Renewal', value: '16' },
  { label: 'Pending Approval', value: '6' },
  { label: 'Completed', value: '15' },
  { label: 'Postponed', value: '5' },
] as const

const PROCUREMENT_STATUS_YES_NOT_RAISED = [
  { label: 'Not Started', value: '9' },
  { label: 'Drafted', value: '11' },
  { label: 'On Hold', value: '10' },
  { label: 'Delayed', value: '13' },
  { label: 'Cancelled', value: '12' },
] as const

const REQUEST_TYPE_OPTIONS = [
  { label: 'Select request type', value: '' },
  { label: 'New', value: '1' },
  { label: 'Renewal', value: '2' },
  { label: 'Amendment', value: '3' },
  { label: 'Existing Contract', value: '4' },
  { label: 'GWPL', value: '5' },
  { label: 'NA', value: '6' },
] as const

const TENDERING_METHOD_OPTIONS = [
  { label: 'Select tendering method', value: '' },
  { label: 'Public Tender', value: '1' },
  { label: 'Limited Tender', value: '2' },
  { label: 'Sole Source Tender', value: '3' },
  { label: 'Single Source Tender', value: '4' },
  { label: 'NA', value: '5' },
  { label: 'GWPL', value: '6' },
] as const

const SOLICITATION_CHANNEL_OPTIONS = [
  { label: 'Select solicitation channel', value: '' },
  { label: 'RFQ', value: '1' },
  { label: 'RFP', value: '2' },
  { label: 'RFI', value: '3' },
  { label: 'NA', value: '4' },
  { label: 'GWPL', value: '5' },
] as const

const OPEX_CAPEX_OPTIONS = [
  { label: 'Opex', value: '1' },
  { label: 'Capex', value: '2' },
] as const

const STRATEGIC_PLAN_OPTIONS = [
  { label: 'Yes', value: '1' },
  { label: 'No', value: '0' },
] as const

const OUTCOME_OPTIONS = [
  { label: 'Purchase Order', value: '1' },
  { label: 'Contract Agreement', value: '2' },
] as const

const CATEGORY_CODES: Record<string, string> = {
  '3c264a4e-85bf-f011-bbd3-000d3ae0d033': '31191600',
  '3e264a4e-85bf-f011-bbd3-000d3ae0d033': '31191500',
}

// ── Status capsule helpers ──

const STATUS_TONES: Record<string, 'neutral' | 'info' | 'success' | 'warning'> = {
  '17': 'neutral',  // Not Floated
  '1': 'info',       // Floated
  '4': 'info',       // Technical Evaluation
  '3': 'info',       // Commercial Evaluation
  '6': 'warning',    // Pending Approval
  '2': 'success',    // Awarded
  '7': 'success',    // Contracting
  '8': 'success',    // Execution Started
  '5': 'warning',    // Postponed
  '9': 'neutral',    // Not Started
  '14': 'success',   // On Track
  '16': 'info',      // Under Renewal
  '15': 'success',   // Completed
  '11': 'neutral',   // Drafted
  '10': 'warning',   // On Hold
  '13': 'warning',   // Delayed
  '12': 'neutral',   // Cancelled
}

function getStatusLabel(value: string): string {
  const all = [...PROCUREMENT_STATUS_YES_RAISED, ...PROCUREMENT_STATUS_NO, ...PROCUREMENT_STATUS_YES_NOT_RAISED]
  return all.find((s) => s.value === value)?.label ?? value
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(size / 1024))} KB`
}

function getQuarterNumber(quarter?: string | null) {
  const match = String(quarter ?? '').match(/[1-4]/)
  return match ? Number(match[0]) : 0
}

function getCurrentQuarterNumber() {
  return Math.floor(new Date().getMonth() / 3) + 1
}

function isFutureQuarter(quarter?: string | null) {
  const quarterNumber = getQuarterNumber(quarter)
  return quarterNumber > 0 && quarterNumber > getCurrentQuarterNumber()
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

function normalizeId(id?: string | null) {
  return id?.replace(/[{}]/g, '').toLowerCase() ?? ''
}

function buildCostCenterOption(costCenter: ProcurementCostCenter): LookupOption | null {
  if (!costCenter.dga_aop_cost_centerid) return null

  const code = costCenter.dga_name ?? ''
  const name = costCenter.dga_cost_center ?? costCenter.dga_divisional_hierarchyname ?? code

  return {
    description: code ? `Code: ${code}` : undefined,
    label: name,
    meta: costCenter.dga_strategic_vs_operationname,
    value: costCenter.dga_aop_cost_centerid,
  }
}

function buildCategoryOption(category: Dga_categories): LookupOption | null {
  if (!category.dga_categoryid) return null

  const code = category.dga_name ?? ''
  const description = category.dga_description ?? code

  return {
    description: code ? `Code: ${code}` : undefined,
    label: code ? `${description}` : description,
    value: category.dga_categoryid,
  }
}

function isCostCenterInActivityScope(costCenter: ProcurementCostCenter, activityScope: ActivityScopeValue) {
  if (!activityScope) return true
  return String(costCenter.dga_strategic_vs_operation) === activityScope
}

function toDateOnly(value?: string | null) {
  return value?.split('T')[0] ?? ''
}

function addDaysToIsoDate(value: string, days: number) {
  const dateOnly = toDateOnly(value)
  if (!dateOnly) return ''

  const [year, month, day] = dateOnly.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  if (Number.isNaN(date.getTime())) return ''

  date.setDate(date.getDate() + days)

  const nextYear = date.getFullYear()
  const nextMonth = String(date.getMonth() + 1).padStart(2, '0')
  const nextDay = String(date.getDate()).padStart(2, '0')

  return `${nextYear}-${nextMonth}-${nextDay}`
}

function toStringChoice<TValue extends string>(value: unknown, allowedValues: readonly TValue[]): TValue | '' {
  const normalized = String(value ?? '')
  return allowedValues.includes(normalized as TValue) ? normalized as TValue : ''
}

function numberOrUndefined<TValue extends number | undefined>(value: string): TValue | undefined {
  if (!value) return undefined
  return Number(value) as TValue
}

function booleanToYesNo(value?: boolean | null): StrategicPlanValue {
  if (value === true) return '1'
  if (value === false) return '0'
  return ''
}

function yesNoToBoolean(value: StrategicPlanValue | TenderRequiredValue) {
  if (value === '1') return true
  if (value === '0') return false
  return undefined
}

function currencyToNumber(value: string) {
  const normalized = value.replace(/,/g, '').trim()
  if (!normalized) return undefined
  const parsed = Number(normalized)
  return Number.isNaN(parsed) ? undefined : parsed
}

function numberToCurrencyString(value?: number | null) {
  return value == null ? '' : String(value)
}

function normalizeProjectLookupFilter(projectId: string) {
  return `_dga_aop_project_value eq '${projectId.replace(/[{}]/g, '')}'`
}

function planToProcurement(record: Dga_procurement_plans): Procurement | null {
  if (!record.dga_procurement_planid) return null

  const plannedPrCreationDate = toDateOnly(record.dga_purchase_request_raising_date_by_month)
  const expectedAwardingDate = toDateOnly(record.dga_expected_awarding_date_by_month)

  return {
    id: record.dga_procurement_planid,
    tenderRequired: booleanToYesNo(record.dga_does_this_project_require_tender),
    tenderType: toStringChoice(record.dga_tender_type, ['1', '2'] as const),
    procurementStatus: toStringChoice(record.dga_current_procurement_status, ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17'] as const),
    procurementName: record.dga_name ?? '',
    requestType: toStringChoice(record.dga_request_type, ['1', '2', '3', '4', '5', '6'] as const),
    contractNumber: record.dga_pr_ticket_number ?? '',
    recommendedSuppliers: '',
    tenderingMethod: toStringChoice(record.dga_sourcing_method, ['1', '2', '3', '4', '5', '6'] as const),
    solicitationChannel: toStringChoice(record.dga_solicitation_channel, ['1', '2', '3', '4', '5'] as const),
    costCenter: record._dga_aop_cost_centre_value ?? '',
    costCenterCode: '',
    opexCapex: toStringChoice(record.dga_opex_capex, ['1', '2'] as const),
    alignedStrategicPlan: booleanToYesNo(record.dga_aligned_with_strategic_plan),
    outcome: toStringChoice(record.dga_new_outcome, ['1', '2'] as const),
    categoryDescription: record._dga_category_code_value ?? '',
    categoryCode: '',
    endUserComments: record.dga_end_user_comments ?? '',
    itemServiceDescription: record.dga_item_service_description ?? '',
    totalEstimatedValue: numberToCurrencyString(record.dga_total_project_budget),
    prExpectedValue2026: numberToCurrencyString(record.dga_pr_expected_value_2024),
    expectedContractDuration: record.dga_expected_contract_duration ?? '',
    plannedPrCreationDate,
    purchaseRequestRaisingQuarter: record.dga_purchase_request_raising_by_quarter ?? getQuarter(plannedPrCreationDate),
    expectedAwardingDate,
    expectedAwardingQuarter: record.dga_expected_awarding_by_quarter ?? getQuarter(expectedAwardingDate),
  }
}

type ProjectRelatedChange = {
  new_value?: unknown
  old_value: unknown
  planned_value?: unknown
}

type ProjectRelatedChanges = {
  [key: string]: ProjectRelatedChange | ProjectRelatedChanges | string | number | boolean | null | undefined
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function parseProjectRelatedChanges(value?: string | null): ProjectRelatedChanges {
  if (!value?.trim()) {
    return {}
  }

  try {
    const parsed = JSON.parse(value) as unknown

    if (!isPlainObject(parsed)) {
      return {}
    }

    return parsed as ProjectRelatedChanges
  } catch {
    return {}
  }
}

function mergeProjectRelatedChanges(base: ProjectRelatedChanges, override: ProjectRelatedChanges): ProjectRelatedChanges {
  const merged: ProjectRelatedChanges = { ...base }

  Object.entries(override).forEach(([key, value]) => {
    const existingValue = merged[key]

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

function relatedOldValue(value: unknown, plannedValue?: unknown): ProjectRelatedChange {
  return {
    ...(plannedValue !== undefined ? { planned_value: plannedValue } : {}),
    old_value: value ?? '',
  }
}

function getExecutionProcurementRelatedField(
  relatedChanges: string | null | undefined,
  procurementId: string | undefined,
  fieldName: string,
): unknown {
  const recordKey = procurementId ? procurementId.replace(/[{}]/g, '') : 'new'

  return resolveProjectRelatedValue(getProjectRelatedChangeAt(
    parseProjectRelatedChanges(relatedChanges),
    ['procurements', 'by_record', recordKey, fieldName],
  ))
}

function buildExecutionFormFromRelatedChanges(
  relatedChanges: string | null | undefined,
  procurement: Procurement,
): ExecutionProcurementFormData {
  const value = (fieldName: string) => getExecutionProcurementRelatedField(relatedChanges, procurement.id, fieldName)

  return {
    actualContractDuration: isEmptyRelatedValue(value('dga_actual_contract_duration_in_months'))
      ? ''
      : `${value('dga_actual_contract_duration_in_months')} ${Number(value('dga_actual_contract_duration_in_months')) === 1 ? 'Month' : 'Months'}`,
    actualContractValue: isEmptyRelatedValue(value('dga_actual_contract_value')) ? '' : String(value('dga_actual_contract_value')),
    attachContractFile: null,
    justification: isEmptyRelatedValue(value('dga_justification_of_the_change')) ? '' : String(value('dga_justification_of_the_change')),
    justificationDate: isEmptyRelatedValue(value('dga_justification_date')) ? '' : String(value('dga_justification_date')),
    procurementStatus: isEmptyRelatedValue(value('dga_current_procurement_status')) ? '' : String(value('dga_current_procurement_status')),
    progressUpdate: isEmptyRelatedValue(value('dga_progress_update')) ? '' : String(value('dga_progress_update')),
    prTicketNumber: isEmptyRelatedValue(value('dga_pr_ticket_number')) ? '' : String(value('dga_pr_ticket_number')),
    stageUpdateDate: isEmptyRelatedValue(value('dga_stage_update_date')) ? '' : String(value('dga_stage_update_date')),
    tenderRequired: isEmptyRelatedValue(value('dga_does_this_project_require_tender'))
      ? ''
      : value('dga_does_this_project_require_tender') === true
        ? '1'
        : value('dga_does_this_project_require_tender') === false
          ? '0'
          : String(value('dga_does_this_project_require_tender')) as TenderRequiredValue,
    tenderType: isEmptyRelatedValue(value('dga_tender_type')) ? '' : String(value('dga_tender_type')) as TenderTypeValue,
  }
}

function buildExecutionProcurementRelatedChanges(
  procurement: Procurement | null,
  executionForm: ExecutionProcurementFormData,
): ProjectRelatedChanges {
  const recordKey = procurement?.id ? procurement.id.replace(/[{}]/g, '') : 'new'

  return {
    procurements: {
      by_record: {
        [recordKey]: {
          name: procurement?.procurementName ?? '',
          dga_does_this_project_require_tender: relatedOldValue(
            yesNoToBoolean(executionForm.tenderRequired),
            yesNoToBoolean(procurement?.tenderRequired ?? ''),
          ),
          dga_tender_type: relatedOldValue(
            executionForm.tenderType ? Number(executionForm.tenderType) : '',
            procurement?.tenderType ? Number(procurement.tenderType) : '',
          ),
          dga_current_procurement_status: relatedOldValue(
            executionForm.procurementStatus ? Number(executionForm.procurementStatus) : '',
            procurement?.procurementStatus ? Number(procurement.procurementStatus) : '',
          ),
          dga_pr_ticket_number: relatedOldValue(executionForm.prTicketNumber),
          dga_actual_contract_value: relatedOldValue(currencyToNumber(executionForm.actualContractValue) ?? ''),
          dga_actual_contract_duration_in_months: relatedOldValue(
            executionForm.actualContractDuration.replace(/\s*Month(s?)$/i, '').replace(/\D/g, ''),
          ),
          dga_stage_update_date: relatedOldValue(executionForm.stageUpdateDate),
          dga_progress_update: relatedOldValue(executionForm.progressUpdate),
          attach_contract_file: relatedOldValue(executionForm.attachContractFile?.name ?? ''),
          dga_justification_date: relatedOldValue(executionForm.justificationDate),
          dga_justification_of_the_change: relatedOldValue(executionForm.justification),
        } as ProjectRelatedChanges,
      },
    },
  }
}

function buildProcurementPayload(form: ProcurementFormData, projectId?: string): ProcurementPlanPayload {
  const payload: ProcurementPlanPayload = {
    dga_aligned_with_strategic_plan: yesNoToBoolean(form.alignedStrategicPlan),
    dga_category_description: form.categoryCode,
    dga_current_procurement_status: numberOrUndefined<Dga_procurement_plansBase['dga_current_procurement_status']>(form.procurementStatus),
    dga_does_this_project_require_tender: yesNoToBoolean(form.tenderRequired),
    dga_end_user_comments: form.endUserComments,
    dga_expected_awarding_by_quarter: form.expectedAwardingQuarter,
    dga_expected_awarding_date_by_month: form.expectedAwardingDate,
    dga_expected_contract_duration: form.expectedContractDuration,
    dga_item_service_description: form.itemServiceDescription,
    dga_name: form.procurementName.trim(),
    dga_new_outcome: numberOrUndefined<Dga_procurement_plansBase['dga_new_outcome']>(form.outcome),
    dga_opex_capex: numberOrUndefined<Dga_procurement_plansBase['dga_opex_capex']>(form.opexCapex),
    dga_pr_expected_value_2024: currencyToNumber(form.prExpectedValue2026),
    dga_pr_ticket_number: form.contractNumber,
    dga_purchase_request_raising_by_quarter: form.purchaseRequestRaisingQuarter,
    dga_purchase_request_raising_date_by_month: form.plannedPrCreationDate,
    dga_request_type: numberOrUndefined<Dga_procurement_plansBase['dga_request_type']>(form.requestType),
    dga_solicitation_channel: numberOrUndefined<Dga_procurement_plansBase['dga_solicitation_channel']>(form.solicitationChannel),
    dga_sourcing_method: numberOrUndefined<Dga_procurement_plansBase['dga_sourcing_method']>(form.tenderingMethod),
    dga_tender_type: numberOrUndefined<Dga_procurement_plansBase['dga_tender_type']>(form.tenderType),
    dga_total_project_budget: currencyToNumber(form.totalEstimatedValue),
    statecode: 0,
    statuscode: 1,
  }

  if (projectId) {
    payload['dga_aop_project@odata.bind'] = `/dga_aop_projectses(${projectId.replace(/[{}]/g, '')})`
  }

  if (form.costCenter) {
    payload['dga_aop_cost_centre@odata.bind'] = `/dga_aop_cost_centers(${form.costCenter.replace(/[{}]/g, '')})`
  }

  if (form.categoryDescription) {
    payload['dga_category_code@odata.bind'] = `/dga_categories(${form.categoryDescription.replace(/[{}]/g, '')})`
  }

  return payload
}

function getDateRangeErrors(
  form: ProcurementFormData,
  activityPlannedStartDate: string,
  activityPlannedEndDate: string,
): FormErrors {
  const errors: FormErrors = {}
  const activityStart = toDateOnly(activityPlannedStartDate)
  const activityEnd = toDateOnly(activityPlannedEndDate)

  if (form.plannedPrCreationDate && activityStart && form.plannedPrCreationDate < activityStart) {
    errors.plannedPrCreationDate = `Planned PR Creation Date must be on or after activity start date ${formatDate(activityStart)}.`
  }

  if (form.plannedPrCreationDate && activityEnd && form.plannedPrCreationDate > activityEnd) {
    errors.plannedPrCreationDate = `Planned PR Creation Date must be on or before activity end date ${formatDate(activityEnd)}.`
  }

  if (form.expectedAwardingDate && activityStart && form.expectedAwardingDate < activityStart) {
    errors.expectedAwardingDate = `Expected Awarding Date must be on or after activity start date ${formatDate(activityStart)}.`
  }

  if (form.expectedAwardingDate && activityEnd && form.expectedAwardingDate > activityEnd) {
    errors.expectedAwardingDate = `Expected Awarding Date must be on or before activity end date ${formatDate(activityEnd)}.`
  }

  if (form.plannedPrCreationDate && form.expectedAwardingDate && form.expectedAwardingDate <= form.plannedPrCreationDate) {
    errors.expectedAwardingDate = 'Expected Awarding Date must be after Planned PR Creation Date.'
  }

  return errors
}

// ── Component ──

export function ProcurementTab({
  activityPlannedEndDate,
  activityPlannedStartDate,
  activityScope,
  canEditExecutionFieldsOnly = false,
  isExecutionPhase = false,
  isReadOnly = false,
  onActivityDataChanged,
  onProjectRelatedChangesChange,
  projectId,
  projectRelatedChanges,
}: ProcurementTabProps) {
  const uid = useId()
  const executionFileInputRef = useRef<HTMLInputElement | null>(null)

  // ── Data state ──
  const [procurements, setProcurements] = useState<Procurement[]>([])
  const [costCenters, setCostCenters] = useState<ProcurementCostCenter[]>([])
  const [categories, setCategories] = useState<Dga_categories[]>([])
  const [isLookupLoading, setIsLookupLoading] = useState(false)
  const [lookupError, setLookupError] = useState('')
  const [isProcurementsLoading, setIsProcurementsLoading] = useState(false)
  const [isSavingProcurement, setIsSavingProcurement] = useState(false)
  const [isDeletingProcurement, setIsDeletingProcurement] = useState(false)
  const [localProjectRelatedChanges, setLocalProjectRelatedChanges] = useState<{ projectId: string; value: string } | null>(null)
  const [procurementError, setProcurementError] = useState('')
  const [procurementNotice, setProcurementNotice] = useState('')

  // ── CRUD state ──
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingProcurement, setEditingProcurement] = useState<Procurement | null>(null)
  const [form, setForm] = useState<ProcurementFormData>(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [executionForm, setExecutionForm] = useState<ExecutionProcurementFormData>(EMPTY_EXECUTION_FORM)
  const [executionFormErrors, setExecutionFormErrors] = useState<ExecutionProcurementFormErrors>({})
  const [procurementToDelete, setProcurementToDelete] = useState<Procurement | null>(null)
  const effectiveProjectRelatedChanges = localProjectRelatedChanges?.projectId === projectId
    ? localProjectRelatedChanges.value
    : projectRelatedChanges ?? ''

  const loadProcurementLookups = useCallback(async () => {
    setIsLookupLoading(true)
    setLookupError('')

    try {
      const [costCentersResult, categoriesResult] = await Promise.all([
        Dga_aop_cost_centersService.getAll({
          select: [
            'dga_aop_cost_centerid',
            'dga_name',
            'dga_cost_center',
            'dga_strategic_vs_operation',
            'statuscode',
            'statecode',
            '_dga_divisional_hierarchy_value',
          ],
          filter: 'statecode eq 0',
          orderBy: ['dga_name asc'],
        }),
        Dga_categoriesService.getAll({
          select: [
            'dga_categoryid',
            'dga_name',
            'dga_description',
            'statuscode',
            'statecode',
          ],
          filter: 'statecode eq 0',
          orderBy: ['dga_name asc'],
        }),
      ])

      assertOperationSuccess(costCentersResult, 'Unable to load cost centers.')
      assertOperationSuccess(categoriesResult, 'Unable to load categories.')

      setCostCenters(((costCentersResult.data ?? []) as ProcurementCostCenter[]).filter((costCenter) => costCenter.dga_aop_cost_centerid))
      setCategories(((categoriesResult.data ?? []) as Dga_categories[]).filter((category) => category.dga_categoryid))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load procurement lookups.'
      setLookupError(message)
      setCostCenters([])
      setCategories([])
    } finally {
      setIsLookupLoading(false)
    }
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadProcurementLookups()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadProcurementLookups])

  const loadProcurements = useCallback(async () => {
    if (!projectId) {
      setProcurements([])
      setProcurementError('Activity id is missing from the edit URL.')
      return
    }

    setIsProcurementsLoading(true)
    setProcurementError('')

    try {
      const result = await Dga_procurement_plansService.getAll({
        select: [
          'dga_procurement_planid',
          'dga_aligned_with_strategic_plan',
          'dga_category_description',
          'dga_current_procurement_status',
          'dga_does_this_project_require_tender',
          'dga_end_user_comments',
          'dga_expected_awarding_by_quarter',
          'dga_expected_awarding_date_by_month',
          'dga_expected_contract_duration',
          'dga_item_service_description',
          'dga_name',
          'dga_new_outcome',
          'dga_opex_capex',
          'dga_pr_expected_value_2024',
          'dga_pr_ticket_number',
          'dga_purchase_request_raising_by_quarter',
          'dga_purchase_request_raising_date_by_month',
          'dga_request_type',
          'dga_solicitation_channel',
          'dga_sourcing_method',
          'dga_tender_type',
          'dga_total_project_budget',
          '_dga_aop_cost_centre_value',
          '_dga_aop_project_value',
          '_dga_category_code_value',
        ],
        filter: normalizeProjectLookupFilter(projectId),
        orderBy: ['dga_purchase_request_raising_date_by_month asc'],
      })

      assertOperationSuccess(result, 'Unable to load procurement plans.')

      const rows = (result.data ?? [])
        .map((record) => planToProcurement(record as Dga_procurement_plans))
        .filter((record): record is Procurement => Boolean(record))

      setProcurements(rows)
    } catch (error) {
      setProcurementError(error instanceof Error ? error.message : 'Unable to load procurement plans.')
      setProcurements([])
    } finally {
      setIsProcurementsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadProcurements()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadProcurements])

  // ── Derived ──
  const isTenderRequired = form.tenderRequired === '1'
  const activityStartDate = toDateOnly(activityPlannedStartDate)
  const activityEndDate = toDateOnly(activityPlannedEndDate)
  const expectedAwardingMinDate = form.plannedPrCreationDate
    ? addDaysToIsoDate(form.plannedPrCreationDate, 1)
    : activityStartDate
  const costCenterCodeById = useMemo(() => new Map(costCenters.map((costCenter) => [
    normalizeId(costCenter.dga_aop_cost_centerid),
    costCenter.dga_name ?? '',
  ])), [costCenters])
  const categoryCodeById = useMemo(() => new Map(categories.map((category) => [
    normalizeId(category.dga_categoryid),
    category.dga_name ?? '',
  ])), [categories])
  const scopedCostCenters = useMemo(() => (
    costCenters.filter((costCenter) => isCostCenterInActivityScope(costCenter, activityScope))
  ), [activityScope, costCenters])
  const isSelectedCostCenterInScope = useMemo(() => {
    if (!form.costCenter) return true
    return scopedCostCenters.some((costCenter) =>
      normalizeId(costCenter.dga_aop_cost_centerid) === normalizeId(form.costCenter),
    )
  }, [form.costCenter, scopedCostCenters])
  const costCenterOptions = useMemo<LookupOption[]>(() => {
    const options = scopedCostCenters
      .map(buildCostCenterOption)
      .filter((option): option is LookupOption => Boolean(option))

    return [
      {
        disabled: isLookupLoading || Boolean(lookupError),
        label: lookupError ? 'Unable to load cost centers' : isLookupLoading ? 'Loading cost centers...' : 'Select cost center',
        value: '',
      },
      ...options,
    ]
  }, [isLookupLoading, lookupError, scopedCostCenters])
  const categoryOptions = useMemo<LookupOption[]>(() => {
    const options = categories
      .map(buildCategoryOption)
      .filter((option): option is LookupOption => Boolean(option))

    return [
      {
        disabled: isLookupLoading || Boolean(lookupError),
        label: lookupError ? 'Unable to load categories' : isLookupLoading ? 'Loading categories...' : 'Select category',
        value: '',
      },
      ...options,
    ]
  }, [categories, isLookupLoading, lookupError])

  const procurementStatusOptions = useMemo(() => {
    if (isTenderRequired && form.tenderType === '1') return PROCUREMENT_STATUS_YES_RAISED
    if (isTenderRequired && form.tenderType === '2') return PROCUREMENT_STATUS_YES_NOT_RAISED
    if (form.tenderRequired === '0') return PROCUREMENT_STATUS_NO
    return []
  }, [form.tenderRequired, form.tenderType, isTenderRequired])
  const isExecutionTenderRequired = executionForm.tenderRequired === '1'
  const isExecutionTenderNotRequired = executionForm.tenderRequired === '0'
  const isExecutionTenderRaised = isExecutionTenderRequired && executionForm.tenderType === '1'
  const isExecutionTenderNotRaised = isExecutionTenderRequired && executionForm.tenderType === '2'
  const shouldShowExecutionRaisedFields = isExecutionTenderNotRequired || isExecutionTenderRaised
  const shouldShowAttachContract = shouldShowExecutionRaisedFields && ['8', '15'].includes(executionForm.procurementStatus)
  const isFutureQuarterLocked = isExecutionPhase
    && Boolean(editingProcurement)
    && isFutureQuarter(form.purchaseRequestRaisingQuarter || form.expectedAwardingQuarter)
  const canEditExecutionSection = (!isReadOnly || canEditExecutionFieldsOnly) && !isFutureQuarterLocked
  const executionProcurementStatusOptions = useMemo(() => {
    if (executionForm.tenderRequired === '0') return PROCUREMENT_STATUS_YES_RAISED
    if (isExecutionTenderRequired && executionForm.tenderType === '1') return PROCUREMENT_STATUS_YES_RAISED
    if (isExecutionTenderRequired && executionForm.tenderType === '2') return PROCUREMENT_STATUS_YES_NOT_RAISED
    return []
  }, [executionForm.tenderRequired, executionForm.tenderType, isExecutionTenderRequired])

  // ── DataGrid columns ──

  const gridColumns = [
    {
      key: 'procurementName',
      header: 'Procurement Name',
      render: (row: Procurement) => (
        <button
          className="edit-activity__procurement-name-btn"
          onClick={() => handleOpenEdit(row)}
          type="button"
        >
          <span className="edit-activity__procurement-name">{row.procurementName}</span>
        </button>
      ),
    },
    {
      key: 'tenderRequired',
      header: 'Tender Required',
      render: (row: Procurement) => (
        <Badge tone={row.tenderRequired === '1' ? 'success' : 'neutral'}>
          {row.tenderRequired === '1' ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      key: 'tenderType',
      header: 'Tender Type',
      render: (row: Procurement) => (
        row.tenderType ? <Badge tone="info">{row.tenderType === '1' ? 'Raised' : 'Not Raised'}</Badge> : <span className="edit-activity__procurement-na">—</span>
      ),
    },
    {
      key: 'procurementStatus',
      header: 'Procurement Status',
      render: (row: Procurement) => (
        <Badge tone={STATUS_TONES[row.procurementStatus] ?? 'neutral'}>
          {getStatusLabel(row.procurementStatus)}
        </Badge>
      ),
    },
    {
      key: 'requestType',
      header: 'Request Type',
      render: (row: Procurement) => (
        <Badge tone="neutral">
          {REQUEST_TYPE_OPTIONS.find((o) => o.value === row.requestType)?.label ?? row.requestType}
        </Badge>
      ),
    },
    {
      key: 'tenderingMethod',
      header: 'Tendering Method',
      render: (row: Procurement) => (
        <Badge tone="neutral">
          {TENDERING_METHOD_OPTIONS.find((o) => o.value === row.tenderingMethod)?.label ?? row.tenderingMethod}
        </Badge>
      ),
    },
    {
      key: 'totalEstimatedValue',
      header: 'Total Activity Estimated Value',
      render: (row: Procurement) => (
        <span className="edit-activity__procurement-value">
          {formatCurrencyAmount(row.totalEstimatedValue)}
        </span>
      ),
    },
    {
      key: 'prExpectedValue2026',
      header: 'PR Expected Value in 2026',
      render: (row: Procurement) => (
        <span className="edit-activity__procurement-value">
          {formatCurrencyAmount(row.prExpectedValue2026)}
        </span>
      ),
    },
    {
      key: 'plannedPrCreationDate',
      header: 'Planned PR Creation Date',
      render: (row: Procurement) => <span>{formatDate(row.plannedPrCreationDate)}</span>,
    },
    {
      key: 'expectedAwardingDate',
      header: 'Expected Awarding Date',
      render: (row: Procurement) => <span>{formatDate(row.expectedAwardingDate)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: Procurement) => (
        <div className="edit-activity__procurement-actions">
          <>
            <button
              aria-label="Edit procurement"
              className="edit-activity__procurement-action-btn"
              onClick={() => handleOpenEdit(row)}
              type="button"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            {!isReadOnly ? (
              <button
                aria-label="Delete procurement"
                className="edit-activity__procurement-action-btn edit-activity__procurement-action-btn--danger"
                onClick={() => setProcurementToDelete(row)}
                type="button"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            ) : null}
          </>
        </div>
      ),
    },
  ] as const

  // ── Helpers ──

  function handleFieldChange(fields: Partial<ProcurementFormData>) {
    if (isReadOnly) return
    const next = { ...form, ...fields }

    // Reset dependent fields
    if (fields.tenderRequired !== undefined) {
      if (fields.tenderRequired === '0') {
        next.tenderType = ''
        next.procurementStatus = ''
      } else if (fields.tenderRequired === '1') {
        next.procurementStatus = ''
      }
    }

    if (fields.tenderType !== undefined) {
      next.procurementStatus = ''
    }

    // Auto-calculate quarter from PR creation date
    if (fields.plannedPrCreationDate !== undefined) {
      next.purchaseRequestRaisingQuarter = getQuarter(fields.plannedPrCreationDate)
    }

    // Auto-calculate quarter from awarding date
    if (fields.expectedAwardingDate !== undefined) {
      next.expectedAwardingQuarter = getQuarter(fields.expectedAwardingDate)
    }

    // Auto-fill cost center code
    if (fields.costCenter !== undefined) {
      next.costCenterCode = costCenterCodeById.get(normalizeId(fields.costCenter)) ?? ''
    }

    // Auto-fill category code
    if (fields.categoryDescription !== undefined) {
      next.categoryCode = categoryCodeById.get(normalizeId(fields.categoryDescription)) ?? CATEGORY_CODES[fields.categoryDescription] ?? ''
    }

    const changedKeys = Object.keys(fields) as Array<keyof ProcurementFormData>
    const dateErrors = getDateRangeErrors(next, activityPlannedStartDate, activityPlannedEndDate)
    const pickedDateError = fields.plannedPrCreationDate !== undefined
      ? dateErrors.plannedPrCreationDate
      : fields.expectedAwardingDate !== undefined
        ? dateErrors.expectedAwardingDate
        : undefined

    if (pickedDateError) {
      setFormErrors((prev) => {
        const copy = { ...prev }
        changedKeys.forEach((key) => {
          delete copy[key]
        })
        return { ...copy, ...dateErrors }
      })
      return
    }

    setForm(next)

    setFormErrors((prev) => {
      const copy = { ...prev }
      changedKeys.forEach((key) => {
        delete copy[key]
      })
      delete copy.plannedPrCreationDate
      delete copy.expectedAwardingDate
      return { ...copy, ...dateErrors }
    })
  }

  function handleCurrencyBlur(field: 'totalEstimatedValue' | 'prExpectedValue2026') {
    const raw = form[field].replace(/,/g, '')
    if (raw && !Number.isNaN(Number(raw))) {
      handleFieldChange({ [field]: formatCurrencyAmount(raw) })
    }
  }

  function handleExecutionFieldChange(fields: Partial<ExecutionProcurementFormData>) {
    if (!canEditExecutionSection) return

    const next: ExecutionProcurementFormData = { ...executionForm, ...fields }

    if (fields.tenderRequired !== undefined) {
      next.tenderType = ''
      next.procurementStatus = ''
      next.prTicketNumber = ''
      next.actualContractValue = ''
      next.actualContractDuration = ''
      next.stageUpdateDate = ''
      next.progressUpdate = ''
      next.attachContractFile = null
      next.justificationDate = ''
      next.justification = ''
    }

    if (fields.tenderType !== undefined) {
      next.procurementStatus = ''
      next.prTicketNumber = ''
      next.actualContractValue = ''
      next.actualContractDuration = ''
      next.stageUpdateDate = ''
      next.progressUpdate = ''
      next.attachContractFile = null
      next.justificationDate = ''
      next.justification = ''
    }

    if (fields.procurementStatus !== undefined && !['8', '15'].includes(fields.procurementStatus)) {
      next.attachContractFile = null
    }

    setExecutionForm(next)

    setExecutionFormErrors((prev) => {
      const copy = { ...prev }
      const changedExecutionKeys = Object.keys(fields) as Array<keyof ExecutionProcurementFormData>
      changedExecutionKeys.forEach((key) => {
        delete copy[key]
      })

      if (fields.tenderRequired !== undefined || fields.tenderType !== undefined) {
        delete copy.tenderType
        delete copy.procurementStatus
        delete copy.prTicketNumber
        delete copy.actualContractValue
        delete copy.actualContractDuration
        delete copy.stageUpdateDate
        delete copy.progressUpdate
        delete copy.attachContractFile
        delete copy.justificationDate
        delete copy.justification
      }

      return copy
    })
  }

  function handleExecutionCurrencyBlur() {
    const raw = executionForm.actualContractValue.replace(/,/g, '')
    if (raw && !Number.isNaN(Number(raw))) {
      handleExecutionFieldChange({ actualContractValue: formatCurrencyAmount(raw) })
    }
  }

  function handleExecutionDurationBlur() {
    const raw = executionForm.actualContractDuration.replace(/\s*Month(s?)$/i, '').replace(/\D/g, '')
    if (!raw || Number.isNaN(Number(raw))) return

    const duration = Number(raw)
    handleExecutionFieldChange({ actualContractDuration: `${duration} ${duration === 1 ? 'Month' : 'Months'}` })
  }

  function handleExecutionFileChange(file: File | null) {
    if (!canEditExecutionSection) return
    handleExecutionFieldChange({ attachContractFile: file })
  }

  function handleRemoveExecutionFile() {
    handleExecutionFileChange(null)
    if (executionFileInputRef.current) {
      executionFileInputRef.current.value = ''
    }
  }

  function handleOpenCreate() {
    if (isReadOnly) return
    setEditingProcurement(null)
    setForm(EMPTY_FORM)
    setFormErrors({})
    setExecutionForm(EMPTY_EXECUTION_FORM)
    setExecutionFormErrors({})
    if (executionFileInputRef.current) {
      executionFileInputRef.current.value = ''
    }
    setProcurementError('')
    setProcurementNotice('')
    setIsDrawerOpen(true)
  }

  function handleOpenEdit(procurement: Procurement) {
    setEditingProcurement(procurement)
    setForm({
      tenderRequired: procurement.tenderRequired,
      tenderType: procurement.tenderType,
      procurementStatus: procurement.procurementStatus,
      procurementName: procurement.procurementName,
      requestType: procurement.requestType,
      contractNumber: procurement.contractNumber,
      recommendedSuppliers: procurement.recommendedSuppliers,
      tenderingMethod: procurement.tenderingMethod,
      solicitationChannel: procurement.solicitationChannel,
      costCenter: procurement.costCenter,
      costCenterCode: procurement.costCenterCode || costCenterCodeById.get(normalizeId(procurement.costCenter)) || '',
      opexCapex: procurement.opexCapex,
      alignedStrategicPlan: procurement.alignedStrategicPlan,
      outcome: procurement.outcome,
      categoryDescription: procurement.categoryDescription,
      categoryCode: procurement.categoryCode || categoryCodeById.get(normalizeId(procurement.categoryDescription)) || '',
      endUserComments: procurement.endUserComments,
      itemServiceDescription: procurement.itemServiceDescription,
      totalEstimatedValue: procurement.totalEstimatedValue,
      prExpectedValue2026: procurement.prExpectedValue2026,
      expectedContractDuration: procurement.expectedContractDuration,
      plannedPrCreationDate: procurement.plannedPrCreationDate,
      purchaseRequestRaisingQuarter: procurement.purchaseRequestRaisingQuarter,
      expectedAwardingDate: procurement.expectedAwardingDate,
      expectedAwardingQuarter: procurement.expectedAwardingQuarter,
    })
    setFormErrors({})
    setExecutionForm(buildExecutionFormFromRelatedChanges(effectiveProjectRelatedChanges, procurement))
    setExecutionFormErrors({})
    if (executionFileInputRef.current) {
      executionFileInputRef.current.value = ''
    }
    setProcurementError('')
    setProcurementNotice('')
    setIsDrawerOpen(true)
  }

  function handleCloseDrawer() {
    setIsDrawerOpen(false)
    setEditingProcurement(null)
    setForm(EMPTY_FORM)
    setFormErrors({})
    setExecutionForm(EMPTY_EXECUTION_FORM)
    setExecutionFormErrors({})
    if (executionFileInputRef.current) {
      executionFileInputRef.current.value = ''
    }
  }

  function validate(): boolean {
    const errs: FormErrors = {}

    if (!isExecutionPhase) {
      if (!form.tenderRequired) errs.tenderRequired = 'Select whether tender is required'
      if (isTenderRequired && !form.tenderType) errs.tenderType = 'Select tender type'
      if (procurementStatusOptions.length > 0 && !form.procurementStatus) {
        errs.procurementStatus = 'Select procurement status'
      }
    }
    if (!form.procurementName.trim()) errs.procurementName = 'Procurement name is required'
    if (!form.requestType) errs.requestType = 'Select request type'
    if (!form.tenderingMethod) errs.tenderingMethod = 'Select tendering method'
    if (!form.solicitationChannel) errs.solicitationChannel = 'Select solicitation channel'
    if (!form.costCenter || !isSelectedCostCenterInScope) {
      errs.costCenter = activityScope
        ? `Select a ${activityScope === '1' ? 'Strategic' : 'Operational'} cost center`
        : 'Select cost center'
    }
    if (!form.opexCapex) errs.opexCapex = 'Select Opex or Capex'
    if (!form.alignedStrategicPlan) errs.alignedStrategicPlan = 'Select alignment with strategic plan'
    if (!form.outcome) errs.outcome = 'Select outcome'
    if (!form.endUserComments.trim()) errs.endUserComments = 'End user comments are required'
    if (!form.itemServiceDescription.trim()) errs.itemServiceDescription = 'Item/service description is required'
    if (!form.totalEstimatedValue.trim()) errs.totalEstimatedValue = 'Total estimated value is required'
    if (!form.prExpectedValue2026.trim()) errs.prExpectedValue2026 = 'PR expected value is required'
    if (!form.expectedContractDuration.trim()) errs.expectedContractDuration = 'Expected contract duration is required'
    if (!form.plannedPrCreationDate) errs.plannedPrCreationDate = 'Planned PR creation date is required'
    if (!form.expectedAwardingDate) errs.expectedAwardingDate = 'Expected awarding date is required'

    const dateErrors = getDateRangeErrors(form, activityPlannedStartDate, activityPlannedEndDate)
    const nextErrors = { ...errs, ...dateErrors }

    setFormErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function validateExecution(): boolean {
    const errs: ExecutionProcurementFormErrors = {}

    if (!executionForm.tenderRequired) errs.tenderRequired = 'Select whether tender is required.'
    if (isExecutionTenderRequired && !executionForm.tenderType) errs.tenderType = 'Select tender type.'
    if (executionProcurementStatusOptions.length > 0 && !executionForm.procurementStatus) {
      errs.procurementStatus = 'Select procurement status.'
    }

    if (shouldShowExecutionRaisedFields) {
      if (!executionForm.stageUpdateDate) errs.stageUpdateDate = 'Select stage update date.'
      if (shouldShowAttachContract && !executionForm.attachContractFile) {
        errs.attachContractFile = 'Attach contract file.'
      }
    }

    setExecutionFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave() {
    if (!projectId) {
      setProcurementError('Activity id is missing from the edit URL.')
      return
    }

    if (isFutureQuarterLocked) {
      setProcurementError('This procurement is scheduled for a future quarter. Execution updates are locked until that quarter starts.')
      return
    }

    const isExecutionOnlySave = isExecutionPhase && isReadOnly && canEditExecutionSection

    if (isExecutionOnlySave) {
      if (!validateExecution()) return
    } else {
      if (isReadOnly) return
      if (!validate()) return
    }

    setIsSavingProcurement(true)
    setProcurementError('')
    setProcurementNotice('')

    try {
      if (isExecutionOnlySave) {
        const projectResult = await Dga_aop_projectsesService.get(projectId, {
          select: ['dga_project_related_changes'],
        })
        assertOperationSuccess(projectResult, 'Unable to load activity change tracking.')

        const existingRelatedChanges = parseProjectRelatedChanges(projectResult.data?.dga_project_related_changes)
        const nextRelatedChanges = JSON.stringify(mergeProjectRelatedChanges(
          existingRelatedChanges,
          buildExecutionProcurementRelatedChanges(editingProcurement, executionForm),
        ))

        const result = await Dga_aop_projectsesService.update(projectId, {
          dga_project_related_changes: nextRelatedChanges,
        } as Partial<Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid'>>)
        assertOperationSuccess(result, 'Unable to update procurement execution tracking.')

        setProcurementNotice('Procurement execution tracking updated successfully.')
        setLocalProjectRelatedChanges({ projectId, value: nextRelatedChanges })
        onProjectRelatedChangesChange?.(nextRelatedChanges)
        handleCloseDrawer()
        return
      }

      if (editingProcurement) {
        const result = await Dga_procurement_plansService.update(
          editingProcurement.id,
          buildProcurementPayload(form) as Partial<Omit<Dga_procurement_plansBase, 'dga_procurement_planid'>>,
        )
        assertOperationSuccess(result, 'Unable to update procurement plan.')
        setProcurementNotice('Procurement plan updated successfully.')
      } else {
        const result = await Dga_procurement_plansService.create(
          buildProcurementPayload(form, projectId) as Omit<Dga_procurement_plansBase, 'dga_procurement_planid'>,
        )
        assertOperationSuccess(result, 'Unable to create procurement plan.')
        setProcurementNotice('Procurement plan created successfully.')
      }

      handleCloseDrawer()
      await loadProcurements()
      onActivityDataChanged?.()
    } catch (error) {
      setProcurementError(error instanceof Error ? error.message : 'Unable to save procurement plan.')
    } finally {
      setIsSavingProcurement(false)
    }
  }

  async function handleConfirmDelete() {
    if (isReadOnly) return
    if (!procurementToDelete) return
    if (isDeletingProcurement) return

    setIsDeletingProcurement(true)
    setProcurementError('')
    setProcurementNotice('')

    try {
      await Dga_procurement_plansService.delete(procurementToDelete.id)
      setProcurementToDelete(null)
      setProcurementNotice('Procurement plan deleted successfully.')
      await loadProcurements()
      onActivityDataChanged?.()
    } catch (error) {
      setProcurementError(error instanceof Error ? error.message : 'Unable to delete procurement plan.')
    } finally {
      setIsDeletingProcurement(false)
    }
  }

  // ── Render helpers ──

  function renderDrawerForm() {
    const title = editingProcurement ? 'Edit Procurement' : 'Create Procurement'
    const isDrawerReadOnly = isReadOnly || isFutureQuarterLocked
    const canSaveProcurement = isExecutionPhase ? canEditExecutionSection : !isReadOnly

    return (
      <SideDrawer
        actions={
          <div className="edit-activity__procurement-drawer-actions">
            <Button onClick={handleCloseDrawer} variant="secondary">
              Cancel
            </Button>
            <Button disabled={!canSaveProcurement || isSavingProcurement} onClick={handleSave}>
              {isSavingProcurement ? 'Saving...' : editingProcurement ? 'Update Procurement' : 'Create Procurement'}
            </Button>
          </div>
        }
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        title={title}
      >
        <div className="edit-activity__procurement-drawer">
          {isFutureQuarterLocked ? (
            <div className="create-activity__notice create-activity__notice--warning">
              This procurement is scheduled for a future quarter. You can review the details now, but execution updates will be enabled when that quarter starts.
            </div>
          ) : null}

          {lookupError ? (
            <div className="edit-activity__members-modal-error">
              {lookupError}
            </div>
          ) : null}

          {/* ── Tender Information ── */}
          {!isExecutionPhase ? (
            <div className="edit-activity__procurement-section">
              <div className="create-activity__section-header">
                <div className="create-activity__section-header-inner">
                  <span className="create-activity__section-header-icon" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </span>
                  <div>
                    <span>Tender Information</span>
                    <h2>Tender & Status</h2>
                  </div>
                </div>
              </div>

              <div className="edit-activity__procurement-drawer-section">
                <RadioGroup
                  className="radio-group--tender-required"
                  disabled={isDrawerReadOnly}
                  error={formErrors.tenderRequired}
                  label="Tender Required"
                  name={`${uid}-tender-required`}
                  onChange={(value) => handleFieldChange({ tenderRequired: value as TenderRequiredValue })}
                  options={TENDER_REQUIRED_OPTIONS}
                  required
                  value={form.tenderRequired}
                />

                {isTenderRequired && (
                  <RadioGroup
                    className="radio-group--tender-type"
                    disabled={isDrawerReadOnly}
                    error={formErrors.tenderType}
                    label="Tender Type"
                    name={`${uid}-tender-type`}
                    onChange={(value) => handleFieldChange({ tenderType: value as TenderTypeValue })}
                    options={TENDER_TYPE_OPTIONS}
                    required
                    value={form.tenderType}
                  />
                )}

                {procurementStatusOptions.length > 0 && (
                  <RadioGroup
                    className="create-activity__radio--status"
                    disabled={isDrawerReadOnly}
                    error={formErrors.procurementStatus}
                    label="Procurement Status"
                    name={`${uid}-procurement-status`}
                    onChange={(value) => handleFieldChange({ procurementStatus: value })}
                    options={procurementStatusOptions}
                    required
                    value={form.procurementStatus}
                  />
                )}
              </div>
            </div>
          ) : null}

          {isExecutionPhase ? (
            <div className="edit-activity__procurement-section edit-activity__procurement-section--execution">
              <div className="create-activity__section-header">
                <div className="create-activity__section-header-inner">
                  <span className="create-activity__section-header-icon" aria-hidden="true">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 11l3 3L22 4" />
                      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                    </svg>
                  </span>
                  <div>
                    <span>Execution Tracking</span>
                    <h2>Tender & Contract Updates</h2>
                  </div>
                </div>
              </div>

              <div className="edit-activity__procurement-drawer-section">
                <RadioGroup
                  className="radio-group--tender-required"
                  disabled={!canEditExecutionSection}
                  error={executionFormErrors.tenderRequired}
                  label="Tender Required"
                  name={`${uid}-execution-tender-required`}
                  onChange={(value) => handleExecutionFieldChange({ tenderRequired: value as TenderRequiredValue })}
                  options={TENDER_REQUIRED_OPTIONS}
                  required
                  value={executionForm.tenderRequired}
                />

                {isExecutionTenderRequired ? (
                  <RadioGroup
                    className="radio-group--tender-type"
                    disabled={!canEditExecutionSection}
                    error={executionFormErrors.tenderType}
                    label="Tender Type"
                    name={`${uid}-execution-tender-type`}
                    onChange={(value) => handleExecutionFieldChange({ tenderType: value as TenderTypeValue })}
                    options={TENDER_TYPE_OPTIONS}
                    required
                    value={executionForm.tenderType}
                  />
                ) : null}

                {executionProcurementStatusOptions.length > 0 ? (
                  <RadioGroup
                    className="create-activity__radio--status"
                    disabled={!canEditExecutionSection}
                    error={executionFormErrors.procurementStatus}
                    label="Procurement Status"
                    name={`${uid}-execution-procurement-status`}
                    onChange={(value) => handleExecutionFieldChange({ procurementStatus: value })}
                    options={executionProcurementStatusOptions}
                    required
                    value={executionForm.procurementStatus}
                  />
                ) : null}

                {shouldShowExecutionRaisedFields ? (
                  <>
                    <div className="create-activity__form-row create-activity__form-row--two">
                      <Input
                        disabled={!canEditExecutionSection}
                        error={executionFormErrors.prTicketNumber}
                        label="PR / Ticket Number"
                        onChange={(event) => handleExecutionFieldChange({ prTicketNumber: event.target.value })}
                        value={executionForm.prTicketNumber}
                      />
                      <CurrencyInput
                        disabled={!canEditExecutionSection}
                        error={executionFormErrors.actualContractValue}
                        label="Actual Contract Value"
                        onBlur={handleExecutionCurrencyBlur}
                        onChange={(event) => handleExecutionFieldChange({ actualContractValue: event.target.value.replace(/,/g, '') })}
                        value={executionForm.actualContractValue}
                      />
                    </div>

                    <Input
                      disabled={!canEditExecutionSection}
                      error={executionFormErrors.actualContractDuration}
                      hint="Enter duration in months"
                      label="Actual Contract Duration"
                      onBlur={handleExecutionDurationBlur}
                      onChange={(event) => handleExecutionFieldChange({ actualContractDuration: event.target.value.replace(/\D/g, '') })}
                      onFocus={() => {
                        const raw = executionForm.actualContractDuration.replace(/\s*Month(s?)$/i, '').replace(/\D/g, '')
                        if (raw !== executionForm.actualContractDuration) {
                          handleExecutionFieldChange({ actualContractDuration: raw })
                        }
                      }}
                      value={executionForm.actualContractDuration}
                    />

                    <DatePicker
                      disabled={!canEditExecutionSection}
                      error={executionFormErrors.stageUpdateDate}
                      id={`${uid}-execution-stage-update-date`}
                      label="Stage Update Date"
                      onChange={(value) => handleExecutionFieldChange({ stageUpdateDate: value })}
                      required
                      value={executionForm.stageUpdateDate}
                    />

                    <Textarea
                      disabled={!canEditExecutionSection}
                      error={executionFormErrors.progressUpdate}
                      label="Progress Update"
                      onChange={(event) => handleExecutionFieldChange({ progressUpdate: event.target.value })}
                      rows={3}
                      value={executionForm.progressUpdate}
                    />

                    {shouldShowAttachContract ? (
                      <div className={`field ${!canEditExecutionSection ? 'field--disabled' : ''}`}>
                        <span className="field__label">Attach Contract</span>
                        <input
                          className="edit-activity__file-upload-input"
                          disabled={!canEditExecutionSection}
                          onChange={(event) => handleExecutionFileChange(event.target.files?.[0] ?? null)}
                          ref={executionFileInputRef}
                          type="file"
                        />
                        <button
                          className={`edit-activity__file-upload ${executionForm.attachContractFile ? 'edit-activity__file-upload--has-file' : ''}`}
                          disabled={!canEditExecutionSection}
                          onClick={() => executionFileInputRef.current?.click()}
                          type="button"
                        >
                          <span className="edit-activity__file-upload-icon" aria-hidden="true">
                            <Upload size={18} />
                          </span>
                          <span className="edit-activity__file-upload-copy">
                            <strong>{executionForm.attachContractFile ? 'Contract selected' : 'Upload contract file'}</strong>
                            <span>{executionForm.attachContractFile ? 'You can replace it before saving later.' : 'Static UI only for now. File will not be uploaded yet.'}</span>
                          </span>
                          <span className="edit-activity__file-upload-action">
                            {executionForm.attachContractFile ? 'Replace file' : 'Choose file'}
                          </span>
                        </button>

                        {executionForm.attachContractFile ? (
                          <div className="edit-activity__file-upload-meta">
                            <span className="edit-activity__file-upload-file">
                              <strong>{executionForm.attachContractFile.name}</strong>
                              <span>{formatFileSize(executionForm.attachContractFile.size)}</span>
                            </span>
                            {canEditExecutionSection ? (
                              <button
                                aria-label="Remove selected contract"
                                className="edit-activity__file-upload-remove"
                                onClick={handleRemoveExecutionFile}
                                type="button"
                              >
                                <X size={14} />
                              </button>
                            ) : null}
                          </div>
                        ) : null}

                        {executionFormErrors.attachContractFile ? <span className="field__error">{executionFormErrors.attachContractFile}</span> : null}
                      </div>
                    ) : null}
                  </>
                ) : null}

                {isExecutionTenderNotRaised ? (
                  <>
                    <DatePicker
                      disabled={!canEditExecutionSection}
                      error={executionFormErrors.justificationDate}
                      id={`${uid}-execution-justification-date`}
                      label="Justification Date"
                      onChange={(value) => handleExecutionFieldChange({ justificationDate: value })}
                      value={executionForm.justificationDate}
                    />

                    <Textarea
                      disabled={!canEditExecutionSection}
                      error={executionFormErrors.justification}
                      label="Justification"
                      onChange={(event) => handleExecutionFieldChange({ justification: event.target.value })}
                      rows={3}
                      value={executionForm.justification}
                    />
                  </>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* ── Procurement Details ── */}
          <div className="edit-activity__procurement-section">
            <div className="create-activity__section-header">
              <div className="create-activity__section-header-inner">
                <span className="create-activity__section-header-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                  </svg>
                </span>
                <div>
                  <span>Procurement Details</span>
                  <h2>Procurement Information</h2>
                </div>
              </div>
            </div>

            <div className="edit-activity__procurement-drawer-section">
            <Input
              disabled={isDrawerReadOnly}
              error={formErrors.procurementName}
              label="Procurement Name"
              onChange={(e) => handleFieldChange({ procurementName: e.target.value })}
              required
              value={form.procurementName}
            />

            <Select
              disabled={isDrawerReadOnly}
              error={formErrors.requestType}
              id={`${uid}-request-type`}
              label="Request Type"
              onChange={(value) => handleFieldChange({ requestType: value as RequestTypeValue })}
              options={REQUEST_TYPE_OPTIONS}
              required
              value={form.requestType}
            />

            <div className="create-activity__form-row create-activity__form-row--two">
              <Input
                disabled={isDrawerReadOnly}
                label="Contract Number (if applicable)"
                onChange={(e) => handleFieldChange({ contractNumber: e.target.value })}
                value={form.contractNumber}
              />
              <Input
                disabled={isDrawerReadOnly}
                label="Recommended Suppliers"
                onChange={(e) => handleFieldChange({ recommendedSuppliers: e.target.value })}
                value={form.recommendedSuppliers}
              />
            </div>

            <div className="create-activity__form-row create-activity__form-row--two">
              <Select
                disabled={isDrawerReadOnly}
                error={formErrors.tenderingMethod}
                id={`${uid}-tendering-method`}
                label="Tendering Method"
                onChange={(value) => handleFieldChange({ tenderingMethod: value as TenderingMethodValue })}
                options={TENDERING_METHOD_OPTIONS}
                required
                value={form.tenderingMethod}
              />
              <Select
                disabled={isDrawerReadOnly}
                error={formErrors.solicitationChannel}
                id={`${uid}-solicitation-channel`}
                label="Solicitation Channel"
                onChange={(value) => handleFieldChange({ solicitationChannel: value as SolicitationChannelValue })}
                options={SOLICITATION_CHANNEL_OPTIONS}
                required
                value={form.solicitationChannel}
              />
            </div>

            <div className="create-activity__form-row create-activity__form-row--two">
              <Select
                disabled={isDrawerReadOnly}
                error={formErrors.costCenter}
                id={`${uid}-cost-center`}
                label="Cost Center"
                onChange={(value) => handleFieldChange({ costCenter: value })}
                options={costCenterOptions}
                required
                value={isSelectedCostCenterInScope ? form.costCenter : ''}
              />
              <Input
                disabled
                label="Cost Center Code"
                rightIcon={<LockKeyhole size={15} />}
                value={isSelectedCostCenterInScope ? form.costCenterCode : ''}
              />
            </div>

            <div className="create-activity__form-row create-activity__form-row--two">
              <RadioGroup
                className="radio-group--opex-capex"
                disabled={isDrawerReadOnly}
                error={formErrors.opexCapex}
                label="Opex/Capex"
                name={`${uid}-opex-capex`}
                onChange={(value) => handleFieldChange({ opexCapex: value as OpexCapexValue })}
                options={OPEX_CAPEX_OPTIONS}
                required
                value={form.opexCapex}
              />
              <RadioGroup
                className="radio-group--strategic-plan"
                disabled={isDrawerReadOnly}
                error={formErrors.alignedStrategicPlan}
                label="Aligned with Strategic Plan"
                name={`${uid}-strategic-plan`}
                onChange={(value) => handleFieldChange({ alignedStrategicPlan: value as StrategicPlanValue })}
                options={STRATEGIC_PLAN_OPTIONS}
                required
                value={form.alignedStrategicPlan}
              />
            </div>

            <RadioGroup
              className="radio-group--outcome"
              disabled={isDrawerReadOnly}
              error={formErrors.outcome}
              label="Outcome"
              name={`${uid}-outcome`}
              onChange={(value) => handleFieldChange({ outcome: value as OutcomeValue })}
              options={OUTCOME_OPTIONS}
              required
              value={form.outcome}
            />

            <div className="create-activity__form-row create-activity__form-row--two">
              <Select
                disabled={isDrawerReadOnly}
                id={`${uid}-category-description`}
                label="Category Description"
                onChange={(value) => handleFieldChange({ categoryDescription: value })}
                options={categoryOptions}
                value={form.categoryDescription}
              />
              <Input
                disabled
                label="Category Code"
                rightIcon={<LockKeyhole size={15} />}
                value={form.categoryCode}
              />
            </div>
          </div>
          </div>

          {/* ── Financial Details ── */}
          <div className="edit-activity__procurement-section">
            <div className="create-activity__section-header">
              <div className="create-activity__section-header-inner">
                <span className="create-activity__section-header-icon" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </span>
                <div>
                  <span>Financial Details</span>
                  <h2>Budget & Timeline</h2>
                </div>
              </div>
            </div>

            <div className="edit-activity__procurement-drawer-section">
              <Textarea
                disabled={isDrawerReadOnly}
                error={formErrors.endUserComments}
                label="End User Comments"
                onChange={(e) => handleFieldChange({ endUserComments: e.target.value })}
                required
                rows={3}
                value={form.endUserComments}
              />

              <Textarea
                disabled={isDrawerReadOnly}
                error={formErrors.itemServiceDescription}
                label="Item/Service Description"
                onChange={(e) => handleFieldChange({ itemServiceDescription: e.target.value })}
                required
                rows={3}
                value={form.itemServiceDescription}
              />

              <div className="create-activity__form-row create-activity__form-row--two">
                <CurrencyInput
                  disabled={isDrawerReadOnly}
                  error={formErrors.totalEstimatedValue}
                  label="Total Activity Estimated Value"
                  onBlur={() => handleCurrencyBlur('totalEstimatedValue')}
                  onChange={(e) => handleFieldChange({ totalEstimatedValue: e.target.value.replace(/,/g, '') })}
                  required
                  value={form.totalEstimatedValue}
                />
                <CurrencyInput
                  disabled={isDrawerReadOnly}
                  error={formErrors.prExpectedValue2026}
                  label="PR Expected Value in 2026"
                  onBlur={() => handleCurrencyBlur('prExpectedValue2026')}
                  onChange={(e) => handleFieldChange({ prExpectedValue2026: e.target.value.replace(/,/g, '') })}
                  required
                  value={form.prExpectedValue2026}
                />
              </div>

              <Input
                disabled={isDrawerReadOnly}
                error={formErrors.expectedContractDuration}
                hint="Duration in months"
                label="Expected Contract Duration (in months)"
                onBlur={() => {
                  const raw = form.expectedContractDuration.replace(/\s*Month(s?)$/i, '').replace(/\D/g, '')
                  if (raw && !Number.isNaN(Number(raw))) {
                    const num = Number(raw)
                    handleFieldChange({ expectedContractDuration: String(num) + (num === 1 ? ' Month' : ' Months') })
                  }
                }}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '')
                  handleFieldChange({ expectedContractDuration: val })
                }}
                onFocus={() => {
                  const raw = form.expectedContractDuration.replace(/\s*Month(s?)$/i, '').replace(/\D/g, '')
                  if (raw !== form.expectedContractDuration) {
                    handleFieldChange({ expectedContractDuration: raw })
                  }
                }}
                required
                value={form.expectedContractDuration}
              />

              <div className="create-activity__form-row create-activity__form-row--two">
                <DatePicker
                  disabled={isDrawerReadOnly}
                  error={formErrors.plannedPrCreationDate}
                  id={`${uid}-pr-creation-date`}
                  label="Planned PR Creation Date"
                  max={activityEndDate}
                  min={activityStartDate}
                  onChange={(value) => handleFieldChange({ plannedPrCreationDate: value })}
                  required
                  value={form.plannedPrCreationDate}
                />
                <Input
                  disabled
                  label="Purchase Request Raising Quarter"
                  rightIcon={<LockKeyhole size={15} />}
                  value={form.purchaseRequestRaisingQuarter}
                />
              </div>

              <div className="create-activity__form-row create-activity__form-row--two">
                <DatePicker
                  disabled={isDrawerReadOnly}
                  error={formErrors.expectedAwardingDate}
                  id={`${uid}-awarding-date`}
                  label="Expected Awarding Date"
                  max={activityEndDate}
                  min={expectedAwardingMinDate}
                  onChange={(value) => handleFieldChange({ expectedAwardingDate: value })}
                  required
                  value={form.expectedAwardingDate}
                />
                <Input
                  disabled
                  label="Expected Awarding Quarter"
                  rightIcon={<LockKeyhole size={15} />}
                  value={form.expectedAwardingQuarter}
                />
              </div>
            </div>
          </div>
        </div>
      </SideDrawer>
    )
  }

  // ── Render ──

  return (
    <div className="edit-activity__procurement">
      {/* Header */}
      <div className="edit-activity__members-header">
        <div className="edit-activity__members-header-text">
          <h2>
            Procurements
            <span className="edit-activity__members-count-badge">{procurements.length} Records</span>
          </h2>
          <p>Manage procurement requests for this activity.</p>
        </div>
        <Button icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        } disabled={isReadOnly || !projectId || isProcurementsLoading} onClick={handleOpenCreate}>
          Add Procurement
        </Button>
      </div>

      {procurementError ? (
        <div className="edit-activity__members-modal-error">
          {procurementError}
        </div>
      ) : procurementNotice ? (
        <div className="edit-activity__members-modal-selected-header">
          <span>{procurementNotice}</span>
        </div>
      ) : null}

      {/* Table */}
      {isProcurementsLoading ? (
        <div className="edit-activity__members-empty">
          <FileText size={40} strokeWidth={1.2} />
          <h3>Loading procurement plans...</h3>
          <p>Fetching procurement records for this activity.</p>
        </div>
      ) : procurements.length > 0 ? (
        <div className="data-grid">
          <table>
            <thead>
              <tr>
                {gridColumns.map((col) => (
                  <th key={col.key}>{col.header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {procurements.map((row) => (
                <tr key={row.id}>
                  {gridColumns.map((col) => (
                    <td key={col.key}>{col.render(row)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="edit-activity__members-empty">
          <FileText size={40} strokeWidth={1.2} />
          <h3>No procurement records yet</h3>
          <p>Click <strong>Add Procurement</strong> to create a procurement record.</p>
        </div>
      )}

      {/* Create/Edit Drawer */}
      {renderDrawerForm()}

      {/* Delete Confirmation */}
      <ConfirmationDialog
        confirmLabel={isDeletingProcurement ? 'Deleting...' : 'Delete Procurement'}
        danger
        description="This procurement record will be permanently removed. This action cannot be undone."
        isOpen={procurementToDelete !== null}
        onCancel={() => setProcurementToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={procurementToDelete ? `Delete "${procurementToDelete.procurementName}"?` : ''}
      />
    </div>
  )
}
