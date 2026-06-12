import { useState } from 'react'
import { BarChart3, Plus, Save } from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  Checkbox,
  ConfirmationDialog,
  CurrencyDisplay,
  CurrencyInput,
  DataGrid,
  DatePicker,
  EmptyState,
  FilterDropdown,
  Input,
  LoadingState,
  Modal,
  MultiSelect,
  RadioGroup,
  SearchInput,
  Select,
  StatCard,
  Tabs,
  Textarea,
  type DataGridColumn,
  type SelectOption,
} from '../components/ui'

const simpleOptions = [
  { label: 'New Project', value: 'new-project' },
  { label: 'Ongoing Project', value: 'ongoing-project' },
  { label: 'Contract Operations', value: 'contract-operations' },
] as const

const longOptions = Array.from({ length: 14 }, (_, index) => ({
  label: `Division Option ${index + 1}`,
  value: `division-${index + 1}`,
})) satisfies SelectOption<string>[]

const strategyOptions = [
  { label: 'Government of the Future Strategy', value: 'future' },
  { label: 'DGE Corporate Strategy', value: 'corporate' },
  { label: 'Abu Dhabi Government Digital Strategy', value: 'digital' },
] as const

type SampleRow = {
  id: string
  name: string
  owner: string
  budget: number
  status: 'Draft' | 'Submitted' | 'Approved'
}

const rows: SampleRow[] = [
  { id: 'aop-1', name: 'Digital Infrastructure Upgrade', owner: 'Division Member', budget: 1250000, status: 'Draft' },
  { id: 'aop-2', name: 'Service Automation Program', owner: 'Strategy Team', budget: 640000, status: 'Submitted' },
  { id: 'aop-3', name: 'Engagement Platform Refresh', owner: 'Procurement Team', budget: 320000, status: 'Approved' },
]

const columns: DataGridColumn<SampleRow>[] = [
  { key: 'name', header: 'Activity', render: (row) => row.name },
  { key: 'owner', header: 'Owner', render: (row) => row.owner },
  { key: 'budget', header: 'Budget', render: (row) => <CurrencyDisplay value={row.budget} /> },
  { key: 'status', header: 'Status', render: (row) => <Badge tone={row.status === 'Approved' ? 'success' : 'info'}>{row.status}</Badge> },
]

