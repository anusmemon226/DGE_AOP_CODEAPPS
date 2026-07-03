import { useCallback, useEffect, useMemo, useState } from 'react'
import { CalendarRange, CircleCheck, LockKeyhole, Wallet } from 'lucide-react'
import {
  Card,
  CurrencyDisplay,
  CurrencyInput,
  DirhamIcon,
  RadioGroup,
  Textarea,
} from '../../components/ui'
import type { Dga_aop_project_budgets } from '../../generated/models/Dga_aop_project_budgetsModel'
import type { Dga_aop_projectses, Dga_aop_projectsesBase } from '../../generated/models/Dga_aop_projectsesModel'
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

// â”€â”€ Types â”€â”€

export type BudgetHeaderAction = {
  canSave: boolean
  isSaving: boolean
  label: string
  onSave: () => void
  savingLabel: string
}

type BudgetMonthRecord = {
  id: string
  monthName: string
  plannedBudget: number
  actualBudget: number
  deliveredAmount: number
  isZero?: boolean
}

type BudgetProjectPayload = Partial<Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid'>>

interface BudgetTabProps {
  isReadOnly?: boolean
  onHeaderActionChange?: (action: BudgetHeaderAction | null) => void
  plannedEndDate: string
  plannedStartDate: string
  projectId: string
  statusCode?: number
}

// â”€â”€ Constants â”€â”€

const BUDGET_PROJECT_SELECT_FIELDS = [
  'dga_aop_projectsid',
  'dga_budget_source',
  'dga_budget_type',
  'dga_total_project_budget',
  'dga_allocated_budget',
  'dga_requested_budget',
  'dga_budget_review_comments',
]

const BUDGET_MONTH_SELECT_FIELDS = [
  'dga_aop_project_budgetid',
  'dga_name',
  'dga_planned_budget',
  'dga_actual_budget',
  'dga_delivered_amount',
  'dga_is_zero',
  '_dga_aop_project_value',
]

// â”€â”€ Helpers â”€â”€

function stripCommas(value: string): string {
  return value.replace(/,/g, '')
}

function addCommas(value: string): string {
  if (!value) return value
  const parts = value.split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return parts.join('.')
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
  return months.reduce((sum, m) => sum + parseNum(m), 0)
}

function calcDelta(allocated: string, totalPlanned: string): string {
  return String(parseNum(allocated) - parseNum(totalPlanned))
}

function normalizeId(id?: string | null) {
  return id?.replace(/[{}]/g, '').toLowerCase() ?? ''
}

function normalizeMonth(value?: string | null) {
  return String(value ?? '').trim().toLowerCase()
}

function projectLookupFilter(projectId: string) {
  return `_dga_aop_project_value eq '${normalizeId(projectId)}'`
}

function toChoice<TValue extends string>(value: unknown, allowed: readonly TValue[]): TValue | '' {
  const normalized = String(value ?? '')
  return allowed.includes(normalized as TValue) ? normalized as TValue : ''
}

