import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Bot, Check, CheckCircle2, ClipboardList, FileText, Lightbulb, LockKeyhole, Paperclip, RefreshCcw, Save, Send, Sparkles, Trash2, UserRound, WandSparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  Badge,
  Button,
  Card,
  Checkbox,
  DatePicker,
  EmptyState,
  Input,
  RadioGroup,
  Select,
  Textarea,
  type SelectOption,
} from '../components/ui'
import { Dga_aop_projectsesService } from '../generated/services/Dga_aop_projectsesService'
import { Dga_project_planning_instancesService } from '../generated/services/Dga_project_planning_instancesService'
import { SystemusersService } from '../generated/services/SystemusersService'
import type { Dga_aop_projectsesBase, Dga_aop_projectses } from '../generated/models/Dga_aop_projectsesModel'
import type { Dga_divisional_hierarchies } from '../generated/models/Dga_divisional_hierarchiesModel'
import type { Dga_project_planning_instances } from '../generated/models/Dga_project_planning_instancesModel'
import type { Systemusers } from '../generated/models/SystemusersModel'
import { APP_ROUTE_PATHS } from '../routes/appRoutes'
import { useAppSelector } from '../store/hooks'
import type { UserRole } from '../store/userSlice'

type TabValue = 'manual' | 'copilot'
type ActivityTypeValue = '1' | '2' | '3' | '4'
type ActivityScopeValue = '1' | '2'
type StrategyValue = '576610000' | '576610001' | '576610002'
type ClassificationValue = '576610000' | '576610001' | '576610002'
type YesNoValue = '1' | '0'

type CreateActivityForm = {
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

type FieldErrors = Partial<Record<keyof CreateActivityForm | 'submit' | 'context', string>>

const FIELD_LABELS: Partial<Record<keyof CreateActivityForm, string>> = {
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

type ActivityContext = {
  currentUserId: string
  currentUserName: string
  ownerTeamId: string
  roleTeamId: string
  cycleId: string
  division: Dga_divisional_hierarchies
  sector: Dga_divisional_hierarchies
  planningInstance: Dga_project_planning_instances
}

type DgaAopProjectCreatePayload = Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid' | 'dga_project_categorized_under' | 'ownerid' | 'owneridtype'> & {
  dga_project_categorized_under?: string
  'ownerid@odata.bind': string
}

type OwnerAssignmentPayload = Partial<Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid' | 'ownerid'>> & {
  'ownerid@odata.bind': string
}

type CopilotAttachment = {
  id: string
  name: string
  size: number
  type: string
}

const INITIAL_FORM: CreateActivityForm = {
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

const ACTIVITY_TYPE_OPTIONS = [
  { label: 'Select activity type', value: '' },
  { label: 'New Project', value: '1', description: 'A new planned initiative for the selected cycle.' },
  { label: 'Ongoing Project', value: '2', description: 'Continuation of an existing project.' },
  { label: 'Contract Operations', value: '3', description: 'Activity managed through contract operations.' },
  { label: 'Internal Operations', value: '4', description: 'Internal operational work.' },
] as const satisfies SelectOption<ActivityTypeValue | ''>[]

const ACTIVITY_SCOPE_OPTIONS = [
  { label: 'Select activity scope', value: '' },
  { label: 'Strategic', value: '1', description: 'Aligned to strategic outcomes.' },
  { label: 'Operational', value: '2', description: 'Division operational activity.' },
] as const satisfies SelectOption<ActivityScopeValue | ''>[]

const STRATEGY_OPTIONS = [
  { label: 'Government of the Future Strategy', value: '576610000' },
  { label: 'DGE Corporate Strategy', value: '576610001' },
  { label: 'Abu Dhabi Government Digital Strategy', value: '576610002' },
] as const satisfies SelectOption<StrategyValue>[]

const CLASSIFICATION_OPTIONS = [
  { label: 'Select classification', value: '' },
  { label: 'EPM Registered Project', value: '576610000' },
  { label: 'Operational Activity', value: '576610001' },
  { label: 'Payment Only', value: '576610002' },
] as const satisfies SelectOption<ClassificationValue | ''>[]

const YES_NO_OPTIONS = [
  { label: 'Select answer', value: '' },
  { label: 'Yes', value: '1', className: 'choice--yes' },
  { label: 'No', value: '0', className: 'choice--no' },
] as const satisfies SelectOption<YesNoValue | ''>[]

const COPILOT_PROMPTS = [
  'New digital service initiative starting Q3',
  'Operational activity for internal process improvement',
  'Payment-only activity for existing contract',
  'What should I include for ADEO reporting?',
] as const

const MAX_ATTACHMENT_SIZE = 8 * 1024 * 1024
const ALLOWED_ATTACHMENT_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'text/plain']

function getResultValue<T>(result: unknown): T | undefined {
  const shaped = result as { data?: T; value?: T; result?: T; record?: T }

  return shaped.data ?? shaped.value ?? shaped.result ?? shaped.record
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

function getOperationErrorMessage(result: unknown, fallbackMessage: string) {
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

function assertOperationSuccess(result: unknown, fallbackMessage: string) {
  if ((result as { success?: boolean })?.success === false) {
    throw new Error(getOperationErrorMessage(result, fallbackMessage))
  }
}

function escapeODataValue(value: string) {
  return value.replace(/'/g, "''")
}

function toEntityBind(entitySetName: string, id: string) {
  return `/${entitySetName}(${id})`
}

function normalizeId(id: string | null | undefined) {
  return (id ?? '').replace(/[{}]/g, '').toLowerCase()
}

function withoutUndefined<TRecord extends Record<string, unknown>>(record: TRecord) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined)) as TRecord
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }

  return `${Math.max(1, Math.round(size / 1024))} KB`
}

function getOptionLabel<TValue extends string>(options: readonly SelectOption<TValue>[], value: TValue | '') {
  return options.find((option) => option.value === value)?.label ?? ''
}

