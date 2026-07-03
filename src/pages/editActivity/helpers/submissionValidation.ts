import type { Dga_aop_project_budgets } from '../../../generated/models/Dga_aop_project_budgetsModel'
import type { Dga_aop_projectses } from '../../../generated/models/Dga_aop_projectsesModel'
import { Dga_aop_project_budgetsService } from '../../../generated/services/Dga_aop_project_budgetsService'
import { Dga_aop_project_milestone_detailsesService } from '../../../generated/services/Dga_aop_project_milestone_detailsesService'
import { Dga_aop_projectsesService } from '../../../generated/services/Dga_aop_projectsesService'
import { Dga_dependenciesService } from '../../../generated/services/Dga_dependenciesService'
import { Dga_procurement_plansService } from '../../../generated/services/Dga_procurement_plansService'
import { MONTH_LABELS } from '../data/budgetData'
import {
  assertOperationSuccess,
  getResultValue,
  projectToActivityForm,
  validateForm,
  type ActivityForm,
  type FieldErrors,
} from './activityInfoHelpers'

export type SubmissionValidationSection =
  | 'activity-info'
  | 'objectives'
  | 'milestones'
  | 'procurements'
  | 'budget'

export type SubmissionValidationResult =
  | { valid: true }
  | { valid: false; message: string; section: SubmissionValidationSection; fieldErrors?: FieldErrors }

export type SubmissionTabLocks = {
  budget?: boolean
  milestones?: boolean
  procurements?: boolean
}

export const SUBMISSION_ACTIVITY_SELECT_FIELDS = [
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
  '_dga_project_planning_instance_value',
] as const

export function normalizeDataverseId(id?: string | null) {
  return id?.replace(/[{}]/g, '').toLowerCase() ?? ''
}

export function getResultArray<T>(result: unknown): T[] {
  const value = getResultValue<T[]>(result)

  if (Array.isArray(value)) {
    return value
  }

  if (Array.isArray(result)) {
    return result as T[]
  }

  return []
}

export function projectLookupFilter(projectId: string) {
  return `_dga_aop_project_value eq '${normalizeDataverseId(projectId)}'`
}

function normalizeMonth(value?: string | null) {
  return String(value ?? '').trim().toLowerCase()
}

function hasAllBudgetMonthRows(months: Dga_aop_project_budgets[]) {
  const monthNames = new Set(months.map((month) => normalizeMonth(month.dga_name)))
  return MONTH_LABELS.every((month) => monthNames.has(normalizeMonth(month)))
}

function isInvalidMoneyValue(value?: number | null) {
  return value == null || !Number.isFinite(Number(value)) || Number(value) < 0
}

function isInvalidMonthlyBudget(month: Dga_aop_project_budgets) {
  return !Number.isFinite(Number(month.dga_planned_budget ?? 0)) || Number(month.dga_planned_budget ?? 0) < 0
}

function isCrossYearActivity(form: ActivityForm) {
  if (!form.plannedStartDate || !form.plannedEndDate) return false
  return new Date(form.plannedStartDate).getFullYear() !== new Date(form.plannedEndDate).getFullYear()
}

function hasAllObjectiveLinks(project?: Dga_aop_projectses) {
  return Boolean(
    project?._dga_dge_corporate_strategy_pillar_value
    && project?._dga_govdigital_pillar_value
    && project?._dga_link_to_dge_strategic_objective_value
    && project?._dga_link_to_strategic_kpis_value,
  )
}

function validatePersistedBudget(project: Dga_aop_projectses | undefined, months: Dga_aop_project_budgets[], form: ActivityForm) {
  if (!project) return 'Budget information could not be loaded.'
  if (!project.dga_budget_source) return 'Select a Budget Source before submitting.'
  if (!project.dga_budget_type) return 'Select a Budget Type before submitting.'
  if (isCrossYearActivity(form) && isInvalidMoneyValue(project.dga_total_project_budget)) {
    return 'Enter Total Activity Budget before submitting.'
  }
  if (isInvalidMoneyValue(project.dga_allocated_budget)) {
    return 'Enter Allocated Budget before submitting.'
  }
  if (!String(project.dga_budget_review_comments ?? '').trim()) {
    return 'Enter Budget Review Comment before submitting.'
  }
  if (!hasAllBudgetMonthRows(months)) {
    return 'Monthly budget rows are incomplete. Please refresh after the budget plugin creates all 12 month rows.'
  }
  if (months.some(isInvalidMonthlyBudget)) {
    return 'Monthly planned budgets must be valid non-negative amounts before submitting.'
  }

  return ''
}

