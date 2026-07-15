import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { Link2 } from 'lucide-react'
import { Card, RadioGroup } from '../../components/ui'
import type { Dga_aop_projectsesBase } from '../../generated/models/Dga_aop_projectsesModel'
import type { Dga_objective_dga_objectiveset } from '../../generated/models/Dga_objective_dga_objectivesetModel'
import type { Dga_objectives } from '../../generated/models/Dga_objectivesModel'
import { Dga_aop_projectsesService } from '../../generated/services/Dga_aop_projectsesService'
import { Dga_objective_dga_objectivesetService } from '../../generated/services/Dga_objective_dga_objectivesetService'
import { Dga_objectivesService } from '../../generated/services/Dga_objectivesService'
import { AiSummaryPanel } from './AiSummaryPanel'
import type { AiSummaryBlocks, AiSummaryMeta } from './types/aiSummaryTypes'

type ObjectiveValue = string

type ObjectiveForm = {
  corporateStrategyPillarId: ObjectiveValue
  digitalPillarId: ObjectiveValue
  digitalObjectiveId: ObjectiveValue
  strategicKpiId: ObjectiveValue
}

type ObjectiveOption = {
  description?: string
  label: string
  value: string
}

type ObjectiveErrors = Partial<Record<keyof ObjectiveForm, string>>

type ObjectivesTabProps = {
  aiSummaryBlocks?: AiSummaryBlocks
  aiSummaryError?: string
  aiSummaryMeta?: AiSummaryMeta
  isAiSummaryLoading?: boolean
  isReadOnly?: boolean
  onActivityDataChanged?: () => void
  onHeaderActionChange?: (action: ObjectiveHeaderAction | null) => void
  projectId: string
  statusCode?: number
}

export type ObjectiveHeaderAction = {
  canSave: boolean
  label: string
  onSave: () => void
  savingLabel: string
  isSaving: boolean
}

const EMPTY_FORM: ObjectiveForm = {
  corporateStrategyPillarId: '',
  digitalPillarId: '',
  digitalObjectiveId: '',
  strategicKpiId: '',
}

const OBJECTIVE_SELECT_FIELDS = [
  '_dga_dge_corporate_strategy_pillar_value',
  '_dga_govdigital_pillar_value',
  '_dga_link_to_dge_strategic_objective_value',
  '_dga_link_to_strategic_kpis_value',
]

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
  return id?.replace(/[{}]/g, '').toLowerCase() ?? ''
}

function validateObjectiveForm(form: ObjectiveForm) {
  const errors: ObjectiveErrors = {}

  if (!form.corporateStrategyPillarId) {
    errors.corporateStrategyPillarId = 'Select the DGE Corporate Strategy Pillar.'
  }

  if (!form.digitalPillarId) {
    errors.digitalPillarId = 'Select the Digital Strategy Pillar.'
  }

  if (!form.digitalObjectiveId) {
    errors.digitalObjectiveId = 'Select a Digital Strategy objective.'
  }

  if (!form.strategicKpiId) {
    errors.strategicKpiId = 'Select a strategic KPI.'
  }

  return errors
}

function isSameForm(left: ObjectiveForm, right: ObjectiveForm) {
  return (
    normalizeId(left.corporateStrategyPillarId) === normalizeId(right.corporateStrategyPillarId)
    && normalizeId(left.digitalPillarId) === normalizeId(right.digitalPillarId)
    && normalizeId(left.digitalObjectiveId) === normalizeId(right.digitalObjectiveId)
    && normalizeId(left.strategicKpiId) === normalizeId(right.strategicKpiId)
  )
}

function toObjectiveOption(objective: Dga_objectives): ObjectiveOption | null {
  if (!objective.dga_objectiveid) return null

  return {
    description: objective.dga_description,
    label: objective.dga_name || 'Unnamed objective',
    value: objective.dga_objectiveid,
  }
}

