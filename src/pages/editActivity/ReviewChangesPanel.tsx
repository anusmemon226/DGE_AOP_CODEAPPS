import { useMemo, useState } from 'react'
import { ArrowRight, ChevronDown, GitCompareArrows } from 'lucide-react'
import { Dga_aop_project_milestone_detailsesstatuscode } from '../../generated/models/Dga_aop_project_milestone_detailsesModel'
import { Dga_aop_projectsesdga_project_activity_status } from '../../generated/models/Dga_aop_projectsesModel'
import {
  Dga_procurement_plansdga_current_procurement_status,
  Dga_procurement_plansdga_tender_type,
} from '../../generated/models/Dga_procurement_plansModel'
import { formatCurrencyAmount, formatDateDisplay } from '../../utils/formatting'
import {
  getProjectRelatedRecords,
  isEmptyRelatedValue,
  isPlainObject,
  isRelatedChange,
  parseProjectRelatedChanges,
  resolveProjectRelatedValue,
  type ProjectRelatedChange,
  type ProjectRelatedChanges,
} from './helpers/projectRelatedChanges'

type ReviewChangeGroupKey =
  | 'activity-info'
  | 'milestones'
  | 'procurements'
  | 'budget'

type ReviewChange = {
  field: string
  oldValue: string
  newValue: string
}

type ReviewChangeGroup = {
  key: ReviewChangeGroupKey
  label: string
  description: string
  changes: ReviewChange[]
}

const GROUP_CONFIG: Record<ReviewChangeGroupKey, Omit<ReviewChangeGroup, 'changes' | 'key'>> = {
  'activity-info': {
    label: 'Activity Information',
    description: 'Core execution and planning updates for the activity.',
  },
  milestones: {
    label: 'Milestones',
    description: 'Changes affecting delivery checkpoints and execution timing.',
  },
  procurements: {
    label: 'Procurement',
    description: 'Updated procurement readiness and sourcing details.',
  },
  budget: {
    label: 'Budget',
    description: 'Budget allocation and execution funding changes.',
  },
}

const FIELD_LABELS: Record<string, string> = {
  attach_contract_file: 'Attach Contract',
  dga_actual_budget: 'Actual Budget',
  dga_actual_contract_duration_in_months: 'Actual Contract Duration',
  dga_actual_contract_value: 'Actual Contract Value',
  dga_actual_end_date: 'Actual End Date',
  dga_actual_progress: 'Actual Progress %',
  dga_actual_start_date: 'Actual Start Date',
  dga_cancellation_reason: 'Cancellation Reason',
  dga_current_procurement_status: 'Procurement Status',
  dga_delivered_amount: 'Delivered Amount',
  dga_does_this_project_require_tender: 'Tender Required',
  dga_justification: 'Justification',
  dga_justification_date: 'Justification Date',
  dga_justification_for_activity_status: 'Justification for Activity Status',
  dga_justification_of_the_change: 'Justification',
  dga_pr_ticket_number: 'PR / Ticket Number',
  dga_progress_update: 'Progress Update',
  dga_project_activity_status: 'Activity Status',
  dga_stage_update_date: 'Stage Update Date',
  dga_tender_type: 'Tender Type',
  statuscode: 'Milestone Status',
  uploaded_file: 'Upload File',
}

const DATE_FIELDS = new Set([
  'dga_actual_end_date',
  'dga_actual_start_date',
  'dga_justification_date',
  'dga_stage_update_date',
])

const CURRENCY_FIELDS = new Set([
  'dga_actual_budget',
  'dga_actual_contract_value',
  'dga_delivered_amount',
])

const ACTIVITY_STATUS_LABELS = Dga_aop_projectsesdga_project_activity_status as Record<number, string>
const MILESTONE_STATUS_LABELS = Dga_aop_project_milestone_detailsesstatuscode as Record<number, string>
const PROCUREMENT_STATUS_LABELS = Dga_procurement_plansdga_current_procurement_status as Record<number, string>
const TENDER_TYPE_LABELS = Dga_procurement_plansdga_tender_type as Record<number, string>

function formatGeneratedLabel(label: string) {
  return label
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
}

