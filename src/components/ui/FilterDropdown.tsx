import { SlidersHorizontal } from 'lucide-react'
import { Button } from './Button'
import { Select, type SelectOption } from './Select'
import './ui.css'

type FilterDropdownProps<TValue extends string> = {
  id: string
  label: string
  onChange: (value: TValue) => void
  options: readonly SelectOption<TValue>[]
  value: TValue
}

export function FilterDropdown<TValue extends string>({ id, label, onChange, options, value }: FilterDropdownProps<TValue>) {
  return (
    <div className="filter-dropdown">
      <Select hideLabel id={id} label={label} onChange={onChange} options={options} value={value} />
      <Button icon={<SlidersHorizontal size={15} />} variant="secondary">
        Filters
      </Button>
    </div>
  )
}
