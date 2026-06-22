import type { SelectOption } from '../../components/ui'

export const ADGE_OPTIONS: readonly SelectOption<string>[] = [
  { label: 'Abu Dhabi Testing', value: 'adge-1' },
  { label: 'Test New ADGE', value: 'adge-2' },
] as const

/**
 * Sector / Division hierarchy for the Engagement Visibility picker.
 * Hardcoded for now; will be fetched from API later.
 */
export type SectorDivision = {
  sectorId: string
  sectorName: string
  divisions: { divisionId: string; divisionName: string }[]
}

export const SECTOR_DIVISIONS: SectorDivision[] = [
  {
    sectorId: 'sector-ai',
    sectorName: 'Government AI Sector',
    divisions: [
      { divisionId: 'div-ism', divisionName: 'Information Security Risk Management & Compliance' },
      { divisionId: 'div-cti', divisionName: 'Cyber Threat Intelligence' },
      { divisionId: 'div-dbc', divisionName: 'Digital Business Continuity' },
    ],
  },
  {
    sectorId: 'sector-cdp',
    sectorName: 'Government Common Digital Platforms',
    divisions: [
      { divisionId: 'div-gcdp', divisionName: 'Gov. Common Digital Platforms' },
      { divisionId: 'div-gcs', divisionName: 'Government Common Solutions' },
      { divisionId: 'div-aai', divisionName: 'Advanced Automation & Integration' },
    ],
  },
]

/** Flatten all division IDs for quick lookups */
export function getAllDivisionIds(): string[] {
  return SECTOR_DIVISIONS.flatMap((s) => s.divisions.map((d) => d.divisionId))
}

/** Get the sector ID that owns a given division ID */
export function getSectorIdForDivision(divisionId: string): string | undefined {
  return SECTOR_DIVISIONS.find((s) => s.divisions.some((d) => d.divisionId === divisionId))?.sectorId
}

/** Get all division IDs for a given sector */
export function getDivisionIdsForSector(sectorId: string): string[] {
  return SECTOR_DIVISIONS.find((s) => s.sectorId === sectorId)?.divisions.map((d) => d.divisionId) ?? []
}

/** Get display label for a value (sector or division ID) */
export function getVisibilityLabel(value: string): string {
  for (const sector of SECTOR_DIVISIONS) {
    if (sector.sectorId === value) return sector.sectorName
    const div = sector.divisions.find((d) => d.divisionId === value)
    if (div) return div.divisionName
  }
  return value
}

/** Get sector names from a list of visibility IDs */
export function getSelectedSectorNames(visibilityIds: string[]): string[] {
  const names = new Set<string>()
  for (const id of visibilityIds) {
    const sector = SECTOR_DIVISIONS.find((s) => s.sectorId === id)
    if (sector) {
      names.add(sector.sectorName)
    } else {
      // It might be a division — find its parent sector
      const parent = SECTOR_DIVISIONS.find((s) => s.divisions.some((d) => d.divisionId === id))
      if (parent) names.add(parent.sectorName)
    }
  }
  return Array.from(names)
}

/** Get division names from a list of visibility IDs */
export function getSelectedDivisionNames(visibilityIds: string[]): string[] {
  const names: string[] = []
  for (const id of visibilityIds) {
    for (const sector of SECTOR_DIVISIONS) {
      const div = sector.divisions.find((d) => d.divisionId === id)
      if (div) {
        names.push(div.divisionName)
        break
      }
    }
  }
  return names
}

// ── Activity Status / Publish Status options ──

export const ACTIVITY_STATUS_OPTIONS: readonly SelectOption<string>[] = [
  { label: 'Select status', value: '' },
  { label: 'Planning', value: 'planning' },
  { label: 'In Progress', value: 'in-progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'On Hold', value: 'on-hold' },
] as const

export const PUBLISH_STATUS_OPTIONS: readonly SelectOption<string>[] = [
  { label: 'Select publish status', value: '' },
  { label: 'Draft', value: 'draft' },
  { label: 'Published', value: 'published' },
  { label: 'Archived', value: 'archived' },
] as const

export const ACTIVITY_STATUS_TONES: Record<string, 'neutral' | 'info' | 'success' | 'warning'> = {
  planning: 'info',
  'in-progress': 'info',
  completed: 'success',
  'on-hold': 'warning',
}

export const PUBLISH_STATUS_TONES: Record<string, 'neutral' | 'info' | 'success' | 'warning'> = {
  draft: 'neutral',
  published: 'success',
  archived: 'neutral',
}