function normalizeControlledRules(form: CreateActivityForm): CreateActivityForm {
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

function validateForm(form: CreateActivityForm) {
  const errors: FieldErrors = {}
  const requiredFields: Array<keyof CreateActivityForm> = [
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

  function requiredMessage(field: keyof CreateActivityForm) {
    if (field === 'activityType') {
      return 'Select an Activity Type.'
    }

    if (field === 'activityScope') {
      return 'Choose Strategic or Operational Activity Scope.'
    }

    if (field === 'activityClassification') {
      return 'Choose an Activity Classification.'
    }

    if (field === 'budgetRequired') {
      return 'Select whether this project requires a budget.'
    }

    if (field === 'procurementRequired') {
      return 'Select whether this project requires procurement.'
    }

    if (field === 'adeoReported') {
      return 'Select whether this project is reported in ADEO.'
    }

    if (field === 'activityLeadId') {
      return 'Select an Activity Lead / PM Name.'
    }

    if (field === 'plannedStartDate') {
      return 'Select a Planned Start Date.'
    }

    if (field === 'plannedEndDate') {
      return 'Select a Planned End Date.'
    }

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

function getRequiredFields(form: CreateActivityForm): Array<keyof CreateActivityForm> {
  const fields: Array<keyof CreateActivityForm> = [
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

function getRuntimeErrors(form: CreateActivityForm, fields: Array<keyof CreateActivityForm>) {
  const formErrors = validateForm(form)
  const nextErrors: FieldErrors = {}

  fields.forEach((field) => {
    if (formErrors[field]) {
      nextErrors[field] = formErrors[field]
    }
  })

  if (fields.includes('plannedStartDate') || fields.includes('plannedEndDate')) {
    if (formErrors.plannedStartDate) {
      nextErrors.plannedStartDate = formErrors.plannedStartDate
    }

    if (formErrors.plannedEndDate) {
      nextErrors.plannedEndDate = formErrors.plannedEndDate
    }
  }

  return nextErrors
}

function buildProjectType(activityType: ActivityTypeValue) {
  if (activityType === '1') {
    return 1
  }

  if (activityType === '2') {
    return 2
  }

  return 3
}

function serializeStrategies(strategies: StrategyValue[]) {
  return strategies.length > 0 ? strategies.join(',') : undefined
}

function buildProjectPayload(form: CreateActivityForm, context: ActivityContext): DgaAopProjectCreatePayload {
  return withoutUndefined({
    dga_activity_classification: Number(form.activityClassification) as Dga_aop_projectsesBase['dga_activity_classification'],
    'dga_activity_lead@odata.bind': toEntityBind('systemusers', form.activityLeadId),
    dga_activity_type: Number(form.activityType) as Dga_aop_projectsesBase['dga_activity_type'],
    dga_adeo_review_required: form.adeoReported === '1',
    'dga_department@odata.bind': toEntityBind('dga_divisional_hierarchies', context.division.dga_divisional_hierarchyid),
    dga_description_summary: form.summary,
    dga_does_this_project_require_procurement: form.procurementRequired
      ? Number(form.procurementRequired) as Dga_aop_projectsesBase['dga_does_this_project_require_procurement']
      : undefined,
    dga_doesthisprojectrequirebudgetallocation: form.budgetRequired
      ? Number(form.budgetRequired) as Dga_aop_projectsesBase['dga_doesthisprojectrequirebudgetallocation']
      : undefined,
    dga_longtermimpactprojectlongtermimpact: form.longTermImpact,
    dga_name: form.activityName.trim(),
    dga_planned_end_date: form.plannedEndDate,
    dga_planned_start_date: form.plannedStartDate,
    dga_project_activity_status: 776140014,
    dga_project_categorized_under: serializeStrategies(form.strategies),
    dga_project_description: form.adeoProjectDescription || form.scopeDescription,
    dga_project_kpi: form.activityKpi || undefined,
    dga_project_long_term_impact: form.overallLongTermImpact,
    dga_project_name: form.adeoProjectName || form.activityName.trim(),
    dga_project_phase: 776140000,
    dga_project_plan_if_any: form.activityPlan,
    'dga_project_planning_instance@odata.bind': toEntityBind('dga_project_planning_instances', context.planningInstance.dga_project_planning_instanceid),
    dga_project_type: buildProjectType(form.activityType as ActivityTypeValue),
    'dga_record_creator@odata.bind': toEntityBind('systemusers', context.currentUserId),
    'dga_record_creator_team@odata.bind': toEntityBind('teams', context.roleTeamId),
    dga_registered_or_will_be_registered_in_epm: form.activityClassification === '576610000',
    dga_risks: form.risks,
    dga_scope: form.scopeDescription,
    'dga_sector@odata.bind': toEntityBind('dga_divisional_hierarchies', context.sector.dga_divisional_hierarchyid),
    dga_stakeholders: form.stakeholder,
    dga_strategic_vs_operation: form.activityScope ? Number(form.activityScope) as Dga_aop_projectsesBase['dga_strategic_vs_operation'] : undefined,
    importsequencenumber: undefined,
    overriddencreatedon: undefined,
    'ownerid@odata.bind': toEntityBind('systemusers', context.currentUserId),
    statecode: 0,
    statuscode: 1,
    timezoneruleversionnumber: undefined,
    utcconversiontimezonecode: undefined,
  })
}

async function getDivisionMemberTeamId(planningInstance: Dga_project_planning_instances) {
  const existingTeamId = normalizeId(planningInstance._dga_division_member_team_value)

  if (existingTeamId) {
    return existingTeamId
  }

  if (!planningInstance.dga_project_planning_instanceid) {
    return ''
  }

  const result = await Dga_project_planning_instancesService.get(planningInstance.dga_project_planning_instanceid, {
    select: [
      'dga_project_planning_instanceid',
      '_dga_division_member_team_value',
    ],
  })
  assertOperationSuccess(result, 'Unable to load Division Member team for the planning instance.')

  return normalizeId(getResultValue<Dga_project_planning_instances>(result)?._dga_division_member_team_value)
}

async function assignActivityToDivisionMemberTeam(projectId: string, planningInstance: Dga_project_planning_instances) {
  const divisionMemberTeamId = await getDivisionMemberTeamId(planningInstance)

  if (!divisionMemberTeamId) {
    throw new Error('Division Member team could not be resolved from the current planning instance.')
  }

  const payload: OwnerAssignmentPayload = {
    'ownerid@odata.bind': toEntityBind('teams', divisionMemberTeamId),
  }

  console.log('Assign activity owner payload', payload)
  const result = await Dga_aop_projectsesService.update(projectId, payload as unknown as Partial<Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid'>>)
  assertOperationSuccess(result, 'Activity was created, but owner assignment to the Division Member team failed.')
}

function inferActivityType(prompt: string): ActivityTypeValue {
  const normalizedPrompt = prompt.toLowerCase()

  if (normalizedPrompt.includes('ongoing') || normalizedPrompt.includes('continue')) {
    return '2'
  }

  if (normalizedPrompt.includes('contract') || normalizedPrompt.includes('vendor')) {
    return '3'
  }

  if (normalizedPrompt.includes('internal') || normalizedPrompt.includes('operation')) {
    return '4'
  }

  return '1'
}

function inferActivityClassification(prompt: string): ClassificationValue {
  const normalizedPrompt = prompt.toLowerCase()

  if (normalizedPrompt.includes('payment only') || normalizedPrompt.includes('payment-only')) {
    return '576610002'
  }

  if (normalizedPrompt.includes('epm')) {
    return '576610000'
  }

  return '576610001'
}

function inferYesNo(prompt: string, yesKeywords: string[], noKeywords: string[] = []): YesNoValue {
  const normalizedPrompt = prompt.toLowerCase()

  if (noKeywords.some((keyword) => normalizedPrompt.includes(keyword))) {
    return '0'
  }

  if (yesKeywords.some((keyword) => normalizedPrompt.includes(keyword))) {
    return '1'
  }

  return '0'
}

function buildDraftFromCopilot(prompt: string, attachments: CopilotAttachment[], currentForm: CreateActivityForm) {
  const normalizedPrompt = prompt.toLowerCase()
  const firstSentence = prompt.split(/[.\n]/).find(Boolean)?.trim() ?? ''
  const fallbackName = firstSentence.length > 72 ? firstSentence.slice(0, 69).trimEnd() : firstSentence
  const attachmentSummary = attachments.length > 0
    ? ` Supporting context was attached from ${attachments.map((attachment) => attachment.name).join(', ')}.`
    : ''
  const scopeDescription = prompt || currentForm.scopeDescription
  const adeoReported = currentForm.adeoReported || inferYesNo(prompt, ['adeo', 'execution plan', 'reported'])
  const activityScope: ActivityScopeValue = currentForm.activityScope || (normalizedPrompt.includes('strateg') ? '1' : '2')
  const activityClassification = currentForm.activityClassification || inferActivityClassification(prompt)
  const budgetRequired = currentForm.budgetRequired || inferYesNo(prompt, ['budget', 'aed', 'cost', 'fund', 'payment'], ['no budget'])
  const procurementRequired = currentForm.procurementRequired || inferYesNo(prompt, ['procurement', 'contract', 'vendor', 'tender'], ['no procurement'])

  return normalizeControlledRules({
    ...currentForm,
    activityName: currentForm.activityName || fallbackName || 'AI Assisted Activity Draft',
    activityType: currentForm.activityType || inferActivityType(prompt),
    activityScope,
    strategies: activityScope === '1' ? currentForm.strategies.length > 0 ? currentForm.strategies : ['576610001'] : [],
    activityClassification,
    budgetRequired,
    procurementRequired,
    adeoReported,
    scopeDescription,
    summary: `${prompt}${attachmentSummary}`.trim() || currentForm.summary,
    adeoProjectName: adeoReported === '1' ? currentForm.adeoProjectName || fallbackName || 'ADEO Activity Draft' : '',
    adeoProjectDescription: adeoReported === '1' ? currentForm.adeoProjectDescription || scopeDescription : '',
    longTermImpact: adeoReported === '1' ? currentForm.longTermImpact || prompt : '',
    overallLongTermImpact: adeoReported === '1' ? currentForm.overallLongTermImpact || prompt : '',
    stakeholder: adeoReported === '1' ? currentForm.stakeholder || 'To be confirmed during planning review' : '',
    activityKpi: adeoReported === '1' ? currentForm.activityKpi || 'Defined during activity planning review' : '',
    risks: adeoReported === '1' ? currentForm.risks || 'To be confirmed during planning review' : '',
  })
}

function getDraftWarnings(draft: CreateActivityForm) {
  const warnings: string[] = []
  const errors = validateForm(draft)

  Object.entries(errors).forEach(([field, message]) => {
    warnings.push(`${field}: ${message}`)
  })

  if (!draft.plannedStartDate || !draft.plannedEndDate) {
    warnings.push('Dates were not inferred from the Copilot prompt. Add them before saving.')
  }

  return warnings
}

function resolveCreationContext({
  allHierarchies,
  currentRole,
  currentRoleDivisionalHierarchy,
  planningInstances,
  selectedCycle,
  systemUser,
}: {
  allHierarchies: Dga_divisional_hierarchies[]
  currentRole: UserRole | null
  currentRoleDivisionalHierarchy: { hierarchyId: string } | null
  planningInstances: Dga_project_planning_instances[]
  selectedCycle: string
  systemUser: Systemusers | null
}): ActivityContext {
  if (!selectedCycle) {
    throw new Error('Select an assessment cycle before creating an activity.')
  }

  if (!systemUser?.systemuserid) {
    throw new Error('Current system user could not be resolved.')
  }

  if (!currentRole?.teamId) {
    throw new Error('Current role team could not be resolved.')
  }

  if (!currentRoleDivisionalHierarchy?.hierarchyId) {
    throw new Error('Current role divisional hierarchy could not be resolved.')
  }

  const division = allHierarchies.find(
    (hierarchy) => normalizeId(hierarchy.dga_divisional_hierarchyid) === normalizeId(currentRoleDivisionalHierarchy.hierarchyId),
  )

  if (!division?.dga_divisional_hierarchyid) {
    throw new Error('Current division could not be resolved from the selected role.')
  }

  const sector = division._dga_parent_divisional_hierarchy_value
    ? allHierarchies.find(
      (hierarchy) => normalizeId(hierarchy.dga_divisional_hierarchyid) === normalizeId(division._dga_parent_divisional_hierarchy_value),
    )
    : undefined

  if (!sector?.dga_divisional_hierarchyid) {
    throw new Error('Current sector could not be resolved from the selected division.')
  }

  const matchingPlanningInstances = planningInstances.filter(
    (instance) =>
      normalizeId(instance._dga_assessment_cycle_value) === normalizeId(selectedCycle) &&
      normalizeId(instance._dga_divisional_hierarchy_value) === normalizeId(division.dga_divisional_hierarchyid),
  )

  if (matchingPlanningInstances.length === 0) {
    throw new Error('No planning instance was found for the selected cycle and current division.')
  }

  if (matchingPlanningInstances.length > 1) {
    throw new Error('Multiple planning instances were found for the selected cycle and current division.')
  }

  return {
    currentUserId: systemUser.systemuserid,
    currentUserName: systemUser.fullname ?? systemUser.internalemailaddress ?? 'AOP - Division Member',
    ownerTeamId: currentRole.teamId,
    roleTeamId: currentRole.teamId,
    cycleId: selectedCycle,
    division,
    sector,
    planningInstance: matchingPlanningInstances[0],
  }
}

export function CreateActivity() {
  const navigate = useNavigate()
  const {
    assessmentCycles,
    planningInstances,
    planningInstancesCycleId,
    planningInstancesError,
    planningInstancesLoading,
    selectedCycle,
  } = useAppSelector((state) => state.app)
  const {
    currentRole,
    currentRoleDivisionalHierarchy,
    divisionalHierarchies: allHierarchies,
    systemUser,
  } = useAppSelector((state) => state.user)
  const [activeTab, setActiveTab] = useState<TabValue>('copilot')
  const [form, setForm] = useState<CreateActivityForm>(INITIAL_FORM)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [context, setContext] = useState<ActivityContext | null>(null)
  const [activityLeadOptions, setActivityLeadOptions] = useState<SelectOption<string>[]>([])
  const [isContextLoading, setIsContextLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [createdProjectId, setCreatedProjectId] = useState('')
  const [creationWarning, setCreationWarning] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [copilotPrompt, setCopilotPrompt] = useState('')
  const [copilotDraft, setCopilotDraft] = useState<CreateActivityForm | null>(null)
  const [attachments, setAttachments] = useState<CopilotAttachment[]>([])
  const [attachmentError, setAttachmentError] = useState('')
  const cycle = assessmentCycles.find((item) => item.dga_assessment_cycleid === selectedCycle)
  const isStrategic = form.activityScope === '1'
  const isPaymentOnly = form.activityClassification === '576610002'
  const isBudgetNo = form.budgetRequired === '0'
  const isAdeoVisible = form.adeoReported === '1'
  const draftWarnings = useMemo(() => copilotDraft ? getDraftWarnings(copilotDraft) : [], [copilotDraft])
  const creationModeSwitch = (
    <div className="copilot-mode-switch" aria-label="Creation mode">
      <button
        className={activeTab === 'manual' ? 'copilot-mode-switch__active' : undefined}
        onClick={() => setActiveTab('manual')}
        type="button"
      >
        <FileText size={15} />
        Manual Entry
      </button>
      <button
        className={activeTab === 'copilot' ? 'copilot-mode-switch__active' : undefined}
        onClick={() => setActiveTab('copilot')}
        type="button"
      >
        <WandSparkles size={16} />
        AI Assistant
      </button>
    </div>
  )

  useEffect(() => {
    let isMounted = true

    async function loadContext() {
      setIsContextLoading(true)
      setErrors((currentErrors) => ({ ...currentErrors, context: undefined }))
      setContext(null)

      if (planningInstancesLoading || (selectedCycle && planningInstancesCycleId !== selectedCycle)) {
        return
      }

      try {
        if (planningInstancesError) {
          throw new Error(planningInstancesError)
        }

        const nextContext = resolveCreationContext({
          allHierarchies,
          currentRole,
          currentRoleDivisionalHierarchy,
          planningInstances,
          selectedCycle,
          systemUser,
        })

        const [usersResult] = await Promise.all([
          SystemusersService.getAll({
            select: ['systemuserid', 'fullname', 'internalemailaddress']
          }),
        ])

        if (!isMounted) {
          return
        }

        const users = getResultArray<Systemusers>(usersResult.data).filter((user) => !user.isdisabled)
        setContext(nextContext)
        setActivityLeadOptions(
          users.map((user) => ({
            label: user.fullname ?? user.internalemailaddress ?? 'Unnamed user',
            value: user.systemuserid,
            meta: user.internalemailaddress,
          })),
        )
        setForm({
          ...INITIAL_FORM,
          divisionId: nextContext.division.dga_divisional_hierarchyid,
          divisionName: nextContext.division.dga_name,
          sectorId: nextContext.sector.dga_divisional_hierarchyid,
          sectorName: nextContext.sector.dga_name,
        })
        setCopilotDraft(null)
        setSuccessMessage('')
        setCreationWarning('')
        setCreatedProjectId('')
      } catch (error) {
        if (!isMounted) {
          return
        }

        setErrors((currentErrors) => ({
          ...currentErrors,
          context: error instanceof Error ? error.message : 'Unable to load Create Activity context.',
        }))
      } finally {
        if (isMounted) {
          setIsContextLoading(false)
        }
      }
    }

    loadContext()

    return () => {
      isMounted = false
    }
  }, [
    allHierarchies,
    currentRole,
    currentRoleDivisionalHierarchy,
    planningInstances,
    planningInstancesCycleId,
    planningInstancesError,
    planningInstancesLoading,
    selectedCycle,
    systemUser,
  ])

  function updateForm(nextFields: Partial<CreateActivityForm>) {
    setSuccessMessage('')
    if (!createdProjectId) {
      setCreationWarning('')
    }
    const changedFields = Object.keys(nextFields) as Array<keyof CreateActivityForm>
    const normalizedForm = normalizeControlledRules({ ...form, ...nextFields })

    setForm(normalizedForm)
    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors }
      const allRuntimeErrors = validateForm(normalizedForm)
      const runtimeErrors = getRuntimeErrors(normalizedForm, changedFields)

      Object.keys(nextErrors).forEach((key) => {
        const field = key as keyof CreateActivityForm

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
        if (runtimeErrors.plannedStartDate) {
          nextErrors.plannedStartDate = runtimeErrors.plannedStartDate
        } else {
          delete nextErrors.plannedStartDate
        }

        if (runtimeErrors.plannedEndDate) {
          nextErrors.plannedEndDate = runtimeErrors.plannedEndDate
        } else {
          delete nextErrors.plannedEndDate
        }
      }

      delete nextErrors.submit

      return nextErrors
    })
  }

  function toggleStrategy(strategy: StrategyValue) {
    const nextStrategies = form.strategies.includes(strategy)
      ? form.strategies.filter((item) => item !== strategy)
      : [...form.strategies, strategy]

    updateForm({ strategies: nextStrategies })
  }

  function addAttachments(files: FileList | File[]) {
    setAttachmentError('')
    const nextAttachments: CopilotAttachment[] = []

    Array.from(files).forEach((file) => {
      if (file.size > MAX_ATTACHMENT_SIZE) {
        setAttachmentError(`${file.name} is larger than the 8 MB limit.`)
        return
      }

      if (!ALLOWED_ATTACHMENT_TYPES.includes(file.type)) {
        setAttachmentError(`${file.name} is not a supported file type.`)
        return
      }

      nextAttachments.push({
        id: `${file.name}-${file.size}-${file.lastModified}`,
        name: file.name,
        size: file.size,
        type: file.type || 'Unknown',
      })
    })

    if (nextAttachments.length > 0) {
      setAttachments((currentAttachments) => {
        const existingIds = new Set(currentAttachments.map((attachment) => attachment.id))

        return [...currentAttachments, ...nextAttachments.filter((attachment) => !existingIds.has(attachment.id))]
      })
    }
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) {
      addAttachments(event.target.files)
    }

    event.target.value = ''
  }

  function applyPromptChip(prompt: string) {
    setCopilotPrompt((currentPrompt) => currentPrompt.trim() ? `${currentPrompt.trim()}\n${prompt}` : prompt)
    setCopilotDraft(null)
  }

  function createCopilotDraft() {
    const draft = buildDraftFromCopilot(copilotPrompt, attachments, form)

    setCopilotDraft(draft)
  }

  function applyCopilotDraft() {
    if (!copilotDraft) {
      return
    }

    setForm(copilotDraft)
    setErrors({})
    setActiveTab('manual')
    setSuccessMessage('AI-assisted draft applied. Review the form and save when ready.')
  }

  function removeAttachment(attachmentId: string) {
    setAttachments((currentAttachments) => currentAttachments.filter((item) => item.id !== attachmentId))
  }

  function renderAttachmentList(className = '') {
    if (attachments.length === 0) {
      return null
    }

    return (
      <div className={className ? `copilot-attachments ${className}` : 'copilot-attachments'}>
        {attachments.map((attachment) => (
          <div className="copilot-attachment" key={attachment.id}>
            <Paperclip size={15} />
            <div>
              <strong>{attachment.name}</strong>
              <span>{formatFileSize(attachment.size)} · {attachment.type}</span>
            </div>
            <button
              aria-label={`Remove ${attachment.name}`}
              onClick={() => removeAttachment(attachment.id)}
              type="button"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
      </div>
    )
  }

  function renderGuidancePanel() {
    const requiredFields = getRequiredFields(form)
    const pendingFields = requiredFields.filter((field) => !String(form[field] ?? '').trim())
    const total = requiredFields.length
    const completedCount = total - pendingFields.length
    const percent = total > 0 ? Math.round((completedCount / total) * 100) : 0
    const isComplete = pendingFields.length === 0

    const FIELD_GROUPS: Array<{ key: string; label: string; fields: Array<keyof CreateActivityForm> }> = [
      { key: 'core', label: 'Core Details', fields: ['activityType', 'activityName', 'activityScope', 'activityClassification', 'adeoReported'] },
      { key: 'planning', label: 'Planning', fields: ['activityLeadId', 'plannedStartDate', 'plannedEndDate', 'scopeDescription', 'summary'] },
      { key: 'requirements', label: 'Requirements', fields: ['budgetRequired', 'procurementRequired'] },
      { key: 'adeo', label: 'ADEO Overview', fields: ['adeoProjectName', 'adeoProjectDescription', 'longTermImpact', 'overallLongTermImpact', 'stakeholder', 'activityKpi', 'risks'] },
    ]

    const visibleGroups = FIELD_GROUPS.filter((group) => {
      if (group.key === 'requirements' && form.activityClassification === '576610002') return false
      if (group.key === 'adeo' && form.adeoReported !== '1') return false
      return true
    })

    const ringRadius = 34
    const ringCircumference = 2 * Math.PI * ringRadius
    const ringOffset = ringCircumference - (percent / 100) * ringCircumference

    function countDone(fields: Array<keyof CreateActivityForm>) {
      return fields.filter((f) => String(form[f] ?? '').trim()).length
    }

    function getTipText() {
      if (isComplete) return 'All required fields are filled. Review your entries and save when ready.'
      if (pendingFields.length <= 2) {
        const first = FIELD_LABELS[pendingFields[0]] ?? pendingFields[0]
        return `Start with "${first}" — it's the most impactful field to fill next.`
      }
      return `Complete the ${pendingFields.length} remaining required field${pendingFields.length > 1 ? 's' : ''} to proceed with saving.`
    }

    return (
      <aside className="create-activity__guidance">
        <div className="create-activity__guidance-card">
          <div className="create-activity__guidance-inner">
            <div className="create-activity__guidance-header">
              <span className="create-activity__guidance-header-icon">
                <Bot size={16} />
              </span>
              <div className="create-activity__guidance-header-text">
                <h3>Activity Assistant</h3>
                <span>Form completion guide</span>
              </div>
            </div>

            {/* ── Circular progress ring ── */}
            <div className="create-activity__guidance-progress-wrap">
              <div className="create-activity__guidance-ring">
                <svg width="96" height="96" viewBox="0 0 96 96">
                  <defs>
                    <linearGradient gradientUnits="userSpaceOnUse" id="ringFill" x1="0" x2="96" y1="0" y2="96">
                      <stop offset="0%" stopColor="var(--color-primary)" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                    <linearGradient gradientUnits="userSpaceOnUse" id="ringFillDark" x1="0" x2="96" y1="0" y2="96">
                      <stop offset="0%" stopColor="#818cf8" />
                      <stop offset="100%" stopColor="#22d3ee" />
                    </linearGradient>
                  </defs>
                  <circle cx="48" cy="48" r={ringRadius} fill="none" stroke="var(--color-surface-muted)" strokeWidth="8" />
                  <circle
                    cx="48"
                    cy="48"
                    r={ringRadius}
                    fill="none"
                    stroke="url(#ringFill)"
                    strokeWidth="8"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                    strokeLinecap="round"
                    transform="rotate(-90 48 48)"
                    style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.4, 0, 0.2, 1)' }}
                  />
                </svg>
                <span className="create-activity__guidance-ring-value">{percent}%</span>
              </div>
              <span className="create-activity__guidance-ring-stats">
                <strong>{completedCount}</strong> of <strong>{total}</strong> required
              </span>
            </div>

            {/* ── Field groups ── */}
            {visibleGroups.map((group) => {
              const groupDone = countDone(group.fields)
              const isGroupComplete = groupDone === group.fields.length

              return (
                <div className="create-activity__guidance-section" key={group.key}>
                  <div className="create-activity__guidance-section-header">
                    <div className="create-activity__guidance-section-header-text">
                      <span className="create-activity__guidance-section-header-indicator" />
                      <span>{group.label}</span>
                    </div>
                    <span className={`create-activity__guidance-section-count ${isGroupComplete ? 'create-activity__guidance-section-count--done' : ''}`}>
                      {isGroupComplete ? `✓ ${groupDone}/${group.fields.length}` : `${groupDone}/${group.fields.length}`}
                    </span>
                  </div>
                  <div className="create-activity__guidance-field-list">
                    {group.fields.map((field) => {
                      const isDone = String(form[field] ?? '').trim()
                      return (
                        <div className={`create-activity__guidance-field ${isDone ? 'create-activity__guidance-field--done' : 'create-activity__guidance-field--pending'}`} key={field}>
                          <span className="create-activity__guidance-field-icon">
                            {isDone ? <Check size={12} strokeWidth={2.5} /> : null}
                          </span>
                          <span>{FIELD_LABELS[field] ?? field}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* ── Quick overview tags ── */}
            <div className="create-activity__guidance-tags">
              {form.activityType ? (
                <span className="create-activity__guidance-tag">
                  <span className="create-activity__guidance-tag-label">Type: </span>
                  <span className="create-activity__guidance-tag-value">{getOptionLabel(ACTIVITY_TYPE_OPTIONS, form.activityType)}</span>
                </span>
              ) : null}
              {form.activityScope ? (
                <span className="create-activity__guidance-tag">
                  <span className="create-activity__guidance-tag-label">Scope: </span>
                  <span className="create-activity__guidance-tag-value">{getOptionLabel(ACTIVITY_SCOPE_OPTIONS, form.activityScope)}</span>
                </span>
              ) : null}
              {form.activityClassification ? (
                <span className="create-activity__guidance-tag">
                  <span className="create-activity__guidance-tag-label">Class: </span>
                  <span className="create-activity__guidance-tag-value">{getOptionLabel(CLASSIFICATION_OPTIONS, form.activityClassification)}</span>
                </span>
              ) : null}
              {form.adeoReported ? (
                <span className="create-activity__guidance-tag">
                  <span className="create-activity__guidance-tag-label">ADEO: </span>
                  <span className="create-activity__guidance-tag-value">{getOptionLabel(YES_NO_OPTIONS, form.adeoReported)}</span>
                </span>
              ) : null}
            </div>

            {/* ── Contextual tip ── */}
            <div className={`create-activity__guidance-tip ${isComplete ? 'create-activity__guidance-tip--complete' : 'create-activity__guidance-tip--pending'}`}>
              <span className="create-activity__guidance-tip-icon">
                {isComplete ? <CheckCircle2 size={14} /> : <Lightbulb size={14} />}
              </span>
              <p>{getTipText()}</p>
            </div>
          </div>
        </div>
      </aside>
    )
  }

  async function validateUniqueActivityName() {
    if (!form.activityName.trim()) {
      return true
    }

    const filterParts = [`dga_name eq '${escapeODataValue(form.activityName.trim())}'`]
    const cyclePlanningInstanceIds = planningInstances
      .filter((item) => normalizeId(item._dga_assessment_cycle_value) === normalizeId(context?.cycleId))
      .map((item) => item.dga_project_planning_instanceid)
      .filter(Boolean)

    if (cyclePlanningInstanceIds.length === 0) {
      return false
    }

    filterParts.push(`(${cyclePlanningInstanceIds.map((id) => `_dga_project_planning_instance_value eq ${id}`).join(' or ')})`)

    const result = await Dga_aop_projectsesService.getAll({
      select: ['dga_aop_projectsid', 'dga_name'],
      filter: filterParts.join(' and '),
      top: 1,
    })
    const matches = getResultArray<Dga_aop_projectses>(result)

    return matches.length === 0
  }

  async function saveDraft() {
    if (isSaving) {
      return
    }

    if (createdProjectId) {
      navigate(`${APP_ROUTE_PATHS.editActivity}?id=${createdProjectId}`)
      return
    }

    setSuccessMessage('')
    setCreationWarning('')
    const nextErrors = validateForm(form)

    if (!context) {
      nextErrors.context = 'Create Activity context is not loaded.'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      setActiveTab('manual')
      return
    }

    setIsSaving(true)

    try {
      const isUnique = await validateUniqueActivityName()

      if (!isUnique) {
        setErrors({ activityName: 'Activity Name must be unique within the selected cycle.' })
        setActiveTab('manual')
        return
      }

      const projectPayload = buildProjectPayload(form, context!)
      console.log('Create activity payload', projectPayload)
      const projectResult = await Dga_aop_projectsesService.create(projectPayload as unknown as Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid'>)
      assertOperationSuccess(projectResult, 'Unable to save activity draft.')

      const createdProject = getResultValue<Dga_aop_projectses>(projectResult)
      const projectId = createdProject?.dga_aop_projectsid

      if (!projectId) {
        throw new Error('Activity was created, but the created record id was not returned.')
      }

      setCreatedProjectId(projectId)
      await assignActivityToDivisionMemberTeam(projectId, context!.planningInstance)
      
      setSuccessMessage('Activity created successfully.')
      navigate(`${APP_ROUTE_PATHS.editActivity}?id=${projectId}`)
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : 'Unable to save activity draft.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isContextLoading) {
    return (
      <div className="create-activity" aria-label="Loading Create Activity context...">
        {/* Mode switch skeleton */}
        <div className="create-activity__mode-bar">
          <div className="skeleton-pills">
            <div className="skeleton-pill skeleton-shimmer" />
            <div className="skeleton-pill skeleton-shimmer" />
          </div>
        </div>

        {/* Hero header skeleton */}
        <header className="create-activity__hero create-activity__hero--skeleton" aria-hidden="true">
          <div className="create-activity__hero-body">
            <div className="skeleton-icon-box skeleton-shimmer" />
            <div className="create-activity__hero-content">
              <div className="skeleton-line skeleton-shimmer" style={{ width: '28%', height: '0.7rem', marginBottom: '0.15rem' }} />
              <div className="skeleton-line skeleton-shimmer" style={{ width: '45%', height: '1.5rem', marginBottom: '0.15rem' }} />
              <div className="skeleton-line skeleton-shimmer" style={{ width: '65%', height: '0.85rem' }} />
            </div>
          </div>
          <div className="create-activity__hero-footer">
            <div className="create-activity__hero-chips">
              <span className="skeleton-chip skeleton-shimmer" />
              <span className="skeleton-chip skeleton-shimmer" />
              <span className="skeleton-chip skeleton-shimmer" />
            </div>
            <div className="skeleton-button skeleton-shimmer" />
          </div>
        </header>

        {/* Two-column layout skeleton */}
        <div className="create-activity__manual-layout">
          <div className="create-activity__manual-form">
            {/* Form card skeleton */}
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
                {/* 2-column row */}
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
                {/* 2-column row */}
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
                {/* Radio group row */}
                <div className="create-activity__form-row">
                  <div className="skeleton-field">
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '30%', height: '0.7rem', marginBottom: '0.5rem' }} />
                    <div className="skeleton-radio-row">
                      <div className="skeleton-radio skeleton-shimmer" />
                      <div className="skeleton-radio skeleton-shimmer" />
                    </div>
                  </div>
                </div>
                {/* Radio group row */}
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
                {/* 3-column row */}
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
                {/* Select row */}
                <div className="create-activity__form-row">
                  <div className="skeleton-field">
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '40%', height: '0.7rem', marginBottom: '0.35rem' }} />
                    <div className="skeleton-input skeleton-shimmer" />
                  </div>
                </div>
                {/* Date range row */}
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
                {/* 2-column textarea row */}
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

            {/* Second card skeleton */}
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

          {/* Guidance panel skeleton */}
          <aside className="create-activity__guidance" aria-hidden="true">
            <div className="create-activity__guidance-card">
              <div className="create-activity__guidance-inner" style={{ padding: '1.15rem' }}>
                <div className="skeleton-guidance-header">
                  <div className="skeleton-guidance-icon skeleton-shimmer" />
                  <div>
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '60%', height: '0.85rem', marginBottom: '0.3rem' }} />
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '45%', height: '0.7rem' }} />
                  </div>
                </div>
                <div className="skeleton-progress-ring skeleton-shimmer" />
                <div className="skeleton-line skeleton-shimmer" style={{ width: '100%', height: '0.75rem' }} />
                <div className="skeleton-guidance-items">
                  <div className="skeleton-line skeleton-shimmer" style={{ width: '75%', height: '0.7rem' }} />
                  <div className="skeleton-line skeleton-shimmer" style={{ width: '60%', height: '0.7rem' }} />
                  <div className="skeleton-line skeleton-shimmer" style={{ width: '80%', height: '0.7rem' }} />
                  <div className="skeleton-line skeleton-shimmer" style={{ width: '50%', height: '0.7rem' }} />
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    )
  }

  return (
    <div className="create-activity">
      {activeTab === 'manual' ? (
        <div className="create-activity__mode-bar">
          {creationModeSwitch}
        </div>
      ) : null}
      {activeTab === 'manual' ? (
        <header className="create-activity__hero">
          <div className="create-activity__hero-body">
            <div className="create-activity__hero-icon" aria-hidden="true">
              <FileText size={22} />
            </div>
            <div className="create-activity__hero-content">
              <span>Create Activity</span>
              <h1>{form.activityName.trim() || 'New Activity'}</h1>
              <p>{cycle?.dga_name ?? 'Loading...'} &mdash; Activity planning for the Digital Connect Annual Operating Plan.</p>
            </div>
          </div>

          <div className="create-activity__hero-footer">
            <div className="create-activity__hero-chips">
              <span className="create-activity__chip">
                <span className="create-activity__chip-label">Status</span>
                <Badge>Draft</Badge>
              </span>
              <span className="create-activity__chip">
                <span className="create-activity__chip-label">Phase</span>
                <Badge tone="info">Planning</Badge>
              </span>
              <span className="create-activity__chip create-activity__chip--user">
                <span className="create-activity__chip-label">Pending with</span>
                <strong>
                  <UserRound size={14} />
                  {context?.currentUserName ?? 'Division Member'}
                </strong>
              </span>
            </div>
            <Button disabled={isSaving || Boolean(errors.context)} icon={<Save size={16} />} onClick={saveDraft}>
              {isSaving ? 'Saving...' : createdProjectId ? 'Open Created Activity' : 'Save Draft'}
            </Button>
          </div>
        </header>
      ) : null}

      {errors.context ? (
        <EmptyState
          action={
            <Button icon={<RefreshCcw size={16} />} onClick={() => window.location.reload()} variant="secondary">
              Refresh
            </Button>
          }
          description={errors.context}
          title="Create Activity context unavailable"
        />
      ) : null}

      {successMessage ? <div className="create-activity__notice create-activity__notice--success">{successMessage}</div> : null}
      {creationWarning ? (
        <div className="create-activity__notice create-activity__notice--warning">
          <span>{creationWarning}</span>
          <Button onClick={() => navigate(`${APP_ROUTE_PATHS.editActivity}?id=${createdProjectId}`)} variant="secondary">
            Open Created Activity
          </Button>
        </div>
      ) : null}
      {errors.submit ? <div className="create-activity__notice create-activity__notice--error">{errors.submit}</div> : null}

      {activeTab === 'manual' ? (
        <div className="create-activity__manual-layout">
          <div className="create-activity__manual-form">
            <Card className="create-activity__section">
            <div className="create-activity__section-header">
              <div className="create-activity__section-header-inner">
                <span className="create-activity__section-header-icon" aria-hidden="true">
                  <ClipboardList size={18} />
                </span>
                <div>
                  <span>Activity Information</span>
                  <h2>Core planning details</h2>
                </div>
              </div>
            </div>

            <div className="create-activity__form-stack">
              <div className="create-activity__form-row create-activity__form-row--two">
                <Select
                  error={errors.activityType}
                  id="activity-type"
                  label="Activity Type"
                  onChange={(value) => updateForm({ activityType: value })}
                  options={ACTIVITY_TYPE_OPTIONS}
                  required
                  value={form.activityType}
                />
                <Input
                  error={errors.activityName}
                  label="Activity / Initiative Name"
                  onChange={(event) => updateForm({ activityName: event.target.value })}
                  placeholder="Enter activity name"
                  required
                  value={form.activityName}
                />
              </div>

              <div className="create-activity__form-row create-activity__form-row--two">
                <Input disabled error={errors.sectorName} label="Sector" required rightIcon={<LockKeyhole size={15} />} value={form.sectorName} />
                <Input disabled error={errors.divisionName} label="Division" required rightIcon={<LockKeyhole size={15} />} value={form.divisionName} />
              </div>

              <div className="create-activity__form-row">
                <RadioGroup
                  className="create-activity__radio create-activity__radio--scope"
                  error={errors.activityScope}
                  label="Activity Scope"
                  name="activity-scope"
                  onChange={(value) => updateForm({ activityScope: value })}
                  options={ACTIVITY_SCOPE_OPTIONS.filter((option) => option.value !== '')}
                  required
                  value={form.activityScope}
                />
              </div>
              {isStrategic ? (
                <div className="create-activity__form-row">
                  <fieldset className="checkbox-group create-activity__strategy-group">
                    <legend className="field__label">What strategy is this project/activity categorized under?</legend>
                    <div className="checkbox-group__options">
                      {STRATEGY_OPTIONS.map((option) => (
                        <Checkbox
                          checked={form.strategies.includes(option.value)}
                          key={option.value}
                          label={option.label}
                          onChange={() => toggleStrategy(option.value)}
                        />
                      ))}
                    </div>
                    {errors.strategies ? <span className="field__error">{errors.strategies}</span> : null}
                  </fieldset>
                </div>
              ) : null}

              <div className="create-activity__form-row">
                <RadioGroup
                  className="create-activity__radio create-activity__radio--classification"
                  error={errors.activityClassification}
                  label="Activity Classification"
                  name="activity-classification"
                  onChange={(value) => updateForm({ activityClassification: value })}
                  options={CLASSIFICATION_OPTIONS.filter((option) => option.value !== '')}
                  required
                  value={form.activityClassification}
                />
              </div>

              <div className="create-activity__form-row create-activity__form-row--three">
                {!isPaymentOnly ? (
                  <RadioGroup
                    className="create-activity__radio create-activity__radio--yes-no"
                    error={errors.budgetRequired}
                    label="Does this project require Budget?"
                    name="budget-required"
                    onChange={(value) => updateForm({ budgetRequired: value })}
                    options={YES_NO_OPTIONS.filter((option) => option.value !== '')}
                    required
                    value={form.budgetRequired}
                  />
                ) : (
                  <Input disabled hint="Payment Only activities are considered budget required." label="Budget Required" required rightIcon={<LockKeyhole size={15} />} value="Yes" />
                )}
                {isBudgetNo ? (
                  <Input disabled hint="Procurement is automatically No when budget is not required." label="Does this project require procurement?" required rightIcon={<LockKeyhole size={15} />} value="No" />
                ) : (
                  <RadioGroup
                    className="create-activity__radio create-activity__radio--yes-no"
                    error={errors.procurementRequired}
                    label="Does this project require procurement?"
                    name="procurement-required"
                    onChange={(value) => updateForm({ procurementRequired: value })}
                    options={YES_NO_OPTIONS.filter((option) => option.value !== '')}
                    required
                    value={form.procurementRequired}
                  />
                )}
                <RadioGroup
                  className="create-activity__radio create-activity__radio--yes-no"
                  error={errors.adeoReported}
                  label="Execution plan project reported in ADEO"
                  name="adeo-reported"
                  onChange={(value) => updateForm({ adeoReported: value })}
                  options={YES_NO_OPTIONS.filter((option) => option.value !== '')}
                  required
                  value={form.adeoReported}
                />
              </div>

              <div className="create-activity__form-row">
                <Select
                  error={errors.activityLeadId}
                  id="activity-lead"
                  label="Activity Lead / PM Name"
                  onChange={(value) => updateForm({ activityLeadId: value })}
                  options={activityLeadOptions.length > 0
                    ? [{ label: 'Select Activity Lead', value: '' }, ...activityLeadOptions]
                    : [{ label: 'No users available', value: '' }]}
                  required
                  value={form.activityLeadId || ''}
                />
              </div>

              <div className="create-activity__date-range" role="group" aria-label="Activity timeline">
                <DatePicker
                  error={errors.plannedStartDate}
                  id="planned-start-date"
                  label="Planned Start Date"
                  onChange={(value) => updateForm({ plannedStartDate: value })}
                  required
                  value={form.plannedStartDate}
                />
                <span className="create-activity__date-connector" aria-hidden="true">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M5 12h14M13 5l7 7-7 7"/>
                  </svg>
                </span>
                <DatePicker
                  error={errors.plannedEndDate}
                  id="planned-end-date"
                  label="Planned End Date"
                  min={form.plannedStartDate}
                  onChange={(value) => updateForm({ plannedEndDate: value })}
                  required
                  value={form.plannedEndDate}
                />
              </div>

              <div className="create-activity__form-row create-activity__form-row--two">
                <Textarea
                  error={errors.scopeDescription}
                  label="Activity Scope Description"
                  onChange={(event) => updateForm({ scopeDescription: event.target.value })}
                  placeholder="Describe in-scope and out-of-scope boundaries"
                  required
                  value={form.scopeDescription}
                />
                <Textarea
                  error={errors.summary}
                  label="Summary"
                  onChange={(event) => updateForm({ summary: event.target.value })}
                  placeholder="Summarize the expected outcome"
                  required
                  value={form.summary}
                />
              </div>
            </div>
          </Card>

          {isAdeoVisible ? (
            <Card className="create-activity__section">
              <div className="create-activity__section-header">
                <div className="create-activity__section-header-inner">
                  <span className="create-activity__section-header-icon" aria-hidden="true">
                    <FileText size={18} />
                  </span>
                  <div>
                    <span>ADEO Activity Overview</span>
                    <h2>Execution plan reporting details</h2>
                  </div>
                </div>
              </div>
              <div className="create-activity__form-stack">
                <div className="create-activity__form-row create-activity__form-row--two">
                  <Input
                    error={errors.adeoProjectName}
                    label="اسم المشروع"
                    onChange={(event) => updateForm({ adeoProjectName: event.target.value })}
                    placeholder="أدخل اسم المشروع"
                    required
                    value={form.adeoProjectName}
                  />
                  <Input
                    error={errors.adeoProjectDescription}
                    label="وصف المشروع"
                    onChange={(event) => updateForm({ adeoProjectDescription: event.target.value })}
                    placeholder="أدخل وصفاً مختصراً للمشروع"
                    required
                    value={form.adeoProjectDescription}
                  />
                </div>

                <div className="create-activity__form-row create-activity__form-row--two">
                  <Textarea
                    error={errors.longTermImpact}
                    label="Long Term Impact"
                    onChange={(event) => updateForm({ longTermImpact: event.target.value })}
                    placeholder="Describe the expected long-term impact of this activity"
                    required
                    value={form.longTermImpact}
                  />
                  <Textarea
                    error={errors.overallLongTermImpact}
                    label="طويلة المدى / اهداف المشروع العامة"
                    onChange={(event) => updateForm({ overallLongTermImpact: event.target.value })}
                    placeholder="اكتب الأهداف العامة طويلة المدى للمشروع"
                    required
                    value={form.overallLongTermImpact}
                  />
                </div>

                <div className="create-activity__form-row create-activity__form-row--two">
                  <Input
                    error={errors.stakeholder}
                    label="Stakeholder"
                    onChange={(event) => updateForm({ stakeholder: event.target.value })}
                    placeholder="Enter the primary stakeholder or entity"
                    required
                    value={form.stakeholder}
                  />
                  <Input
                    error={errors.activityKpi}
                    label="Activity KPI"
                    onChange={(event) => updateForm({ activityKpi: event.target.value })}
                    placeholder="Enter the KPI used to measure success"
                    required
                    value={form.activityKpi}
                  />
                </div>

                <div className="create-activity__form-row create-activity__form-row--two">
                  <Input
                    label="Activity Plan (If any)"
                    onChange={(event) => updateForm({ activityPlan: event.target.value })}
                    placeholder="Enter the activity plan reference, if available"
                    value={form.activityPlan}
                  />
                  <Textarea
                    error={errors.risks}
                    label="Risks"
                    onChange={(event) => updateForm({ risks: event.target.value })}
                    placeholder="Describe key risks, dependencies, or mitigation needs"
                    required
                    value={form.risks}
                  />
                </div>
              </div>
            </Card>
          ) : null}
        </div>
        {renderGuidancePanel()}
      </div>
      ) : (
        <div className="create-activity__copilot">
          <section className="copilot-assistant">
            {creationModeSwitch}

            <div className="copilot-assistant__hero">
              <div className="copilot-assistant__icons" aria-hidden="true">
                <Sparkles size={30} />
                <Bot size={28} />
                <FileText size={20} />
              </div>
              <h2>Start your activity with AI.</h2>
              <p>
                Describe the initiative, attach supporting evidence, or ask about any field. Once the conversation begins,
                a working draft form will appear for you to refine.
              </p>
            </div>

            <div className="copilot-composer">
              <textarea
                aria-label="Describe the activity you want to create"
                onChange={(event) => {
                  setCopilotPrompt(event.target.value)
                  setCopilotDraft(null)
                }}
                placeholder="Describe the activity you want to create..."
                value={copilotPrompt}
              />
              <div className="copilot-composer__footer">
                <div className="copilot-composer__tools">
                  <label className="copilot-tool-button">
                    <Paperclip size={16} />
                    Upload Document
                    <input accept=".pdf,.png,.jpg,.jpeg,.txt" multiple onChange={handleFileInput} type="file" />
                  </label>
                  <button className="copilot-tool-button" onClick={() => applyPromptChip('Review if this activity requires ADEO reporting, procurement, budget, or strategic categorization.')} type="button">
                    <Sparkles size={16} />
                    Check Considerations
                  </button>
                </div>
                <Button disabled={!copilotPrompt.trim() && attachments.length === 0} icon={<Send size={16} />} onClick={createCopilotDraft}>
                  Start Draft
                </Button>
              </div>
            </div>

            {attachmentError ? <span className="field__error copilot-assistant__error">{attachmentError}</span> : null}
            {renderAttachmentList()}

            <div className="copilot-chips">
              {COPILOT_PROMPTS.map((prompt) => (
                <button key={prompt} onClick={() => applyPromptChip(prompt)} type="button">
                  <Sparkles size={15} />
                  {prompt}
                </button>
              ))}
            </div>

            {copilotDraft ? (
              <Card className="copilot-review">
                <div className="copilot-message copilot-message--assistant">
                  <CheckCircle2 size={16} />
                  <div>
                    <strong>Draft generated</strong>
                    <p>Review the generated field summary and apply it to the manual form when ready.</p>
                  </div>
                </div>
                <div className="copilot-summary-grid">
                  <div>
                    <span>Activity Name</span>
                    <strong>{copilotDraft.activityName}</strong>
                  </div>
                  <div>
                    <span>Activity Type</span>
                    <strong>{getOptionLabel(ACTIVITY_TYPE_OPTIONS, copilotDraft.activityType)}</strong>
                  </div>
                  <div>
                    <span>Scope</span>
                    <strong>{getOptionLabel(ACTIVITY_SCOPE_OPTIONS, copilotDraft.activityScope)}</strong>
                  </div>
                  <div>
                    <span>Classification</span>
                    <strong>{getOptionLabel(CLASSIFICATION_OPTIONS, copilotDraft.activityClassification)}</strong>
                  </div>
                  <div>
                    <span>ADEO</span>
                    <strong>{getOptionLabel(YES_NO_OPTIONS, copilotDraft.adeoReported)}</strong>
                  </div>
                  <div>
                    <span>Attachments</span>
                    <strong>{attachments.length}</strong>
                  </div>
                </div>
                <div className="copilot-review__text">
                  <FileText size={16} />
                  <p>{copilotDraft.summary || 'No summary generated yet.'}</p>
                </div>
                {draftWarnings.length > 0 ? (
                  <div className="copilot-warnings">
                    <strong>Needs review before save</strong>
                    {draftWarnings.slice(0, 6).map((warning) => (
                      <span key={warning}>{warning}</span>
                    ))}
                  </div>
                ) : null}
                <div className="copilot-actions">
                  <Button onClick={() => setCopilotDraft(null)} variant="secondary">
                    Edit Prompt
                  </Button>
                  <Button icon={<CheckCircle2 size={16} />} onClick={applyCopilotDraft}>
                    Apply to Form
                  </Button>
                </div>
              </Card>
            ) : null}
          </section>
        </div>
      )}
    </div>
  )
}
