import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { getNavigationForRole } from '../../utils/permissions'
import { closeMobileSidebar, toggleSidebarCollapsed } from '../../store/appSlice'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { IconButton } from '../ui/IconButton'
import type { DivisionalHierarchyRef, UserRole } from '../../store/userSlice'

function getRoleDisplayName(
  role: UserRole,
  hierarchies: DivisionalHierarchyRef[],
): string {
  const hierarchy = hierarchies.find((h) => h.roleId === role.roleId)
  return hierarchy ? `${role.roleName} - ${hierarchy.shortName}` : role.roleName
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .slice(0, 2)
    .join('')
}

export function Sidebar() {
  const dispatch = useAppDispatch()
  const { isMobileSidebarOpen, isSidebarCollapsed, selectedRole } = useAppSelector((state) => state.app)
  const { currentRole, currentRolesDivisionalHierarchies } = useAppSelector((state) => state.user)
  const navigationItems = getNavigationForRole(selectedRole)
  const displayName = currentRole
    ? getRoleDisplayName(currentRole, currentRolesDivisionalHierarchies)
    : 'No role assigned'

  return (
    <>
      <div
        className={`layout-backdrop ${isMobileSidebarOpen ? 'layout-backdrop--visible' : ''}`}
        onClick={() => dispatch(closeMobileSidebar())}
      />
      <aside
        className={`sidebar ${isSidebarCollapsed ? 'sidebar--collapsed' : ''} ${
          isMobileSidebarOpen ? 'sidebar--mobile-open' : ''
        }`}
      >
        <div className="sidebar__brand">
          <div className="sidebar__brand-mark">
            <img alt="" src="/logo.png" />
          </div>
          <div className="sidebar__brand-copy">
            <span>Digital Connect</span>
            <strong>Annual Operating Plan</strong>
          </div>
          <IconButton
            className="sidebar__collapse"
            label={isSidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}
            onClick={() => dispatch(toggleSidebarCollapsed())}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </IconButton>
          <IconButton className="sidebar__mobile-close" label="Close navigation" onClick={() => dispatch(closeMobileSidebar())}>
            <X size={18} />
          </IconButton>
        </div>

        <nav aria-label="Primary navigation" className="sidebar__nav">
          {navigationItems.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                aria-label={item.label}
                className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
                key={item.id}
                onClick={() => dispatch(closeMobileSidebar())}
                to={item.path}
                title={item.label}
              >
                <Icon aria-hidden="true" size={18} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__role-card" title={displayName}>
            <span className="sidebar__role-eyebrow">Current Role</span>
            <span className="sidebar__role-content">
              <span className="sidebar__role-initials">{getInitials(displayName)}</span>
              <span className="sidebar__role-copy">
                <strong>{displayName}</strong>
                <small>{currentRolesDivisionalHierarchies.find((h) => h.roleId === currentRole?.roleId)?.hierarchyName ?? 'Organization role'}</small>
              </span>
            </span>
          </div>
        </div>
      </aside>
    </>
  )
}
