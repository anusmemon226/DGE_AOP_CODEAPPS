import type { ReactNode } from 'react'
import './ui.css'

type CardProps = {
  children: ReactNode
  className?: string
}

type StatCardProps = {
  icon?: ReactNode
  label: string
  value: ReactNode
  description?: string
}

export function Card({ children, className = '' }: CardProps) {
  return <section className={`card ${className}`.trim()}>{children}</section>
}

export function StatCard({ description, icon, label, value }: StatCardProps) {
  return (
    <Card className="stat-card">
      {icon ? <span className="stat-card__icon">{icon}</span> : null}
      <span>{label}</span>
      <strong>{value}</strong>
      {description ? <p>{description}</p> : null}
    </Card>
  )
}
