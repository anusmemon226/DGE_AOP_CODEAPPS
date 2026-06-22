import { useId, useMemo, useState } from 'react'
import { LockKeyhole } from 'lucide-react'
import {
  Badge,
  Button,
  ConfirmationDialog,
  DatePicker,
  Input,
  MultiSelect,
  RadioGroup,
  Select,
  SideDrawer,
  Textarea,
} from '../../components/ui'
import { ADGE_OPTIONS, ACTIVITY_STATUS_OPTIONS, PUBLISH_STATUS_OPTIONS, ACTIVITY_STATUS_TONES, PUBLISH_STATUS_TONES, getSelectedSectorNames, getSelectedDivisionNames } from './adgesData'
import { EngagementVisibilityPicker } from './EngagementVisibilityPicker'

// ── Types ──

type YesNoValue = '' | '1' | '0'

type EngagementPlan = {
  id: string
  // Auto-populated (read-only display)
  sectorName: string
  divisionName: string
  activityName: string
  activityLeadName: string
  activitySummary: string
  // User-entered fields
  engagementName: string
  engagementDescription: string
  engagementType: string
  engagementSubType: string
  activityStatus: string
  activityIncluded: YesNoValue
  publishStatus: string
  engagementVisibility: string[] // sector/division IDs
  engagementStartDate: string
  engagementEndDate: string
  requiredGRSupport: YesNoValue
  adgesInvolved: YesNoValue
  adCompanies: YesNoValue
  federalEntities: YesNoValue
  notesForGRTeam: string
  adCompaniesJustification: string
  federalEntitiesJustification: string
  selectedADGEs: string[]
}

type EngagementFormData = Omit<EngagementPlan, 'id'>
type FormErrors = Partial<Record<keyof EngagementFormData, string>>

// ── Props ──

interface EngagementPlanTabProps {
  sectorName: string
  divisionName: string
  activityName: string
  activityLeadName: string
  activitySummary: string
}

// ── Constants ──

const EMPTY_FORM: EngagementFormData = {
  sectorName: '',
  divisionName: '',
  activityName: '',
  activityLeadName: '',
  activitySummary: '',
  engagementName: '',
  engagementDescription: '',
  engagementType: '',
  engagementSubType: '',
  activityStatus: '',
  activityIncluded: '',
  publishStatus: '',
  engagementVisibility: [],
  engagementStartDate: '',
  engagementEndDate: '',
  requiredGRSupport: '',
  adgesInvolved: '',
  adCompanies: '',
  federalEntities: '',
  notesForGRTeam: '',
  adCompaniesJustification: '',
  federalEntitiesJustification: '',
  selectedADGEs: [],
}

const ENGAGEMENT_TYPE_OPTIONS = [
  { label: 'Select engagement type', value: '' },
  { label: 'Written Communication', value: '2133213' },
  { label: 'Events', value: '2133214433' },
] as const

const ENGAGEMENT_SUBTYPE_WRITTEN = [
  { label: 'Select sub-type', value: '' },
  { label: 'Newsletter', value: '21343432213' },
] as const

const ENGAGEMENT_SUBTYPE_EVENTS = [
  { label: 'Select sub-type', value: '' },
  { label: 'Conference/Forum', value: '2134233214433' },
] as const

const YES_NO_OPTIONS = [
  { label: 'Yes', value: '1', className: 'choice--yes' },
  { label: 'No', value: '0', className: 'choice--no' },
] as const

// ── Component ──

