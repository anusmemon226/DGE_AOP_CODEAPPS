import { useCallback, useEffect, useId, useMemo, useState, type ReactNode } from 'react'
import { GitBranch, Link2, Target } from 'lucide-react'
import { Card, RadioGroup } from '../../components/ui'
import type { Dga_aop_projectsesBase } from '../../generated/models/Dga_aop_projectsesModel'
import type { Dga_objective_dga_objectiveset } from '../../generated/models/Dga_objective_dga_objectivesetModel'
import type { Dga_objectives } from '../../generated/models/Dga_objectivesModel'
import { Dga_aop_projectsesService } from '../../generated/services/Dga_aop_projectsesService'
import { Dga_objective_dga_objectivesetService } from '../../generated/services/Dga_objective_dga_objectivesetService'
import { Dga_objectivesService } from '../../generated/services/Dga_objectivesService'
import { AiSummaryPanel } from './AiSummaryPanel'
import type { AiSummaryBlocks, AiSummaryMeta } from './types/aiSummaryTypes'
import type { EditActivityOperationNotifier } from './types/operationAlert'

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
  isEditing?: boolean
  isReadOnly?: boolean
  onActivityDataChanged?: () => void
  onHeaderActionChange?: (action: ObjectiveHeaderAction | null) => void
  onOperationAlert?: EditActivityOperationNotifier
  projectId: string
  statusCode?: number
}

