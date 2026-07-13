import type { Dga_aop_project_budgetsBase } from '../../../generated/models/Dga_aop_project_budgetsModel'
import type { Dga_aop_project_milestone_detailsesBase } from '../../../generated/models/Dga_aop_project_milestone_detailsesModel'
import type { Dga_aop_projectsesBase } from '../../../generated/models/Dga_aop_projectsesModel'
import type { Dga_procurement_plansBase } from '../../../generated/models/Dga_procurement_plansModel'
import { Dga_aop_project_budgetsService } from '../../../generated/services/Dga_aop_project_budgetsService'
import { Dga_aop_project_milestone_detailsesService } from '../../../generated/services/Dga_aop_project_milestone_detailsesService'
import { Dga_procurement_plansService } from '../../../generated/services/Dga_procurement_plansService'
import { assertOperationSuccess } from './activityInfoHelpers'
import {
  isEmptyRelatedValue,
  getProjectRelatedRecords,
  isPlainObject,
  normalizeProjectRelatedChangesShape,
  parseProjectRelatedChanges,
  type ProjectRelatedChange,
  type ProjectRelatedChanges,
} from './projectRelatedChanges'

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

export function approveProjectRelatedChanges(relatedChanges?: string | null) {
  return JSON.stringify(transformProjectRelatedChangesValues(
    normalizeProjectRelatedChangesShape(parseProjectRelatedChanges(relatedChanges)),
    'approve',
  ))
}

export function rejectProjectRelatedChanges(relatedChanges?: string | null) {
  return JSON.stringify(transformProjectRelatedChangesValues(
    normalizeProjectRelatedChangesShape(parseProjectRelatedChanges(relatedChanges)),
    'reject',
  ))
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

export async function persistApprovedExecutionRelatedChanges(
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

  const milestoneUpdates = getProjectRelatedRecords(parsed, 'milestones').map(async (record) => {
    const milestoneId = String(record.id ?? '')
    if (!milestoneId) return
    const payload: Partial<Omit<Dga_aop_project_milestone_detailsesBase, 'dga_aop_project_milestone_detailsid'>> = {}

    addStringField(payload, 'dga_actual_start_date', pendingRelatedValue(record, 'dga_actual_start_date'))
    addStringField(payload, 'dga_actual_end_date', pendingRelatedValue(record, 'dga_actual_end_date'))
    addNumberField(payload, 'statuscode', pendingRelatedValue(record, 'statuscode'))
    addNumberField(payload, 'dga_actual_progress', pendingRelatedValue(record, 'dga_actual_progress'))
    addStringField(payload, 'dga_cancellation_reason', pendingRelatedValue(record, 'dga_cancellation_reason'))
    addStringField(payload, 'dga_justification', pendingRelatedValue(record, 'dga_justification'))

    if (Object.keys(payload).length === 0) return

    const result = await Dga_aop_project_milestone_detailsesService.update(milestoneId, payload)
    assertOperationSuccess(result, `Failed to apply approved execution changes to milestone ${record.name ?? milestoneId}.`)
  })

  const procurementUpdates = getProjectRelatedRecords(parsed, 'procurements').map(async (record) => {
    const procurementId = String(record.id ?? '')
    if (!procurementId) return
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

    const result = await Dga_procurement_plansService.update(procurementId, payload)
    assertOperationSuccess(result, `Failed to apply approved execution changes to procurement ${record.name ?? procurementId}.`)
  })

  const budgetUpdates = getProjectRelatedRecords(parsed, 'budget').map(async (record) => {
    const monthId = String(record.id ?? '')
    if (!monthId) return
    const payload: Partial<Omit<Dga_aop_project_budgetsBase, 'dga_aop_project_budgetid'>> = {}

    addNumberField(payload, 'dga_actual_budget', pendingRelatedValue(record, 'dga_actual_budget'))
    addNumberField(payload, 'dga_delivered_amount', pendingRelatedValue(record, 'dga_delivered_amount'))

    if (Object.keys(payload).length === 0) return

    const result = await Dga_aop_project_budgetsService.update(monthId, payload)
    assertOperationSuccess(result, `Failed to apply approved execution changes to ${record.month_name ?? 'budget month'}.`)
  })

  await Promise.all([...milestoneUpdates, ...procurementUpdates, ...budgetUpdates])

  return activityPayload
}
