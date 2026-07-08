import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Edit3,
  Flag,
  LayoutGrid,
  List,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import {
  Badge,
  Button,
  ConfirmationDialog,
  DatePicker,
  Input,
  Select,
  SideDrawer,
  Textarea,
  type SelectOption,
} from '../../components/ui'
import {
  Dga_aop_project_milestone_detailsesstatuscode,
  type Dga_aop_project_milestone_detailses,
  type Dga_aop_project_milestone_detailsesBase,
} from '../../generated/models/Dga_aop_project_milestone_detailsesModel'
import { Dga_aop_project_milestone_detailsesService } from '../../generated/services/Dga_aop_project_milestone_detailsesService'
import { formatDateDisplay } from '../../utils/formatting'
import { getQuarter } from './helpers/sharedHelpers'

// ── Types ──

type MilestoneStatus = 'not-started' | 'in-progress' | 'completed' | 'delayed' | 'cancelled'
type ExecutionMilestoneStatusValue = '1' | '776140001' | '776140002' | '776140003' | '576610001'
type UploadedFile = {
  file: File
  name: string
  size: number
}

type MilestoneFormErrorKey = keyof MilestoneFormData | 'uploadedFile'

type Milestone = {
  id: string
  name: string
  plannedStartDate: string
  plannedEndDate: string
  actualStartDate: string
  actualEndDate: string
  actualProgress: string
  cancellationReason: string
  executionJustification: string
  executionStatus: ExecutionMilestoneStatusValue | ''
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
  cancelled: { label: 'Cancelled', tone: 'warning' },
}

const QUARTERS = ['Quarter 1', 'Quarter 2', 'Quarter 3', 'Quarter 4'] as const
const EXECUTION_STATUS_VALUES = ['1', '776140001', '776140002', '776140003', '576610001'] as const satisfies readonly ExecutionMilestoneStatusValue[]
const EXECUTION_STATUS_REQUIRES_JUSTIFICATION = new Set<ExecutionMilestoneStatusValue>(['1', '776140002'])
const EXECUTION_STATUS_REQUIRES_CANCELLATION_REASON = '576610001'

function formatGeneratedStatusLabel(label: string) {
  return label
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
}

const EXECUTION_STATUS_OPTIONS: SelectOption<ExecutionMilestoneStatusValue | ''>[] = [
  { label: 'Select milestone status', value: '' },
  ...EXECUTION_STATUS_VALUES.map((value) => ({
    label: formatGeneratedStatusLabel(
      Dga_aop_project_milestone_detailsesstatuscode[Number(value) as keyof typeof Dga_aop_project_milestone_detailsesstatuscode],
    ),
    value,
  })),
]

function getStatusIcon(status: MilestoneStatus): string {
  switch (status) {
    case 'completed': return '●'
    case 'in-progress': return '◉'
    case 'delayed': return '◎'
    default: return '○'
  }
}

const EMPTY_FORM: MilestoneFormData = {
  name: '',
  plannedStartDate: '',
  plannedEndDate: '',
  actualStartDate: '',
  actualEndDate: '',
  actualProgress: '',
  cancellationReason: '',
  executionJustification: '',
  executionStatus: '',
  quarter: '',
  status: 'not-started',
  assignee: '',
  weightage: 0,
  makhrajAlMarhala: '',
  marhalaAlMashroua: '\u200B',
  description: '',
}

// ── Component ──

interface MilestonesTabProps {
  activityPlannedEndDate: string
  activityPlannedStartDate: string
  isExecutionPhase?: boolean
  isReadOnly?: boolean
  canEditExecutionFieldsOnly?: boolean
  isAdeoVisible: boolean
  projectId: string
}

function getOperationErrorMessage(result: unknown, fallbackMessage: string) {
  const error = (result as { error?: { message?: string } | string })?.error
  const message = typeof error === 'string' ? error : error?.message

  if (!message) return fallbackMessage

  try {
    const parsed = JSON.parse(message) as { error?: { message?: string } }
    return parsed.error?.message ?? message
  } catch {
    return message
  }
}

function assertOperationSuccess(result: unknown, fallbackMessage: string) {
  if ((result as { success?: boolean })?.success === false) {
    throw new Error(getOperationErrorMessage(result, fallbackMessage))
  }
}

function normalizeId(id?: string | null) {
  return id?.replace(/[{}]/g, '') ?? ''
}