function toFieldLabel(fieldName: string) {
  return FIELD_LABELS[fieldName] ?? formatGeneratedLabel(fieldName.replace(/^dga_/, '').replace(/_/g, ' '))
}

function normalizeComparableValue(value: unknown) {
  return isEmptyRelatedValue(value) ? '' : String(value).trim()
}

function formatReviewValue(fieldName: string, value: unknown) {
  if (isEmptyRelatedValue(value)) {
    return '—'
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No'
  }

  if (DATE_FIELDS.has(fieldName)) {
    return formatDateDisplay(String(value))
  }

  if (CURRENCY_FIELDS.has(fieldName)) {
    const formatted = formatCurrencyAmount(value as string | number)
    return formatted ? `AED ${formatted}` : String(value)
  }

  const numericValue = Number(value)
  if (fieldName === 'dga_project_activity_status' && ACTIVITY_STATUS_LABELS[numericValue]) {
    return formatGeneratedLabel(ACTIVITY_STATUS_LABELS[numericValue])
  }
  if (fieldName === 'statuscode' && MILESTONE_STATUS_LABELS[numericValue]) {
    return formatGeneratedLabel(MILESTONE_STATUS_LABELS[numericValue])
  }
  if (fieldName === 'dga_current_procurement_status' && PROCUREMENT_STATUS_LABELS[numericValue]) {
    return formatGeneratedLabel(PROCUREMENT_STATUS_LABELS[numericValue])
  }
  if (fieldName === 'dga_tender_type' && TENDER_TYPE_LABELS[numericValue]) {
    return formatGeneratedLabel(TENDER_TYPE_LABELS[numericValue])
  }

  return String(value)
}

function buildReviewChange(fieldName: string, change: ProjectRelatedChange, prefix = ''): ReviewChange | null {
  const oldDisplaySource = change.new_value
  const newDisplaySource = change.old_value
  const oldComparable = normalizeComparableValue(oldDisplaySource)
  const newComparable = normalizeComparableValue(newDisplaySource)

  if (!oldComparable && !newComparable) return null
  if (oldComparable === newComparable) return null

  return {
    field: prefix ? `${prefix}: ${toFieldLabel(fieldName)}` : toFieldLabel(fieldName),
    oldValue: formatReviewValue(fieldName, oldDisplaySource),
    newValue: formatReviewValue(fieldName, newDisplaySource),
  }
}

function getRecordLabel(record: ProjectRelatedChanges, fallback: string) {
  const legacyName = isRelatedChange(record.dga_name) ? resolveProjectRelatedValue(record.dga_name) : record.dga_name
  const label = record.name ?? record.month_name ?? legacyName
  return isEmptyRelatedValue(label) ? fallback : String(label)
}

function collectDirectChanges(source: unknown, prefix = '') {
  if (!isPlainObject(source)) return []

  return Object.entries(source).flatMap(([fieldName, value]) => {
    if (fieldName === 'dga_name') return []
    if (!isRelatedChange(value)) return []
    const change = buildReviewChange(fieldName, value, prefix)
    return change ? [change] : []
  })
}

function collectRecordChanges(source: unknown, fallbackPrefix: string) {
  if (Array.isArray(source)) {
    return source.flatMap((record, index) => {
      if (!isPlainObject(record)) return []

      const label = getRecordLabel(record as ProjectRelatedChanges, `${fallbackPrefix} ${index + 1}`)
      return collectDirectChanges(record, label)
    })
  }

  if (!isPlainObject(source)) return []

  return Object.entries(source).flatMap(([recordId, record]) => {
    if (!isPlainObject(record)) return []

    const label = getRecordLabel(record as ProjectRelatedChanges, `${fallbackPrefix} ${recordId.slice(0, 8)}`)
    return collectDirectChanges(record, label)
  })
}

