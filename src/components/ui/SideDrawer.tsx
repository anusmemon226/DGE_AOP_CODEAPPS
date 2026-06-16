import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { X } from 'lucide-react'
import './ui.css'

type SideDrawerProps = {
  actions?: ReactNode
  children: ReactNode
  isOpen: boolean
  onClose: () => void
  title: string
}

export function SideDrawer({ actions, children, isOpen, onClose, title }: SideDrawerProps) {
  useEffect(() => {
    if (!isOpen) return undefined

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = originalOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="side-drawer" role="presentation">
      <button aria-label="Close drawer" className="side-drawer__backdrop" onClick={onClose} type="button" />
      <section aria-modal="true" className="side-drawer__panel" role="dialog">
        <header className="side-drawer__header">
          <h2>{title}</h2>
          <button aria-label="Close drawer" className="side-drawer__close" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </header>
        <div className="side-drawer__body">{children}</div>
        {actions ? <footer className="side-drawer__footer">{actions}</footer> : null}
      </section>
    </div>
  )
}
