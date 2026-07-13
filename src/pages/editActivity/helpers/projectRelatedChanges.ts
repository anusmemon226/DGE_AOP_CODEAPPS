export type ProjectRelatedChange = {
  new_value?: unknown
  old_value: unknown
  planned_value?: unknown
}

export type ProjectRelatedRecord = ProjectRelatedChanges & {
  id?: string
  month_name?: string
  name?: string
}

export type ProjectRelatedChanges = {
  [key: string]:
    | ProjectRelatedChange
    | ProjectRelatedChanges
    | ProjectRelatedRecord[]
    | string
    | number
    | boolean
    | null
    | undefined
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

export function parseProjectRelatedChanges(value?: string | null): ProjectRelatedChanges {
  if (!value?.trim()) {
    return {}
  }

  try {
    const parsed = JSON.parse(value) as unknown

    if (!isPlainObject(parsed)) {
      return {}
    }

    return parsed as ProjectRelatedChanges
  } catch {
    return {}
  }
}

export function isRelatedChange(value: unknown): value is ProjectRelatedChange {
  return isPlainObject(value) && ('old_value' in value || 'new_value' in value || 'planned_value' in value)
}

function normalizeRecordId(value: unknown) {
  return cleanRecordId(String(value ?? ''))
}

function legacyRecordMapToArray(source: unknown): ProjectRelatedRecord[] {
  if (!isPlainObject(source)) return []

  return Object.entries(source)
    .filter((entry): entry is [string, ProjectRelatedChanges] => isPlainObject(entry[1]))
    .map(([id, record]) => ({
      id: cleanRecordId(id),
      ...record,
    }))
}

export function normalizeProjectRelatedChangesShape(changes: ProjectRelatedChanges): ProjectRelatedChanges {
  const normalized: ProjectRelatedChanges = { ...changes }

  const milestones = normalized.milestones
  if (isPlainObject(milestones) && Array.isArray((milestones as Record<string, unknown>).records)) {
    normalized.milestones = (milestones as Record<string, unknown>).records as ProjectRelatedRecord[]
  } else if (isPlainObject(milestones) && isPlainObject((milestones as Record<string, unknown>).by_record)) {
    normalized.milestones = legacyRecordMapToArray((milestones as Record<string, unknown>).by_record)
  }

  const procurements = normalized.procurements
  if (isPlainObject(procurements) && Array.isArray((procurements as Record<string, unknown>).records)) {
    normalized.procurements = (procurements as Record<string, unknown>).records as ProjectRelatedRecord[]
  } else if (isPlainObject(procurements) && isPlainObject((procurements as Record<string, unknown>).by_record)) {
    normalized.procurements = legacyRecordMapToArray((procurements as Record<string, unknown>).by_record)
  }

  const budget = normalized.budget
  if (isPlainObject(budget) && Array.isArray((budget as Record<string, unknown>).records)) {
    normalized.budget = (budget as Record<string, unknown>).records as ProjectRelatedRecord[]
  } else if (isPlainObject(budget) && isPlainObject((budget as Record<string, unknown>).by_month)) {
    normalized.budget = legacyRecordMapToArray((budget as Record<string, unknown>).by_month)
  }

  return normalized
}

function mergeProjectRelatedRecords(
  base: ProjectRelatedRecord[],
  override: ProjectRelatedRecord[],
): ProjectRelatedRecord[] {
  const merged = base.map((record) => ({ ...record }))

  override.forEach((record) => {
    const recordId = normalizeRecordId(record.id)
    const existingIndex = recordId
      ? merged.findIndex((existing) => normalizeRecordId(existing.id) === recordId)
      : -1

    if (existingIndex >= 0) {
      merged[existingIndex] = {
        ...mergeProjectRelatedChanges(
          merged[existingIndex] as ProjectRelatedChanges,
          record as ProjectRelatedChanges,
        ),
        id: merged[existingIndex].id ?? record.id,
      }
      return
    }

    merged.push(record)
  })

  return merged
}

export function mergeProjectRelatedChanges(base: ProjectRelatedChanges, override: ProjectRelatedChanges): ProjectRelatedChanges {
  const normalizedBase = normalizeProjectRelatedChangesShape(base)
  const normalizedOverride = normalizeProjectRelatedChangesShape(override)
  const merged: ProjectRelatedChanges = { ...normalizedBase }

  Object.entries(normalizedOverride).forEach(([key, value]) => {
    const existingValue = merged[key]

    if (Array.isArray(existingValue) && Array.isArray(value)) {
      merged[key] = mergeProjectRelatedRecords(existingValue, value)
      return
    }

    if (isPlainObject(existingValue) && isPlainObject(value) && !isRelatedChange(existingValue) && !isRelatedChange(value)) {
      merged[key] = mergeProjectRelatedChanges(existingValue as ProjectRelatedChanges, value as ProjectRelatedChanges)
      return
    }

    if (isRelatedChange(existingValue) && isRelatedChange(value)) {
      merged[key] = {
        ...existingValue,
        ...value,
        new_value: value.new_value === undefined || value.new_value === ''
          ? existingValue.new_value ?? ''
          : value.new_value,
        planned_value: value.planned_value === undefined
          ? existingValue.planned_value
          : value.planned_value,
      }
      return
    }

    merged[key] = value
  })

  return merged
}

export function stringifyMergedProjectRelatedChanges(
  existingValue: string | null | undefined,
  changes: ProjectRelatedChanges,
) {
  return JSON.stringify(mergeProjectRelatedChanges(parseProjectRelatedChanges(existingValue), changes))
}

export function getProjectRelatedChangeAt(changes: ProjectRelatedChanges, path: string[]): ProjectRelatedChange | undefined {
  let current: unknown = changes

  for (const segment of path) {
    if (!isPlainObject(current)) {
      return undefined
    }

    current = (current as ProjectRelatedChanges)[segment]
  }

  return isRelatedChange(current) ? current : undefined
}

export function getProjectRelatedRecords(
  changes: ProjectRelatedChanges,
  sectionName: 'budget' | 'milestones' | 'procurements',
): ProjectRelatedRecord[] {
  const normalized = normalizeProjectRelatedChangesShape(changes)
  const section = normalized[sectionName]

  if (Array.isArray(section)) {
    return section.filter((record): record is ProjectRelatedRecord => isPlainObject(record))
  }

  return []
}

export function getProjectRelatedRecord(
  changes: ProjectRelatedChanges,
  sectionName: 'budget' | 'milestones' | 'procurements',
  recordId: string,
): ProjectRelatedRecord | undefined {
  const normalizedRecordId = cleanRecordId(recordId)

  return getProjectRelatedRecords(changes, sectionName).find((record) => (
    normalizeRecordId(record.id) === normalizedRecordId
  ))
}

export function getProjectRelatedRecordChange(
  changes: ProjectRelatedChanges,
  sectionName: 'budget' | 'milestones' | 'procurements',
  recordId: string,
  fieldName: string,
): ProjectRelatedChange | undefined {
  const record = getProjectRelatedRecord(changes, sectionName, recordId)
  const value = record?.[fieldName]
  return isRelatedChange(value) ? value : undefined
}

export function isEmptyRelatedValue(value: unknown) {
  return value === undefined || value === null || String(value).trim() === ''
}

export function resolveProjectRelatedValue(change: ProjectRelatedChange | undefined): unknown {
  if (!change) return undefined

  if (isEmptyRelatedValue(change.new_value)) {
    return change.old_value
  }

  if (String(change.old_value ?? '') === String(change.new_value ?? '')) {
    return change.new_value
  }

  return change.old_value
}

export function relatedOldValue(value: unknown, plannedValue?: unknown): ProjectRelatedChange {
  return {
    ...(plannedValue !== undefined ? { planned_value: plannedValue } : {}),
    old_value: value ?? '',
  }
}

export function cleanRecordId(id?: string | null) {
  return id?.replace(/[{}]/g, '') || ''
}