export async function validateActivitySubmissionRequirements(options: {
  form: ActivityForm
  projectId: string
  tabLocks: SubmissionTabLocks
}): Promise<SubmissionValidationResult> {
  const { form, projectId, tabLocks } = options

  if (!projectId) {
    return {
      valid: false,
      message: 'Activity id is missing.',
      section: 'activity-info',
    }
  }

  const activityInfoErrors = validateForm(form)
  if (Object.keys(activityInfoErrors).length > 0) {
    return {
      valid: false,
      message: 'Please complete all required Activity Information fields before submitting.',
      section: 'activity-info',
      fieldErrors: activityInfoErrors,
    }
  }

  if (form.adeoReported === '1') {
    const dependenciesResult = await Dga_dependenciesService.getAll({
      filter: projectLookupFilter(projectId),
      select: ['dga_dependencyid'],
      top: 1,
    })
    assertOperationSuccess(dependenciesResult, 'Unable to validate activity dependencies.')
    if (getResultArray(dependenciesResult).length === 0) {
      return {
        valid: false,
        message: 'At least one dependency is required because this activity is reported in ADEO.',
        section: 'activity-info',
      }
    }
  }

  const objectivesResult = await Dga_aop_projectsesService.get(projectId, {
    select: [
      '_dga_dge_corporate_strategy_pillar_value',
      '_dga_govdigital_pillar_value',
      '_dga_link_to_dge_strategic_objective_value',
      '_dga_link_to_strategic_kpis_value',
    ],
  })
  assertOperationSuccess(objectivesResult, 'Unable to validate objectives.')
  if (!hasAllObjectiveLinks(getResultValue<Dga_aop_projectses>(objectivesResult))) {
    return {
      valid: false,
      message: 'Please complete all required Objective selections before submitting.',
      section: 'objectives',
    }
  }

  if (!tabLocks.milestones) {
    const milestonesResult = await Dga_aop_project_milestone_detailsesService.getAll({
      filter: projectLookupFilter(projectId),
      select: ['dga_aop_project_milestone_detailsid'],
      top: 1,
    })
    assertOperationSuccess(milestonesResult, 'Unable to validate milestones.')
    if (getResultArray(milestonesResult).length === 0) {
      return {
        valid: false,
        message: 'At least one milestone is required before submitting.',
        section: 'milestones',
      }
    }
  }

  if (!tabLocks.procurements) {
    const procurementsResult = await Dga_procurement_plansService.getAll({
      filter: projectLookupFilter(projectId),
      select: ['dga_procurement_planid'],
      top: 1,
    })
    assertOperationSuccess(procurementsResult, 'Unable to validate procurements.')
    if (getResultArray(procurementsResult).length === 0) {
      return {
        valid: false,
        message: 'At least one procurement plan is required before submitting.',
        section: 'procurements',
      }
    }
  }

  if (!tabLocks.budget) {
    const [budgetProjectResult, budgetMonthsResult] = await Promise.all([
      Dga_aop_projectsesService.get(projectId, {
        select: [
          'dga_budget_source',
          'dga_budget_type',
          'dga_total_project_budget',
          'dga_allocated_budget',
          'dga_budget_review_comments',
        ],
      }),
      Dga_aop_project_budgetsService.getAll({
        filter: projectLookupFilter(projectId),
        select: [
          'dga_aop_project_budgetid',
          'dga_name',
          'dga_planned_budget',
        ],
      }),
    ])
    assertOperationSuccess(budgetProjectResult, 'Unable to validate budget information.')
    assertOperationSuccess(budgetMonthsResult, 'Unable to validate monthly budget rows.')

    const budgetError = validatePersistedBudget(
      getResultValue<Dga_aop_projectses>(budgetProjectResult),
      getResultArray<Dga_aop_project_budgets>(budgetMonthsResult),
      form,
    )
    if (budgetError) {
      return {
        valid: false,
        message: budgetError,
        section: 'budget',
      }
    }
  }

  return { valid: true }
}

export async function validatePersistedActivitySubmission(projectId: string): Promise<SubmissionValidationResult> {
  const activityResult = await Dga_aop_projectsesService.get(projectId, {
    select: [...SUBMISSION_ACTIVITY_SELECT_FIELDS],
  })
  assertOperationSuccess(activityResult, 'Unable to load activity information for validation.')

  const project = getResultValue<Dga_aop_projectses>(activityResult)
  if (!project) {
    return {
      valid: false,
      message: 'Activity information could not be found.',
      section: 'activity-info',
    }
  }

  const form = projectToActivityForm(project, {
    sectorId: project._dga_sector_value ?? '',
    sectorName: project._dga_sector_value ?? '',
    divisionId: project._dga_department_value ?? '',
    divisionName: project._dga_department_value ?? '',
  })

  return validateActivitySubmissionRequirements({
    form,
    projectId,
    tabLocks: {
      budget: form.budgetRequired === '0',
      milestones: form.activityClassification === '576610002',
      procurements: form.budgetRequired === '0' || form.procurementRequired === '0',
    },
  })
}
