import type { NavigationItemId } from '../constants/app'

export const APP_ROUTE_PATHS = {
  dashboard: '/dashboard',
  createActivity: '/create-activity',
  editActivity: '/edit-activity',
  overview: '/overview',
  activityLeads: '/activity-leads',
  activitiesList: '/activities',
  approvals: '/approvals',
  procurementPlan: '/procurement-plan',
  engagementPlan: '/engagement-plan',
  financialSpending: '/financial-spending',
} as const satisfies Record<NavigationItemId, string>

export type AppRoutePath = (typeof APP_ROUTE_PATHS)[NavigationItemId]

export const DEFAULT_APP_ROUTE: AppRoutePath = APP_ROUTE_PATHS.dashboard
export const UI_SHOWCASE_ROUTE = '/ui-showcase'

export const APP_ROUTE_TITLES: Record<NavigationItemId, string> = {
  dashboard: 'Dashboard',
  createActivity: 'Create Activity',
  editActivity: 'Edit Activity',
  overview: 'Overview',
  activityLeads: 'Activity Leads',
  activitiesList: 'Activities List',
  approvals: 'Approvals',
  procurementPlan: 'Procurement Plan',
  engagementPlan: 'Engagement Plan',
  financialSpending: 'Financial Spending',
}

export function getNavigationPath(id: NavigationItemId) {
  return APP_ROUTE_PATHS[id]
}
