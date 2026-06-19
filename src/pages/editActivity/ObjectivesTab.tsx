import { Target } from 'lucide-react'

export function ObjectivesTab() {
  return (
    <div className="edit-activity__objectives">
      <div className="edit-activity__objectives-header">
        <div className="edit-activity__objectives-header-left">
          <Target size={18} />
          <span>Objectives</span>
        </div>
      </div>
      <div className="edit-activity__placeholder">
        Objectives management will appear here.
      </div>
    </div>
  )
}