function isInvalidCurrency(value: string) {
  if (!value.trim()) return false
  const parsed = Number(stripCommas(value))
  return !Number.isFinite(parsed) || parsed < 0
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

function recordToMonth(record: Dga_aop_project_budgets): BudgetMonthRecord | null {
  if (!record.dga_aop_project_budgetid || !record.dga_name) return null

  return {
    id: record.dga_aop_project_budgetid,
    monthName: record.dga_name,
    plannedBudget: record.dga_planned_budget ?? 0,
    actualBudget: record.dga_actual_budget ?? 0,
    deliveredAmount: record.dga_delivered_amount ?? 0,
    isZero: record.dga_is_zero,
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
    budgetSource: toChoice(project.dga_budget_source, ['1', '2'] as const),
    budgetType: toChoice(project.dga_budget_type, ['1', '2'] as const),
    totalActivityBudget: numberToString(project.dga_total_project_budget),
    totalPlannedBudget,
    allocatedBudget,
    delta: calcDelta(allocatedBudget, totalPlannedBudget),
    budgetReviewComment: project.dga_budget_review_comments ?? '',
    monthlyBudgets,
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

// â”€â”€ Component â”€â”€

export function BudgetTab({
  isReadOnly = false,
  onHeaderActionChange,
  plannedEndDate,
  plannedStartDate,
  projectId,
  statusCode = 1,
}: BudgetTabProps) {
  const [form, setForm] = useState<BudgetFormData>(INITIAL_BUDGET_FORM)
  const [monthRecords, setMonthRecords] = useState<BudgetMonthRecord[]>([])
  const [errors, setErrors] = useState<BudgetFieldErrors & { context?: string; submit?: string }>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const currentQuarterIndex = Math.floor(new Date().getMonth() / 3)

  // â”€â”€ Derived state â”€â”€

  const showTotalActivityBudget = useMemo(() => {
    if (!plannedStartDate || !plannedEndDate) return false
    return new Date(plannedStartDate).getFullYear() !== new Date(plannedEndDate).getFullYear()
  }, [plannedStartDate, plannedEndDate])

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
  const actualBudgetSpent = monthRecords.reduce((sum, record) => sum + record.actualBudget, 0)
  const remainingBudget = Math.max(parseNum(form.allocatedBudget) - actualBudgetSpent, 0)

  // â”€â”€ Loading â”€â”€

  useEffect(() => {
    if (!successMessage) return

    const timeoutId = window.setTimeout(() => {
      setSuccessMessage('')
    }, 10000)

    return () => window.clearTimeout(timeoutId)
  }, [successMessage])

  useEffect(() => {
    let isMounted = true

    async function loadBudget() {
      setIsLoading(true)
      setSuccessMessage('')
      setErrors({})

      if (!projectId) {
        setErrors({ context: 'Activity id is missing from the edit URL.' })
        setIsLoading(false)
        return
      }

      try {
        const [projectResult, monthsResult] = await Promise.all([
          Dga_aop_projectsesService.get(projectId, {
            select: BUDGET_PROJECT_SELECT_FIELDS,
          }),
          Dga_aop_project_budgetsService.getAll({
            filter: projectLookupFilter(projectId),
            select: BUDGET_MONTH_SELECT_FIELDS,
          }),
        ])

        if (!isMounted) return

        assertOperationSuccess(projectResult, 'Failed to load project budget.')
        assertOperationSuccess(monthsResult, 'Failed to load monthly budget rows.')

        const project = getResultValue<Dga_aop_projectses>(projectResult)
        if (!project) throw new Error('Project budget could not be found.')

        const months = ((monthsResult.data ?? []) as Dga_aop_project_budgets[])
          .map(recordToMonth)
          .filter((record): record is BudgetMonthRecord => Boolean(record))

        const nextForm = buildForm(project, months)
        setMonthRecords(months)
        setForm(nextForm)
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
    return () => { isMounted = false }
  }, [projectId])

  // â”€â”€ Form handlers â”€â”€

  function handleFieldChange(fields: Partial<BudgetFormData>) {
    if (isReadOnly) return
    setSuccessMessage('')

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
        if (
          ['allocatedBudget', 'totalActivityBudget'].includes(changedKey)
          && isInvalidCurrency(value)
        ) {
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
    if (isReadOnly) return
    if (isSaving) return

    setSuccessMessage('')

    if (!projectId) {
      setErrors({ context: 'Activity id is missing from the edit URL.' })
      return
    }

    const nextErrors = validateBudgetForm(form, showTotalActivityBudget, hasAllMonthlyRows)
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setIsSaving(true)
    try {
      const projectPayload = buildProjectPayload(form, showTotalActivityBudget)
      console.log('Edit activity budget project payload', projectPayload)

      const projectResult = await Dga_aop_projectsesService.update(
        projectId,
        projectPayload,
      )
      assertOperationSuccess(projectResult, 'Failed to save project budget fields.')

      for (const record of orderedMonthRecords) {
        const monthIndex = MONTH_LABELS.findIndex((month) => normalizeMonth(month) === normalizeMonth(record.monthName))
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
        const monthIndex = MONTH_LABELS.findIndex((month) => normalizeMonth(month) === normalizeMonth(record.monthName))
        if (monthIndex === -1) return record
        const plannedBudget = parseNum(form.monthlyBudgets[monthIndex])
        return {
          ...record,
          isZero: plannedBudget === 0,
          plannedBudget,
        }
      })
      setMonthRecords(refreshedMonthRecords)
      setErrors({})
      setSuccessMessage('Budget information saved successfully.')
    } catch (error) {
      setErrors((currentErrors) => ({
        ...currentErrors,
        submit: error instanceof Error ? error.message : 'Failed to save budget information.',
      }))
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
    projectId,
    showTotalActivityBudget,
  ])

  useEffect(() => {
    onHeaderActionChange?.({
      canSave: !isReadOnly && !isLoading && !isSaving && !errors.context,
      isSaving,
      label: saveLabel,
      onSave: handleSave,
      savingLabel: 'Saving...',
    })

    return () => onHeaderActionChange?.(null)
  }, [
    errors.context,
    handleSave,
    hasAllMonthlyRows,
    isReadOnly,
    isLoading,
    isSaving,
    onHeaderActionChange,
    saveLabel,
  ])

// â”€â”€ Render helpers â”€â”€

  function renderQuarterGrid() {
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
                  key={label}
                  error={errors.monthlyBudgets && isInvalidCurrency(form.monthlyBudgets[monthIndex]) ? errors.monthlyBudgets : undefined}
                  label={label}
                  onChange={(e) => handleMonthlyChange(monthIndex, stripCommas(e.target.value))}
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

  // â”€â”€ Render â”€â”€

  return (
    <div className="edit-activity__manual-form">
      {errors.context ? (
        <div className="create-activity__notice create-activity__notice--error" role="alert">
          {errors.context}
        </div>
      ) : null}

      {errors.submit ? (
        <div className="create-activity__notice create-activity__notice--error" role="alert">
          {errors.submit}
        </div>
      ) : null}

      {successMessage ? (
        <div className="create-activity__notice create-activity__notice--success" role="status">
          {successMessage}
        </div>
      ) : null}

      {!hasAllMonthlyRows ? (
        <div className="create-activity__notice create-activity__notice--warning" role="alert">
          Monthly budget setup is incomplete. Missing rows: {missingMonths.join(', ')}. The activity creation plugin must create all 12 month rows before budget changes can be saved.
        </div>
      ) : null}

      {/* â”€â”€ Card 1: Budget Overview â”€â”€ */}
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
              onChange={(e) => handleFieldChange({ budgetReviewComment: e.target.value })}
              placeholder="Enter your budget review comments..."
              required
              rows={3}
              value={form.budgetReviewComment}
            />
          </div>
        </div>
      </Card>

      {/* â”€â”€ Card 2: Budget Allocation â”€â”€ */}
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
                onChange={(e) => handleFieldChange({ totalActivityBudget: stripCommas(e.target.value) })}
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
                  required
                  value={addCommas(form.totalPlannedBudget) || '0'}
                  readOnly
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
              onChange={(e) => handleFieldChange({ allocatedBudget: stripCommas(e.target.value) })}
              placeholder="0"
              required
              value={addCommas(form.allocatedBudget)}
            />
          </div>
        </div>
      </Card>

      {/* â”€â”€ Card 3: Monthly Budget Breakdown â”€â”€ */}
      <Card className="create-activity__section">
        <div className="create-activity__section-header">
          <div className="create-activity__section-header-inner">
            <span className="create-activity__section-header-icon" aria-hidden="true">
              <Wallet size={18} />
            </span>
            <div>
              <span>Monthly Budget Breakdown</span>
              <h2>12-month allocation grid</h2>
            </div>
          </div>
        </div>

        <div className="create-activity__form-stack edit-activity__monthly-body">
          <div className="edit-activity__monthly-overview">
            <div className="edit-activity__monthly-intro">
              <span className="edit-activity__monthly-icon" aria-hidden="true">
                <CalendarRange size={20} />
              </span>
              <div>
                <strong>Fiscal year allocation</strong>
                <span>Update the planned budget on the 12 monthly rows created by the activity plugin.</span>
              </div>
            </div>
            <div className="edit-activity__monthly-metrics">
              <div className="edit-activity__monthly-metric">
                <span>Annual planned total</span>
                <strong><CurrencyDisplay value={sumMonthly(form.monthlyBudgets)} /></strong>
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

          <div className="edit-activity__monthly-quarter-grid">
            {renderQuarterGrid()}
          </div>
        </div>
      </Card>
    </div>
  )
}