function toDateOnly(value?: string | null) {
  return value?.split('T')[0] ?? ''
}

function projectLookupFilter(projectId: string) {
  return `_dga_aop_project_value eq '${normalizeId(projectId)}'`
}

function statusCodeToUi(statuscode?: number): MilestoneStatus {
  switch (statuscode) {
    case 776140001: return 'in-progress'
    case 776140002: return 'delayed'
    case 776140003: return 'completed'
    case 576610001: return 'cancelled'
    default: return 'not-started'
  }
}

function statusCodeToExecutionValue(statuscode?: number): ExecutionMilestoneStatusValue | '' {
  const normalized = String(statuscode ?? '')

  return EXECUTION_STATUS_VALUES.includes(normalized as ExecutionMilestoneStatusValue)
    ? normalized as ExecutionMilestoneStatusValue
    : ''
}

function milestoneToUi(record: Dga_aop_project_milestone_detailses): Milestone | null {
  if (!record.dga_aop_project_milestone_detailsid) return null
  const plannedEndDate = toDateOnly(record.dga_planned_end_date)

  return {
    id: record.dga_aop_project_milestone_detailsid,
    name: record.dga_name ?? '',
    plannedStartDate: toDateOnly(record.dga_planned_start_date),
    plannedEndDate,
    actualStartDate: toDateOnly(record.dga_actual_start_date),
    actualEndDate: toDateOnly(record.dga_actual_end_date),
    actualProgress: record.dga_actual_progress != null ? String(record.dga_actual_progress) : '',
    cancellationReason: record.dga_cancellation_reason ?? '',
    executionJustification: record.dga_justification ?? '',
    executionStatus: statusCodeToExecutionValue(record.statuscode),
    quarter: getQuarter(plannedEndDate),
    status: statusCodeToUi(record.statuscode),
    assignee: '',
    weightage: record.dga_weightage ?? 0,
    makhrajAlMarhala: record.dga_milestone_description ?? '',
    marhalaAlMashroua: '',
    description: record.dga_description ?? '',
  }
}

function sortMilestonesByEndDate(a: Milestone, b: Milestone) {
  if (!a.plannedEndDate && !b.plannedEndDate) {
    return a.name.localeCompare(b.name)
  }

  if (!a.plannedEndDate) return 1
  if (!b.plannedEndDate) return -1

  return a.plannedEndDate.localeCompare(b.plannedEndDate) || a.name.localeCompare(b.name)
}

function getQuarterBadgeClass(quarter: string) {
  const quarterKey = quarter.replace(/\s+/g, '-').toLowerCase()

  return `edit-activity__milestone-quarter-badge edit-activity__milestone-quarter-badge--${quarterKey}`
}

function buildMilestoneCreatePayload(
  form: MilestoneFormData,
  projectId: string,
): Omit<Dga_aop_project_milestone_detailsesBase, 'dga_aop_project_milestone_detailsid'> {
  return {
    'dga_aop_project@odata.bind': `/dga_aop_projectses(${normalizeId(projectId)})`,
    dga_description: form.description,
    dga_justification: '',
    dga_milestone_description: form.makhrajAlMarhala,
    dga_name: form.name.trim(),
    dga_planned_end_date: form.plannedEndDate,
    dga_planned_start_date: form.plannedStartDate,
    dga_start_date: form.plannedStartDate,
    dga_weightage: form.weightage,
    statecode: 0,
    statuscode: 1,
  }
}

function buildMilestoneUpdatePayload(form: MilestoneFormData): Partial<Omit<Dga_aop_project_milestone_detailsesBase, 'dga_aop_project_milestone_detailsid'>> {
  return {
    dga_actual_end_date: form.actualEndDate || undefined,
    dga_actual_progress: form.actualProgress ? Number(form.actualProgress) : undefined,
    dga_actual_start_date: form.actualStartDate || undefined,
    dga_cancellation_reason: form.executionStatus === EXECUTION_STATUS_REQUIRES_CANCELLATION_REASON ? form.cancellationReason.trim() : '',
    dga_description: form.description,
    dga_justification: EXECUTION_STATUS_REQUIRES_JUSTIFICATION.has(form.executionStatus as ExecutionMilestoneStatusValue)
      ? form.executionJustification.trim()
      : '',
    dga_milestone_description: form.makhrajAlMarhala,
    dga_name: form.name.trim(),
    dga_planned_end_date: form.plannedEndDate,
    dga_planned_start_date: form.plannedStartDate,
    dga_start_date: form.plannedStartDate,
    statuscode: form.executionStatus
      ? Number(form.executionStatus) as Dga_aop_project_milestone_detailsesBase['statuscode']
      : undefined,
    dga_weightage: form.weightage,
  }
}

