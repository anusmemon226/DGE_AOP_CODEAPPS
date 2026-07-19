import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Edit3, Handshake, LayoutGrid, List, Plus, Sparkles, Trash2 } from 'lucide-react'
import {
  Badge,
  Button,
  ConfirmationDialog,
  DatePicker,
  Input,
  MultiSelect,
  RadioGroup,
  Select,
  SideDrawer,
  Textarea,
  type SelectOption,
} from '../../components/ui'
import type { Accounts } from '../../generated/models/AccountsModel'
import type {
  Dga_aop_engagement_plans,
  Dga_aop_engagement_plansBase,
} from '../../generated/models/Dga_aop_engagement_plansModel'
import type { Dga_divisional_hierarchies } from '../../generated/models/Dga_divisional_hierarchiesModel'
import type { Dga_engagement_sub_types } from '../../generated/models/Dga_engagement_sub_typesModel'
import { AccountsService } from '../../generated/services/AccountsService'
import { Dga_aop_engagement_plansService } from '../../generated/services/Dga_aop_engagement_plansService'
import { Dga_divisional_hierarchiesService } from '../../generated/services/Dga_divisional_hierarchiesService'
import { Dga_engagement_sub_typesService } from '../../generated/services/Dga_engagement_sub_typesService'
import {
  ACTIVITY_STATUS_OPTIONS,
  ACTIVITY_STATUS_TONES,
  PUBLISH_STATUS_TONES,
} from './data/adgesData'
import { EngagementVisibilityPicker, type SectorDivision } from './components/EngagementVisibilityPicker'
import { formatDate } from './helpers/sharedHelpers'
import type { EditActivityOperationNotifier } from './types/operationAlert'

// ── Types ──

type YesNoValue = '' | '1' | '0'
type EngagementPlanPayload = Partial<Omit<Dga_aop_engagement_plansBase, 'dga_aop_engagement_planid' | 'ownerid' | 'owneridtype'>>

type EngagementLookup = {
  id: string
  label: string
  parentTypeId?: string
}

type EngagementPlan = {
  id: string
  creatorHierarchyId: string
  creatorSectorName: string
  creatorDivisionName: string
  sectorName: string
  divisionName: string
  activityName: string
  activityLeadName: string
  activitySummary: string
  engagementName: string
  engagementDescription: string
  engagementType: string
  engagementTypeName: string
  engagementSubType: string
  engagementSubTypeName: string
  activityStatus: string
  activityIncluded: YesNoValue
  publishStatus: string
  engagementVisibility: string[]
  engagementStartDate: string
  engagementEndDate: string
  requiredGRSupport: YesNoValue
  adgesInvolved: YesNoValue
  adCompanies: YesNoValue
  federalEntities: YesNoValue
  notesForGRTeam: string
  notesByGRTeam: string
  adCompaniesJustification: string
  federalEntitiesJustification: string
  selectedADGEs: string[]
}

type EngagementFormData = Omit<
  EngagementPlan,
  'id' | 'creatorHierarchyId' | 'creatorSectorName' | 'creatorDivisionName' | 'engagementTypeName' | 'engagementSubTypeName' | 'notesByGRTeam'
>
type FormErrors = Partial<Record<keyof EngagementFormData, string>>
type EngagementCapsuleTone = 'neutral' | 'info' | 'warning' | 'success' | 'error'
type EngagementReadOnlyKind = 'identity' | 'date' | 'classification' | 'requirement' | 'narrative' | 'organization' | 'person'
type EngagementTimingStatus = 'upcoming' | 'inProgress' | 'completed' | 'unscheduled'
type EngagementGroupStatus = 'no-engagements' | 'completed' | 'in-progress' | 'upcoming'

type EngagementGroupSummary = {
  completedCount: number
  inProgressCount: number
  nextEngagement: EngagementPlan | null
  progress: number
  totalCount: number
  upcomingCount: number
}

type EngagementSubTypeGroup = EngagementLookup & EngagementGroupSummary & {
  records: EngagementPlan[]
}

type EngagementTypeGroup = EngagementLookup & EngagementGroupSummary & {
  subTypes: EngagementSubTypeGroup[]
}

const ENGAGEMENT_GROUP_STATUS_LABELS: Record<EngagementGroupStatus, string> = {
  completed: 'Completed',
  'in-progress': 'In progress',
  'no-engagements': 'No engagements',
  upcoming: 'Upcoming',
}

// ── Props ──

interface EngagementPlanTabProps {
  activityLeadName: string
  activityName: string
  activityPlannedEndDate?: string
  activityPlannedStartDate?: string
  activitySummary: string
  currentHierarchyId?: string
  divisionName: string
  hierarchies: Dga_divisional_hierarchies[]
  onActivityDataChanged?: () => void
  onOperationAlert?: EditActivityOperationNotifier
  projectId: string
  selectedRole: string
  sectorName: string
}

// ── Constants ──

const EMPTY_FORM: EngagementFormData = {
  sectorName: '',
  divisionName: '',
  activityName: '',
  activityLeadName: '',
  activitySummary: '',
  engagementName: '',
  engagementDescription: '',
  engagementType: '',
  engagementSubType: '',
  activityStatus: 'planning',
  activityIncluded: '',
  publishStatus: '576610001',
  engagementVisibility: [],
  engagementStartDate: '',
  engagementEndDate: '',
  requiredGRSupport: '',
  adgesInvolved: '',
  adCompanies: '',
  federalEntities: '',
  notesForGRTeam: '',
  adCompaniesJustification: '',
  federalEntitiesJustification: '',
  selectedADGEs: [],
}

const YES_NO_OPTIONS = [
  { label: 'Yes', value: '1', className: 'choice--yes' },
  { label: 'No', value: '0', className: 'choice--no' },
] as const

const ENGAGEMENT_PLAN_SELECT_FIELDS = [
  'dga_aop_engagement_planid',
  'dga_ad_companies_justification',
  'dga_adges_involved',
  'dga_divisions',
  'dga_end_date',
  'dga_federal_entities_justification',
  'dga_include_aop_project',
  'dga_name',
  'dga_notes_by_gr_team',
  'dga_notes_for_gr_team',
  'dga_sector_or_division_of_createdby_user',
  'dga_sectors',
  'dga_selected_adges',
  'dga_start_date',
  'dga_type_of_activity',
  '_dga_aop_project_value',
  '_dga_engagement_type_value',
  '_dga_sub_type_value',
  'statecode',
  'statuscode',
]

const PUBLISH_STATUS_OPTIONS_DYNAMIC: readonly SelectOption<string>[] = [
  { label: 'Select publish status', value: '' },
  { label: 'Draft', value: '576610001' },
  { label: 'Published', value: '1' },
  { label: 'Inactive', value: '2' },
]

const PUBLISH_STATUS_TONES_DYNAMIC: Record<string, 'neutral' | 'info' | 'success' | 'warning'> = {
  '576610001': 'neutral',
  '1': 'success',
  '2': 'neutral',
}

// ── Helpers ──

