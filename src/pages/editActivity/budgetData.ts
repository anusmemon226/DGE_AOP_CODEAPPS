// ── Budget form data types ──

export type BudgetFormData = {
  budgetSource: '' | '1' | '2'
  budgetType: '' | '776140000' | '776140001' | '776140003'
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
  { label: 'Chapter 1 - HR', value: '776140000' },
  { label: 'Chapter 2 - Opex', value: '776140001' },
  { label: 'Chapter 3 - Capex', value: '776140003' },
] as const

// ── Month labels ──

export const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr',
  'May', 'Jun', 'Jul', 'Aug',
  'Sep', 'Oct', 'Nov', 'Dec',
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
