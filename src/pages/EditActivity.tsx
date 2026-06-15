import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Bot,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Edit3,
  FileText,
  Flag,
  GitBranch,
  HelpCircle,
  History,
  LayoutList,
  Lightbulb,
  LockKeyhole,
  Mail,
  Rows,
  Search,
  Send,
  Sparkles,
  Trash2,
  UserCheck,
  UserPlus,
  UserRound,
  UsersRound,
  Wallet,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Card, Checkbox, ConfirmationDialog, DatePicker, Input, Modal, RadioGroup, SearchInput, Select, Textarea, type SelectOption } from '../components/ui'
import { type AopRole } from '../constants/app'
import { Dga_divisional_hierarchiesService } from '../generated/services/Dga_divisional_hierarchiesService'
import { Dga_project_planning_instancesService } from '../generated/services/Dga_project_planning_instancesService'
import { SystemusersService } from '../generated/services/SystemusersService'
import type { Dga_divisional_hierarchies } from '../generated/models/Dga_divisional_hierarchiesModel'
import type { Dga_project_planning_instances } from '../generated/models/Dga_project_planning_instancesModel'
import type { Systemusers } from '../generated/models/SystemusersModel'
import { APP_ROUTE_PATHS } from '../routes/appRoutes'
import { useAppSelector } from '../store/hooks'

// ── Types ──

type TabId =
  | 'activity-info'
  | 'members'
  | 'dependencies'
  | 'milestones'
  | 'procurements'
  | 'engagement-plans'
  | 'budget'
  | 'clarifications'
  | 'logs'

type TabConfig = {
  id: TabId
  label: string
  shortLabel: string
  icon: typeof ClipboardList
}

const TABS: TabConfig[] = [
  { id: 'activity-info', label: 'Activity Information', shortLabel: 'Info', icon: ClipboardList },
  { id: 'members', label: 'Activity Members', shortLabel: 'Members', icon: UsersRound },
  { id: 'dependencies', label: 'Dependencies', shortLabel: 'Dependencies', icon: GitBranch },
  { id: 'milestones', label: 'Milestones', shortLabel: 'Milestones', icon: Flag },
  { id: 'procurements', label: 'Procurements', shortLabel: 'Procurements', icon: Briefcase },
  { id: 'engagement-plans', label: 'Engagement Plans', shortLabel: 'Engagement', icon: BarChart3 },
  { id: 'budget', label: 'Budget Information', shortLabel: 'Budget', icon: Wallet },
  { id: 'clarifications', label: 'Clarifications', shortLabel: 'Clarifications', icon: HelpCircle },
  { id: 'logs', label: 'Logs', shortLabel: 'Logs', icon: History },
]

type ActivityTypeValue = '1' | '2' | '3' | '4'
type ActivityScopeValue = '1' | '2'
type StrategyValue = '576610000' | '576610001' | '576610002'
type ClassificationValue = '576610000' | '576610001' | '576610002'
type YesNoValue = '1' | '0'

