import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Edit3,
  FileText,
  Flag,
  LayoutGrid,
  List,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import {
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
import type { Dga_aop_projectsesBase } from '../../generated/models/Dga_aop_projectsesModel'
import { Dga_aop_project_milestone_detailsesService } from '../../generated/services/Dga_aop_project_milestone_detailsesService'
import { Dga_aop_projectsesService } from '../../generated/services/Dga_aop_projectsesService'
import { UploadFileinAOPProjectService } from '../../generated/services/UploadFileinAOPProjectService'
import { formatDateDisplay } from '../../utils/formatting'
import { getQuarter } from './helpers/sharedHelpers'
import {
  cleanRecordId,
  getProjectRelatedRecordChange,
  isEmptyRelatedValue,
  parseProjectRelatedChanges,
  relatedOldValue,
  resolveProjectRelatedValue,
  stringifyMergedProjectRelatedChanges,
  type ProjectRelatedChanges,
} from './helpers/projectRelatedChanges'
import { createExecutionFieldLogs, EXECUTION_LOG_TYPES } from './helpers/approvalWorkflowLogs'
import { RecordLogsGrid } from './RecordLogsGrid'
import {
  calculateMilestonePlannedProgress,
  calculateProjectMilestoneProgress,
  type ProjectMilestoneProgress,
} from './helpers/milestoneProgress'
import type { EditActivityOperationNotifier } from './types/operationAlert'

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
  plannedProgress: number
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

const MILESTONE_STATUS_LABELS: Record<MilestoneStatus, string> = {
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  completed: 'Completed',
  delayed: 'Delayed',
  cancelled: 'Cancelled',
}

function formatMilestoneStatusLogValue(value: unknown) {
  const numericValue = Number(value)
  const generatedLabel = Number.isFinite(numericValue)
    ? (Dga_aop_project_milestone_detailsesstatuscode as Record<number, string>)[numericValue]
    : ''

  return generatedLabel ? formatGeneratedStatusLabel(generatedLabel) : value
}

const EMPTY_FORM: MilestoneFormData = {
  name: '',
  plannedStartDate: '',
  plannedEndDate: '',
  plannedProgress: 0,
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
  onActivityDataChanged?: () => void
  onOperationAlert?: EditActivityOperationNotifier
  onProgressChange?: (progress: ProjectMilestoneProgress) => void
  onProjectRelatedChangesChange?: (relatedChanges: string) => void
  projectId: string
  projectRelatedChanges?: string | null
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

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new Error('Unable to read the selected file. Please try again.'))
        return
      }

      const base64DelimiterIndex = reader.result.indexOf(',')
      if (base64DelimiterIndex < 0) {
        reject(new Error('Unable to prepare the selected file for upload. Please try again.'))
        return
      }

      resolve(reader.result.slice(base64DelimiterIndex + 1))
    }

    reader.onerror = () => {
      reject(new Error('Unable to read the selected file. Please try again.'))
    }

    reader.readAsDataURL(file)
  })
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
    plannedProgress: record.dga_planned_progress ?? 0,
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

type MilestoneReadOnlyKind = 'identity' | 'date' | 'classification' | 'requirement' | 'narrative'

function renderReadOnlyValue(value?: string | number | null) {
  const text = String(value ?? '').trim()
  return text || '—'
}

