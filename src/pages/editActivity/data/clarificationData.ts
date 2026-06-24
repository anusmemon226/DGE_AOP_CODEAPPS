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

// ── Current user config ──

export const CURRENT_USER = {
  id: 'user-anas',
  name: 'Anas Memon',
  initials: 'AM',
}
