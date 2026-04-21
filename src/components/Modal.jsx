import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

/**
 * Lightweight accessible modal.
 *
 *  - Closes on Esc key, backdrop click, or close button.
 *  - Locks body scroll while open.
 *  - Focuses the dialog on open so keyboard users can navigate it.
 */
export function Modal({ open, onClose, title, children, maxWidth = '640px' }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)

    const t = window.setTimeout(() => {
      dialogRef.current?.focus()
    }, 0)

    return () => {
      document.body.style.overflow = prevOverflow
      window.removeEventListener('keydown', onKey)
      window.clearTimeout(t)
    }
  }, [open, onClose])

  if (!open) return null

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose?.()
  }

  return createPortal(
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={handleBackdropClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={dialogRef}
        className="modal-dialog"
        style={{ maxWidth }}
      >
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body,
  )
}
