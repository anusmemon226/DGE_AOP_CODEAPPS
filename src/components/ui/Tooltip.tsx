import { createContext, useContext, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Info, TriangleAlert } from 'lucide-react'
import './ui.css'

type TooltipContextValue = {
  activeId: string | null
  pinnedId: string | null
  close: () => void
  open: (id: string, pinned: boolean) => void
}

const TooltipContext = createContext<TooltipContextValue | null>(null)

export function TooltipProvider({ children }: { children: ReactNode }) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [pinnedId, setPinnedId] = useState<string | null>(null)

  const close = () => {
    setActiveId(null)
    setPinnedId(null)
  }

  const open = (id: string, pinned: boolean) => {
    setActiveId(id)
    setPinnedId(pinned ? id : null)
  }

  return (
    <TooltipContext.Provider value={{ activeId, close, open, pinnedId }}>
      {children}
    </TooltipContext.Provider>
  )
}

type TooltipProps = {
  content: ReactNode
  label: string
  tone?: 'info' | 'warning'
}

export function Tooltip({ content, label, tone = 'info' }: TooltipProps) {
  const context = useContext(TooltipContext)
  const generatedId = useId()
  const id = `tooltip-${generatedId.replace(/:/g, '')}`
  const rootRef = useRef<HTMLSpanElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState<{
    arrowLeft: number
    left: number
    placement: 'above' | 'below'
    top: number
  } | null>(null)
  const isActive = context?.activeId === id
  const isPinned = context?.pinnedId === id

  useLayoutEffect(() => {
    if (!isActive) {
      return undefined
    }

    const updatePosition = () => {
      const trigger = rootRef.current?.querySelector('button')
      const panel = panelRef.current
      if (!trigger || !panel) return

      const triggerRect = trigger.getBoundingClientRect()
      const panelRect = panel.getBoundingClientRect()
      const gap = 8
      const padding = 8
      const hasRoomAbove = triggerRect.top >= panelRect.height + gap + padding
      const placement = hasRoomAbove ? 'above' : 'below'
      const top = placement === 'below' ? triggerRect.bottom + gap : Math.max(padding, triggerRect.top - panelRect.height - gap)
      const left = Math.min(
        Math.max(padding, triggerRect.left + (triggerRect.width / 2) - (panelRect.width / 2)),
        window.innerWidth - panelRect.width - padding,
      )

      setPosition({
        arrowLeft: Math.min(panelRect.width - 14, Math.max(14, triggerRect.left + (triggerRect.width / 2) - left)),
        left,
        placement,
        top,
      })
    }

    const animationFrame = window.requestAnimationFrame(updatePosition)
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isActive])

  useEffect(() => {
    if (!isActive || !context) return undefined

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (!rootRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        context.close()
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        context.close()
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [context, isActive])

  if (!context) return null

  const handleClick = () => {
    if (isPinned) {
      context.close()
      return
    }

    context.open(id, true)
  }

  const panel = isActive ? createPortal(
    <div
      className={`tooltip tooltip--${position?.placement ?? 'below'} tooltip--${tone}`}
      id={id}
      ref={panelRef}
      role="tooltip"
      style={position
        ? {
            '--tooltip-arrow-left': `${position.arrowLeft}px`,
            left: position.left,
            top: position.top,
          } as CSSProperties
        : { left: -9999, top: -9999 }}
    >
      {content}
    </div>,
    document.body,
  ) : null

  return (
    <span className="tooltip-trigger" ref={rootRef}>
      <button
        aria-describedby={isActive ? id : undefined}
        aria-expanded={isActive}
        aria-label={label}
        className={`tooltip-trigger__button tooltip-trigger__button--${tone}`}
        onBlur={() => {
          if (!isPinned) context.close()
        }}
        onClick={handleClick}
        onFocus={() => context.open(id, false)}
        onMouseEnter={() => context.open(id, false)}
        onMouseLeave={() => {
          if (!isPinned) context.close()
        }}
        type="button"
      >
        {tone === 'warning' ? <TriangleAlert aria-hidden="true" size={13} /> : <Info aria-hidden="true" size={13} />}
      </button>
      {panel}
    </span>
  )
}
