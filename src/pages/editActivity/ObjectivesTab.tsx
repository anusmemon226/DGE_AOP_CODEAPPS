import { useState, useId } from 'react'
import { Card, RadioGroup } from '../../components/ui'

// ── Types ──

type DgePillarValue = '' | 'cognitive-government' | 'resource-optimization'
type DigitalPillarValue = '' | 'operating-model' | 'common-digital-platforms'
type LinkObjectiveValue = '' | 'strengthen-governance' | 'maximize-cloud' | 'drive-adoption' | 'enrich-cdp'
type LinkKpiValue = '' | 'policy-compliance-rate' | 'threats-detected' | 'annual-time-saved' | 'cdp-progress'

// ─── DGE Corporate Strategy Pillar ───
// All options share one color via the group className

const DGE_PILLAR_OPTIONS = [
  { label: 'Cognitive Government', value: 'cognitive-government' as const },
  { label: 'Resource Optimization', value: 'resource-optimization' as const },
]

// ─── Digital Strategy Pillar ───

const DIGITAL_PILLAR_OPTIONS = [
  { label: 'Operating Model', value: 'operating-model' as const },
  { label: 'Common Digital Platforms', value: 'common-digital-platforms' as const },
]

// ─── Link to Digital Strategy objectives (per-pillar) ───

const OM_OBJECTIVE_OPTIONS = [
  { label: 'Strengthen Governance & Operations Frameworks', value: 'strengthen-governance' as const },
  { label: 'Maximize Cloud Investment', value: 'maximize-cloud' as const },
]

const CDP_OBJECTIVE_OPTIONS = [
  { label: 'Drive Adoption', value: 'drive-adoption' as const },
  { label: 'Enrich CDP Offerings', value: 'enrich-cdp' as const },
]

// ─── Link to strategic KPIs (per-pillar) ───

const OM_KPI_OPTIONS = [
  { label: 'Policy Compliance Rate', value: 'policy-compliance-rate' as const },
  { label: 'Threats Detected by SOC (vs other sources)', value: 'threats-detected' as const },
]

const CDP_KPI_OPTIONS = [
  { label: 'Annual Employee Time Saved', value: 'annual-time-saved' as const },
  { label: 'Common Digital Platforms Program Progress', value: 'cdp-progress' as const },
]

// ── Component ──

export function ObjectivesTab() {
  const uid = useId()

  const [dgePillar, setDgePillar] = useState<DgePillarValue>('')
  const [digitalPillar, setDigitalPillar] = useState<DigitalPillarValue>('')
  const [linkObjective, setLinkObjective] = useState<LinkObjectiveValue>('')
  const [linkKpi, setLinkKpi] = useState<LinkKpiValue>('')

  // Derived: which options to show for the dependent fields
  const objectiveOptions =
    digitalPillar === 'operating-model'
      ? OM_OBJECTIVE_OPTIONS
      : digitalPillar === 'common-digital-platforms'
        ? CDP_OBJECTIVE_OPTIONS
        : []

  const kpiOptions =
    digitalPillar === 'operating-model'
      ? OM_KPI_OPTIONS
      : digitalPillar === 'common-digital-platforms'
        ? CDP_KPI_OPTIONS
        : []

  // Reset dependent fields when pillar changes
  function handleDigitalPillarChange(value: DigitalPillarValue) {
    setDigitalPillar(value)
    setLinkObjective('')
    setLinkKpi('')
  }

  // Total field count (excl. hidden)
  const activeCount = [dgePillar, digitalPillar, linkObjective, linkKpi].filter(Boolean).length

  return (
    <div className="edit-activity__objectives">
      {/* Header */}
      <div className="edit-activity__members-header">
        <div className="edit-activity__members-header-text">
          <h2>
            Objectives
            <span className="edit-activity__members-count-badge">
              {activeCount} of 4 selected
            </span>
          </h2>
          <p>
            Link the activity to corporate and digital strategy objectives.
          </p>
        </div>
      </div>

      {/* ── DGE Corporate Strategy Pillar ── */}
      <Card className="create-activity__section">
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
            label="Select the DGE Corporate Strategy Pillar this activity aligns to"
            name={`${uid}-dge-pillar`}
            onChange={(value) => setDgePillar(value as DgePillarValue)}
            options={DGE_PILLAR_OPTIONS}
            required
            value={dgePillar}
          />
        </div>
      </Card>

      {/* ── Digital Strategy Pillar ── */}
      <Card className="create-activity__section">
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
            label="Select the Digital Strategy Pillar this activity falls under"
            name={`${uid}-digital-pillar`}
            onChange={(value) => handleDigitalPillarChange(value as DigitalPillarValue)}
            options={DIGITAL_PILLAR_OPTIONS}
            required
            value={digitalPillar}
          />

          {/* ── Link to Digital Strategy objectives ── */}
          {digitalPillar && (
            <RadioGroup
              className="radio-group--link-objective"
              label="Link to Digital Strategy objectives"
              name={`${uid}-link-objective`}
              onChange={(value) => setLinkObjective(value as LinkObjectiveValue)}
              options={objectiveOptions}
            required
            value={linkObjective}
            />
          )}

          {/* ── Link to strategic KPIs ── */}
          {digitalPillar && (
            <RadioGroup
              className="radio-group--link-kpi"
              label="Link to strategic KPIs"
              name={`${uid}-link-kpi`}
              onChange={(value) => setLinkKpi(value as LinkKpiValue)}
              options={kpiOptions}
            required
            value={linkKpi}
            />
          )}
        </div>
      </Card>
    </div>
  )
}
