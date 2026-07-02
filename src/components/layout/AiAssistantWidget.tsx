import { useEffect, useRef, useState, type FormEvent } from 'react'
import { Bot, Send, Sparkles, UserRound, X } from 'lucide-react'
import { Dga_custom_web_apiService } from '../../generated/services/Dga_custom_web_apiService'
import { closeAiAssistant, toggleAiAssistant } from '../../store/appSlice'
import { useAppDispatch, useAppSelector } from '../../store/hooks'

type ChatMessage = {
  id: string
  role: 'assistant' | 'user'
  text: string
  timestamp: Date
}

function getOperationErrorMessage(result: unknown, fallbackMessage: string) {
  const error = (result as { error?: { message?: string } | string })?.error
  const message = typeof error === 'string' ? error : error?.message

  if (!message) return fallbackMessage

  try {
    const parsed = JSON.parse(message) as { error?: { message?: string } }
    return parsed.error?.message ?? message
  } catch {
    return message
  }
}

function assertOperationSuccess(result: unknown, fallbackMessage: string) {
  if ((result as { success?: boolean })?.success === false) {
    throw new Error(getOperationErrorMessage(result, fallbackMessage))
  }
}

function formatMessageTime(date: Date) {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

function createMessage(role: ChatMessage['role'], text: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    text,
    timestamp: new Date(),
  }
}

function extractAssistantResponse(result: unknown) {
  const data = (result as { data?: Record<string, unknown> })?.data
  const response = data?.response

  return typeof response === 'string' && response.trim()
    ? response.trim()
    : 'I received your request, but no response text was returned.'
}

export function AiAssistantWidget() {
  const dispatch = useAppDispatch()
  const isOpen = useAppSelector((state) => state.app.isAiAssistantOpen)
  const selectedRole = useAppSelector((state) => state.app.selectedRole)
  const currentRoleDivisionalHierarchy = useAppSelector((state) => state.user.currentRoleDivisionalHierarchy)
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage(
      'assistant',
      "Hello! I'm your AI Assistant for the Annual Operating Plan. How can I help you today?",
    ),
  ])
  const [inputValue, setInputValue] = useState('')
  const [isSending, setIsSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        dispatch(closeAiAssistant())
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [dispatch, isOpen])

  useEffect(() => {
    if (!isOpen) return
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [isOpen, messages])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const prompt = inputValue.trim()
    if (!prompt || isSending) {
      return
    }

    setInputValue('')
    setIsSending(true)
    setMessages((currentMessages) => [...currentMessages, createMessage('user', prompt)])

    try {
      const roleHierarchyId = currentRoleDivisionalHierarchy?.hierarchyId ?? ''
      const divisionId = selectedRole === 'AOP - Division Member' || selectedRole === 'AOP - Division Director'
        ? roleHierarchyId
        : ''
      const sectorId = selectedRole === 'AOP - Executive Director'
        ? roleHierarchyId
        : ''
      const llmResponse = await Dga_custom_web_apiService.dga_custom_web_api(
        'openai',
        undefined,
        undefined,
        undefined,
        undefined,
        prompt,
        undefined,
        divisionId,
        sectorId,
      )
      assertOperationSuccess(llmResponse, 'AI Assistant could not process your request.')

      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage('assistant', extractAssistantResponse(llmResponse)),
      ])
    } catch (error) {
      setMessages((currentMessages) => [
        ...currentMessages,
        createMessage(
          'assistant',
          error instanceof Error
            ? error.message
            : 'AI Assistant could not process your request. Please try again.',
        ),
      ])
    } finally {
      setIsSending(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className={`ai-assistant-button ${isOpen ? 'ai-assistant-button--hidden' : ''}`}
        aria-label="Open AI Assistant"
        onClick={() => dispatch(toggleAiAssistant())}
      >
        <Sparkles size={22} strokeWidth={2.25} />
      </button>

      {isOpen ? (
        <>
          <button
            type="button"
            className="ai-assistant-backdrop"
            aria-label="Close AI Assistant"
            onClick={() => dispatch(closeAiAssistant())}
          />

          <section className="ai-assistant-panel" role="dialog" aria-modal="true" aria-labelledby="ai-assistant-title">
            <header className="ai-assistant-panel__header">
              <span className="ai-assistant-panel__avatar" aria-hidden="true">
                <Bot size={18} strokeWidth={2.2} />
              </span>
              <div className="ai-assistant-panel__title">
                <h2 id="ai-assistant-title">AI Assistant</h2>
                <p>Always here to help</p>
              </div>
              <button
                type="button"
                className="ai-assistant-panel__close"
                aria-label="Close AI Assistant"
                onClick={() => dispatch(closeAiAssistant())}
              >
                <X size={18} strokeWidth={2} />
              </button>
            </header>

            <div className="ai-assistant-panel__body">
              {messages.map((message) => {
                const isUserMessage = message.role === 'user'

                return (
                  <div
                    className={`ai-assistant-message ${
                      isUserMessage ? 'ai-assistant-message--user' : 'ai-assistant-message--assistant'
                    }`}
                    key={message.id}
                  >
                    {!isUserMessage ? (
                      <span className="ai-assistant-message__avatar" aria-hidden="true">
                        <Bot size={15} strokeWidth={2.2} />
                      </span>
                    ) : null}
                    <div className="ai-assistant-message__content">
                      <p>{message.text}</p>
                      <time>{formatMessageTime(message.timestamp)}</time>
                    </div>
                    {isUserMessage ? (
                      <span className="ai-assistant-message__avatar ai-assistant-message__avatar--user" aria-hidden="true">
                        <UserRound size={15} strokeWidth={2.2} />
                      </span>
                    ) : null}
                  </div>
                )
              })}
              {isSending ? (
                <div className="ai-assistant-message ai-assistant-message--assistant">
                  <span className="ai-assistant-message__avatar" aria-hidden="true">
                    <Bot size={15} strokeWidth={2.2} />
                  </span>
                  <div className="ai-assistant-message__content">
                    <p className="ai-assistant-message__typing">AI is thinking...</p>
                  </div>
                </div>
              ) : null}
              <div ref={messagesEndRef} />
            </div>

            <form className="ai-assistant-panel__composer" onSubmit={handleSubmit}>
              <input
                type="text"
                aria-label="Ask AI Assistant"
                disabled={isSending}
                onChange={(event) => setInputValue(event.target.value)}
                placeholder="Ask me anything..."
                value={inputValue}
              />
              <button type="submit" aria-label="Send message" disabled={isSending || !inputValue.trim()}>
                <Send size={18} strokeWidth={2} />
              </button>
            </form>
          </section>
        </>
      ) : null}
    </>
  )
}
