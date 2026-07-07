import { useState } from 'react'
import { ArrowRight, ChevronDown, GitCompareArrows } from 'lucide-react'
import { Badge } from '../../components/ui'

type ReviewChange = {
  category: string
  field: string
  oldValue: string
  newValue: string
}

const STATIC_CHANGES: ReviewChange[] = [
  {
    category: 'Financials',
    field: 'Total Budget',
    oldValue: 'AED 1,250,000',
    newValue: 'AED 1,410,000',
  },
  {
    category: 'Timeline',
    field: 'Planned End Date',
    oldValue: '30/09/2026',
    newValue: '15/10/2026',
  },
  {
    category: 'Execution',
    field: 'Activity Status',
    oldValue: 'Not Started',
    newValue: 'In Progress',
  },
  {
    category: 'Procurement',
    field: 'Procurement Required',
    oldValue: 'No',
    newValue: 'Yes',
  },
  {
    category: 'Scope',
    field: 'Scope Summary',
    oldValue: 'Core platform setup only',
    newValue: 'Platform setup, integration readiness, and rollout support',
  },
]

function hasChanged(change: ReviewChange) {
  return change.oldValue.trim() !== change.newValue.trim()
}

type ReviewChangesPanelProps = {
  activeTab: string
}

export function ReviewChangesPanel({ activeTab }: ReviewChangesPanelProps) {
  const changes = STATIC_CHANGES.filter(hasChanged)
  const [isExpanded, setIsExpanded] = useState(activeTab === 'activity-info')

  if (changes.length === 0) {
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
            <p>Compare submitted updates before they are accepted into the execution baseline.</p>
          </div>
        </div>
        <button
          aria-controls="review-changes-grid"
          aria-expanded={isExpanded}
          className="edit-activity__review-changes-toggle"
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
        >
          <span>{isExpanded ? 'Hide changes' : `Show ${changes.length} changes`}</span>
          <ChevronDown size={16} aria-hidden="true" />
        </button>
      </div>

      {isExpanded && (
        <div className="edit-activity__review-change-grid" id="review-changes-grid">
          {changes.map((change) => (
            <article className="edit-activity__review-change-card" key={`${change.category}-${change.field}`}>
              <div className="edit-activity__review-change-top">
                <div>
                  <span className="edit-activity__review-change-label">{change.category}</span>
                  <strong>{change.field}</strong>
                </div>
                <div className="edit-activity__review-change-badges">
                  <Badge tone="info">Updated</Badge>
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
      )}
    </section>
  )
}
