const DATE_PARTS_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/

export function formatDateDisplay(value?: string | null) {
  if (!value) {
    return ''
  }

  const [datePart] = value.split('T')
  const [year, month, day] = datePart.split('-')

  if (!year || !month || !day) {
    return value
  }

  return `${day}/${month}/${year}`
}

export function parseDateInput(value: string) {
  const match = DATE_PARTS_REGEX.exec(value.trim())

  if (!match) {
    return null
  }

  const [, day, month, year] = match
  const parsed = new Date(Number(year), Number(month) - 1, Number(day))

  if (
    parsed.getFullYear() !== Number(year) ||
    parsed.getMonth() !== Number(month) - 1 ||
    parsed.getDate() !== Number(day)
  ) {
    return null
  }

  return `${year}-${month}-${day}`
}

export function formatCurrencyAmount(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') {
    return ''
  }

  const numericValue = typeof value === 'number' ? value : Number(value)

  if (Number.isNaN(numericValue)) {
    return ''
  }

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 2,
    minimumFractionDigits: numericValue % 1 === 0 ? 0 : 2,
  }).format(numericValue)
}
