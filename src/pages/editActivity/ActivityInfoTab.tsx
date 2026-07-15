import { useCallback, useMemo, useState, type ReactNode } from 'react'
import {
  Bot,
  Check,
  CheckCircle2,
  ClipboardList,
  FileText,
  Lightbulb,
} from 'lucide-react'
import {
  Card,
  Checkbox,
  DatePicker,
  Input,
  RadioGroup,
  Select,
  Textarea,
  Tooltip,
  TooltipProvider,
  type SelectOption,
} from '../../components/ui'
import {
  ACTIVITY_SCOPE_OPTIONS,
  ACTIVITY_TYPE_OPTIONS,
  CLASSIFICATION_OPTIONS,
  EXECUTION_ACTIVITY_STATUS_OPTIONS,
  EXECUTION_ACTIVITY_STATUS_REQUIRES_JUSTIFICATION,
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
import { AiSummaryPanel } from './AiSummaryPanel'
import type { AiSummaryBlocks, AiSummaryMeta } from './types/aiSummaryTypes'
import type { EditActivityOperationNotifier } from './types/operationAlert'
import { formatDateDisplay } from '../../utils/formatting'

// ── Props ──

interface ActivityInfoTabProps {
  activityLeadOptions: SelectOption<string>[]
  aiSummaryBlocks?: AiSummaryBlocks
  aiSummaryError?: string
  aiSummaryMeta?: AiSummaryMeta
  editableFields?: Array<keyof ActivityForm>
  errors: FieldErrors
  form: ActivityForm
  hasFullEdit?: boolean
  isAiSummaryLoading?: boolean
  isEditing?: boolean
  isExecutionPhase?: boolean
  showExecutionTracking?: boolean
  isReadOnly?: boolean
  isAdeoVisible: boolean
  isBudgetNo: boolean
  isPaymentOnly: boolean
  isStrategic: boolean
  onActivityDataChanged?: () => void
  onOperationAlert?: EditActivityOperationNotifier
  projectId: string
  updateForm: (fields: Partial<ActivityForm>) => void
}

// ── Strategy toggle helper ──

const EDIT_ACTIVITY_TOOLTIPS = {
  activityType: <><p>Select the activity type from the below options:</p><ul><li><strong>New Project:</strong> Started in 2026</li><li><strong>Ongoing Project:</strong> Started before 2026</li><li><strong>Contract:</strong> Contract-based or payment-related item</li><li><strong>Internal Operations:</strong> Activity related to internal departmental operations</li></ul></>,
  activityName: <>Input the name of the project/activity.</>,
  activityScope: <><p>Select the project type from the below options:</p><ul><li><strong>Strategic:</strong> The project is derived from the Abu Dhabi Digital Strategy</li><li><strong>Operational:</strong> The project is operational in nature</li></ul></>,
  strategies: <>Select the strategy under which this project is categorized. You can select multiple options.</>,
  activityClassification: <><p>Select the activity classification from the below options:</p><ul><li><strong>EPM Registered Project:</strong> Project that is or will be registered in the EPM system</li><li><strong>Operational Activity:</strong> Operational activity with defined deliverables and outcomes</li><li><strong>Payment Only:</strong> Non-project item related to contracts or payments</li></ul></>,
  budgetRequired: <>This project will require budget.</>,
  paymentOnlyWarning: <>Payment Only activities are considered budget required.</>,
  procurementRequired: <>This project will require procurement, either through a new tender, contract renewal, etc.</>,
  budgetNoWarning: <>Procurement is automatically No when budget is not required.</>,
  adeoReported: <>This project is or will be included with the DGE Execution Plan and reported to ADEO.</>,
  activityLead: <>Input the name of the Project Manager/Activity Lead that will be responsible for inputting this activity&apos;s progress.</>,
  plannedStartDate: <>Input the planned start date of the project or activity.</>,
  plannedEndDate: <>Input the planned end date of the project or activity.</>,
  scope: <>Input a detailed description of what will be covered in the scope of this project or activity.</>,
  summary: <>Input a detailed summary of the project mentioning the objective, high-level scope statement, and the expected value or benefit from completion of this project or activity.</>,
} as const

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

function renderReadOnlyValue(value?: string | null) {
  const text = String(value ?? '').trim()
  return text || '—'
}

type ReadOnlyDetailKind = 'default' | 'identity' | 'organization' | 'classification' | 'requirement' | 'date' | 'person' | 'narrative'

function renderReadOnlyDetails(items: Array<{
  label: string
  value?: string | null
  type?: 'date' | 'long'
  kind?: ReadOnlyDetailKind
  span?: 'wide' | 'featured'
  columns?: 3 | 4 | 6 | 9 | 12
}>, columns: 2 | 3 = 3) {
  return (
    <dl className={`create-activity__readonly-grid create-activity__readonly-grid--${columns}`}>
      {items.map((item) => {
        const kind = item.kind ?? (item.type === 'date' ? 'date' : item.type === 'long' ? 'narrative' : 'default')
        const displayValue = item.type === 'date'
          ? renderReadOnlyValue(formatDateDisplay(item.value ?? ''))
          : renderReadOnlyValue(item.value)
        const isBooleanValue = kind === 'requirement' && (displayValue === 'Yes' || displayValue === 'No')
        const spanClass = item.type === 'long' || item.span === 'wide'
          ? 'create-activity__readonly-item--wide'
          : item.span === 'featured'
            ? 'create-activity__readonly-item--featured'
            : ''
        const columnClass = item.columns ? `create-activity__readonly-item--span-${item.columns}` : ''

        return (
          <div
            className={`create-activity__readonly-item create-activity__readonly-item--${kind} ${spanClass} ${columnClass}`.trim()}
            key={item.label}
          >
            <div className="create-activity__readonly-item-content">
              <dt>{item.label}</dt>
              <dd>
                {isBooleanValue ? (
                  <span className={`create-activity__readonly-value-pill create-activity__readonly-value-pill--${displayValue.toLowerCase()}`}>
                    {displayValue}
                  </span>
                ) : displayValue}
              </dd>
            </div>
          </div>
        )
      })}
    </dl>
  )
}

export function ActivityInfoTab({
  activityLeadOptions,
  aiSummaryBlocks,
  aiSummaryError,
  aiSummaryMeta,
  editableFields,
  errors,
  form,
  hasFullEdit = false,
  isAiSummaryLoading = false,
  isEditing = false,
  isExecutionPhase = false,
  showExecutionTracking = false,
  isReadOnly = false,
  isAdeoVisible,
  isBudgetNo,
  isPaymentOnly,
  isStrategic,
  onActivityDataChanged,
  onOperationAlert,
  projectId,
  updateForm,
}: ActivityInfoTabProps) {
  const [dependencyCount, setDependencyCount] = useState(0)
  const handleDependencyCountChange = useCallback((count: number) => {
    setDependencyCount(count)
  }, [])
  const canEditField = useCallback((field: keyof ActivityForm) => {
    if (!isEditing) return false
    if (hasFullEdit) return true
    if (editableFields?.length) {
      return editableFields.includes(field)
    }
    return !isReadOnly
  }, [editableFields, hasFullEdit, isEditing, isReadOnly])
  const requiresActivityStatusJustification = Boolean(
    form.activityStatus && EXECUTION_ACTIVITY_STATUS_REQUIRES_JUSTIFICATION.has(form.activityStatus),
  )
  const showPlanningReadOnlyView = !isEditing || isExecutionPhase
  const executionActivityStatusOptions = useMemo(() => (
    EXECUTION_ACTIVITY_STATUS_OPTIONS.map((option) => ({
      ...option,
      disabled: showExecutionTracking && option.value === '776140007',
    }))
  ), [showExecutionTracking])


  // ── Guidance Panel ──
  const guidancePanel = useMemo(() => {
    const requiredFields = getRequiredFields(form, showExecutionTracking)
    const pendingFields = requiredFields.filter((field) => !String(form[field] ?? '').trim())
    const isDependencyRequired = form.adeoReported === '1'
    const isDependencyComplete = dependencyCount > 0
    const pendingDependencyCount = isDependencyRequired && !isDependencyComplete ? 1 : 0
    const total = requiredFields.length + (isDependencyRequired ? 1 : 0)
    const completedCount = total - pendingFields.length - pendingDependencyCount
    const percent = total > 0 ? Math.round((completedCount / total) * 100) : 0
    const isComplete = pendingFields.length === 0 && pendingDependencyCount === 0

    const FIELD_GROUPS: Array<{ key: string; label: string; fields: Array<keyof ActivityForm> }> = [
      { key: 'execution', label: 'Execution Status', fields: requiresActivityStatusJustification ? ['activityStatus', 'activityStatusJustification'] : ['activityStatus'] },
      { key: 'core', label: 'Core Details', fields: ['activityType', 'activityName', 'activityScope', 'activityClassification', 'adeoReported'] },
      { key: 'planning', label: 'Planning', fields: ['activityLeadId', 'plannedStartDate', 'plannedEndDate', 'scopeDescription', 'summary'] },
      { key: 'requirements', label: 'Requirements', fields: ['budgetRequired', 'procurementRequired'] },
      { key: 'adeo', label: 'ADEO Overview', fields: ['adeoProjectName', 'adeoProjectDescription', 'longTermImpact', 'overallLongTermImpact', 'stakeholder', 'activityKpi', 'risks'] },
    ]

    const visibleGroups = FIELD_GROUPS.filter((group) => {
      if (group.key === 'requirements' && form.activityClassification === '576610002') return false
      if (group.key === 'adeo' && form.adeoReported !== '1') return false
      if (group.key === 'execution' && !showExecutionTracking) return false
      return true
    })

    const ringRadius = 34
    const ringCircumference = 2 * Math.PI * ringRadius
    const ringOffset = ringCircumference - (percent / 100) * ringCircumference

    function countDone(fields: Array<keyof ActivityForm>) {
      return fields.filter((field) => {
        if (field === 'activityStatusJustification' && !requiresActivityStatusJustification) {
          return true
        }
        return String(form[field] ?? '').trim()
      }).length
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
  }, [dependencyCount, form, requiresActivityStatusJustification, showExecutionTracking])

  // ── Form cards ──
  const formCards = useMemo(() => {
    if (errors.context) {
      return (
        <div className="edit-activity__placeholder" style={{ color: 'var(--color-error)' }}>
          {errors.context}
        </div>
      )
    }

    const renderActivityInfoCard = (
      icon: ReactNode,
      title: string,
      description: string,
      children: ReactNode,
    ) => (
      <Card className="create-activity__section edit-activity__activity-info-card">
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
        {children}
      </Card>
    )

    const readOnlyPanel = (
      items: Parameters<typeof renderReadOnlyDetails>[0],
      columns: 2 | 3 = 2,
    ) => (
      <div className="create-activity__readonly-panel edit-activity__activity-info-readonly">
        {renderReadOnlyDetails(items, columns)}
      </div>
    )

    return (
      <>
        <div className="edit-activity__activity-info-card-grid">
          {showExecutionTracking ? renderActivityInfoCard(
            <CheckCircle2 size={18} />,
            'Execution Tracking',
            'Update the current activity status and required execution justification.',
            !isEditing ? readOnlyPanel([
              { label: 'Activity Status', value: getOptionLabel(EXECUTION_ACTIVITY_STATUS_OPTIONS, form.activityStatus), kind: 'requirement', columns: 6 },
              ...(requiresActivityStatusJustification
                ? [{ label: 'Justification for Activity Status', value: form.activityStatusJustification, type: 'long' as const, kind: 'narrative' as const, columns: 6 as const }]
                : []),
            ], 3) : <div className="create-activity__form-stack">
              <div className="create-activity__form-row">
                <RadioGroup
                  className="create-activity__radio create-activity__radio--status"
                  disabled={!canEditField('activityStatus')}
                  error={errors.activityStatus}
                  label="Activity Status"
                  name="activity-status"
                  onChange={(value) => updateForm({ activityStatus: value as ActivityForm['activityStatus'] })}
                  options={executionActivityStatusOptions}
                  required
                  value={form.activityStatus}
                />
              </div>

              {requiresActivityStatusJustification ? (
                <div className="create-activity__form-row">
                  <Textarea
                    disabled={!canEditField('activityStatusJustification')}
                    error={errors.activityStatusJustification}
                    label="Justification for Activity Status"
                    onChange={(event) => updateForm({ activityStatusJustification: event.target.value })}
                    placeholder="Explain why the activity is delayed, on hold, or cancelled"
                    required
                    value={form.activityStatusJustification}
                  />
                </div>
              ) : null}
            </div>,
          ) : null}

          {renderActivityInfoCard(
            <ClipboardList size={18} />,
            'Overview',
            'Review the activity identity, organizational context, and strategic alignment.',
            showPlanningReadOnlyView ? readOnlyPanel([
              { label: 'Activity Type', value: getOptionLabel(ACTIVITY_TYPE_OPTIONS, form.activityType), kind: 'identity', columns: 6 },
              { label: 'Activity / Initiative Name', value: form.activityName, kind: 'identity', columns: 6 },
              { label: 'Activity Scope', value: getOptionLabel(ACTIVITY_SCOPE_OPTIONS, form.activityScope), kind: 'classification', columns: 6 },
              ...(isStrategic
                ? [{ label: 'Categorized Strategy', value: form.strategies.map((strategy) => getOptionLabel(STRATEGY_OPTIONS, strategy)).filter(Boolean).join(', '), kind: 'classification' as const, columns: 6 as const }]
                : []),
            ], 3) : (
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
                    tooltip={EDIT_ACTIVITY_TOOLTIPS.activityType}
                    value={form.activityType}
                  />
                  <Input
                    disabled={!canEditField('activityName')}
                    error={errors.activityName}
                    label="Activity / Initiative Name"
                    onChange={(event) => updateForm({ activityName: event.target.value })}
                    placeholder="Enter activity name"
                    required
                    tooltip={EDIT_ACTIVITY_TOOLTIPS.activityName}
                    value={form.activityName}
                  />
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
                    tooltip={EDIT_ACTIVITY_TOOLTIPS.activityScope}
                    value={form.activityScope}
                  />
                </div>

                {isStrategic ? (
                  <div className="create-activity__form-row">
                    <fieldset className={`checkbox-group create-activity__strategy-group ${!canEditField('strategies') ? 'checkbox-group--disabled' : ''}`.trim()} disabled={!canEditField('strategies')}>
                      <legend className="field__label field__label--with-tooltip">
                        What strategy is this project/activity categorized under?
                        <Tooltip content={EDIT_ACTIVITY_TOOLTIPS.strategies} label="More information about strategy categorization" />
                      </legend>
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
              </div>
            ),
          )}

          {renderActivityInfoCard(
            <FileText size={18} />,
            'Activity Details',
            'Confirm classification, requirements, ownership, scope, and summary.',
            showPlanningReadOnlyView ? readOnlyPanel([
              { label: 'Activity Classification', value: getOptionLabel(CLASSIFICATION_OPTIONS, form.activityClassification), kind: 'classification', columns: 6 },
              { label: 'Budget Required', value: isPaymentOnly ? 'Yes' : getOptionLabel(YES_NO_OPTIONS, form.budgetRequired), kind: 'requirement', columns: 6 },
              { label: 'Procurement Required', value: isBudgetNo ? 'No' : getOptionLabel(YES_NO_OPTIONS, form.procurementRequired), kind: 'requirement', columns: 6 },
              { label: 'Execution plan project reported in ADEO', value: getOptionLabel(YES_NO_OPTIONS, form.adeoReported), kind: 'requirement', columns: 6 },
              { label: 'Activity Lead / PM Name', value: activityLeadOptions.find((option) => option.value === form.activityLeadId)?.label ?? form.activityLeadId, kind: 'person', columns: 6 },
              { label: 'Scope', value: form.scopeDescription, type: 'long', kind: 'narrative', columns: 6 },
              { label: 'Summary', value: form.summary, type: 'long', kind: 'narrative', columns: 6 },
            ], 3) : (
              <div className="create-activity__form-stack">
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
                    tooltip={EDIT_ACTIVITY_TOOLTIPS.activityClassification}
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
                      tooltip={EDIT_ACTIVITY_TOOLTIPS.budgetRequired}
                      value={form.budgetRequired}
                    />
                  ) : (
                    <RadioGroup
                      className="create-activity__radio create-activity__radio--yes-no"
                      disabled
                      label="Does this project require Budget?"
                      name="budget-required"
                      onChange={() => undefined}
                      options={YES_NO_OPTIONS.filter((option) => option.value !== '')}
                      required
                      tooltip={EDIT_ACTIVITY_TOOLTIPS.paymentOnlyWarning}
                      tooltipTone="warning"
                      value="1"
                    />
                  )}
                  {isBudgetNo ? (
                    <RadioGroup
                      className="create-activity__radio create-activity__radio--yes-no"
                      disabled
                      label="Does this project require procurement?"
                      name="procurement-required"
                      onChange={() => undefined}
                      options={YES_NO_OPTIONS.filter((option) => option.value !== '')}
                      required
                      tooltip={EDIT_ACTIVITY_TOOLTIPS.budgetNoWarning}
                      tooltipTone="warning"
                      value="0"
                    />
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
                      tooltip={EDIT_ACTIVITY_TOOLTIPS.procurementRequired}
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
                    tooltip={EDIT_ACTIVITY_TOOLTIPS.adeoReported}
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
                    tooltip={EDIT_ACTIVITY_TOOLTIPS.activityLead}
                    value={form.activityLeadId || ''}
                  />
                </div>

                <div className="create-activity__form-row create-activity__form-row--two">
                  <Textarea
                    disabled={!canEditField('scopeDescription')}
                    error={errors.scopeDescription}
                    label="Scope"
                    onChange={(event) => updateForm({ scopeDescription: event.target.value })}
                    placeholder="Describe in-scope and out-of-scope boundaries"
                    required
                    tooltip={EDIT_ACTIVITY_TOOLTIPS.scope}
                    value={form.scopeDescription}
                  />
                  <Textarea
                    disabled={!canEditField('summary')}
                    error={errors.summary}
                    label="Summary"
                    onChange={(event) => updateForm({ summary: event.target.value })}
                    placeholder="Summarize the expected outcome"
                    required
                    tooltip={EDIT_ACTIVITY_TOOLTIPS.summary}
                    value={form.summary}
                  />
                </div>
              </div>
            ),
          )}

          {renderActivityInfoCard(
            <ClipboardList size={18} />,
            'Activity Timeline',
            'Review the planned start and end dates for the activity.',
            showPlanningReadOnlyView ? readOnlyPanel([
              { label: 'Planned Start Date', value: form.plannedStartDate, type: 'date', kind: 'date', columns: 6 },
              { label: 'Planned End Date', value: form.plannedEndDate, type: 'date', kind: 'date', columns: 6 },
            ], 3) : (
              <div className="create-activity__form-stack">
                <div className="create-activity__date-range" role="group" aria-label="Activity timeline">
                  <DatePicker
                    disabled={!canEditField('plannedStartDate')}
                    error={errors.plannedStartDate}
                    id="planned-start-date"
                    label="Planned Start Date"
                    onChange={(value) => updateForm({ plannedStartDate: value })}
                    required
                    tooltip={EDIT_ACTIVITY_TOOLTIPS.plannedStartDate}
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
                    tooltip={EDIT_ACTIVITY_TOOLTIPS.plannedEndDate}
                    value={form.plannedEndDate}
                  />
                </div>
              </div>
            ),
          )}

          {isAdeoVisible ? renderActivityInfoCard(
            <FileText size={18} />,
            'ADEO Activity Overview',
            'Capture execution plan reporting details required for ADEO visibility.',
            showPlanningReadOnlyView ? (
              readOnlyPanel([
                { label: 'Project Name', value: form.adeoProjectName, kind: 'identity', columns: 6 },
                { label: 'Project Description', value: form.adeoProjectDescription, kind: 'narrative', columns: 6 },
                { label: 'Long Term Impact', value: form.longTermImpact, type: 'long', kind: 'narrative', columns: 6 },
                { label: 'Overall Long Term Impact', value: form.overallLongTermImpact, type: 'long', kind: 'narrative', columns: 6 },
                { label: 'Stakeholder', value: form.stakeholder, kind: 'person', columns: 6 },
                { label: 'Activity KPI', value: form.activityKpi, kind: 'classification', columns: 6 },
                { label: 'Activity Plan (If any)', value: form.activityPlan, kind: 'narrative', columns: 6 },
                { label: 'Risks', value: form.risks, kind: 'narrative', columns: 6 },
              ], 3)
            ) : (
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
            ),
          ) : null}
        </div>

        <MembersTab embedded isReadOnly={!isEditing || isReadOnly} onActivityDataChanged={onActivityDataChanged} onOperationAlert={onOperationAlert} projectId={projectId} />
        {isAdeoVisible ? (
          <DependenciesTab
            embedded
            isReadOnly={!isEditing || isReadOnly}
            onActivityDataChanged={onActivityDataChanged}
            onDependencyCountChange={handleDependencyCountChange}
            onOperationAlert={onOperationAlert}
            projectId={projectId}
          />
        ) : null}
      </>
    )
  }, [
    form,
    errors,
    updateForm,
    activityLeadOptions,
    showExecutionTracking,
    isEditing,
    isStrategic,
    isPaymentOnly,
    isBudgetNo,
    isAdeoVisible,
    onActivityDataChanged,
    projectId,
    requiresActivityStatusJustification,
    isReadOnly,
    canEditField,
    executionActivityStatusOptions,
    handleDependencyCountChange,
    onOperationAlert,
    showPlanningReadOnlyView,
  ])

  void guidancePanel

  return (
    <TooltipProvider>
      <div className="create-activity__manual-layout">
      <div className="create-activity__manual-ai-summary">
        <AiSummaryPanel
          error={aiSummaryError}
          isLoading={isAiSummaryLoading}
          meta={aiSummaryMeta}
          summaries={aiSummaryBlocks}
          title="Activity Information"
        />
      </div>
      <div className="create-activity__manual-form">
        {formCards}
      </div>
      </div>
    </TooltipProvider>
  )
}
