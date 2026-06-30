import { type SelectOption } from '../../../components/ui'
import type { Dga_aop_projectses, Dga_aop_projectsesBase } from '../../../generated/models/Dga_aop_projectsesModel'

// ── Form Types ──

export type ActivityTypeValue = '1' | '2' | '3' | '4'
export type ActivityScopeValue = '1' | '2'
export type StrategyValue = '576610000' | '576610001' | '576610002'
export type ClassificationValue = '576610000' | '576610001' | '576610002'
export type YesNoValue = '1' | '0'

export type ActivityForm = {
  activityName: string
  activityType: ActivityTypeValue | ''
  sectorId: string
  sectorName: string
  divisionId: string
  divisionName: string
  activityScope: ActivityScopeValue | ''
  strategies: StrategyValue[]
  activityClassification: ClassificationValue | ''
  budgetRequired: YesNoValue | ''
  procurementRequired: YesNoValue | ''
  adeoReported: YesNoValue | ''
  activityLeadId: string
  plannedStartDate: string
  plannedEndDate: string
  scopeDescription: string
  summary: string
  adeoProjectName: string
  adeoProjectDescription: string
  longTermImpact: string
  overallLongTermImpact: string
  stakeholder: string
  activityKpi: string
  activityPlan: string
  risks: string
}

export type FieldErrors = Partial<Record<keyof ActivityForm | 'submit' | 'context', string>>

export type ActivityInfoUpdatePayload = Partial<Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid' | 'dga_project_categorized_under'>> & {
  dga_project_categorized_under?: string | null
}

export type ActivityContext = {
  currentUserId: string
  currentUserName: string
  division?: { dga_divisional_hierarchyid?: string | null; dga_name?: string | null; dga_type?: number | null }
  sector?: { dga_divisional_hierarchyid?: string | null; dga_name?: string | null; dga_type?: number | null }
  planningInstance?: { dga_project_planning_instanceid?: string | null; dga_name?: string | null }
}

// ── Constants ──

export const FIELD_LABELS: Partial<Record<keyof ActivityForm, string>> = {
  activityName: 'Activity / Initiative Name',
  activityType: 'Activity Type',
  sectorName: 'Sector',
  divisionName: 'Division',
  activityScope: 'Activity Scope',
  strategies: 'Strategy Categorization',
  activityClassification: 'Activity Classification',
  budgetRequired: 'Budget requirement',
  procurementRequired: 'Procurement requirement',
  adeoReported: 'ADEO reporting',
  activityLeadId: 'Activity Lead / PM Name',
  plannedStartDate: 'Planned Start Date',
  plannedEndDate: 'Planned End Date',
  scopeDescription: 'Activity Scope Description',
  summary: 'Summary',
  adeoProjectName: 'اسم المشروع',
  adeoProjectDescription: 'وصف المشروع',
  longTermImpact: 'Long Term Impact',
  overallLongTermImpact: 'طويلة المدى / اهداف المشروع العامة',
  stakeholder: 'Stakeholder',
  activityKpi: 'Activity KPI',
  risks: 'Risks',
}

export const INITIAL_FORM: ActivityForm = {
  activityName: '',
  activityType: '',
  sectorId: '',
  sectorName: '',
  divisionId: '',
  divisionName: '',
  activityScope: '',
  strategies: [],
  activityClassification: '',
  budgetRequired: '',
  procurementRequired: '',
  adeoReported: '',
  activityLeadId: '',
  plannedStartDate: '',
  plannedEndDate: '',
  scopeDescription: '',
  summary: '',
  adeoProjectName: '',
  adeoProjectDescription: '',
  longTermImpact: '',
  overallLongTermImpact: '',
  stakeholder: '',
  activityKpi: '',
  activityPlan: '',
  risks: '',
}

export const ACTIVITY_TYPE_OPTIONS = [
  { label: 'Select activity type', value: '' },
  { label: 'New Project', value: '1', description: 'A new planned initiative for the selected cycle.' },
  { label: 'Ongoing Project', value: '2', description: 'Continuation of an existing project.' },
  { label: 'Contract Operations', value: '3', description: 'Activity managed through contract operations.' },
  { label: 'Internal Operations', value: '4', description: 'Internal operational work.' },
] as const satisfies SelectOption<ActivityTypeValue | ''>[]

