import { useEffect, useMemo, useRef } from 'react'
import { Bell, CheckCheck, FileText, Info, TriangleAlert } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { closeNotificationPanel, markAllNotificationsRead, markNotificationRead } from '../../store/appSlice'
import type { NotificationTone } from '../../constants/app'
import { getVisibleNotifications } from '../../utils/notifications'

const toneIcon: Record<NotificationTone, typeof Info> = {
  info: FileText,
  warning: TriangleAlert,
  success: CheckCheck,
}

function notificationReference(id: string, index: number) {
  return /^N-\d+$/i.test(id) ? id.toUpperCase() : `N-${String(index + 1).padStart(3, '0')}`
}

export function NotificationPanel() {
  const dispatch = useAppDispatch()
  const panelRef = useRef<HTMLDivElement>(null)
  const { notifications, selectedCycle, selectedRole } = useAppSelector((state) => state.app)
  const visibleNotifications = useMemo(
    () => getVisibleNotifications(notifications, selectedRole, selectedCycle),
    [notifications, selectedCycle, selectedRole],
  )
  const unreadCount = visibleNotifications.filter((notification) => notification.unread).length

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
        <span className="notifications-popover__header-icon">
          <Bell aria-hidden="true" size={17} />
        </span>
        <div>
          <h2>Notifications</h2>
          <p>{unreadCount === 0 ? 'All caught up' : `${unreadCount} open ${unreadCount === 1 ? 'item' : 'items'}`}</p>
        </div>
        <button
          className="notifications-popover__mark-read"
          disabled={unreadCount === 0}
          onClick={() => dispatch(markAllNotificationsRead(visibleNotifications.map((notification) => notification.id)))}
          type="button"
        >
          Mark All as Read
        </button>
      </div>

      <div className="notifications-popover__list">
        {visibleNotifications.length === 0 ? (
          <div className="notifications-popover__empty">No open notifications.</div>
        ) : visibleNotifications.map((notification, index) => {
          const NotificationIcon = toneIcon[notification.tone]

          return (
            <article
              className={`notifications-popover__item ${
                notification.unread ? 'notifications-popover__item--unread' : ''
              }`}
              key={notification.id}
            >
              <div className="notifications-popover__item-meta">
                <span className={`notifications-popover__reference notifications-popover__reference--${notification.tone}`}>
                  <NotificationIcon aria-hidden="true" size={13} />
                  {notificationReference(notification.id, index)}
                </span>
                <time>{notification.time}</time>
                {notification.unread ? (
                  <button
                    className="notifications-popover__item-action"
                    onClick={() => dispatch(markNotificationRead(notification.id))}
                    type="button"
                  >
                    Mark as Read
                  </button>
                ) : null}
              </div>
              <div className="notifications-popover__content">
                <h3>{notification.title}</h3>
                <p>{notification.description}</p>
              </div>
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
