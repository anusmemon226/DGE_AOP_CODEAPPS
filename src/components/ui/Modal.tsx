import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { Button } from './Button'
import './ui.css'

type ModalProps = {
  actions?: ReactNode
  children: ReactNode
  isOpen: boolean
  onClose: () => void
  title: string
}

type ConfirmationDialogProps = {
  confirmLabel?: string
  danger?: boolean
  description: string
  isOpen: boolean
  onCancel: () => void
  onConfirm: () => void
  title: string
}

export function Modal({ actions, children, isOpen, onClose, title }: ModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onClose])

  if (!isOpen) {
    return null
  }

  return (
    <div className="modal" role="presentation">
      <button aria-label="Close modal" className="modal__backdrop" onClick={onClose} type="button" />
      <section aria-modal="true" className="modal__panel" role="dialog">
        <header className="modal__header">
          <h2>{title}</h2>
          <button aria-label="Close modal" className="modal__close" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </header>
        <div className="modal__body">{children}</div>
        {actions ? <footer className="modal__footer">{actions}</footer> : null}
      </section>
    </div>
  )
}

export function ConfirmationDialog({
  confirmLabel = 'Confirm',
  danger = false,
  description,
  isOpen,
  onCancel,
  onConfirm,
  title,
}: ConfirmationDialogProps) {
  return (
    <Modal
      actions={
        <>
          <Button onClick={onCancel} variant="secondary">
            Cancel
          </Button>
          <Button className={danger ? 'button--danger' : ''} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
    >
      <div className={`modal__confirm-body${danger ? ' modal__confirm-body--danger' : ''}`}>
        {danger ? (
          <div className="modal__confirm-icon">
            <AlertTriangle size={22} />
          </div>
        ) : null}
        <p className="modal__description" dangerouslySetInnerHTML={{ __html: description }} />
      </div>
    </Modal>
  )
}
