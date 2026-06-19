// ── Date / Quarter Helpers ──

export function getQuarter(dateString: string): string {
  if (!dateString) return ''
  const month = new Date(dateString).getMonth() // 0-11
  if (month <= 2) return 'Quarter 1'
  if (month <= 5) return 'Quarter 2'
  if (month <= 8) return 'Quarter 3'
  return 'Quarter 4'
}

export function formatDate(dateString: string): string {
  if (!dateString) return ''
  const d = new Date(dateString)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