function buildDynamicChangeGroups(relatedChanges?: string | null): ReviewChangeGroup[] {
  const parsed = parseProjectRelatedChanges(relatedChanges)
  const milestoneRecords = getProjectRelatedRecords(parsed, 'milestones')
  const procurementRecords = getProjectRelatedRecords(parsed, 'procurements')
  const budgetRecords = getProjectRelatedRecords(parsed, 'budget')

  const groups: Array<[ReviewChangeGroupKey, ReviewChange[]]> = [
    ['activity-info', collectDirectChanges(parsed.activity_information)],
    ['milestones', collectRecordChanges(milestoneRecords, 'Milestone')],
    ['procurements', collectRecordChanges(procurementRecords, 'Procurement')],
    ['budget', collectRecordChanges(budgetRecords, 'Budget Month')],
  ]

  return groups
    .filter(([, changes]) => changes.length > 0)
    .map(([key, changes]) => ({
      key,
      ...GROUP_CONFIG[key],
      changes,
    }))
}

type ReviewChangesPanelProps = {
  activeTab: string
  relatedChanges?: string | null
}

export function ReviewChangesPanel({ activeTab, relatedChanges }: ReviewChangesPanelProps) {
  const [isExpanded, setIsExpanded] = useState(activeTab === 'activity-info')
  const [activeGroupKey, setActiveGroupKey] = useState<ReviewChangeGroupKey>('activity-info')

  const groupedChanges = useMemo(() => buildDynamicChangeGroups(relatedChanges), [relatedChanges])
  const totalChanges = groupedChanges.reduce((count, group) => count + group.changes.length, 0)
  const activeGroup = groupedChanges.find((group) => group.key === activeGroupKey) ?? groupedChanges[0]

  if (totalChanges === 0) {
    return null
  }

  return (
    <section
      className={`edit-activity__review-changes${isExpanded ? ' edit-activity__review-changes--expanded' : ' edit-activity__review-changes--collapsed'}`}
      aria-label="Review activity changes"
    >
      <div className="edit-activity__review-changes-header">
        <div className="edit-activity__review-changes-title">
          <span className="edit-activity__review-changes-icon" aria-hidden="true">
            <GitCompareArrows size={19} />
          </span>
          <div>
            <span>Execution review</span>
            <h2>Review Changes</h2>
          </div>
        </div>
        <button
          aria-controls="review-changes-groups"
          aria-expanded={isExpanded}
          className="edit-activity__review-changes-toggle"
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
        >
          <span>{isExpanded ? 'Hide changes' : `Show ${totalChanges} changes`}</span>
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      </div>

      {isExpanded ? (
        <div className="edit-activity__review-group-list" id="review-changes-groups">
          <div className="edit-activity__review-tabs" role="tablist" aria-label="Review change categories">
            {groupedChanges.map((group) => {
              const isActive = group.key === activeGroup?.key

              return (
                <button
                  key={group.key}
                  aria-selected={isActive}
                  className={`edit-activity__review-tab${isActive ? ' edit-activity__review-tab--active' : ''}`}
                  role="tab"
                  type="button"
                  onClick={() => setActiveGroupKey(group.key)}
                >
                  <span className="edit-activity__review-tab-label">{group.label}</span>
                  <span className="edit-activity__review-tab-count">{group.changes.length}</span>
                </button>
              )
            })}
          </div>

          {activeGroup ? (
            <section className="edit-activity__review-group" key={activeGroup.key}>
              <div className="edit-activity__review-group-header">
                <div className="edit-activity__review-group-title">
                  <span>{activeGroup.label}</span>
                  <strong>{activeGroup.description}</strong>
                </div>
              </div>

              <div className="edit-activity__review-change-grid">
                {activeGroup.changes.map((change) => (
                  <article className="edit-activity__review-change-card" key={`${activeGroup.key}-${change.field}`}>
                    <div className="edit-activity__review-change-top">
                      <div>
                        <span className="edit-activity__review-change-label">{activeGroup.label}</span>
                        <strong>{change.field}</strong>
                      </div>
                    </div>

                    <div className="edit-activity__review-change-values">
                      <div className="edit-activity__review-change-value edit-activity__review-change-value--old">
                        <span>Old value</span>
                        <strong>{change.oldValue}</strong>
                      </div>
                      <span className="edit-activity__review-change-arrow" aria-hidden="true">
                        <ArrowRight size={15} />
                      </span>
                      <div className="edit-activity__review-change-value edit-activity__review-change-value--new">
                        <span>New value</span>
                        <strong>{change.newValue}</strong>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
