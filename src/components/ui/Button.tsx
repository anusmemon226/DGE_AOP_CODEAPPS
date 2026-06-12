import type { ButtonHTMLAttributes, ReactNode } from 'react'
import './ui.css'

type ButtonVariant = 'primary' | 'secondary' | 'ghost'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode
  icon?: ReactNode
  variant?: ButtonVariant
}

export function Button({ children, className = '', icon, variant = 'primary', ...props }: ButtonProps) {
  return (
    <button className={`button button--${variant} ${className}`.trim()} type="button" {...props}>
      {icon ? <span className="button__icon">{icon}</span> : null}
      <span>{children}</span>
    </button>
  )
}
