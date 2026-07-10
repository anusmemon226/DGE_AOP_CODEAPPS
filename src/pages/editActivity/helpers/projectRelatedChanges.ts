export type ProjectRelatedChange = {
  new_value?: unknown
  old_value: unknown
  planned_value?: unknown
}

export type ProjectRelatedChanges = {
  [key: string]: ProjectRelatedChange | ProjectRelatedChanges | string | number | boolean | null | undefined
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

export function mergeProjectRelatedChanges(base: ProjectRelatedChanges, override: ProjectRelatedChanges): ProjectRelatedChanges {
  const merged: ProjectRelatedChanges = { ...base }

  Object.entries(override).forEach(([key, value]) => {
    const existingValue = merged[key]

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