export const ACTIVITY_SCOPE_OPTIONS = [
  { label: 'Select activity scope', value: '' },
  { label: 'Strategic', value: '1', description: 'Aligned to strategic outcomes.' },
  { label: 'Operational', value: '2', description: 'Division operational activity.' },
] as const satisfies SelectOption<ActivityScopeValue | ''>[]

export const STRATEGY_OPTIONS = [
  { label: 'Government of the Future Strategy', value: '576610000' },
  { label: 'DGE Corporate Strategy', value: '576610001' },
  { label: 'Abu Dhabi Government Digital Strategy', value: '576610002' },
] as const satisfies SelectOption<StrategyValue>[]

export const CLASSIFICATION_OPTIONS = [
  { label: 'Select classification', value: '' },
  { label: 'EPM Registered Project', value: '576610000' },
  { label: 'Operational Activity', value: '576610001' },
  { label: 'Payment Only', value: '576610002' },
] as const satisfies SelectOption<ClassificationValue | ''>[]

export const YES_NO_OPTIONS = [
  { label: 'Select answer', value: '' },
  { label: 'Yes', value: '1', className: 'choice--yes' },
  { label: 'No', value: '0', className: 'choice--no' },
] as const satisfies SelectOption<YesNoValue | ''>[]

// ── Helpers ──

export function getOptionLabel<TValue extends string>(options: readonly SelectOption<TValue>[], value: TValue | '') {
  return options.find((option) => option.value === value)?.label ?? ''
}

export function normalizeControlledRules(form: ActivityForm): ActivityForm {
  const nextForm = { ...form }

  if (nextForm.activityScope !== '1') {
    nextForm.strategies = []
  }

  if (nextForm.activityClassification === '576610002') {
    nextForm.budgetRequired = '1'
  }

  if (nextForm.budgetRequired === '0') {
    nextForm.procurementRequired = '0'
  }

  if (nextForm.adeoReported === '0') {
    nextForm.adeoProjectName = ''
    nextForm.adeoProjectDescription = ''
    nextForm.longTermImpact = ''
    nextForm.overallLongTermImpact = ''
    nextForm.stakeholder = ''
    nextForm.activityKpi = ''
    nextForm.activityPlan = ''
    nextForm.risks = ''
  }

  return nextForm
}

export function validateForm(form: ActivityForm) {
  const errors: FieldErrors = {}
  const requiredFields: Array<keyof ActivityForm> = [
    'activityName',
    'activityType',
    'sectorName',
    'divisionName',
    'activityScope',
    'activityClassification',
    'activityLeadId',
    'plannedStartDate',
    'plannedEndDate',
    'scopeDescription',
    'summary',
    'adeoReported',
  ]

  if (form.activityClassification !== '576610002') {
    requiredFields.push('budgetRequired')
  }

  if (form.budgetRequired !== '0') {
    requiredFields.push('procurementRequired')
  }

  if (form.adeoReported === '1') {
    requiredFields.push(
      'adeoProjectName',
      'adeoProjectDescription',
      'longTermImpact',
      'overallLongTermImpact',
      'stakeholder',
      'activityKpi',
      'risks',
    )
  }

  function requiredMessage(field: keyof ActivityForm) {
    if (field === 'activityType') return 'Select an Activity Type.'
    if (field === 'activityScope') return 'Choose Strategic or Operational Activity Scope.'
    if (field === 'activityClassification') return 'Choose an Activity Classification.'
    if (field === 'budgetRequired') return 'Select whether this project requires a budget.'
    if (field === 'procurementRequired') return 'Select whether this project requires procurement.'
    if (field === 'adeoReported') return 'Select whether this project is reported in ADEO.'
    if (field === 'activityLeadId') return 'Select an Activity Lead / PM Name.'
    if (field === 'plannedStartDate') return 'Select a Planned Start Date.'
    if (field === 'plannedEndDate') return 'Select a Planned End Date.'
    return `Enter ${FIELD_LABELS[field] ?? 'this field'}.`
  }

  requiredFields.forEach((field) => {
    if (!String(form[field] ?? '').trim()) {
      errors[field] = requiredMessage(field)
    }
  })

  if (form.activityScope === '1' && form.strategies.length === 0) {
    errors.strategies = 'Select at least one strategy for Strategic activities.'
  }

  if (form.plannedStartDate && form.plannedEndDate) {
    if (form.plannedStartDate >= form.plannedEndDate) {
      errors.plannedStartDate = 'Planned Start Date must be earlier than Planned End Date.'
      errors.plannedEndDate = 'Planned End Date must be later than Planned Start Date.'
    }
  }

  return errors
}

