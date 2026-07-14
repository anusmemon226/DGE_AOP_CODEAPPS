import { PowerApps_V2__Create_UpdateAOPProjectRelatedAISummaryService } from '../../../generated/services/PowerApps_V2__Create_UpdateAOPProjectRelatedAISummaryService'
import { AccountsService } from '../../../generated/services/AccountsService'
import { Dga_account_codesService } from '../../../generated/services/Dga_account_codesService'
import { Dga_aop_cost_centersService } from '../../../generated/services/Dga_aop_cost_centersService'
import { Dga_aop_engagement_plansService } from '../../../generated/services/Dga_aop_engagement_plansService'
import { Dga_aop_project_budget_detailsesService } from '../../../generated/services/Dga_aop_project_budget_detailsesService'
import { Dga_aop_project_budgetsService } from '../../../generated/services/Dga_aop_project_budgetsService'
import { Dga_aop_project_milestone_detailsesService } from '../../../generated/services/Dga_aop_project_milestone_detailsesService'
import { Dga_aop_projectsesService } from '../../../generated/services/Dga_aop_projectsesService'
import { Dga_aop_projects_systemusersetService } from '../../../generated/services/Dga_aop_projects_systemusersetService'
import { Dga_categoriesService } from '../../../generated/services/Dga_categoriesService'
import { Dga_dependenciesService } from '../../../generated/services/Dga_dependenciesService'
import { Dga_divisional_hierarchiesService } from '../../../generated/services/Dga_divisional_hierarchiesService'
import { Dga_engagement_sub_typesService } from '../../../generated/services/Dga_engagement_sub_typesService'
import { Dga_objectivesService } from '../../../generated/services/Dga_objectivesService'
import { Dga_objective_dga_objectivesetService } from '../../../generated/services/Dga_objective_dga_objectivesetService'
import { Dga_procurement_plansService } from '../../../generated/services/Dga_procurement_plansService'
import { Dga_project_planning_instancesService } from '../../../generated/services/Dga_project_planning_instancesService'
import { SystemusersService } from '../../../generated/services/SystemusersService'
import {
  Dga_aop_engagement_plansstatuscode,
} from '../../../generated/models/Dga_aop_engagement_plansModel'
import {
  Dga_aop_project_budget_detailsesstatuscode,
} from '../../../generated/models/Dga_aop_project_budget_detailsesModel'
import {
  Dga_aop_project_budgetsstatuscode,
} from '../../../generated/models/Dga_aop_project_budgetsModel'
import {
  Dga_aop_project_milestone_detailsesstatuscode,
} from '../../../generated/models/Dga_aop_project_milestone_detailsesModel'
import {
  Dga_aop_projectsesdga_activity_classification,
  Dga_aop_projectsesdga_activity_type,
  Dga_aop_projectsesdga_budget_source,
  Dga_aop_projectsesdga_budget_type,
  Dga_aop_projectsesdga_does_this_project_require_procurement,
  Dga_aop_projectsesdga_doesthisprojectrequirebudgetallocation,
  Dga_aop_projectsesdga_opex_capex,
  Dga_aop_projectsesdga_project_activity_status,
  Dga_aop_projectsesdga_project_categorized_under,
  Dga_aop_projectsesdga_project_phase,
  Dga_aop_projectsesdga_project_type,
  Dga_aop_projectsesdga_request_type,
  Dga_aop_projectsesdga_strategic_vs_operation,
  Dga_aop_projectsesstatuscode,
} from '../../../generated/models/Dga_aop_projectsesModel'
import {
  Dga_dependenciesdga_please_check_where_applicable,
} from '../../../generated/models/Dga_dependenciesModel'
import {
  Dga_procurement_plansdga_current_procurement_status,
  Dga_procurement_plansdga_new_outcome,
  Dga_procurement_plansdga_opex_capex,
  Dga_procurement_plansdga_request_type,
  Dga_procurement_plansdga_solicitation_channel,
  Dga_procurement_plansdga_sourcing_method,
  Dga_procurement_plansdga_tender_type,
} from '../../../generated/models/Dga_procurement_plansModel'
import { assertOperationSuccess, getResultValue } from './activityInfoHelpers'
import {
  cleanRecordId,
  getProjectRelatedRecordChange,
  parseProjectRelatedChanges,
  resolveProjectRelatedValue,
} from './projectRelatedChanges'

