/**
 * Maps Dataverse security role names to canonical AOP display names.
 * Used when filtering AOP roles and constructing the dropdown label.
 */
export const AOP_ROLES_MAPPING: Record<string, string> = {
  'AOP - Division Member': 'Division Member',
  'AOP - Division Director': 'Division Director',
  'AOP - Strategy Team': 'Strategy Team',
  'AOP - PMO': 'PMO',
  'AOP - Procurement Team': 'Procurement Team',
  'AOP - Executive Director': 'Executive Director',
  'AOP - Director General': 'Director General',
}

const NORMALIZED_AOP_ROLES = Object.entries(AOP_ROLES_MAPPING).map(
  ([dataverseName, displayName]) => ({
    dataverseName,
    displayName,
    normalizedName: normalizeRoleName(dataverseName),
  }),
)

function normalizeRoleName(roleName: string): string {
  return roleName
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s+role$/i, '')
    .trim()
}

function findAopRole(roleName: string) {
  const normalizedRoleName = normalizeRoleName(roleName)

  return NORMALIZED_AOP_ROLES.find(
    (role) =>
      normalizedRoleName === role.normalizedName ||
      normalizedRoleName.includes(role.normalizedName),
  )
}

/**
 * Returns true if the role name is an AOP role (excluding admin/sys roles).
 */
export function isAopRole(roleName: string): boolean {
  const lower = roleName.toLowerCase()
  return Boolean(findAopRole(roleName)) && !lower.includes('admin')
}

/**
 * Returns the short display label for a Dataverse role name.
 */
export function getAopRoleLabel(roleName: string): string {
  return findAopRole(roleName)?.displayName ?? roleName
}

/**
 * Returns true if the role is organisation-wide (no divisional hierarchy).
 */
export function isOrgWideRole(roleName: string): boolean {
  const label = getAopRoleLabel(roleName).toLowerCase()
  return (
    label.includes('strategy team') ||
    label.includes('pmo') ||
    label.includes('procurement team') ||
    label.includes('director general')
  )
}
