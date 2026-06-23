// ── Clarification message types ──

export type ClarificationMessage = {
  id: string
  userId: string
  userName: string
  userInitials: string
  userAvatarUrl?: string
  message: string
  timestamp: Date
  isCurrentUser: boolean
}

// ── Helpers ──

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function formatMessageDate(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })

  if (diffDays === 0) {
    return `Today at ${timeStr}`
  }

  if (diffDays === 1) {
    return `Yesterday at ${timeStr}`
  }

  const dateStr = date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return `${dateStr} at ${timeStr}`
}

// ── Sample data ──

export const SAMPLE_CLARIFICATIONS: ClarificationMessage[] = [
  {
    id: 'c1',
    userId: 'user-sarah',
    userName: 'Sarah Khan',
    userInitials: 'SK',
    message:
      'Could you please clarify the expected outcomes for Objective 3? The current description seems ambiguous regarding the timeline for deliverables.',
    timestamp: new Date('2026-06-20T09:15:00'),
    isCurrentUser: false,
  },
  {
    id: 'c2',
    userId: 'user-anas',
    userName: 'Anas Memon',
    userInitials: 'AM',
    message:
      'Sure, Objective 3 targets Q3 completion. I will update the description to be more specific about the milestones.',
    timestamp: new Date('2026-06-20T10:30:00'),
    isCurrentUser: true,
  },
  {
    id: 'c3',
    userId: 'user-sarah',
    userName: 'Sarah Khan',
    userInitials: 'SK',
    message:
      'Also, regarding the budget allocation for Chapter 2 - Opex, the planned amount seems significantly higher than the previous cycle. Can you provide justification?',
    timestamp: new Date('2026-06-21T14:00:00'),
    isCurrentUser: false,
  },
  {
    id: 'c4',
    userId: 'user-anas',
    userName: 'Anas Memon',
    userInitials: 'AM',
    message:
      'The increase is due to the expanded scope of digital transformation initiatives this year. We have included a detailed breakdown in the supporting documents section.',
    timestamp: new Date('2026-06-21T15:45:00'),
    isCurrentUser: true,
  },
  {
    id: 'c5',
    userId: 'user-sarah',
    userName: 'Sarah Khan',
    userInitials: 'SK',
    message:
      'Noted. One more thing — the engagement plan mentions three ADGEs but only two are listed. Please review and confirm.',
    timestamp: new Date('2026-06-22T08:30:00'),
    isCurrentUser: false,
  },
]

// ── Current user config ──

export const CURRENT_USER = {
  id: 'user-anas',
  name: 'Anas Memon',
  initials: 'AM',
}