export function getRequiredFields(form: ActivityForm): Array<keyof ActivityForm> {
  const fields: Array<keyof ActivityForm> = [
    'activityName',
    'activityType',
    'scopeDescription',
    'summary',
    'activityScope',
    'activityClassification',
    'activityLeadId',
    'plannedStartDate',
    'plannedEndDate',
    'adeoReported',
  ]

  if (form.activityClassification !== '576610002') {
    fields.push('budgetRequired')
  }

  if (form.budgetRequired !== '0') {
    fields.push('procurementRequired')
  }

  if (form.adeoReported === '1') {
    fields.push(
      'adeoProjectName',
      'adeoProjectDescription',
      'longTermImpact',
      'overallLongTermImpact',
      'stakeholder',
      'activityKpi',
      'risks',
    )
  }

  if (form.activityScope === '1') {
    fields.push('strategies')
  }

  return fields
}

export function getRuntimeErrors(form: ActivityForm, fields: Array<keyof ActivityForm>) {
  const formErrors = validateForm(form)
  const nextErrors: FieldErrors = {}

  fields.forEach((field) => {
    if (formErrors[field]) {
      nextErrors[field] = formErrors[field]
    }
  })

  if (fields.includes('plannedStartDate') || fields.includes('plannedEndDate')) {
    if (formErrors.plannedStartDate) nextErrors.plannedStartDate = formErrors.plannedStartDate
    if (formErrors.plannedEndDate) nextErrors.plannedEndDate = formErrors.plannedEndDate
  }

  return nextErrors
}

export function getResultValue<T>(result: unknown): T | undefined {
  const shaped = result as { data?: T; value?: T; result?: T; record?: T }

  return shaped.data ?? shaped.value ?? shaped.result ?? shaped.record
}

export function getOperationErrorMessage(result: unknown, fallbackMessage: string) {
  const error = (result as { error?: { message?: string } | string })?.error
  const message = typeof error === 'string' ? error : error?.message

  if (!message) {
    return fallbackMessage
  }

  try {
    const parsed = JSON.parse(message) as { error?: { message?: string } }
    return parsed.error?.message ?? message
  } catch {
    return message
  }
}

export function assertOperationSuccess(result: unknown, fallbackMessage: string) {
  if ((result as { success?: boolean })?.success === false) {
    throw new Error(getOperationErrorMessage(result, fallbackMessage))
  }
}

export function parseStrategies(value: unknown): StrategyValue[] {
  const allowedValues = new Set(STRATEGY_OPTIONS.map((option) => option.value))
  const rawValue = Array.isArray(value) ? value.join(',') : String(value ?? '')

  return rawValue
    .split(',')
    .map((item) => item.trim())
    .filter((item): item is StrategyValue => allowedValues.has(item as StrategyValue))
}

export function serializeStrategies(strategies: StrategyValue[]) {
  return strategies.length > 0 ? strategies.join(',') : undefined
}

function toStringChoice<TValue extends string>(value: unknown, allowedValues: readonly TValue[]): TValue | '' {
  const normalized = String(value ?? '')

  return allowedValues.includes(normalized as TValue) ? normalized as TValue : ''
}

function toYesNoValue(value: unknown): YesNoValue | '' {
  return toStringChoice(value, ['1', '0'] as const)
}

function booleanToYesNo(value: boolean | null | undefined): YesNoValue | '' {
  if (value === true) return '1'
  if (value === false) return '0'
  return ''
}

function toDateOnly(value: string | null | undefined) {
  if (!value) return ''
  return value.split('T')[0] ?? ''
}

function numberOrUndefined<TValue>(value: string): TValue | undefined {
  return value ? Number(value) as TValue : undefined
}

type ActivityFormLookupFallbacks = Pick<ActivityForm, 'sectorId' | 'sectorName' | 'divisionId' | 'divisionName'>

