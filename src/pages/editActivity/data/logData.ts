// ── Pagination ──

export const LOG_ITEMS_PER_PAGE = 5

// ── Log entry types ──

export type LogType = 'status-change' | 'field-edit' | 'clarification' | 'submission' | 'approval'

export type LogEntry = {
  id: string
  name: string
  type: LogType
  previousValue: string
  newValue: string
  createdOn: Date
  createdBy: string
}

// ── Type display config ──

export const LOG_TYPE_CONFIG: Record<LogType, { label: string; tone: 'neutral' | 'info' | 'warning' | 'success' }> = {
  'status-change': { label: 'Status Change', tone: 'info' },
  'field-edit': { label: 'Field Edit', tone: 'warning' },
  clarification: { label: 'Clarification', tone: 'neutral' },
  submission: { label: 'Submission', tone: 'success' },
  approval: { label: 'Approval', tone: 'success' },
}

// ── Sample data ──

export const SAMPLE_LOGS: LogEntry[] = [
  
]
