import { PanelLeftClose, PanelLeftOpen, X } from 'lucide-react'
import { AOP_ROLES, type AopRole } from '../../constants/app'
import { getNavigationForRole } from '../../utils/permissions'
import { closeMobileSidebar, setSelectedRole, toggleSidebarCollapsed } from '../../store/appSlice'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { IconButton } from '../ui/IconButton'
import { Select } from '../ui/Select'

const roleDescriptions: Record<AopRole, string> = {
  'AOP - Division Member': 'Division workspace access',
  'AOP - Division Director': 'Division review access',
  'AOP - Strategy Team': 'Strategy oversight access',
  'AOP - PMO': 'Portfolio management access',
  'AOP - Procurement Team': 'Procurement planning access',
  'AOP - Executive Director': 'Sector approval access',
  'AOP - Director General': 'Executive approval access',
}

const roleOptions = AOP_ROLES.map((role) => ({
  value: role,
  label: role.replace('AOP - ', ''),
  description: roleDescriptions[role],
}))

export function Sidebar() {
  const dispatch = useAppDispatch()
  const { isMobileSidebarOpen, isSidebarCollapsed, selectedRole } = useAppSelector((state) => state.app)
  const navigationItems = getNavigationForRole(selectedRole)

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
          <IconButton className="sidebar__mobile-close" label="Close navigation" onClick={() => dispatch(closeMobileSidebar())}>
            <X size={18} />
          </IconButton>
        </div>

        <nav aria-label="Primary navigation" className="sidebar__nav">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = item.id === 'dashboard'

            return (
              <a
                aria-label={item.label}
                className={`sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
                href={item.href}
                key={item.id}
                title={item.label}
              >
                <Icon aria-hidden="true" size={18} />
                <span>{item.label}</span>
              </a>
            )
          })}
        </nav>

        <div className="sidebar__footer">
          <Select<AopRole>
            className="sidebar__role-select"
            hideLabel
            id="sidebar-role-selector"
            label="Current role"
            options={roleOptions}
            value={selectedRole}
            onChange={(value) => dispatch(setSelectedRole(value))}
            renderValue={(option) => (
              <span className="sidebar__role-value">
                <span className="sidebar__role-full">{option.label}</span>
                <span className="sidebar__role-initials">
                  {option.label
                    .split(' ')
                    .map((part) => part[0])
                    .join('')
                    .slice(0, 2)}
                </span>
              </span>
            )}
          />
          <IconButton
            className="sidebar__collapse"
            label={isSidebarCollapsed ? 'Expand navigation' : 'Collapse navigation'}
            onClick={() => dispatch(toggleSidebarCollapsed())}
          >
            {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </IconButton>
        </div>
      </aside>
    </>
  )
}
