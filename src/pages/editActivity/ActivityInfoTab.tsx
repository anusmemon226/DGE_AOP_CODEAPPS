import { useCallback, useMemo, useState } from 'react'
import {
  Bot,
  Check,
  CheckCircle2,
  ClipboardList,
  FileText,
  Lightbulb,
  LockKeyhole,
} from 'lucide-react'
import {
  Card,
  Checkbox,
  DatePicker,
  Input,
  RadioGroup,
  Select,
  Textarea,
  type SelectOption,
} from '../../components/ui'
import {
  ACTIVITY_SCOPE_OPTIONS,
  ACTIVITY_TYPE_OPTIONS,
  CLASSIFICATION_OPTIONS,
  FIELD_LABELS,
  STRATEGY_OPTIONS,
  YES_NO_OPTIONS,
  type ActivityForm,
  type FieldErrors,
  type StrategyValue,
  getOptionLabel,
  getRequiredFields,
} from './helpers/activityInfoHelpers'
import { MembersTab } from './MembersTab'
import { DependenciesTab } from './DependenciesTab'

// ── Props ──

interface ActivityInfoTabProps {
  activityLeadOptions: SelectOption<string>[]
  editableFields?: Array<keyof ActivityForm>
  errors: FieldErrors
  form: ActivityForm
  isReadOnly?: boolean
  isAdeoVisible: boolean
  isBudgetNo: boolean
  isPaymentOnly: boolean
  isStrategic: boolean
  projectId: string
  updateForm: (fields: Partial<ActivityForm>) => void
}

// ── Strategy toggle helper ──

function toggleStrategy(
  strategy: StrategyValue,
  current: StrategyValue[],
  onChange: (strategies: StrategyValue[]) => void,
) {
  const next = current.includes(strategy)
    ? current.filter((item) => item !== strategy)
    : [...current, strategy]
  onChange(next)
}

// ── Component ──