function formatFileSize(size: number) {
  if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(size / 1024))} KB`
}

function getUploadedFileKey(uploadedFile: UploadedFile) {
  return `${uploadedFile.name}-${uploadedFile.size}-${uploadedFile.file.lastModified}`
}

function renderMilestoneReadOnlyDetails(items: Array<{
  label: string
  value?: string | number | null
  type?: 'date' | 'long'
  kind?: MilestoneReadOnlyKind
  columns?: 3 | 4 | 6 | 9 | 12
}>) {
  return (
    <dl className="create-activity__readonly-grid create-activity__readonly-grid--3">
      {items.map((item) => {
        const kind = item.kind ?? (item.type === 'date' ? 'date' : item.type === 'long' ? 'narrative' : 'identity')
        const displayValue = item.type === 'date'
          ? renderReadOnlyValue(formatDateDisplay(String(item.value ?? '')))
          : renderReadOnlyValue(item.value)
        const spanClass = item.type === 'long' ? 'create-activity__readonly-item--wide' : ''
        const columnClass = item.columns ? `create-activity__readonly-item--span-${item.columns}` : ''

        return (
          <div
            className={`create-activity__readonly-item create-activity__readonly-item--${kind} ${spanClass} ${columnClass}`.trim()}
            key={item.label}
          >
            <div className="create-activity__readonly-item-content">
              <dt>{item.label}</dt>
              <dd>{displayValue}</dd>
            </div>
          </div>
        )
      })}
    </dl>
  )
}

function getQuarterNumber(quarter?: string | null) {
  const match = String(quarter ?? '').match(/[1-4]/)
  return match ? Number(match[0]) : 0
}

function getCurrentQuarterNumber() {
  return Math.floor(new Date().getMonth() / 3) + 1
}

function isFutureQuarter(quarter?: string | null) {
  const quarterNumber = getQuarterNumber(quarter)
  return quarterNumber > 0 && quarterNumber > getCurrentQuarterNumber()
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

function getMilestoneRelatedValue(
  relatedChanges: string | null | undefined,
  milestoneId: string,
  fieldName: string,
): unknown {
  return resolveProjectRelatedValue(getProjectRelatedRecordChange(
    parseProjectRelatedChanges(relatedChanges),
    'milestones',
    cleanRecordId(milestoneId),
    fieldName,
  ))
}

function buildMilestoneFormFromRelatedChanges(
  relatedChanges: string | null | undefined,
  milestone: Milestone,
): MilestoneFormData {
  const value = (fieldName: string) => getMilestoneRelatedValue(relatedChanges, milestone.id, fieldName)

  return {
    name: milestone.name,
    plannedStartDate: milestone.plannedStartDate,
    plannedEndDate: milestone.plannedEndDate,
    plannedProgress: milestone.plannedProgress,
    actualStartDate: isEmptyRelatedValue(value('dga_actual_start_date')) ? milestone.actualStartDate : String(value('dga_actual_start_date')),
    actualEndDate: isEmptyRelatedValue(value('dga_actual_end_date')) ? milestone.actualEndDate : String(value('dga_actual_end_date')),
    actualProgress: isEmptyRelatedValue(value('dga_actual_progress')) ? milestone.actualProgress : String(value('dga_actual_progress')),
    cancellationReason: isEmptyRelatedValue(value('dga_cancellation_reason')) ? milestone.cancellationReason : String(value('dga_cancellation_reason')),
    executionJustification: isEmptyRelatedValue(value('dga_justification')) ? milestone.executionJustification : String(value('dga_justification')),
    executionStatus: isEmptyRelatedValue(value('statuscode')) ? milestone.executionStatus : String(value('statuscode')) as ExecutionMilestoneStatusValue,
    quarter: milestone.quarter,
    status: milestone.status,
    assignee: milestone.assignee,
    weightage: milestone.weightage,
    makhrajAlMarhala: milestone.makhrajAlMarhala,
    marhalaAlMashroua: milestone.marhalaAlMashroua || '\u200B',
    description: milestone.description,
  }
}

function buildMilestoneRelatedChanges(
  milestone: Milestone,
  form: MilestoneFormData,
  uploadedFiles: UploadedFile[],
): ProjectRelatedChanges {
  const uploadedFileNames = uploadedFiles.map((file) => file.name).join(', ')

  return {
    milestones: [{
      id: cleanRecordId(milestone.id),
      name: milestone.name,
      dga_actual_start_date: relatedOldValue(form.actualStartDate),
      dga_actual_end_date: relatedOldValue(form.actualEndDate),
      statuscode: relatedOldValue(form.executionStatus ? Number(form.executionStatus) : ''),
      dga_actual_progress: relatedOldValue(form.actualProgress ? Number(form.actualProgress) : ''),
      dga_cancellation_reason: relatedOldValue(form.cancellationReason),
      dga_justification: relatedOldValue(form.executionJustification),
      uploaded_file: relatedOldValue(uploadedFileNames),
    }],
  }
}

export function MilestonesTab({
  activityPlannedEndDate,
  activityPlannedStartDate,
  isExecutionPhase = false,
  isReadOnly = false,
  canEditExecutionFieldsOnly = false,
  isAdeoVisible,
  onActivityDataChanged,
  onOperationAlert,
  onProgressChange,
  onProjectRelatedChangesChange,
  projectId,
  projectRelatedChanges,
}: MilestonesTabProps) {
  // ── Data state ──
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState('')
  const [viewMode, setViewMode] = useState<'quarter' | 'list'>('quarter')
  const [expandedQuarter, setExpandedQuarter] = useState<string | null>(null)
  const [localProjectRelatedChanges, setLocalProjectRelatedChanges] = useState<{ projectId: string; value: string } | null>(null)

  // ── CRUD state ──
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [drawerActiveTab, setDrawerActiveTab] = useState<'form' | 'logs'>('form')
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null)
  const [form, setForm] = useState<MilestoneFormData>(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<Partial<Record<MilestoneFormErrorKey, string>>>({})
  const [milestoneToDelete, setMilestoneToDelete] = useState<Milestone | null>(null)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const effectiveProjectRelatedChanges = localProjectRelatedChanges?.projectId === projectId
    ? localProjectRelatedChanges.value
    : projectRelatedChanges ?? ''

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
          'dga_planned_progress',
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
      const progressUpdates = mapped
        .map((milestone) => ({
          id: milestone.id,
          nextPlannedProgress: calculateMilestonePlannedProgress(milestone.plannedStartDate, milestone.plannedEndDate),
          previousPlannedProgress: Number(milestone.plannedProgress || 0),
        }))
        .filter((update) => Math.round(update.nextPlannedProgress * 100) !== Math.round(update.previousPlannedProgress * 100))

      if (progressUpdates.length > 0) {
        await Promise.all(progressUpdates.map(async (update) => {
          const updateResult = await Dga_aop_project_milestone_detailsesService.update(update.id, {
            dga_planned_progress: update.nextPlannedProgress,
          })
          assertOperationSuccess(updateResult, 'Unable to update milestone planned progress.')
        }))

        setMilestones((current) => current.map((milestone) => {
          const progressUpdate = progressUpdates.find((update) => update.id === milestone.id)
          return progressUpdate
            ? { ...milestone, plannedProgress: progressUpdate.nextPlannedProgress }
            : milestone
        }))
      }
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
  const milestoneProgress = useMemo(
    () => calculateProjectMilestoneProgress(milestones.map((milestone) => ({
      actualProgress: milestone.actualProgress,
      id: milestone.id,
      plannedEndDate: milestone.plannedEndDate,
      plannedProgress: milestone.plannedProgress,
      plannedStartDate: milestone.plannedStartDate,
      statuscode: milestone.executionStatus || undefined,
    })), effectiveProjectRelatedChanges),
    [effectiveProjectRelatedChanges, milestones],
  )

  useEffect(() => {
    onProgressChange?.(milestoneProgress)
  }, [milestoneProgress, onProgressChange])

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

  const quarterSummaries = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const dueSoonLimit = new Date(today)
    dueSoonLimit.setDate(dueSoonLimit.getDate() + 15)

    return QUARTERS.reduce<Record<(typeof QUARTERS)[number], {
      actualProgress: number
      dueSoonCount: number
      milestoneCount: number
      plannedProgress: number
      totalWeightage: number
    }>>((map, quarter) => {
      const quarterMilestones = milestonesByQuarter[quarter]
      const progressValues = quarterMilestones.map((milestone) => milestoneProgress.resultsById[milestone.id])
      const plannedTotal = progressValues.reduce((sum, result) => sum + (result?.plannedProgress ?? 0), 0)
      const actualTotal = progressValues.reduce((sum, result) => sum + (result?.actualProgress ?? 0), 0)
      const dueSoonCount = quarterMilestones.filter((milestone) => {
        if (!milestone.plannedEndDate) return false
        const endDate = new Date(`${milestone.plannedEndDate}T00:00:00`)
        return endDate >= today && endDate <= dueSoonLimit
      }).length

      map[quarter] = {
        actualProgress: quarterMilestones.length > 0 ? actualTotal / quarterMilestones.length : 0,
        dueSoonCount,
        milestoneCount: quarterMilestones.length,
        plannedProgress: quarterMilestones.length > 0 ? plannedTotal / quarterMilestones.length : 0,
        totalWeightage: quarterMilestones.reduce((sum, milestone) => sum + Number(milestone.weightage || 0), 0),
      }

      return map
    }, {
      'Quarter 1': { actualProgress: 0, dueSoonCount: 0, milestoneCount: 0, plannedProgress: 0, totalWeightage: 0 },
      'Quarter 2': { actualProgress: 0, dueSoonCount: 0, milestoneCount: 0, plannedProgress: 0, totalWeightage: 0 },
      'Quarter 3': { actualProgress: 0, dueSoonCount: 0, milestoneCount: 0, plannedProgress: 0, totalWeightage: 0 },
      'Quarter 4': { actualProgress: 0, dueSoonCount: 0, milestoneCount: 0, plannedProgress: 0, totalWeightage: 0 },
    })
  }, [milestoneProgress.resultsById, milestonesByQuarter])

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

  function toggleQuarter(quarter: string) {
    setExpandedQuarter((current) => (current === quarter ? null : quarter))
  }

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
    setDrawerActiveTab('form')
    setEditingMilestone(null)
    setForm(EMPTY_FORM)
    setUploadedFiles([])
    setFormErrors({})
    setError('')
    setIsDrawerOpen(true)
  }

  function handleOpenEdit(milestone: Milestone) {
    setDrawerActiveTab('form')
    setEditingMilestone(milestone)
    setForm(buildMilestoneFormFromRelatedChanges(effectiveProjectRelatedChanges, milestone))
    setUploadedFiles([])
    setFormErrors({})
    setError('')
    setIsDrawerOpen(true)
  }

  function handleCloseDrawer() {
    setIsDrawerOpen(false)
    setDrawerActiveTab('form')
    setEditingMilestone(null)
    setForm(EMPTY_FORM)
    setUploadedFiles([])
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

  function handleFileChange(files?: FileList | null) {
    if (isReadOnly && !canEditExecutionFieldsOnly) return
    const selectedFiles = Array.from(files ?? [])
    if (selectedFiles.length === 0) return
    setUploadedFiles((current) => {
      const existingKeys = new Set(current.map(getUploadedFileKey))
      const nextFiles = selectedFiles
        .map((file) => ({
          file,
          name: file.name,
          size: file.size,
        }))
        .filter((file) => {
          const key = getUploadedFileKey(file)
          if (existingKeys.has(key)) return false
          existingKeys.add(key)
          return true
        })

      return [...current, ...nextFiles]
    })
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    setFormErrors((prev) => {
      const next = { ...prev }
      delete next.uploadedFile
      return next
    })
  }

  function handleRemoveFile(fileKey: string) {
    if (isReadOnly && !canEditExecutionFieldsOnly) return
    setUploadedFiles((current) => current.filter((file) => getUploadedFileKey(file) !== fileKey))
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  function handleRemoveAllFiles() {
    if (isReadOnly && !canEditExecutionFieldsOnly) return
    setUploadedFiles([])
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

      if (uploadedFiles.length === 0) {
        errors.uploadedFile = 'At least one upload file is required.'
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
    if (isExecutionPhase && editingMilestone && isFutureQuarter(form.quarter)) {
      onOperationAlert?.({
        kind: 'error',
        message: 'This milestone is scheduled for a future quarter. Execution updates are locked until that quarter starts.',
        title: 'Milestone update blocked',
      })
      return
    }
    if (!validate()) return
    if (!projectId) {
      onOperationAlert?.({
        kind: 'error',
        message: 'Activity id is missing from the edit URL.',
        title: 'Milestone update blocked',
      })
      return
    }

    setIsSaving(true)
    setError('')
    onOperationAlert?.({
      kind: 'processing',
      title: editingMilestone
        ? isExecutionPhase
          ? 'Saving milestone execution changes'
          : 'Updating milestone'
        : 'Creating milestone',
    })

    try {
      if (editingMilestone && isExecutionPhase) {
        const projectResult = await Dga_aop_projectsesService.get(projectId, {
          select: ['dga_project_related_changes'],
        })
        assertOperationSuccess(projectResult, 'Unable to load activity change tracking.')

        const nextRelatedChanges = stringifyMergedProjectRelatedChanges(
          projectResult.data?.dga_project_related_changes,
          buildMilestoneRelatedChanges(editingMilestone, form, uploadedFiles),
        )
        const result = await Dga_aop_projectsesService.update(projectId, {
          dga_project_related_changes: nextRelatedChanges,
        } as Partial<Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid'>>)
        assertOperationSuccess(result, 'Unable to update milestone execution changes.')

        const currentRelatedChanges = projectResult.data?.dga_project_related_changes
        const previousExecutionValue = (fieldName: string, fallback: unknown = '') => {
          const value = getMilestoneRelatedValue(currentRelatedChanges, editingMilestone.id, fieldName)
          return isEmptyRelatedValue(value) ? fallback : value
        }
        void createExecutionFieldLogs(projectId, [
          {
            logType: EXECUTION_LOG_TYPES.milestone,
            name: `${editingMilestone.name} - Actual Start Date`,
            oldValue: previousExecutionValue('dga_actual_start_date', editingMilestone.actualStartDate),
            newValue: form.actualStartDate,
          },
          {
            logType: EXECUTION_LOG_TYPES.milestone,
            name: `${editingMilestone.name} - Actual End Date`,
            oldValue: previousExecutionValue('dga_actual_end_date', editingMilestone.actualEndDate),
            newValue: form.actualEndDate,
          },
          {
            logType: EXECUTION_LOG_TYPES.milestone,
            name: `${editingMilestone.name} - Milestone Status`,
            oldValue: formatMilestoneStatusLogValue(previousExecutionValue('statuscode', editingMilestone.executionStatus)),
            newValue: formatMilestoneStatusLogValue(form.executionStatus),
          },
          {
            logType: EXECUTION_LOG_TYPES.milestone,
            name: `${editingMilestone.name} - Actual Progress`,
            oldValue: previousExecutionValue('dga_actual_progress', editingMilestone.actualProgress),
            newValue: form.actualProgress,
          },
          {
            logType: EXECUTION_LOG_TYPES.milestone,
            name: `${editingMilestone.name} - Cancellation Reason`,
            oldValue: previousExecutionValue('dga_cancellation_reason', editingMilestone.cancellationReason),
            newValue: form.cancellationReason,
          },
          {
            logType: EXECUTION_LOG_TYPES.milestone,
            name: `${editingMilestone.name} - Justification`,
            oldValue: previousExecutionValue('dga_justification', editingMilestone.executionJustification),
            newValue: form.executionJustification,
          },
        ], { milestoneId: editingMilestone.id })

        setLocalProjectRelatedChanges({ projectId, value: nextRelatedChanges })
        onProjectRelatedChangesChange?.(nextRelatedChanges)
        setMilestones((current) =>
          current.map((milestone) =>
            milestone.id === editingMilestone.id
              ? {
                  ...milestone,
                  actualStartDate: form.actualStartDate,
                  actualEndDate: form.actualEndDate,
                  actualProgress: form.actualProgress,
                  cancellationReason: form.cancellationReason,
                  executionJustification: form.executionJustification,
                  executionStatus: form.executionStatus,
                  status: statusCodeToUi(form.executionStatus ? Number(form.executionStatus) : undefined),
                }
              : milestone,
          ),
        )

        try {
          await Promise.all(uploadedFiles.map(async (uploadedFile) => {
            const fileContentBytes = await readFileAsBase64(uploadedFile.file)
            const uploadResult = await UploadFileinAOPProjectService.Run({
              text: 'dga_aop_project_milestone_detailses',
              text_2: editingMilestone.id,
              text_1: projectId,
              file: {
                name: uploadedFile.name,
                contentBytes: fileContentBytes,
              },
            })
            assertOperationSuccess(uploadResult, `Unable to upload ${uploadedFile.name}.`)
          }))

          void createExecutionFieldLogs(projectId, [
            {
              logType: EXECUTION_LOG_TYPES.milestone,
              name: `${editingMilestone.name} - Upload File`,
              oldValue: previousExecutionValue('uploaded_file'),
              newValue: uploadedFiles.map((file) => file.name).join(', '),
            },
          ], { milestoneId: editingMilestone.id })
        } catch (uploadError) {
          const uploadMessage = uploadError instanceof Error ? uploadError.message : 'Unable to upload the milestone file.'
          onOperationAlert?.({
            kind: 'error',
            message: `Milestone execution changes were saved, but the file upload failed. ${uploadMessage}`,
            title: 'Milestone file upload failed',
          })
          onActivityDataChanged?.()
          return
        }

        onOperationAlert?.({
          kind: 'success',
          message: 'Milestone execution changes updated successfully.',
          title: 'Milestone updated',
        })
      } else if (editingMilestone) {
        const result = await Dga_aop_project_milestone_detailsesService.update(
          editingMilestone.id,
          buildMilestoneUpdatePayload({ ...form, quarter: calculateQuarter(form) }),
        )
        assertOperationSuccess(result, 'Unable to update milestone.')
        onOperationAlert?.({
          kind: 'success',
          message: 'Milestone updated successfully.',
          title: 'Milestone updated',
        })
      } else {
        const result = await Dga_aop_project_milestone_detailsesService.create(
          buildMilestoneCreatePayload({ ...form, quarter: calculateQuarter(form) }, projectId),
        )
        assertOperationSuccess(result, 'Unable to create milestone.')
        onOperationAlert?.({
          kind: 'success',
          message: 'Milestone created successfully.',
          title: 'Milestone created',
        })
      }

      handleCloseDrawer()
      if (!isExecutionPhase) {
        await loadMilestones()
      }
      onActivityDataChanged?.()
    } catch (saveError) {
      onOperationAlert?.({
        kind: 'error',
        message: saveError instanceof Error ? saveError.message : 'Unable to save milestone.',
        title: 'Milestone was not saved',
      })
    } finally {
      setIsSaving(false)
    }
  }

  async function handleConfirmDelete() {
    if (isReadOnly || canEditExecutionFieldsOnly) return
    if (!milestoneToDelete) return
    setIsDeleting(true)
    setError('')
    onOperationAlert?.({ kind: 'processing', title: 'Deleting milestone' })

    try {
      await Dga_aop_project_milestone_detailsesService.delete(milestoneToDelete.id)
      setMilestones((prev) => prev.filter((m) => m.id !== milestoneToDelete.id))
      setMilestoneToDelete(null)
      onOperationAlert?.({
        kind: 'success',
        message: 'Milestone deleted successfully.',
        title: 'Milestone deleted',
      })
      onActivityDataChanged?.()
    } catch (deleteError) {
      onOperationAlert?.({
        kind: 'error',
        message: deleteError instanceof Error ? deleteError.message : 'Unable to delete milestone.',
        title: 'Milestone was not deleted',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // ── Render helpers ──

  function renderMilestoneProgress(milestone: Milestone, compact = false) {
    const result = milestoneProgress.resultsById[milestone.id]
    const value = isExecutionPhase ? result?.actualProgress ?? 0 : result?.plannedProgress ?? 0
    const progressLabel = isExecutionPhase ? 'Actual' : 'Planned'

    return (
      <div className={`edit-activity__milestone-progress${compact ? ' edit-activity__milestone-progress--compact' : ''}${isExecutionPhase ? ' edit-activity__milestone-progress--actual' : ' edit-activity__milestone-progress--planned'}`}>
        <div className="edit-activity__milestone-progress-meta">
          <span>{progressLabel}</span>
          <strong>{Math.round(value)}%</strong>
        </div>
        <div
          aria-label={`${progressLabel} progress ${Math.round(value)}%`}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={Math.round(value)}
          className="edit-activity__milestone-progress-track"
          role="progressbar"
        >
          <span style={{ width: `${value}%` }} />
        </div>
      </div>
    )
  }

  function renderQuarterMilestoneRow(milestone: Milestone) {
    return (
      <div key={milestone.id} className="edit-activity__milestone-item">
        <div className="edit-activity__milestone-card">
          <div className="edit-activity__milestone-card-top">
            <div className="edit-activity__milestone-card-date">
              {formatDateDisplay(milestone.plannedStartDate)} → {formatDateDisplay(milestone.plannedEndDate)}
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
          {isAdeoVisible ? (
            <div className="edit-activity__milestone-card-weightage">
              {milestone.weightage}%
            </div>
          ) : null}
          {renderMilestoneProgress(milestone, true)}
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
    const summary = quarterSummaries[quarter]
    const isExpanded = expandedQuarter === quarter
    const quarterRange = index === 0
      ? 'Jan - Mar'
      : index === 1
        ? 'Apr - Jun'
        : index === 2
          ? 'Jul - Sep'
          : 'Oct - Dec'

    return (
      <section className={`edit-activity__milestone-quarter${isExpanded ? ' edit-activity__milestone-quarter--expanded' : ''}`} key={quarter}>
        <button
          aria-expanded={isExpanded}
          className="edit-activity__milestone-quarter-summary"
          onClick={() => toggleQuarter(quarter)}
          type="button"
        >
          <div className="edit-activity__milestone-quarter-heading">
            <span className="edit-activity__milestone-quarter-number">Q{index + 1}</span>
            <div>
              <h3>{quarter}</h3>
              <span className="edit-activity__milestone-quarter-range">
                {quarterRange}
              </span>
            </div>
          </div>
          <div className="edit-activity__milestone-quarter-metrics">
            <span className="edit-activity__milestone-quarter-metric edit-activity__milestone-quarter-metric--primary">
              <strong>{summary.milestoneCount}</strong>
              Milestones
            </span>
            <span className="edit-activity__milestone-quarter-metric edit-activity__milestone-quarter-metric--warning">
              <strong>{summary.dueSoonCount}</strong>
              Due Soon
            </span>
            {isAdeoVisible ? (
              <span className="edit-activity__milestone-quarter-metric edit-activity__milestone-quarter-metric--success">
                <strong>{summary.totalWeightage}%</strong>
                Weightage
              </span>
            ) : null}
          </div>
          <div className="edit-activity__milestone-quarter-progress-group">
            <div className="edit-activity__milestone-quarter-progress">
              <span>Planned</span>
              <strong>{Math.round(summary.plannedProgress)}%</strong>
              <div aria-hidden="true"><i style={{ width: `${summary.plannedProgress}%` }} /></div>
            </div>
            {isExecutionPhase ? (
              <div className="edit-activity__milestone-quarter-progress edit-activity__milestone-quarter-progress--actual">
                <span>Actual</span>
                <strong>{Math.round(summary.actualProgress)}%</strong>
                <div aria-hidden="true"><i style={{ width: `${summary.actualProgress}%` }} /></div>
              </div>
            ) : null}
          </div>
          <span className="edit-activity__milestone-quarter-toggle" aria-hidden="true">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </span>
        </button>

        {isExpanded ? (
          <div className="edit-activity__milestone-quarter-body">
            {quarterMilestones.length > 0 ? (
              <div className={`edit-activity__milestone-quarter-table${isAdeoVisible ? '' : ' edit-activity__milestone-quarter-table--no-weightage'}`}>
                <div className="edit-activity__milestone-quarter-row edit-activity__milestone-quarter-row--head">
                  <div>Milestone</div>
                  <div>Timeline</div>
                  {isAdeoVisible ? <div>Weightage</div> : null}
                  <div>{isExecutionPhase ? 'Actual Progress' : 'Planned Progress'}</div>
                  <div>Actions</div>
                </div>
                {quarterMilestones.map(renderQuarterMilestoneRow)}
              </div>
            ) : (
              <div className="edit-activity__milestone-quarter-empty">
                <Flag size={22} strokeWidth={1.5} />
                <strong>No milestones yet</strong>
                <span>Add a milestone with a planned end date in this quarter.</span>
              </div>
            )}
          </div>
        ) : null}
      </section>
    )
  }

  function renderMilestoneStatusCapsule(milestone: Milestone) {
    return (
      <span className={`edit-activity__milestone-status-capsule edit-activity__milestone-status-capsule--${milestone.status}`}>
        {MILESTONE_STATUS_LABELS[milestone.status]}
      </span>
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
      <div className={`edit-activity__milestone-list-grid${isAdeoVisible ? '' : ' edit-activity__milestone-list-grid--no-weightage'}`}>
        <div className="edit-activity__milestone-list-row edit-activity__milestone-list-row--header">
          <div className="edit-activity__milestone-list-cell">Name</div>
          <div className="edit-activity__milestone-list-cell">Quarter</div>
          <div className="edit-activity__milestone-list-cell">Timeline</div>
          {isAdeoVisible ? <div className="edit-activity__milestone-list-cell">Weightage</div> : null}
          <div className="edit-activity__milestone-list-cell">{isExecutionPhase ? 'Actual Progress' : 'Planned Progress'}</div>
          <div className="edit-activity__milestone-list-cell">Status</div>
          <div className="edit-activity__milestone-list-cell edit-activity__milestone-list-cell--actions">Actions</div>
        </div>

        {milestones.map((milestone) => (
          <div className="edit-activity__milestone-list-row" key={milestone.id}>
            <div className="edit-activity__milestone-list-cell edit-activity__milestone-list-cell--name" data-label="Name">
              <button
                className="edit-activity__milestone-list-name-btn"
                onClick={() => handleOpenEdit(milestone)}
                title={`Edit milestone: ${milestone.name}`}
                type="button"
              >
                {milestone.name || 'Untitled milestone'}
              </button>
            </div>
            <div className="edit-activity__milestone-list-cell edit-activity__milestone-list-cell--quarter" data-label="Quarter">
              <span className={getQuarterBadgeClass(milestone.quarter)}>
                {milestone.quarter}
              </span>
            </div>
            <div className="edit-activity__milestone-list-cell edit-activity__milestone-list-cell--timeline" data-label="Timeline">
              {formatDateDisplay(milestone.plannedStartDate)} → {formatDateDisplay(milestone.plannedEndDate)}
            </div>
            {isAdeoVisible ? (
              <div className="edit-activity__milestone-list-cell edit-activity__milestone-list-cell--weightage" data-label="Weightage">
                {milestone.weightage}%
              </div>
            ) : null}
            <div
              className="edit-activity__milestone-list-cell edit-activity__milestone-list-cell--progress"
              data-label={isExecutionPhase ? 'Actual Progress' : 'Planned Progress'}
            >
              {renderMilestoneProgress(milestone)}
            </div>
            <div className="edit-activity__milestone-list-cell edit-activity__milestone-list-cell--status" data-label="Status">
              {renderMilestoneStatusCapsule(milestone)}
            </div>
            <div className="edit-activity__milestone-list-cell edit-activity__milestone-list-cell--actions" data-label="Actions">
              <div className="edit-activity__milestone-list-actions">
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
        ))}
      </div>
    )
  }

  function renderDrawerForm() {
    const title = editingMilestone ? 'Edit Milestone' : 'Create Milestone'
    const showExecutionFields = isExecutionPhase && Boolean(editingMilestone)
    const showPlanningReadOnlyView = showExecutionFields
    const isFutureQuarterLocked = showExecutionFields && isFutureQuarter(form.quarter)
    const canEditExecutionSection = (!isReadOnly || (canEditExecutionFieldsOnly && showExecutionFields)) && !isFutureQuarterLocked
    const isBaseSectionReadOnly = isReadOnly || canEditExecutionFieldsOnly || isFutureQuarterLocked
    const showDrawerTabs = showExecutionFields && Boolean(editingMilestone)
    const isDrawerLogsTab = showDrawerTabs && drawerActiveTab === 'logs'
    const requiresCancellationReason = form.executionStatus === EXECUTION_STATUS_REQUIRES_CANCELLATION_REASON
    const requiresExecutionJustification = Boolean(
      form.executionStatus && EXECUTION_STATUS_REQUIRES_JUSTIFICATION.has(form.executionStatus),
    )
    return (
      <SideDrawer
        actions={
          <div className="edit-activity__milestones-drawer-actions">
            <Button className="edit-activity__milestones-drawer-button" onClick={handleCloseDrawer} variant="secondary">
              Cancel
            </Button>
            {!isDrawerLogsTab ? (
              <Button className="edit-activity__milestones-drawer-button" disabled={!canEditExecutionSection || isSaving} onClick={handleSave}>
                {isSaving ? 'Saving...' : editingMilestone ? 'Update Milestone' : 'Create Milestone'}
              </Button>
            ) : null}
          </div>
        }
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        title={title}
      >
        <div className="edit-activity__milestones-drawer">
          {isFutureQuarterLocked ? (
            <div className="edit-activity__milestone-warning" role="status">
              <span className="edit-activity__milestone-warning-icon" aria-hidden="true">
                <AlertTriangle size={15} />
              </span>
              <div>
                <strong>Future quarter milestone</strong>
                <p>This milestone is scheduled for a future quarter. You can review the details now, but execution updates will be enabled when that quarter starts.</p>
              </div>
            </div>
          ) : null}

          {showDrawerTabs ? (
            <div className="edit-activity__drawer-tabs" role="tablist" aria-label="Milestone drawer sections">
              <button
                aria-selected={drawerActiveTab === 'form'}
                className={`edit-activity__drawer-tab${drawerActiveTab === 'form' ? ' edit-activity__drawer-tab--active' : ''}`}
                onClick={() => setDrawerActiveTab('form')}
                role="tab"
                type="button"
              >
                Form
              </button>
              <button
                aria-selected={drawerActiveTab === 'logs'}
                className={`edit-activity__drawer-tab${drawerActiveTab === 'logs' ? ' edit-activity__drawer-tab--active' : ''}`}
                onClick={() => setDrawerActiveTab('logs')}
                role="tab"
                type="button"
              >
                Logs
              </button>
            </div>
          ) : null}

          {isDrawerLogsTab && editingMilestone ? (
            <RecordLogsGrid
              emptyMessage="No milestone logs found for this record yet."
              logType={EXECUTION_LOG_TYPES.milestone}
              projectId={projectId}
              recordId={editingMilestone.id}
              recordName={editingMilestone.name}
              variant="compact"
            />
          ) : (
            <>
          {showExecutionFields ? (
            <div className="edit-activity__milestones-drawer-card">
              <div className="create-activity__section-header edit-activity__milestones-drawer-header">
                <div className="create-activity__section-header-inner">
                <span className="create-activity__section-header-icon" aria-hidden="true">
                  <Flag size={16} />
                </span>
                <div>
                    <h2>Execution Update</h2>
                    <p>Capture actual delivery dates, progress, status, and supporting evidence.</p>
                </div>
              </div>
            </div>

              <div className="edit-activity__milestones-drawer-section">
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
                    multiple
                    onChange={(event) => handleFileChange(event.target.files)}
                    ref={fileInputRef}
                    type="file"
                  />

                  <button
                    className={`edit-activity__file-upload ${uploadedFiles.length > 0 ? 'edit-activity__file-upload--has-file' : ''}`}
                    disabled={!canEditExecutionSection}
                    onClick={() => fileInputRef.current?.click()}
                    type="button"
                  >
                    <span className="edit-activity__file-upload-icon" aria-hidden="true">
                      <Upload size={18} />
                    </span>
                    <span className="edit-activity__file-upload-copy">
                      <strong>{uploadedFiles.length > 0 ? `${uploadedFiles.length} file${uploadedFiles.length === 1 ? '' : 's'} selected` : 'Upload supporting files'}</strong>
                      <span>{uploadedFiles.length > 0 ? 'Add more files or remove selected files before saving.' : 'Choose one or more files to support this execution update.'}</span>
                    </span>
                    <span className="edit-activity__file-upload-action">
                      {uploadedFiles.length > 0 ? 'Add files' : 'Choose files'}
                    </span>
                  </button>

                  {uploadedFiles.length > 0 ? (
                    <div className="edit-activity__file-upload-list">
                      <div className="edit-activity__file-upload-list-header">
                        <span>
                          <strong>Selected files</strong>
                          <small>{uploadedFiles.length} file{uploadedFiles.length === 1 ? '' : 's'} · {formatFileSize(uploadedFiles.reduce((total, file) => total + file.size, 0))}</small>
                        </span>
                        {canEditExecutionSection ? (
                          <button
                            className="edit-activity__file-upload-clear"
                            onClick={handleRemoveAllFiles}
                            type="button"
                          >
                            Clear all
                          </button>
                        ) : null}
                      </div>

                      <div className="edit-activity__file-upload-items">
                        {uploadedFiles.map((uploadedFile) => {
                          const uploadedFileKey = getUploadedFileKey(uploadedFile)

                          return (
                          <div className="edit-activity__file-upload-meta" key={uploadedFileKey}>
                            <span className="edit-activity__file-upload-file-icon" aria-hidden="true">
                              <FileText size={14} />
                            </span>
                            <span className="edit-activity__file-upload-file">
                              <strong>{uploadedFile.name}</strong>
                              <span>{formatFileSize(uploadedFile.size)}</span>
                            </span>
                            {canEditExecutionSection ? (
                              <button
                                aria-label={`Remove ${uploadedFile.name}`}
                                className="edit-activity__file-upload-remove"
                                onClick={() => handleRemoveFile(uploadedFileKey)}
                                type="button"
                              >
                                <X size={14} />
                              </button>
                            ) : null}
                          </div>
                          )
                        })}
                      </div>
                    </div>
                  ) : null}

                  {formErrors.uploadedFile ? <span className="field__error">{formErrors.uploadedFile}</span> : null}
                </div>
              </div>
            </div>
          ) : null}

          <div className="edit-activity__milestones-drawer-card">
            <div className="create-activity__section-header edit-activity__milestones-drawer-header">
              <div className="create-activity__section-header-inner">
                <span className="create-activity__section-header-icon" aria-hidden="true">
                  <Flag size={16} />
                </span>
                <div>
                  <h2>Milestone Details</h2>
                  <p>Define the milestone name, quarter, and delivery description.</p>
                </div>
              </div>
            </div>

            {showPlanningReadOnlyView ? (
              <div className="create-activity__readonly-panel edit-activity__milestones-drawer-readonly">
                {renderMilestoneReadOnlyDetails([
                  { label: 'Name of Milestone', value: form.name, kind: 'identity', columns: 6 },
                  { label: 'Quarter', value: form.quarter, kind: 'classification', columns: 6 },
                  { label: 'Planned Start Date', value: form.plannedStartDate, type: 'date', kind: 'date', columns: 6 },
                  { label: 'Planned End Date', value: form.plannedEndDate, type: 'date', kind: 'date', columns: 6 },
                  { label: 'Description', value: form.description, type: 'long', kind: 'narrative', columns: 12 },
                ])}
              </div>
            ) : (
              <div className="edit-activity__milestones-drawer-section">
                <Input
                  disabled={isBaseSectionReadOnly}
                  error={formErrors.name}
                  label="Name of Milestone"
                  onChange={(e) => handleFieldChange({ name: e.target.value })}
                  required
                  value={form.name}
                />

                <div className="edit-activity__milestone-drawer-subhead">
                  <h3>Timeline</h3>
                  <p>Set the planned start and end dates for this milestone.</p>
                </div>

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
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            )}
          </div>

          {isAdeoVisible ? (
            <div className="edit-activity__milestones-drawer-card">
              <div className="create-activity__section-header edit-activity__milestones-drawer-header">
                <div className="create-activity__section-header-inner">
                <span className="create-activity__section-header-icon" aria-hidden="true">
                    <CalendarDays size={16} />
                </span>
                <div>
                    <h2>ADEO Details</h2>
                    <p>Maintain weightage and ADEO-required milestone fields.</p>
                </div>
              </div>
              </div>

              {showPlanningReadOnlyView ? (
                <div className="create-activity__readonly-panel edit-activity__milestones-drawer-readonly">
                  {renderMilestoneReadOnlyDetails([
                    { label: 'Weightage (%)', value: `${form.weightage || 0}%`, kind: 'requirement', columns: 6 },
                    { label: 'Remaining Weightage', value: `${remainingWeightage}%`, kind: 'requirement', columns: 6 },
                    { label: 'مخرجات المرحلة', value: form.makhrajAlMarhala, kind: 'narrative', columns: 6 },
                    { label: 'مرحلة المشروع', value: form.marhalaAlMashroua, kind: 'classification', columns: 6 },
                  ])}
                </div>
              ) : (

              <div className="edit-activity__milestones-drawer-section">
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
              )}
            </div>
          ) : null}

            </>
          )}

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
          <h2>Milestones</h2>
          <p>Track project milestones and key deliverables.</p>
        </div>
        <div className="edit-activity__milestone-header-actions">
          <Button disabled={isReadOnly || canEditExecutionFieldsOnly || !projectId || isLoading} icon={<Plus size={15} />} onClick={handleOpenCreate}>
            Add Milestone
          </Button>
          <div className="edit-activity__milestone-view-switch" aria-label="Milestone view switch">
            <button
              aria-label="Quarter view"
              className={`edit-activity__milestone-view-switch-btn ${viewMode === 'quarter' ? 'edit-activity__milestone-view-switch-btn--active' : ''}`}
              onClick={() => setViewMode('quarter')}
              title="Quarter view"
              type="button"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              aria-label="List view"
              className={`edit-activity__milestone-view-switch-btn ${viewMode === 'list' ? 'edit-activity__milestone-view-switch-btn--active' : ''}`}
              onClick={() => setViewMode('list')}
              title="List view"
              type="button"
            >
              <List size={15} />
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <div className="edit-activity__members-modal-error">
          <Flag size={13} />
          {error}
        </div>
      ) : null}

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