export function EngagementPlanTab({
  sectorName,
  divisionName,
  activityName: actName,
  activityLeadName,
  activitySummary,
}: EngagementPlanTabProps) {
  const uid = useId()

  // ── Data state ──
  const [engagementPlans, setEngagementPlans] = useState<EngagementPlan[]>([])

  // ── CRUD state ──
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<EngagementPlan | null>(null)
  const [form, setForm] = useState<EngagementFormData>(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [planToDelete, setPlanToDelete] = useState<EngagementPlan | null>(null)

  // ── Derived ──
  const isGRSupportYes = form.requiredGRSupport === '1'
  const isADGEsInvolvedYes = form.adgesInvolved === '1'
  const isADCompaniesYes = form.adCompanies === '1'
  const isFederalEntitiesYes = form.federalEntities === '1'

  const engagementSubTypeOptions = useMemo(() => {
    if (form.engagementType === '2133213') return ENGAGEMENT_SUBTYPE_WRITTEN
    if (form.engagementType === '2133214433') return ENGAGEMENT_SUBTYPE_EVENTS
    return [{ label: 'Select Sub-Type', value: '' }]
  }, [form.engagementType])

  // ── DataGrid columns ──

  const gridColumns = [
    {
      key: 'engagementName',
      header: 'Engagement Name',
      render: (row: EngagementPlan) => <span className="edit-activity__engagement-name">{row.engagementName}</span>,
    },
    {
      key: 'sectors',
      header: 'Sectors',
      render: (row: EngagementPlan) => {
        const sectors = getSelectedSectorNames(row.engagementVisibility)
        return (
          <div className="edit-activity__engagement-grid-cells">
            {sectors.length > 0 ? sectors.join(', ') : <span className="edit-activity__engagement-na">—</span>}
          </div>
        )
      },
    },
    {
      key: 'divisions',
      header: 'Divisions',
      render: (row: EngagementPlan) => {
        const divisions = getSelectedDivisionNames(row.engagementVisibility)
        return (
          <div className="edit-activity__engagement-grid-cells">
            {divisions.length > 0 ? divisions.join(', ') : <span className="edit-activity__engagement-na">—</span>}
          </div>
        )
      },
    },
    {
      key: 'engagementDescription',
      header: 'Engagement Description',
      render: (row: EngagementPlan) => (
        <span className="edit-activity__engagement-cell-desc">{row.engagementDescription}</span>
      ),
    },
    {
      key: 'engagementType',
      header: 'Type',
      render: (row: EngagementPlan) => (
        <Badge tone="info">
          {ENGAGEMENT_TYPE_OPTIONS.find((o) => o.value === row.engagementType)?.label ?? row.engagementType}
        </Badge>
      ),
    },
    {
      key: 'engagementSubType',
      header: 'Sub-Type',
      render: (row: EngagementPlan) => {
        const all = [...ENGAGEMENT_SUBTYPE_WRITTEN, ...ENGAGEMENT_SUBTYPE_EVENTS]
        return <Badge tone="neutral">{all.find((o) => o.value === row.engagementSubType)?.label ?? row.engagementSubType}</Badge>
      },
    },
    {
      key: 'activityStatus',
      header: 'Activity Status',
      render: (row: EngagementPlan) => (
        <Badge tone={ACTIVITY_STATUS_TONES[row.activityStatus] ?? 'neutral'}>
          {ACTIVITY_STATUS_OPTIONS.find((o) => o.value === row.activityStatus)?.label ?? row.activityStatus}
        </Badge>
      ),
    },
    {
      key: 'activityIncluded',
      header: 'Activity Included',
      render: (row: EngagementPlan) => (
        <Badge tone={row.activityIncluded === '1' ? 'success' : 'neutral'}>
          {row.activityIncluded === '1' ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      key: 'publishStatus',
      header: 'Publish Status',
      render: (row: EngagementPlan) => (
        <Badge tone={PUBLISH_STATUS_TONES[row.publishStatus] ?? 'neutral'}>
          {PUBLISH_STATUS_OPTIONS.find((o) => o.value === row.publishStatus)?.label ?? row.publishStatus}
        </Badge>
      ),
    },
    {
      key: 'adgesInvolved',
      header: 'ADGEs',
      render: (row: EngagementPlan) => (
        <Badge tone={row.adgesInvolved === '1' ? 'success' : 'neutral'}>
          {row.adgesInvolved === '1' ? 'Yes' : 'No'}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (row: EngagementPlan) => (
        <div className="edit-activity__engagement-actions">
          <button
            aria-label="Edit engagement plan"
            className="edit-activity__engagement-action-btn"
            onClick={() => handleOpenEdit(row)}
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            aria-label="Delete engagement plan"
            className="edit-activity__engagement-action-btn edit-activity__engagement-action-btn--danger"
            onClick={() => setPlanToDelete(row)}
            type="button"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          </button>
        </div>
      ),
    },
  ] as const

  // ── Helpers ──

  function handleFieldChange(fields: Partial<EngagementFormData>) {
    const next = { ...form, ...fields }

    // Reset dependent fields
    if (fields.engagementType !== undefined) {
      next.engagementSubType = ''
    }

    setForm(next)

    // Clear error for changed field
    const changedKey = Object.keys(fields)[0] as keyof EngagementFormData
    if (changedKey && formErrors[changedKey]) {
      setFormErrors((prev) => {
        const copy = { ...prev }
        delete copy[changedKey]
        return copy
      })
    }
  }

  function handleOpenCreate() {
    setEditingPlan(null)
    setForm({
      ...EMPTY_FORM,
      sectorName,
      divisionName,
      activityName: actName,
      activityLeadName,
      activitySummary,
    })
    setFormErrors({})
    setIsDrawerOpen(true)
  }

  function handleOpenEdit(plan: EngagementPlan) {
    setEditingPlan(plan)
    setForm({
      sectorName: plan.sectorName,
      divisionName: plan.divisionName,
      activityName: plan.activityName,
      activityLeadName: plan.activityLeadName,
      activitySummary: plan.activitySummary,
      engagementName: plan.engagementName,
      engagementDescription: plan.engagementDescription,
      engagementType: plan.engagementType,
      engagementSubType: plan.engagementSubType,
      activityStatus: plan.activityStatus,
      activityIncluded: plan.activityIncluded,
      publishStatus: plan.publishStatus,
      engagementVisibility: [...plan.engagementVisibility],
      engagementStartDate: plan.engagementStartDate,
      engagementEndDate: plan.engagementEndDate,
      requiredGRSupport: plan.requiredGRSupport,
      adgesInvolved: plan.adgesInvolved,
      adCompanies: plan.adCompanies,
      federalEntities: plan.federalEntities,
      notesForGRTeam: plan.notesForGRTeam,
      adCompaniesJustification: plan.adCompaniesJustification,
      federalEntitiesJustification: plan.federalEntitiesJustification,
      selectedADGEs: [...plan.selectedADGEs],
    })
    setFormErrors({})
    setIsDrawerOpen(true)
  }

  function handleCloseDrawer() {
    setIsDrawerOpen(false)
    setEditingPlan(null)
    setForm(EMPTY_FORM)
    setFormErrors({})
  }

  function validate(): boolean {
    const errs: FormErrors = {}

    if (!form.engagementName.trim()) errs.engagementName = 'Engagement name is required'
    if (!form.engagementDescription.trim()) errs.engagementDescription = 'Engagement description is required'
    if (!form.engagementType) errs.engagementType = 'Select engagement type'
    if (engagementSubTypeOptions.length > 0 && !form.engagementSubType) {
      errs.engagementSubType = 'Select engagement sub-type'
    }
    if (form.engagementVisibility.length === 0) errs.engagementVisibility = 'Select at least one sector or division'
    if (!form.engagementStartDate) errs.engagementStartDate = 'Start date is required'
    if (!form.engagementEndDate) errs.engagementEndDate = 'End date is required'

    // Date range validation
    if (form.engagementStartDate && form.engagementEndDate && form.engagementStartDate > form.engagementEndDate) {
      errs.engagementEndDate = 'End date must be after start date'
    }

    if (!form.activityStatus) errs.activityStatus = 'Select activity status'
    if (!form.activityIncluded) errs.activityIncluded = 'Select activity included'
    if (!form.publishStatus) errs.publishStatus = 'Select publish status'
    if (!form.requiredGRSupport) errs.requiredGRSupport = 'Select required GR support'
    if (!form.adgesInvolved) errs.adgesInvolved = 'Select ADGEs involved'
    if (!form.adCompanies) errs.adCompanies = 'Select AD companies'
    if (!form.federalEntities) errs.federalEntities = 'Select federal entities'

    if (isGRSupportYes && !form.notesForGRTeam.trim()) errs.notesForGRTeam = 'Notes for GR team is required'
    if (isADCompaniesYes && !form.adCompaniesJustification.trim()) {
      errs.adCompaniesJustification = 'AD companies justification is required'
    }
    if (isFederalEntitiesYes && !form.federalEntitiesJustification.trim()) {
      errs.federalEntitiesJustification = 'Federal entities justification is required'
    }
    if (isADGEsInvolvedYes && form.selectedADGEs.length === 0) {
      errs.selectedADGEs = 'Select at least one ADGE'
    }

    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSave() {
    if (!validate()) return

    if (editingPlan) {
      setEngagementPlans((prev) =>
        prev.map((p) =>
          p.id === editingPlan.id ? { ...p, ...form } : p,
        ),
      )
    } else {
      const newPlan: EngagementPlan = {
        id: `ep-${Date.now()}`,
        ...form,
      }
      setEngagementPlans((prev) => [...prev, newPlan])
    }
    handleCloseDrawer()
  }

  function handleConfirmDelete() {
    if (!planToDelete) return
    setEngagementPlans((prev) => prev.filter((p) => p.id !== planToDelete.id))
    setPlanToDelete(null)
  }

  // ── Render helpers ──

  function renderAutoPopulatedFields() {
    return (
      <div className="edit-activity__engagement-section">
        <div className="create-activity__section-header">
          <div className="create-activity__section-header-inner">
            <span className="create-activity__section-header-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            <div>
              <span>Activity Information</span>
              <h2>Auto Populated Fields</h2>
            </div>
          </div>
        </div>
        <div className="edit-activity__engagement-drawer-section">
          <div className="create-activity__form-row create-activity__form-row--two">
            <Input disabled label="Sector" required rightIcon={<LockKeyhole size={15} />} value={form.sectorName} />
            <Input disabled label="Division" required rightIcon={<LockKeyhole size={15} />} value={form.divisionName} />
          </div>
          <div className="create-activity__form-row create-activity__form-row--two">
            <Input disabled label="Activity Name" required rightIcon={<LockKeyhole size={15} />} value={form.activityName} />
            <Input disabled label="Activity Lead" required rightIcon={<LockKeyhole size={15} />} value={form.activityLeadName} />
          </div>
          <div className="field__input-wrap">
            <Textarea disabled label="Activity Summary" required rows={3} value={form.activitySummary} />
            <span className="field__right-icon"><LockKeyhole size={15} /></span>
          </div>
        </div>
      </div>
    )
  }

  function renderEngagementDetails() {
    return (
      <div className="edit-activity__engagement-section">
        <div className="create-activity__section-header">
          <div className="create-activity__section-header-inner">
            <span className="create-activity__section-header-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </span>
            <div>
              <span>Engagement Details</span>
              <h2>Engagement Information</h2>
            </div>
          </div>
        </div>
        <div className="edit-activity__engagement-drawer-section">
          <Input
            error={formErrors.engagementName}
            label="Engagement Name"
            onChange={(e) => handleFieldChange({ engagementName: e.target.value })}
            required
            value={form.engagementName}
          />

          <Textarea
            error={formErrors.engagementDescription}
            label="Engagement Description"
            onChange={(e) => handleFieldChange({ engagementDescription: e.target.value })}
            required
            rows={3}
            value={form.engagementDescription}
          />

          <div className="create-activity__form-row create-activity__form-row--two">
            <Select
              error={formErrors.engagementType}
              id={`${uid}-engagement-type`}
              label="Engagement Type"
              onChange={(value) => handleFieldChange({ engagementType: value })}
              options={ENGAGEMENT_TYPE_OPTIONS}
              required
              value={form.engagementType}
            />
            <Select
              error={formErrors.engagementSubType}
              id={`${uid}-engagement-sub-type`}
              label="Engagement Sub-Type"
              onChange={(value) => handleFieldChange({ engagementSubType: value })}
              options={engagementSubTypeOptions}
              required
              value={form.engagementSubType}
            />
          </div>
        </div>
      </div>
    )
  }

  function renderEngagementVisibility() {
    return (
      <div className="edit-activity__engagement-section">
        <div className="create-activity__section-header">
          <div className="create-activity__section-header-inner">
            <span className="create-activity__section-header-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </span>
            <div>
              <span>Engagement Visibility</span>
              <h2>Sectors & Divisions</h2>
            </div>
          </div>
        </div>
        <div className="edit-activity__engagement-drawer-section">
          <EngagementVisibilityPicker
            error={formErrors.engagementVisibility}
            label="Engagement Visibility"
            onChange={(value) => handleFieldChange({ engagementVisibility: value })}
            required
            value={form.engagementVisibility}
          />
        </div>
      </div>
    )
  }

  function renderTimelineAndSupport() {
    return (
      <div className="edit-activity__engagement-section">
        <div className="create-activity__section-header">
          <div className="create-activity__section-header-inner">
            <span className="create-activity__section-header-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </span>
            <div>
              <span>Timeline & Support</span>
              <h2>Engagement Period</h2>
            </div>
          </div>
        </div>
        <div className="edit-activity__engagement-drawer-section">
          <div className="create-activity__date-range">
            <DatePicker
              error={formErrors.engagementStartDate}
              id={`${uid}-start-date`}
              label="Engagement Start Date"
              onChange={(value) => handleFieldChange({ engagementStartDate: value })}
              required
              value={form.engagementStartDate}
            />
            <span className="create-activity__date-connector" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 5l7 7-7 7"/>
              </svg>
            </span>
            <DatePicker
              error={formErrors.engagementEndDate}
              id={`${uid}-end-date`}
              label="Engagement End Date"
              onChange={(value) => handleFieldChange({ engagementEndDate: value })}
              required
              value={form.engagementEndDate}
            />
          </div>

          <RadioGroup
            className="radio-group--gr-support"
            error={formErrors.requiredGRSupport}
            label="Required GR Support"
            name={`${uid}-gr-support`}
            onChange={(value) => handleFieldChange({ requiredGRSupport: value as YesNoValue })}
            options={YES_NO_OPTIONS}
            required
            value={form.requiredGRSupport}
          />

          <Textarea
            error={formErrors.notesForGRTeam}
            label="Notes for GR Team"
            onChange={(e) => handleFieldChange({ notesForGRTeam: e.target.value })}
            required={isGRSupportYes}
            rows={3}
            value={form.notesForGRTeam}
          />
        </div>
      </div>
    )
  }

  function renderADGEsAndEntities() {
    return (
      <div className="edit-activity__engagement-section">
        <div className="create-activity__section-header">
          <div className="create-activity__section-header-inner">
            <span className="create-activity__section-header-icon" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </span>
            <div>
              <span>ADGEs & Entities</span>
              <h2>Involvement Details</h2>
            </div>
          </div>
        </div>
        <div className="edit-activity__engagement-drawer-section">
          {/* ADGEs Involved */}
          <RadioGroup
            className="radio-group--adges"
            error={formErrors.adgesInvolved}
            label="ADGEs Involved"
            name={`${uid}-adges-involved`}
            onChange={(value) => handleFieldChange({ adgesInvolved: value as YesNoValue })}
            options={YES_NO_OPTIONS}
            required
            value={form.adgesInvolved}
          />
          {isADGEsInvolvedYes && (
            <>
              <MultiSelect
                error={formErrors.selectedADGEs}
                id={`${uid}-select-adges`}
                label="Select ADGEs"
                onChange={(value) => handleFieldChange({ selectedADGEs: value })}
                options={ADGE_OPTIONS}
                placeholder="Search and select ADGEs..."
                required
                value={form.selectedADGEs}
              />
              {form.selectedADGEs.length > 0 && (
                <div className="edit-activity__engagement-adges-capsules">
                  {form.selectedADGEs.map((adgeId) => {
                    const label = ADGE_OPTIONS.find((o) => o.value === adgeId)?.label ?? adgeId
                    return (
                      <span
                        className="edit-activity__engagement-adges-capsule"
                        key={adgeId}
                        onClick={() => {
                          handleFieldChange({
                            selectedADGEs: form.selectedADGEs.filter((v) => v !== adgeId),
                          })
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            handleFieldChange({
                              selectedADGEs: form.selectedADGEs.filter((v) => v !== adgeId),
                            })
                          }
                        }}
                      >
                        {label}
                        <span className="edit-activity__engagement-adges-capsule-remove" aria-hidden="true">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </span>
                      </span>
                    )
                  })}
                </div>
              )}
            </>
          )}

          {/* AD Companies */}
          <RadioGroup
            className="radio-group--ad-companies"
            error={formErrors.adCompanies}
            label="AD Companies"
            name={`${uid}-ad-companies`}
            onChange={(value) => handleFieldChange({ adCompanies: value as YesNoValue })}
            options={YES_NO_OPTIONS}
            required
            value={form.adCompanies}
          />
          <Textarea
            error={formErrors.adCompaniesJustification}
            label="AD Companies Justification"
            onChange={(e) => handleFieldChange({ adCompaniesJustification: e.target.value })}
            required={isADCompaniesYes}
            rows={3}
            value={form.adCompaniesJustification}
          />

          {/* Federal Entities */}
          <RadioGroup
            className="radio-group--fed-entities"
            error={formErrors.federalEntities}
            label="Federal Entities"
            name={`${uid}-fed-entities`}
            onChange={(value) => handleFieldChange({ federalEntities: value as YesNoValue })}
            options={YES_NO_OPTIONS}
            required
            value={form.federalEntities}
          />
          <Textarea
            error={formErrors.federalEntitiesJustification}
            label="Federal Entities Justification"
            onChange={(e) => handleFieldChange({ federalEntitiesJustification: e.target.value })}
            required={isFederalEntitiesYes}
            rows={3}
            value={form.federalEntitiesJustification}
          />
        </div>
      </div>
    )
  }

  function renderDrawerForm() {
    const title = editingPlan ? 'Edit Engagement Plan' : 'Create Engagement Plan'

    return (
      <SideDrawer
        actions={
          <div className="edit-activity__engagement-drawer-actions">
            <Button onClick={handleCloseDrawer} variant="secondary">
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingPlan ? 'Update Engagement Plan' : 'Create Engagement Plan'}
            </Button>
          </div>
        }
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        title={title}
      >
        <div className="edit-activity__engagement-drawer">
          {renderAutoPopulatedFields()}
          {renderEngagementDetails()}
          {renderEngagementVisibility()}
          {renderTimelineAndSupport()}
          {renderADGEsAndEntities()}
        </div>
      </SideDrawer>
    )
  }

  // ── Render ──

  return (
    <div className="edit-activity__engagement">
      {/* Header */}
      <div className="edit-activity__members-header">
        <div className="edit-activity__members-header-text">
          <h2>
            Engagement Plans
            <span className="edit-activity__members-count-badge">{engagementPlans.length} Records</span>
          </h2>
          <p>Manage engagement plans for this activity.</p>
        </div>
        <Button icon={
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        } onClick={handleOpenCreate}>
          Add Engagement Plan
        </Button>
      </div>

      {/* Table */}
      <div className="data-grid">
        <table>
          <thead>
            <tr>
              {gridColumns.map((col) => (
                <th key={col.key}>{col.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {engagementPlans.length > 0 ? (
              engagementPlans.map((row) => (
                <tr key={row.id}>
                  {gridColumns.map((col) => (
                    <td key={col.key}>{col.render(row)}</td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={gridColumns.length} className="edit-activity__engagement-empty-cell">
                  <div className="edit-activity__engagement-empty">
                    No engagement plans yet. Click &quot;Add Engagement Plan&quot; to create one.
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Drawer */}
      {renderDrawerForm()}

      {/* Delete Confirmation */}
      <ConfirmationDialog
        confirmLabel="Delete Engagement Plan"
        danger
        description="This engagement plan will be permanently removed. This action cannot be undone."
        isOpen={planToDelete !== null}
        onCancel={() => setPlanToDelete(null)}
        onConfirm={handleConfirmDelete}
        title={planToDelete ? `Delete "${planToDelete.engagementName}"?` : ''}
      />
    </div>
  )
}
