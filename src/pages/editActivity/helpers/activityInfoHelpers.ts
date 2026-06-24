import { type SelectOption } from '../../../components/ui'

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
