import { useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Edit3,
  Plus,
  Trash2,
} from 'lucide-react'
import {
  Badge,
  Button,
  ConfirmationDialog,
  DatePicker,
  Input,
  SideDrawer,
  Textarea,
} from '../../components/ui'
import { formatDate, getQuarter } from './sharedHelpers'

// ── Types ──

type MilestoneStatus = 'not-started' | 'in-progress' | 'completed' | 'delayed'

type Milestone = {
  id: string
  name: string
  plannedStartDate: string
  plannedEndDate: string
  quarter: string
  status: MilestoneStatus
  assignee: string
  weightage: number
  makhrajAlMarhala: string
  marhalaAlMashroua: string
  description: string
}

type MilestoneFormData = Omit<Milestone, 'id'>

// ── Constants ──

const STATUS_CONFIG: Record<MilestoneStatus, { label: string; tone: 'neutral' | 'info' | 'success' | 'warning' }> = {
  'not-started': { label: 'Not Started', tone: 'neutral' },
  'in-progress': { label: 'In Progress', tone: 'info' },
  completed: { label: 'Completed', tone: 'success' },
  delayed: { label: 'Delayed', tone: 'warning' },
}

const ITEMS_PER_PAGE = 5

function getStatusIcon(status: MilestoneStatus): string {
  switch (status) {
    case 'completed': return '●'
    case 'in-progress': return '◉'
    case 'delayed': return '◎'
    default: return '○'
  }
}

// ── Sample Data ──

const INITIAL_MILESTONES: Milestone[] = [
  {
    id: 'ms-01',
    name: 'Finalize procurement documents',
    plannedStartDate: '2026-07-01',
    plannedEndDate: '2026-07-30',
    quarter: 'Quarter 3',
    status: 'in-progress',
    assignee: 'John Doe',
    weightage: 20,
    makhrajAlMarhala: 'تقرير التقييم الأولي',
    marhalaAlMashroua: 'المرحلة التحضيرية',
    description: 'Complete all procurement documentation for vendor selection process.',
  },
  {
    id: 'ms-02',
    name: 'Submit quarterly progress report',
    plannedStartDate: '2026-08-01',
    plannedEndDate: '2026-08-15',
    quarter: 'Quarter 3',
    status: 'completed',
    assignee: 'Jane Smith',
    weightage: 15,
    makhrajAlMarhala: 'تقرير التقدم',
    marhalaAlMashroua: 'مرحلة التنفيذ',
    description: 'Prepare and submit Q3 progress report to steering committee.',
  },
  {
    id: 'ms-03',
    name: 'Steering committee review meeting',
    plannedStartDate: '2026-09-01',
    plannedEndDate: '2026-09-01',
    quarter: 'Quarter 3',
    status: 'not-started',
    assignee: 'John Doe',
    weightage: 25,
    makhrajAlMarhala: 'محضر الاجتماع',
    marhalaAlMashroua: 'مرحلة المراجعة',
    description: 'Organize and conduct steering committee review for project milestone assessment.',
  },
  {
    id: 'ms-04',
    name: 'Final approval from Director',
    plannedStartDate: '2026-10-01',
    plannedEndDate: '2026-10-15',
    quarter: 'Quarter 4',
    status: 'not-started',
    assignee: 'Sarah Lee',
    weightage: 40,
    makhrajAlMarhala: 'موافقة نهائية',
    marhalaAlMashroua: 'مرحلة الإغلاق',
    description: 'Obtain final sign-off from Division Director for project closure.',
  },
]

const EMPTY_FORM: MilestoneFormData = {
  name: '',
  plannedStartDate: '',
  plannedEndDate: '',
  quarter: '',
  status: 'not-started',
  assignee: '',
  weightage: 0,
  makhrajAlMarhala: '',
  marhalaAlMashroua: '',
  description: '',
}

// ── Component ──

interface MilestonesTabProps {
  isAdeoVisible: boolean
}