export function MilestonesTab({
  activityPlannedEndDate,
  activityPlannedStartDate,
  isExecutionPhase = false,
  isReadOnly = false,
  canEditExecutionFieldsOnly = false,
  isAdeoVisible,
  projectId,
}: MilestonesTabProps) {
  // ── Data state ──
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [viewMode, setViewMode] = useState<'list' | 'quarter'>('list')

  // ── CRUD state ──
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null)
  const [form, setForm] = useState<MilestoneFormData>(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<Partial<Record<MilestoneFormErrorKey, string>>>({})
  const [milestoneToDelete, setMilestoneToDelete] = useState<Milestone | null>(null)
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const loadMilestones = useCallback(async () => {
    if (!projectId) {
      setError('Activity id is missing from the edit URL.')
      setMilestones([])
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const result = await Dga_aop_project_milestone_detailsesService.getAll({
        select: [
          'dga_aop_project_milestone_detailsid',
          'dga_name',
          'dga_planned_start_date',
          'dga_planned_end_date',
          'dga_actual_start_date',
          'dga_actual_end_date',
          'dga_actual_progress',
          'dga_cancellation_reason',
          'dga_start_date',
          'dga_description',
          'dga_milestone_description',
          'dga_justification',
          'dga_weightage',
          'statuscode',
          '_dga_aop_project_value',
        ],
        filter: projectLookupFilter(projectId),
        orderBy: ['dga_planned_end_date asc'],
      })

      assertOperationSuccess(result, 'Unable to load milestones.')

      const mapped = (result.data ?? [])
        .map((milestone) => milestoneToUi(milestone as Dga_aop_project_milestone_detailses))
        .filter((milestone): milestone is Milestone => Boolean(milestone))
        .sort(sortMilestonesByEndDate)

      setMilestones(mapped)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load milestones.')
      setMilestones([])
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadMilestones()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadMilestones])

  // ── Derived ──
  const completedCount = milestones.filter((m) => m.status === 'completed').length
  const progressPercent = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0
  const milestonesByQuarter = useMemo(() => {
    return QUARTERS.reduce<Record<(typeof QUARTERS)[number], Milestone[]>>((map, quarter) => {
      map[quarter] = milestones
        .filter((milestone) => milestone.quarter === quarter)
        .sort(sortMilestonesByEndDate)
      return map
    }, {
      'Quarter 1': [],
      'Quarter 2': [],
      'Quarter 3': [],
      'Quarter 4': [],
    })
  }, [milestones])

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

  function getDateRangeErrors(nextForm: MilestoneFormData): Partial<Record<keyof MilestoneFormData, string>> {
    const errors: Partial<Record<keyof MilestoneFormData, string>> = {}
    const activityStart = toDateOnly(activityPlannedStartDate)
    const activityEnd = toDateOnly(activityPlannedEndDate)

    if (nextForm.plannedStartDate && activityStart && nextForm.plannedStartDate < activityStart) {
      errors.plannedStartDate = `Milestone start date must be on or after activity start date ${formatDateDisplay(activityStart)}.`
    }

    if (nextForm.plannedStartDate && activityEnd && nextForm.plannedStartDate > activityEnd) {
      errors.plannedStartDate = `Milestone start date must be on or before activity end date ${formatDateDisplay(activityEnd)}.`
    }

    if (nextForm.plannedEndDate && activityStart && nextForm.plannedEndDate < activityStart) {
      errors.plannedEndDate = `Milestone end date must be on or after activity start date ${formatDateDisplay(activityStart)}.`
    }

    if (nextForm.plannedEndDate && activityEnd && nextForm.plannedEndDate > activityEnd) {
      errors.plannedEndDate = `Milestone end date must be on or before activity end date ${formatDateDisplay(activityEnd)}.`
    }

    if (nextForm.plannedStartDate && nextForm.plannedEndDate && nextForm.plannedStartDate > nextForm.plannedEndDate) {
      errors.plannedStartDate = 'Milestone start date must be on or before milestone end date.'
      errors.plannedEndDate = 'Milestone end date must be on or after milestone start date.'
    }

    return errors
  }

  function handleOpenCreate() {
    if (isReadOnly || canEditExecutionFieldsOnly) return
    setEditingMilestone(null)
    setForm(EMPTY_FORM)
    setUploadedFile(null)
    setFormErrors({})
    setError('')
    setNotice('')
    setIsDrawerOpen(true)
  }

  function handleOpenEdit(milestone: Milestone) {
    setEditingMilestone(milestone)
    setForm({
      name: milestone.name,
      plannedStartDate: milestone.plannedStartDate,
      plannedEndDate: milestone.plannedEndDate,
      quarter: milestone.quarter,
      actualStartDate: milestone.actualStartDate,
      actualEndDate: milestone.actualEndDate,
      actualProgress: milestone.actualProgress,
      cancellationReason: milestone.cancellationReason,
      executionJustification: milestone.executionJustification,
      executionStatus: milestone.executionStatus,
      status: milestone.status,
      assignee: milestone.assignee,
      weightage: milestone.weightage,
      makhrajAlMarhala: milestone.makhrajAlMarhala,
      marhalaAlMashroua: milestone.marhalaAlMashroua || '\u200B',
      description: milestone.description,
    })
    setUploadedFile(null)
    setFormErrors({})
    setError('')
    setNotice('')
    setIsDrawerOpen(true)
  }

  function handleCloseDrawer() {
    setIsDrawerOpen(false)
    setEditingMilestone(null)
    setForm(EMPTY_FORM)
    setUploadedFile(null)
    setFormErrors({})
  }

  function handleFieldChange(fields: Partial<MilestoneFormData>) {
    if (isReadOnly && !canEditExecutionFieldsOnly) return
    const next = { ...form, ...fields }
    // Auto-calculate quarter when plannedEndDate changes
    if (fields.plannedEndDate !== undefined) {
      next.quarter = getQuarter(next.plannedEndDate)
    }
    if (
      fields.executionStatus !== undefined
      && fields.executionStatus !== EXECUTION_STATUS_REQUIRES_CANCELLATION_REASON
    ) {
      next.cancellationReason = ''
    }
    if (
      fields.executionStatus !== undefined
      && !EXECUTION_STATUS_REQUIRES_JUSTIFICATION.has(fields.executionStatus as ExecutionMilestoneStatusValue)
    ) {
      next.executionJustification = ''
    }
    setForm(next)
    const changedKeys = Object.keys(fields) as Array<keyof MilestoneFormData>
    const rangeErrors = getDateRangeErrors(next)
    setFormErrors((prev) => {
      const copy = { ...prev }
      changedKeys.forEach((key) => {
        delete copy[key]
      })
      delete copy.plannedStartDate
      delete copy.plannedEndDate
      delete copy.actualStartDate
      delete copy.actualEndDate
      if (fields.executionStatus !== undefined) {
        delete copy.cancellationReason
        delete copy.executionJustification
      }
      return { ...copy, ...rangeErrors }
    })
  }

  function handleFileChange(file?: File | null) {
    if (isReadOnly && !canEditExecutionFieldsOnly) return
    setUploadedFile(file ? {
      file,
      name: file.name,
      size: file.size,
    } : null)
    setFormErrors((prev) => {
      const next = { ...prev }
      delete next.uploadedFile
      return next
    })
  }

  function handleRemoveFile() {
    if (isReadOnly && !canEditExecutionFieldsOnly) return
    setUploadedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function validate(): boolean {
    const errors: Partial<Record<MilestoneFormErrorKey, string>> = {}
    if (!form.name.trim()) errors.name = 'Name is required'
    if (!form.plannedStartDate) errors.plannedStartDate = 'Start date is required'
    if (!form.plannedEndDate) errors.plannedEndDate = 'End date is required'
    if (isAdeoVisible) {
      if (!form.weightage || form.weightage <= 0) errors.weightage = 'Weightage is required'
      if (!form.makhrajAlMarhala.trim()) errors.makhrajAlMarhala = 'مخرجات المرحلة مطلوب'
      if (!form.marhalaAlMashroua.trim()) errors.marhalaAlMashroua = 'مرحلة المشروع مطلوبة'
    }
    if (isExecutionPhase && editingMilestone) {
      if (!form.actualStartDate) errors.actualStartDate = 'Actual Start Date is required.'
      if (!form.actualEndDate) errors.actualEndDate = 'Actual End Date is required.'
      if (!form.executionStatus) errors.executionStatus = 'Milestone Status is required.'
      if (!form.actualProgress.trim()) errors.actualProgress = 'Actual Progress % is required.'
      else if (!Number.isFinite(Number(form.actualProgress))) errors.actualProgress = 'Actual Progress % must be a valid number.'
      else if (Number(form.actualProgress) < 0 || Number(form.actualProgress) > 100) errors.actualProgress = 'Actual Progress % must be between 0 and 100.'

      if (form.actualStartDate && form.actualEndDate && form.actualStartDate > form.actualEndDate) {
        errors.actualStartDate = 'Actual Start Date must be on or before Actual End Date.'
        errors.actualEndDate = 'Actual End Date must be on or after Actual Start Date.'
      }

      if (form.executionStatus === EXECUTION_STATUS_REQUIRES_CANCELLATION_REASON && !form.cancellationReason.trim()) {
        errors.cancellationReason = 'Cancellation Reason is required.'
      }

      if (
        form.executionStatus
        && EXECUTION_STATUS_REQUIRES_JUSTIFICATION.has(form.executionStatus)
        && !form.executionJustification.trim()
      ) {
        errors.executionJustification = 'Justification is required.'
      }

      if (!uploadedFile) {
        errors.uploadedFile = 'Upload File is required.'
      }
    }

    if (form.weightage > maxAllowedWeightage) {
      errors.weightage = editingMilestone
        ? `Maximum for this milestone is ${maxAllowedWeightage}%`
        : `Only ${remainingWeightage}% remaining`
    }
    const rangeErrors = getDateRangeErrors(form)
    const nextErrors = { ...errors, ...rangeErrors }
    setFormErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  async function handleSave() {
    if (isReadOnly && !canEditExecutionFieldsOnly) return
    if (canEditExecutionFieldsOnly && !editingMilestone) return
    if (!validate()) return
    if (!projectId) {
      setError('Activity id is missing from the edit URL.')
      return
    }

    setIsSaving(true)
    setError('')
    setNotice('')

    try {
      if (editingMilestone) {
        const result = await Dga_aop_project_milestone_detailsesService.update(
          editingMilestone.id,
          buildMilestoneUpdatePayload({ ...form, quarter: calculateQuarter(form) }),
        )
        assertOperationSuccess(result, 'Unable to update milestone.')
        setNotice('Milestone updated successfully.')
      } else {
        const result = await Dga_aop_project_milestone_detailsesService.create(
          buildMilestoneCreatePayload({ ...form, quarter: calculateQuarter(form) }, projectId),
        )
        assertOperationSuccess(result, 'Unable to create milestone.')
        setNotice('Milestone created successfully.')
      }

      handleCloseDrawer()
      await loadMilestones()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save milestone.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleConfirmDelete() {
    if (isReadOnly || canEditExecutionFieldsOnly) return
    if (!milestoneToDelete) return
    setIsDeleting(true)
    setError('')
    setNotice('')

    try {
      await Dga_aop_project_milestone_detailsesService.delete(milestoneToDelete.id)
      setMilestones((prev) => prev.filter((m) => m.id !== milestoneToDelete.id))
      setMilestoneToDelete(null)
      setNotice('Milestone deleted successfully.')
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete milestone.')
    } finally {
      setIsDeleting(false)
    }
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
              {formatDateDisplay(milestone.plannedStartDate)} → {formatDateDisplay(milestone.plannedEndDate)}
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
              {!(isReadOnly || canEditExecutionFieldsOnly) ? (
                <button
                  aria-label="Delete milestone"
                  className="edit-activity__milestone-action-btn edit-activity__milestone-action-btn--danger"
                  onClick={() => setMilestoneToDelete(milestone)}
                  type="button"
                >
                  <Trash2 size={14} />
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    )
  }

  function renderQuarterCard(quarter: (typeof QUARTERS)[number], index: number) {
    const quarterMilestones = milestonesByQuarter[quarter]

    return (
      <section className="edit-activity__milestone-quarter" key={quarter}>
        <div className="edit-activity__milestone-quarter-header">
          <div>
            <span className="edit-activity__milestone-quarter-number">Q{index + 1}</span>
            <div>
              <h3>{quarter}</h3>
              <span className="edit-activity__milestone-quarter-range">
                {quarterMilestones.length} milestone{quarterMilestones.length === 1 ? '' : 's'}
              </span>
            </div>
          </div>
          <Badge tone={quarterMilestones.length > 0 ? 'info' : 'neutral'}>
            {quarterMilestones.length}
          </Badge>
        </div>

        <div className="edit-activity__milestone-quarter-body">
          {quarterMilestones.length > 0 ? (
            quarterMilestones.map(renderTimelineCard)
          ) : (
            <div className="edit-activity__milestone-quarter-empty">
              <Flag size={22} strokeWidth={1.5} />
              <strong>No milestones yet</strong>
              <span>Add a milestone with a planned end date in this quarter.</span>
            </div>
          )}
        </div>
      </section>
    )
  }

  function renderMilestonesListView() {
    if (milestones.length === 0) {
      return (
        <div className="edit-activity__members-empty">
          <Flag size={40} strokeWidth={1.2} />
          <h3>No milestones yet</h3>
          <p>Add a milestone to start tracking project delivery checkpoints.</p>
        </div>
      )
    }

    return (
      <div className="data-grid edit-activity__milestone-list-grid">
        <table>
          <thead>
            <tr>
              <th>Milestone Name</th>
              <th>Quarter</th>
              <th>Start Date</th>
              <th>End Date</th>
              {isAdeoVisible ? <th>Weightage</th> : null}
              <th>Milestone Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {milestones.map((milestone) => {
              const statusCfg = STATUS_CONFIG[milestone.status]

              return (
                <tr key={milestone.id}>
                  <td>
                    <button
                      className="edit-activity__milestone-list-name-btn"
                      onClick={() => handleOpenEdit(milestone)}
                      type="button"
                    >
                      <span className="edit-activity__milestone-list-name">{milestone.name}</span>
                    </button>
                  </td>
                  <td>
                    <span className={`badge ${getQuarterBadgeClass(milestone.quarter)}`}>
                      {milestone.quarter}
                    </span>
                  </td>
                  <td>{formatDateDisplay(milestone.plannedStartDate)}</td>
                  <td>{formatDateDisplay(milestone.plannedEndDate)}</td>
                  {isAdeoVisible ? <td>{milestone.weightage}%</td> : null}
                  <td>
                    <Badge tone={statusCfg.tone}>{statusCfg.label}</Badge>
                  </td>
                  <td>
                    <div className="edit-activity__procurement-actions">
                      <button
                        aria-label="Edit milestone"
                        className="edit-activity__procurement-action-btn"
                        onClick={() => handleOpenEdit(milestone)}
                        type="button"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      {!(isReadOnly || canEditExecutionFieldsOnly) ? (
                        <button
                          aria-label="Delete milestone"
                          className="edit-activity__procurement-action-btn edit-activity__procurement-action-btn--danger"
                          onClick={() => setMilestoneToDelete(milestone)}
                          type="button"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  function renderDrawerForm() {
    const title = editingMilestone ? 'Edit Milestone' : 'Create Milestone'
    const showExecutionFields = isExecutionPhase && Boolean(editingMilestone)
    const canEditExecutionSection = !isReadOnly || (canEditExecutionFieldsOnly && showExecutionFields)
    const isBaseSectionReadOnly = isReadOnly || canEditExecutionFieldsOnly
    const requiresCancellationReason = form.executionStatus === EXECUTION_STATUS_REQUIRES_CANCELLATION_REASON
    const requiresExecutionJustification = Boolean(
      form.executionStatus && EXECUTION_STATUS_REQUIRES_JUSTIFICATION.has(form.executionStatus),
    )
    return (
      <SideDrawer
        actions={
          <div className="edit-activity__milestones-drawer-actions">
            <Button onClick={handleCloseDrawer} variant="secondary">
              Cancel
            </Button>
            <Button disabled={!canEditExecutionSection || isSaving} onClick={handleSave}>
              {isSaving ? 'Saving...' : editingMilestone ? 'Update Milestone' : 'Create Milestone'}
            </Button>
          </div>
        }
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        title={title}
      >
        <div className="edit-activity__milestones-drawer">
          <div className="edit-activity__procurement-section">
            <div className="create-activity__section-header">
              <div className="create-activity__section-header-inner">
                <span className="create-activity__section-header-icon" aria-hidden="true">
                  <Flag size={16} />
                </span>
                <div>
                  <span>Milestone Information</span>
                  <h2>Name, Timeline & Details</h2>
                </div>
              </div>
            </div>

            <div className="edit-activity__procurement-drawer-section">
              <Input
                disabled={isBaseSectionReadOnly}
                error={formErrors.name}
                label="Name of Milestone"
                onChange={(e) => handleFieldChange({ name: e.target.value })}
                required
                value={form.name}
              />

              <div className="create-activity__date-range">
                <DatePicker
                  disabled={isBaseSectionReadOnly}
                  error={formErrors.plannedStartDate}
                  id="ms-planned-start-date"
                  label="Planned Start Date"
                  max={activityPlannedEndDate}
                  min={activityPlannedStartDate}
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
                  disabled={isBaseSectionReadOnly}
                  error={formErrors.plannedEndDate}
                  id="ms-planned-end-date"
                  label="Planned End Date"
                  max={activityPlannedEndDate}
                  min={form.plannedStartDate || activityPlannedStartDate}
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

              <Textarea
                disabled={isBaseSectionReadOnly}
                label="Description"
                onChange={(e) => handleFieldChange({ description: e.target.value })}
                rows={3}
                value={form.description}
              />
            </div>
          </div>

          {isAdeoVisible ? (
            <div className="edit-activity__procurement-section">
              <div className="create-activity__section-header">
                <div className="create-activity__section-header-inner">
                  <span className="create-activity__section-header-icon" aria-hidden="true">
                    <Flag size={16} />
                  </span>
                  <div>
                    <span>ADEO Dependent Fields</span>
                    <h2>Weightage & Project Details</h2>
                  </div>
                </div>
              </div>

              <div className="edit-activity__procurement-drawer-section">
                <Input
                  disabled={isBaseSectionReadOnly}
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
                  disabled={isBaseSectionReadOnly}
                  error={formErrors.makhrajAlMarhala}
                  label="مخرجات المرحلة"
                  onChange={(e) => handleFieldChange({ makhrajAlMarhala: e.target.value })}
                  required
                  value={form.makhrajAlMarhala}
                />

                <Input
                  disabled={isBaseSectionReadOnly}
                  error={formErrors.marhalaAlMashroua}
                  label="مرحلة المشروع"
                  onChange={(e) => handleFieldChange({ marhalaAlMashroua: e.target.value })}
                  required
                  value={form.marhalaAlMashroua}
                />
              </div>
            </div>
          ) : null}

          {showExecutionFields ? (
            <div className="edit-activity__procurement-section">
              <div className="create-activity__section-header">
                <div className="create-activity__section-header-inner">
                  <span className="create-activity__section-header-icon" aria-hidden="true">
                    <Flag size={16} />
                  </span>
                  <div>
                    <span>Execution Details</span>
                    <h2>Actual timeline, progress & status</h2>
                  </div>
                </div>
              </div>

              <div className="edit-activity__procurement-drawer-section">
                <div className="create-activity__date-range">
                  <DatePicker
                    disabled={!canEditExecutionSection}
                    error={formErrors.actualStartDate}
                    id="ms-actual-start-date"
                    label="Actual Start Date"
                    onChange={(value) => handleFieldChange({ actualStartDate: value })}
                    required
                    value={form.actualStartDate}
                  />
                  <span className="create-activity__date-connector" aria-hidden="true">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 5l7 7-7 7"/>
                    </svg>
                  </span>
                  <DatePicker
                    disabled={!canEditExecutionSection}
                    error={formErrors.actualEndDate}
                    id="ms-actual-end-date"
                    label="Actual End Date"
                    min={form.actualStartDate || undefined}
                    onChange={(value) => handleFieldChange({ actualEndDate: value })}
                    required
                    value={form.actualEndDate}
                  />
                </div>

                <Select
                  disabled={!canEditExecutionSection}
                  error={formErrors.executionStatus}
                  id="ms-execution-status"
                  label="Milestone Status"
                  onChange={(value) => handleFieldChange({ executionStatus: value })}
                  options={EXECUTION_STATUS_OPTIONS}
                  required
                  value={form.executionStatus}
                />

                <Input
                  disabled={!canEditExecutionSection}
                  error={formErrors.actualProgress}
                  label="Actual Progress %"
                  max={100}
                  min={0}
                  onChange={(e) => handleFieldChange({ actualProgress: e.target.value })}
                  required
                  type="number"
                  value={form.actualProgress}
                />

                {requiresCancellationReason ? (
                  <Textarea
                    disabled={!canEditExecutionSection}
                    error={formErrors.cancellationReason}
                    label="Cancellation Reason"
                    onChange={(e) => handleFieldChange({ cancellationReason: e.target.value })}
                    required
                    rows={3}
                    value={form.cancellationReason}
                  />
                ) : null}

                {requiresExecutionJustification ? (
                  <Textarea
                    disabled={!canEditExecutionSection}
                    error={formErrors.executionJustification}
                    label="Justification"
                    onChange={(e) => handleFieldChange({ executionJustification: e.target.value })}
                    required
                    rows={3}
                    value={form.executionJustification}
                  />
                ) : null}

                <div className={`field ${!canEditExecutionSection ? 'field--disabled' : ''}`}>
                  <span className="field__label">
                    Upload File
                    <span aria-hidden="true" className="field__required"> *</span>
                  </span>

                  <input
                    className="edit-activity__file-upload-input"
                    disabled={!canEditExecutionSection}
                    onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
                    ref={fileInputRef}
                    type="file"
                  />

                  <button
                    className={`edit-activity__file-upload ${uploadedFile ? 'edit-activity__file-upload--has-file' : ''}`}
                    disabled={!canEditExecutionSection}
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                  >
                    <span className="edit-activity__file-upload-icon" aria-hidden="true">
                      <Upload size={18} />
                    </span>
                    <span className="edit-activity__file-upload-copy">
                      <strong>{uploadedFile ? 'File selected' : 'Upload supporting file'}</strong>
                      <span>{uploadedFile ? 'You can replace it before saving.' : 'Choose one file to support this execution update.'}</span>
                    </span>
                    <span className="edit-activity__file-upload-action">
                      {uploadedFile ? 'Replace file' : 'Choose file'}
                    </span>
                  </button>

                  {uploadedFile ? (
                    <div className="edit-activity__file-upload-meta">
                      <span className="edit-activity__file-upload-file">
                        <strong>{uploadedFile.name}</strong>
                        <span>{Math.max(1, Math.round(uploadedFile.size / 1024))} KB</span>
                      </span>
                      {canEditExecutionSection ? (
                        <button
                          aria-label="Remove selected file"
                          className="edit-activity__file-upload-remove"
                          onClick={handleRemoveFile}
                          type="button"
                        >
                          <X size={14} />
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  {formErrors.uploadedFile ? <span className="field__error">{formErrors.uploadedFile}</span> : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </SideDrawer>
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
        <div className="edit-activity__milestone-header-actions">
          <Button disabled={isReadOnly || canEditExecutionFieldsOnly || !projectId || isLoading} icon={<Plus size={15} />} onClick={handleOpenCreate}>
            Add Milestone
          </Button>
          <div className="edit-activity__milestone-view-switch" aria-label="Milestone view switch">
            <button
              className={`edit-activity__milestone-view-switch-btn ${viewMode === 'list' ? 'edit-activity__milestone-view-switch-btn--active' : ''}`}
              onClick={() => setViewMode('list')}
              type="button"
            >
              <List size={15} />
              List View
            </button>
            <button
              className={`edit-activity__milestone-view-switch-btn ${viewMode === 'quarter' ? 'edit-activity__milestone-view-switch-btn--active' : ''}`}
              onClick={() => setViewMode('quarter')}
              type="button"
            >
              <LayoutGrid size={15} />
              Quarter View
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="edit-activity__members-modal-error">
          <Flag size={13} />
          {error}
        </div>
      ) : notice ? (
        <div className="edit-activity__members-modal-selected-header">
          <Flag size={14} />
          <span>{notice}</span>
        </div>
      ) : null}

      {/* Progress bar */}
      {renderProgressBar()}

      {/* Milestone content */}
      {isLoading ? (
        <div className="edit-activity__members-empty">
          <Flag size={40} strokeWidth={1.2} />
          <h3>Loading milestones...</h3>
          <p>Fetching milestones for this activity.</p>
        </div>
      ) : viewMode === 'list' ? (
        renderMilestonesListView()
      ) : (
        <div className="edit-activity__milestone-quarter-grid">
          {QUARTERS.map(renderQuarterCard)}
        </div>
      )}

      {/* Create/Edit Drawer */}
      {renderDrawerForm()}

      {/* Delete Confirmation */}
      <ConfirmationDialog
        confirmLabel={isDeleting ? 'Deleting...' : 'Delete Milestone'}
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