function matchesDigitalPillar(option: ObjectiveOption, selectedPillar?: ObjectiveOption) {
  if (!selectedPillar) return false

  const haystack = [option.label, option.description].filter(Boolean).join(' ').toLowerCase()
  const pillarNeedles = [
    selectedPillar.label,
    selectedPillar.description,
  ]
    .filter(Boolean)
    .flatMap((text) => text!.split(/[\s/|,;:()\-–—]+/))
    .map((text) => text.trim().toLowerCase())
    .filter((text) => text.length > 2)

  return pillarNeedles.some((needle) => haystack.includes(needle))
}

function buildProjectPayload(form: ObjectiveForm): Partial<Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid'>> {
  const payload: Partial<Omit<Dga_aop_projectsesBase, 'dga_aop_projectsid'>> = {}

  if (form.corporateStrategyPillarId) {
    payload['dga_dge_corporate_strategy_pillar@odata.bind'] = `/dga_objectives(${form.corporateStrategyPillarId.replace(/[{}]/g, '')})`
  }

  if (form.digitalPillarId) {
    payload['dga_govdigital_pillar@odata.bind'] = `/dga_objectives(${form.digitalPillarId.replace(/[{}]/g, '')})`
  }

  if (form.digitalObjectiveId) {
    payload['dga_link_to_dge_strategic_objective@odata.bind'] = `/dga_objectives(${form.digitalObjectiveId.replace(/[{}]/g, '')})`
  }

  if (form.strategicKpiId) {
    payload['dga_link_to_strategic_kpis@odata.bind'] = `/dga_objectives(${form.strategicKpiId.replace(/[{}]/g, '')})`
  }

  return payload
}