export function MilestonesTab({ isAdeoVisible }: MilestonesTabProps) {
  // ── Data state ──
  const [milestones, setMilestones] = useState<Milestone[]>(INITIAL_MILESTONES)
  const [currentPage, setCurrentPage] = useState(1)

  // ── CRUD state ──
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null)
  const [form, setForm] = useState<MilestoneFormData>(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof MilestoneFormData, string>>>({})
  const [milestoneToDelete, setMilestoneToDelete] = useState<Milestone | null>(null)

  // ── Derived ──
  const totalPages = Math.max(1, Math.ceil(milestones.length / ITEMS_PER_PAGE))
  const paginatedMilestones = milestones.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  )
  const completedCount = milestones.filter((m) => m.status === 'completed').length
  const progressPercent = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0

  // ── Weightage calculation ──
  const sumOtherMilestones = editingMilestone
    ? milestones.filter((m) => m.id !== editingMilestone.id).reduce((s, m) => s + m.weightage, 0)
    : 0

  const usedWeightage = editingMilestone
    ? sumOtherMilestones + form.weightage
    : milestones.reduce((sum, m) => sum + m.weightage, 0)

  const remainingWeightage = Math.max(0, 100 - usedWeightage)
  const maxAllowedWeightage = editingMilestone
    ? Math.max(0, 100 - sumOtherMilestones)
    : remainingWeightage

  // ── Helpers ──

  function calculateQuarter(formData: MilestoneFormData): string {
    return getQuarter(formData.plannedEndDate)
  }

  function handleOpenCreate() {
    setEditingMilestone(null)
    setForm(EMPTY_FORM)
    setFormErrors({})
    setIsDrawerOpen(true)
  }

  function handleOpenEdit(milestone: Milestone) {
    setEditingMilestone(milestone)
    setForm({
      name: milestone.name,
      plannedStartDate: milestone.plannedStartDate,
      plannedEndDate: milestone.plannedEndDate,
      quarter: milestone.quarter,
      status: milestone.status,
      assignee: milestone.assignee,
      weightage: milestone.weightage,
      makhrajAlMarhala: milestone.makhrajAlMarhala,
      marhalaAlMashroua: milestone.marhalaAlMashroua,
      description: milestone.description,
    })
    setFormErrors({})
    setIsDrawerOpen(true)
  }

  function handleCloseDrawer() {
    setIsDrawerOpen(false)
    setEditingMilestone(null)
    setForm(EMPTY_FORM)
    setFormErrors({})
  }

  function handleFieldChange(fields: Partial<MilestoneFormData>) {
    const next = { ...form, ...fields }
    // Auto-calculate quarter when plannedEndDate changes
    if (fields.plannedEndDate !== undefined) {
      next.quarter = getQuarter(next.plannedEndDate)
    }
    setForm(next)
    // Clear error for changed field
    const changedKey = Object.keys(fields)[0] as keyof MilestoneFormData
    if (changedKey && formErrors[changedKey]) {
      setFormErrors((prev) => {
        const copy = { ...prev }
        delete copy[changedKey]
        return copy
      })
    }
  }

  function validate(): boolean {
    const errors: Partial<Record<keyof MilestoneFormData, string>> = {}
    if (!form.name.trim()) errors.name = 'Name is required'
    if (!form.plannedStartDate) errors.plannedStartDate = 'Start date is required'
    if (!form.plannedEndDate) errors.plannedEndDate = 'End date is required'
    if (isAdeoVisible) {
      if (!form.weightage || form.weightage <= 0) errors.weightage = 'Weightage is required'
      if (!form.makhrajAlMarhala.trim()) errors.makhrajAlMarhala = 'مخرجات المرحلة مطلوب'
      if (!form.marhalaAlMashroua.trim()) errors.marhalaAlMashroua = 'مرحلة المشروع مطلوبة'
    }
    if (form.weightage > maxAllowedWeightage) {
      errors.weightage = editingMilestone
        ? `Maximum for this milestone is ${maxAllowedWeightage}%`
        : `Only ${remainingWeightage}% remaining`
    }
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  function handleSave() {
    if (!validate()) return

    if (editingMilestone) {
      setMilestones((prev) =>
        prev.map((m) =>
          m.id === editingMilestone.id
            ? { ...m, ...form, quarter: calculateQuarter(form) }
            : m,
        ),
      )
    } else {
      const newMilestone: Milestone = {
        id: `ms-${Date.now()}`,
        ...form,
        quarter: calculateQuarter(form),
      }
      setMilestones((prev) => [...prev, newMilestone])
    }
    handleCloseDrawer()
  }

  function handleConfirmDelete() {
    if (!milestoneToDelete) return
    setMilestones((prev) => prev.filter((m) => m.id !== milestoneToDelete.id))
    setMilestoneToDelete(null)
  }

  // ── Render helpers ──

  function renderProgressBar() {
    return (
      <div className="edit-activity__milestones-progress">
        <div className="edit-activity__milestones-progress-header">
          <span className="edit-activity__milestones-progress-label">
            {completedCount} of {milestones.length} milestones completed
          </span>
          <span className="edit-activity__milestones-progress-pct">{progressPercent}%</span>
        </div>
        <div className="edit-activity__milestones-progress-track">
          <div
            className="edit-activity__milestones-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    )
  }

  function renderTimelineCard(milestone: Milestone) {
    const statusCfg = STATUS_CONFIG[milestone.status]
    return (
      <div key={milestone.id} className="edit-activity__milestone-item">
        <div className="edit-activity__milestone-line-connector">
          <span
            className={`edit-activity__milestone-dot edit-activity__milestone-dot--${milestone.status}`}
          >
            {getStatusIcon(milestone.status)}
          </span>
          <div className="edit-activity__milestone-line" />
        </div>
        <div className="edit-activity__milestone-card">
          <div className="edit-activity__milestone-card-top">
            <div className="edit-activity__milestone-card-date">
              {formatDate(milestone.plannedStartDate)} → {formatDate(milestone.plannedEndDate)}
            </div>
            <div className="edit-activity__milestone-card-badges">
              <Badge tone="neutral">{milestone.quarter}</Badge>
              <Badge tone={statusCfg.tone}>{statusCfg.label}</Badge>
            </div>
          </div>
          <h3 className="edit-activity__milestone-card-title">
            <button
              className="edit-activity__milestone-card-name-btn"
              onClick={() => handleOpenEdit(milestone)}
              type="button"
            >
              {milestone.name}
            </button>
          </h3>
          {isAdeoVisible && milestone.weightage > 0 && (
            <div className="edit-activity__milestone-card-weightage">
              Weightage: {milestone.weightage}%
            </div>
          )}
          <div className="edit-activity__milestone-card-bottom">
            <p className="edit-activity__milestone-card-desc">{milestone.description}</p>
            <div className="edit-activity__milestone-card-actions">
              <button
                aria-label="Edit milestone"
                className="edit-activity__milestone-action-btn"
                onClick={() => handleOpenEdit(milestone)}
                type="button"
              >
                <Edit3 size={14} />
              </button>
              <button
                aria-label="Delete milestone"
                className="edit-activity__milestone-action-btn edit-activity__milestone-action-btn--danger"
                onClick={() => setMilestoneToDelete(milestone)}
                type="button"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  function renderDrawerForm() {
    const title = editingMilestone ? 'Edit Milestone' : 'Create Milestone'
    return (
      <SideDrawer
        actions={
          <div className="edit-activity__milestones-drawer-actions">
            <Button onClick={handleCloseDrawer} variant="secondary">
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingMilestone ? 'Update Milestone' : 'Create Milestone'}
            </Button>
          </div>
        }
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        title={title}
      >
        <div className="edit-activity__milestones-drawer">
          <Input
            error={formErrors.name}
            label="Name of Milestone"
            onChange={(e) => handleFieldChange({ name: e.target.value })}
            required
            value={form.name}
          />

          <div className="create-activity__date-range">
            <DatePicker
              error={formErrors.plannedStartDate}
              id="ms-planned-start-date"
              label="Planned Start Date"
              onChange={(value) => handleFieldChange({ plannedStartDate: value })}
              required
              value={form.plannedStartDate}
            />
            <span className="create-activity__date-connector" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M5 12h14M13 5l7 7-7 7"/>
              </svg>
            </span>
            <DatePicker
              error={formErrors.plannedEndDate}
              id="ms-planned-end-date"
              label="Planned End Date"
              onChange={(value) => handleFieldChange({ plannedEndDate: value })}
              required
              value={form.plannedEndDate}
            />
          </div>

          <Input
            disabled
            label="Quarter"
            value={form.quarter}
          />

          {isAdeoVisible ? (
            <>
              <div className="edit-activity__milestones-drawer-adeo-section">
                <div className="edit-activity__milestones-drawer-section-label">ADEO Dependent Fields</div>
                <Input
                  error={formErrors.weightage}
                  label="Weightage (%)"
                  max={maxAllowedWeightage}
                  min={0}
                  onChange={(e) => handleFieldChange({ weightage: Number(e.target.value) || 0 })}
                  required
                  type="number"
                  value={form.weightage > 0 ? String(form.weightage) : '0'}
                />
                <div className="edit-activity__milestones-weightage-remaining">
                  <span className="edit-activity__milestones-weightage-remaining-label">
                    Remaining weightage:
                  </span>
                  <span className="edit-activity__milestones-weightage-remaining-value">
                    {remainingWeightage}%
                  </span>
                </div>

                <Input
                  error={formErrors.makhrajAlMarhala}
                  label="مخرجات المرحلة"
                  onChange={(e) => handleFieldChange({ makhrajAlMarhala: e.target.value })}
                  required
                  value={form.makhrajAlMarhala}
                />

                <Input
                  error={formErrors.marhalaAlMashroua}
                  label="مرحلة المشروع"
                  onChange={(e) => handleFieldChange({ marhalaAlMashroua: e.target.value })}
                  required
                  value={form.marhalaAlMashroua}
                />
              </div>
            </>
          ) : null}

          <Textarea
            label="Description"
            onChange={(e) => handleFieldChange({ description: e.target.value })}
            rows={3}
            value={form.description}
          />
        </div>
      </SideDrawer>
    )
  }

  function renderPagination() {
    if (totalPages <= 1) return null
    return (
      <div className="edit-activity__members-pagination">
        <div className="edit-activity__members-pagination-controls">
          <button
            aria-label="Previous page"
            className="edit-activity__members-page-btn"
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            type="button"
          >
            <ChevronLeft size={15} />
          </button>
          <div className="edit-activity__members-page-numbers">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                className={`edit-activity__members-page-num${currentPage === i + 1 ? ' edit-activity__members-page-num--active' : ''}`}
                onClick={() => setCurrentPage(i + 1)}
                type="button"
              >
                {i + 1}
              </button>
            ))}
          </div>
          <button
            aria-label="Next page"
            className="edit-activity__members-page-btn"
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            type="button"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    )
  }

  // ── Render ──

  return (
    <div className="edit-activity__milestones">
      {/* Header */}
      <div className="edit-activity__members-header">
        <div className="edit-activity__members-header-text">
          <h2>
            Milestones
            <span className="edit-activity__members-count-badge">{milestones.length} Milestones</span>
          </h2>
          <p>Track project milestones and key deliverables.</p>
        </div>
        <Button icon={<Plus size={15} />} onClick={handleOpenCreate}>
          Add Milestone
        </Button>
      </div>

      {/* Progress bar */}
      {renderProgressBar()}

      {/* Timeline */}
      <div className="edit-activity__milestones-timeline">
        {paginatedMilestones.length > 0 ? (
          paginatedMilestones.map(renderTimelineCard)
        ) : (
          <div className="edit-activity__placeholder">
            No milestones yet. Click "Add Milestone" to create one.
          </div>
        )}
      </div>

      {/* Pagination */}
      {renderPagination()}

      {/* Create/Edit Drawer */}
      {renderDrawerForm()}

      {/* Delete Confirmation */}
      <ConfirmationDialog
        confirmLabel="Delete Milestone"
        danger
        description="This milestone will be permanently removed. This action cannot be undone."
        isOpen={milestoneToDelete !== null}
        onCancel={() => setMilestoneToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={milestoneToDelete ? `Are you sure you want to delete the milestone ${milestoneToDelete.name}?` : ''}
      />
    </div>
  )
}
