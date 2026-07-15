import { Bot, Sparkles } from 'lucide-react'
import type { AiSummaryBlocks, AiSummaryMeta } from './types/aiSummaryTypes'

type AiSummaryPanelProps = {
  error?: string
  isLoading?: boolean
  meta?: AiSummaryMeta
  summaries?: AiSummaryBlocks
  title: string
}

export function AiSummaryPanel({
  error,
  isLoading = false,
  summaries,
  title,
}: AiSummaryPanelProps) {
  const sharedSummary = summaries?.summary?.trim()
  const hasSummary = Boolean(sharedSummary)

  return (
    <section
      aria-label={`${title} AI summary`}
      className="ai-summary-card"
    >
      <div className="ai-summary-card__header">
        <div className="ai-summary-card__brand">
          <div className="ai-summary-card__icon-wrapper" aria-hidden="true">
            <Sparkles size={16} className="ai-summary-card__sparkle-icon" />
          </div>
          <div className="ai-summary-card__titles">
            <h2 className="ai-summary-card__title">{title}</h2>
            <p className="ai-summary-card__description">AI-generated summary based on the latest saved activity data.</p>
          </div>
        </div>
      </div>

      <div className="ai-summary-card__body">
        {isLoading ? (
          <div className="ai-summary-card__state ai-summary-card__state--loading">
            <Bot size={18} className="ai-summary-card__bot-pulse" />
            <span>Analyzing details and generating modern summary...</span>
          </div>
        ) : error ? (
          <div className="ai-summary-card__state ai-summary-card__state--error">
            <Bot size={18} />
            <span>{error}</span>
          </div>
        ) : (
          <div className="ai-summary-card__grid">
            <article className={`ai-summary-block ai-summary-block--shared${hasSummary ? '' : ' ai-summary-block--empty'}`}>
              <header className="ai-summary-block__header">
                <span className="ai-summary-badge ai-summary-badge--shared">AI Summary</span>
              </header>
              <p className="ai-summary-block__text">
                {sharedSummary || 'AI summary is not available yet. Save or update this activity to generate the latest summary.'}
              </p>
            </article>
          </div>
        )}
      </div>
    </section>
  )
}
