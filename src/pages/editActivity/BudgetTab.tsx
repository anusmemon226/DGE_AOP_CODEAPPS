import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import {
  CalendarRange,
  ChartNoAxesColumnIncreasing,
  CircleCheck,
  LayoutGrid,
  List,
  LockKeyhole,
  Plus,
  RotateCcw,
  Trash2,
  Wallet,
  Pencil,
} from 'lucide-react'
import {
  Button,
  Card,
  CurrencyDisplay,
  CurrencyInput,
  DataGrid,
  DirhamIcon,
  Input,
  RadioGroup,
  Select,
  SideDrawer,
  Textarea,
  type DataGridColumn,
  type SelectOption,
} from '../../components/ui'
import type { Dga_account_codes } from '../../generated/models/Dga_account_codesModel'
import type {
  Dga_aop_project_budget_detailses,
  Dga_aop_project_budget_detailsesBase,
} from '../../generated/models/Dga_aop_project_budget_detailsesModel'
import type { Dga_aop_project_budgets } from '../../generated/models/Dga_aop_project_budgetsModel'
import type { Dga_aop_projectses, Dga_aop_projectsesBase } from '../../generated/models/Dga_aop_projectsesModel'
import { Dga_account_codesService } from '../../generated/services/Dga_account_codesService'
import { Dga_aop_project_budget_detailsesService } from '../../generated/services/Dga_aop_project_budget_detailsesService'
import { Dga_aop_project_budgetsService } from '../../generated/services/Dga_aop_project_budgetsService'
import { Dga_aop_projectsesService } from '../../generated/services/Dga_aop_projectsesService'
import { assertOperationSuccess, getResultValue } from './helpers/activityInfoHelpers'
import {
  BUDGET_SOURCE_OPTIONS,
  BUDGET_TYPE_OPTIONS,
  INITIAL_BUDGET_FORM,
  MONTH_LABELS,
  type BudgetFieldErrors,
  type BudgetFormData,
} from './data/budgetData'
import {
  cleanRecordId,
  getProjectRelatedRecordChange,
  isEmptyRelatedValue,
  parseProjectRelatedChanges,
  relatedOldValue,
  resolveProjectRelatedValue,
  stringifyMergedProjectRelatedChanges,
  type ProjectRelatedChanges,
} from './helpers/projectRelatedChanges'
import { createExecutionFieldLogs, EXECUTION_LOG_TYPES } from './helpers/approvalWorkflowLogs'
import { AiSummaryPanel } from './AiSummaryPanel'
import type { AiSummaryBlocks, AiSummaryMeta } from './types/aiSummaryTypes'
import type { EditActivityOperationNotifier } from './types/operationAlert'

export type BudgetHeaderAction = {
  canSave: boolean
  discardChanges?: () => void
  hasUnsavedChanges?: boolean
  isSaving: boolean
  label: string
  onSave: () => Promise<boolean> | boolean
  savingLabel: string
}

type ActivityScopeValue = '' | '1' | '2'
type BudgetViewMode = 'cards' | 'graph'

type BudgetMonthRecord = {
  id: string
  monthName: string
  plannedBudget: number
  actualBudget: number
  deliveredAmount: number
  isZero: boolean
  details: BudgetDetailRecord[]
}

type BudgetDetailRecord = {
  accountCodeId: string
  accountCodeLabel: string
  amount: number
  grn: string
  id?: string
  localId: string
}

type BudgetDetailDraft = {
  accountCodeId: string
  amount: string
  grn: string
}

type BudgetDetailDraftErrors = Partial<Record<keyof BudgetDetailDraft, string>> & {
  submit?: string
}

type BudgetProjectPayload = Partial<Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid'>>

type BudgetDrawerMonth = {
  actualBudget: number
  deliveredAmount: number
  details: BudgetDetailRecord[]
  id: string
  isFuture: boolean
  isZero: boolean
  monthIndex: number
  monthName: string
  plannedBudget: number
}

type BudgetDetailGridRow = BudgetDetailRecord & {
  index: number
}

interface BudgetTabProps {
  activityScope: ActivityScopeValue
  aiSummaryBlocks?: AiSummaryBlocks
  aiSummaryError?: string
  aiSummaryMeta?: AiSummaryMeta
  canEditExecutionBudget?: boolean
  hierarchyId?: string
  isAiSummaryLoading?: boolean
  isExecutionPhase?: boolean
  isReadOnly?: boolean
  onActivityDataChanged?: () => void
  onHeaderActionChange?: (action: BudgetHeaderAction | null) => void
  onOperationAlert?: EditActivityOperationNotifier
  onProjectRelatedChangesChange?: (relatedChanges: string) => void
  plannedEndDate: string
  plannedStartDate: string
  projectId: string
  projectRelatedChanges?: string | null
  statusCode?: number
}

const BUDGET_PROJECT_SELECT_FIELDS = [
  'dga_aop_projectsid',
  'dga_budget_source',
  'dga_budget_type',
  'dga_total_project_budget',
  'dga_allocated_budget',
  'dga_requested_budget',
  'dga_budget_review_comments',
  'dga_project_related_changes',
] as const

const BUDGET_MONTH_SELECT_FIELDS = [
  'dga_aop_project_budgetid',
  'dga_name',
  'dga_planned_budget',
  'dga_actual_budget',
  'dga_delivered_amount',
  'dga_is_zero',
  '_dga_aop_project_value',
] as const

const BUDGET_DETAIL_SELECT_FIELDS = [
  'dga_aop_project_budget_detailsid',
  'dga_name',
  'dga_amount',
  'dga_grn',
  '_dga_account_code_value',
  '_dga_aop_project_budget_value',
] as const

const ACCOUNT_CODE_SELECT_FIELDS = [
  'dga_account_codeid',
  'dga_name',
  'dga_description',
  'dga_strategicvsoperational',
  'statecode',
] as const

const DETAIL_CONFIRM_WARNING =
  'You have entered budget details that haven\'t been added yet. Please click “Add Entry” to include them before confirming or click Cancel to discard.'

const EMPTY_DETAIL_DRAFT: BudgetDetailDraft = {
  accountCodeId: '',
  amount: '',
  grn: '',
}

function normalizeId(id?: string | null) {
  return id?.replace(/[{}]/g, '').toLowerCase() ?? ''
}

function normalizeMonth(value?: string | null) {
  return String(value ?? '').trim().toLowerCase()
}

function stripCommas(value: string): string {
  return value.replace(/,/g, '')
}

function addCommas(value: string): string {
  if (!value) return value
  const parts = value.split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return parts.join('.')
}

function getOptionLabel(options: readonly { label: string; value: string }[], value: string): string {
  return options.find((option) => option.value === value)?.label ?? value
}

function renderBudgetReadOnlyValue(value?: string | number | null): string {
  const text = String(value ?? '').trim()
  return text || '—'
}

function renderBudgetReadOnlyDetails(items: Array<{
  label: string
  value: ReactNode
  kind?: 'classification' | 'requirement' | 'date' | 'identity'
  columns?: 3 | 4 | 6 | 9 | 12
}>) {
  return (
    <dl className="create-activity__readonly-grid create-activity__readonly-grid--3">
      {items.map((item) => {
        const columnClass = item.columns ? `create-activity__readonly-item--span-${item.columns}` : ''
        const kind = item.kind ?? 'identity'

        return (
          <div
            className={`create-activity__readonly-item create-activity__readonly-item--${kind} ${columnClass}`.trim()}
            key={item.label}
          >
            <div className="create-activity__readonly-item-content">
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          </div>
        )
      })}
    </dl>
  )
}

function parseNum(value: string): number {
  const parsed = Number(stripCommas(value).trim())
  return Number.isFinite(parsed) ? parsed : 0
}

function numberToString(value?: number | null): string {
  if (value == null) return ''
  return String(value)
}

function optionalCurrencyNumber(value: string): number | undefined {
  const normalized = stripCommas(value).trim()
  if (!normalized) return undefined
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : undefined
}

function sumMonthly(months: readonly string[]): number {
  return months.reduce((sum, month) => sum + parseNum(month), 0)
}

function calcDelta(allocated: string, totalPlanned: string): string {
  return String(parseNum(allocated) - parseNum(totalPlanned))
}

function sumDetailAmounts(details: readonly BudgetDetailRecord[]) {
  return details.reduce((sum, detail) => sum + detail.amount, 0)
}

function isInvalidCurrency(value: string) {
  if (!value.trim()) return false
  const parsed = Number(stripCommas(value))
  return !Number.isFinite(parsed) || parsed < 0
}

function projectLookupFilter(projectId: string) {
  return `_dga_aop_project_value eq '${normalizeId(projectId)}'`
}

function toEntityBind(entitySetName: string, id: string) {
  return `/${entitySetName}(${normalizeId(id)})`
}

function buildMonthDetailsFilter(monthIds: string[]) {
  return monthIds.map((monthId) => `_dga_aop_project_budget_value eq '${normalizeId(monthId)}'`).join(' or ')
}

