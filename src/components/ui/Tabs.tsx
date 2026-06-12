import './ui.css'

export type TabItem<TValue extends string> = {
  label: string
  value: TValue
}

type TabsProps<TValue extends string> = {
  items: readonly TabItem<TValue>[]
  onChange: (value: TValue) => void
  value: TValue
}

export function Tabs<TValue extends string>({ items, onChange, value }: TabsProps<TValue>) {
  return (
    <div className="tabs" role="tablist">
      {items.map((item) => (
        <button
          aria-selected={item.value === value}
          className={item.value === value ? 'tabs__tab tabs__tab--active' : 'tabs__tab'}
          key={item.value}
          onClick={() => onChange(item.value)}
          role="tab"
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
