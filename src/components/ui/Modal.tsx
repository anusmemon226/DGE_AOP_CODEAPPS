import type { ReactNode } from 'react'
import { useEffect, useId } from 'react'
import { AlertTriangle, ShieldCheck, X } from 'lucide-react'
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

type UnsavedChangesDialogProps = {
  description: string
  discardLabel?: string
  isOpen: boolean
  isSaving?: boolean
  onDiscard: () => void
  onDismiss: () => void
  onSave: () => void
  saveLabel: string
  title: string
}

export function Modal({ actions, children, isOpen, onClose, title }: ModalProps) {
  useEffect(() => {
    if (!isOpen) {
      return undefined
    }

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
  const titleId = useId()
  const descriptionId = useId()
  const Icon = danger ? AlertTriangle : ShieldCheck

  useEffect(() => {
    if (!isOpen) return undefined

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onCancel()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = originalOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div className="modal" role="presentation">
      <button aria-label="Close dialog" className="modal__backdrop" onClick={onCancel} type="button" />
      <section
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className={`confirm-dialog${danger ? ' confirm-dialog--danger' : ''}`}
        role="alertdialog"
      >
        <button aria-label="Close dialog" className="confirm-dialog__close" onClick={onCancel} type="button">
          <X size={16} />
        </button>
        <div className={`confirm-dialog__icon${danger ? ' confirm-dialog__icon--danger' : ''}`}>
          <Icon size={30} />
        </div>
        <div className="confirm-dialog__content">
          <h2 className="confirm-dialog__title" id={titleId}>{title}</h2>
          <p className="confirm-dialog__description" id={descriptionId}>{description}</p>
        </div>
        <div className="confirm-dialog__actions">
          <Button onClick={onCancel} variant="secondary">
            Cancel
          </Button>
          <Button className={danger ? 'button--danger' : ''} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  )
}

export function UnsavedChangesDialog({
  description,
  discardLabel = 'Discard Changes',
  isOpen,
  isSaving = false,
  onDiscard,
  onDismiss,
  onSave,
  saveLabel,
  title,
}: UnsavedChangesDialogProps) {
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    if (!isOpen) return undefined

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onDismiss()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = originalOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, onDismiss])

  if (!isOpen) return null

  return (
    <div className="modal" role="presentation">
      <button aria-label="Close dialog" className="modal__backdrop" onClick={onDismiss} type="button" />
      <section
        aria-describedby={descriptionId}
        aria-labelledby={titleId}
        aria-modal="true"
        className="confirm-dialog confirm-dialog--warning"
        role="alertdialog"
      >
        <button aria-label="Close dialog" className="confirm-dialog__close" onClick={onDismiss} type="button">
          <X size={16} />
        </button>
        <div className="confirm-dialog__icon confirm-dialog__icon--warning">
          <AlertTriangle size={30} />
        </div>
        <div className="confirm-dialog__content">
          <h2 className="confirm-dialog__title" id={titleId}>{title}</h2>
          <p className="confirm-dialog__description" id={descriptionId}>{description}</p>
        </div>
        <div className="confirm-dialog__actions">
          <Button disabled={isSaving} onClick={onDiscard} variant="secondary">
            {discardLabel}
          </Button>
          <Button disabled={isSaving} onClick={onSave}>
            {isSaving ? 'Saving...' : saveLabel}
          </Button>
        </div>
      </section>
    </div>
  )
}
