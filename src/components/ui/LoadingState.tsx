import './ui.css'

type LoadingStateProps = {
  label?: string
}

export function LoadingState({ label = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="loading-state" role="status">
      <span className="loading-state__spinner" />
      <span>{label}</span>
    </div>
  )
}
