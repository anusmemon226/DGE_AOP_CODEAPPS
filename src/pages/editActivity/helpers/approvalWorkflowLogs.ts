import {
  Dga_aop_projectsesstatuscode,
  type Dga_aop_projectsesBase,
} from '../../../generated/models/Dga_aop_projectsesModel'
import type {
  Dga_aop_project_logsesBase,
  Dga_aop_project_logsesdga_type,
} from '../../../generated/models/Dga_aop_project_logsesModel'
import { Dga_aop_project_logsesService } from '../../../generated/services/Dga_aop_project_logsesService'
import { assertOperationSuccess } from './activityInfoHelpers'

const PROJECT_UPDATES_LOG_TYPE = 776140004
export const EXECUTION_LOG_TYPES = {
  budget: 776140001,
  milestone: 776140000,
  procurement: 776140003,
  project: 776140002,
} as const

function cleanId(id?: string | null) {
  return id?.replace(/[{}]/g, '') ?? ''
}

function isEmptyLogValue(value: unknown) {
  return value == null || String(value).trim() === ''
}

function normalizeLogComparable(value: unknown) {
  if (isEmptyLogValue(value)) return ''
  return String(value).trim().replace(/\s+/g, ' ').toLowerCase()
}

export function hasMeaningfulLogChange(oldValue: unknown, newValue: unknown) {
  return normalizeLogComparable(oldValue) !== normalizeLogComparable(newValue)
    && (!isEmptyLogValue(oldValue) || !isEmptyLogValue(newValue))
}

function formatLogValue(value: unknown) {
  if (isEmptyLogValue(value)) return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

export function formatApprovalStatusLabel(statusCode?: number | null) {
  if (statusCode == null) return 'Unknown'

  const generatedLabel = (Dga_aop_projectsesstatuscode as Record<number, string>)[statusCode]
  if (!generatedLabel) return `Status ${statusCode}`

  return generatedLabel
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
}

export function formatApprovalWorkflowValue(statusCode?: number | null) {
  return formatApprovalStatusLabel(statusCode)
}

export type ApprovalWorkflowLogInput = {
  actionName: string
  newStatusCode: Dga_aop_projectsesBase['statuscode'] | number
  oldStatusCode?: Dga_aop_projectsesBase['statuscode'] | number | null
  projectId: string
}

export type ProjectLogInput = {
  logType: Dga_aop_project_logsesdga_type
  milestoneId?: string | null
  name: string
  newValue: unknown
  oldValue: unknown
  procurementId?: string | null
  projectId: string
}

export async function createProjectLog({
  logType,
  milestoneId,
  name,
  newValue,
  oldValue,
  procurementId,
  projectId,
}: ProjectLogInput) {
  const normalizedProjectId = cleanId(projectId)
  if (!normalizedProjectId) return false
  const normalizedMilestoneId = cleanId(milestoneId)
  const normalizedProcurementId = cleanId(procurementId)

  const payload: Omit<Dga_aop_project_logsesBase, 'dga_aop_project_logsid'> = {
    'dga_aop_project@odata.bind': `/dga_aop_projectses(${normalizedProjectId})`,
    ...(normalizedMilestoneId ? { 'dga_milestone@odata.bind': `/dga_aop_project_milestone_detailses(${normalizedMilestoneId})` } : {}),
    dga_name: name,
    dga_new_value: formatLogValue(newValue),
    dga_previous_value: formatLogValue(oldValue),
    ...(normalizedProcurementId ? { 'dga_procurement@odata.bind': `/dga_procurement_plans(${normalizedProcurementId})` } : {}),
    dga_type: logType,
    statuscode: 1,
  } as Omit<Dga_aop_project_logsesBase, 'dga_aop_project_logsid'>

  try {
    const result = await Dga_aop_project_logsesService.create(payload)
    assertOperationSuccess(result, 'Activity log could not be created.')
    return true
  } catch (error) {
    console.warn('Activity log creation failed:', error)
    return false
  }
}

export async function createExecutionFieldLogs(
  projectId: string,
  entries: Omit<ProjectLogInput, 'projectId'>[],
  sharedContext: Pick<ProjectLogInput, 'milestoneId' | 'procurementId'> = {},
) {
  await Promise.all(
    entries
      .filter((entry) => hasMeaningfulLogChange(entry.oldValue, entry.newValue))
      .map((entry) => createProjectLog({ ...sharedContext, ...entry, projectId })),
  )
}

export async function createApprovalWorkflowLog({
  actionName,
  newStatusCode,
  oldStatusCode,
  projectId,
}: ApprovalWorkflowLogInput) {
  return createProjectLog({
    logType: PROJECT_UPDATES_LOG_TYPE,
    name: actionName,
    newValue: formatApprovalWorkflowValue(Number(newStatusCode)),
    oldValue: formatApprovalWorkflowValue(oldStatusCode == null ? undefined : Number(oldStatusCode)),
    projectId,
  })
}
