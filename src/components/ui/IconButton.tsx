import type { ButtonHTMLAttributes, ReactNode } from 'react'
import './ui.css'

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  children: ReactNode
  isActive?: boolean
}

export function IconButton({ children, className = '', isActive = false, label, ...props }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={`icon-button ${isActive ? 'icon-button--active' : ''} ${className}`.trim()}
      title={label}
      type="button"
      {...props}
    >
      {children}
    </button>
  )
}
