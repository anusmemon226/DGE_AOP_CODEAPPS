import { useEffect } from 'react'
import { Bot, Send, Sparkles, X } from 'lucide-react'
import { closeAiAssistant, toggleAiAssistant } from '../../store/appSlice'
import { useAppDispatch, useAppSelector } from '../../store/hooks'

export function AiAssistantWidget() {
  const dispatch = useAppDispatch()
  const isOpen = useAppSelector((state) => state.app.isAiAssistantOpen)

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
              <div className="ai-assistant-message">
                <span className="ai-assistant-message__avatar" aria-hidden="true">
                  <Bot size={15} strokeWidth={2.2} />
                </span>
                <div className="ai-assistant-message__content">
                  <p>Hello! I'm your AI Assistant for the Annual Operating Plan. How can I help you today?</p>
                  <time>12:55 PM</time>
                </div>
              </div>
            </div>

            <form className="ai-assistant-panel__composer" onSubmit={(event) => event.preventDefault()}>
              <input type="text" aria-label="Ask AI Assistant" placeholder="Ask me anything..." />
              <button type="submit" aria-label="Send message">
                <Send size={18} strokeWidth={2} />
              </button>
            </form>
          </section>
        </>
      ) : null}
    </>
  )
}
