import { NAVIGATION_ITEMS, type AopRole, type NavigationItem } from '../constants/app'

export function getOverviewLabel(role: AopRole) {
  if (role === 'AOP - Division Member' || role === 'AOP - Division Director') {
    return 'Division Overview'
  }

  if (role === 'AOP - Executive Director') {
    return 'Sector Overview'
  }

  return 'Sector / Division Overview'
}

export function canViewNavigationItem(role: AopRole, item: NavigationItem) {
  if (item.id === 'createActivity') {
    return role === 'AOP - Division Member'
  }

  if (item.id === 'approvals') {
    return role !== 'AOP - Division Member'
  }

  return true
}

export function getNavigationForRole(role: AopRole) {
  return NAVIGATION_ITEMS.filter((item) => canViewNavigationItem(role, item)).map((item) => {
    if (item.id !== 'overview') {
      return item
    }

    return {
      ...item,
      label: getOverviewLabel(role),
    }
  })
}
