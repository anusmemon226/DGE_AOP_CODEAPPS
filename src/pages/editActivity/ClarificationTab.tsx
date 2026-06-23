import { useEffect, useMemo, useRef, useState } from 'react'
import { HelpCircle, SendHorizonal } from 'lucide-react'
import { Card } from '../../components/ui'
import {
  CURRENT_USER,
  SAMPLE_CLARIFICATIONS,
  formatMessageDate,
  type ClarificationMessage,
} from './clarificationData'

// ── User avatar initials circle ──

function UserAvatar({ initials, size = 'md' }: { initials: string; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'edit-activity__clar-avatar--sm' : 'edit-activity__clar-avatar--md'

  return (
    <span className={`edit-activity__clar-avatar ${sizeClass}`} aria-hidden="true">
      {initials}
    </span>
  )
}

// ── Message bubble ──

function MessageBubble({ message }: { message: ClarificationMessage }) {
  const sideClass = message.isCurrentUser
    ? 'edit-activity__clar-bubble--right'
    : 'edit-activity__clar-bubble--left'

  return (
    <div className={`edit-activity__clar-bubble ${sideClass}`}>
      {/* Avatar — outer edge for both sides */}
      <UserAvatar initials={message.userInitials} size="sm" />

      <div className="edit-activity__clar-bubble-body">
        {/* Sender name */}
        <span className="edit-activity__clar-bubble-name">{message.userName}</span>

        {/* Message text + date */}
        <div
          className={`edit-activity__clar-bubble-content ${
            message.isCurrentUser
              ? 'edit-activity__clar-bubble-content--self'
              : 'edit-activity__clar-bubble-content--other'
          }`}
        >
          <p className="edit-activity__clar-bubble-text">{message.message}</p>
          <span className="edit-activity__clar-bubble-time">{formatMessageDate(message.timestamp)}</span>
        </div>
      </div>
    </div>
  )
}

// ── Date separator ──

function DateSeparator({ label }: { label: string }) {
  return (
    <div className="edit-activity__clar-date-sep">
      <span className="edit-activity__clar-date-sep-line" />
      <span className="edit-activity__clar-date-sep-label">{label}</span>
      <span className="edit-activity__clar-date-sep-line" />
    </div>
  )
}

// ── Group messages by date for separators ──

function dateKey(d: Date): string {
  return d.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
}

function groupByDate(messages: ClarificationMessage[]) {
  const groups: { label: string; items: ClarificationMessage[] }[] = []
  let currentKey = ''

  for (const msg of messages) {
    const key = dateKey(msg.timestamp)
    if (key !== currentKey) {
      currentKey = key
      groups.push({ label: key, items: [] })
    }
    groups[groups.length - 1].items.push(msg)
  }

  return groups
}

// ── Component ──

export function ClarificationTab() {
  const [messages, setMessages] = useState<ClarificationMessage[]>(SAMPLE_CLARIFICATIONS)
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const grouped = useMemo(() => groupByDate(messages), [messages])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend() {
    const text = inputValue.trim()
    if (!text) return

    const newMsg: ClarificationMessage = {
      id: `msg-${Date.now()}`,
      userId: CURRENT_USER.id,
      userName: CURRENT_USER.name,
      userInitials: CURRENT_USER.initials,
      message: text,
      timestamp: new Date(),
      isCurrentUser: true,
    }

    setMessages((prev) => [...prev, newMsg])
    setInputValue('')

    // Refocus input
    inputRef.current?.focus()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Render ──

  return (
    <Card className="create-activity__section edit-activity__clar">
      {/* ── Header ── */}
      <div className="create-activity__section-header">
        <div className="create-activity__section-header-inner">
          <span className="create-activity__section-header-icon" aria-hidden="true">
            <HelpCircle size={18} />
          </span>
          <div>
            <span>Clarifications</span>
            <h2>Conversation thread with reviewers</h2>
          </div>
        </div>
        <span className="edit-activity__clar-count-badge">{messages.length}</span>
      </div>

      {/* ── Messages area ── */}
      <div className="edit-activity__clar-messages">
        {grouped.length === 0 ? (
          <div className="edit-activity__clar-empty">
            <HelpCircle size={32} />
            <h3>No clarifications yet</h3>
            <p>All resolved conversations will appear here.</p>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.label}>
              <DateSeparator label={group.label} />
              {group.items.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ── */}
      <div className="edit-activity__clar-input-wrap">
        <div className="edit-activity__clar-input-card">
          <textarea
            ref={inputRef}
            className="edit-activity__clar-input"
            placeholder="Type your clarification message..."
            rows={1}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className="edit-activity__clar-send-btn"
            disabled={!inputValue.trim()}
            onClick={handleSend}
            type="button"
            aria-label="Send message"
          >
            <SendHorizonal size={18} />
          </button>
        </div>
        <span className="edit-activity__clar-input-hint">Press Enter to send, Shift+Enter for new line</span>
      </div>
    </Card>
  )
}