const ACTIVITY_SELECT_FIELDS = [
  'dga_name',
  'dga_activity_type',
  'dga_activity_classification',
  'dga_strategic_vs_operation',
  'dga_project_categorized_under',
  'dga_project_type',
  'dga_request_type',
  'dga_opex_capex',
  'dga_doesthisprojectrequirebudgetallocation',
  'dga_does_this_project_require_procurement',
  'dga_adeo_review_required',
  'dga_budget',
  'dga_dependency',
  'dga_milestone',
  'dga_procurement_plan',
  'dga_new_outcome',
  'dga_outcome',
  '_dga_activity_lead_value',
  'dga_planned_start_date',
  'dga_planned_end_date',
  'dga_project_activity_status',
  'dga_justification_for_activity_status',
  'dga_cancel_reason',
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
  'dga_multi_year_project',
  'dga_is_project_start',
  'dga_is_rejected',
  'dga_rejection_reason',
  'dga_budget_reviewed',
  'dga_budget_review_comments',
  'dga_justification_for_budget',
  'dga_budget_source',
  'dga_budget_type',
  'dga_total_project_budget',
  'dga_allocated_budget',
  'dga_requested_budget',
  'dga_request_value',
  '_dga_sector_value',
  '_dga_department_value',
  '_dga_account_value',
  '_dga_dge_corporate_strategy_pillar_value',
  '_dga_govdigital_pillar_value',
  '_dga_link_to_dge_strategic_objective_value',
  '_dga_link_to_strategic_kpis_value',
  'statuscode',
  'dga_project_phase',
  'dga_project_related_changes',
  '_dga_project_planning_instance_value',
] as const

const MILESTONE_SELECT_FIELDS = [
  'dga_aop_project_milestone_detailsid',
  'dga_name',
  'dga_description',
  'dga_milestone_description',
  'dga_planned_start_date',
  'dga_planned_end_date',
  'dga_planned_progress',
  'dga_start_date',
  'dga_actual_start_date',
  'dga_actual_end_date',
  'dga_actual_progress',
  'dga_progress',
  'dga_cancellation_reason',
  'dga_justification',
  'dga_update_on',
  'dga_weightage',
  'statuscode',
] as const

const PROCUREMENT_SELECT_FIELDS = [
  'dga_procurement_planid',
  'dga_name',
  'dga_request_type',
  'dga_sourcing_method',
  'dga_solicitation_channel',
  'dga_opex_capex',
  'dga_aligned_with_strategic_plan',
  'dga_new_outcome',
  'dga_category_description',
  'dga_confirmed',
  'dga_end_user_comments',
  'dga_item_service_description',
  'dga_total_project_budget',
  'dga_pr_expected_value_2024',
  'dga_expected_contract_duration',
  'dga_purchase_request_raising_by_quarter',
  'dga_expected_awarding_by_quarter',
  'dga_purchase_request_raising_date_by_month',
  'dga_expected_awarding_date_by_month',
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
  'dga_procurement_review_comment',
  'dga_procurement_reviewed',
  '_dga_aop_cost_centre_value',
  '_dga_category_code_value',
] as const

const ENGAGEMENT_SELECT_FIELDS = [
  'dga_name',
  'dga_type_of_activity',
  'dga_start_date',
  'dga_end_date',
  'dga_notes_for_gr_team',
  'dga_notes_by_gr_team',
  'dga_adges_involved',
  'dga_selected_adges',
  'dga_ad_companies_justification',
  'dga_federal_entities_justification',
  'dga_include_aop_project',
  'dga_sector_or_division_of_createdby_user',
  'dga_sectors',
  'dga_divisions',
  '_dga_engagement_type_value',
  '_dga_sub_type_value',
  'statuscode',
] as const

const DEPENDENCY_SELECT_FIELDS = [
  'dga_name',
  'dga_name_of_external_entity',
  'dga_date_of_support',
  'dga_type_of_support',
  'dga_please_check_where_applicable',
] as const

const BUDGET_MONTH_SELECT_FIELDS = [
  'dga_aop_project_budgetid',
  'dga_name',
  'dga_planned_budget',
  'dga_actual_budget',
  'dga_delivered_amount',
  'dga_is_zero',
  'statuscode',
] as const

const BUDGET_DETAIL_SELECT_FIELDS = [
  'dga_name',
  'dga_amount',
  'dga_grn',
  '_dga_account_code_value',
  '_dga_aop_project_budget_value',
  'statuscode',
] as const

const GUID_PATTERN = /^[{(]?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}[)}]?$/i

type SnapshotObject = Record<string, unknown>
type LookupResult = { data?: unknown; success?: boolean }

function normalizeId(id?: string | null) {
  return id?.replace(/[{}]/g, '').toLowerCase() ?? ''
}

function projectLookupFilter(projectId: string) {
  return `_dga_aop_project_value eq '${normalizeId(projectId)}'`
}

function projectMemberFilter(projectId: string) {
  return `dga_aop_projectsid eq '${projectId.replace(/[{}]/g, '')}'`
}

function budgetMonthLookupFilter(monthId: string) {
  return `_dga_aop_project_budget_value eq '${normalizeId(monthId)}'`
}

