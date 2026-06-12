import type { InputHTMLAttributes, ReactNode } from 'react'
import { Check } from 'lucide-react'
import './ui.css'

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  description?: string
  label: ReactNode
}

export function Checkbox({ className = '', description, label, ...props }: CheckboxProps) {
  return (
    <label className={`choice choice--checkbox ${className}`.trim()}>
      <input type="checkbox" {...props} />
      <span className="choice__box" aria-hidden="true">
        <Check size={14} />
      </span>
      <span className="choice__copy">
        <span>{label}</span>
        {description ? <small>{description}</small> : null}
      </span>
    </label>
  )
}
