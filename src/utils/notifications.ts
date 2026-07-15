import type { AopRole, AppNotification } from '../constants/app'

function normalizeId(id?: string | null) {
  return id?.replace(/[{}]/g, '').toLowerCase() ?? ''
}

export function isNotificationVisibleForContext(
  notification: AppNotification,
  selectedRole: AopRole,
  selectedCycle?: string,
) {
  const isRoleVisible = !notification.roles?.length || notification.roles.includes(selectedRole)
  const cycleIds = notification.cycleIds ?? (notification.cycleId ? [notification.cycleId] : [])
  const normalizedSelectedCycle = normalizeId(selectedCycle)
  const isCycleVisible = cycleIds.length === 0 || cycleIds.some((cycleId) => normalizeId(cycleId) === normalizedSelectedCycle)

  return isRoleVisible && isCycleVisible
}

export function getVisibleNotifications(
  notifications: AppNotification[],
  selectedRole: AopRole,
  selectedCycle?: string,
) {
  return notifications.filter((notification) => isNotificationVisibleForContext(notification, selectedRole, selectedCycle))
}