function createTempId() {
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function getMonthIndex(monthName: string) {
  return MONTH_LABELS.findIndex((month) => normalizeMonth(month) === normalizeMonth(monthName))
}

function isFutureMonth(monthName: string) {
  const monthIndex = getMonthIndex(monthName)
  return monthIndex > new Date().getMonth()
}

function getExecutionMonthMeta(monthName: string) {
  const monthIndex = getMonthIndex(monthName)
  const currentMonthIndex = new Date().getMonth()

  if (monthIndex > currentMonthIndex) return 'Locked for future update'
  if (monthIndex === currentMonthIndex) return 'Current Month'
  return 'Past Month'
}

function toChoice<TValue extends string>(value: unknown, allowed: readonly TValue[]): TValue | '' {
  const normalized = String(value ?? '')
  return allowed.includes(normalized as TValue) ? (normalized as TValue) : ''
}

function buildAccountCodeLabel(accountCode: Dga_account_codes) {
  const code = accountCode.dga_name ?? ''
  const description = accountCode.dga_description?.trim() ?? ''

  if (code && description) {
    return `${code} - ${description}`
  }

  return description || code
}

function buildAccountCodeOption(accountCode: Dga_account_codes): SelectOption<string> | null {
  if (!accountCode.dga_account_codeid) return null

  return {
    description: accountCode.dga_description ?? undefined,
    label: buildAccountCodeLabel(accountCode),
    value: accountCode.dga_account_codeid,
  }
}

function buildBudgetDetailName(accountCodeLabel: string, grn: string) {
  const trimmedGrn = grn.trim()
  const trimmedLabel = accountCodeLabel.trim()

  if (!trimmedLabel) {
    return trimmedGrn
  }

  if (!trimmedGrn) {
    return trimmedLabel
  }

  return `${trimmedLabel} - ${trimmedGrn}`
}

function recordToMonth(record: Dga_aop_project_budgets): BudgetMonthRecord | null {
  if (!record.dga_aop_project_budgetid || !record.dga_name) return null

  return {
    actualBudget: record.dga_actual_budget ?? 0,
    deliveredAmount: record.dga_delivered_amount ?? 0,
    details: [],
    id: record.dga_aop_project_budgetid,
    isZero: Boolean(record.dga_is_zero),
    monthName: record.dga_name,
    plannedBudget: record.dga_planned_budget ?? 0,
  }
}

function getBudgetMonthRelatedValue(
  relatedChanges: string | null | undefined,
  monthId: string,
  fieldName: string,
): unknown {
  return resolveProjectRelatedValue(getProjectRelatedRecordChange(
    parseProjectRelatedChanges(relatedChanges),
    'budget',
    cleanRecordId(monthId),
    fieldName,
  ))
}

function applyBudgetRelatedChangesToMonth(
  month: BudgetMonthRecord,
  relatedChanges: string | null | undefined,
): BudgetMonthRecord {
  const actualBudget = getBudgetMonthRelatedValue(relatedChanges, month.id, 'dga_actual_budget')
  const deliveredAmount = getBudgetMonthRelatedValue(relatedChanges, month.id, 'dga_delivered_amount')

  return {
    ...month,
    actualBudget: isEmptyRelatedValue(actualBudget) ? month.actualBudget : Number(actualBudget),
    deliveredAmount: isEmptyRelatedValue(deliveredAmount) ? month.deliveredAmount : Number(deliveredAmount),
  }
}

function buildBudgetMonthRelatedChanges(
  month: BudgetMonthRecord | BudgetDrawerMonth,
  actualBudget: number,
  deliveredAmount: number,
): ProjectRelatedChanges {
  return {
    budget: [{
      id: cleanRecordId(month.id),
      month_name: month.monthName,
      dga_actual_budget: relatedOldValue(actualBudget),
      dga_delivered_amount: relatedOldValue(deliveredAmount),
    }],
  }
}

function recordToBudgetDetail(
  record: Dga_aop_project_budget_detailses,
  accountCodeOptions: Map<string, SelectOption<string>>,
): BudgetDetailRecord | null {
  if (!record.dga_aop_project_budget_detailsid) return null

  const accountCodeId = record._dga_account_code_value ?? ''
  const option = accountCodeOptions.get(normalizeId(accountCodeId))

  return {
    accountCodeId,
    accountCodeLabel: option?.label ?? record.dga_name ?? '',
    amount: record.dga_amount ?? 0,
    grn: record.dga_grn ?? '',
    id: record.dga_aop_project_budget_detailsid,
    localId: record.dga_aop_project_budget_detailsid,
  }
}

function buildForm(project: Dga_aop_projectses, months: BudgetMonthRecord[]): BudgetFormData {
  const monthlyBudgets = MONTH_LABELS.map((month) => {
    const record = months.find((item) => normalizeMonth(item.monthName) === normalizeMonth(month))
    return numberToString(record?.plannedBudget ?? 0)
  }) as BudgetFormData['monthlyBudgets']

  const totalPlannedBudget = String(sumMonthly(monthlyBudgets))
  const allocatedBudget = numberToString(project.dga_allocated_budget)

  return {
    allocatedBudget,
    budgetReviewComment: project.dga_budget_review_comments ?? '',
    budgetSource: toChoice(project.dga_budget_source, ['1', '2'] as const),
    budgetType: toChoice(project.dga_budget_type, ['1', '2', '3'] as const),
    delta: calcDelta(allocatedBudget, totalPlannedBudget),
    monthlyBudgets,
    totalActivityBudget: numberToString(project.dga_total_project_budget),
    totalPlannedBudget,
  }
}

function buildProjectPayload(form: BudgetFormData, showTotalActivityBudget: boolean): BudgetProjectPayload {
  const totalPlannedBudget = sumMonthly(form.monthlyBudgets)

  return {
    dga_allocated_budget: optionalCurrencyNumber(form.allocatedBudget),
    dga_budget_review_comments: form.budgetReviewComment.trim(),
    dga_budget_source: Number(form.budgetSource) as Dga_aop_projectsesBase['dga_budget_source'],
    dga_budget_type: Number(form.budgetType) as Dga_aop_projectsesBase['dga_budget_type'],
    dga_requested_budget: totalPlannedBudget,
    dga_total_project_budget: showTotalActivityBudget
      ? optionalCurrencyNumber(form.totalActivityBudget)
      : totalPlannedBudget,
  }
}

function validateBudgetForm(form: BudgetFormData, showTotalActivityBudget: boolean, hasAllMonthlyRows: boolean) {
  const errors: BudgetFieldErrors = {}

  if (!form.budgetSource) errors.budgetSource = 'Select a Budget Source.'
  if (!form.budgetType) errors.budgetType = 'Select a Budget Type.'
  if (showTotalActivityBudget && !form.totalActivityBudget.trim()) {
    errors.totalActivityBudget = 'Enter Total Activity Budget.'
  }
  if (!form.allocatedBudget.trim()) errors.allocatedBudget = 'Enter Allocated Budget.'
  if (!form.budgetReviewComment.trim()) errors.budgetReviewComment = 'Enter Budget Review Comment.'
  if (!hasAllMonthlyRows) {
    errors.monthlyBudgets = 'Monthly budget rows are incomplete. Please refresh after the budget plugin creates all 12 month rows.'
  }

  if (isInvalidCurrency(form.totalActivityBudget)) errors.totalActivityBudget = 'Enter a valid non-negative amount.'
  if (isInvalidCurrency(form.allocatedBudget)) errors.allocatedBudget = 'Enter a valid non-negative amount.'

  const invalidMonth = form.monthlyBudgets.some(isInvalidCurrency)
  if (invalidMonth) errors.monthlyBudgets = 'Monthly planned budgets must be valid non-negative amounts.'

  return errors
}

function validateDetailDraft(draft: BudgetDetailDraft) {
  const errors: BudgetDetailDraftErrors = {}

  if (!draft.accountCodeId) errors.accountCodeId = 'Select an Account Code.'
  if (!draft.grn.trim()) errors.grn = 'Enter GRN.'
  if (!draft.amount.trim()) {
    errors.amount = 'Enter Amount.'
  } else if (isInvalidCurrency(draft.amount)) {
    errors.amount = 'Enter a valid non-negative amount.'
  }

  return errors
}

function isSameBudgetForm(left: BudgetFormData, right: BudgetFormData) {
  return JSON.stringify(left) === JSON.stringify(right)
}

export function BudgetTab({
  activityScope,
  aiSummaryBlocks,
  aiSummaryError,
  aiSummaryMeta,
  canEditExecutionBudget = false,
  hierarchyId = '',
  isAiSummaryLoading = false,
  isExecutionPhase = false,
  isReadOnly = false,
  onActivityDataChanged,
  onHeaderActionChange,
  onOperationAlert,
  onProjectRelatedChangesChange,
  plannedEndDate,
  plannedStartDate,
  projectId,
  projectRelatedChanges,
  statusCode = 1,
}: BudgetTabProps) {
  const [form, setForm] = useState<BudgetFormData>(INITIAL_BUDGET_FORM)
  const [savedForm, setSavedForm] = useState<BudgetFormData>(INITIAL_BUDGET_FORM)
  const [monthRecords, setMonthRecords] = useState<BudgetMonthRecord[]>([])
  const [accountCodeOptions, setAccountCodeOptions] = useState<SelectOption<string>[]>([])
  const [errors, setErrors] = useState<BudgetFieldErrors & { context?: string; submit?: string }>({})
  const [inlineDeliveredDrafts, setInlineDeliveredDrafts] = useState<Record<string, string>>({})
  const [inlineDeliveredErrors, setInlineDeliveredErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSavingExecutionMonth, setIsSavingExecutionMonth] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [drawerMonthId, setDrawerMonthId] = useState<string | null>(null)
  const [drawerRows, setDrawerRows] = useState<BudgetDetailRecord[]>([])
  const [originalDrawerRows, setOriginalDrawerRows] = useState<BudgetDetailRecord[]>([])
  const [detailDraft, setDetailDraft] = useState<BudgetDetailDraft>(EMPTY_DETAIL_DRAFT)
  const [detailDraftErrors, setDetailDraftErrors] = useState<BudgetDetailDraftErrors>({})
  const [isDetailFormOpen, setIsDetailFormOpen] = useState(false)
  const [editingDetailLocalId, setEditingDetailLocalId] = useState<string | null>(null)
  const [isSavingDrawer, setIsSavingDrawer] = useState(false)
  const [budgetViewMode, setBudgetViewMode] = useState<BudgetViewMode>('cards')
  const currentQuarterIndex = Math.floor(new Date().getMonth() / 3)

  const showTotalActivityBudget = useMemo(() => {
    if (!plannedStartDate || !plannedEndDate) return false
    return new Date(plannedStartDate).getFullYear() !== new Date(plannedEndDate).getFullYear()
  }, [plannedEndDate, plannedStartDate])

  const orderedMonthRecords = useMemo(() => {
    return MONTH_LABELS
      .map((month) => monthRecords.find((item) => normalizeMonth(item.monthName) === normalizeMonth(month)))
      .filter((item): item is BudgetMonthRecord => Boolean(item))
  }, [monthRecords])

  const missingMonths = useMemo(() => {
    const existing = new Set(monthRecords.map((item) => normalizeMonth(item.monthName)))
    return MONTH_LABELS.filter((month) => !existing.has(normalizeMonth(month)))
  }, [monthRecords])

  const hasAllMonthlyRows = missingMonths.length === 0
  const saveLabel = statusCode === 1 ? 'Save Draft' : 'Save Changes'
  const hasUnsavedChanges = !isSameBudgetForm(form, savedForm)
  const actualBudgetSpent = monthRecords.reduce((sum, record) => sum + record.actualBudget, 0)
  const remainingBudget = parseNum(form.allocatedBudget) - actualBudgetSpent
  const accountCodeOptionMap = useMemo(
    () => new Map(accountCodeOptions.map((option) => [normalizeId(option.value), option])),
    [accountCodeOptions],
  )
  const accountCodeSelectOptions = useMemo<SelectOption<string>[]>(
    () => [
      {
        disabled: true,
        label: 'Select Account Code',
        value: '',
      },
      ...accountCodeOptions,
    ],
    [accountCodeOptions],
  )
  const executionMonthlyEditAllowed = isExecutionPhase && canEditExecutionBudget
  const selectedDrawerMonth = useMemo<BudgetDrawerMonth | null>(() => {
    if (!drawerMonthId) return null
    const month = monthRecords.find((record) => normalizeId(record.id) === normalizeId(drawerMonthId))
    if (!month) return null

    return {
      ...month,
      isFuture: isFutureMonth(month.monthName),
      monthIndex: getMonthIndex(month.monthName),
    }
  }, [drawerMonthId, monthRecords])
  const drawerActualTotal = useMemo(() => sumDetailAmounts(drawerRows), [drawerRows])
  const drawerAllocatedBudget = parseNum(form.allocatedBudget)
  const drawerRemainingBudget = drawerAllocatedBudget - drawerActualTotal
  const visibleDrawerRows = useMemo<BudgetDetailGridRow[]>(
    () => drawerRows.map((row, index) => ({ ...row, index: index + 1 })),
    [drawerRows],
  )
  const graphicalQuarters = useMemo(() => {
    return Array.from({ length: 4 }, (_, quarterIndex) => {
      const startIndex = quarterIndex * 3
      const quarterMonths = MONTH_LABELS.slice(startIndex, startIndex + 3)
      const records = quarterMonths
        .map((monthName) => monthRecords.find((item) => normalizeMonth(item.monthName) === normalizeMonth(monthName)))
        .filter((record): record is BudgetMonthRecord => Boolean(record))

      const plannedSpent = records.reduce((sum, record) => sum + record.plannedBudget, 0)
      const actualSpent = records.reduce((sum, record) => sum + record.actualBudget, 0)
      const progress = plannedSpent > 0 ? Math.min(100, Math.round((actualSpent / plannedSpent) * 100)) : 0

      return {
        actualSpent,
        label: `Quarter ${quarterIndex + 1}`,
        plannedSpent,
        progress,
        range: `${quarterMonths[0]} - ${quarterMonths[quarterMonths.length - 1]}`,
      }
    })
  }, [monthRecords])
  const graphicalMonths = useMemo(() => {
    return MONTH_LABELS.map((monthName) => {
      const record = monthRecords.find((item) => normalizeMonth(item.monthName) === normalizeMonth(monthName))

      return {
        actualBudget: record?.actualBudget ?? 0,
        deliveredAmount: record?.deliveredAmount ?? 0,
        monthName,
        plannedBudget: record?.plannedBudget ?? 0,
      }
    })
  }, [monthRecords])
  const graphicalMaxValue = Math.max(
    1,
    ...graphicalQuarters.flatMap((quarter) => [quarter.plannedSpent, quarter.actualSpent]),
  )
  const monthlyGraphicalMaxValue = Math.max(
    1,
    ...graphicalMonths.flatMap((month) => [month.plannedBudget, month.actualBudget, month.deliveredAmount]),
  )
  const overallPlannedSpent = graphicalQuarters.reduce((sum, quarter) => sum + quarter.plannedSpent, 0)
  const overallActualSpent = graphicalQuarters.reduce((sum, quarter) => sum + quarter.actualSpent, 0)
  const overallProgress = overallPlannedSpent > 0 ? Math.min(100, Math.round((overallActualSpent / overallPlannedSpent) * 100)) : 0

  useEffect(() => {
    let isMounted = true

    async function loadBudget() {
      setIsLoading(true)
      setErrors({})

      if (!projectId) {
        setErrors({ context: 'Activity id is missing from the edit URL.' })
        setIsLoading(false)
        return
      }

      try {
        const [projectResult, monthsResult, accountCodesResult] = await Promise.all([
          Dga_aop_projectsesService.get(projectId, {
            select: [...BUDGET_PROJECT_SELECT_FIELDS],
          }),
          Dga_aop_project_budgetsService.getAll({
            filter: projectLookupFilter(projectId),
            select: [...BUDGET_MONTH_SELECT_FIELDS],
          }),
          isExecutionPhase
            ? Dga_account_codesService.getAll({
                filter: [
                  'statecode eq 0',
                  activityScope ? `dga_strategicvsoperational eq ${activityScope}` : '',
                  hierarchyId ? `_dga_divisional_hierarchy_value eq '${normalizeId(hierarchyId)}'` : '',
                ].filter(Boolean).join(' and '),
                orderBy: ['dga_name asc'],
                select: [...ACCOUNT_CODE_SELECT_FIELDS],
              })
            : Promise.resolve({ data: [], success: true }),
        ])

        if (!isMounted) return

        assertOperationSuccess(projectResult, 'Failed to load project budget.')
        assertOperationSuccess(monthsResult, 'Failed to load monthly budget rows.')
        assertOperationSuccess(accountCodesResult, 'Failed to load account codes.')

        const project = getResultValue<Dga_aop_projectses>(projectResult)
        if (!project) throw new Error('Project budget could not be found.')

        const accountCodes = ((accountCodesResult.data ?? []) as Dga_account_codes[])
          .filter((accountCode) => accountCode.dga_account_codeid)
        const nextAccountCodeOptions = accountCodes
          .map(buildAccountCodeOption)
          .filter((option): option is SelectOption<string> => Boolean(option))
        const nextAccountCodeOptionMap = new Map(
          nextAccountCodeOptions.map((option) => [normalizeId(option.value), option]),
        )

        const months = ((monthsResult.data ?? []) as Dga_aop_project_budgets[])
          .map(recordToMonth)
          .filter((record): record is BudgetMonthRecord => Boolean(record))
          .map((month) => applyBudgetRelatedChangesToMonth(
            month,
            project.dga_project_related_changes ?? projectRelatedChanges,
          ))

        const monthIds = months.map((record) => record.id).filter(Boolean)
        let details: BudgetDetailRecord[] = []

        if (isExecutionPhase && monthIds.length > 0) {
          const detailsResult = await Dga_aop_project_budget_detailsesService.getAll({
            filter: buildMonthDetailsFilter(monthIds),
            orderBy: ['createdon asc'],
            select: [...BUDGET_DETAIL_SELECT_FIELDS],
          })

          if (!isMounted) return

          assertOperationSuccess(detailsResult, 'Failed to load budget details.')
          const detailRecords = ((detailsResult.data ?? []) as Dga_aop_project_budget_detailses[])
          details = detailRecords
            .map((record) => recordToBudgetDetail(record, nextAccountCodeOptionMap))
            .filter((record): record is BudgetDetailRecord => Boolean(record))

          const detailsByMonthId = new Map<string, BudgetDetailRecord[]>()
          detailRecords.forEach((record, index) => {
            const monthId = normalizeId(record._dga_aop_project_budget_value)
            const detail = details[index]
            if (!monthId || !detail) return
            const existingRows = detailsByMonthId.get(monthId) ?? []
            existingRows.push(detail)
            detailsByMonthId.set(monthId, existingRows)
          })

          const monthsWithDetails = months.map((month) => {
            const detailRows = detailsByMonthId.get(normalizeId(month.id)) ?? []
            return applyBudgetRelatedChangesToMonth({
              ...month,
              actualBudget: detailRows.length > 0 ? sumDetailAmounts(detailRows) : month.actualBudget,
              details: detailRows,
            }, project.dga_project_related_changes ?? projectRelatedChanges)
          })

          const nextForm = buildForm(project, monthsWithDetails)
          const nextDeliveredDrafts = Object.fromEntries(
            monthsWithDetails.map((month) => [month.id, numberToString(month.deliveredAmount)]),
          )

          setAccountCodeOptions(nextAccountCodeOptions)
          setInlineDeliveredDrafts(nextDeliveredDrafts)
          setInlineDeliveredErrors({})
          setMonthRecords(monthsWithDetails)
          setForm(nextForm)
          setSavedForm(nextForm)
          return
        }

        setAccountCodeOptions(nextAccountCodeOptions)
        setInlineDeliveredDrafts(
          Object.fromEntries(months.map((month) => [month.id, numberToString(month.deliveredAmount)])),
        )
        setInlineDeliveredErrors({})
        setMonthRecords(months)
        const nextForm = buildForm(project, months)
        setForm(nextForm)
        setSavedForm(nextForm)
      } catch (error) {
        if (isMounted) {
          setErrors({
            context: error instanceof Error ? error.message : 'Failed to load budget information.',
          })
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    loadBudget()
    return () => {
      isMounted = false
    }
  }, [activityScope, hierarchyId, isExecutionPhase, projectId, projectRelatedChanges])

  function handleFieldChange(fields: Partial<BudgetFormData>) {
    if (isReadOnly) return

    setForm((prev) => {
      const next = { ...prev, ...fields }

      if ('monthlyBudgets' in fields && fields.monthlyBudgets) {
        next.totalPlannedBudget = String(sumMonthly(fields.monthlyBudgets))
      }

      if ('allocatedBudget' in fields || 'totalPlannedBudget' in fields || 'monthlyBudgets' in fields) {
        next.delta = calcDelta(next.allocatedBudget, next.totalPlannedBudget)
      }

      return next
    })

    const changedKey = Object.keys(fields)[0] as keyof BudgetFormData
    setErrors((prev) => {
      const copy = { ...prev }
      if (changedKey) delete copy[changedKey]
      delete copy.submit

      if (changedKey === 'monthlyBudgets' && fields.monthlyBudgets?.some(isInvalidCurrency)) {
        copy.monthlyBudgets = 'Monthly planned budgets must be valid non-negative amounts.'
      }

      if (changedKey && changedKey !== 'monthlyBudgets') {
        const value = String(fields[changedKey] ?? '')
        if (['allocatedBudget', 'totalActivityBudget'].includes(changedKey) && isInvalidCurrency(value)) {
          copy[changedKey] = 'Enter a valid non-negative amount.'
        }
      }

      return copy
    })
  }

  function handleMonthlyChange(index: number, value: string) {
    const nextMonthly = [...form.monthlyBudgets] as BudgetFormData['monthlyBudgets']
    nextMonthly[index] = value
    handleFieldChange({ monthlyBudgets: nextMonthly })
  }

  const handleSave = useCallback(async () => {
    if (isReadOnly) return false
    if (isSaving) return false

    if (!projectId) {
      setErrors({ context: 'Activity id is missing from the edit URL.' })
      return false
    }

    const nextErrors = validateBudgetForm(form, showTotalActivityBudget, hasAllMonthlyRows)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return false
    }

    setIsSaving(true)
    try {
      const projectPayload = buildProjectPayload(form, showTotalActivityBudget)
      const projectResult = await Dga_aop_projectsesService.update(projectId, projectPayload)
      assertOperationSuccess(projectResult, 'Failed to save project budget fields.')

      for (const record of orderedMonthRecords) {
        const monthIndex = getMonthIndex(record.monthName)
        if (monthIndex === -1) continue

        const plannedBudget = parseNum(form.monthlyBudgets[monthIndex])
        const payload = {
          dga_is_zero: plannedBudget === 0,
          dga_name: MONTH_LABELS[monthIndex],
          dga_planned_budget: plannedBudget,
        }

        const result = await Dga_aop_project_budgetsService.update(record.id, payload)
        assertOperationSuccess(result, `Failed to save ${record.monthName} budget.`)
      }

      const refreshedMonthRecords = monthRecords.map((record) => {
        const monthIndex = getMonthIndex(record.monthName)
        if (monthIndex === -1) return record
        const plannedBudget = parseNum(form.monthlyBudgets[monthIndex])
        return {
          ...record,
          isZero: plannedBudget === 0 ? true : record.isZero,
          plannedBudget,
        }
      })

      setMonthRecords(refreshedMonthRecords)
      setErrors({})
      onOperationAlert?.({
        kind: 'success',
        message: 'Budget information saved successfully.',
        title: 'Budget saved',
      })
      onActivityDataChanged?.()
      setSavedForm(form)
      return true
    } catch (error) {
      onOperationAlert?.({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Failed to save budget information.',
        title: 'Budget was not saved',
      })
      return false
    } finally {
      setIsSaving(false)
    }
  }, [
    form,
    hasAllMonthlyRows,
    isReadOnly,
    isSaving,
    monthRecords,
    orderedMonthRecords,
    onActivityDataChanged,
    onOperationAlert,
    projectId,
    showTotalActivityBudget,
  ])

  useEffect(() => {
    const shouldHideHeaderAction = executionMonthlyEditAllowed && isReadOnly

    if (shouldHideHeaderAction) {
      onHeaderActionChange?.(null)
      return
    }

    onHeaderActionChange?.({
      canSave: !isReadOnly && !isLoading && !isSaving && !errors.context,
      discardChanges: () => setForm(savedForm),
      hasUnsavedChanges,
      isSaving,
      label: saveLabel,
      onSave: handleSave,
      savingLabel: 'Saving...',
    })

    return () => onHeaderActionChange?.(null)
  }, [errors.context, executionMonthlyEditAllowed, handleSave, hasUnsavedChanges, isLoading, isReadOnly, isSaving, onHeaderActionChange, saveLabel, savedForm])

  function updateMonthRecord(monthId: string, updater: (current: BudgetMonthRecord) => BudgetMonthRecord) {
    setMonthRecords((current) =>
      current.map((record) => (normalizeId(record.id) === normalizeId(monthId) ? updater(record) : record)),
    )
  }

  async function saveBudgetMonthRelatedChanges(
    monthRecord: BudgetMonthRecord | BudgetDrawerMonth,
    actualBudget: number,
    deliveredAmount: number,
  ) {
    const projectResult = await Dga_aop_projectsesService.get(projectId, {
      select: ['dga_project_related_changes'],
    })
    assertOperationSuccess(projectResult, 'Failed to load activity change tracking.')

    const nextRelatedChanges = stringifyMergedProjectRelatedChanges(
      projectResult.data?.dga_project_related_changes,
      buildBudgetMonthRelatedChanges(monthRecord, actualBudget, deliveredAmount),
    )
    const result = await Dga_aop_projectsesService.update(projectId, {
      dga_project_related_changes: nextRelatedChanges,
    } as Partial<Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid'>>)
    assertOperationSuccess(result, `Failed to update ${monthRecord.monthName} budget changes.`)
    void createExecutionFieldLogs(projectId, [
      {
        logType: EXECUTION_LOG_TYPES.budget,
        name: `${monthRecord.monthName} - Actual Budget`,
        oldValue: monthRecord.actualBudget,
        newValue: actualBudget,
      },
      {
        logType: EXECUTION_LOG_TYPES.budget,
        name: `${monthRecord.monthName} - Delivered Amount`,
        oldValue: monthRecord.deliveredAmount,
        newValue: deliveredAmount,
      },
    ])
    onProjectRelatedChangesChange?.(nextRelatedChanges)
    return nextRelatedChanges
  }

  function handleDeliveredValueChange(monthId: string, value: string) {
    if (!executionMonthlyEditAllowed) return

    setInlineDeliveredDrafts((current) => ({
      ...current,
      [monthId]: value,
    }))

    setInlineDeliveredErrors((current) => {
      const next = { ...current }
      delete next[monthId]
      return next
    })
  }

  async function handleDeliveredValueBlur(monthId: string) {
    if (!executionMonthlyEditAllowed) return
    if (isSavingExecutionMonth) return

    const monthRecord = monthRecords.find((record) => normalizeId(record.id) === normalizeId(monthId))
    if (!monthRecord || monthRecord.isZero || isFutureMonth(monthRecord.monthName)) return

    const rawValue = inlineDeliveredDrafts[monthId] ?? numberToString(monthRecord.deliveredAmount)
    if (isInvalidCurrency(rawValue)) {
      setInlineDeliveredErrors((current) => ({
        ...current,
        [monthId]: 'Enter a valid non-negative amount.',
      }))
      return
    }

    const nextDeliveredValue = parseNum(rawValue)
    if (nextDeliveredValue === monthRecord.deliveredAmount) {
      setInlineDeliveredDrafts((current) => ({
        ...current,
        [monthId]: numberToString(monthRecord.deliveredAmount),
      }))
      return
    }

    try {
      setIsSavingExecutionMonth(monthId)
      onOperationAlert?.({ kind: 'processing', title: `Saving ${monthRecord.monthName} delivered values` })
      await saveBudgetMonthRelatedChanges(monthRecord, monthRecord.actualBudget, nextDeliveredValue)
      const monthResult = await Dga_aop_project_budgetsService.update(monthId, {
        dga_delivered_amount: nextDeliveredValue,
      })
      assertOperationSuccess(monthResult, `Failed to update ${monthRecord.monthName} delivered values.`)

      updateMonthRecord(monthId, (current) => ({
        ...current,
        deliveredAmount: nextDeliveredValue,
      }))
      setInlineDeliveredDrafts((current) => ({
        ...current,
        [monthId]: numberToString(nextDeliveredValue),
      }))
      onOperationAlert?.({
        kind: 'success',
        message: `${monthRecord.monthName} delivered values saved successfully.`,
        title: 'Budget month updated',
      })
      onActivityDataChanged?.()
    } catch (error) {
      onOperationAlert?.({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Failed to save delivered values.',
        title: 'Delivered values were not saved',
      })
      setInlineDeliveredErrors((current) => ({
        ...current,
        [monthId]: error instanceof Error ? error.message : 'Failed to save delivered values.',
      }))
    } finally {
      setIsSavingExecutionMonth(null)
    }
  }

  async function handleToggleZero(monthId: string) {
    if (!executionMonthlyEditAllowed) return
    if (isSavingExecutionMonth) return

    const monthRecord = monthRecords.find((record) => normalizeId(record.id) === normalizeId(monthId))
    if (!monthRecord || isFutureMonth(monthRecord.monthName)) return

    if (!monthRecord.isZero && monthRecord.details.length > 0) {
      onOperationAlert?.({
        kind: 'error',
        message: `${monthRecord.monthName} cannot be set to zero because budget details already exist for this month.`,
        title: 'Budget month was not updated',
      })
      return
    }

    const nextZeroState = !monthRecord.isZero
    const nextDeliveredAmount = nextZeroState ? 0 : monthRecord.deliveredAmount
    const nextActualAmount = nextZeroState ? 0 : sumDetailAmounts(monthRecord.details)

    try {
      setIsSavingExecutionMonth(monthId)
      onOperationAlert?.({ kind: 'processing', title: `Updating ${monthRecord.monthName} zero flag` })
      await saveBudgetMonthRelatedChanges(monthRecord, nextActualAmount, nextDeliveredAmount)
      const monthResult = await Dga_aop_project_budgetsService.update(monthId, {
        dga_actual_budget: nextActualAmount,
        dga_delivered_amount: nextDeliveredAmount,
        dga_is_zero: nextZeroState,
      })
      assertOperationSuccess(monthResult, `Failed to update ${monthRecord.monthName} zero flag.`)

      updateMonthRecord(monthId, (current) => ({
        ...current,
        actualBudget: nextActualAmount,
        deliveredAmount: nextDeliveredAmount,
        isZero: nextZeroState,
      }))
      setInlineDeliveredDrafts((current) => ({
        ...current,
        [monthId]: numberToString(nextDeliveredAmount),
      }))
      setInlineDeliveredErrors((current) => {
        const next = { ...current }
        delete next[monthId]
        return next
      })
      onOperationAlert?.({
        kind: 'success',
        message: nextZeroState
          ? `${monthRecord.monthName} marked as zero successfully.`
          : `${monthRecord.monthName} zero flag removed successfully.`,
        title: 'Budget month updated',
      })
      onActivityDataChanged?.()
    } catch (error) {
      onOperationAlert?.({
        kind: 'error',
        message: error instanceof Error ? error.message : `Failed to update ${monthRecord.monthName}.`,
        title: 'Budget month was not updated',
      })
    } finally {
      setIsSavingExecutionMonth(null)
    }
  }

  function openDrawer(monthId: string) {
    const monthRecord = monthRecords.find((record) => normalizeId(record.id) === normalizeId(monthId))
    if (!monthRecord || isFutureMonth(monthRecord.monthName)) return

    setDrawerMonthId(monthRecord.id)
    setOriginalDrawerRows(monthRecord.details.map((detail) => ({ ...detail })))
    setDrawerRows(monthRecord.details.map((detail) => ({ ...detail })))
    setDetailDraft(EMPTY_DETAIL_DRAFT)
    setDetailDraftErrors({})
    setEditingDetailLocalId(null)
    setIsDetailFormOpen(false)
    setIsDrawerOpen(true)
  }

  function closeDrawer() {
    if (isSavingDrawer) return

    setIsDrawerOpen(false)
    setDrawerMonthId(null)
    setDrawerRows([])
    setOriginalDrawerRows([])
    setDetailDraft(EMPTY_DETAIL_DRAFT)
    setDetailDraftErrors({})
    setEditingDetailLocalId(null)
    setIsDetailFormOpen(false)
  }

  function handleDetailDraftChange(fields: Partial<BudgetDetailDraft>) {
    if (!executionMonthlyEditAllowed) return

    setDetailDraft((current) => ({ ...current, ...fields }))
    setDetailDraftErrors((current) => {
      const next = { ...current }
      for (const key of Object.keys(fields) as Array<keyof BudgetDetailDraft>) {
        delete next[key]
      }
      delete next.submit
      return next
    })
  }

  function openAddDetailForm() {
    if (!executionMonthlyEditAllowed || !selectedDrawerMonth || selectedDrawerMonth.isZero) return

    setDetailDraft(EMPTY_DETAIL_DRAFT)
    setDetailDraftErrors({})
    setEditingDetailLocalId(null)
    setIsDetailFormOpen(true)
  }

  function openEditDetailForm(row: BudgetDetailRecord) {
    if (!executionMonthlyEditAllowed) return

    setDetailDraft({
      accountCodeId: row.accountCodeId,
      amount: numberToString(row.amount),
      grn: row.grn,
    })
    setDetailDraftErrors({})
    setEditingDetailLocalId(row.localId)
    setIsDetailFormOpen(true)
  }

  function cancelDetailForm() {
    setDetailDraft(EMPTY_DETAIL_DRAFT)
    setDetailDraftErrors({})
    setEditingDetailLocalId(null)
    setIsDetailFormOpen(false)
  }

  function handleCommitDetailDraft() {
    if (!selectedDrawerMonth) return
    if (!executionMonthlyEditAllowed) return
    if (selectedDrawerMonth.isZero) {
      setDetailDraftErrors({
        submit: 'Budget details cannot be added while this month is set to zero.',
      })
      return
    }

    const nextErrors = validateDetailDraft(detailDraft)
    if (Object.keys(nextErrors).length > 0) {
      setDetailDraftErrors(nextErrors)
      return
    }

    const option = accountCodeOptionMap.get(normalizeId(detailDraft.accountCodeId))
    const nextRow: BudgetDetailRecord = {
      accountCodeId: detailDraft.accountCodeId,
      accountCodeLabel: option?.label ?? '',
      amount: parseNum(detailDraft.amount),
      grn: detailDraft.grn.trim(),
      id: drawerRows.find((row) => row.localId === editingDetailLocalId)?.id,
      localId: editingDetailLocalId ?? createTempId(),
    }

    setDrawerRows((current) => {
      if (editingDetailLocalId) {
        return current.map((row) => (row.localId === editingDetailLocalId ? nextRow : row))
      }

      return [...current, nextRow]
    })

    cancelDetailForm()
  }

  function handleDeleteDrawerRow(localId: string) {
    if (!executionMonthlyEditAllowed) return

    setDrawerRows((current) => current.filter((row) => row.localId !== localId))

    if (editingDetailLocalId === localId) {
      cancelDetailForm()
    }
  }

  async function handleConfirmDrawer() {
    if (!selectedDrawerMonth) return
    if (isDetailFormOpen) {
      setDetailDraftErrors({
        submit: DETAIL_CONFIRM_WARNING,
      })
      return
    }

    if (!executionMonthlyEditAllowed) {
      closeDrawer()
      return
    }

    try {
      setIsSavingDrawer(true)
      onOperationAlert?.({
        kind: 'processing',
        title: selectedDrawerMonth ? `Saving ${selectedDrawerMonth.monthName} budget details` : 'Saving budget details',
      })

      const rowsToDelete = originalDrawerRows.filter(
        (originalRow) => !drawerRows.some((currentRow) => currentRow.id && currentRow.id === originalRow.id),
      )
      const rowsToCreate = drawerRows.filter((row) => !row.id)
      const rowsToUpdate = drawerRows.filter((row) => {
        if (!row.id) return false
        const originalRow = originalDrawerRows.find((currentRow) => currentRow.id === row.id)
        if (!originalRow) return false

        return (
          normalizeId(originalRow.accountCodeId) !== normalizeId(row.accountCodeId)
          || originalRow.grn !== row.grn
          || originalRow.amount !== row.amount
        )
      })

      for (const row of rowsToDelete) {
        if (!row.id) continue
        await Dga_aop_project_budget_detailsesService.delete(row.id)
      }

      for (const row of rowsToCreate) {
        const payload: Omit<Dga_aop_project_budget_detailsesBase, 'dga_aop_project_budget_detailsid'> = {
          'dga_account_code@odata.bind': toEntityBind('dga_account_codes', row.accountCodeId),
          dga_amount: row.amount,
          'dga_aop_project_budget@odata.bind': toEntityBind('dga_aop_project_budgets', selectedDrawerMonth.id),
          dga_grn: row.grn,
          dga_name: buildBudgetDetailName(row.accountCodeLabel, row.grn),
          statecode: 0,
          statuscode: 1,
        }
        const result = await Dga_aop_project_budget_detailsesService.create(payload)
        assertOperationSuccess(result, `Failed to create ${selectedDrawerMonth.monthName} budget detail.`)
      }

      for (const row of rowsToUpdate) {
        if (!row.id) continue
        const payload: Partial<Omit<Dga_aop_project_budget_detailsesBase, 'dga_aop_project_budget_detailsid'>> = {
          'dga_account_code@odata.bind': toEntityBind('dga_account_codes', row.accountCodeId),
          dga_amount: row.amount,
          dga_grn: row.grn,
          dga_name: buildBudgetDetailName(row.accountCodeLabel, row.grn),
        }
        const result = await Dga_aop_project_budget_detailsesService.update(row.id, payload)
        assertOperationSuccess(result, `Failed to update ${selectedDrawerMonth.monthName} budget detail.`)
      }

      const nextActualBudget = sumDetailAmounts(drawerRows)
      const deliveredDraft = inlineDeliveredDrafts[selectedDrawerMonth.id] ?? numberToString(selectedDrawerMonth.deliveredAmount)
      if (isInvalidCurrency(deliveredDraft)) {
        setInlineDeliveredErrors((current) => ({
          ...current,
          [selectedDrawerMonth.id]: 'Enter a valid non-negative amount.',
        }))
        throw new Error('Delivered Values must be a valid non-negative amount before confirming.')
      }
      const nextDeliveredAmount = selectedDrawerMonth.isZero ? 0 : parseNum(deliveredDraft)

      await saveBudgetMonthRelatedChanges(selectedDrawerMonth, nextActualBudget, nextDeliveredAmount)
      const monthResult = await Dga_aop_project_budgetsService.update(selectedDrawerMonth.id, {
        dga_actual_budget: nextActualBudget,
        dga_delivered_amount: nextDeliveredAmount,
        dga_is_zero: selectedDrawerMonth.isZero,
      })
      assertOperationSuccess(monthResult, `Failed to update ${selectedDrawerMonth.monthName} budget totals.`)

      updateMonthRecord(selectedDrawerMonth.id, (current) => ({
        ...current,
        actualBudget: nextActualBudget,
        deliveredAmount: nextDeliveredAmount,
        details: drawerRows.map((row) => ({ ...row })),
        isZero: current.isZero,
      }))

      setInlineDeliveredDrafts((current) => ({
        ...current,
        [selectedDrawerMonth.id]: numberToString(nextDeliveredAmount),
      }))
      onOperationAlert?.({
        kind: 'success',
        message: `${selectedDrawerMonth.monthName} budget details saved successfully.`,
        title: 'Budget details saved',
      })
      onActivityDataChanged?.()
      closeDrawer()
    } catch (error) {
      onOperationAlert?.({
        kind: 'error',
        message: error instanceof Error ? error.message : 'Failed to save budget details.',
        title: 'Budget details were not saved',
      })
    } finally {
      setIsSavingDrawer(false)
    }
  }

  function renderPlanningQuarterGrid() {
    return Array.from({ length: 4 }, (_, quarterIndex) => {
      const startIndex = quarterIndex * 3
      const quarterMonths = MONTH_LABELS.slice(startIndex, startIndex + 3)
      const quarterTotal = sumMonthly(form.monthlyBudgets.slice(startIndex, startIndex + 3))
      const isCurrentQuarter = quarterIndex === currentQuarterIndex

      return (
        <section
          aria-label={`Quarter ${quarterIndex + 1}${isCurrentQuarter ? ', current quarter' : ''}`}
          className={`edit-activity__monthly-quarter${isCurrentQuarter ? ' edit-activity__monthly-quarter--current' : ''}`}
          key={`quarter-${quarterIndex + 1}`}
        >
          <div className="edit-activity__monthly-quarter-header">
            <div className="edit-activity__monthly-quarter-title">
              <span className="edit-activity__monthly-quarter-number">Q{quarterIndex + 1}</span>
              <span className="edit-activity__monthly-quarter-range">
                {quarterMonths[0]} to {quarterMonths[quarterMonths.length - 1]}
              </span>
              {isCurrentQuarter ? <span className="edit-activity__monthly-current-badge">Current</span> : null}
            </div>
            <div className="edit-activity__monthly-quarter-total">
              <span>Quarter total</span>
              <strong><CurrencyDisplay value={quarterTotal} /></strong>
            </div>
          </div>

          <div className="edit-activity__monthly-quarter-fields">
            {quarterMonths.map((label, monthOffset) => {
              const monthIndex = startIndex + monthOffset
              return (
                <CurrencyInput
                  className="edit-activity__monthly-field"
                  disabled={isReadOnly}
                  error={errors.monthlyBudgets && isInvalidCurrency(form.monthlyBudgets[monthIndex]) ? errors.monthlyBudgets : undefined}
                  key={label}
                  label={label}
                  onChange={(event) => handleMonthlyChange(monthIndex, stripCommas(event.target.value))}
                  placeholder="0"
                  required
                  value={addCommas(form.monthlyBudgets[monthIndex])}
                />
              )
            })}
          </div>
        </section>
      )
    })
  }

  function renderExecutionQuarterGrid() {
    return Array.from({ length: 4 }, (_, quarterIndex) => {
      const startIndex = quarterIndex * 3
      const quarterMonths = MONTH_LABELS.slice(startIndex, startIndex + 3)
      const quarterRecords = quarterMonths
        .map((month) => monthRecords.find((record) => normalizeMonth(record.monthName) === normalizeMonth(month)))
        .filter((record): record is BudgetMonthRecord => Boolean(record))
      const quarterTotal = quarterRecords.reduce((sum, record) => sum + record.actualBudget, 0)
      const isCurrentQuarter = quarterIndex === currentQuarterIndex

      return (
        <section
          aria-label={`Quarter ${quarterIndex + 1}${isCurrentQuarter ? ', current quarter' : ''}`}
          className={`edit-activity__execution-budget-quarter${isCurrentQuarter ? ' edit-activity__execution-budget-quarter--current' : ''}`}
          key={`execution-quarter-${quarterIndex + 1}`}
        >
          <div className="edit-activity__execution-budget-quarter-header">
            <div className="edit-activity__execution-budget-quarter-title">
              <span className="edit-activity__execution-budget-quarter-number">Q{quarterIndex + 1}</span>
              <span className="edit-activity__execution-budget-quarter-range">
                {quarterMonths[0]} to {quarterMonths[quarterMonths.length - 1]}
              </span>
            </div>
            <div className="edit-activity__execution-budget-quarter-total">
              <span>Actual total</span>
              <strong><CurrencyDisplay value={quarterTotal} /></strong>
            </div>
          </div>

          <div className="edit-activity__execution-budget-quarter-body">
            {quarterMonths.map((monthName) => {
              const monthRecord = monthRecords.find((record) => normalizeMonth(record.monthName) === normalizeMonth(monthName))
              const monthId = monthRecord?.id ?? monthName
              const isFuture = isFutureMonth(monthName)
              const deliveredDraft = inlineDeliveredDrafts[monthId] ?? numberToString(monthRecord?.deliveredAmount)
              const canEditCurrentMonth = executionMonthlyEditAllowed && !isFuture && Boolean(monthRecord)
              const canOpenMonthDrawer = Boolean(monthRecord) && !isFuture
              const hasDetails = (monthRecord?.details.length ?? 0) > 0

              return (
                <article
                  className={`edit-activity__execution-budget-month${isFuture ? ' edit-activity__execution-budget-month--future' : ''}${monthRecord?.isZero ? ' edit-activity__execution-budget-month--zero' : ''}`}
                  key={monthName}
                >
                  <div className="edit-activity__execution-budget-month-head">
                    <div className="edit-activity__execution-budget-month-head-copy">
                      <strong>{monthName}</strong>
                      <span>{getExecutionMonthMeta(monthName)}</span>
                    </div>
                    <div className="edit-activity__execution-budget-month-head-side">
                      <div className="edit-activity__execution-budget-month-statuses">
                        {monthRecord?.isZero ? <span className="edit-activity__execution-budget-zero-pill">Zero</span> : null}
                        <span className={`edit-activity__execution-budget-month-chip${isFuture ? ' edit-activity__execution-budget-month-chip--future' : ''}`}>
                          {isFuture ? 'Future' : 'Open'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="edit-activity__execution-budget-values">
                    <div className="edit-activity__execution-budget-value">
                      <span>Planned Budget</span>
                      <strong><CurrencyDisplay value={monthRecord?.plannedBudget ?? 0} /></strong>
                    </div>

                    <div className="edit-activity__execution-budget-value">
                      <span>Actual Spending</span>
                      <strong><CurrencyDisplay value={monthRecord?.actualBudget ?? 0} /></strong>
                    </div>

                    <div className="edit-activity__execution-budget-value edit-activity__execution-budget-value--detail-count">
                      <span>Account Codes</span>
                      <strong>{monthRecord?.details.length ?? 0}</strong>
                    </div>
                    <div className="edit-activity__execution-budget-value edit-activity__execution-budget-value--delivered">
                      <CurrencyInput
                        className="edit-activity__execution-budget-delivered"
                        disabled={!canEditCurrentMonth || Boolean(monthRecord?.isZero) || isSavingExecutionMonth === monthId}
                        error={inlineDeliveredErrors[monthId]}
                        label="Delivered Value"
                        onBlur={() => {
                          void handleDeliveredValueBlur(monthId)
                        }}
                        onChange={(event) => handleDeliveredValueChange(monthId, stripCommas(event.target.value))}
                        placeholder="0"
                        value={addCommas(deliveredDraft)}
                      />
                    </div>
                  </div>

                  <div className="edit-activity__execution-budget-month-actions">
                    <Button
                      className="edit-activity__execution-budget-manage-btn"
                      disabled={!canOpenMonthDrawer}
                      icon={<List size={15} />}
                      onClick={() => openDrawer(monthId)}
                      variant="secondary"
                    >
                      Manage Account Codes
                    </Button>
                    {canEditCurrentMonth ? (
                      <Button
                        className={`edit-activity__execution-budget-zero-btn${monthRecord?.isZero ? ' edit-activity__execution-budget-zero-btn--active' : ''}`}
                        disabled={(!monthRecord?.isZero && hasDetails) || isSavingExecutionMonth === monthId}
                        icon={<RotateCcw size={15} />}
                        onClick={() => {
                          void handleToggleZero(monthId)
                        }}
                        variant="ghost"
                      >
                        {monthRecord?.isZero ? 'Unset Zero' : 'Set to Zero'}
                      </Button>
                    ) : null}
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )
    })
  }

  function renderExecutionGraphView() {
    return (
      <div className="edit-activity__execution-budget-graph" aria-label="Execution budget graphical view">
        <div className="edit-activity__execution-budget-graph-section">
          <div className="edit-activity__execution-budget-graph-head">
            <h3>Budget Spending Monthly</h3>
            <div className="edit-activity__execution-budget-graph-legend" aria-hidden="true">
              <span><i className="edit-activity__execution-budget-legend-dot edit-activity__execution-budget-legend-dot--planned" /> Planned</span>
              <span><i className="edit-activity__execution-budget-legend-dot edit-activity__execution-budget-legend-dot--actual" /> Actual</span>
              <span><i className="edit-activity__execution-budget-legend-dot edit-activity__execution-budget-legend-dot--delivered" /> Delivered</span>
            </div>
          </div>

          <div className="edit-activity__execution-budget-monthly-chart">
            <div className="edit-activity__execution-budget-monthly-y-axis" aria-hidden="true">
              <CurrencyDisplay value={monthlyGraphicalMaxValue} />
              <CurrencyDisplay value={Math.round(monthlyGraphicalMaxValue * 0.75)} />
              <CurrencyDisplay value={Math.round(monthlyGraphicalMaxValue / 2)} />
              <CurrencyDisplay value={Math.round(monthlyGraphicalMaxValue * 0.25)} />
              <CurrencyDisplay value={0} />
            </div>
            <div className="edit-activity__execution-budget-monthly-plot">
              {graphicalMonths.map((month) => {
                const plannedHeight = month.plannedBudget > 0 ? Math.min(100, Math.max(3, (month.plannedBudget / monthlyGraphicalMaxValue) * 100)) : 0
                const actualHeight = month.actualBudget > 0 ? Math.min(100, Math.max(3, (month.actualBudget / monthlyGraphicalMaxValue) * 100)) : 0
                const deliveredHeight = month.deliveredAmount > 0 ? Math.min(100, Math.max(3, (month.deliveredAmount / monthlyGraphicalMaxValue) * 100)) : 0

                return (
                  <article
                    className="edit-activity__execution-budget-monthly-chart-item"
                    key={month.monthName}
                    title={`${month.monthName} | Planned: ${month.plannedBudget} | Actual: ${month.actualBudget} | Delivered: ${month.deliveredAmount}`}
                  >
                    <div className="edit-activity__execution-budget-monthly-bars" aria-hidden="true">
                      <span
                        className="edit-activity__execution-budget-monthly-bar edit-activity__execution-budget-monthly-bar--planned"
                        style={{ height: `${plannedHeight}%` }}
                      />
                      <span
                        className="edit-activity__execution-budget-monthly-bar edit-activity__execution-budget-monthly-bar--actual"
                        style={{ height: `${actualHeight}%` }}
                      />
                      <span
                        className="edit-activity__execution-budget-monthly-bar edit-activity__execution-budget-monthly-bar--delivered"
                        style={{ height: `${deliveredHeight}%` }}
                      />
                    </div>
                    <strong>{month.monthName.slice(0, 3)}</strong>
                  </article>
                )
              })}
            </div>
          </div>
        </div>

        <div className="edit-activity__execution-budget-graph-section">
          <div className="edit-activity__execution-budget-graph-head">
            <h3>Planned Spent vs Actual Spent</h3>
          <div className="edit-activity__execution-budget-graph-legend" aria-hidden="true">
            <span><i className="edit-activity__execution-budget-legend-dot edit-activity__execution-budget-legend-dot--planned" /> Planned Spent</span>
            <span><i className="edit-activity__execution-budget-legend-dot edit-activity__execution-budget-legend-dot--actual" /> Actual Spent</span>
          </div>
          </div>

          <div className="edit-activity__execution-budget-chart">
          {graphicalQuarters.map((quarter) => {
            const plannedHeight = Math.max(4, (quarter.plannedSpent / graphicalMaxValue) * 100)
            const actualHeight = Math.max(4, (quarter.actualSpent / graphicalMaxValue) * 100)

            return (
              <article className="edit-activity__execution-budget-chart-quarter" key={quarter.label}>
                <div className="edit-activity__execution-budget-chart-quarter-head">
                  <strong>{quarter.label}</strong>
                  <span>{quarter.range}</span>
                </div>
                <div className="edit-activity__execution-budget-chart-bars" aria-hidden="true">
                  <div className="edit-activity__execution-budget-chart-bar-wrap">
                    <span
                      className="edit-activity__execution-budget-chart-bar edit-activity__execution-budget-chart-bar--planned"
                      style={{ height: `${plannedHeight}%` }}
                    />
                    <em>Planned</em>
                  </div>
                  <div className="edit-activity__execution-budget-chart-bar-wrap">
                    <span
                      className="edit-activity__execution-budget-chart-bar edit-activity__execution-budget-chart-bar--actual"
                      style={{ height: `${actualHeight}%` }}
                    />
                    <em>Actual</em>
                  </div>
                </div>
                <div className="edit-activity__execution-budget-chart-copy">
                  <span className="edit-activity__execution-budget-chart-copy-row edit-activity__execution-budget-chart-copy-row--planned">
                    Planned <CurrencyDisplay value={quarter.plannedSpent} />
                  </span>
                  <span className="edit-activity__execution-budget-chart-copy-row edit-activity__execution-budget-chart-copy-row--actual">
                    Actual <CurrencyDisplay value={quarter.actualSpent} />
                  </span>
                  <div className="edit-activity__execution-budget-progress-track">
                    <span style={{ width: `${quarter.progress}%` }} />
                  </div>
                </div>
              </article>
            )
          })}
          <article className="edit-activity__execution-budget-overall">
            <div>
              <span>Overall Progress</span>
              <strong>{overallProgress}%</strong>
            </div>
            <div className="edit-activity__execution-budget-overall-ring" style={{ '--progress': `${overallProgress}%` } as CSSProperties}>
              <span>{overallProgress}%</span>
            </div>
            <div className="edit-activity__execution-budget-overall-values">
              <span>Planned <CurrencyDisplay value={overallPlannedSpent} /></span>
              <span>Actual <CurrencyDisplay value={overallActualSpent} /></span>
            </div>
          </article>
          </div>
        </div>
      </div>
    )
  }

  const drawerColumns: readonly DataGridColumn<BudgetDetailGridRow>[] = [
    {
      header: '#',
      key: 'index',
      render: (row) => <span>{row.index}</span>,
    },
    {
      header: 'Account Code',
      key: 'accountCode',
      render: (row) => (
        <span className="edit-activity__budget-detail-account-code" title={row.accountCodeLabel}>
          {row.accountCodeLabel}
        </span>
      ),
    },
    {
      header: 'GRN',
      key: 'grn',
      render: (row) => (
        <span className="edit-activity__budget-detail-grn" title={row.grn}>
          {row.grn}
        </span>
      ),
    },
    {
      header: 'Amount',
      key: 'amount',
      render: (row) => (
        <span className="edit-activity__budget-detail-amount">
          <CurrencyDisplay value={row.amount} />
        </span>
      ),
    },
    {
      header: 'Action',
      key: 'actions',
      render: (row) => (
        <div className="edit-activity__budget-detail-actions">
          <button
            aria-label="Edit budget detail"
            className="edit-activity__procurement-action-btn"
            disabled={!executionMonthlyEditAllowed}
            onClick={() => openEditDetailForm(row)}
            type="button"
          >
            <Pencil size={14} />
          </button>
          <button
            aria-label="Delete budget detail"
            className="edit-activity__procurement-action-btn edit-activity__procurement-action-btn--danger"
            disabled={!executionMonthlyEditAllowed}
            onClick={() => handleDeleteDrawerRow(row.localId)}
            type="button"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ),
    },
  ]

  function renderExecutionDrawer() {
    const title = selectedDrawerMonth ? `Budget Details - ${selectedDrawerMonth.monthName}` : 'Budget Details'
    const isDrawerReadOnly = !executionMonthlyEditAllowed
    const addDisabled = isDrawerReadOnly || !selectedDrawerMonth || selectedDrawerMonth.isZero

    return (
      <SideDrawer
        actions={
          <div className="edit-activity__budget-details-drawer-actions">
            <Button onClick={closeDrawer} variant="secondary">
              Close
            </Button>
            <Button disabled={isSavingDrawer} onClick={() => void handleConfirmDrawer()}>
              {isSavingDrawer ? 'Confirming...' : 'Confirm'}
            </Button>
          </div>
        }
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        title={title}
      >
        <div className="edit-activity__budget-details-drawer">
          {detailDraftErrors.submit ? (
            <div className="create-activity__notice create-activity__notice--error" role="alert">
              {detailDraftErrors.submit}
            </div>
          ) : null}

          <div className="edit-activity__budget-details-stats">
            <div className="edit-activity__budget-details-stat">
              <span>Allocated Budget</span>
              <strong><CurrencyDisplay value={drawerAllocatedBudget} /></strong>
            </div>
            <div className="edit-activity__budget-details-stat">
              <span>Total Actual Budget</span>
              <strong><CurrencyDisplay value={drawerActualTotal} /></strong>
            </div>
            <div className="edit-activity__budget-details-stat">
              <span>Remaining Budget</span>
              <strong><CurrencyDisplay value={drawerRemainingBudget} /></strong>
            </div>
          </div>

          {selectedDrawerMonth?.isZero ? (
            <div className="create-activity__notice create-activity__notice--warning" role="alert">
              This month is currently set to zero. Remove the zero flag first if you want to add budget details.
            </div>
          ) : null}

          <div className="edit-activity__budget-details-header">
            <div>
              <span>Account Codes</span>
              <h3>Monthly detail breakdown</h3>
            </div>
            <Button disabled={addDisabled} icon={<Plus size={16} />} onClick={openAddDetailForm} variant="secondary">
              Add Budget Entry
            </Button>
          </div>

          {isDetailFormOpen ? (
            <div className="edit-activity__budget-details-form">
              <Select
                disabled={isDrawerReadOnly}
                error={detailDraftErrors.accountCodeId}
                id="budget-detail-account-code"
                label="Account Code"
                onChange={(value) => handleDetailDraftChange({ accountCodeId: value })}
                options={accountCodeSelectOptions}
                required
                value={detailDraft.accountCodeId}
              />
              <Input
                disabled={isDrawerReadOnly}
                error={detailDraftErrors.grn}
                label="GRN"
                onChange={(event) => handleDetailDraftChange({ grn: event.target.value })}
                required
                value={detailDraft.grn}
              />
              <CurrencyInput
                disabled={isDrawerReadOnly}
                error={detailDraftErrors.amount}
                label="Amount"
                onChange={(event) => handleDetailDraftChange({ amount: stripCommas(event.target.value) })}
                placeholder="0"
                required
                value={addCommas(detailDraft.amount)}
              />

              <div className="edit-activity__budget-details-form-actions">
                <Button onClick={cancelDetailForm} variant="ghost">
                  Cancel
                </Button>
                <Button disabled={isDrawerReadOnly} onClick={handleCommitDetailDraft}>
                  Add Entry
                </Button>
              </div>
            </div>
          ) : null}

          <div className="edit-activity__budget-details-grid-wrap">
            <DataGrid
              columns={drawerColumns}
              emptyMessage="No budget details have been added for this month yet."
              getRowKey={(row) => row.localId}
              rows={visibleDrawerRows}
            />
          </div>
        </div>
      </SideDrawer>
    )
  }

  if (isLoading) {
    return (
      <div className="edit-activity__manual-form">
        <Card className="create-activity__section">
          <div className="create-activity__section-header">
            <div className="create-activity__section-header-inner">
              <span className="create-activity__section-header-icon" aria-hidden="true">
                <Wallet size={18} />
              </span>
              <div>
                <span>Budget</span>
                <h2>Loading budget information...</h2>
              </div>
            </div>
          </div>
          <div className="create-activity__form-stack">
            <div className="skeleton-line skeleton-shimmer" style={{ width: '55%', height: '1rem' }} />
            <div className="skeleton-input skeleton-shimmer" />
            <div className="skeleton-input skeleton-shimmer" />
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="edit-activity__manual-form">
      {errors.context ? (
        <div className="create-activity__notice create-activity__notice--error" role="alert">
          {errors.context}
        </div>
      ) : null}

      {!hasAllMonthlyRows ? (
        <div className="create-activity__notice create-activity__notice--warning" role="alert">
          Monthly budget setup is incomplete. Missing rows: {missingMonths.join(', ')}. The activity creation plugin must create all 12 month rows before budget changes can be saved.
        </div>
      ) : null}

      <AiSummaryPanel
        error={aiSummaryError}
        isLoading={isAiSummaryLoading}
        meta={aiSummaryMeta}
        summaries={aiSummaryBlocks}
        title="Budget"
      />

      <Card className="create-activity__section">
        <div className="create-activity__section-header">
          <div className="create-activity__section-header-inner">
            <span className="create-activity__section-header-icon" aria-hidden="true">
              <Wallet size={18} />
            </span>
            <div>
              <span>Budget Overview</span>
              <h2>Summary metrics and review</h2>
            </div>
          </div>
        </div>

        <div className="create-activity__form-stack">
          <div className="edit-activity__budget-stats">
            <div className="edit-activity__budget-stat edit-activity__budget-stat--spent">
              <span className="edit-activity__budget-stat-label">Total Actual Budget Spent</span>
              <span className="edit-activity__budget-stat-value">
                <CurrencyDisplay value={actualBudgetSpent} />
              </span>
            </div>
            <div className="edit-activity__budget-stat edit-activity__budget-stat--remaining">
              <span className="edit-activity__budget-stat-label">Remaining Budget</span>
              <span className="edit-activity__budget-stat-value">
                <CurrencyDisplay value={remainingBudget} />
              </span>
            </div>
          </div>

          <div className="create-activity__form-row">
            <Textarea
              disabled={isReadOnly}
              error={errors.budgetReviewComment}
              label="Budget Review Comment"
              onChange={(event) => handleFieldChange({ budgetReviewComment: event.target.value })}
              placeholder="Enter your budget review comments..."
              required
              rows={3}
              value={form.budgetReviewComment}
            />
          </div>
        </div>
      </Card>

      <Card className="create-activity__section">
        <div className="create-activity__section-header">
          <div className="create-activity__section-header-inner">
            <span className="create-activity__section-header-icon" aria-hidden="true">
              <Wallet size={18} />
            </span>
            <div>
              <span>Budget Allocation</span>
              <h2>Source, type, and amounts</h2>
            </div>
          </div>
        </div>

        {isExecutionPhase ? (
          <div className="create-activity__readonly-panel">
            {renderBudgetReadOnlyDetails([
              {
                label: 'Budget Source',
                value: renderBudgetReadOnlyValue(getOptionLabel(BUDGET_SOURCE_OPTIONS, form.budgetSource)),
                kind: 'classification',
                columns: 6,
              },
              {
                label: 'Budget Type',
                value: renderBudgetReadOnlyValue(getOptionLabel(BUDGET_TYPE_OPTIONS, form.budgetType)),
                kind: 'classification',
                columns: 6,
              },
              ...(showTotalActivityBudget
                ? [{
                    label: 'Total Activity Budget (Across Multiple Years)',
                    value: <CurrencyDisplay value={parseNum(form.totalActivityBudget)} />,
                    kind: 'requirement' as const,
                    columns: 4 as const,
                  }]
                : []),
              {
                label: 'Total Planned Budget',
                value: <CurrencyDisplay value={parseNum(form.totalPlannedBudget)} />,
                kind: 'requirement',
                columns: showTotalActivityBudget ? 4 : 6,
              },
              {
                label: 'Allocated Budget',
                value: <CurrencyDisplay value={parseNum(form.allocatedBudget)} />,
                kind: 'requirement',
                columns: showTotalActivityBudget ? 4 : 6,
              },
            ])}
          </div>
        ) : (
          <div className="create-activity__form-stack">
            <div className="create-activity__form-row">
              <RadioGroup
                className="edit-activity__budget-source"
                disabled={isReadOnly}
                error={errors.budgetSource}
                label="Budget Source"
                name="budget-source"
                onChange={(value) => handleFieldChange({ budgetSource: value as BudgetFormData['budgetSource'] })}
                options={BUDGET_SOURCE_OPTIONS}
                required
                value={form.budgetSource}
              />
            </div>

            <div className="create-activity__form-row">
              <RadioGroup
                className="edit-activity__budget-type"
                disabled={isReadOnly}
                error={errors.budgetType}
                label="Budget Type"
                name="budget-type"
                onChange={(value) => handleFieldChange({ budgetType: value as BudgetFormData['budgetType'] })}
                options={BUDGET_TYPE_OPTIONS}
                required
                value={form.budgetType}
              />
            </div>

            <div className="create-activity__form-row create-activity__form-row--three">
              {showTotalActivityBudget ? (
                <CurrencyInput
                  disabled={isReadOnly}
                  error={errors.totalActivityBudget}
                  label="Total Activity Budget (Across Multiple Years)"
                  onChange={(event) => handleFieldChange({ totalActivityBudget: stripCommas(event.target.value) })}
                  placeholder="0"
                  required
                  value={addCommas(form.totalActivityBudget)}
                />
              ) : null}

              <label className="field field--disabled edit-activity__budget-disabled-currency">
                <span className="field__label">
                  Total Planned Budget
                  <span aria-hidden="true" className="field__required"> *</span>
                </span>
                <span className="currency-input__control field__input-wrap" style={{ paddingRight: '2.4rem' }}>
                  <DirhamIcon />
                  <input
                    aria-invalid={false}
                    className="field__control"
                    disabled
                    readOnly
                    required
                    value={addCommas(form.totalPlannedBudget) || '0'}
                  />
                  <span className="field__right-icon">
                    <LockKeyhole size={15} />
                  </span>
                </span>
                <span className="field__hint">Auto-calculated from monthly budgets</span>
              </label>

              <CurrencyInput
                disabled={isReadOnly}
                error={errors.allocatedBudget}
                label="Allocated Budget"
                onChange={(event) => handleFieldChange({ allocatedBudget: stripCommas(event.target.value) })}
                placeholder="0"
                required
                value={addCommas(form.allocatedBudget)}
              />
            </div>
          </div>
        )}
      </Card>

      <Card className="create-activity__section">
        <div className="create-activity__section-header edit-activity__budget-breakdown-header">
          <div className="create-activity__section-header-inner">
            <span className="create-activity__section-header-icon" aria-hidden="true">
              <Wallet size={18} />
            </span>
            <div>
              <span>Monthly Budget Breakdown</span>
              <h2>{isExecutionPhase ? 'Execution tracking grid' : '12-month allocation grid'}</h2>
            </div>
          </div>
          {isExecutionPhase ? (
            <div className="edit-activity__budget-view-switch" aria-label="Budget view mode">
              <button
                aria-pressed={budgetViewMode === 'cards'}
                className={budgetViewMode === 'cards' ? 'edit-activity__budget-view-switch-btn edit-activity__budget-view-switch-btn--active' : 'edit-activity__budget-view-switch-btn'}
                onClick={() => setBudgetViewMode('cards')}
                type="button"
              >
                <LayoutGrid size={15} />
                <span>Card View</span>
              </button>
              <button
                aria-pressed={budgetViewMode === 'graph'}
                className={budgetViewMode === 'graph' ? 'edit-activity__budget-view-switch-btn edit-activity__budget-view-switch-btn--active' : 'edit-activity__budget-view-switch-btn'}
                onClick={() => setBudgetViewMode('graph')}
                type="button"
              >
                <ChartNoAxesColumnIncreasing size={15} />
                <span>Graphical View</span>
              </button>
            </div>
          ) : null}
        </div>

        <div className="create-activity__form-stack edit-activity__monthly-body">
          <div className="edit-activity__monthly-overview">
            <div className="edit-activity__monthly-intro">
              <span className="edit-activity__monthly-icon" aria-hidden="true">
                <CalendarRange size={20} />
              </span>
              <div>
                <strong>{isExecutionPhase ? 'Execution budget tracking' : 'Fiscal year allocation'}</strong>
                <span>
                  {isExecutionPhase
                    ? 'Track actual spending through month-level budget details and update delivered values up to the current month.'
                    : 'Update the planned budget on the 12 monthly rows created by the activity plugin.'}
                </span>
              </div>
            </div>
            <div className="edit-activity__monthly-metrics">
              <div className="edit-activity__monthly-metric">
                <span>{isExecutionPhase ? 'Annual actual total' : 'Annual planned total'}</span>
                <strong>
                  <CurrencyDisplay value={isExecutionPhase ? actualBudgetSpent : sumMonthly(form.monthlyBudgets)} />
                </strong>
              </div>
              <div className="edit-activity__monthly-metric edit-activity__monthly-metric--progress">
                <span><CircleCheck size={13} /> Rows loaded</span>
                <strong>{orderedMonthRecords.length}/12 months</strong>
              </div>
            </div>
            <div
              aria-label={`${orderedMonthRecords.length} of 12 monthly budget rows loaded`}
              aria-valuemax={12}
              aria-valuemin={0}
              aria-valuenow={orderedMonthRecords.length}
              className="edit-activity__monthly-progress-track"
              role="progressbar"
            >
              <span style={{ width: `${(orderedMonthRecords.length / 12) * 100}%` }} />
            </div>
          </div>

          <div className={isExecutionPhase ? 'edit-activity__execution-budget-quarter-grid' : 'edit-activity__monthly-quarter-grid'}>
            {isExecutionPhase
              ? budgetViewMode === 'cards'
                ? renderExecutionQuarterGrid()
                : renderExecutionGraphView()
              : renderPlanningQuarterGrid()}
          </div>
        </div>
      </Card>

      {isExecutionPhase ? renderExecutionDrawer() : null}
    </div>
  )
}
