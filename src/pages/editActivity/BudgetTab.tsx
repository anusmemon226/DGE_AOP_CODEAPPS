import { useMemo, useState } from 'react'
import { Wallet } from 'lucide-react'
import {
  Card,
  CurrencyDisplay,
  CurrencyInput,
  DirhamIcon,
  RadioGroup,
  Textarea,
} from '../../components/ui'
import { LockKeyhole } from 'lucide-react'
import {
  BUDGET_SOURCE_OPTIONS,
  BUDGET_TYPE_OPTIONS,
  INITIAL_BUDGET_FORM,
  MONTH_LABELS,
  type BudgetFieldErrors,
  type BudgetFormData,
} from './budgetData'

// ── Helpers ──

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
  return parseFloat(stripCommas(value)) || 0
}

function sumMonthly(months: BudgetFormData['monthlyBudgets']): number {
  return months.reduce((sum, m) => sum + parseNum(m), 0)
}

function calcDelta(allocated: string, totalPlanned: string): string {
  return String(parseNum(allocated) - parseNum(totalPlanned))
}

// ── Props ──

interface BudgetTabProps {
  plannedEndDate: string
  plannedStartDate: string
}

// ── Component ──

export function BudgetTab({ plannedEndDate, plannedStartDate }: BudgetTabProps) {
  const [form, setForm] = useState<BudgetFormData>(INITIAL_BUDGET_FORM)
  const [errors, setErrors] = useState<BudgetFieldErrors>({})

  // ── Conditional visibility ──

  const showTotalActivityBudget = useMemo(() => {
    if (!plannedStartDate || !plannedEndDate) return false
    return new Date(plannedStartDate).getFullYear() !== new Date(plannedEndDate).getFullYear()
  }, [plannedStartDate, plannedEndDate])

  // ── Form handlers ──

  function handleFieldChange(fields: Partial<BudgetFormData>) {
    setForm((prev) => {
      const next = { ...prev, ...fields }

      // Recalculate total planned budget if any monthly budget changed
      if ('monthlyBudgets' in fields && fields.monthlyBudgets) {
        next.totalPlannedBudget = String(sumMonthly(fields.monthlyBudgets))
      }

      // Recalculate delta if allocated or planned changed
      if ('allocatedBudget' in fields || 'totalPlannedBudget' in fields || 'monthlyBudgets' in fields) {
        next.delta = calcDelta(next.allocatedBudget, next.totalPlannedBudget)
      }

      return next
    })

    // Clear error for the changed field
    const changedKey = Object.keys(fields)[0] as keyof BudgetFormData
    if (changedKey && errors[changedKey]) {
      setErrors((prev) => {
        const copy = { ...prev }
        delete copy[changedKey]
        return copy
      })
    }
  }

  function handleMonthlyChange(index: number, value: string) {
    const nextMonthly = [...form.monthlyBudgets] as BudgetFormData['monthlyBudgets']
    nextMonthly[index] = value
    handleFieldChange({ monthlyBudgets: nextMonthly })
  }

// ── Render helpers ──

  function renderMonthlyGrid() {
    const rows: React.ReactNode[] = []

    for (let row = 0; row < 3; row++) {
      const rowMonths = MONTH_LABELS.slice(row * 4, row * 4 + 4)

      rows.push(
        <div className="create-activity__form-row create-activity__form-row--four" key={`month-row-${row}`}>
          {rowMonths.map((label, col) => {
            const idx = row * 4 + col
            return (
              <CurrencyInput
                key={label}
                error={errors.monthlyBudgets && !form.monthlyBudgets[idx].trim() ? errors.monthlyBudgets : undefined}
                label={label}
                onChange={(e) => handleMonthlyChange(idx, stripCommas(e.target.value))}
                required
                value={addCommas(form.monthlyBudgets[idx])}
              />
            )
          })}
        </div>,
      )
    }

    return rows
  }

  // ── Render ──

  return (
    <div className="edit-activity__manual-form">
      {/* ── Card 1: Budget Overview ── */}
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
                <CurrencyDisplay value={0} />
              </span>
            </div>
            <div className="edit-activity__budget-stat edit-activity__budget-stat--remaining">
              <span className="edit-activity__budget-stat-label">Remaining Budget</span>
              <span className="edit-activity__budget-stat-value">
                <CurrencyDisplay value={0} />
              </span>
            </div>
          </div>

          <div className="create-activity__form-row">
            <Textarea
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

      {/* ── Card 2: Budget Allocation ── */}
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

      {/* ── Card 3: Monthly Budget Breakdown ── */}
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

        <div className="create-activity__form-stack">
          <p className="edit-activity__budget-hint">
            Enter budget amounts for each month of the fiscal year.
          </p>

          {renderMonthlyGrid()}
        </div>
      </Card>
    </div>
  )
}
