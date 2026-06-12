import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { X } from 'lucide-react'
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

export function ConfirmationDialog({ description, isOpen, onCancel, onConfirm, title }: ConfirmationDialogProps) {
  return (
    <Modal
      actions={
        <>
          <Button onClick={onCancel} variant="secondary">
            Cancel
          </Button>
          <Button onClick={onConfirm}>Confirm</Button>
        </>
      }
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
    >
      <p className="modal__description">{description}</p>
    </Modal>
  )
}