export function UiShowcase() {
  const [selectValue, setSelectValue] = useState('new-project')
  const [searchableValue, setSearchableValue] = useState('division-1')
  const [multiValue, setMultiValue] = useState<Array<'future' | 'corporate' | 'digital'>>(['future'])
  const [dateValue, setDateValue] = useState('2026-04-01')
  const [radioValue, setRadioValue] = useState<'strategic' | 'operational'>('strategic')
  const [tabValue, setTabValue] = useState<'overview' | 'budget' | 'approval'>('overview')
  const [filterValue, setFilterValue] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  return (
    <div className="ui-showcase">
      <header className="ui-showcase__header">
        <div>
          <span>Design system preview</span>
          <h1>Reusable UI Components</h1>
          <p>Custom AOP controls for forms, grids, dialogs, dates, choices, and currency.</p>
        </div>
        <Button icon={<Save size={16} />}>Save Draft</Button>
      </header>

      <section className="ui-showcase__grid">
        <Card className="ui-showcase__section">
          <h2>Buttons and Badges</h2>
          <div className="ui-showcase__row">
            <Button icon={<Plus size={16} />}>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
          </div>
          <div className="ui-showcase__row">
            <Badge>Draft</Badge>
            <Badge tone="info">Submitted</Badge>
            <Badge tone="warning">Clarification Needed</Badge>
            <Badge tone="success">Approved</Badge>
          </div>
        </Card>

        <Card className="ui-showcase__section">
          <h2>Inputs</h2>
          <div className="ui-showcase__form-grid">
            <Input label="Activity / Initiative Name" placeholder="Digital transformation initiative" required />
            <SearchInput label="Search activities" placeholder="Search activities..." />
            <Textarea label="Summary" placeholder="Describe the activity outcome..." required />
          </div>
        </Card>

        <Card className="ui-showcase__section">
          <h2>Dropdowns</h2>
          <div className="ui-showcase__form-grid">
            <Select id="showcase-select" label="Activity Type" onChange={setSelectValue} options={simpleOptions} value={selectValue} />
            <Select
              id="showcase-search-select"
              label="Large Optionset"
              onChange={setSearchableValue}
              options={longOptions}
              value={searchableValue}
            />
            <MultiSelect
              id="showcase-multi-select"
              label="Strategy Categorization"
              onChange={setMultiValue}
              options={strategyOptions}
              value={multiValue}
            />
          </div>
        </Card>

        <Card className="ui-showcase__section">
          <h2>Date and Currency</h2>
          <div className="ui-showcase__form-grid">
            <DatePicker id="planned-start" label="Planned Start Date" onChange={setDateValue} value={dateValue} />
            <CurrencyInput label="Requested Budget" placeholder="1,250,000.50" />
            <div className="ui-showcase__metric">
              <span>Total Project Budget</span>
              <CurrencyDisplay value={1250000.5} />
            </div>
          </div>
        </Card>

        <Card className="ui-showcase__section">
          <h2>Choices</h2>
          <div className="ui-showcase__form-grid">
            <Checkbox description="Shown when Activity Scope is Strategic" label="Requires strategic categorization" defaultChecked />
            <RadioGroup
              label="Activity Scope"
              name="activity-scope"
              onChange={setRadioValue}
              options={[
                { label: 'Strategic', value: 'strategic', description: 'Aligned to strategy outcomes' },
                { label: 'Operational', value: 'operational', description: 'Division operating activity' },
              ]}
              value={radioValue}
            />
          </div>
        </Card>

        <Card className="ui-showcase__section">
          <h2>Cards and Tabs</h2>
          <div className="ui-showcase__stats">
            <StatCard description="Activities in draft state" icon={<BarChart3 size={17} />} label="Planning Pipeline" value="24" />
            <StatCard description="Awaiting action" label="Pending Reviews" value="8" />
          </div>
          <Tabs
            items={[
              { label: 'Overview', value: 'overview' },
              { label: 'Budget', value: 'budget' },
              { label: 'Approval', value: 'approval' },
            ]}
            onChange={setTabValue}
            value={tabValue}
          />
        </Card>

        <Card className="ui-showcase__section ui-showcase__section--wide">
          <h2>Filter and Data Grid</h2>
          <FilterDropdown
            id="showcase-filter"
            label="Status filter"
            onChange={setFilterValue}
            options={[
              { label: 'All statuses', value: 'all' },
              { label: 'Draft', value: 'draft' },
              { label: 'Approved', value: 'approved' },
            ]}
            value={filterValue}
          />
          <DataGrid columns={columns} getRowKey={(row) => row.id} rows={rows} />
        </Card>

        <Card className="ui-showcase__section">
          <h2>States and Dialogs</h2>
          <LoadingState label="Loading AOP records..." />
          <EmptyState description="Create a new activity to start the annual planning process." title="No activities yet" />
          <div className="ui-showcase__row">
            <Button onClick={() => setIsModalOpen(true)} variant="secondary">
              Open Modal
            </Button>
            <Button onClick={() => setIsConfirmOpen(true)} variant="secondary">
              Confirm Action
            </Button>
          </div>
        </Card>
      </section>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Activity Guidance">
        <p className="modal__description">Use shared components for all Create Activity form sections.</p>
      </Modal>
      <ConfirmationDialog
        description="This is a reusable confirmation pattern for high-impact actions."
        isOpen={isConfirmOpen}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={() => setIsConfirmOpen(false)}
        title="Confirm sample action"
      />
    </div>
  )
}