export function projectToActivityForm(project: Dga_aop_projectses, fallbacks: ActivityFormLookupFallbacks = INITIAL_FORM): ActivityForm {
  const activityClassification = toStringChoice(project.dga_activity_classification, ['576610000', '576610001', '576610002'] as const)
  const activityScope = toStringChoice(project.dga_strategic_vs_operation, ['1', '2'] as const)

  return normalizeControlledRules({
    ...INITIAL_FORM,
    activityName: project.dga_name ?? '',
    activityType: toStringChoice(project.dga_activity_type, ['1', '2', '3', '4'] as const),
    sectorId: project._dga_sector_value ?? fallbacks.sectorId,
    sectorName: project.dga_sectorname ?? fallbacks.sectorName,
    divisionId: project._dga_department_value ?? fallbacks.divisionId,
    divisionName: project.dga_departmentname ?? fallbacks.divisionName,
    activityScope,
    strategies: parseStrategies(project.dga_project_categorized_under),
    activityClassification,
    budgetRequired: toYesNoValue(project.dga_doesthisprojectrequirebudgetallocation),
    procurementRequired: toYesNoValue(project.dga_does_this_project_require_procurement),
    adeoReported: booleanToYesNo(project.dga_adeo_review_required),
    activityLeadId: project._dga_activity_lead_value ?? '',
    plannedStartDate: toDateOnly(project.dga_planned_start_date),
    plannedEndDate: toDateOnly(project.dga_planned_end_date),
    scopeDescription: project.dga_scope ?? '',
    summary: project.dga_description_summary ?? '',
    adeoProjectName: project.dga_project_name ?? '',
    adeoProjectDescription: project.dga_project_description ?? '',
    longTermImpact: project.dga_longtermimpactprojectlongtermimpact ?? '',
    overallLongTermImpact: project.dga_project_overall_long_term_impact ?? project.dga_project_long_term_impact ?? '',
    stakeholder: project.dga_stakeholders ?? '',
    activityKpi: project.dga_project_kpi ?? '',
    activityPlan: project.dga_project_plan_if_any ?? '',
    risks: project.dga_risks ?? '',
  })
}

export function buildActivityInfoUpdatePayload(form: ActivityForm): ActivityInfoUpdatePayload {
  const normalizedForm = normalizeControlledRules(form)
  const serializedStrategies = serializeStrategies(normalizedForm.strategies)

  return {
    dga_activity_classification: numberOrUndefined<Dga_aop_projectsesBase['dga_activity_classification']>(normalizedForm.activityClassification),
    'dga_activity_lead@odata.bind': normalizedForm.activityLeadId ? `/systemusers(${normalizedForm.activityLeadId})` : undefined,
    dga_activity_type: numberOrUndefined<Dga_aop_projectsesBase['dga_activity_type']>(normalizedForm.activityType),
    dga_adeo_review_required: normalizedForm.adeoReported === '1',
    dga_description_summary: normalizedForm.summary,
    dga_does_this_project_require_procurement: numberOrUndefined<Dga_aop_projectsesBase['dga_does_this_project_require_procurement']>(normalizedForm.procurementRequired),
    dga_doesthisprojectrequirebudgetallocation: numberOrUndefined<Dga_aop_projectsesBase['dga_doesthisprojectrequirebudgetallocation']>(normalizedForm.budgetRequired),
    dga_longtermimpactprojectlongtermimpact: normalizedForm.longTermImpact,
    dga_name: normalizedForm.activityName.trim(),
    dga_planned_end_date: normalizedForm.plannedEndDate,
    dga_planned_start_date: normalizedForm.plannedStartDate,
    dga_project_categorized_under: normalizedForm.activityScope === '1' ? serializedStrategies : null,
    dga_project_description: normalizedForm.adeoProjectDescription,
    dga_project_kpi: normalizedForm.activityKpi,
    dga_project_long_term_impact: normalizedForm.overallLongTermImpact,
    dga_project_name: normalizedForm.adeoProjectName,
    dga_project_overall_long_term_impact: normalizedForm.overallLongTermImpact,
    dga_project_plan_if_any: normalizedForm.activityPlan,
    dga_registered_or_will_be_registered_in_epm: normalizedForm.activityClassification === '576610000',
    dga_risks: normalizedForm.risks,
    dga_scope: normalizedForm.scopeDescription,
    dga_stakeholders: normalizedForm.stakeholder,
    dga_strategic_vs_operation: numberOrUndefined<Dga_aop_projectsesBase['dga_strategic_vs_operation']>(normalizedForm.activityScope),
  }
}
