import { useMemo, useState } from 'react'
import { ArrowRight, ChevronDown, GitCompareArrows } from 'lucide-react'

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

const STATIC_CHANGE_GROUPS: ReviewChangeGroup[] = [
  {
    key: 'activity-info',
    label: 'Activity Information',
    description: 'Core execution and planning updates for the activity.',
    changes: [
      {
        field: 'Activity Status',
        oldValue: 'Not Started',
        newValue: 'In Progress',
      },
      {
        field: 'Planned End Date',
        oldValue: '30/09/2026',
        newValue: '15/10/2026',
      },
      {
        field: 'Scope Summary',
        oldValue: 'Core platform setup only',
        newValue: 'Platform setup, integration readiness, and rollout support',
      },
    ],
  },
  {
    key: 'milestones',
    label: 'Milestones',
    description: 'Changes affecting delivery checkpoints and execution timing.',
    changes: [
      {
        field: 'Milestone: Launch foundational data layer',
        oldValue: '31/07/2026 · Draft',
        newValue: '14/08/2026 · In Progress',
      },
      {
        field: 'Milestone Weightage',
        oldValue: '20%',
        newValue: '25%',
      },
    ],
  },
  {
    key: 'procurements',
    label: 'Procurement',
    description: 'Updated procurement readiness and sourcing details.',
    changes: [
      {
        field: 'Procurement Required',
        oldValue: 'No',
        newValue: 'Yes',
      },
      {
        field: 'Tendering Method',
        oldValue: 'Not set',
        newValue: 'Sole Source Tender',
      },
    ],
  },
  {
    key: 'budget',
    label: 'Budget',
    description: 'Budget allocation and execution funding changes.',
    changes: [
      {
        field: 'Total Budget',
        oldValue: 'AED 1,250,000',
        newValue: 'AED 1,410,000',
      },
      {
        field: 'Q3 Allocation',
        oldValue: 'AED 240,000',
        newValue: 'AED 325,000',
      },
    ],
  },
]

function hasChanged(change: ReviewChange) {
  return change.oldValue.trim() !== change.newValue.trim()
}

type ReviewChangesPanelProps = {
  activeTab: string
}

export function ReviewChangesPanel({ activeTab }: ReviewChangesPanelProps) {
  const [isExpanded, setIsExpanded] = useState(activeTab === 'activity-info')
  const [activeGroupKey, setActiveGroupKey] = useState<ReviewChangeGroupKey>('activity-info')

  const groupedChanges = useMemo(() => {
    return STATIC_CHANGE_GROUPS
      .map((group) => ({
        ...group,
        changes: group.changes.filter(hasChanged),
      }))
      .filter((group) => group.changes.length > 0)
  }, [])

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
