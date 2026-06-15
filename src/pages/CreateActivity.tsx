import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { Bot, CheckCircle2, FileText, LockKeyhole, Paperclip, RefreshCcw, Save, Send, Sparkles, Trash2, UserRound, WandSparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  Badge,
  Button,
  Card,
  Checkbox,
  DatePicker,
  EmptyState,
  Input,
  LoadingState,
  RadioGroup,
  Select,
  Textarea,
  type SelectOption,
} from '../components/ui'
import { AOP_CYCLES } from '../constants/app'
import { Dga_aop_project_logsesService } from '../generated/services/Dga_aop_project_logsesService'
import { Dga_aop_projectsesService } from '../generated/services/Dga_aop_projectsesService'
import { Dga_assessment_cyclesService } from '../generated/services/Dga_assessment_cyclesService'
import { Dga_divisional_hierarchiesService } from '../generated/services/Dga_divisional_hierarchiesService'
import { Dga_project_planning_instancesService } from '../generated/services/Dga_project_planning_instancesService'
import { SystemusersService } from '../generated/services/SystemusersService'
import type { Dga_aop_projectsesBase, Dga_aop_projectses } from '../generated/models/Dga_aop_projectsesModel'
import type { Dga_aop_project_logsesBase } from '../generated/models/Dga_aop_project_logsesModel'
import type { Dga_divisional_hierarchies } from '../generated/models/Dga_divisional_hierarchiesModel'
import type { Dga_project_planning_instances } from '../generated/models/Dga_project_planning_instancesModel'
import type { Systemusers } from '../generated/models/SystemusersModel'
import { APP_ROUTE_PATHS } from '../routes/appRoutes'
import { useAppSelector } from '../store/hooks'

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
  division?: Dga_divisional_hierarchies
  sector?: Dga_divisional_hierarchies
  planningInstance?: Dga_project_planning_instances
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
  { label: 'Yes', value: '1' },
  { label: 'No', value: '0' },
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

