import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'
import './ui.css'

type EmptyStateProps = {
  action?: ReactNode
  description: string
  title: string
}

export function EmptyState({ action, description, title }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <span className="empty-state__icon">
        <Inbox size={22} />
      </span>
      <strong>{title}</strong>
      <p>{description}</p>
      {action}
    </div>
  )
}
