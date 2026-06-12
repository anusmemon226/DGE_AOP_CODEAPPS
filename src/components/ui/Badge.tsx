import type { ReactNode } from 'react'
import './ui.css'

type BadgeTone = 'neutral' | 'info' | 'warning' | 'success'

type BadgeProps = {
  children: ReactNode
  tone?: BadgeTone
}

export function Badge({ children, tone = 'neutral' }: BadgeProps) {
  return <span className={`badge badge--${tone}`}>{children}</span>
}