export function ActivityInfoTab({
  activityLeadOptions,
  editableFields,
  errors,
  form,
  isReadOnly = false,
  isAdeoVisible,
  isBudgetNo,
  isPaymentOnly,
  isStrategic,
  projectId,
  updateForm,
}: ActivityInfoTabProps) {
  const [dependencyCount, setDependencyCount] = useState(0)
  const handleDependencyCountChange = useCallback((count: number) => {
    setDependencyCount(count)
  }, [])
  const canEditField = useCallback((field: keyof ActivityForm) => {
    if (!isReadOnly) return true
    return editableFields?.includes(field) ?? false
  }, [editableFields, isReadOnly])

  // ── Guidance Panel ──
  const guidancePanel = useMemo(() => {
    const requiredFields = getRequiredFields(form)
    const pendingFields = requiredFields.filter((field) => !String(form[field] ?? '').trim())
    const isDependencyRequired = form.adeoReported === '1'
    const isDependencyComplete = dependencyCount > 0
    const pendingDependencyCount = isDependencyRequired && !isDependencyComplete ? 1 : 0
    const total = requiredFields.length + (isDependencyRequired ? 1 : 0)
    const completedCount = total - pendingFields.length - pendingDependencyCount
    const percent = total > 0 ? Math.round((completedCount / total) * 100) : 0
    const isComplete = pendingFields.length === 0 && pendingDependencyCount === 0

    const FIELD_GROUPS: Array<{ key: string; label: string; fields: Array<keyof ActivityForm> }> = [
      { key: 'core', label: 'Core Details', fields: ['activityType', 'activityName', 'activityScope', 'activityClassification', 'adeoReported'] },
      { key: 'planning', label: 'Planning', fields: ['activityLeadId', 'plannedStartDate', 'plannedEndDate', 'scopeDescription', 'summary'] },
      { key: 'requirements', label: 'Requirements', fields: ['budgetRequired', 'procurementRequired'] },
      { key: 'adeo', label: 'ADEO Overview', fields: ['adeoProjectName', 'adeoProjectDescription', 'longTermImpact', 'overallLongTermImpact', 'stakeholder', 'activityKpi', 'risks'] },
    ]

    const visibleGroups = FIELD_GROUPS.filter((group) => {
      if (group.key === 'requirements' && form.activityClassification === '576610002') return false
      if (group.key === 'adeo' && form.adeoReported !== '1') return false
      return true
    })

    const ringRadius = 34
    const ringCircumference = 2 * Math.PI * ringRadius
    const ringOffset = ringCircumference - (percent / 100) * ringCircumference

    function countDone(fields: Array<keyof ActivityForm>) {
      return fields.filter((f) => String(form[f] ?? '').trim()).length
    }

    function getTipText() {
      if (isComplete) return 'All required fields are filled. Review your entries and save when ready.'
      const pendingItems = [
        ...pendingFields.map((field) => FIELD_LABELS[field] ?? field),
        ...(pendingDependencyCount ? ['Add at least one dependency'] : []),
      ]
      if (pendingItems.length <= 2) {
        const first = pendingItems[0]
        return `Start with "${first}" — it's the most impactful field to fill next.`
      }
      return `Complete the ${pendingItems.length} remaining required item${pendingItems.length > 1 ? 's' : ''} to proceed with saving.`
    }

    return (
      <aside className="create-activity__guidance">
        <div className="create-activity__guidance-card">
          <div className="create-activity__guidance-inner">
            <div className="create-activity__guidance-header">
              <span className="create-activity__guidance-header-icon">
                <Bot size={16} />
              </span>
              <div className="create-activity__guidance-header-text">
                <h3>Activity Assistant</h3>
                <span>Form completion guide</span>
              </div>
            </div>

            {/* Circular progress ring */}
            <div className="create-activity__guidance-progress-wrap">
              <div className="create-activity__guidance-ring">
                <svg width="96" height="96" viewBox="0 0 96 96">
                  <defs>
                    <linearGradient gradientUnits="userSpaceOnUse" id="ringFill" x1="0" x2="96" y1="0" y2="96">
                      <stop offset="0%" stopColor="var(--color-primary)" />
                      <stop offset="100%" stopColor="#06b6d4" />
                    </linearGradient>
                    <linearGradient gradientUnits="userSpaceOnUse" id="ringFillDark" x1="0" x2="96" y1="0" y2="96">
                      <stop offset="0%" stopColor="#818cf8" />
                      <stop offset="100%" stopColor="#22d3ee" />
                    </linearGradient>
                  </defs>
                  <circle cx="48" cy="48" r={ringRadius} fill="none" stroke="var(--color-surface-muted)" strokeWidth="8" />
                  <circle
                    cx="48"
                    cy="48"
                    r={ringRadius}
                    fill="none"
                    stroke="url(#ringFill)"
                    strokeWidth="8"
                    strokeDasharray={ringCircumference}
                    strokeDashoffset={ringOffset}
                    strokeLinecap="round"
                    transform="rotate(-90 48 48)"
                    style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.4, 0, 0.2, 1)' }}
                  />
                </svg>
                <span className="create-activity__guidance-ring-value">{percent}%</span>
              </div>
              <span className="create-activity__guidance-ring-stats">
                <strong>{completedCount}</strong> of <strong>{total}</strong> required
              </span>
            </div>

            {/* Field groups */}
            {visibleGroups.map((group) => {
              const groupDone = countDone(group.fields)
              const isGroupComplete = groupDone === group.fields.length

              return (
                <div className="create-activity__guidance-section" key={group.key}>
                  <div className="create-activity__guidance-section-header">
                    <div className="create-activity__guidance-section-header-text">
                      <span className="create-activity__guidance-section-header-indicator" />
                      <span>{group.label}</span>
                    </div>
                    <span className={`create-activity__guidance-section-count ${isGroupComplete ? 'create-activity__guidance-section-count--done' : ''}`}>
                      {isGroupComplete ? `✓ ${groupDone}/${group.fields.length}` : `${groupDone}/${group.fields.length}`}
                    </span>
                  </div>
                  <div className="create-activity__guidance-field-list">
                    {group.fields.map((field) => {
                      const isDone = String(form[field] ?? '').trim()
                      return (
                        <div className={`create-activity__guidance-field ${isDone ? 'create-activity__guidance-field--done' : 'create-activity__guidance-field--pending'}`} key={field}>
                          <span className="create-activity__guidance-field-icon">
                            {isDone ? <Check size={12} strokeWidth={2.5} /> : null}
                          </span>
                          <span>{FIELD_LABELS[field] ?? field}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {isDependencyRequired ? (
              <div className="create-activity__guidance-section">
                <div className="create-activity__guidance-section-header">
                  <div className="create-activity__guidance-section-header-text">
                    <span className="create-activity__guidance-section-header-indicator" />
                    <span>Dependencies</span>
                  </div>
                  <span className={`create-activity__guidance-section-count ${isDependencyComplete ? 'create-activity__guidance-section-count--done' : ''}`}>
                    {isDependencyComplete ? '✓ 1/1' : '0/1'}
                  </span>
                </div>
                <div className="create-activity__guidance-field-list">
                  <div className={`create-activity__guidance-field ${isDependencyComplete ? 'create-activity__guidance-field--done' : 'create-activity__guidance-field--pending'}`}>
                    <span className="create-activity__guidance-field-icon">
                      {isDependencyComplete ? <Check size={12} strokeWidth={2.5} /> : null}
                    </span>
                    <span>Add at least one dependency</span>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Quick overview tags */}
            <div className="create-activity__guidance-tags">
              {form.activityType ? (
                <span className="create-activity__guidance-tag">
                  <span className="create-activity__guidance-tag-label">Type: </span>
                  <span className="create-activity__guidance-tag-value">{getOptionLabel(ACTIVITY_TYPE_OPTIONS, form.activityType)}</span>
                </span>
              ) : null}
              {form.activityScope ? (
                <span className="create-activity__guidance-tag">
                  <span className="create-activity__guidance-tag-label">Scope: </span>
                  <span className="create-activity__guidance-tag-value">{getOptionLabel(ACTIVITY_SCOPE_OPTIONS, form.activityScope)}</span>
                </span>
              ) : null}
              {form.activityClassification ? (
                <span className="create-activity__guidance-tag">
                  <span className="create-activity__guidance-tag-label">Class: </span>
                  <span className="create-activity__guidance-tag-value">{getOptionLabel(CLASSIFICATION_OPTIONS, form.activityClassification)}</span>
                </span>
              ) : null}
              {form.adeoReported ? (
                <span className="create-activity__guidance-tag">
                  <span className="create-activity__guidance-tag-label">ADEO: </span>
                  <span className="create-activity__guidance-tag-value">{getOptionLabel(YES_NO_OPTIONS, form.adeoReported)}</span>
                </span>
              ) : null}
            </div>

            {/* Contextual tip */}
            <div className={`create-activity__guidance-tip ${isComplete ? 'create-activity__guidance-tip--complete' : 'create-activity__guidance-tip--pending'}`}>
              <span className="create-activity__guidance-tip-icon">
                {isComplete ? <CheckCircle2 size={14} /> : <Lightbulb size={14} />}
              </span>
              <p>{getTipText()}</p>
            </div>
          </div>
        </div>
      </aside>
    )
  }, [dependencyCount, form])

  // ── Form cards ──
  const formCards = useMemo(() => {
    if (errors.context) {
      return (
        <div className="edit-activity__placeholder" style={{ color: 'var(--color-error)' }}>
          {errors.context}
        </div>
      )
    }

    return (
      <>
        {/* Core Activity Information Card */}
        <Card className="create-activity__section">
          <div className="create-activity__section-header">
            <div className="create-activity__section-header-inner">
              <span className="create-activity__section-header-icon" aria-hidden="true">
                <ClipboardList size={18} />
              </span>
              <div>
                <span>Activity Information</span>
                <h2>Core planning details</h2>
              </div>
            </div>
          </div>

          <div className="create-activity__form-stack">
            <div className="create-activity__form-row create-activity__form-row--two">
              <Select
                disabled={!canEditField('activityType')}
                error={errors.activityType}
                id="activity-type"
                label="Activity Type"
                onChange={(value) => updateForm({ activityType: value })}
                options={ACTIVITY_TYPE_OPTIONS}
                required
                value={form.activityType}
              />
              <Input
                disabled={!canEditField('activityName')}
                error={errors.activityName}
                label="Activity / Initiative Name"
                onChange={(event) => updateForm({ activityName: event.target.value })}
                placeholder="Enter activity name"
                required
                value={form.activityName}
              />
            </div>

            <div className="create-activity__form-row create-activity__form-row--two">
              <Input disabled error={errors.sectorName} label="Sector" required rightIcon={<LockKeyhole size={15} />} value={form.sectorName} />
              <Input disabled error={errors.divisionName} label="Division" required rightIcon={<LockKeyhole size={15} />} value={form.divisionName} />
            </div>

            <div className="create-activity__form-row">
              <RadioGroup
                className="create-activity__radio create-activity__radio--scope"
                disabled={!canEditField('activityScope')}
                error={errors.activityScope}
                label="Activity Scope"
                name="activity-scope"
                onChange={(value) => updateForm({ activityScope: value })}
                options={ACTIVITY_SCOPE_OPTIONS.filter((option) => option.value !== '')}
                required
                value={form.activityScope}
              />
            </div>

            {isStrategic ? (
              <div className="create-activity__form-row">
                <fieldset className={`checkbox-group create-activity__strategy-group ${!canEditField('strategies') ? 'checkbox-group--disabled' : ''}`.trim()} disabled={!canEditField('strategies')}>
                  <legend className="field__label">What strategy is this project/activity categorized under?</legend>
                  <div className="checkbox-group__options">
                    {STRATEGY_OPTIONS.map((option) => (
                      <Checkbox
                        checked={form.strategies.includes(option.value)}
                        disabled={!canEditField('strategies')}
                        key={option.value}
                        label={option.label}
                        onChange={() => toggleStrategy(option.value, form.strategies, (s) => updateForm({ strategies: s }))}
                      />
                    ))}
                  </div>
                  {errors.strategies ? <span className="field__error">{errors.strategies}</span> : null}
                </fieldset>
              </div>
            ) : null}

            <div className="create-activity__form-row">
              <RadioGroup
                className="create-activity__radio create-activity__radio--classification"
                disabled={!canEditField('activityClassification')}
                error={errors.activityClassification}
                label="Activity Classification"
                name="activity-classification"
                onChange={(value) => updateForm({ activityClassification: value })}
                options={CLASSIFICATION_OPTIONS.filter((option) => option.value !== '')}
                required
                value={form.activityClassification}
              />
            </div>

            <div className="create-activity__form-row create-activity__form-row--three">
              {!isPaymentOnly ? (
                <RadioGroup
                  className="create-activity__radio create-activity__radio--yes-no"
                  disabled={!canEditField('budgetRequired')}
                  error={errors.budgetRequired}
                  label="Does this project require Budget?"
                  name="budget-required"
                  onChange={(value) => updateForm({ budgetRequired: value })}
                  options={YES_NO_OPTIONS.filter((option) => option.value !== '')}
                  required
                  value={form.budgetRequired}
                />
              ) : (
                <Input disabled hint="Payment Only activities are considered budget required." label="Budget Required" required rightIcon={<LockKeyhole size={15} />} value="Yes" />
              )}
              {isBudgetNo ? (
                <Input disabled hint="Procurement is automatically No when budget is not required." label="Does this project require procurement?" required rightIcon={<LockKeyhole size={15} />} value="No" />
              ) : (
                <RadioGroup
                  className="create-activity__radio create-activity__radio--yes-no"
                  disabled={!canEditField('procurementRequired')}
                  error={errors.procurementRequired}
                  label="Does this project require procurement?"
                  name="procurement-required"
                  onChange={(value) => updateForm({ procurementRequired: value })}
                  options={YES_NO_OPTIONS.filter((option) => option.value !== '')}
                  required
                  value={form.procurementRequired}
                />
              )}
              <RadioGroup
                className="create-activity__radio create-activity__radio--yes-no"
                disabled={!canEditField('adeoReported')}
                error={errors.adeoReported}
                label="Execution plan project reported in ADEO"
                name="adeo-reported"
                onChange={(value) => updateForm({ adeoReported: value })}
                options={YES_NO_OPTIONS.filter((option) => option.value !== '')}
                required
                value={form.adeoReported}
              />
            </div>

            <div className="create-activity__form-row">
              <Select
                disabled={!canEditField('activityLeadId')}
                error={errors.activityLeadId}
                id="activity-lead"
                label="Activity Lead / PM Name"
                onChange={(value) => updateForm({ activityLeadId: value })}
                options={activityLeadOptions.length > 0
                  ? [{ label: 'Select Activity Lead', value: '' }, ...activityLeadOptions]
                  : [{ label: 'No users available', value: '' }]}
                required
                value={form.activityLeadId || ''}
              />
            </div>

            <div className="create-activity__date-range" role="group" aria-label="Activity timeline">
              <DatePicker
                disabled={!canEditField('plannedStartDate')}
                error={errors.plannedStartDate}
                id="planned-start-date"
                label="Planned Start Date"
                onChange={(value) => updateForm({ plannedStartDate: value })}
                required
                value={form.plannedStartDate}
              />
              <span className="create-activity__date-connector" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 5l7 7-7 7"/>
                </svg>
              </span>
              <DatePicker
                disabled={!canEditField('plannedEndDate')}
                error={errors.plannedEndDate}
                id="planned-end-date"
                label="Planned End Date"
                min={form.plannedStartDate}
                onChange={(value) => updateForm({ plannedEndDate: value })}
                required
                value={form.plannedEndDate}
              />
            </div>

            <div className="create-activity__form-row create-activity__form-row--two">
              <Textarea
                disabled={!canEditField('scopeDescription')}
                error={errors.scopeDescription}
                label="Activity Scope Description"
                onChange={(event) => updateForm({ scopeDescription: event.target.value })}
                placeholder="Describe in-scope and out-of-scope boundaries"
                required
                value={form.scopeDescription}
              />
              <Textarea
                disabled={!canEditField('summary')}
                error={errors.summary}
                label="Summary"
                onChange={(event) => updateForm({ summary: event.target.value })}
                placeholder="Summarize the expected outcome"
                required
                value={form.summary}
              />
            </div>
          </div>
        </Card>

        {/* ADEO Card */}
        {isAdeoVisible ? (
          <Card className="create-activity__section">
            <div className="create-activity__section-header">
              <div className="create-activity__section-header-inner">
                <span className="create-activity__section-header-icon" aria-hidden="true">
                  <FileText size={18} />
                </span>
                <div>
                  <span>ADEO Activity Overview</span>
                  <h2>Execution plan reporting details</h2>
                </div>
              </div>
            </div>
            <div className="create-activity__form-stack">
              <div className="create-activity__form-row create-activity__form-row--two">
                <Input
                  disabled={!canEditField('adeoProjectName')}
                  error={errors.adeoProjectName}
                  label="اسم المشروع"
                  onChange={(event) => updateForm({ adeoProjectName: event.target.value })}
                  placeholder="أدخل اسم المشروع"
                  required
                  value={form.adeoProjectName}
                />
                <Input
                  disabled={!canEditField('adeoProjectDescription')}
                  error={errors.adeoProjectDescription}
                  label="وصف المشروع"
                  onChange={(event) => updateForm({ adeoProjectDescription: event.target.value })}
                  placeholder="أدخل وصفاً مختصراً للمشروع"
                  required
                  value={form.adeoProjectDescription}
                />
              </div>

              <div className="create-activity__form-row create-activity__form-row--two">
                <Textarea
                  disabled={!canEditField('longTermImpact')}
                  error={errors.longTermImpact}
                  label="Long Term Impact"
                  onChange={(event) => updateForm({ longTermImpact: event.target.value })}
                  placeholder="Describe the expected long-term impact of this activity"
                  required
                  value={form.longTermImpact}
                />
                <Textarea
                  disabled={!canEditField('overallLongTermImpact')}
                  error={errors.overallLongTermImpact}
                  label="طويلة المدى / اهداف المشروع العامة"
                  onChange={(event) => updateForm({ overallLongTermImpact: event.target.value })}
                  placeholder="اكتب الأهداف العامة طويلة المدى للمشروع"
                  required
                  value={form.overallLongTermImpact}
                />
              </div>

              <div className="create-activity__form-row create-activity__form-row--two">
                <Input
                  disabled={!canEditField('stakeholder')}
                  error={errors.stakeholder}
                  label="Stakeholder"
                  onChange={(event) => updateForm({ stakeholder: event.target.value })}
                  placeholder="Enter the primary stakeholder or entity"
                  required
                  value={form.stakeholder}
                />
                <Input
                  disabled={!canEditField('activityKpi')}
                  error={errors.activityKpi}
                  label="Activity KPI"
                  onChange={(event) => updateForm({ activityKpi: event.target.value })}
                  placeholder="Enter the KPI used to measure success"
                  required
                  value={form.activityKpi}
                />
              </div>

              <div className="create-activity__form-row create-activity__form-row--two">
                <Input
                  disabled={!canEditField('activityPlan')}
                  label="Activity Plan (If any)"
                  onChange={(event) => updateForm({ activityPlan: event.target.value })}
                  placeholder="Enter the activity plan reference, if available"
                  value={form.activityPlan}
                />
                <Textarea
                  disabled={!canEditField('risks')}
                  error={errors.risks}
                  label="Risks"
                  onChange={(event) => updateForm({ risks: event.target.value })}
                  placeholder="Describe key risks, dependencies, or mitigation needs"
                  required
                  value={form.risks}
                />
              </div>
            </div>
          </Card>
        ) : null}

        <MembersTab embedded isReadOnly={isReadOnly} projectId={projectId} />
        {isAdeoVisible ? (
          <DependenciesTab embedded isReadOnly={isReadOnly} onDependencyCountChange={handleDependencyCountChange} projectId={projectId} />
        ) : null}
      </>
    )
  }, [
    form,
    errors,
    updateForm,
    activityLeadOptions,
    isStrategic,
    isPaymentOnly,
    isBudgetNo,
    isAdeoVisible,
    projectId,
    isReadOnly,
    canEditField,
    handleDependencyCountChange,
  ])

  return (
    <div className="create-activity__manual-layout">
      <div className="create-activity__manual-form">
        {formCards}
      </div>
      {guidancePanel}
    </div>
  )
}