export type ObjectiveHeaderAction = {
  canSave: boolean
  discardChanges?: () => void
  hasUnsavedChanges?: boolean
  label: string
  onSave: () => Promise<boolean> | boolean
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

function getOptionById(options: readonly ObjectiveOption[], id: string) {
  const normalizedId = normalizeId(id)
  if (!normalizedId) return undefined
  return options.find((option) => normalizeId(option.value) === normalizedId)
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
  isEditing = false,
  isReadOnly = false,
  onActivityDataChanged,
  onHeaderActionChange,
  onOperationAlert,
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
  const hasUnsavedChanges = !isSameForm(form, savedForm)
  const canEditObjectives = !isReadOnly && !isLoading && !isSaving && !error
  const canSave = isEditing && canEditObjectives
  const saveLabel = statusCode === 1 ? 'Save Draft' : 'Save Changes'

  const saveObjectives = useCallback(async (nextForm: ObjectiveForm, successMessage = 'Objectives saved successfully.') => {
    if (isReadOnly) return false
    if (!projectId || isSaving) return false

    setIsSaving(true)
    setError('')

    try {
      const result = await Dga_aop_projectsesService.update(projectId, buildProjectPayload(nextForm))
      assertOperationSuccess(result, 'Unable to save objective links.')
      setSavedForm(nextForm)
      onOperationAlert?.({ kind: 'success', message: successMessage, title: 'Objectives saved' })
      onActivityDataChanged?.()
      return true
    } catch (saveError) {
      onOperationAlert?.({
        kind: 'error',
        message: saveError instanceof Error ? saveError.message : 'Unable to save objective links.',
        title: 'Objectives were not saved',
      })
      return false
    } finally {
      setIsSaving(false)
    }
  }, [isReadOnly, isSaving, onActivityDataChanged, onOperationAlert, projectId])

  const applyFormChange = useCallback((updater: (currentForm: ObjectiveForm) => ObjectiveForm) => {
    if (!isEditing || isReadOnly) return
    setForm((currentForm) => {
      const nextForm = updater(currentForm)
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
  }, [isEditing, isReadOnly])

  const handleSave = useCallback(async () => {
    if (!canSave) return false

    const nextErrors = validateObjectiveForm(form)
    if (form.digitalPillarId && !selectedDigitalObjectiveId) {
      nextErrors.digitalObjectiveId = 'Select a Digital Strategy objective mapped to the selected Digital Strategy Pillar.'
    }
    if (form.digitalPillarId && !selectedStrategicKpiId) {
      nextErrors.strategicKpiId = 'Select a strategic KPI mapped to the selected Digital Strategy Pillar.'
    }
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      return false
    }

    if (!hasUnsavedChanges) {
      onOperationAlert?.({ kind: 'success', message: 'No objective changes to save.', title: 'Objectives already current' })
      return true
    }

    return saveObjectives(form)
  }, [canSave, form, hasUnsavedChanges, onOperationAlert, saveObjectives, selectedDigitalObjectiveId, selectedStrategicKpiId])

  useEffect(() => {
    onHeaderActionChange?.(!isLoading && canEditObjectives ? {
      canSave,
      discardChanges: () => {
        setForm(savedForm)
        setFieldErrors({})
      },
      hasUnsavedChanges,
      isSaving,
      label: saveLabel,
      onSave: handleSave,
      savingLabel: 'Saving...',
    } : !isLoading ? {
      canSave: false,
      hasUnsavedChanges,
      isSaving,
      label: saveLabel,
      onSave: handleSave,
      savingLabel: 'Saving...',
    } : null)
  }, [canEditObjectives, canSave, handleSave, hasUnsavedChanges, isLoading, isSaving, onHeaderActionChange, saveLabel, savedForm])

  useEffect(() => {
    return () => onHeaderActionChange?.(null)
  }, [onHeaderActionChange])

  useEffect(() => {
    if (isReadOnly) {
      const timeoutId = window.setTimeout(() => {
        setForm(savedForm)
        setFieldErrors({})
      }, 0)

      return () => window.clearTimeout(timeoutId)
    }
  }, [isReadOnly, savedForm])

  function handleDigitalPillarChange(value: string) {
    applyFormChange((currentForm) => ({
      ...currentForm,
      digitalPillarId: value,
      digitalObjectiveId: '',
      strategicKpiId: '',
    }))
  }

  const selectedCorporatePillar = getOptionById(corporatePillarOptions, form.corporateStrategyPillarId)
  const selectedDigitalPillar = getOptionById(digitalPillarOptions, form.digitalPillarId)
  const selectedDigitalObjective = getOptionById(allDigitalObjectiveOptions, form.digitalObjectiveId)
  const selectedStrategicKpi = getOptionById(allKpiOptions, form.strategicKpiId)

  function renderReadOnlyValue(label: string, option?: ObjectiveOption, marker?: string) {
    return (
      <div className={`edit-activity__objective-readonly-item${option ? '' : ' edit-activity__objective-readonly-item--empty'}`}>
        {marker ? <span className="edit-activity__objective-readonly-marker" aria-hidden="true">{marker}</span> : null}
        <div>
          <dt>{label}</dt>
          <dd>{option?.label || 'Not selected'}</dd>
          {option?.description ? <p>{option.description}</p> : null}
        </div>
      </div>
    )
  }

  function renderObjectiveSelectionCard(
    title: string,
    description: string,
    children: ReactNode,
    icon: ReactNode,
  ) {
    return (
      <Card className="create-activity__section edit-activity__objective-card edit-activity__objective-card--guided">
        <div className="create-activity__section-header">
          <div className="create-activity__section-header-inner">
            <span className="create-activity__section-header-icon" aria-hidden="true">
              {icon}
            </span>
            <div>
              <h2>{title}</h2>
              <p>{description}</p>
            </div>
          </div>
        </div>
        <div className="create-activity__form-stack">
          {children}
        </div>
      </Card>
    )
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
          <h2>Objectives</h2>
          <p>Review and manage the strategic alignment for this activity.</p>
        </div>
      </div>

      {error ? (
        <div className="edit-activity__members-modal-error">{error}</div>
      ) : null}

      {isLoading ? (
        <div className="edit-activity__members-empty">
          <Link2 size={40} strokeWidth={1.2} />
          <h3>Loading objectives...</h3>
          <p>Fetching objectives and existing activity links.</p>
        </div>
      ) : !isEditing ? (
        <div className="edit-activity__objectives-readonly-grid">
          <Card className="create-activity__section edit-activity__objective-card edit-activity__objective-card--readonly">
            <div className="create-activity__section-header">
              <div className="create-activity__section-header-inner">
                <span className="create-activity__section-header-icon" aria-hidden="true">
                  <Target size={17} />
                </span>
                <div>
                  <h2>DGE Corporate Strategy Pillar</h2>
                  <p>Primary corporate strategy alignment for this activity.</p>
                </div>
              </div>
            </div>
            <dl className="edit-activity__objectives-readonly-list">
              {renderReadOnlyValue('Corporate Strategy Pillar', selectedCorporatePillar)}
            </dl>
          </Card>

          <Card className="create-activity__section edit-activity__objective-card edit-activity__objective-card--readonly">
            <div className="create-activity__section-header">
              <div className="create-activity__section-header-inner">
                <span className="create-activity__section-header-icon" aria-hidden="true">
                  <GitBranch size={17} />
                </span>
                <div>
                  <h2>Digital Strategy Alignment</h2>
                  <p>Hierarchy path from digital pillar through objective and KPI.</p>
                </div>
              </div>
            </div>
            <dl className="edit-activity__objectives-readonly-list edit-activity__objectives-readonly-list--trail">
              {renderReadOnlyValue('Digital Strategy Pillar', selectedDigitalPillar, '1')}
              {renderReadOnlyValue('Digital Strategy Objective', selectedDigitalObjective, '2')}
              {renderReadOnlyValue('Strategic KPI', selectedStrategicKpi, '3')}
            </dl>
          </Card>
        </div>
      ) : (
        <>
          <div className="edit-activity__objectives-edit-grid">
            {renderObjectiveSelectionCard(
              'DGE Corporate Strategy Pillar',
              'Select the corporate strategy pillar this activity supports.',
              <RadioGroup
                className="radio-group--corporate-strategy"
                disabled={!isEditing || isReadOnly}
                error={fieldErrors.corporateStrategyPillarId}
                label="Select the DGE Corporate Strategy Pillar this activity aligns to"
                name={`${uid}-dge-pillar`}
                onChange={(value) => {
                  applyFormChange((currentForm) => ({ ...currentForm, corporateStrategyPillarId: value }))
                }}
                options={corporatePillarOptions}
                required
                value={form.corporateStrategyPillarId}
              />,
              <Target size={17} />,
            )}

            {renderObjectiveSelectionCard(
              'Digital Strategy Pillar',
              'Choose the digital strategy pillar that drives downstream objectives and KPIs.',
              <RadioGroup
                className="radio-group--digital-pillar"
                disabled={!isEditing || isReadOnly}
                error={fieldErrors.digitalPillarId}
                label="Select the Digital Strategy Pillar this activity falls under"
                name={`${uid}-digital-pillar`}
                onChange={handleDigitalPillarChange}
                options={digitalPillarOptions}
                required
                value={form.digitalPillarId}
              />,
              <GitBranch size={17} />,
            )}

            {renderObjectiveSelectionCard(
              'Digital Strategy Objective',
              'Select the objective mapped to the selected Digital Strategy Pillar.',
              form.digitalPillarId && digitalObjectiveOptions.length > 0 ? (
                <RadioGroup
                  className="radio-group--link-objective"
                  disabled={!isEditing || isReadOnly}
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
              ) : (
                <div className="edit-activity__objective-empty" role="status">
                  <Link2 size={18} />
                  <div>
                    <strong>Select a Digital Strategy Pillar first</strong>
                    <span>Digital objectives will appear after a pillar is selected.</span>
                  </div>
                </div>
              ),
              <Link2 size={17} />,
            )}

            {renderObjectiveSelectionCard(
              'Strategic KPI',
              'Select the KPI mapped to the selected Digital Strategy Pillar.',
              form.digitalPillarId && kpiOptions.length > 0 ? (
                <RadioGroup
                  className="radio-group--link-kpi"
                  disabled={!isEditing || isReadOnly}
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
              ) : (
                <div className="edit-activity__objective-empty" role="status">
                  <Link2 size={18} />
                  <div>
                    <strong>Select a Digital Strategy Pillar first</strong>
                    <span>Strategic KPIs will appear after a pillar is selected.</span>
                  </div>
                </div>
              ),
              <Target size={17} />,
            )}
          </div>
        </>
      )}
    </div>
  )
}