function getOperationErrorMessage(result: unknown, fallbackMessage: string) {
  const error = (result as { error?: { message?: string } | string })?.error
  const message = typeof error === 'string' ? error : error?.message

  if (!message) return fallbackMessage

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

function normalizeId(id?: string | null) {
  return id?.replace(/[{}]/g, '').toLowerCase() ?? ''
}

function toDateOnly(value?: string | null) {
  if (!value) return ''
  return value.includes('T') ? value.split('T')[0] : value
}

function parseDateOnly(value?: string | null) {
  const dateOnly = toDateOnly(value)
  if (!dateOnly) return null

  const [year, month, day] = dateOnly.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  return Number.isNaN(date.getTime()) ? null : date
}

function getTodayDateOnly() {
  const today = new Date()
  return new Date(today.getFullYear(), today.getMonth(), today.getDate())
}

function getEngagementTimingStatus(plan: EngagementPlan, today = getTodayDateOnly()): EngagementTimingStatus {
  const startDate = parseDateOnly(plan.engagementStartDate)
  const endDate = parseDateOnly(plan.engagementEndDate)

  if (!startDate || !endDate) return 'unscheduled'
  if (today < startDate) return 'upcoming'
  if (today > endDate) return 'completed'
  return 'inProgress'
}

function getEngagementDateProgress(plan: EngagementPlan, today = getTodayDateOnly()) {
  const startDate = parseDateOnly(plan.engagementStartDate)
  const endDate = parseDateOnly(plan.engagementEndDate)

  if (!startDate || !endDate || endDate < startDate) return 0
  if (today < startDate) return 0
  if (today > endDate) return 100

  const durationMs = Math.max(1, endDate.getTime() - startDate.getTime())
  const elapsedMs = today.getTime() - startDate.getTime()

  return Math.min(100, Math.max(0, Math.round((elapsedMs / durationMs) * 100)))
}

function buildEngagementGroupSummary(records: EngagementPlan[], today = getTodayDateOnly()): EngagementGroupSummary {
  const timedRecords = records
    .map((record) => ({
      progress: getEngagementDateProgress(record, today),
      record,
      startDate: parseDateOnly(record.engagementStartDate),
      status: getEngagementTimingStatus(record, today),
    }))

  const activeOrUpcoming = timedRecords
    .filter((item) => item.startDate && (item.status === 'upcoming' || item.status === 'inProgress'))
    .sort((a, b) => a.startDate!.getTime() - b.startDate!.getTime())

  return {
    completedCount: timedRecords.filter((item) => item.status === 'completed').length,
    inProgressCount: timedRecords.filter((item) => item.status === 'inProgress').length,
    nextEngagement: activeOrUpcoming[0]?.record ?? null,
    progress: timedRecords.length > 0
      ? Math.round(timedRecords.reduce((sum, item) => sum + item.progress, 0) / timedRecords.length)
      : 0,
    totalCount: records.length,
    upcomingCount: timedRecords.filter((item) => item.status === 'upcoming').length,
  }
}

function toBind(entitySetName: string, id: string) {
  return `/${entitySetName}(${normalizeId(id)})`
}

function booleanToYesNo(value?: boolean | null): YesNoValue {
  if (value === true) return '1'
  if (value === false) return '0'
  return ''
}

function yesNoToBoolean(value: YesNoValue): boolean | undefined {
  if (value === '1') return true
  if (value === '0') return false
  return undefined
}

function parseCsv(value?: string | null) {
  return String(value ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

function serializeCsv(values: string[]) {
  return values.map((item) => item.trim()).filter(Boolean).join(',')
}

function formatLookupOptions(items: EngagementLookup[], placeholder: string): SelectOption<string>[] {
  return [
    { label: placeholder, value: '' },
    ...items.map((item) => ({ label: item.label, value: item.id })),
  ]
}

function getOptionLabel(options: readonly SelectOption<string>[], value: string) {
  return options.find((option) => option.value === value)?.label ?? value
}

function renderReadOnlyValue(value?: string | number | null) {
  const text = String(value ?? '').trim()
  return text || '-'
}

function renderEngagementReadOnlyDetails(items: Array<{
  label: string
  value?: string | number | null
  type?: 'long'
  kind?: EngagementReadOnlyKind
  columns?: 3 | 4 | 6 | 9 | 12
}>) {
  return (
    <dl className="create-activity__readonly-grid create-activity__readonly-grid--3">
      {items.map((item) => {
        const kind = item.kind ?? (item.type === 'long' ? 'narrative' : 'identity')
        const spanClass = item.type === 'long' ? 'create-activity__readonly-item--wide' : ''
        const columnClass = item.columns ? `create-activity__readonly-item--span-${item.columns}` : ''

        return (
          <div
            className={`create-activity__readonly-item create-activity__readonly-item--${kind} ${spanClass} ${columnClass}`.trim()}
            key={item.label}
          >
            <div className="create-activity__readonly-item-content">
              <dt>{item.label}</dt>
              <dd>{renderReadOnlyValue(item.value)}</dd>
            </div>
          </div>
        )
      })}
    </dl>
  )
}

function getAccountName(accounts: Accounts[], id: string) {
  return accounts.find((account) => normalizeId(account.accountid) === normalizeId(id))?.name ?? id
}

function getLookupName(items: EngagementLookup[], id: string, fallback?: string) {
  return items.find((item) => normalizeId(item.id) === normalizeId(id))?.label ?? fallback ?? id
}

function getCreatorHierarchyId(selectedRole: string, currentHierarchyId?: string) {
  if (
    selectedRole === 'AOP - Division Member'
    || selectedRole === 'AOP - Division Director'
    || selectedRole === 'AOP - Executive Director'
  ) {
    return currentHierarchyId ?? ''
  }

  return ''
}

function getCreatorHierarchyDisplay(
  creatorHierarchyId: string,
  hierarchies: Dga_divisional_hierarchies[],
): { sectorName: string; divisionName: string } {
  if (!creatorHierarchyId) {
    return { sectorName: '-', divisionName: '-' }
  }

  const hierarchy = hierarchies.find((item) => normalizeId(item.dga_divisional_hierarchyid) === normalizeId(creatorHierarchyId))
  if (!hierarchy) {
    return { sectorName: '-', divisionName: '-' }
  }

  if (Number(hierarchy.dga_type) === 776140001) {
    return { sectorName: hierarchy.dga_name || '-', divisionName: '-' }
  }

  const sector = hierarchy._dga_parent_divisional_hierarchy_value
    ? hierarchies.find((item) => normalizeId(item.dga_divisional_hierarchyid) === normalizeId(hierarchy._dga_parent_divisional_hierarchy_value))
    : undefined

  if (Number(hierarchy.dga_type) === 776140002) {
    return {
      sectorName: sector?.dga_name || '-',
      divisionName: hierarchy.dga_name || '-',
    }
  }

  return { sectorName: '-', divisionName: '-' }
}

function buildSectorDivisionTree(records: Dga_divisional_hierarchies[], govDigitalId: string): SectorDivision[] {
  const sectors = records
    .filter((record) =>
      record.dga_type === 776140001
      && normalizeId(record._dga_parent_divisional_hierarchy_value) === normalizeId(govDigitalId),
    )
    .sort((a, b) => (a.dga_name || '').localeCompare(b.dga_name || ''))

  return sectors.map((sector) => ({
    sectorId: sector.dga_divisional_hierarchyid,
    sectorName: sector.dga_name,
    divisions: records
      .filter((record) =>
        record.dga_type === 776140002
        && normalizeId(record._dga_parent_divisional_hierarchy_value) === normalizeId(sector.dga_divisional_hierarchyid),
      )
      .sort((a, b) => (a.dga_name || '').localeCompare(b.dga_name || ''))
      .map((division) => ({
        divisionId: division.dga_divisional_hierarchyid,
        divisionName: division.dga_name,
      })),
  }))
}

function mapSubtypeLookup(record: Dga_engagement_sub_types): EngagementLookup | null {
  if (!record.dga_engagement_sub_typeid) return null

  return {
    id: record.dga_engagement_sub_typeid,
    label: record.dga_name || 'Unnamed engagement option',
    parentTypeId: record._dga_parent_type_value,
  }
}

function mapEngagementPlan(
  row: Dga_aop_engagement_plans,
  context: Pick<EngagementPlanTabProps, 'activityLeadName' | 'activityName' | 'activitySummary' | 'divisionName' | 'sectorName'>,
  engagementTypes: EngagementLookup[],
  engagementSubTypes: EngagementLookup[],
  hierarchies: Dga_divisional_hierarchies[],
): EngagementPlan | null {
  if (!row.dga_aop_engagement_planid) return null

  const engagementType = row._dga_engagement_type_value ?? ''
  const engagementSubType = row._dga_sub_type_value ?? ''
  const selectedADGEs = parseCsv(row.dga_selected_adges)
  const sectors = parseCsv(row.dga_sectors)
  const divisions = parseCsv(row.dga_divisions)
  const activityIncluded = booleanToYesNo(row.dga_include_aop_project)
  const adgesInvolved = booleanToYesNo(row.dga_adges_involved)
  const creatorHierarchyId = row.dga_sector_or_division_of_createdby_user ?? ''
  const creatorDisplay = getCreatorHierarchyDisplay(creatorHierarchyId, hierarchies)

  return {
    id: row.dga_aop_engagement_planid,
    creatorHierarchyId,
    creatorSectorName: creatorDisplay.sectorName,
    creatorDivisionName: creatorDisplay.divisionName,
    sectorName: context.sectorName,
    divisionName: context.divisionName,
    activityName: context.activityName,
    activityLeadName: context.activityLeadName,
    activitySummary: context.activitySummary,
    engagementName: row.dga_name ?? '',
    engagementDescription: row.dga_type_of_activity ?? '',
    engagementType,
    engagementTypeName: getLookupName(engagementTypes, engagementType),
    engagementSubType,
    engagementSubTypeName: getLookupName(engagementSubTypes, engagementSubType),
    activityStatus: 'planning',
    activityIncluded,
    publishStatus: String(row.statuscode ?? '576610001'),
    engagementVisibility: [...sectors, ...divisions],
    engagementStartDate: row.dga_start_date ?? '',
    engagementEndDate: row.dga_end_date ?? '',
    requiredGRSupport: row.dga_notes_for_gr_team ? '1' : '0',
    adgesInvolved,
    adCompanies: row.dga_ad_companies_justification ? '1' : '0',
    federalEntities: row.dga_federal_entities_justification ? '1' : '0',
    notesForGRTeam: row.dga_notes_for_gr_team ?? '',
    notesByGRTeam: row.dga_notes_by_gr_team ?? '',
    adCompaniesJustification: row.dga_ad_companies_justification ?? '',
    federalEntitiesJustification: row.dga_federal_entities_justification ?? '',
    selectedADGEs,
  }
}

function buildEngagementPayload(
  form: EngagementFormData,
  projectId?: string,
  sectorDivisions: SectorDivision[] = [],
  creatorHierarchyId = '',
): EngagementPlanPayload {
  const sectorIdSet = new Set(sectorDivisions.map((sector) => normalizeId(sector.sectorId)))
  const divisionIdSet = new Set(sectorDivisions.flatMap((sector) => sector.divisions.map((division) => normalizeId(division.divisionId))))
  const sectorIds = form.engagementVisibility.filter((value) => sectorIdSet.has(normalizeId(value)))
  const divisionIds = form.engagementVisibility.filter((value) => divisionIdSet.has(normalizeId(value)))
  const payload: EngagementPlanPayload = {
    dga_ad_companies_justification: form.adCompanies === '1' ? form.adCompaniesJustification : '',
    dga_adges_involved: yesNoToBoolean(form.adgesInvolved),
    dga_divisions: serializeCsv(divisionIds),
    dga_end_date: form.engagementEndDate,
    dga_federal_entities_justification: form.federalEntities === '1' ? form.federalEntitiesJustification : '',
    dga_include_aop_project: yesNoToBoolean(form.activityIncluded),
    dga_name: form.engagementName,
    dga_notes_for_gr_team: form.requiredGRSupport === '1' ? form.notesForGRTeam : '',
    dga_sector_or_division_of_createdby_user: creatorHierarchyId,
    dga_sectors: serializeCsv(sectorIds),
    dga_selected_adges: form.adgesInvolved === '1' ? serializeCsv(form.selectedADGEs) : '',
    dga_start_date: form.engagementStartDate,
    dga_type_of_activity: form.engagementDescription,
    statecode: 0,
    statuscode: Number(form.publishStatus || 576610001) as Dga_aop_engagement_plansBase['statuscode'],
  }

  if (projectId) {
    payload['dga_aop_project@odata.bind'] = toBind('dga_aop_projectses', projectId)
  }

  if (form.engagementType) {
    payload['dga_engagement_type@odata.bind'] = toBind('dga_engagement_sub_types', form.engagementType)
  }

  if (form.engagementSubType) {
    payload['dga_sub_type@odata.bind'] = toBind('dga_engagement_sub_types', form.engagementSubType)
  }

  return payload
}

// ── Component ──

export function EngagementPlanTab({
  sectorName,
  divisionName,
  activityName: actName,
  activityLeadName,
  activityPlannedEndDate,
  activityPlannedStartDate,
  activitySummary,
  currentHierarchyId,
  hierarchies,
  onActivityDataChanged,
  onOperationAlert,
  projectId,
  selectedRole,
}: EngagementPlanTabProps) {
  const uid = useId()

  const [engagementPlans, setEngagementPlans] = useState<EngagementPlan[]>([])
  const [engagementTypes, setEngagementTypes] = useState<EngagementLookup[]>([])
  const [engagementSubTypes, setEngagementSubTypes] = useState<EngagementLookup[]>([])
  const [accounts, setAccounts] = useState<Accounts[]>([])
  const [sectorDivisions, setSectorDivisions] = useState<SectorDivision[]>([])
  const [isLookupLoading, setIsLookupLoading] = useState(false)
  const [isPlansLoading, setIsPlansLoading] = useState(false)
  const [hasLoadedLookups, setHasLoadedLookups] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState<'type' | 'list'>('type')
  const [expandedEngagementTypeId, setExpandedEngagementTypeId] = useState<string | null>(null)
  const [expandedEngagementSubTypeId, setExpandedEngagementSubTypeId] = useState<string | null>(null)

  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<EngagementPlan | null>(null)
  const [form, setForm] = useState<EngagementFormData>(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [planToDelete, setPlanToDelete] = useState<EngagementPlan | null>(null)

  const isGRSupportYes = form.requiredGRSupport === '1'
  const isADGEsInvolvedYes = form.adgesInvolved === '1'
  const isADCompaniesYes = form.adCompanies === '1'
  const isFederalEntitiesYes = form.federalEntities === '1'
  const activityStartDate = toDateOnly(activityPlannedStartDate)
  const activityEndDate = toDateOnly(activityPlannedEndDate)
  const creatorHierarchyId = getCreatorHierarchyId(selectedRole, currentHierarchyId)

  const context = useMemo(() => ({
    activityLeadName,
    activityName: actName,
    activitySummary,
    divisionName,
    sectorName,
  }), [actName, activityLeadName, activitySummary, divisionName, sectorName])

  const engagementTypeOptions = useMemo(
    () => formatLookupOptions(engagementTypes, 'Select engagement type'),
    [engagementTypes],
  )

  const engagementSubTypeOptions = useMemo(() => {
    const selectedTypeId = normalizeId(form.engagementType)
    const filtered = engagementSubTypes.filter((subType) => normalizeId(subType.parentTypeId) === selectedTypeId)
    return formatLookupOptions(filtered, form.engagementType ? 'Select engagement sub-type' : 'Select engagement type first')
  }, [engagementSubTypes, form.engagementType])

  const adgeOptions = useMemo<SelectOption<string>[]>(() => accounts
    .filter((account) => account.accountid && account.name)
    .map((account) => ({ label: account.name, value: account.accountid })), [accounts])

  const engagementTypeGroups = useMemo<EngagementTypeGroup[]>(() => {
    const today = getTodayDateOnly()

    return engagementTypes.map((type) => {
      const typeRecords = engagementPlans.filter((plan) => normalizeId(plan.engagementType) === normalizeId(type.id))
      const subTypes = engagementSubTypes
        .filter((subType) => normalizeId(subType.parentTypeId) === normalizeId(type.id))
        .map((subType) => {
          const records = typeRecords.filter((plan) => normalizeId(plan.engagementSubType) === normalizeId(subType.id))

          return {
            ...subType,
            ...buildEngagementGroupSummary(records, today),
            records,
          }
        })

      return {
        ...type,
        ...buildEngagementGroupSummary(typeRecords, today),
        subTypes,
      }
    })
  }, [engagementPlans, engagementSubTypes, engagementTypes])

  const loadLookups = useCallback(async () => {
    setIsLookupLoading(true)
    setHasLoadedLookups(false)
    setError('')

    try {
      const [typesResult, subTypesResult, accountsResult, hierarchyResult] = await Promise.all([
        Dga_engagement_sub_typesService.getAll({
          select: ['dga_engagement_sub_typeid', 'dga_name', 'dga_category', 'statecode', 'statuscode'],
          filter: 'statecode eq 0 and dga_category eq 1',
          orderBy: ['dga_name asc'],
        }),
        Dga_engagement_sub_typesService.getAll({
          select: [
            'dga_engagement_sub_typeid',
            'dga_name',
            'dga_category',
            '_dga_parent_type_value',
            'statecode',
            'statuscode',
          ],
          filter: 'statecode eq 0 and dga_category eq 2',
          orderBy: ['dga_name asc'],
        }),
        AccountsService.getAll({
          select: ['accountid', 'name', 'statecode', 'statuscode'],
          filter: 'statecode eq 0',
          orderBy: ['name asc'],
        }),
        Dga_divisional_hierarchiesService.getAll({
          select: [
            'dga_divisional_hierarchyid',
            'dga_name',
            'dga_type',
            '_dga_parent_divisional_hierarchy_value',
            'statecode',
            'statuscode',
          ],
          filter: "statecode eq 0 and (dga_name eq 'GovDigital' or dga_type eq 776140001 or dga_type eq 776140002)",
          orderBy: ['dga_type asc', 'dga_name asc'],
        }),
      ])

      assertOperationSuccess(typesResult, 'Unable to load engagement types.')
      assertOperationSuccess(subTypesResult, 'Unable to load engagement sub-types.')
      assertOperationSuccess(accountsResult, 'Unable to load ADGE accounts.')
      assertOperationSuccess(hierarchyResult, 'Unable to load engagement visibility hierarchy.')

      const hierarchies = (hierarchyResult.data ?? []) as Dga_divisional_hierarchies[]
      const govDigital = hierarchies.find((item) => item.dga_name?.trim().toLowerCase() === 'govdigital')

      setEngagementTypes(((typesResult.data ?? []) as Dga_engagement_sub_types[])
        .map(mapSubtypeLookup)
        .filter((item): item is EngagementLookup => Boolean(item)))
      setEngagementSubTypes(((subTypesResult.data ?? []) as Dga_engagement_sub_types[])
        .map(mapSubtypeLookup)
        .filter((item): item is EngagementLookup => Boolean(item)))
      setAccounts((accountsResult.data ?? []) as Accounts[])
      setSectorDivisions(govDigital ? buildSectorDivisionTree(hierarchies, govDigital.dga_divisional_hierarchyid) : [])
      setHasLoadedLookups(true)
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : 'Unable to load engagement lookups.')
    } finally {
      setIsLookupLoading(false)
    }
  }, [])

  const loadEngagementPlans = useCallback(async () => {
    if (!projectId) {
      setError('Activity id is missing from the edit URL.')
      setEngagementPlans([])
      return
    }

    setIsPlansLoading(true)
    setError('')

    try {
      const result = await Dga_aop_engagement_plansService.getAll({
        select: ENGAGEMENT_PLAN_SELECT_FIELDS,
        filter: `_dga_aop_project_value eq ${normalizeId(projectId)}`,
        orderBy: ['createdon desc'],
      })

      assertOperationSuccess(result, 'Unable to load engagement plans.')

      const mapped = (result.data ?? [])
        .map((row) => mapEngagementPlan(row as Dga_aop_engagement_plans, context, engagementTypes, engagementSubTypes, hierarchies))
        .filter((row): row is EngagementPlan => Boolean(row))

      setEngagementPlans(mapped)
    } catch (plansError) {
      setError(plansError instanceof Error ? plansError.message : 'Unable to load engagement plans.')
      setEngagementPlans([])
    } finally {
      setIsPlansLoading(false)
    }
  }, [context, engagementSubTypes, engagementTypes, hierarchies, projectId])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadLookups()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadLookups])

  useEffect(() => {
    if (!hasLoadedLookups || isLookupLoading) return undefined

    const timeoutId = window.setTimeout(() => {
      void loadEngagementPlans()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [hasLoadedLookups, isLookupLoading, loadEngagementPlans])

  const gridColumns = [
    {
      key: 'engagementName',
      header: 'Engagement Name',
      render: (row: EngagementPlan) => (
        <button
          className="edit-activity__engagement-name-btn"
          onClick={() => handleOpenEdit(row)}
          type="button"
        >
          <span className="edit-activity__engagement-name">{row.engagementName}</span>
        </button>
      ),
    },
    {
      key: 'sectors',
      header: 'Sectors',
      render: (row: EngagementPlan) => {
        return (
          <div className="edit-activity__engagement-grid-cells">
            {row.creatorSectorName !== '-' ? row.creatorSectorName : <span className="edit-activity__engagement-na">—</span>}
          </div>
        )
      },
    },
    {
      key: 'divisions',
      header: 'Divisions',
      render: (row: EngagementPlan) => {
        return (
          <div className="edit-activity__engagement-grid-cells">
            {row.creatorDivisionName !== '-' ? row.creatorDivisionName : <span className="edit-activity__engagement-na">—</span>}
          </div>
        )
      },
    },
    {
      key: 'engagementDescription',
      header: 'Engagement Description',
      render: (row: EngagementPlan) => (
        <span className="edit-activity__engagement-cell-desc">{row.engagementDescription}</span>
      ),
    },
    {
      key: 'engagementType',
      header: 'Type',
      render: (row: EngagementPlan) => <Badge tone="info">{row.engagementTypeName}</Badge>,
    },
    {
      key: 'engagementSubType',
      header: 'Sub-Type',
      render: (row: EngagementPlan) => <Badge tone="neutral">{row.engagementSubTypeName}</Badge>,
    },
    {
      key: 'activityStatus',
      header: 'Activity Status',
      render: (row: EngagementPlan) => (
        <Badge tone={ACTIVITY_STATUS_TONES[row.activityStatus] ?? 'neutral'}>
          {getOptionLabel(ACTIVITY_STATUS_OPTIONS, row.activityStatus)}
        </Badge>
      ),
    },
    {
      key: 'activityIncluded',
      header: 'Activity Included',
      render: (row: EngagementPlan) => (
        <Badge tone={row.activityIncluded === '1' ? 'success' : 'neutral'}>
          {row.activityIncluded === '1' ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      key: 'publishStatus',
      header: 'Publish Status',
      render: (row: EngagementPlan) => (
        <Badge tone={PUBLISH_STATUS_TONES_DYNAMIC[row.publishStatus] ?? PUBLISH_STATUS_TONES[row.publishStatus] ?? 'neutral'}>
          {getOptionLabel(PUBLISH_STATUS_OPTIONS_DYNAMIC, row.publishStatus)}
        </Badge>
      ),
    },
    {
      key: 'adgesInvolved',
      header: 'ADGEs',
      render: (row: EngagementPlan) => (
        <Badge tone={row.adgesInvolved === '1' ? 'success' : 'neutral'}>
          {row.adgesInvolved === '1' ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: EngagementPlan) => (
        <div className="edit-activity__engagement-actions">
          <button
            aria-label="Edit engagement plan"
            className="edit-activity__engagement-action-btn"
            onClick={() => handleOpenEdit(row)}
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            aria-label="Delete engagement plan"
            className="edit-activity__engagement-action-btn edit-activity__engagement-action-btn--danger"
            onClick={() => setPlanToDelete(row)}
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      ),
    },
  ] as const

  function getEngagementCapsuleToneClass(tone: EngagementCapsuleTone) {
    return `edit-activity__procurement-capsule edit-activity__procurement-capsule--${tone}`
  }

  function renderEngagementCapsule(label: string, tone: EngagementCapsuleTone) {
    return (
      <span className={`${getEngagementCapsuleToneClass(tone)} edit-activity__engagement-list-capsule`}>
        {label || '-'}
      </span>
    )
  }

  function handleFieldChange(fields: Partial<EngagementFormData>) {
    const next = { ...form, ...fields }

    if (fields.engagementType !== undefined) {
      next.engagementSubType = ''
    }

    if (fields.requiredGRSupport === '0') {
      next.notesForGRTeam = ''
    }

    if (fields.adgesInvolved === '0') {
      next.selectedADGEs = []
    }

    if (fields.adCompanies === '0') {
      next.adCompaniesJustification = ''
    }

    if (fields.federalEntities === '0') {
      next.federalEntitiesJustification = ''
    }

    setForm(next)

    setFormErrors((prev) => {
      const copy = { ...prev }
      Object.keys(fields).forEach((key) => delete copy[key as keyof EngagementFormData])
      if (fields.engagementType !== undefined) delete copy.engagementSubType

      if (fields.engagementStartDate !== undefined || fields.engagementEndDate !== undefined) {
        const startDate = fields.engagementStartDate ?? next.engagementStartDate
        const endDate = fields.engagementEndDate ?? next.engagementEndDate

        if (startDate && activityStartDate && startDate < activityStartDate) {
          copy.engagementStartDate = 'Start date must be on or after the activity start date.'
        } else if (startDate && activityEndDate && startDate > activityEndDate) {
          copy.engagementStartDate = 'Start date must be on or before the activity end date.'
        }

        if (endDate && activityStartDate && endDate < activityStartDate) {
          copy.engagementEndDate = 'End date must be on or after the activity start date.'
        } else if (endDate && activityEndDate && endDate > activityEndDate) {
          copy.engagementEndDate = 'End date must be on or before the activity end date.'
        } else if (startDate && endDate && startDate > endDate) {
          copy.engagementEndDate = 'End date must be on or after the engagement start date.'
        }
      }

      return copy
    })
  }

  function handleOpenCreate() {
    setEditingPlan(null)
    setForm({
      ...EMPTY_FORM,
      sectorName,
      divisionName,
      activityName: actName,
      activityLeadName,
      activitySummary,
    })
    setFormErrors({})
    setIsDrawerOpen(true)
  }

  function handleOpenEdit(plan: EngagementPlan) {
    setEditingPlan(plan)
    setForm({
      sectorName: plan.sectorName,
      divisionName: plan.divisionName,
      activityName: plan.activityName,
      activityLeadName: plan.activityLeadName,
      activitySummary: plan.activitySummary,
      engagementName: plan.engagementName,
      engagementDescription: plan.engagementDescription,
      engagementType: plan.engagementType,
      engagementSubType: plan.engagementSubType,
      activityStatus: plan.activityStatus,
      activityIncluded: plan.activityIncluded,
      publishStatus: plan.publishStatus,
      engagementVisibility: [...plan.engagementVisibility],
      engagementStartDate: plan.engagementStartDate,
      engagementEndDate: plan.engagementEndDate,
      requiredGRSupport: plan.requiredGRSupport,
      adgesInvolved: plan.adgesInvolved,
      adCompanies: plan.adCompanies,
      federalEntities: plan.federalEntities,
      notesForGRTeam: plan.notesForGRTeam,
      adCompaniesJustification: plan.adCompaniesJustification,
      federalEntitiesJustification: plan.federalEntitiesJustification,
      selectedADGEs: [...plan.selectedADGEs],
    })
    setFormErrors({})
    setIsDrawerOpen(true)
  }

  function handleCloseDrawer() {
    if (isSaving) return
    setIsDrawerOpen(false)
    setEditingPlan(null)
    setForm(EMPTY_FORM)
    setFormErrors({})
  }

  function validate(): boolean {
    const errs: FormErrors = {}

    if (!projectId) errs.activityName = 'Activity id is missing from the edit URL.'
    if (!form.engagementName.trim()) errs.engagementName = 'Engagement name is required.'
    if (!form.engagementDescription.trim()) errs.engagementDescription = 'Engagement description is required.'
    if (!form.engagementType) errs.engagementType = 'Select engagement type.'
    if (!form.engagementSubType) errs.engagementSubType = 'Select engagement sub-type.'
    if (form.engagementVisibility.length === 0) errs.engagementVisibility = 'Select at least one sector or division.'
    if (!form.engagementStartDate) errs.engagementStartDate = 'Start date is required.'
    if (!form.engagementEndDate) errs.engagementEndDate = 'End date is required.'
    if (form.engagementStartDate && activityStartDate && form.engagementStartDate < activityStartDate) {
      errs.engagementStartDate = 'Start date must be on or after the activity start date.'
    }
    if (form.engagementStartDate && activityEndDate && form.engagementStartDate > activityEndDate) {
      errs.engagementStartDate = 'Start date must be on or before the activity end date.'
    }
    if (form.engagementEndDate && activityStartDate && form.engagementEndDate < activityStartDate) {
      errs.engagementEndDate = 'End date must be on or after the activity start date.'
    }
    if (form.engagementEndDate && activityEndDate && form.engagementEndDate > activityEndDate) {
      errs.engagementEndDate = 'End date must be on or before the activity end date.'
    }
    if (form.engagementStartDate && form.engagementEndDate && form.engagementStartDate > form.engagementEndDate) {
      errs.engagementEndDate = 'End date must be on or after the engagement start date.'
    }
    if (!form.requiredGRSupport) errs.requiredGRSupport = 'Select required GR support.'
    if (!form.adgesInvolved) errs.adgesInvolved = 'Select ADGEs involved.'
    if (!form.adCompanies) errs.adCompanies = 'Select AD companies.'
    if (!form.federalEntities) errs.federalEntities = 'Select federal entities.'
    if (isGRSupportYes && !form.notesForGRTeam.trim()) errs.notesForGRTeam = 'Notes for GR team are required.'
    if (isADCompaniesYes && !form.adCompaniesJustification.trim()) {
      errs.adCompaniesJustification = 'AD companies justification is required.'
    }
    if (isFederalEntitiesYes && !form.federalEntitiesJustification.trim()) {
      errs.federalEntitiesJustification = 'Federal entities justification is required.'
    }
    if (isADGEsInvolvedYes && form.selectedADGEs.length === 0) {
      errs.selectedADGEs = 'Select at least one ADGE.'
    }

    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function handleSave() {
    if (!validate() || isSaving) return

    setIsSaving(true)
    setError('')
    onOperationAlert?.({
      kind: 'processing',
      title: editingPlan ? 'Updating engagement plan' : 'Creating engagement plan',
    })

    try {
      if (editingPlan) {
        const result = await Dga_aop_engagement_plansService.update(
          editingPlan.id,
          buildEngagementPayload(form, undefined, sectorDivisions, creatorHierarchyId) as Partial<Omit<Dga_aop_engagement_plansBase, 'dga_aop_engagement_planid'>>,
        )
        assertOperationSuccess(result, 'Unable to update engagement plan.')
        onOperationAlert?.({
          kind: 'success',
          message: 'Engagement plan updated successfully.',
          title: 'Engagement plan updated',
        })
      } else {
        const result = await Dga_aop_engagement_plansService.create(
          buildEngagementPayload(form, projectId, sectorDivisions, creatorHierarchyId) as Omit<Dga_aop_engagement_plansBase, 'dga_aop_engagement_planid'>,
        )
        assertOperationSuccess(result, 'Unable to create engagement plan.')
        onOperationAlert?.({
          kind: 'success',
          message: 'Engagement plan created successfully.',
          title: 'Engagement plan created',
        })
      }

      handleCloseDrawer()
      await loadEngagementPlans()
      onActivityDataChanged?.()
    } catch (saveError) {
      onOperationAlert?.({
        kind: 'error',
        message: saveError instanceof Error ? saveError.message : 'Unable to save engagement plan.',
        title: 'Engagement plan was not saved',
      })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleConfirmDelete() {
    if (!planToDelete || isDeleting) return

    setIsDeleting(true)
    setError('')
    onOperationAlert?.({ kind: 'processing', title: 'Deleting engagement plan' })

    try {
      await Dga_aop_engagement_plansService.delete(planToDelete.id)
      setPlanToDelete(null)
      onOperationAlert?.({
        kind: 'success',
        message: 'Engagement plan deleted successfully.',
        title: 'Engagement plan deleted',
      })
      await loadEngagementPlans()
      onActivityDataChanged?.()
    } catch (deleteError) {
      onOperationAlert?.({
        kind: 'error',
        message: deleteError instanceof Error ? deleteError.message : 'Unable to delete engagement plan.',
        title: 'Engagement plan was not deleted',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  function renderAutoPopulatedFields() {
    return (
      <div className="edit-activity__procurement-section edit-activity__procurement-drawer-card">
        <div className="create-activity__section-header edit-activity__procurement-drawer-header">
          <div className="create-activity__section-header-inner">
            <span className="create-activity__section-header-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            <div>
              <h2>Activity Information</h2>
              <p>Review the activity context linked to this engagement plan.</p>
            </div>
          </div>
        </div>
        <div className="create-activity__readonly-panel edit-activity__procurement-drawer-readonly">
          {renderEngagementReadOnlyDetails([
            { label: 'Sector', value: form.sectorName, kind: 'organization', columns: 6 },
            { label: 'Division', value: form.divisionName, kind: 'organization', columns: 6 },
            { label: 'Activity Name', value: form.activityName, kind: 'identity', columns: 6 },
            { label: 'Activity Lead', value: form.activityLeadName, kind: 'person', columns: 6 },
            { label: 'Activity Summary', value: form.activitySummary, type: 'long', kind: 'narrative', columns: 12 },
          ])}
        </div>
      </div>
    )
  }

  function renderEngagementDetails() {
    return (
      <div className="edit-activity__procurement-section edit-activity__procurement-drawer-card">
        <div className="create-activity__section-header edit-activity__procurement-drawer-header">
          <div className="create-activity__section-header-inner">
            <span className="create-activity__section-header-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </span>
            <div>
              <h2>Engagement Information</h2>
              <p>Define the engagement name, description, type, and sub-type.</p>
            </div>
          </div>
        </div>
        <div className="edit-activity__procurement-drawer-section">
          <Input
            error={formErrors.engagementName}
            label="Engagement Name"
            onChange={(e) => handleFieldChange({ engagementName: e.target.value })}
            required
            value={form.engagementName}
          />

          <Textarea
            error={formErrors.engagementDescription}
            label="Engagement Description"
            onChange={(e) => handleFieldChange({ engagementDescription: e.target.value })}
            required
            rows={3}
            value={form.engagementDescription}
          />

          <div className="create-activity__form-row create-activity__form-row--two">
            <Select
              error={formErrors.engagementType}
              id={`${uid}-engagement-type`}
              label="Engagement Type"
              onChange={(value) => handleFieldChange({ engagementType: value })}
              options={engagementTypeOptions}
              required
              value={form.engagementType}
            />
            <Select
              error={formErrors.engagementSubType}
              id={`${uid}-engagement-sub-type`}
              label="Engagement Sub-Type"
              onChange={(value) => handleFieldChange({ engagementSubType: value })}
              options={engagementSubTypeOptions}
              required
              value={form.engagementSubType}
            />
          </div>
        </div>
      </div>
    )
  }

  function renderEngagementVisibility() {
    return (
      <div className="edit-activity__procurement-section edit-activity__procurement-drawer-card">
        <div className="create-activity__section-header edit-activity__procurement-drawer-header">
          <div className="create-activity__section-header-inner">
            <span className="create-activity__section-header-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </span>
            <div>
              <h2>Sectors & Divisions</h2>
              <p>Select the sectors and divisions that can view this engagement plan.</p>
            </div>
          </div>
        </div>
        <div className="edit-activity__procurement-drawer-section">
          <EngagementVisibilityPicker
            error={formErrors.engagementVisibility}
            label="Engagement Visibility"
            onChange={(value) => handleFieldChange({ engagementVisibility: value })}
            required
            sectorDivisions={sectorDivisions}
            value={form.engagementVisibility}
          />
        </div>
      </div>
    )
  }

  function renderTimelineAndSupport() {
    return (
      <div className="edit-activity__procurement-section edit-activity__procurement-drawer-card">
        <div className="create-activity__section-header edit-activity__procurement-drawer-header">
          <div className="create-activity__section-header-inner">
            <span className="create-activity__section-header-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </span>
            <div>
              <h2>Engagement Period</h2>
              <p>Set the engagement dates and GR support notes.</p>
            </div>
          </div>
        </div>
        <div className="edit-activity__procurement-drawer-section">
          <div className="create-activity__date-range">
            <DatePicker
              error={formErrors.engagementStartDate}
              id={`${uid}-start-date`}
              label="Engagement Start Date"
              max={activityEndDate || undefined}
              min={activityStartDate || undefined}
              onChange={(value) => handleFieldChange({ engagementStartDate: value })}
              required
              value={form.engagementStartDate}
            />
            <span className="create-activity__date-connector" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 5l7 7-7 7"/>
              </svg>
            </span>
            <DatePicker
              error={formErrors.engagementEndDate}
              id={`${uid}-end-date`}
              label="Engagement End Date"
              max={activityEndDate || undefined}
              min={form.engagementStartDate || activityStartDate || undefined}
              onChange={(value) => handleFieldChange({ engagementEndDate: value })}
              required
              value={form.engagementEndDate}
            />
          </div>

          <RadioGroup
            className="radio-group--gr-support"
            error={formErrors.requiredGRSupport}
            label="Required GR Support"
            name={`${uid}-gr-support`}
            onChange={(value) => handleFieldChange({ requiredGRSupport: value as YesNoValue })}
            options={YES_NO_OPTIONS}
            required
            value={form.requiredGRSupport}
          />

          <Textarea
            error={formErrors.notesForGRTeam}
            label="Notes for GR Team"
            onChange={(e) => handleFieldChange({ notesForGRTeam: e.target.value })}
            required={isGRSupportYes}
            rows={3}
            value={form.notesForGRTeam}
          />
        </div>
      </div>
    )
  }

  function renderADGEsAndEntities() {
    return (
      <div className="edit-activity__procurement-section edit-activity__procurement-drawer-card">
        <div className="create-activity__section-header edit-activity__procurement-drawer-header">
          <div className="create-activity__section-header-inner">
            <span className="create-activity__section-header-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </span>
            <div>
              <h2>Involvement Details</h2>
              <p>Capture ADGE, AD company, and federal entity involvement.</p>
            </div>
          </div>
        </div>
        <div className="edit-activity__procurement-drawer-section">
          <RadioGroup
            className="radio-group--adges"
            error={formErrors.adgesInvolved}
            label="ADGEs Involved"
            name={`${uid}-adges-involved`}
            onChange={(value) => handleFieldChange({ adgesInvolved: value as YesNoValue })}
            options={YES_NO_OPTIONS}
            required
            value={form.adgesInvolved}
          />
          {isADGEsInvolvedYes ? (
            <>
              <MultiSelect
                error={formErrors.selectedADGEs}
                id={`${uid}-select-adges`}
                label="Select ADGEs"
                onChange={(value) => handleFieldChange({ selectedADGEs: value })}
                options={adgeOptions}
                placeholder={isLookupLoading ? 'Loading ADGEs...' : 'Search and select ADGEs...'}
                required
                selectionDisplay="count"
                value={form.selectedADGEs}
              />
              {form.selectedADGEs.length > 0 ? (
                <div className="edit-activity__engagement-adges-capsules">
                  {form.selectedADGEs.map((adgeId) => {
                    const label = getAccountName(accounts, adgeId)
                    return (
                      <span
                        className="edit-activity__engagement-adges-capsule"
                        key={adgeId}
                        onClick={() => {
                          handleFieldChange({
                            selectedADGEs: form.selectedADGEs.filter((v) => v !== adgeId),
                          })
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            handleFieldChange({
                              selectedADGEs: form.selectedADGEs.filter((v) => v !== adgeId),
                            })
                          }
                        }}
                      >
                        {label}
                        <span className="edit-activity__engagement-adges-capsule-remove" aria-hidden="true">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </span>
                      </span>
                    )
                  })}
                </div>
              ) : null}
            </>
          ) : null}

          <RadioGroup
            className="radio-group--ad-companies"
            error={formErrors.adCompanies}
            label="AD Companies"
            name={`${uid}-ad-companies`}
            onChange={(value) => handleFieldChange({ adCompanies: value as YesNoValue })}
            options={YES_NO_OPTIONS}
            required
            value={form.adCompanies}
          />
          <Textarea
            error={formErrors.adCompaniesJustification}
            label="AD Companies Justification"
            onChange={(e) => handleFieldChange({ adCompaniesJustification: e.target.value })}
            required={isADCompaniesYes}
            rows={3}
            value={form.adCompaniesJustification}
          />

          <RadioGroup
            className="radio-group--fed-entities"
            error={formErrors.federalEntities}
            label="Federal Entities"
            name={`${uid}-fed-entities`}
            onChange={(value) => handleFieldChange({ federalEntities: value as YesNoValue })}
            options={YES_NO_OPTIONS}
            required
            value={form.federalEntities}
          />
          <Textarea
            error={formErrors.federalEntitiesJustification}
            label="Federal Entities Justification"
            onChange={(e) => handleFieldChange({ federalEntitiesJustification: e.target.value })}
            required={isFederalEntitiesYes}
            rows={3}
            value={form.federalEntitiesJustification}
          />
        </div>
      </div>
    )
  }

  function renderEngagementGridForLaterUse() {
    return (
      <div className="data-grid">
        <table>
          <thead>
            <tr>
              {gridColumns.map((col) => (
                <th key={col.key}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {engagementPlans.map((row) => (
              <tr key={row.id}>
                {gridColumns.map((col) => (
                  <td key={col.key}>{col.render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  function toggleEngagementType(typeId: string) {
    setExpandedEngagementTypeId((current) => {
      const nextTypeId = current === typeId ? null : typeId
      if (nextTypeId !== current) {
        setExpandedEngagementSubTypeId(null)
      }
      return nextTypeId
    })
  }

  function toggleEngagementSubType(subTypeId: string) {
    setExpandedEngagementSubTypeId((current) => current === subTypeId ? null : subTypeId)
  }

  function getEngagementGroupStatus(summary: EngagementGroupSummary): EngagementGroupStatus {
    if (summary.totalCount === 0) return 'no-engagements'
    if (summary.completedCount === summary.totalCount) return 'completed'
    if (summary.inProgressCount > 0) return 'in-progress'
    return 'upcoming'
  }

  function getNextEngagementLabel(nextEngagement: EngagementPlan | null) {
    if (!nextEngagement) return '-'

    const startDate = formatDate(toDateOnly(nextEngagement.engagementStartDate))
    return `${nextEngagement.engagementName || 'Untitled engagement plan'} - ${startDate || '-'}`
  }

  function renderNextEngagementLink(nextEngagement: EngagementPlan | null) {
    return (
      <div className="edit-activity__engagement-type-next">
        <span>Next Engagement</span>
        {nextEngagement ? (
          <button
            aria-label={`Open engagement plan: ${nextEngagement.engagementName || 'Untitled engagement plan'}`}
            className="edit-activity__engagement-type-next-btn"
            onClick={(event) => {
              event.stopPropagation()
              handleOpenEdit(nextEngagement)
            }}
            onKeyDown={(event) => {
              event.stopPropagation()
            }}
            title={`Open engagement plan: ${nextEngagement.engagementName || 'Untitled engagement plan'}`}
            type="button"
          >
            {getNextEngagementLabel(nextEngagement)}
          </button>
        ) : (
          <strong>-</strong>
        )}
      </div>
    )
  }

  function renderEngagementTypeMetric(label: string, value: number, tone: 'total' | 'upcoming' | 'progressing' | 'completed') {
    return (
      <span className={`edit-activity__engagement-type-metric edit-activity__engagement-type-metric--${tone}`}>
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
    )
  }

  function renderEngagementTypeProgress(summary: EngagementGroupSummary) {
    return (
      <div className="edit-activity__milestone-quarter-progress edit-activity__engagement-type-progress">
        <div className="edit-activity__milestone-quarter-progress-meta edit-activity__engagement-type-progress-meta">
          <span>Progress</span>
          <strong>{summary.progress}%</strong>
        </div>
        <div aria-hidden="true">
          <i style={{ width: `${summary.progress}%` }} />
        </div>
      </div>
    )
  }

  function renderEngagementSummaryCardContent(
    summary: EngagementGroupSummary,
    title: string,
    marker: string,
    isExpanded: boolean,
    onToggle: () => void,
    aiTitle: string,
    aiText: string,
    controlsLabel: string,
  ) {
    const status = getEngagementGroupStatus(summary)

    return (
      <>
        <div className="edit-activity__milestone-quarter-top">
          <div className="edit-activity__engagement-type-identity">
            <span className={marker.length <= 2 ? 'edit-activity__milestone-quarter-number' : 'edit-activity__engagement-subtype-marker'}>{marker}</span>
            <div>
              <h3>{title}</h3>
              {renderNextEngagementLink(summary.nextEngagement)}
            </div>
          </div>
          <div className="edit-activity__milestone-quarter-controls">
            <span className={`edit-activity__milestone-quarter-status edit-activity__engagement-type-status edit-activity__engagement-type-status--${status}`}>
              {ENGAGEMENT_GROUP_STATUS_LABELS[status]}
            </span>
            <button
              aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${controlsLabel}`}
              className="edit-activity__milestone-quarter-toggle"
              onClick={(event) => {
                event.stopPropagation()
                onToggle()
              }}
              type="button"
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        <div className="edit-activity__milestone-quarter-ai-summary edit-activity__engagement-type-ai-summary">
          <div className="edit-activity__milestone-quarter-ai-icon" aria-hidden="true">
            <Sparkles size={14} />
          </div>
          <div className="edit-activity__milestone-quarter-ai-copy">
            <span className="edit-activity__milestone-quarter-ai-label">{aiTitle}</span>
            <p>{aiText}</p>
          </div>
        </div>

        <div className="edit-activity__milestone-quarter-insights edit-activity__engagement-type-insights">
          <div className="edit-activity__milestone-quarter-metrics edit-activity__engagement-type-metrics">
            {renderEngagementTypeMetric('Total', summary.totalCount, 'total')}
            {renderEngagementTypeMetric('Upcoming', summary.upcomingCount, 'upcoming')}
            {renderEngagementTypeMetric('In progress', summary.inProgressCount, 'progressing')}
            {renderEngagementTypeMetric('Completed', summary.completedCount, 'completed')}
          </div>
          <div className="edit-activity__milestone-quarter-progress-layout edit-activity__engagement-type-progress-wrap">
            {renderEngagementTypeProgress(summary)}
          </div>
        </div>
      </>
    )
  }

  function renderEngagementNestedGrid(records: EngagementPlan[], emptyText: string) {
    if (records.length === 0) {
      return (
        <div className="edit-activity__procurement-quarter-empty">
          <Handshake size={22} strokeWidth={1.5} color="#286cff" />
          <strong>No engagement plans yet</strong>
          <span>{emptyText}</span>
        </div>
      )
    }

    return (
      <div className="edit-activity__procurement-list-scroll">
        <div className="edit-activity__procurement-list-grid edit-activity__engagement-list-grid">
          <div className="edit-activity__procurement-list-row edit-activity__procurement-list-row--header">
            <div className="edit-activity__procurement-list-cell">Engagement Name</div>
            <div className="edit-activity__procurement-list-cell">Sectors</div>
            <div className="edit-activity__procurement-list-cell">Divisions</div>
            <div className="edit-activity__procurement-list-cell">Engagement Description</div>
            <div className="edit-activity__procurement-list-cell">Type</div>
            <div className="edit-activity__procurement-list-cell">Sub-Type</div>
            <div className="edit-activity__procurement-list-cell">Activity Status</div>
            <div className="edit-activity__procurement-list-cell">Activity Included</div>
            <div className="edit-activity__procurement-list-cell">Publish Status</div>
            <div className="edit-activity__procurement-list-cell">ADGEs</div>
            <div className="edit-activity__procurement-list-cell edit-activity__procurement-list-cell--actions">Actions</div>
          </div>

          {records.map(renderEngagementListRow)}
        </div>
      </div>
    )
  }

  function renderEngagementTypeView() {
    if (engagementTypeGroups.length === 0) {
      return (
        <div className="edit-activity__procurement-list-placeholder">
          <Handshake size={40} strokeWidth={1.2} />
          <h3>No engagement types found</h3>
          <p>Engagement type lookup data will appear here once available.</p>
        </div>
      )
    }

    return (
      <div className="edit-activity__engagement-type-grid">
        {engagementTypeGroups.map((typeGroup, typeIndex) => {
          const isTypeExpanded = expandedEngagementTypeId === typeGroup.id

          return (
            <section className={`edit-activity__engagement-type-card${isTypeExpanded ? ' edit-activity__engagement-type-card--expanded' : ''}`} key={typeGroup.id}>
              <div
                aria-expanded={isTypeExpanded}
                className="edit-activity__engagement-type-summary"
                onClick={() => toggleEngagementType(typeGroup.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    toggleEngagementType(typeGroup.id)
                  }
                }}
                role="button"
                tabIndex={0}
              >
                {renderEngagementSummaryCardContent(
                  typeGroup,
                  typeGroup.label,
                  `T${typeIndex + 1}`,
                  isTypeExpanded,
                  () => toggleEngagementType(typeGroup.id),
                  'Engagement Type AI Summary',
                  'AI summary is not available for this engagement type yet.',
                  typeGroup.label,
                )}
              </div>

              {isTypeExpanded ? (
                <div className="edit-activity__engagement-type-body">
                  {typeGroup.subTypes.length > 0 ? (
                    <div className="edit-activity__engagement-subtype-grid">
                      {typeGroup.subTypes.map((subTypeGroup) => {
                        const isSubTypeExpanded = expandedEngagementSubTypeId === subTypeGroup.id

                        return (
                          <section className={`edit-activity__engagement-subtype-card${isSubTypeExpanded ? ' edit-activity__engagement-subtype-card--expanded' : ''}`} key={subTypeGroup.id}>
                            <div
                              aria-expanded={isSubTypeExpanded}
                              className="edit-activity__engagement-subtype-summary"
                              onClick={() => toggleEngagementSubType(subTypeGroup.id)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault()
                                  toggleEngagementSubType(subTypeGroup.id)
                                }
                              }}
                              role="button"
                              tabIndex={0}
                            >
                              {renderEngagementSummaryCardContent(
                                subTypeGroup,
                                subTypeGroup.label,
                                'Sub',
                                isSubTypeExpanded,
                                () => toggleEngagementSubType(subTypeGroup.id),
                                'Engagement Sub-Type AI Summary',
                                'AI summary is not available for this engagement sub-type yet.',
                                subTypeGroup.label,
                              )}
                            </div>

                            {isSubTypeExpanded ? (
                              <div className="edit-activity__engagement-subtype-body">
                                {renderEngagementNestedGrid(
                                  subTypeGroup.records,
                                  'Add an engagement plan with this sub-type to start tracking engagement planning.',
                                )}
                              </div>
                            ) : null}
                          </section>
                        )
                      })}
                    </div>
                  ) : (
                    <div className="edit-activity__procurement-quarter-empty">
                      <Handshake size={22} strokeWidth={1.5} color="#286cff" />
                      <strong>No sub-types found</strong>
                      <span>Active engagement sub-types for this type will appear here.</span>
                    </div>
                  )}
                </div>
              ) : null}
            </section>
          )
        })}
      </div>
    )
  }

  function renderEngagementListRow(row: EngagementPlan) {
    const sectorLabel = row.creatorSectorName !== '-' ? row.creatorSectorName : '-'
    const divisionLabel = row.creatorDivisionName !== '-' ? row.creatorDivisionName : '-'
    const activityStatusLabel = getOptionLabel(ACTIVITY_STATUS_OPTIONS, row.activityStatus)
    const activityStatusTone = (ACTIVITY_STATUS_TONES[row.activityStatus] ?? 'neutral') as EngagementCapsuleTone
    const publishStatusTone = (PUBLISH_STATUS_TONES_DYNAMIC[row.publishStatus] ?? PUBLISH_STATUS_TONES[row.publishStatus] ?? 'neutral') as EngagementCapsuleTone

    return (
      <div className="edit-activity__procurement-list-row" key={row.id}>
        <div className="edit-activity__procurement-list-cell edit-activity__procurement-list-cell--name" data-label="Engagement Name">
          <button
            className="edit-activity__procurement-list-name-btn edit-activity__engagement-list-name-btn"
            onClick={() => handleOpenEdit(row)}
            title={`Edit engagement plan: ${row.engagementName || 'Untitled engagement plan'}`}
            type="button"
          >
            {row.engagementName || 'Untitled engagement plan'}
          </button>
        </div>
        <div className="edit-activity__procurement-list-cell" data-label="Sectors">
          {sectorLabel}
        </div>
        <div className="edit-activity__procurement-list-cell" data-label="Divisions">
          {divisionLabel}
        </div>
        <div className="edit-activity__procurement-list-cell" data-label="Engagement Description">
          <span className="edit-activity__engagement-list-description">
            {row.engagementDescription || '-'}
          </span>
        </div>
        <div className="edit-activity__procurement-list-cell" data-label="Type">
          {renderEngagementCapsule(row.engagementTypeName, 'info')}
        </div>
        <div className="edit-activity__procurement-list-cell" data-label="Sub-Type">
          {renderEngagementCapsule(row.engagementSubTypeName, 'neutral')}
        </div>
        <div className="edit-activity__procurement-list-cell" data-label="Activity Status">
          {renderEngagementCapsule(activityStatusLabel, activityStatusTone)}
        </div>
        <div className="edit-activity__procurement-list-cell" data-label="Activity Included">
          {renderEngagementCapsule(row.activityIncluded === '1' ? 'Yes' : 'No', row.activityIncluded === '1' ? 'success' : 'error')}
        </div>
        <div className="edit-activity__procurement-list-cell" data-label="Publish Status">
          {renderEngagementCapsule(getOptionLabel(PUBLISH_STATUS_OPTIONS_DYNAMIC, row.publishStatus), publishStatusTone)}
        </div>
        <div className="edit-activity__procurement-list-cell" data-label="ADGEs">
          {renderEngagementCapsule(row.adgesInvolved === '1' ? 'Yes' : 'No', row.adgesInvolved === '1' ? 'success' : 'error')}
        </div>
        <div className="edit-activity__procurement-list-cell edit-activity__procurement-list-cell--actions" data-label="Actions">
          <div className="edit-activity__milestone-list-actions">
            <button
              aria-label="Edit engagement plan"
              className="edit-activity__milestone-action-btn"
              onClick={() => handleOpenEdit(row)}
              type="button"
            >
              <Edit3 size={14} />
            </button>
            <button
              aria-label="Delete engagement plan"
              className="edit-activity__milestone-action-btn edit-activity__milestone-action-btn--danger"
              onClick={() => setPlanToDelete(row)}
              type="button"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  function renderEngagementListView() {
    const shouldRenderExistingGrid = false

    if (shouldRenderExistingGrid) {
      return renderEngagementGridForLaterUse()
    }

    if (engagementPlans.length === 0) {
      return (
        <div className="edit-activity__members-empty">
          <Handshake size={40} strokeWidth={1.2} />
          <h3>No engagement plans yet</h3>
          <p>Add an engagement plan to start tracking engagement planning.</p>
        </div>
      )
    }

    return (
      <div className="edit-activity__procurement-list-scroll">
        <div className="edit-activity__procurement-list-grid edit-activity__engagement-list-grid">
          <div className="edit-activity__procurement-list-row edit-activity__procurement-list-row--header">
            <div className="edit-activity__procurement-list-cell">Engagement Name</div>
            <div className="edit-activity__procurement-list-cell">Sectors</div>
            <div className="edit-activity__procurement-list-cell">Divisions</div>
            <div className="edit-activity__procurement-list-cell">Engagement Description</div>
            <div className="edit-activity__procurement-list-cell">Type</div>
            <div className="edit-activity__procurement-list-cell">Sub-Type</div>
            <div className="edit-activity__procurement-list-cell">Activity Status</div>
            <div className="edit-activity__procurement-list-cell">Activity Included</div>
            <div className="edit-activity__procurement-list-cell">Publish Status</div>
            <div className="edit-activity__procurement-list-cell">ADGEs</div>
            <div className="edit-activity__procurement-list-cell edit-activity__procurement-list-cell--actions">Actions</div>
          </div>

          {engagementPlans.map(renderEngagementListRow)}
        </div>
      </div>
    )
  }

  function renderDrawerForm() {
    const title = editingPlan ? 'Edit Engagement Plan' : 'Create Engagement Plan'

    return (
      <SideDrawer
        actions={
          <div className="edit-activity__procurement-drawer-actions edit-activity__engagement-drawer-actions">
            <Button className="edit-activity__procurement-drawer-button" disabled={isSaving} onClick={handleCloseDrawer} variant="secondary">
              Cancel
            </Button>
            <Button className="edit-activity__procurement-drawer-button" disabled={isSaving || isLookupLoading} onClick={handleSave}>
              {isSaving ? 'Saving...' : editingPlan ? 'Update Engagement Plan' : 'Create Engagement Plan'}
            </Button>
          </div>
        }
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        title={title}
      >
        <div className="edit-activity__engagement-drawer">
          {renderAutoPopulatedFields()}
          {renderEngagementDetails()}
          {renderEngagementVisibility()}
          {renderTimelineAndSupport()}
          {renderADGEsAndEntities()}
        </div>
      </SideDrawer>
    )
  }

  const isLoading = isLookupLoading || isPlansLoading

  return (
    <div className="edit-activity__engagement">
      <div className="edit-activity__members-header">
        <div className="edit-activity__members-header-text">
          <h2>Engagement Plans</h2>
          <p>Manage engagement plans for this activity.</p>
        </div>
        <div className="edit-activity__milestone-header-actions">
          <Button disabled={isLookupLoading || !projectId} icon={<Plus size={15} />} onClick={handleOpenCreate}>
            Add Engagement Plan
          </Button>
          <div className="edit-activity__milestone-view-switch" aria-label="Engagement view switch">
            <button
              aria-label="Type view"
              className={`edit-activity__milestone-view-switch-btn ${viewMode === 'type' ? 'edit-activity__milestone-view-switch-btn--active' : ''}`}
              onClick={() => setViewMode('type')}
              title="Type view"
              type="button"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              aria-label="List view"
              className={`edit-activity__milestone-view-switch-btn ${viewMode === 'list' ? 'edit-activity__milestone-view-switch-btn--active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
              type="button"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="edit-activity__members-modal-error">{error}</div>
      ) : null}

      {isLoading ? (
        <div className="edit-activity__members-empty">
          <Handshake size={40} strokeWidth={1.2} />
          <h3>Loading engagement plans...</h3>
          <p>Fetching engagement plans, types, sub-types, and ADGE accounts.</p>
        </div>
      ) : viewMode === 'list' ? (
        renderEngagementListView()
      ) : (
        renderEngagementTypeView()
      )}

      {renderDrawerForm()}

      <ConfirmationDialog
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Engagement Plan'}
        danger
        description="This engagement plan will be permanently removed. This action cannot be undone."
        isOpen={planToDelete !== null}
        onCancel={() => setPlanToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={planToDelete ? `Delete "${planToDelete.engagementName}"?` : ''}
      />
    </div>
  )
}
