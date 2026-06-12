import type { InputHTMLAttributes } from 'react'
import { Search } from 'lucide-react'
import './ui.css'

type SearchInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
}

export function SearchInput({ className = '', label, ...props }: SearchInputProps) {
  return (
    <label className={`search-input ${className}`.trim()}>
      <span className="select-field__label select-field__label--hidden">{label}</span>
      <Search aria-hidden="true" size={16} />
      <input aria-label={label} {...props} />
    </label>
  )
}
