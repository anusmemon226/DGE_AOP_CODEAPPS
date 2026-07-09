import { PowerApps_V2__Create_UpdateAOPProjectRelatedAISummaryService } from '../../../generated/services/PowerApps_V2__Create_UpdateAOPProjectRelatedAISummaryService'
import { Dga_aop_projectsesService } from '../../../generated/services/Dga_aop_projectsesService'
import { Dga_aop_project_milestone_detailsesService } from '../../../generated/services/Dga_aop_project_milestone_detailsesService'
import { Dga_aop_projects_systemusersetService } from '../../../generated/services/Dga_aop_projects_systemusersetService'
import { Dga_aop_engagement_plansService } from '../../../generated/services/Dga_aop_engagement_plansService'
import { Dga_aop_project_budgetsService } from '../../../generated/services/Dga_aop_project_budgetsService'
import { Dga_aop_project_budget_detailsesService } from '../../../generated/services/Dga_aop_project_budget_detailsesService'
import { Dga_dependenciesService } from '../../../generated/services/Dga_dependenciesService'
import { Dga_procurement_plansService } from '../../../generated/services/Dga_procurement_plansService'
import { SystemusersService } from '../../../generated/services/SystemusersService'
import { assertOperationSuccess, getResultValue } from './activityInfoHelpers'

const ACTIVITY_SNAPSHOT_SELECT_FIELDS = [
  'dga_aop_projectsid',
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
  '_dga_record_creator_value',
  '_dga_record_creator_team_value',
  '_owningteam_value',
  '_owninguser_value',
  'statecode',
  'statuscode',
  'dga_project_phase',
  'dga_project_related_changes',
  '_dga_project_planning_instance_value',
  'createdon',
  'modifiedon',
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
  '_dga_update_by_value',
  'statecode',
  'statuscode',
  '_dga_aop_project_value',
  'createdon',
  'modifiedon',
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
  '_dga_aop_project_value',
  '_dga_aop_cost_centre_value',
  '_dga_category_code_value',
  '_transactioncurrencyid_value',
  'statecode',
  'statuscode',
  'createdon',
  'modifiedon',
] as const

const ENGAGEMENT_SELECT_FIELDS = [
  'dga_aop_engagement_planid',
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
  '_dga_aop_project_value',
  '_dga_engagement_type_value',
  '_dga_sub_type_value',
  'statecode',
  'statuscode',
  'createdon',
  'modifiedon',
] as const

const DEPENDENCY_SELECT_FIELDS = [
  'dga_dependencyid',
  'dga_name',
  'dga_name_of_external_entity',
  'dga_date_of_support',
  'dga_type_of_support',
  'dga_please_check_where_applicable',
  '_dga_aop_project_value',
  'statecode',
  'statuscode',
  'createdon',
  'modifiedon',
] as const

const BUDGET_PROJECT_SELECT_FIELDS = [
  'dga_aop_projectsid',
  'dga_budget_source',
  'dga_budget_type',
  'dga_total_project_budget',
  'dga_allocated_budget',
  'dga_requested_budget',
  'dga_budget_review_comments',
] as const

const BUDGET_MONTH_SELECT_FIELDS = [
  'dga_aop_project_budgetid',
  'dga_name',
  'dga_planned_budget',
  'dga_actual_budget',
  'dga_delivered_amount',
  'dga_is_zero',
  '_dga_aop_project_value',
  '_transactioncurrencyid_value',
  'statecode',
  'statuscode',
  'createdon',
  'modifiedon',
] as const

const BUDGET_DETAIL_SELECT_FIELDS = [
  'dga_aop_project_budget_detailsid',
  'dga_name',
  'dga_amount',
  'dga_grn',
  '_dga_account_code_value',
  '_dga_aop_project_budget_value',
  '_transactioncurrencyid_value',
  'statecode',
  'statuscode',
  'createdon',
  'modifiedon',
] as const

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

  if (Array.isArray(value)) {
    return value
  }

  if (Array.isArray(result)) {
    return result as T[]
  }

  return []
}

