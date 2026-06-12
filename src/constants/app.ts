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
  href: string
}

export const NAVIGATION_ITEMS: NavigationItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '#dashboard' },
  { id: 'createActivity', label: 'Create Activity', icon: Activity, href: '#create-activity' },
  { id: 'overview', label: 'Sector / Division Overview', icon: Landmark, href: '#overview' },
  { id: 'activityLeads', label: 'Activity Leads', icon: UsersRound, href: '#activity-leads' },
  { id: 'activitiesList', label: 'Activities List', icon: ClipboardCheck, href: '#activities-list' },
  { id: 'approvals', label: 'Approvals', icon: Gauge, href: '#approvals' },
  { id: 'procurementPlan', label: 'Procurement Plan', icon: BriefcaseBusiness, href: '#procurement-plan' },
  { id: 'engagementPlan', label: 'Engagement Plan', icon: BarChart3, href: '#engagement-plan' },
  { id: 'financialSpending', label: 'Financial Spending', icon: ReceiptText, href: '#financial-spending' },
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