function getResultArray<T>(result: unknown): T[] {
  const value = getResultValue<T[]>(result)
  return Array.isArray(value) ? value : Array.isArray(result) ? result as T[] : []
}

function choiceLabel(value: unknown, labels: Record<number, string>) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? labels[numericValue] : undefined
}

function yesNo(value: unknown) {
  if (value === true || value === 1 || value === '1') return 'Yes'
  if (value === false || value === 0 || value === '0') return 'No'
  return undefined
}

function compactSnapshot(value: unknown): unknown {
  if (value === null || value === undefined || value === '') return undefined
  if (typeof value === 'string') return GUID_PATTERN.test(value.trim()) ? undefined : value
  if (typeof value === 'number' || typeof value === 'boolean') return value

  if (Array.isArray(value)) {
    const items = value
      .map((item) => compactSnapshot(item))
      .filter((item) => item !== undefined)
    return items.length > 0 ? items : undefined
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => [key, compactSnapshot(item)] as const)
      .filter((entry) => entry[1] !== undefined)
    return entries.length > 0 ? Object.fromEntries(entries) : undefined
  }

  return undefined
}

function compactObject(value: SnapshotObject): SnapshotObject {
  return compactSnapshot(value) as SnapshotObject
}

function lookupIds(value?: string | null) {
  return String(value ?? '')
    .split(',')
    .map(normalizeId)
    .filter(Boolean)
}

async function resolveLookupLabels(
  ids: Array<string | null | undefined>,
  load: (id: string) => Promise<LookupResult>,
  getLabel: (record: Record<string, unknown>) => string | undefined,
) {
  const uniqueIds = [...new Set(ids.map(normalizeId).filter(Boolean))]
  const results = await Promise.all(uniqueIds.map(async (id) => {
    const result = await load(id)
    if (result.success === false || !result.data) {
      return [id, undefined] as const
    }

    return [id, getLabel(result.data as Record<string, unknown>)] as const
  }))

  return new Map(results.filter((entry): entry is readonly [string, string] => Boolean(entry[1])))
}

function executionValue(
  changes: ReturnType<typeof parseProjectRelatedChanges>,
  section: 'budget' | 'milestones' | 'procurements',
  recordId: string,
  fieldName: string,
  fallback: unknown,
) {
  const value = resolveProjectRelatedValue(getProjectRelatedRecordChange(changes, section, cleanRecordId(recordId), fieldName))
  return value === undefined || value === null || value === '' ? fallback : value
}

export async function buildDigitalStrategyObjectiveHierarchy() {
  const [objectivesResult, relationshipsResult] = await Promise.all([
    Dga_objectivesService.getAll({
      select: ['dga_objectiveid', 'dga_name', 'dga_objective_type'],
      filter: 'statecode eq 0 and (dga_objective_type eq 2 or dga_objective_type eq 3 or dga_objective_type eq 4)',
      orderBy: ['dga_objective_type asc', 'dga_name asc'],
    }),
    Dga_objective_dga_objectivesetService.getAll({
      select: ['dga_objectiveidone', 'dga_objectiveidtwo'],
    }),
  ])

  assertOperationSuccess(objectivesResult, 'Unable to load Digital Strategy hierarchy for AI summary.')
  assertOperationSuccess(relationshipsResult, 'Unable to load Digital Strategy relationships for AI summary.')

  const objectives = getResultArray<Record<string, unknown>>(objectivesResult)
  const objectivesById = new Map(
    objectives
      .map((objective) => [normalizeId(objective.dga_objectiveid as string), objective] as const)
      .filter(([id]) => Boolean(id)),
  )
  const relatedObjectiveIdsByPillar = new Map<string, Set<string>>()

  getResultArray<Record<string, unknown>>(relationshipsResult).forEach((relationship) => {
    const firstId = normalizeId(relationship.dga_objectiveidone as string)
    const secondId = normalizeId(relationship.dga_objectiveidtwo as string)
    const firstObjective = objectivesById.get(firstId)
    const secondObjective = objectivesById.get(secondId)

    if (Number(firstObjective?.dga_objective_type) === 3 && secondObjective) {
      const relatedIds = relatedObjectiveIdsByPillar.get(firstId) ?? new Set<string>()
      relatedIds.add(secondId)
      relatedObjectiveIdsByPillar.set(firstId, relatedIds)
    }

    if (Number(secondObjective?.dga_objective_type) === 3 && firstObjective) {
      const relatedIds = relatedObjectiveIdsByPillar.get(secondId) ?? new Set<string>()
      relatedIds.add(firstId)
      relatedObjectiveIdsByPillar.set(secondId, relatedIds)
    }
  })

  return compactObject({
    digitalStrategyPillars: objectives
      .filter((objective) => Number(objective.dga_objective_type) === 3)
      .map((pillar) => {
        const pillarId = normalizeId(pillar.dga_objectiveid as string)
        const relatedObjectives = [...(relatedObjectiveIdsByPillar.get(pillarId) ?? new Set<string>())]
          .map((id) => objectivesById.get(id))
          .filter((objective): objective is Record<string, unknown> => Boolean(objective))

        return {
          name: pillar.dga_name,
          kpis: relatedObjectives
            .filter((objective) => Number(objective.dga_objective_type) === 2)
            .map((objective) => objective.dga_name),
          objectives: relatedObjectives
            .filter((objective) => Number(objective.dga_objective_type) === 4)
            .map((objective) => objective.dga_name),
        }
      }),
  })
}