export async function buildActivityAiSummarySnapshot(projectId: string) {
  const [
    activityResult,
    budgetProjectResult,
    membersResult,
    dependenciesResult,
    milestonesResult,
    procurementsResult,
    engagementPlansResult,
    budgetMonthsResult,
  ] = await Promise.all([
    Dga_aop_projectsesService.get(projectId, { select: [...ACTIVITY_SNAPSHOT_SELECT_FIELDS] }),
    Dga_aop_projectsesService.get(projectId, { select: [...BUDGET_PROJECT_SELECT_FIELDS] }),
    Dga_aop_projects_systemusersetService.getAll({
      select: ['dga_aop_projects_systemuserid', 'dga_aop_projectsid', 'systemuserid'],
      filter: projectMemberFilter(projectId),
    }),
    Dga_dependenciesService.getAll({
      select: [...DEPENDENCY_SELECT_FIELDS],
      filter: projectLookupFilter(projectId),
      orderBy: ['createdon desc'],
    }),
    Dga_aop_project_milestone_detailsesService.getAll({
      select: [...MILESTONE_SELECT_FIELDS],
      filter: projectLookupFilter(projectId),
      orderBy: ['dga_planned_end_date asc', 'createdon asc'],
    }),
    Dga_procurement_plansService.getAll({
      select: [...PROCUREMENT_SELECT_FIELDS],
      filter: projectLookupFilter(projectId),
      orderBy: ['createdon desc'],
    }),
    Dga_aop_engagement_plansService.getAll({
      select: [...ENGAGEMENT_SELECT_FIELDS],
      filter: projectLookupFilter(projectId),
      orderBy: ['createdon desc'],
    }),
    Dga_aop_project_budgetsService.getAll({
      select: [...BUDGET_MONTH_SELECT_FIELDS],
      filter: projectLookupFilter(projectId),
      orderBy: ['dga_name asc'],
    }),
  ])

  assertOperationSuccess(activityResult, 'Unable to load activity for AI summary.')
  assertOperationSuccess(budgetProjectResult, 'Unable to load activity budget header for AI summary.')
  assertOperationSuccess(membersResult, 'Unable to load activity members for AI summary.')
  assertOperationSuccess(dependenciesResult, 'Unable to load dependencies for AI summary.')
  assertOperationSuccess(milestonesResult, 'Unable to load milestones for AI summary.')
  assertOperationSuccess(procurementsResult, 'Unable to load procurements for AI summary.')
  assertOperationSuccess(engagementPlansResult, 'Unable to load engagement plans for AI summary.')
  assertOperationSuccess(budgetMonthsResult, 'Unable to load monthly budgets for AI summary.')

  const activity = activityResult.data
  const members = getResultArray<{ systemuserid?: string }>(membersResult)
  const memberUserIds = members
    .map((member) => normalizeId(member.systemuserid))
    .filter(Boolean)

  const memberUsers = memberUserIds.length > 0
    ? await Promise.all(memberUserIds.map(async (userId) => {
        const result = await SystemusersService.get(userId, {
          select: ['systemuserid', 'fullname', 'internalemailaddress', 'domainname'],
        })
        assertOperationSuccess(result, 'Unable to load activity member details for AI summary.')
        return result.data
      }))
    : []

  const months = getResultArray<{ dga_aop_project_budgetid?: string }>(budgetMonthsResult)
  const budgetDetailResults = await Promise.all(
    months
      .map((month) => month.dga_aop_project_budgetid)
      .filter((monthId): monthId is string => Boolean(monthId))
      .map((monthId) =>
        Dga_aop_project_budget_detailsesService.getAll({
          select: [...BUDGET_DETAIL_SELECT_FIELDS],
          filter: budgetMonthLookupFilter(monthId),
          orderBy: ['createdon asc'],
        }),
      ),
  )

  budgetDetailResults.forEach((result) => {
    assertOperationSuccess(result, 'Unable to load budget details for AI summary.')
  })

  return {
    generatedAt: new Date().toISOString(),
    projectId,
    activity,
    objectives: {
      dgaDgeCorporateStrategyPillarId: activity?._dga_dge_corporate_strategy_pillar_value ?? '',
      dgaGovdigitalPillarId: activity?._dga_govdigital_pillar_value ?? '',
      dgaStrategicObjectiveId: activity?._dga_link_to_dge_strategic_objective_value ?? '',
      dgaStrategicKpiId: activity?._dga_link_to_strategic_kpis_value ?? '',
    },
    members: {
      associations: getResultArray(membersResult),
      users: memberUsers.filter(Boolean),
    },
    dependencies: getResultArray(dependenciesResult),
    milestones: getResultArray(milestonesResult),
    procurements: getResultArray(procurementsResult),
    engagementPlans: getResultArray(engagementPlansResult),
    budget: {
      projectBudget: budgetProjectResult.data,
      months,
      details: budgetDetailResults.flatMap((result) => getResultArray(result)),
    },
    projectRelatedChanges: activity?.dga_project_related_changes ?? '',
  }
}

export async function triggerActivityAiSummaryRefresh(projectId: string) {
  const snapshot = await buildActivityAiSummarySnapshot(projectId)
  console.log('Activity AI summary snapshot payload', snapshot)

  return PowerApps_V2__Create_UpdateAOPProjectRelatedAISummaryService.Run({
    text: JSON.stringify(snapshot),
    text_1: projectId,
  })
}
