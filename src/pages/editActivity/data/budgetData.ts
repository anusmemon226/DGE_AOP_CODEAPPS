// ── Budget form data types ──

export type BudgetFormData = {
  budgetSource: '' | '1' | '2'
  budgetType: '' | '1' | '2'
  totalActivityBudget: string
  totalPlannedBudget: string
  allocatedBudget: string
  delta: string
  budgetReviewComment: string
  monthlyBudgets: [string, string, string, string, string, string, string, string, string, string, string, string]
}

export type BudgetFieldErrors = Partial<Record<keyof BudgetFormData, string>>

// ── Radio options ──

export const BUDGET_SOURCE_OPTIONS = [
  { label: 'Strategic Budget', value: '1' },
  { label: 'Operational Budget', value: '2' },
] as const

export const BUDGET_TYPE_OPTIONS = [
  { label: 'Opex', value: '1' },
  { label: 'Capex', value: '2' },
] as const

// ── Month labels ──

export const MONTH_LABELS = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December',
] as const

// ── Initial form state ──

export const INITIAL_BUDGET_FORM: BudgetFormData = {
  budgetSource: '',
  budgetType: '',
  totalActivityBudget: '',
  totalPlannedBudget: '',
  allocatedBudget: '',
  delta: '',
  budgetReviewComment: '',
  monthlyBudgets: ['', '', '', '', '', '', '', '', '', '', '', ''],
}

// ── Field labels for error messages ──

export const BUDGET_FIELD_LABELS: Record<string, string> = {
  budgetSource: 'Budget Source',
  budgetType: 'Budget Type',
  totalActivityBudget: 'Total Activity Budget (Across Multiple Years)',
  totalPlannedBudget: 'Total Planned Budget',
  allocatedBudget: 'Allocated Budget',
  budgetReviewComment: 'Budget Review Comment',
}