export function ObjectivesTab({
  aiSummaryBlocks,
  aiSummaryError,
  aiSummaryMeta,
  isAiSummaryLoading = false,
  isReadOnly = false,
  onActivityDataChanged,
  onHeaderActionChange,
  projectId,
  statusCode = 1,
}: ObjectivesTabProps) {
  const uid = useId()
  const [form, setForm] = useState<ObjectiveForm>(EMPTY_FORM)
  const [savedForm, setSavedForm] = useState<ObjectiveForm>(EMPTY_FORM)
  const [objectives, setObjectives] = useState<Dga_objectives[]>([])
  const [objectiveRelationships, setObjectiveRelationships] = useState<Dga_objective_dga_objectiveset[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<ObjectiveErrors>({})
  const [notice, setNotice] = useState('')

  const loadObjectivesContext = useCallback(async () => {
    if (!projectId) {
      setError('Activity id is missing from the edit URL.')
      setFieldErrors({})
      setForm(EMPTY_FORM)
      setSavedForm(EMPTY_FORM)
      setObjectives([])
      setObjectiveRelationships([])
      return
    }

    setIsLoading(true)
    setError('')
    setFieldErrors({})
    setNotice('')

    try {
      const [objectivesResult, relationshipsResult, projectResult] = await Promise.all([
        Dga_objectivesService.getAll({
          select: [
            'dga_objectiveid',
            'dga_name',
            'dga_description',
            'dga_objective_type',
            'statecode',
            'statuscode',
          ],
          filter: 'statecode eq 0 and (dga_objective_type eq 2 or dga_objective_type eq 3 or dga_objective_type eq 4 or dga_objective_type eq 5)',
          orderBy: ['dga_objective_type asc', 'dga_name asc'],
        }),
        Dga_objective_dga_objectivesetService.getAll({
          select: [
            'dga_objective_dga_objectiveid',
            'dga_objectiveidone',
            'dga_objectiveidtwo',
          ],
        }),
        Dga_aop_projectsesService.get(projectId, {
          select: OBJECTIVE_SELECT_FIELDS,
        }),
      ])

      assertOperationSuccess(objectivesResult, 'Unable to load objectives.')
      assertOperationSuccess(relationshipsResult, 'Unable to load objective relationships.')
      assertOperationSuccess(projectResult, 'Unable to load activity objective links.')

      setObjectives((objectivesResult.data ?? []) as Dga_objectives[])
      setObjectiveRelationships((relationshipsResult.data ?? []) as Dga_objective_dga_objectiveset[])
      const loadedForm = {
        corporateStrategyPillarId: projectResult.data?._dga_dge_corporate_strategy_pillar_value ?? '',
        digitalPillarId: projectResult.data?._dga_govdigital_pillar_value ?? '',
        digitalObjectiveId: projectResult.data?._dga_link_to_dge_strategic_objective_value ?? '',
        strategicKpiId: projectResult.data?._dga_link_to_strategic_kpis_value ?? '',
      }

      setForm(loadedForm)
      setSavedForm(loadedForm)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load objectives.')
      setFieldErrors({})
      setForm(EMPTY_FORM)
      setSavedForm(EMPTY_FORM)
      setObjectives([])
      setObjectiveRelationships([])
    } finally {
      setIsLoading(false)
    }
  }, [projectId])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadObjectivesContext()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadObjectivesContext])

  const corporatePillarOptions = useMemo(() => objectives
    .filter((objective) => objective.dga_objective_type === 5)
    .map(toObjectiveOption)
    .filter((option): option is ObjectiveOption => Boolean(option)), [objectives])

  const digitalPillarOptions = useMemo(() => objectives
    .filter((objective) => objective.dga_objective_type === 3)
    .map(toObjectiveOption)
    .filter((option): option is ObjectiveOption => Boolean(option)), [objectives])

  const allKpiOptions = useMemo(() => objectives
    .filter((objective) => objective.dga_objective_type === 2)
    .map(toObjectiveOption)
    .filter((option): option is ObjectiveOption => Boolean(option)), [objectives])

  const allDigitalObjectiveOptions = useMemo(() => objectives
    .filter((objective) => objective.dga_objective_type === 4)
    .map(toObjectiveOption)
    .filter((option): option is ObjectiveOption => Boolean(option)), [objectives])

  const linkedObjectiveIdsByPillar = useMemo(() => {
    const linkedIds = new Set<string>()
    const selectedPillarId = normalizeId(form.digitalPillarId)

    if (!selectedPillarId) return linkedIds

    objectiveRelationships.forEach((relationship) => {
      const firstId = normalizeId(relationship.dga_objectiveidone)
      const secondId = normalizeId(relationship.dga_objectiveidtwo)

      if (firstId === selectedPillarId && secondId) {
        linkedIds.add(secondId)
      } else if (secondId === selectedPillarId && firstId) {
        linkedIds.add(firstId)
      }
    })

    return linkedIds
  }, [form.digitalPillarId, objectiveRelationships])
  const digitalObjectiveOptions = useMemo(() => (
    form.digitalPillarId
      ? allDigitalObjectiveOptions.filter((option) => linkedObjectiveIdsByPillar.has(normalizeId(option.value)))
      : []
  ), [allDigitalObjectiveOptions, form.digitalPillarId, linkedObjectiveIdsByPillar])
  const kpiOptions = useMemo(() => (
    form.digitalPillarId
      ? allKpiOptions.filter((option) => linkedObjectiveIdsByPillar.has(normalizeId(option.value)))
      : []
  ), [allKpiOptions, form.digitalPillarId, linkedObjectiveIdsByPillar])
  const selectedDigitalObjectiveId = digitalObjectiveOptions.some((option) => normalizeId(option.value) === normalizeId(form.digitalObjectiveId))
    ? form.digitalObjectiveId
    : ''
  const selectedStrategicKpiId = kpiOptions.some((option) => normalizeId(option.value) === normalizeId(form.strategicKpiId))
    ? form.strategicKpiId
    : ''
  const legacyTextMatchingFallbackEnabled = false
  void legacyTextMatchingFallbackEnabled
  void matchesDigitalPillar
  const activeCount = [
    form.corporateStrategyPillarId,
    form.digitalPillarId,
    selectedDigitalObjectiveId,
    selectedStrategicKpiId,
  ].filter(Boolean).length
  const hasUnsavedChanges = !isSameForm(form, savedForm)
  const canSave = !isReadOnly && !isLoading && !isSaving && !error
  const saveLabel = statusCode === 1 ? 'Save Draft' : 'Save Changes'

  const saveObjectives = useCallback(async (nextForm: ObjectiveForm, successMessage = 'Objectives saved successfully.') => {
    if (isReadOnly) return
    if (!projectId || isSaving) return

    setIsSaving(true)
    setError('')
    setNotice('')

    try {
      const result = await Dga_aop_projectsesService.update(projectId, buildProjectPayload(nextForm))
      assertOperationSuccess(result, 'Unable to save objective links.')
      setSavedForm(nextForm)
      setNotice(successMessage)
      onActivityDataChanged?.()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save objective links.')
    } finally {
      setIsSaving(false)
    }
  }, [isReadOnly, isSaving, onActivityDataChanged, projectId])

  const applyFormChange = useCallback((updater: (currentForm: ObjectiveForm) => ObjectiveForm) => {
    if (isReadOnly) return
    setForm((currentForm) => {
      const nextForm = updater(currentForm)
      setNotice('')
      setFieldErrors((currentErrors) => {
        const nextErrors = { ...currentErrors }

        Object.entries(nextForm).forEach(([key, value]) => {
          if (value) delete nextErrors[key as keyof ObjectiveForm]
        })

        if (normalizeId(nextForm.digitalPillarId) !== normalizeId(currentForm.digitalPillarId)) {
          delete nextErrors.digitalObjectiveId
          delete nextErrors.strategicKpiId
        }

        return nextErrors
      })

      return nextForm
    })
  }, [isReadOnly])

  const handleSave = useCallback(() => {
    if (!canSave) return

    const nextErrors = validateObjectiveForm(form)
    if (form.digitalPillarId && !selectedDigitalObjectiveId) {
      nextErrors.digitalObjectiveId = 'Select a Digital Strategy objective mapped to the selected Digital Strategy Pillar.'
    }
    if (form.digitalPillarId && !selectedStrategicKpiId) {
      nextErrors.strategicKpiId = 'Select a strategic KPI mapped to the selected Digital Strategy Pillar.'
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return
    }

    if (!hasUnsavedChanges) {
      setNotice('No objective changes to save.')
      return
    }

    void saveObjectives(form)
  }, [canSave, form, hasUnsavedChanges, saveObjectives, selectedDigitalObjectiveId, selectedStrategicKpiId])

  useEffect(() => {
    onHeaderActionChange?.(!isLoading ? {
      canSave,
      isSaving,
      label: saveLabel,
      onSave: handleSave,
      savingLabel: 'Saving...',
    } : null)
  }, [canSave, handleSave, isLoading, isSaving, onHeaderActionChange, saveLabel])

  useEffect(() => {
    return () => onHeaderActionChange?.(null)
  }, [onHeaderActionChange])

  function handleDigitalPillarChange(value: string) {
    applyFormChange((currentForm) => ({
      ...currentForm,
      digitalPillarId: value,
      digitalObjectiveId: '',
      strategicKpiId: '',
    }))
  }

  return (
    <div className="edit-activity__objectives">
      <AiSummaryPanel
        error={aiSummaryError}
        isLoading={isAiSummaryLoading}
        meta={aiSummaryMeta}
        summaries={aiSummaryBlocks}
        title="Objectives"
      />
      <div className="edit-activity__members-header">
        <div className="edit-activity__members-header-text">
          <h2>
            Objectives
            <span className="edit-activity__members-count-badge">
              {activeCount} of 4 selected
            </span>
          </h2>
          <p>Link the activity to corporate and digital strategy objectives.</p>
        </div>
      </div>

      {error ? (
        <div className="edit-activity__members-modal-error">{error}</div>
      ) : notice ? (
        <div className="edit-activity__members-modal-selected-header">
          <span>{notice}</span>
        </div>
      ) : null}

      {isLoading ? (
        <div className="edit-activity__members-empty">
          <Link2 size={40} strokeWidth={1.2} />
          <h3>Loading objectives...</h3>
          <p>Fetching objectives and existing activity links.</p>
        </div>
      ) : (
        <>
          <Card className="create-activity__section edit-activity__objective-card edit-activity__objective-card--corporate">
            <div className="create-activity__section-header">
              <div className="create-activity__section-header-inner">
                <span className="create-activity__section-header-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 6v6l4 2" />
                  </svg>
                </span>
                <div>
                  <span>Corporate Strategy Alignment</span>
                  <h2>DGE Corporate Strategy Pillar</h2>
                </div>
              </div>
            </div>

            <div className="create-activity__form-stack">
              <RadioGroup
                className="radio-group--corporate-strategy"
                disabled={isReadOnly}
                error={fieldErrors.corporateStrategyPillarId}
                label="Select the DGE Corporate Strategy Pillar this activity aligns to"
                name={`${uid}-dge-pillar`}
                onChange={(value) => {
                  applyFormChange((currentForm) => ({ ...currentForm, corporateStrategyPillarId: value }))
                }}
                options={corporatePillarOptions}
                required
                value={form.corporateStrategyPillarId}
              />
            </div>
          </Card>

          <Card className="create-activity__section edit-activity__objective-card edit-activity__objective-card--digital">
            <div className="create-activity__section-header">
              <div className="create-activity__section-header-inner">
                <span className="create-activity__section-header-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                </span>
                <div>
                  <span>Digital Transformation</span>
                  <h2>Digital Strategy Pillar</h2>
                </div>
              </div>
            </div>

            <div className="create-activity__form-stack">
              <RadioGroup
                className="radio-group--digital-pillar"
                disabled={isReadOnly}
                error={fieldErrors.digitalPillarId}
                label="Select the Digital Strategy Pillar this activity falls under"
                name={`${uid}-digital-pillar`}
                onChange={handleDigitalPillarChange}
                options={digitalPillarOptions}
                required
                value={form.digitalPillarId}
              />

              {form.digitalPillarId && digitalObjectiveOptions.length > 0 ? (
                <RadioGroup
                  className="radio-group--link-objective"
                  disabled={isReadOnly}
                  error={fieldErrors.digitalObjectiveId}
                  label="Link to Digital Strategy Objectives"
                  name={`${uid}-link-objective`}
                  onChange={(value) => {
                    applyFormChange((currentForm) => ({ ...currentForm, digitalObjectiveId: value }))
                  }}
                  options={digitalObjectiveOptions}
                  required
                  value={selectedDigitalObjectiveId}
                />
              ) : form.digitalPillarId ? (
                <div className="edit-activity__objective-empty" role="status">
                  <Link2 size={18} />
                  <div>
                    <strong>No digital strategy objectives found</strong>
                    <span>No objectives are currently mapped to the selected Digital Strategy Pillar.</span>
                  </div>
                </div>
              ) : null}

              {form.digitalPillarId && kpiOptions.length > 0 ? (
                <RadioGroup
                  className="radio-group--link-kpi"
                  disabled={isReadOnly}
                  error={fieldErrors.strategicKpiId}
                  label="Link to Strategic KPIs"
                  name={`${uid}-link-kpi`}
                  onChange={(value) => {
                    applyFormChange((currentForm) => ({ ...currentForm, strategicKpiId: value }))
                  }}
                  options={kpiOptions}
                  required
                  value={selectedStrategicKpiId}
                />
              ) : form.digitalPillarId ? (
                <div className="edit-activity__objective-empty" role="status">
                  <Link2 size={18} />
                  <div>
                    <strong>No strategic KPIs found</strong>
                    <span>No KPIs are currently mapped to the selected Digital Strategy Pillar.</span>
                  </div>
                </div>
              ) : null}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
