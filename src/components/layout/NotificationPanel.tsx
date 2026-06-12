import { useEffect, useRef } from 'react'
import { CheckCheck, FileText, Info, TriangleAlert } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { closeNotificationPanel } from '../../store/appSlice'
import type { NotificationTone } from '../../constants/app'

const toneIcon: Record<NotificationTone, typeof Info> = {
  info: FileText,
  warning: TriangleAlert,
  success: CheckCheck,
}

export function NotificationPanel() {
  const dispatch = useAppDispatch()
  const panelRef = useRef<HTMLDivElement>(null)
  const { notifications } = useAppSelector((state) => state.app)
  const unreadCount = notifications.filter((notification) => notification.unread).length

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target as HTMLElement

      if (panelRef.current?.contains(target) || target.closest('.header__notification-control')) {
        return
      }

      dispatch(closeNotificationPanel())
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        dispatch(closeNotificationPanel())
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [dispatch])

  return (
    <div aria-label="Notifications" className="notifications-popover" ref={panelRef} role="dialog">
      <div className="notifications-popover__header">
        <div>
          <h2>Notifications</h2>
          <p>You have {unreadCount} unread notifications</p>
        </div>
        <button className="notifications-popover__mark-read" type="button">
          Mark all read
        </button>
      </div>

      <div className="notifications-popover__list">
        {notifications.map((notification) => {
          const NotificationIcon = toneIcon[notification.tone]

          return (
            <article
              className={`notifications-popover__item ${
                notification.unread ? 'notifications-popover__item--unread' : ''
              }`}
              key={notification.id}
            >
              <div className={`notifications-popover__icon notifications-popover__icon--${notification.tone}`}>
                <NotificationIcon aria-hidden="true" size={15} />
              </div>
              <div className="notifications-popover__content">
                <h3>{notification.title}</h3>
                <p>{notification.description}</p>
                <time>{notification.time}</time>
              </div>
              {notification.unread ? <span className="notifications-popover__dot" aria-label="Unread notification" /> : null}
            </article>
          )
        })}
      </div>

      <button className="notifications-popover__footer-link" type="button">
        View All Notifications
      </button>
    </div>
  )
}