function escapeODataValue(value: string) {
  return value.replace(/'/g, "''")
}

function toEntityBind(entitySetName: string, id: string) {
  return `/${entitySetName}(${id})`
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

  if (form.plannedStartDate && form.plannedEndDate) {
    if (form.plannedStartDate >= form.plannedEndDate) {
      errors.plannedStartDate = 'Planned Start Date must be earlier than Planned End Date.'
      errors.plannedEndDate = 'Planned End Date must be later than Planned Start Date.'
    }
  }

  return errors
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

function buildProjectPayload(form: CreateActivityForm, context: ActivityContext): Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid'> {
  return withoutUndefined({
    dga_activity_classification: Number(form.activityClassification) as Dga_aop_projectsesBase['dga_activity_classification'],
    'dga_activity_lead@odata.bind': toEntityBind('systemusers', form.activityLeadId),
    dga_activity_type: Number(form.activityType) as Dga_aop_projectsesBase['dga_activity_type'],
    dga_adeo_review_required: form.adeoReported === '1',
    'dga_department@odata.bind': toEntityBind('dga_divisional_hierarchies', form.divisionId),
    dga_description_summary: form.summary,
    dga_longtermimpactprojectlongtermimpact: form.longTermImpact,
    dga_name: form.activityName.trim(),
    dga_planned_end_date: form.plannedEndDate,
    dga_planned_start_date: form.plannedStartDate,
    dga_project_activity_status: 776140014,
    dga_project_categorized_under: form.strategies[0] ? Number(form.strategies[0]) as Dga_aop_projectsesBase['dga_project_categorized_under'] : undefined,
    dga_project_description: form.adeoProjectDescription || form.scopeDescription,
    dga_project_long_term_impact: form.overallLongTermImpact,
    dga_project_name: form.adeoProjectName || form.activityName.trim(),
    dga_project_phase: 776140000,
    dga_project_plan_if_any: form.activityPlan,
    'dga_project_planning_instance@odata.bind': context.planningInstance
      ? toEntityBind('dga_project_planning_instances', context.planningInstance.dga_project_planning_instanceid)
      : undefined,
    dga_project_type: buildProjectType(form.activityType as ActivityTypeValue),
    dga_risks: form.risks,
    dga_scope: form.scopeDescription,
    'dga_sector@odata.bind': toEntityBind('dga_divisional_hierarchies', form.sectorId),
    dga_stakeholders: form.stakeholder,
    dga_strategic_vs_operation: form.activityScope ? Number(form.activityScope) as Dga_aop_projectsesBase['dga_strategic_vs_operation'] : undefined,
    importsequencenumber: undefined,
    overriddencreatedon: undefined,
    ownerid: context.currentUserId,
    owneridtype: 'systemuser',
    statecode: 0,
    statuscode: 1,
    timezoneruleversionnumber: undefined,
    utcconversiontimezonecode: undefined,
  })
}

function buildProjectLogPayload(projectId: string, activityName: string, context: ActivityContext): Omit<Dga_aop_project_logsesBase, 'dga_aop_project_logsid'> {
  return withoutUndefined({
    'dga_aop_project@odata.bind': toEntityBind('dga_aop_projectses', projectId),
    dga_name: 'Activity Creation',
    dga_new_value: activityName,
    dga_previous_value: '',
    dga_type: 776140002,
    importsequencenumber: undefined,
    overriddencreatedon: undefined,
    ownerid: context.currentUserId,
    owneridtype: 'systemuser',
    statecode: 0,
    statuscode: 1,
    timezoneruleversionnumber: undefined,
    utcconversiontimezonecode: undefined,
  })
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

export function CreateActivity() {
  const navigate = useNavigate()
  const selectedCycle = useAppSelector((state) => state.app.selectedCycle)
  const [activeTab, setActiveTab] = useState<TabValue>('copilot')
  const [form, setForm] = useState<CreateActivityForm>(INITIAL_FORM)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [context, setContext] = useState<ActivityContext | null>(null)
  const [activityLeadOptions, setActivityLeadOptions] = useState<SelectOption<string>[]>([])
  const [isContextLoading, setIsContextLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [copilotPrompt, setCopilotPrompt] = useState('')
  const [copilotDraft, setCopilotDraft] = useState<CreateActivityForm | null>(null)
  const [attachments, setAttachments] = useState<CopilotAttachment[]>([])
  const [attachmentError, setAttachmentError] = useState('')
  const cycle = AOP_CYCLES.find((item) => item.id === selectedCycle) ?? AOP_CYCLES[0]
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

      try {
        const [usersResult, hierarchyResult, cycleResult, planningResult] = await Promise.all([
          SystemusersService.getAll({
            select: ['systemuserid', 'fullname', 'internalemailaddress']
          }),
          Dga_divisional_hierarchiesService.getAll({
            select: [
              'dga_divisional_hierarchyid',
              'dga_name',
              'dga_type',
              '_dga_parent_divisional_hierarchy_value'
            ],
          }),
          Dga_assessment_cyclesService.getAll({
            select: ['dga_assessment_cycleid', 'dga_name', 'dga_scheduled_start_date', 'dga_scheduled_end_date'],
          }),
          Dga_project_planning_instancesService.getAll({
            select: [
              'dga_project_planning_instanceid',
              'dga_name',
              '_dga_assessment_cycle_value'
            ],
          }),
        ])


        if (!isMounted) {
          return
        }

        const users = getResultArray<Systemusers>(usersResult.data).filter((user) => !user.isdisabled)
        const hierarchies = getResultArray<Dga_divisional_hierarchies>(hierarchyResult.data)
        const cycles = getResultArray<{ dga_assessment_cycleid: string; dga_name: string }>(cycleResult.data)
        const planningInstances = getResultArray<Dga_project_planning_instances>(planningResult.data)

        const currentUser = users[0]
        const division = hierarchies.find((item) => item.dga_type === 776140002) ?? hierarchies[0]
        const sector = division?._dga_parent_divisional_hierarchy_value
          ? hierarchies.find((item) => item.dga_divisional_hierarchyid === division._dga_parent_divisional_hierarchy_value)
          : hierarchies.find((item) => item.dga_type === 776140001)
        const matchedCycle = cycles.find((item) => item.dga_name === cycle.name || item.dga_name.includes(cycle.name))
        const planningInstance = planningInstances.find((item) => {
          const matchesDivision = division ? item._dga_divisional_hierarchy_value === division.dga_divisional_hierarchyid : true
          const matchesCycle = matchedCycle ? item._dga_assessment_cycle_value === matchedCycle.dga_assessment_cycleid : true

          return matchesDivision && matchesCycle
        }) ?? planningInstances.find((item) => division ? item._dga_divisional_hierarchy_value === division.dga_divisional_hierarchyid : true)

        if (!currentUser || !division) {
          throw new Error('Current user or divisional hierarchy could not be resolved from Dataverse.')
        }

        setContext({
          currentUserId: currentUser.systemuserid,
          currentUserName: currentUser.fullname ?? currentUser.internalemailaddress ?? 'AOP - Division Member',
          division,
          sector: sector ?? division,
          planningInstance,
        })
        setActivityLeadOptions(
          users.map((user) => ({
            label: user.fullname ?? user.internalemailaddress ?? 'Unnamed user',
            value: user.systemuserid,
            meta: user.internalemailaddress,
          })),
        )
        setForm((currentForm) => ({
          ...currentForm,
          activityLeadId: currentForm.activityLeadId || currentUser.systemuserid,
          divisionId: division.dga_divisional_hierarchyid,
          divisionName: division.dga_name,
          sectorId: (sector ?? division).dga_divisional_hierarchyid,
          sectorName: (sector ?? division).dga_name,
        }))
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
  }, [cycle.name])

  function updateForm(nextFields: Partial<CreateActivityForm>) {
    setSuccessMessage('')
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

  async function validateUniqueActivityName() {
    if (!form.activityName.trim()) {
      return true
    }

    const filterParts = [`dga_name eq '${escapeODataValue(form.activityName.trim())}'`]

    if (context?.planningInstance?.dga_project_planning_instanceid) {
      filterParts.push(`_dga_project_planning_instance_value eq ${context.planningInstance.dga_project_planning_instanceid}`)
    }

    const result = await Dga_aop_projectsesService.getAll({
      select: ['dga_aop_projectsid', 'dga_name'],
      filter: filterParts.join(' and '),
      top: 1,
    })
    const matches = getResultArray<Dga_aop_projectses>(result)

    return matches.length === 0
  }

  async function saveDraft() {
    setSuccessMessage('')
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

      const projectResult = await Dga_aop_projectsesService.create(buildProjectPayload(form, context!))
      const createdProject = getResultValue<Dga_aop_projectses>(projectResult)
      const projectId = createdProject?.dga_aop_projectsid

      if (!projectId) {
        throw new Error('Activity was created, but the created record id was not returned.')
      }

      await Dga_aop_project_logsesService.create(buildProjectLogPayload(projectId, form.activityName.trim(), context!))
      setSuccessMessage('Activity created successfully.')
      navigate(`${APP_ROUTE_PATHS.activitiesList}?created=${projectId}`)
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : 'Unable to save activity draft.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isContextLoading) {
    return <LoadingState label="Loading Create Activity context..." />
  }

  return (
    <div className="create-activity">
      {activeTab === 'manual' ? <div className="create-activity__mode-bar">{creationModeSwitch}</div> : null}

      {activeTab === 'manual' ? (
        <header className="create-activity__hero">
          <div className="create-activity__hero-main">
            <div className="create-activity__hero-mark" aria-hidden="true">
              <FileText size={22} />
            </div>
            <div className="create-activity__hero-copy">
              <span>Create Activity</span>
              <h1>{form.activityName.trim() || 'New Activity'}</h1>
              <p>{cycle.name} activity planning for Digital Connect Annual Operating Plan.</p>
            </div>
          </div>
          <div className="create-activity__hero-actions">
            <div className="create-activity__hero-meta" aria-label="Activity status">
              <div className="create-activity__meta-item">
                <span>Status</span>
                <Badge>Draft</Badge>
              </div>
              <div className="create-activity__meta-item">
                <span>Phase</span>
                <Badge tone="info">Planning</Badge>
              </div>
              <div className="create-activity__meta-item create-activity__meta-item--owner">
                <span>Pending with</span>
                <strong>
                  <UserRound size={14} />
                  {context?.currentUserName ?? 'Division Member'}
                </strong>
              </div>
            </div>
            <Button disabled={isSaving || Boolean(errors.context)} icon={<Save size={16} />} onClick={saveDraft}>
              {isSaving ? 'Saving...' : 'Save Draft'}
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
      {errors.submit ? <div className="create-activity__notice create-activity__notice--error">{errors.submit}</div> : null}

      {activeTab === 'manual' ? (
        <div className="create-activity__manual">
          <Card className="create-activity__section">
            <div className="create-activity__section-header">
              <div>
                <span>Activity Information</span>
                <h2>Core planning details</h2>
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

              <div className={isStrategic ? 'create-activity__form-row create-activity__form-row--scope' : 'create-activity__form-row'}>
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
                {isStrategic ? (
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
                  </fieldset>
                ) : null}
              </div>

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
                  options={activityLeadOptions.length > 0 ? activityLeadOptions : [{ label: 'No users available', value: '' }]}
                  required
                  value={form.activityLeadId || activityLeadOptions[0]?.value || ''}
                />
              </div>

              <div className="create-activity__form-row create-activity__form-row--two">
                <DatePicker
                  error={errors.plannedStartDate}
                  id="planned-start-date"
                  label="Planned Start Date"
                  onChange={(value) => updateForm({ plannedStartDate: value })}
                  required
                  value={form.plannedStartDate}
                />
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
                <div>
                  <span>ADEO Activity Overview</span>
                  <h2>Execution plan reporting details</h2>
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