type ActivityForm = {
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

type FieldErrors = Partial<Record<keyof ActivityForm | 'submit' | 'context', string>>

type ActivityContext = {
  currentUserId: string
  currentUserName: string
  division?: Dga_divisional_hierarchies
  sector?: Dga_divisional_hierarchies
  planningInstance?: Dga_project_planning_instances
}

// ── Constants ──

const FIELD_LABELS: Partial<Record<keyof ActivityForm, string>> = {
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

const INITIAL_FORM: ActivityForm = {
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
  { label: 'Strategic', value: '1', description: 'Aligned to strategic outcomes.', className: 'choice--strategic' },
  { label: 'Operational', value: '2', description: 'Division operational activity.', className: 'choice--operational' },
] as const satisfies SelectOption<ActivityScopeValue | ''>[]

const STRATEGY_OPTIONS = [
  { label: 'Government of the Future Strategy', value: '576610000' },
  { label: 'DGE Corporate Strategy', value: '576610001' },
  { label: 'Abu Dhabi Government Digital Strategy', value: '576610002' },
] as const satisfies SelectOption<StrategyValue>[]

const CLASSIFICATION_OPTIONS = [
  { label: 'Select classification', value: '' },
  { label: 'EPM Registered Project', value: '576610000', className: 'choice--epm' },
  { label: 'Operational Activity', value: '576610001', className: 'choice--non-epm' },
  { label: 'Payment Only', value: '576610002', className: 'choice--payment-only' },
] as const satisfies SelectOption<ClassificationValue | ''>[]

const YES_NO_OPTIONS = [
  { label: 'Select answer', value: '' },
  { label: 'Yes', value: '1', className: 'choice--yes' },
  { label: 'No', value: '0', className: 'choice--no' },
] as const satisfies SelectOption<YesNoValue | ''>[]

// ── Helpers ──

function getOptionLabel<TValue extends string>(options: readonly SelectOption<TValue>[], value: TValue | '') {
  return options.find((option) => option.value === value)?.label ?? ''
}

function normalizeControlledRules(form: ActivityForm): ActivityForm {
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

function validateForm(form: ActivityForm) {
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

function getRequiredFields(form: ActivityForm): Array<keyof ActivityForm> {
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

function getRuntimeErrors(form: ActivityForm, fields: Array<keyof ActivityForm>) {
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

// ── Status helpers ──

function getStatusTone(status: string): 'neutral' | 'info' | 'warning' | 'success' {
  switch (status) {
    case 'Submitted':
    case 'SubmittedtoDivisionDirector':
      return 'info'
    case 'ApprovedByDivisionDirector':
    case 'ApprovedByStrategyTeam':
    case 'ApprovedByExecutiveDirector':
    case 'ApprovedByDirectorGeneral':
    case 'Active':
      return 'success'
    case 'ClarificationNeeded':
    case 'InProgress_Delayed_':
      return 'warning'
    case 'Cancelled':
    case 'Inactive':
      return 'neutral'
    default:
      return 'neutral'
  }
}

function getPendingWithRole(statusCode: number, currentRole: AopRole): string {
  switch (statusCode) {
    case 1: return 'Division Member'
    case 776140001: return 'Division Director'
    case 776140012: return 'Division Member'
    case 776140003: return 'Strategy Team'
    case 776140004: return 'Executive Director'
    case 776140002: return 'Director General'
    default: return currentRole
  }
}

function formatStatusCode(code: number): string {
  const labels: Record<number, string> = {
    1: 'Draft',
    776140001: 'Submitted to Division Director',
    776140002: 'Approved by Executive Director',
    776140003: 'Approved by Division Director',
    776140004: 'Approved by Strategy Team',
    776140011: 'Active',
    776140012: 'Clarification Needed',
    776140014: 'Approved by Director General',
  }
  return labels[code] ?? 'Unknown'
}

// ── Activity Member types and mock data ──

type MemberFilter = 'all' | 'division' | 'non-division'

type MockUser = {
  avatarUrl: string | null
  email: string
  id: string
  isDivisionMember: boolean
  name: string
}

type ActivityMember = MockUser & {
  addedAt: string
}

const MOCK_USERS: MockUser[] = [
  { id: 'user-1', name: 'Ahmed Al Mansouri', email: 'ahmed.mansouri@dge.gov.ae', avatarUrl: null, isDivisionMember: true },
  { id: 'user-2', name: 'Sara Al Ketbi', email: 'sara.ketbi@dge.gov.ae', avatarUrl: null, isDivisionMember: true },
  { id: 'user-3', name: 'Mohammed Al Zaabi', email: 'mohammed.zaabi@dge.gov.ae', avatarUrl: null, isDivisionMember: true },
  { id: 'user-4', name: 'Noora Al Falasi', email: 'noora.falasi@dge.gov.ae', avatarUrl: null, isDivisionMember: true },
  { id: 'user-5', name: 'Khalid Al Shamsi', email: 'khalid.shamsi@dge.gov.ae', avatarUrl: null, isDivisionMember: false },
  { id: 'user-6', name: 'Mona Al Muhairi', email: 'mona.muhairi@dge.gov.ae', avatarUrl: null, isDivisionMember: false },
  { id: 'user-7', name: 'Sultan Al Neyadi', email: 'sultan.neyadi@dge.gov.ae', avatarUrl: null, isDivisionMember: false },
  { id: 'user-8', name: 'Fatima Al Hashimi', email: 'fatima.hashimi@dge.gov.ae', avatarUrl: null, isDivisionMember: true },
  { id: 'user-9', name: 'Omar Al Blooshi', email: 'omar.blooshi@dge.gov.ae', avatarUrl: null, isDivisionMember: false },
  { id: 'user-10', name: 'Hessa Al Suwaidi', email: 'hessa.suwaidi@dge.gov.ae', avatarUrl: null, isDivisionMember: true },
  { id: 'user-11', name: 'Rashid Al Ghafri', email: 'rashid.ghafri@dge.gov.ae', avatarUrl: null, isDivisionMember: true },
  { id: 'user-12', name: 'Layla Al Shehhi', email: 'layla.shehhi@dge.gov.ae', avatarUrl: null, isDivisionMember: false },
  { id: 'user-13', name: 'Zayed Al Nahyan', email: 'zayed.nahyan@dge.gov.ae', avatarUrl: null, isDivisionMember: true },
  { id: 'user-14', name: 'Noura Al Suwaidi', email: 'noura.suwaidi@dge.gov.ae', avatarUrl: null, isDivisionMember: false },
  { id: 'user-15', name: 'Majid Al Falasi', email: 'majid.falasi@dge.gov.ae', avatarUrl: null, isDivisionMember: true },
  { id: 'user-16', name: 'Reem Al Hashemi', email: 'reem.hashemi@dge.gov.ae', avatarUrl: null, isDivisionMember: false },
  { id: 'user-17', name: 'Saif Al Mansoori', email: 'saif.mansoori@dge.gov.ae', avatarUrl: null, isDivisionMember: true },
  { id: 'user-18', name: 'Dana Al Marzouqi', email: 'dana.marzouqi@dge.gov.ae', avatarUrl: null, isDivisionMember: true },
  { id: 'user-19', name: 'Yasser Al Qubaisi', email: 'yasser.qubaisi@dge.gov.ae', avatarUrl: null, isDivisionMember: false },
  { id: 'user-20', name: 'Amal Al Shamsi', email: 'amal.shamsi@dge.gov.ae', avatarUrl: null, isDivisionMember: true },
  { id: 'user-21', name: 'Hazza Al Mazrouei', email: 'hazza.mazrouei@dge.gov.ae', avatarUrl: null, isDivisionMember: false },
  { id: 'user-22', name: 'Shaikha Al Ketbi', email: 'shaikha.ketbi@dge.gov.ae', avatarUrl: null, isDivisionMember: true },
  { id: 'user-23', name: 'Mohsin Al Darmaki', email: 'mohsin.darmaki@dge.gov.ae', avatarUrl: null, isDivisionMember: true },
  { id: 'user-24', name: 'Salama Al Ameri', email: 'salama.ameri@dge.gov.ae', avatarUrl: null, isDivisionMember: false },
  { id: 'user-25', name: 'Eisa Al Mazroui', email: 'eisa.mazroui@dge.gov.ae', avatarUrl: null, isDivisionMember: true },
  { id: 'user-26', name: 'Mira Al Teneiji', email: 'mira.teneiji@dge.gov.ae', avatarUrl: null, isDivisionMember: true },
  { id: 'user-27', name: 'Suhail Al Owais', email: 'suhail.owais@dge.gov.ae', avatarUrl: null, isDivisionMember: false },
  { id: 'user-28', name: 'Buthaina Al Nuaimi', email: 'buthaina.nuaimi@dge.gov.ae', avatarUrl: null, isDivisionMember: true },
  { id: 'user-29', name: 'Jassim Al Zaffin', email: 'jassim.zaffin@dge.gov.ae', avatarUrl: null, isDivisionMember: false },
  { id: 'user-30', name: 'Rawdha Al Kaabi', email: 'rawdha.kaabi@dge.gov.ae', avatarUrl: null, isDivisionMember: true },
  { id: 'user-31', name: 'Khamis Al Shamsi', email: 'khamis.shamsi@dge.gov.ae', avatarUrl: null, isDivisionMember: false },
  { id: 'user-32', name: 'Alya Al Moosa', email: 'alya.moosa@dge.gov.ae', avatarUrl: null, isDivisionMember: true },
  { id: 'user-33', name: 'Rashid Al Qasimi', email: 'rashid.qasimi@dge.gov.ae', avatarUrl: null, isDivisionMember: true },
  { id: 'user-34', name: 'Nawaf Al Awadi', email: 'nawaf.awadi@dge.gov.ae', avatarUrl: null, isDivisionMember: false },
  { id: 'user-35', name: 'Hind Al Falasi', email: 'hind.falasi@dge.gov.ae', avatarUrl: null, isDivisionMember: true },
  { id: 'user-36', name: 'Talal Al Mahmoud', email: 'talal.mahmoud@dge.gov.ae', avatarUrl: null, isDivisionMember: false },
  { id: 'user-37', name: 'Lamia Al Hammadi', email: 'lamia.hammadi@dge.gov.ae', avatarUrl: null, isDivisionMember: true },
  { id: 'user-38', name: 'Abdul Rahman Al Shehhi', email: 'abdul.shehhi@dge.gov.ae', avatarUrl: null, isDivisionMember: true },
  { id: 'user-39', name: 'Nasser Al Naboodah', email: 'nasser.naboodah@dge.gov.ae', avatarUrl: null, isDivisionMember: false },
  { id: 'user-40', name: 'Obaid Al Muhairi', email: 'obaid.muhairi@dge.gov.ae', avatarUrl: null, isDivisionMember: true },
]

const INITIAL_MEMBERS: ActivityMember[] = [
  { id: 'init-1', name: 'Ahmed Al Mansouri', email: 'ahmed.mansouri@dge.gov.ae', avatarUrl: null, isDivisionMember: true, addedAt: '2026-01-15' },
  { id: 'init-2', name: 'Sara Al Ketbi', email: 'sara.ketbi@dge.gov.ae', avatarUrl: null, isDivisionMember: true, addedAt: '2026-01-15' },
  { id: 'init-3', name: 'Mohammed Al Zaabi', email: 'mohammed.zaabi@dge.gov.ae', avatarUrl: null, isDivisionMember: true, addedAt: '2026-01-20' },
  { id: 'init-4', name: 'Noora Al Falasi', email: 'noora.falasi@dge.gov.ae', avatarUrl: null, isDivisionMember: true, addedAt: '2026-02-20' },
  { id: 'init-5', name: 'Khalid Al Shamsi', email: 'khalid.shamsi@dge.gov.ae', avatarUrl: null, isDivisionMember: false, addedAt: '2026-03-01' },
  { id: 'init-6', name: 'Mona Al Muhairi', email: 'mona.muhairi@dge.gov.ae', avatarUrl: null, isDivisionMember: false, addedAt: '2026-03-10' },
  { id: 'init-7', name: 'Sultan Al Neyadi', email: 'sultan.neyadi@dge.gov.ae', avatarUrl: null, isDivisionMember: false, addedAt: '2026-03-15' },
  { id: 'init-8', name: 'Fatima Al Hashimi', email: 'fatima.hashimi@dge.gov.ae', avatarUrl: null, isDivisionMember: true, addedAt: '2026-04-01' },
  { id: 'init-9', name: 'Omar Al Blooshi', email: 'omar.blooshi@dge.gov.ae', avatarUrl: null, isDivisionMember: false, addedAt: '2026-04-05' },
  { id: 'init-10', name: 'Hessa Al Suwaidi', email: 'hessa.suwaidi@dge.gov.ae', avatarUrl: null, isDivisionMember: true, addedAt: '2026-04-10' },
  { id: 'init-11', name: 'Rashid Al Ghafri', email: 'rashid.ghafri@dge.gov.ae', avatarUrl: null, isDivisionMember: true, addedAt: '2026-04-15' },
  { id: 'init-12', name: 'Layla Al Shehhi', email: 'layla.shehhi@dge.gov.ae', avatarUrl: null, isDivisionMember: false, addedAt: '2026-05-01' },
  { id: 'init-13', name: 'Abdulla Al Mazrouei', email: 'abdulla.mazrouei@dge.gov.ae', avatarUrl: null, isDivisionMember: true, addedAt: '2026-05-05' },
  { id: 'init-14', name: 'Mariam Al Qubaisi', email: 'mariam.qubaisi@dge.gov.ae', avatarUrl: null, isDivisionMember: false, addedAt: '2026-05-10' },
  { id: 'init-15', name: 'Hamad Al Ameri', email: 'hamad.ameri@dge.gov.ae', avatarUrl: null, isDivisionMember: true, addedAt: '2026-05-15' },
  { id: 'init-16', name: 'Noura Al Kaabi', email: 'noura.kaabi@dge.gov.ae', avatarUrl: null, isDivisionMember: true, addedAt: '2026-05-18' },
  { id: 'init-17', name: 'Saeed Al Tayer', email: 'saeed.tayer@dge.gov.ae', avatarUrl: null, isDivisionMember: false, addedAt: '2026-05-20' },
  { id: 'init-18', name: 'Aisha Al Bishr', email: 'aisha.bishr@dge.gov.ae', avatarUrl: null, isDivisionMember: true, addedAt: '2026-05-22' },
  { id: 'init-19', name: 'Salem Al Mazroui', email: 'salem.mazroui@dge.gov.ae', avatarUrl: null, isDivisionMember: false, addedAt: '2026-05-25' },
  { id: 'init-20', name: 'Latifa Al Maktoum', email: 'latifa.maktoum@dge.gov.ae', avatarUrl: null, isDivisionMember: true, addedAt: '2026-05-28' },
  { id: 'init-21', name: 'Butti Al Qubaisi', email: 'butti.qubaisi@dge.gov.ae', avatarUrl: null, isDivisionMember: false, addedAt: '2026-06-01' },
  { id: 'init-22', name: 'Amna Al Dahak', email: 'amna.dahak@dge.gov.ae', avatarUrl: null, isDivisionMember: true, addedAt: '2026-06-03' },
  { id: 'init-23', name: 'Faisal Al Bannai', email: 'faisal.bannai@dge.gov.ae', avatarUrl: null, isDivisionMember: true, addedAt: '2026-06-05' },
  { id: 'init-24', name: 'Shamma Al Suwaidi', email: 'shamma.suwaidi@dge.gov.ae', avatarUrl: null, isDivisionMember: false, addedAt: '2026-06-07' },
  { id: 'init-25', name: 'Mansoor Al Dhaheri', email: 'mansoor.dhaheri@dge.gov.ae', avatarUrl: null, isDivisionMember: true, addedAt: '2026-06-09' },
  { id: 'init-26', name: 'Afra Al Shamsi', email: 'afra.shamsi@dge.gov.ae', avatarUrl: null, isDivisionMember: false, addedAt: '2026-06-10' },
  { id: 'init-27', name: 'Jamal Al Hosani', email: 'jamal.hosani@dge.gov.ae', avatarUrl: null, isDivisionMember: true, addedAt: '2026-06-11' },
  { id: 'init-28', name: 'Hind Al Balushi', email: 'hind.balushi@dge.gov.ae', avatarUrl: null, isDivisionMember: false, addedAt: '2026-06-12' },
  { id: 'init-29', name: 'Tariq Al Falahi', email: 'tariq.falahi@dge.gov.ae', avatarUrl: null, isDivisionMember: true, addedAt: '2026-06-13' },
  { id: 'init-30', name: 'Nawal Al Khouri', email: 'nawal.khouri@dge.gov.ae', avatarUrl: null, isDivisionMember: false, addedAt: '2026-06-14' },
  { id: 'init-31', name: 'Rashed Al Nuaimi', email: 'rashed.nuaimi@dge.gov.ae', avatarUrl: null, isDivisionMember: true, addedAt: '2026-06-15' },
  { id: 'init-32', name: 'Maha Al Barrak', email: 'maha.barrak@dge.gov.ae', avatarUrl: null, isDivisionMember: true, addedAt: '2026-06-15' },
  { id: 'init-33', name: 'Sultan Al Qasimi', email: 'sultan.qasimi@dge.gov.ae', avatarUrl: null, isDivisionMember: false, addedAt: '2026-06-15' },
  { id: 'init-34', name: 'Nadia Al Hamadi', email: 'nadia.hamadi@dge.gov.ae', avatarUrl: null, isDivisionMember: true, addedAt: '2026-06-15' },
  { id: 'init-35', name: 'Khalifa Al Shams', email: 'khalifa.shams@dge.gov.ae', avatarUrl: null, isDivisionMember: false, addedAt: '2026-06-15' },
  { id: 'init-36', name: 'Mouza Al Saboosi', email: 'mouza.saboosi@dge.gov.ae', avatarUrl: null, isDivisionMember: true, addedAt: '2026-06-15' },
]

// ── Component ──

export function EditActivity() {
  const navigate = useNavigate()
  const selectedRole = useAppSelector((state) => state.app.selectedRole)
  const [activeTab, setActiveTab] = useState<TabId>('activity-info')
  const [form, setForm] = useState<ActivityForm>(INITIAL_FORM)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [_context, setContext] = useState<ActivityContext | null>(null)
  const [activityLeadOptions, setActivityLeadOptions] = useState<SelectOption<string>[]>([])
  const [isContextLoading, setIsContextLoading] = useState(true)

  // ── Activity Members state ──
  const [members, setMembers] = useState<ActivityMember[]>(INITIAL_MEMBERS)
  const [memberToDelete, setMemberToDelete] = useState<ActivityMember | null>(null)
  const [isAddMembersModalOpen, setIsAddMembersModalOpen] = useState(false)
  const [memberFilter, setMemberFilter] = useState<MemberFilter>('all')
  const [memberSearchQuery, setMemberSearchQuery] = useState('')
  const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set())
  const [memberSelectionError, setMemberSelectionError] = useState('')

  // ── Member list view state (search, pagination, lazy) ──
  const [memberListSearch, setMemberListSearch] = useState('')
  const [memberViewMode, setMemberViewMode] = useState<'pagination' | 'lazy'>('pagination')
  const [currentPage, setCurrentPage] = useState(1)
  const [lazyVisibleCount, setLazyVisibleCount] = useState(12)
  const ITEMS_PER_PAGE = 12
  const LAZY_BATCH = 12
  const sentinelRef = useRef<HTMLDivElement>(null)

  const filteredMembers = useMemo(() => {
    if (!memberListSearch.trim()) return members
    const q = memberListSearch.toLowerCase()
    return members.filter((m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q))
  }, [members, memberListSearch])

  // Auto-load more on scroll via IntersectionObserver
  useEffect(() => {
    if (memberViewMode !== 'lazy') return undefined
    const sentinel = sentinelRef.current
    if (!sentinel) return undefined

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setLazyVisibleCount((prev) => {
            const next = prev + LAZY_BATCH
            return next >= filteredMembers.length ? filteredMembers.length : next
          })
        }
      },
      { rootMargin: '100px' },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [memberViewMode, filteredMembers.length, LAZY_BATCH])

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / ITEMS_PER_PAGE))

  const visibleMembers = useMemo(() => {
    if (memberViewMode === 'pagination') {
      return filteredMembers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
    }
    return filteredMembers.slice(0, lazyVisibleCount)
  }, [filteredMembers, memberViewMode, currentPage, lazyVisibleCount])

  // Reset to first page / lazy count when search changes or members change
  useEffect(() => {
    setCurrentPage(1)
    setLazyVisibleCount(12)
  }, [memberListSearch, members.length])

  // ── Placeholder activity data ──
  const activityName = 'Digital Infrastructure Upgrade'
  const aiSummary = 'This project aims to modernize the digital backbone to support 99.9% uptime across all government service channels.'
  const statusCode = 1 // Draft
  const projectPhase = 776140000 // Planning
  const pendingWith = getPendingWithRole(statusCode, selectedRole)
  const isStrategic = form.activityScope === '1'
  const isPaymentOnly = form.activityClassification === '576610002'
  const isBudgetNo = form.budgetRequired === '0'
  const isAdeoVisible = form.adeoReported === '1'

  const isDivisionMember = selectedRole === 'AOP - Division Member'
  const isDivisionDirector = selectedRole === 'AOP - Division Director'

  // ── Context loading ──

  useEffect(() => {
    let isMounted = true

    async function loadContext() {
      setIsContextLoading(true)
      setErrors((currentErrors) => ({ ...currentErrors, context: undefined }))

      try {
        const [usersResult, hierarchyResult, planningResult] = await Promise.all([
          SystemusersService.getAll({
            select: ['systemuserid', 'fullname', 'internalemailaddress']
          }),
          Dga_divisional_hierarchiesService.getAll({
            select: ['dga_divisional_hierarchyid', 'dga_name', 'dga_type', '_dga_parent_divisional_hierarchy_value'],
          }),
          Dga_project_planning_instancesService.getAll({
            select: ['dga_project_planning_instanceid', 'dga_name', '_dga_assessment_cycle_value'],
          }),
        ])

        if (!isMounted) return

        const users = (usersResult?.data ?? []) as Systemusers[]
        const hierarchy = (hierarchyResult?.data ?? []) as Dga_divisional_hierarchies[]
        const planningInstances = (planningResult?.data ?? []) as Dga_project_planning_instances[]

        const activityLeadUsers = (users ?? [])
          .filter((user) => user.fullname)
          .map((user) => ({
            label: user.fullname!,
            value: user.systemuserid ?? '',
          }))

        const divisions = (hierarchy ?? []).filter((item) => item.dga_type === 776140000)
        const sectors = (hierarchy ?? []).filter((item) => item.dga_type === 776140001)
        const sector = sectors[0]
        const division = divisions[0]

        setActivityLeadOptions(activityLeadUsers)
        setContext({
          currentUserId: users?.[0]?.systemuserid ?? '',
          currentUserName: users?.[0]?.fullname ?? 'User',
          division,
          sector,
          planningInstance: planningInstances?.[0],
        })
        setForm((prev) => ({
          ...prev,
          sectorId: sector?.dga_divisional_hierarchyid ?? '',
          sectorName: sector?.dga_name ?? '',
          divisionId: division?.dga_divisional_hierarchyid ?? '',
          divisionName: division?.dga_name ?? '',
        }))
      } catch (error) {
        if (isMounted) {
          setErrors({ context: error instanceof Error ? error.message : 'Failed to load context.' })
        }
      } finally {
        if (isMounted) setIsContextLoading(false)
      }
    }

    loadContext()
    return () => { isMounted = false }
  }, [])

  // ── Form handlers ──

  function updateForm(nextFields: Partial<ActivityForm>) {
    const changedFields = Object.keys(nextFields) as Array<keyof ActivityForm>
    const normalizedForm = normalizeControlledRules({ ...form, ...nextFields })

    setForm(normalizedForm)
    setErrors((currentErrors) => {
      const nextErrors = { ...currentErrors }
      const allRuntimeErrors = validateForm(normalizedForm)
      const runtimeErrors = getRuntimeErrors(normalizedForm, changedFields)

      Object.keys(INITIAL_FORM).forEach((key) => {
        const field = key as keyof ActivityForm
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
        if (runtimeErrors.plannedStartDate) nextErrors.plannedStartDate = runtimeErrors.plannedStartDate
        else delete nextErrors.plannedStartDate
        if (runtimeErrors.plannedEndDate) nextErrors.plannedEndDate = runtimeErrors.plannedEndDate
        else delete nextErrors.plannedEndDate
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

  // ── Action handlers ──

  const handleSubmitToDivisionDirector = useCallback(() => {
    // TODO: Implement submit logic
    console.log('Submit to Division Director')
  }, [])

  const handleRequestClarification = useCallback(() => {
    // TODO: Implement clarification request logic
    console.log('Request Clarification')
  }, [])

  // ── Activity Members handlers ──

  const handleOpenAddMembersModal = useCallback(() => {
    setSelectedMemberIds(new Set())
    setMemberFilter('all')
    setMemberSearchQuery('')
    setMemberSelectionError('')
    setIsAddMembersModalOpen(true)
  }, [])

  const handleCloseAddMembersModal = useCallback(() => {
    setSelectedMemberIds(new Set())
    setMemberFilter('all')
    setMemberSearchQuery('')
    setMemberSelectionError('')
    setIsAddMembersModalOpen(false)
  }, [])

  const handleAddSelectedMembers = useCallback(() => {
    if (selectedMemberIds.size === 0) {
      setMemberSelectionError('Please select at least one user to add.')
      return
    }
    setMembers((prev) => {
      const existingIds = new Set(prev.map((m) => m.id))
      const newMembers = MOCK_USERS
        .filter((u) => selectedMemberIds.has(u.id) && !existingIds.has(u.id))
        .map((u) => ({ ...u, addedAt: new Date().toISOString().slice(0, 10) }))
      return [...prev, ...newMembers]
    })
    setSelectedMemberIds(new Set())
    setMemberSelectionError('')
    setIsAddMembersModalOpen(false)
  }, [selectedMemberIds])

  const handleRemoveMember = useCallback((member: ActivityMember) => {
    setMemberToDelete(member)
  }, [])

  const handleConfirmDeleteMember = useCallback(() => {
    if (!memberToDelete) return
    setMembers((prev) => prev.filter((m) => m.id !== memberToDelete.id))
    setMemberToDelete(null)
  }, [memberToDelete])

  const handleCancelDeleteMember = useCallback(() => {
    setMemberToDelete(null)
  }, [])

  const handleToggleUserSelection = useCallback((userId: string) => {
    setMemberSelectionError('')
    setSelectedMemberIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }, [])

  // Computed filtered users for modal
  const filteredUsers = useMemo(() => {
    const existingIds = new Set(members.map((m) => m.id))
    const notAddedUsers = MOCK_USERS.filter((u) => !existingIds.has(u.id))

    return notAddedUsers.filter((user) => {
      if (memberFilter === 'division' && !user.isDivisionMember) return false
      if (memberFilter === 'non-division' && user.isDivisionMember) return false
      if (memberSearchQuery.trim()) {
        const q = memberSearchQuery.toLowerCase()
        if (!user.name.toLowerCase().includes(q) && !user.email.toLowerCase().includes(q)) return false
      }
      return true
    })
  }, [members, memberFilter, memberSearchQuery])

  // ── Guidance Panel ──

  function renderGuidancePanel() {
    const requiredFields = getRequiredFields(form)
    const pendingFields = requiredFields.filter((field) => !String(form[field] ?? '').trim())
    const total = requiredFields.length
    const completedCount = total - pendingFields.length
    const percent = total > 0 ? Math.round((completedCount / total) * 100) : 0
    const isComplete = pendingFields.length === 0

    const FIELD_GROUPS: Array<{ key: string; label: string; fields: Array<keyof ActivityForm> }> = [
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

    function countDone(fields: Array<keyof ActivityForm>) {
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

  // ── Tab content renderers ──

  function renderActivityInfoCards() {
    if (errors.context) {
      return (
        <div className="edit-activity__placeholder" style={{ color: 'var(--color-error)' }}>
          {errors.context}
        </div>
      )
    }

    return (
      <>
        {/* Core Activity Information Card */}
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
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

        {/* ADEO Card */}
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
      </>
    )
  }

  function renderActivityInfo() {
    return (
      <div className="create-activity__manual-layout">
        <div className="create-activity__manual-form">
          {renderActivityInfoCards()}
        </div>
        {renderGuidancePanel()}
      </div>
    )
  }

  // ── Activity Members Tab ──

  function renderMembersTab() {
    const memberCount = members.length
    const filteredCount = filteredMembers.length
    const hasFilter = memberListSearch.trim().length > 0
    const showingText = hasFilter
      ? `${filteredCount} of ${memberCount} member${memberCount !== 1 ? 's' : ''}`
      : `${memberCount} member${memberCount !== 1 ? 's' : ''}`
    const showPagination = memberViewMode === 'pagination' && filteredCount > ITEMS_PER_PAGE
    const showLoadMore = memberViewMode === 'lazy' && lazyVisibleCount < filteredCount
    const rangeStart = filteredCount > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0
    const rangeEnd = Math.min(currentPage * ITEMS_PER_PAGE, filteredCount)

    return (
      <div className="edit-activity__members">
        {/* Header bar */}
        <div className="edit-activity__members-header">
          <div className="edit-activity__members-header-text">
            <h2>
              Activity Members
              <span className="edit-activity__members-count-badge">{showingText}</span>
            </h2>
            <p>Manage users assigned to this activity.</p>
          </div>
          <Button icon={<UserPlus size={16} />} onClick={handleOpenAddMembersModal}>
            Add Members
          </Button>
        </div>

        {/* Toolbar: search + view toggle */}
        {memberCount > 0 ? (
          <div className="edit-activity__members-toolbar">
            <div className="edit-activity__members-search">
              <Search size={15} />
              <input
                className="edit-activity__members-search-input"
                onChange={(e) => setMemberListSearch(e.target.value)}
                placeholder="Search members by name or email..."
                type="text"
                value={memberListSearch}
              />
              {memberListSearch ? (
                <button
                  className="edit-activity__members-search-clear"
                  onClick={() => setMemberListSearch('')}
                  type="button"
                >
                  <X size={14} />
                </button>
              ) : null}
            </div>
            <div className="edit-activity__members-view-toggle" role="group" aria-label="View mode">
              <button
                className={`edit-activity__members-view-btn${memberViewMode === 'pagination' ? ' edit-activity__members-view-btn--active' : ''}`}
                onClick={() => { setMemberViewMode('pagination'); setCurrentPage(1) }}
                title="Paginated view"
                type="button"
              >
                <LayoutList size={14} />
                <span>Pages</span>
              </button>
              <button
                className={`edit-activity__members-view-btn${memberViewMode === 'lazy' ? ' edit-activity__members-view-btn--active' : ''}`}
                onClick={() => { setMemberViewMode('lazy'); setLazyVisibleCount(12) }}
                title="Scroll-to-load view"
                type="button"
              >
                <Rows size={14} />
                <span>Scroll</span>
              </button>
            </div>
          </div>
        ) : null}

        {/* Cards grid */}
        {filteredCount === 0 ? (
          <div className="edit-activity__members-empty">
            {hasFilter ? (
              <>
                <Search size={36} strokeWidth={1.2} />
                <h3>No members match your search</h3>
                <p>Try a different name or email.</p>
              </>
            ) : (
              <>
                <UsersRound size={40} strokeWidth={1.2} />
                <h3>No members assigned</h3>
                <p>Click <strong>Add Members</strong> to assign users to this activity.</p>
              </>
            )}
          </div>
        ) : (
          <div className="edit-activity__members-grid">
            {visibleMembers.map((member) => (
              <div className="edit-activity__member-card" key={member.id}>
                <div className="edit-activity__member-card-avatar">
                  {member.avatarUrl ? (
                    <img alt={member.name} src={member.avatarUrl} />
                  ) : (
                    <span>{member.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>
                  )}
                </div>
                <div className="edit-activity__member-card-info">
                  <strong>{member.name}</strong>
                  <span className="edit-activity__member-card-email">
                    <Mail size={12} />
                    {member.email}
                  </span>
                </div>
                <div className="edit-activity__member-card-meta">
                  <span className={`edit-activity__member-card-badge ${member.isDivisionMember ? 'edit-activity__member-card-badge--division' : 'edit-activity__member-card-badge--external'}`}>
                    {member.isDivisionMember ? 'Division Member' : 'Non-Division Member'}
                  </span>
                </div>
                <button
                  aria-label={`Remove ${member.name}`}
                  className="edit-activity__member-card-remove"
                  onClick={() => handleRemoveMember(member)}
                  title="Remove member"
                  type="button"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {showPagination ? (
          <div className="edit-activity__members-pagination">
            <span className="edit-activity__members-pagination-info">
              Showing <strong>{rangeStart}–{rangeEnd}</strong> of <strong>{filteredCount}</strong> member{filteredCount !== 1 ? 's' : ''}
            </span>
            <div className="edit-activity__members-pagination-controls">
              <button
                className="edit-activity__members-page-btn"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                type="button"
                aria-label="Previous page"
              >
                <ChevronLeft size={15} />
              </button>
              <div className="edit-activity__members-page-numbers">
                {(() => {
                  const pages: (number | 'ellipsis')[] = []
                  const total = totalPages
                  const current = currentPage
                  const siblingCount = 1

                  if (total <= 7) {
                    for (let i = 1; i <= total; i++) pages.push(i)
                  } else {
                    pages.push(1)
                    if (current > siblingCount + 2) pages.push('ellipsis')
                    const start = Math.max(2, current - siblingCount)
                    const end = Math.min(total - 1, current + siblingCount)
                    for (let i = start; i <= end; i++) pages.push(i)
                    if (current < total - siblingCount - 1) pages.push('ellipsis')
                    if (total > 1) pages.push(total)
                  }

                  return pages.map((page, idx) =>
                    page === 'ellipsis' ? (
                      <span className="edit-activity__members-page-ellipsis" key={`ellipsis-${idx}`}>...</span>
                    ) : (
                      <button
                        key={page}
                        className={`edit-activity__members-page-num${page === current ? ' edit-activity__members-page-num--active' : ''}`}
                        onClick={() => setCurrentPage(page)}
                        type="button"
                      >
                        {page}
                      </button>
                    ),
                  )
                })()}
              </div>
              <button
                className="edit-activity__members-page-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                type="button"
                aria-label="Next page"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        ) : null}

        {/* Load More (lazy mode — auto-triggered on scroll) */}
        {showLoadMore ? (
          <div
            className="edit-activity__members-sentinel"
            ref={sentinelRef}
            aria-hidden="true"
          >
            <span className="edit-activity__members-sentinel-dot" />
            <span className="edit-activity__members-sentinel-dot" />
            <span className="edit-activity__members-sentinel-dot" />
          </div>
        ) : memberViewMode === 'lazy' && filteredCount > 0 ? (
          <div className="edit-activity__members-sentinel--done" aria-hidden="true">
            <Check size={13} />
            <span>All {filteredCount} member{filteredCount !== 1 ? 's' : ''} loaded</span>
          </div>
        ) : null}

        {/* Add Members Modal */}
        {renderAddMembersModal()}

        {/* Confirm Delete Member */}
        <ConfirmationDialog
          confirmLabel="Remove Member"
          danger
          description={memberToDelete ? `Are you sure you want to remove <strong>${memberToDelete.name}</strong> from this activity? This action cannot be undone.` : ''}
          isOpen={memberToDelete !== null}
          onCancel={handleCancelDeleteMember}
          onConfirm={handleConfirmDeleteMember}
          title="Remove Member"
        />
      </div>
    )
  }

  function renderAddMembersModal() {
    const selectedCount = selectedMemberIds.size
    const hasSelection = selectedCount > 0
    const selectedUsers = hasSelection
      ? MOCK_USERS.filter((u) => selectedMemberIds.has(u.id))
      : []

    return (
      <div className="edit-activity__members-modal-wrapper">
        <Modal
          actions={
            <div className="edit-activity__members-modal-actions">
              <Button onClick={handleCloseAddMembersModal} variant="secondary">
                Cancel
              </Button>
              <Button icon={<UserCheck size={16} />} onClick={handleAddSelectedMembers}>
                Add Selected Members
              </Button>
            </div>
          }
          isOpen={isAddMembersModalOpen}
          onClose={handleCloseAddMembersModal}
          title="Add Activity Members"
        >
          <div className="edit-activity__members-modal">
          {/* Filter tabs */}
          <div className="edit-activity__members-modal-filters">
            {[
              { label: 'All Users', value: 'all' as const },
              { label: 'Division Users', value: 'division' as const },
              { label: 'Non-Division Users', value: 'non-division' as const },
            ].map((filter) => {
              const filterModClass = filter.value === 'division' ? 'edit-activity__members-modal-filter--division'
                : filter.value === 'non-division' ? 'edit-activity__members-modal-filter--external'
                : ''
              return (
                <button
                  key={filter.value}
                  className={`edit-activity__members-modal-filter ${memberFilter === filter.value ? 'edit-activity__members-modal-filter--active' : ''} ${filterModClass}`}
                  onClick={() => setMemberFilter(filter.value)}
                  type="button"
                >
                  {filter.label}
                </button>
              )
            })}
          </div>

          {/* Search */}
          <div className="edit-activity__members-modal-search">
            <SearchInput
              label="Search users"
              onChange={(e) => setMemberSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              value={memberSearchQuery}
            />
          </div>

          {/* Error message */}
          {memberSelectionError ? (
            <div className="edit-activity__members-modal-error">
              <AlertCircle size={13} />
              {memberSelectionError}
            </div>
          ) : null}

          {/* Users list */}
          <div className="edit-activity__members-modal-list">
            {filteredUsers.length === 0 ? (
              <div className="edit-activity__members-modal-empty">
                {memberSearchQuery ? 'No users match your search.' : 'All users are already added to this activity.'}
              </div>
            ) : (
              filteredUsers.map((user) => (
                <label className="edit-activity__members-modal-user" key={user.id}>
                  <div className="edit-activity__members-modal-user-avatar">
                    {user.avatarUrl ? (
                      <img alt={user.name} src={user.avatarUrl} />
                    ) : (
                      <span>{user.name.split(' ').map((part) => part[0]).join('').slice(0, 2)}</span>
                    )}
                  </div>
                  <div className="edit-activity__members-modal-user-info">
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                  </div>
                  <div className="edit-activity__members-modal-user-badge">
                    <span className={`edit-activity__member-card-badge ${user.isDivisionMember ? 'edit-activity__member-card-badge--division' : 'edit-activity__member-card-badge--external'}`}>
                      {user.isDivisionMember ? 'Division' : 'External'}
                    </span>
                  </div>
                  <div className={`edit-activity__members-modal-user-check ${selectedMemberIds.has(user.id) ? 'edit-activity__members-modal-user-check--checked' : ''}`}>
                    {selectedMemberIds.has(user.id) ? <Check size={14} strokeWidth={3} /> : null}
                  </div>
                  <input
                    checked={selectedMemberIds.has(user.id)}
                    className="edit-activity__members-modal-user-input"
                    onChange={() => handleToggleUserSelection(user.id)}
                    type="checkbox"
                  />
                </label>
              ))
            )}
          </div>

          {/* Selected summary */}
          {hasSelection ? (
            <div className="edit-activity__members-modal-selected">
              <div className="edit-activity__members-modal-selected-header">
                <UserCheck size={14} />
                <span>{selectedCount} user{selectedCount > 1 ? 's' : ''} selected</span>
              </div>
              <div className="edit-activity__members-modal-selected-tags">
                {selectedUsers.slice(0, 5).map((user) => (
                  <button
                    className={`edit-activity__members-modal-selected-tag ${user.isDivisionMember ? 'edit-activity__members-modal-selected-tag--division' : 'edit-activity__members-modal-selected-tag--external'}`}
                    key={user.id}
                    onClick={() => handleToggleUserSelection(user.id)}
                    type="button"
                  >
                    {user.name}
                    <X size={11} strokeWidth={2.5} />
                  </button>
                ))}
                {selectedCount > 5 ? (
                  <span className="edit-activity__members-modal-selected-more">+{selectedCount - 5} more</span>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </Modal>
      </div>
    )
  }

  function renderTabContent() {
    switch (activeTab) {
      case 'activity-info':
        return renderActivityInfo()
      case 'members':
        return renderMembersTab()
      case 'dependencies':
        return <div className="edit-activity__placeholder">Dependencies management will appear here.</div>
      case 'milestones':
        return <div className="edit-activity__placeholder">Milestones management will appear here.</div>
      case 'procurements':
        return <div className="edit-activity__placeholder">Procurements management will appear here.</div>
      case 'engagement-plans':
        return <div className="edit-activity__placeholder">Engagement Plans management will appear here.</div>
      case 'budget':
        return <div className="edit-activity__placeholder">Budget Information form will appear here.</div>
      case 'clarifications':
        return <div className="edit-activity__placeholder">Clarifications will appear here.</div>
      case 'logs':
        return <div className="edit-activity__placeholder">Activity logs table will appear here.</div>
    }
  }

  if (isContextLoading) {
    return (
      <div className="create-activity" aria-label="Loading Edit Activity context...">
        {/* Hero header skeleton */}
        <header className="create-activity__hero create-activity__hero--skeleton" aria-hidden="true">
          <div className="edit-activity__back-row">
            <div className="skeleton-button skeleton-shimmer" style={{ width: '9rem' }} />
          </div>
          <div className="create-activity__hero-body">
            <div className="skeleton-icon-box skeleton-shimmer" />
            <div className="create-activity__hero-content">
              <div className="skeleton-line skeleton-shimmer" style={{ width: '28%', height: '0.7rem', marginBottom: '0.15rem' }} />
              <div className="skeleton-line skeleton-shimmer" style={{ width: '45%', height: '1.5rem', marginBottom: '0.15rem' }} />
              <div className="skeleton-line skeleton-shimmer" style={{ width: '55%', height: '0.85rem' }} />
            </div>
          </div>
          <div className="create-activity__hero-footer">
            <div className="create-activity__hero-chips">
              <span className="skeleton-chip skeleton-shimmer" />
              <span className="skeleton-chip skeleton-shimmer" />
              <span className="skeleton-chip skeleton-shimmer" />
            </div>
            <div className="edit-activity__actions">
              <div className="skeleton-button skeleton-shimmer" style={{ width: '7rem' }} />
              <div className="skeleton-button skeleton-shimmer" style={{ width: '6rem' }} />
            </div>
          </div>
        </header>

        {/* Stage tabs skeleton */}
        <div className="edit-activity__stages">
          <nav className="edit-activity__stage-tabs" aria-hidden="true">
            <div className="skeleton-line skeleton-shimmer" style={{ width: '100%', height: '2.35rem', borderRadius: '0.6rem' }} />
          </nav>
        </div>

        {/* Two-column layout skeleton */}
        <div className="create-activity__manual-layout">
          <div className="create-activity__manual-form">
            {/* First card skeleton */}
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
                <div className="create-activity__form-row">
                  <div className="skeleton-field">
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '30%', height: '0.7rem', marginBottom: '0.5rem' }} />
                    <div className="skeleton-radio-row">
                      <div className="skeleton-radio skeleton-shimmer" />
                      <div className="skeleton-radio skeleton-shimmer" />
                    </div>
                  </div>
                </div>
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
                <div className="create-activity__form-row">
                  <div className="skeleton-field">
                    <div className="skeleton-line skeleton-shimmer" style={{ width: '40%', height: '0.7rem', marginBottom: '0.35rem' }} />
                    <div className="skeleton-input skeleton-shimmer" />
                  </div>
                </div>
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

            {/* Second card skeleton (ADEO) */}
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
      <header className="create-activity__hero">
        <div className="edit-activity__back-row">
          <Button
            icon={<ArrowLeft size={16} />}
            onClick={() => navigate(APP_ROUTE_PATHS.activitiesList)}
            variant="secondary"
          >
            Back to Activities
          </Button>
        </div>

        <div className="create-activity__hero-body">
          <div className="create-activity__hero-icon" aria-hidden="true">
            <Edit3 size={22} />
          </div>
          <div className="create-activity__hero-content">
            <span>Edit Activity</span>
            <h1>{activityName}</h1>
            <p className="edit-activity__ai-summary">
              <Sparkles size={14} />
              {aiSummary}
            </p>
          </div>
        </div>

        <div className="create-activity__hero-footer">
          <div className="create-activity__hero-chips">
            <span className="create-activity__chip">
              <span className="create-activity__chip-label">Status</span>
              <Badge tone={getStatusTone(formatStatusCode(statusCode))}>
                {formatStatusCode(statusCode)}
              </Badge>
            </span>
            <span className="create-activity__chip">
              <span className="create-activity__chip-label">Phase</span>
              <Badge tone="info">
                {projectPhase === 776140000 ? 'Planning' : 'Execution'}
              </Badge>
            </span>
            <span className="create-activity__chip create-activity__chip--user">
              <span className="create-activity__chip-label">Pending with</span>
              <strong>
                <UserRound size={14} />
                {pendingWith}
              </strong>
            </span>
          </div>

          <div className="edit-activity__actions">
            {isDivisionMember ? (
              <Button icon={<Send size={16} />} onClick={handleSubmitToDivisionDirector}>
                Submit to Division Director
              </Button>
            ) : null}
            {isDivisionDirector ? (
              <Button icon={<HelpCircle size={16} />} onClick={handleRequestClarification} variant="secondary">
                Request Clarification
              </Button>
            ) : null}
            <Button icon={<FileText size={16} />} variant="ghost" className="edit-activity__card-btn">
              Activity Card
            </Button>
          </div>
        </div>
      </header>

      {/* Premium stage tabs */}
      <div className="edit-activity__stages">
        <nav className="edit-activity__stage-tabs" role="tablist" aria-label="Activity stages">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id

            return (
              <button
                key={tab.id}
                className={`edit-activity__stage-tab ${isActive ? 'edit-activity__stage-tab--active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                aria-selected={isActive}
                title={tab.label}
                type="button"
              >
                <Icon size={16} />
                <span className="edit-activity__stage-tab-label">{tab.shortLabel}</span>
                <span className="edit-activity__stage-tab-full">{tab.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Stage content */}
      <div className="edit-activity__stage-content" role="tabpanel">
        {renderTabContent()}
      </div>
    </div>
  )
}
