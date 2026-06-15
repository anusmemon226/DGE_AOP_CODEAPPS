import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  BarChart3,
  BriefcaseBusiness,
  ClipboardCheck,
  Gauge,
  Landmark,
  LayoutDashboard,
  ReceiptText,
  UsersRound,
} from 'lucide-react'
import { getNavigationPath } from '../routes/appRoutes'

export const AOP_ROLES = [
  'AOP - Division Member',
  'AOP - Division Director',
  'AOP - Strategy Team',
  'AOP - PMO',
  'AOP - Procurement Team',
  'AOP - Executive Director',
  'AOP - Director General',
] as const

export type AopRole = (typeof AOP_ROLES)[number]

export const AOP_ROLE_DISPLAY: Record<AopRole, { label: string; description: string }> = {
  'AOP - Division Member': {
    label: 'Division Member',
    description: 'Submit budget items',
  },
  'AOP - Division Director': {
    label: 'Division Director',
    description: 'Review division submissions',
  },
  'AOP - Strategy Team': {
    label: 'Strategy Team',
    description: 'Oversee AOP planning',
  },
  'AOP - PMO': {
    label: 'PMO',
    description: 'Manage portfolio progress',
  },
  'AOP - Procurement Team': {
    label: 'Procurement Team',
    description: 'Review procurement plans',
  },
  'AOP - Executive Director': {
    label: 'Executive Director',
    description: 'Approve sector activities',
  },
  'AOP - Director General': {
    label: 'Director General',
    description: 'Executive approval access',
  },
}

export type ThemeMode = 'light' | 'dark'

export const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'ar', label: 'العربية' },
] as const

export type LanguageCode = (typeof LANGUAGES)[number]['value']

export const AOP_CYCLES = [
  {
    id: 'cycle-2026-q2',
    name: 'FY 2026 - Q2',
    startDate: '2026-04-01',
    endDate: '2026-06-30',
    status: 'Active',
    isDefault: true,
  },
  {
    id: 'cycle-2026-q1',
    name: 'FY 2026 - Q1',
    startDate: '2026-01-01',
    endDate: '2026-03-31',
    status: 'Active',
    isDefault: false,
  },
  {
    id: 'cycle-2025-q4',
    name: 'FY 2025 - Q4',
    startDate: '2025-10-01',
    endDate: '2025-12-31',
    status: 'Completed',
    isDefault: false,
  },
] as const

export type CycleId = (typeof AOP_CYCLES)[number]['id']

export type NavigationItemId =
  | 'dashboard'
  | 'createActivity'
  | 'overview'
  | 'activityLeads'
  | 'activitiesList'
  | 'approvals'
  | 'procurementPlan'
  | 'engagementPlan'
  | 'financialSpending'

export type NavigationItem = {
  id: NavigationItemId
  label: string
  icon: LucideIcon
  path: string
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: getNavigationPath('dashboard') },
  { id: 'createActivity', label: 'Create Activity', icon: Activity, path: getNavigationPath('createActivity') },
  { id: 'overview', label: 'Sector / Division Overview', icon: Landmark, path: getNavigationPath('overview') },
  { id: 'activityLeads', label: 'Activity Leads', icon: UsersRound, path: getNavigationPath('activityLeads') },
  { id: 'activitiesList', label: 'Activities List', icon: ClipboardCheck, path: getNavigationPath('activitiesList') },
  { id: 'approvals', label: 'Approvals', icon: Gauge, path: getNavigationPath('approvals') },
  { id: 'procurementPlan', label: 'Procurement Plan', icon: BriefcaseBusiness, path: getNavigationPath('procurementPlan') },
  { id: 'engagementPlan', label: 'Engagement Plan', icon: BarChart3, path: getNavigationPath('engagementPlan') },
  { id: 'financialSpending', label: 'Financial Spending', icon: ReceiptText, path: getNavigationPath('financialSpending') },
]

export type NotificationTone = 'info' | 'warning' | 'success'

export type AppNotification = {
  id: string
  title: string
  description: string
  time: string
  tone: NotificationTone
  unread: boolean
}

export const MOCK_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'approval-queue',
    title: 'Activity Approved',
    description: 'Your activity "Digital Infrastructure Upgrade" has been approved.',
    time: '5 min ago',
    tone: 'success',
    unread: true,
  },
  {
    id: 'new-team-member',
    title: 'New Team Member',
    description: 'John Smith has been added to the Strategy Team.',
    time: '2 hours ago',
    tone: 'info',
    unread: true,
  },
  {
    id: 'pending-review',
    title: 'Pending Review',
    description: 'Procurement plan requires your attention.',
    time: '1 day ago',
    tone: 'warning',
    unread: false,
  },
]