export async function buildActivityAiSummarySnapshot(projectId: string) {
  const [
    activityResult,
    membersResult,
    dependenciesResult,
    milestonesResult,
    procurementsResult,
    engagementPlansResult,
    budgetMonthsResult,
  ] = await Promise.all([
    Dga_aop_projectsesService.get(projectId, { select: [...ACTIVITY_SELECT_FIELDS] }),
    Dga_aop_projects_systemusersetService.getAll({
      select: ['systemuserid'],
      filter: projectMemberFilter(projectId),
    }),
    Dga_dependenciesService.getAll({ select: [...DEPENDENCY_SELECT_FIELDS], filter: projectLookupFilter(projectId) }),
    Dga_aop_project_milestone_detailsesService.getAll({
      select: [...MILESTONE_SELECT_FIELDS],
      filter: projectLookupFilter(projectId),
      orderBy: ['dga_planned_end_date asc'],
    }),
    Dga_procurement_plansService.getAll({ select: [...PROCUREMENT_SELECT_FIELDS], filter: projectLookupFilter(projectId) }),
    Dga_aop_engagement_plansService.getAll({ select: [...ENGAGEMENT_SELECT_FIELDS], filter: projectLookupFilter(projectId) }),
    Dga_aop_project_budgetsService.getAll({ select: [...BUDGET_MONTH_SELECT_FIELDS], filter: projectLookupFilter(projectId) }),
  ])

  assertOperationSuccess(activityResult, 'Unable to load activity for AI summary.')
  assertOperationSuccess(membersResult, 'Unable to load activity members for AI summary.')
  assertOperationSuccess(dependenciesResult, 'Unable to load dependencies for AI summary.')
  assertOperationSuccess(milestonesResult, 'Unable to load milestones for AI summary.')
  assertOperationSuccess(procurementsResult, 'Unable to load procurements for AI summary.')
  assertOperationSuccess(engagementPlansResult, 'Unable to load engagement plans for AI summary.')
  assertOperationSuccess(budgetMonthsResult, 'Unable to load monthly budgets for AI summary.')

  const activity = activityResult.data
  const milestones = getResultArray<Record<string, unknown>>(milestonesResult)
  const procurements = getResultArray<Record<string, unknown>>(procurementsResult)
  const engagementPlans = getResultArray<Record<string, unknown>>(engagementPlansResult)
  const budgetMonths = getResultArray<Record<string, unknown>>(budgetMonthsResult)
  const memberIds = getResultArray<{ systemuserid?: string }>(membersResult).map((member) => member.systemuserid)
  const isExecutionPhase = Number(activity?.dga_project_phase) === 776140001
  const relatedChanges = parseProjectRelatedChanges(activity?.dga_project_related_changes)

  const budgetDetailResults = await Promise.all(
    budgetMonths
      .map((month) => String(month.dga_aop_project_budgetid ?? ''))
      .filter(Boolean)
      .map((monthId) => Dga_aop_project_budget_detailsesService.getAll({
        select: [...BUDGET_DETAIL_SELECT_FIELDS],
        filter: budgetMonthLookupFilter(monthId),
      })),
  )
  budgetDetailResults.forEach((result) => assertOperationSuccess(result, 'Unable to load budget details for AI summary.'))
  const budgetDetails = budgetDetailResults.flatMap((result) => getResultArray<Record<string, unknown>>(result))
  const budgetDetailsByMonth = new Map<string, Record<string, unknown>[]>()

  budgetDetails.forEach((detail) => {
    const monthId = normalizeId(detail._dga_aop_project_budget_value as string)
    if (!monthId) return

    const details = budgetDetailsByMonth.get(monthId) ?? []
    details.push(detail)
    budgetDetailsByMonth.set(monthId, details)
  })

  const [costCentersResult, categoriesResult] = await Promise.all([
    Dga_aop_cost_centersService.getAll({
      select: ['dga_aop_cost_centerid', 'dga_cost_center'],
      filter: 'statecode eq 0',
    }),
    Dga_categoriesService.getAll({
      select: ['dga_categoryid', 'dga_description'],
      filter: 'statecode eq 0',
    }),
  ])
  assertOperationSuccess(costCentersResult, 'Unable to load cost center names for AI summary.')
  assertOperationSuccess(categoriesResult, 'Unable to load category descriptions for AI summary.')

  const costCenterLabels = new Map(
    getResultArray<Record<string, unknown>>(costCentersResult)
      .map((record) => [
        normalizeId(record.dga_aop_cost_centerid as string),
        String(record.dga_cost_center ?? '').trim(),
      ] as const)
      .filter(([id, label]) => Boolean(id && label)),
  )
  const categoryLabels = new Map(
    getResultArray<Record<string, unknown>>(categoriesResult)
      .map((record) => [
        normalizeId(record.dga_categoryid as string),
        String(record.dga_description ?? '').trim(),
      ] as const)
      .filter(([id, label]) => Boolean(id && label)),
  )

  const hierarchyIds = [
    activity?._dga_sector_value,
    activity?._dga_department_value,
    ...engagementPlans.flatMap((plan) => [
      ...lookupIds(plan.dga_sector_or_division_of_createdby_user as string),
      ...lookupIds(plan.dga_sectors as string),
      ...lookupIds(plan.dga_divisions as string),
    ]),
  ]
  const [
    userLabels,
    hierarchyLabels,
    objectiveLabels,
    planningInstanceLabels,
    accountLabels,
    accountCodeLabels,
    engagementTypeLabels,
  ] = await Promise.all([
    resolveLookupLabels([activity?._dga_activity_lead_value, ...memberIds], (id) => SystemusersService.get(id, {
      select: ['fullname'],
    }), (record) => record.fullname as string | undefined),
    resolveLookupLabels(hierarchyIds, (id) => Dga_divisional_hierarchiesService.get(id, {
      select: ['dga_name'],
    }), (record) => record.dga_name as string | undefined),
    resolveLookupLabels([
      activity?._dga_dge_corporate_strategy_pillar_value,
      activity?._dga_govdigital_pillar_value,
      activity?._dga_link_to_dge_strategic_objective_value,
      activity?._dga_link_to_strategic_kpis_value,
    ], (id) => Dga_objectivesService.get(id, { select: ['dga_name'] }), (record) => record.dga_name as string | undefined),
    resolveLookupLabels([activity?._dga_project_planning_instance_value], (id) => Dga_project_planning_instancesService.get(id, {
      select: ['dga_name'],
    }), (record) => record.dga_name as string | undefined),
    resolveLookupLabels([
      activity?._dga_account_value,
      ...engagementPlans.flatMap((plan) => lookupIds(plan.dga_selected_adges as string)),
    ], (id) => AccountsService.get(id, { select: ['name'] }), (record) => record.name as string | undefined),
    resolveLookupLabels(budgetDetails.map((record) => record._dga_account_code_value as string), (id) => Dga_account_codesService.get(id, {
      select: ['dga_name', 'dga_description'],
    }), (record) => String(record.dga_name ?? record.dga_description ?? '') || undefined),
    resolveLookupLabels(engagementPlans.flatMap((record) => [
      record._dga_engagement_type_value as string,
      record._dga_sub_type_value as string,
    ]), (id) => Dga_engagement_sub_typesService.get(id, { select: ['dga_name'] }), (record) => record.dga_name as string | undefined),
  ])

  const project = compactObject({
    dga_name: activity?.dga_name,
    dga_project_phase: choiceLabel(activity?.dga_project_phase, Dga_aop_projectsesdga_project_phase),
    statuscode: choiceLabel(activity?.statuscode, Dga_aop_projectsesstatuscode),
    dga_activity_type: choiceLabel(activity?.dga_activity_type, Dga_aop_projectsesdga_activity_type),
    dga_activity_classification: choiceLabel(activity?.dga_activity_classification, Dga_aop_projectsesdga_activity_classification),
    dga_strategic_vs_operation: choiceLabel(activity?.dga_strategic_vs_operation, Dga_aop_projectsesdga_strategic_vs_operation),
    dga_project_categorized_under: (activity?.dga_project_categorized_under ?? [])
      .map((value) => choiceLabel(value, Dga_aop_projectsesdga_project_categorized_under)),
    dga_project_type: choiceLabel(activity?.dga_project_type, Dga_aop_projectsesdga_project_type),
    dga_request_type: choiceLabel(activity?.dga_request_type, Dga_aop_projectsesdga_request_type),
    dga_opex_capex: choiceLabel(activity?.dga_opex_capex, Dga_aop_projectsesdga_opex_capex),
    dga_doesthisprojectrequirebudgetallocation: choiceLabel(activity?.dga_doesthisprojectrequirebudgetallocation, Dga_aop_projectsesdga_doesthisprojectrequirebudgetallocation),
    dga_does_this_project_require_procurement: choiceLabel(activity?.dga_does_this_project_require_procurement, Dga_aop_projectsesdga_does_this_project_require_procurement),
    dga_adeo_review_required: yesNo(activity?.dga_adeo_review_required),
    dga_budget: activity?.dga_budget,
    dga_dependency: activity?.dga_dependency,
    dga_milestone: activity?.dga_milestone,
    dga_procurement_plan: activity?.dga_procurement_plan,
    dga_new_outcome: activity?.dga_new_outcome,
    dga_outcome: activity?.dga_outcome,
    dga_activity_lead: userLabels.get(normalizeId(activity?._dga_activity_lead_value)),
    dga_sector: hierarchyLabels.get(normalizeId(activity?._dga_sector_value)),
    dga_department: hierarchyLabels.get(normalizeId(activity?._dga_department_value)),
    dga_account: accountLabels.get(normalizeId(activity?._dga_account_value)),
    dga_project_planning_instance: planningInstanceLabels.get(normalizeId(activity?._dga_project_planning_instance_value)),
    dga_planned_start_date: activity?.dga_planned_start_date,
    dga_planned_end_date: activity?.dga_planned_end_date,
    dga_scope: activity?.dga_scope,
    dga_description_summary: activity?.dga_description_summary,
    dga_project_name: activity?.dga_project_name,
    dga_project_description: activity?.dga_project_description,
    dga_longtermimpactprojectlongtermimpact: activity?.dga_longtermimpactprojectlongtermimpact,
    dga_project_long_term_impact: activity?.dga_project_long_term_impact,
    dga_project_overall_long_term_impact: activity?.dga_project_overall_long_term_impact,
    dga_stakeholders: activity?.dga_stakeholders,
    dga_project_kpi: activity?.dga_project_kpi,
    dga_project_plan_if_any: activity?.dga_project_plan_if_any,
    dga_risks: activity?.dga_risks,
    dga_multi_year_project: yesNo(activity?.dga_multi_year_project),
    dga_is_project_start: yesNo(activity?.dga_is_project_start),
    dga_is_rejected: yesNo(activity?.dga_is_rejected),
    dga_rejection_reason: activity?.dga_rejection_reason,
    dga_budget_source: choiceLabel(activity?.dga_budget_source, Dga_aop_projectsesdga_budget_source),
    dga_budget_type: choiceLabel(activity?.dga_budget_type, Dga_aop_projectsesdga_budget_type),
    dga_total_project_budget: activity?.dga_total_project_budget,
    dga_allocated_budget: activity?.dga_allocated_budget,
    dga_requested_budget: activity?.dga_requested_budget,
    dga_request_value: activity?.dga_request_value,
    dga_budget_reviewed: yesNo(activity?.dga_budget_reviewed),
    dga_budget_review_comments: activity?.dga_budget_review_comments,
    dga_justification_for_budget: activity?.dga_justification_for_budget,
    dga_dge_corporate_strategy_pillar: objectiveLabels.get(normalizeId(activity?._dga_dge_corporate_strategy_pillar_value)),
    dga_govdigital_pillar: objectiveLabels.get(normalizeId(activity?._dga_govdigital_pillar_value)),
    dga_link_to_dge_strategic_objective: objectiveLabels.get(normalizeId(activity?._dga_link_to_dge_strategic_objective_value)),
    dga_link_to_strategic_kpis: objectiveLabels.get(normalizeId(activity?._dga_link_to_strategic_kpis_value)),
    ...(isExecutionPhase ? {
      dga_project_activity_status: choiceLabel(activity?.dga_project_activity_status, Dga_aop_projectsesdga_project_activity_status),
      dga_justification_for_activity_status: activity?.dga_justification_for_activity_status,
      dga_cancel_reason: activity?.dga_cancel_reason,
    } : {}),
    members: memberIds.map((id) => userLabels.get(normalizeId(id))),
    dependencies: getResultArray<Record<string, unknown>>(dependenciesResult).map((dependency) => ({
      dga_name: dependency.dga_name,
      dga_name_of_external_entity: dependency.dga_name_of_external_entity,
      dga_date_of_support: dependency.dga_date_of_support,
      dga_type_of_support: dependency.dga_type_of_support,
      dga_please_check_where_applicable: choiceLabel(dependency.dga_please_check_where_applicable, Dga_dependenciesdga_please_check_where_applicable),
    })),
    milestones: milestones.map((milestone) => {
      const id = String(milestone.dga_aop_project_milestone_detailsid ?? '')
      return {
        dga_name: milestone.dga_name,
        dga_description: milestone.dga_description,
        dga_milestone_description: milestone.dga_milestone_description,
        dga_planned_start_date: milestone.dga_planned_start_date,
        dga_planned_end_date: milestone.dga_planned_end_date,
        dga_planned_progress: milestone.dga_planned_progress,
        dga_progress: milestone.dga_progress,
        dga_start_date: milestone.dga_start_date,
        dga_weightage: milestone.dga_weightage,
        ...(isExecutionPhase ? {
          dga_actual_start_date: executionValue(relatedChanges, 'milestones', id, 'dga_actual_start_date', milestone.dga_actual_start_date),
          dga_actual_end_date: executionValue(relatedChanges, 'milestones', id, 'dga_actual_end_date', milestone.dga_actual_end_date),
          dga_actual_progress: executionValue(relatedChanges, 'milestones', id, 'dga_actual_progress', milestone.dga_actual_progress),
          dga_cancellation_reason: executionValue(relatedChanges, 'milestones', id, 'dga_cancellation_reason', milestone.dga_cancellation_reason),
          dga_justification: executionValue(relatedChanges, 'milestones', id, 'dga_justification', milestone.dga_justification),
          statuscode: choiceLabel(executionValue(relatedChanges, 'milestones', id, 'statuscode', milestone.statuscode), Dga_aop_project_milestone_detailsesstatuscode),
        } : {}),
      }
    }),
    procurements: procurements.map((procurement) => {
      const id = String(procurement.dga_procurement_planid ?? '')
      return {
        dga_name: procurement.dga_name,
        dga_request_type: choiceLabel(procurement.dga_request_type, Dga_procurement_plansdga_request_type),
        dga_sourcing_method: choiceLabel(procurement.dga_sourcing_method, Dga_procurement_plansdga_sourcing_method),
        dga_solicitation_channel: choiceLabel(procurement.dga_solicitation_channel, Dga_procurement_plansdga_solicitation_channel),
        dga_opex_capex: choiceLabel(procurement.dga_opex_capex, Dga_procurement_plansdga_opex_capex),
        dga_aligned_with_strategic_plan: yesNo(procurement.dga_aligned_with_strategic_plan),
        dga_new_outcome: choiceLabel(procurement.dga_new_outcome, Dga_procurement_plansdga_new_outcome),
        dga_aop_cost_centre: costCenterLabels.get(normalizeId(procurement._dga_aop_cost_centre_value as string)),
        dga_category_description: categoryLabels.get(normalizeId(procurement._dga_category_code_value as string)),
        dga_end_user_comments: procurement.dga_end_user_comments,
        dga_item_service_description: procurement.dga_item_service_description,
        dga_total_project_budget: procurement.dga_total_project_budget,
        dga_pr_expected_value_2024: procurement.dga_pr_expected_value_2024,
        dga_expected_contract_duration: procurement.dga_expected_contract_duration,
        dga_purchase_request_raising_by_quarter: procurement.dga_purchase_request_raising_by_quarter,
        dga_expected_awarding_by_quarter: procurement.dga_expected_awarding_by_quarter,
        dga_purchase_request_raising_date_by_month: procurement.dga_purchase_request_raising_date_by_month,
        dga_expected_awarding_date_by_month: procurement.dga_expected_awarding_date_by_month,
        dga_confirmed: yesNo(procurement.dga_confirmed),
        dga_procurement_reviewed: yesNo(procurement.dga_procurement_reviewed),
        dga_procurement_review_comment: procurement.dga_procurement_review_comment,
        dga_does_this_project_require_tender: yesNo(isExecutionPhase
          ? executionValue(relatedChanges, 'procurements', id, 'dga_does_this_project_require_tender', procurement.dga_does_this_project_require_tender)
          : procurement.dga_does_this_project_require_tender),
        dga_tender_type: choiceLabel(isExecutionPhase
          ? executionValue(relatedChanges, 'procurements', id, 'dga_tender_type', procurement.dga_tender_type)
          : procurement.dga_tender_type, Dga_procurement_plansdga_tender_type),
        dga_current_procurement_status: choiceLabel(isExecutionPhase
          ? executionValue(relatedChanges, 'procurements', id, 'dga_current_procurement_status', procurement.dga_current_procurement_status)
          : procurement.dga_current_procurement_status, Dga_procurement_plansdga_current_procurement_status),
        ...(isExecutionPhase ? {
          dga_pr_ticket_number: executionValue(relatedChanges, 'procurements', id, 'dga_pr_ticket_number', procurement.dga_pr_ticket_number),
          dga_actual_contract_value: executionValue(relatedChanges, 'procurements', id, 'dga_actual_contract_value', procurement.dga_actual_contract_value),
          dga_actual_contract_duration_in_months: executionValue(relatedChanges, 'procurements', id, 'dga_actual_contract_duration_in_months', procurement.dga_actual_contract_duration_in_months),
          dga_stage_update_date: executionValue(relatedChanges, 'procurements', id, 'dga_stage_update_date', procurement.dga_stage_update_date),
          dga_progress_update: executionValue(relatedChanges, 'procurements', id, 'dga_progress_update', procurement.dga_progress_update),
          dga_justification_date: executionValue(relatedChanges, 'procurements', id, 'dga_justification_date', procurement.dga_justification_date),
          dga_justification_of_the_change: executionValue(relatedChanges, 'procurements', id, 'dga_justification_of_the_change', procurement.dga_justification_of_the_change),
        } : {}),
      }
    }),
    engagementPlans: engagementPlans.map((plan) => ({
      dga_name: plan.dga_name,
      dga_type_of_activity: plan.dga_type_of_activity,
      dga_engagement_type: engagementTypeLabels.get(normalizeId(plan._dga_engagement_type_value as string)),
      dga_sub_type: engagementTypeLabels.get(normalizeId(plan._dga_sub_type_value as string)),
      dga_start_date: plan.dga_start_date,
      dga_end_date: plan.dga_end_date,
      dga_include_aop_project: yesNo(plan.dga_include_aop_project),
      dga_adges_involved: yesNo(plan.dga_adges_involved),
      dga_selected_adges: lookupIds(plan.dga_selected_adges as string).map((id) => accountLabels.get(id)),
      dga_sector_or_division_of_createdby_user: hierarchyLabels.get(normalizeId(plan.dga_sector_or_division_of_createdby_user as string)),
      dga_sectors: lookupIds(plan.dga_sectors as string).map((id) => hierarchyLabels.get(id)),
      dga_divisions: lookupIds(plan.dga_divisions as string).map((id) => hierarchyLabels.get(id)),
      dga_notes_for_gr_team: plan.dga_notes_for_gr_team,
      dga_notes_by_gr_team: plan.dga_notes_by_gr_team,
      dga_ad_companies_justification: plan.dga_ad_companies_justification,
      dga_federal_entities_justification: plan.dga_federal_entities_justification,
      statuscode: choiceLabel(plan.statuscode, Dga_aop_engagement_plansstatuscode),
    })),
    budget: {
      dga_budget_source: choiceLabel(activity?.dga_budget_source, Dga_aop_projectsesdga_budget_source),
      dga_budget_type: choiceLabel(activity?.dga_budget_type, Dga_aop_projectsesdga_budget_type),
      dga_total_project_budget: activity?.dga_total_project_budget,
      dga_allocated_budget: activity?.dga_allocated_budget,
      dga_requested_budget: activity?.dga_requested_budget,
      dga_budget_reviewed: yesNo(activity?.dga_budget_reviewed),
      dga_budget_review_comments: activity?.dga_budget_review_comments,
      dga_justification_for_budget: activity?.dga_justification_for_budget,
      months: budgetMonths.map((month) => {
        const id = String(month.dga_aop_project_budgetid ?? '')
        const details = budgetDetailsByMonth.get(normalizeId(id)) ?? []
        return {
          dga_name: month.dga_name,
          dga_planned_budget: month.dga_planned_budget,
          dga_is_zero: yesNo(month.dga_is_zero),
          ...(isExecutionPhase ? {
            dga_actual_budget: executionValue(relatedChanges, 'budget', id, 'dga_actual_budget', month.dga_actual_budget),
            dga_delivered_amount: executionValue(relatedChanges, 'budget', id, 'dga_delivered_amount', month.dga_delivered_amount),
            statuscode: choiceLabel(executionValue(relatedChanges, 'budget', id, 'statuscode', month.statuscode), Dga_aop_project_budgetsstatuscode),
          } : {}),
          details: details.map((detail) => ({
            dga_name: detail.dga_name,
            dga_account_code: accountCodeLabels.get(normalizeId(detail._dga_account_code_value as string)),
            dga_amount: detail.dga_amount,
            dga_grn: detail.dga_grn,
            ...(isExecutionPhase ? {
              statuscode: choiceLabel(detail.statuscode, Dga_aop_project_budget_detailsesstatuscode),
            } : {}),
          })),
        }
      }),
    },
  })

  return compactObject({ project })
}

export async function triggerActivityAiSummaryRefresh(projectId: string) {
  const [snapshot, digitalStrategyHierarchy] = await Promise.all([
    buildActivityAiSummarySnapshot(projectId),
    buildDigitalStrategyObjectiveHierarchy(),
  ])
  const activityPhase = (snapshot.project as SnapshotObject | undefined)?.dga_project_phase === 'Execution'
    ? 'Execution'
    : 'Planning'

  console.log('Activity AI summary snapshot payload', snapshot)
  console.log('Activity AI summary Digital Strategy hierarchy payload', digitalStrategyHierarchy)
  console.log('Activity AI summary phase payload', activityPhase)

  return PowerApps_V2__Create_UpdateAOPProjectRelatedAISummaryService.Run({
    text: JSON.stringify(snapshot),
    text_1: projectId,
    text_2: JSON.stringify(digitalStrategyHierarchy),
    text_3: activityPhase,
  })
}
