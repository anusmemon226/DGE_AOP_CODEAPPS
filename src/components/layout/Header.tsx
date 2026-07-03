import { useEffect, useRef, useState } from 'react'
import {
  Bell,
  BriefcaseBusiness,
  CalendarDays,
  Check,
  ChevronDown,
  Menu,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sun,
  UserRound,
} from 'lucide-react'
import {
  LANGUAGES,
  type AopRole,
  type LanguageCode,
  type ThemeMode,
} from '../../constants/app'
import {
  fetchAssessmentCycles,
  fetchCurrentUser,
  fetchPlanningInstances,
  setLanguage,
  setSelectedCycle,
  setSelectedRole,
  setThemeMode,
  toggleMobileSidebar,
  toggleNotificationPanel,
} from '../../store/appSlice'
import { initializeUserPipeline, setCurrentRole } from '../../store/userSlice'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { IconButton } from '../ui/IconButton'
import { NotificationPanel } from './NotificationPanel'
import type { DivisionalHierarchyRef, UserRole } from '../../store/userSlice'

/** Map new roleName back to old AopRole for backward compat */
const REVERSE_ROLE_MAP: Record<string, AopRole> = {
  'Division Member': 'AOP - Division Member',
  'Division Director': 'AOP - Division Director',
  'Strategy Team': 'AOP - Strategy Team',
  'PMO': 'AOP - PMO',
  'Procurement Team': 'AOP - Procurement Team',
  'Executive Director': 'AOP - Executive Director',
  'Director General': 'AOP - Director General',
}

const SELECTED_ROLE_STORAGE_KEY = 'aop:selectedRoleAssignmentId'

function getStoredRoleAssignmentId() {
  try {
    return window.localStorage.getItem(SELECTED_ROLE_STORAGE_KEY)
  } catch {
    return null
  }
}

function setStoredRoleAssignmentId(roleId: string) {
  try {
    window.localStorage.setItem(SELECTED_ROLE_STORAGE_KEY, roleId)
  } catch {
    // Ignore storage errors; role selection should still work for the active session.
  }
}

function clearStoredRoleAssignmentId() {
  try {
    window.localStorage.removeItem(SELECTED_ROLE_STORAGE_KEY)
  } catch {
    // Ignore storage errors; invalid persisted role will simply be ignored.
  }
}

function getRoleDisplayName(
  role: UserRole,
  hierarchies: DivisionalHierarchyRef[],
): string {
  const hierarchy = hierarchies.find((h) => h.roleId === role.roleId)
  return hierarchy ? `${role.roleName} - ${hierarchy.shortName}` : role.roleName
}

function formatDisplayDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function formatCompactMonthRange(startDate: string, endDate: string) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
  })

  return `${formatter.format(new Date(startDate))} - ${formatter.format(new Date(endDate))}`
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0].toUpperCase())
    .slice(0, 2)
    .join('')
}

export function Header() {
  const dispatch = useAppDispatch()
  const { assessmentCycles, assessmentCyclesLoading, currentUser, isNotificationPanelOpen, language, notifications, selectedCycle, selectedRole, themeMode } = useAppSelector(
    (state) => state.app,
  )
  const { currentUserRoles, currentRole, currentRolesDivisionalHierarchies, userLoading } = useAppSelector(
    (state) => state.user,
  )
  const [isCycleOpen, setIsCycleOpen] = useState(false)
  const [isRoleOpen, setIsRoleOpen] = useState(false)
  const cycleSwitcherRef = useRef<HTMLDivElement>(null)
  const roleSwitcherRef = useRef<HTMLDivElement>(null)
  const unreadCount = notifications.filter((notification) => notification.unread).length
  const activeCycle = assessmentCycles.find((c) => c.dga_assessment_cycleid === selectedCycle) ?? assessmentCycles[0]

  const showCycleSkeleton = assessmentCyclesLoading && assessmentCycles.length === 0

  // Dynamic role display
  const showRoleSkeleton = userLoading && currentUserRoles.length === 0
  const currentRoleDisplayName = currentRole
    ? getRoleDisplayName(currentRole, currentRolesDivisionalHierarchies)
    : currentUser?.fullname ?? 'Loading...'

  // Fetch cycles, current user, and role pipeline once on mount
  useEffect(() => {
    dispatch(fetchAssessmentCycles())
    dispatch(fetchCurrentUser())
    dispatch(initializeUserPipeline())
  }, [dispatch])

  // Fetch planning instances whenever the selected cycle changes
  useEffect(() => {
    if (selectedCycle) {
      dispatch(fetchPlanningInstances(selectedCycle))
    }
  }, [dispatch, selectedCycle])

  // Restore the last selected role after user roles are loaded.
  useEffect(() => {
    if (currentUserRoles.length === 0) {
      return
    }

    const storedRoleId = getStoredRoleAssignmentId()
    if (!storedRoleId) {
      return
    }

    const storedRole = currentUserRoles.find((role) => role.roleId === storedRoleId)
    if (!storedRole) {
      clearStoredRoleAssignmentId()
      return
    }

    if (currentRole?.roleId !== storedRole.roleId) {
      dispatch(setCurrentRole(storedRole))
    }
  }, [currentRole?.roleId, currentUserRoles, dispatch])

  // Sync selectedRole in appSlice with currentRole in userSlice after pipeline completes
  useEffect(() => {
    if (currentRole) {
      const mapped = REVERSE_ROLE_MAP[currentRole.roleName]
      if (mapped && mapped !== selectedRole) {
        dispatch(setSelectedRole(mapped))
      }
    }
  }, [currentRole, currentUserRoles, dispatch, selectedRole])

  useEffect(() => {
    if (!isCycleOpen) {
      return undefined
    }

    function handlePointerDown(event: PointerEvent) {
      if (!cycleSwitcherRef.current?.contains(event.target as Node)) {
        setIsCycleOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsCycleOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isCycleOpen])

  useEffect(() => {
    if (!isRoleOpen) {
      return undefined
    }

    function handlePointerDown(event: PointerEvent) {
      if (!roleSwitcherRef.current?.contains(event.target as Node)) {
        setIsRoleOpen(false)
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsRoleOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isRoleOpen])

  function nextThemeMode(): ThemeMode {
    return themeMode === 'light' ? 'dark' : 'light'
  }

  return (
    <header className="header">
      <div className="header__title-group">
        <IconButton className="header__menu" label="Open navigation" onClick={() => dispatch(toggleMobileSidebar())}>
          <Menu size={20} />
        </IconButton>
        <div className="header__cycle-switcher" ref={cycleSwitcherRef}>
          <button
            aria-expanded={isCycleOpen}
            aria-haspopup="dialog"
            className="header__cycle-trigger"
            disabled={showCycleSkeleton}
            onClick={() => setIsCycleOpen((open) => !open)}
            type="button"
          >
            {showCycleSkeleton ? (
              <>
                <span className="skeleton-shimmer" style={{ borderRadius: '999px', flex: '0 0 auto', height: '1.35rem', width: '1.35rem' }} />
                <span className="skeleton-shimmer" style={{ borderRadius: '4px', height: '0.7rem', width: '6rem' }} />
                <span className="skeleton-shimmer" style={{ borderRadius: '999px', flex: '0 0 auto', height: '1.25rem', width: '1px' }} />
                <span className="skeleton-shimmer" style={{ borderRadius: '4px', height: '0.7rem', width: '0.85rem', margin: '0 0.05rem' }} />
                <span className="skeleton-shimmer" style={{ borderRadius: '4px', height: '0.7rem', width: '4.5rem' }} />
                <span className="skeleton-shimmer" style={{ borderRadius: '4px', flex: '0 0 auto', height: '0.9rem', width: '0.9rem' }} />
              </>
            ) : (
              <>
                <span className="header__cycle-trigger-icon">
                  <ShieldCheck size={15} />
                </span>
                <strong>{activeCycle?.dga_name ?? 'Select a cycle'}</strong>
                <span className="header__cycle-trigger-divider" />
                <CalendarDays size={15} />
                <span>{activeCycle ? formatCompactMonthRange(activeCycle.dga_scheduled_start_date, activeCycle.dga_scheduled_end_date) : 'No cycle selected'}</span>
                <ChevronDown className={isCycleOpen ? 'header__cycle-trigger-chevron--open' : ''} size={15} />
              </>
            )}
          </button>

          {isCycleOpen ? (
            <div className="cycle-popover" role="dialog" aria-label="Switch cycle">
              <div className="cycle-popover__header">
                <span className="cycle-popover__header-icon">
                  <CalendarDays size={18} />
                </span>
                <div>
                  <strong>Switch Cycle</strong>
                  <span>{assessmentCycles.length} cycles available</span>
                </div>
                <button aria-label="Refresh cycles" type="button">
                  <RefreshCw size={15} />
                </button>
              </div>

              <div className="cycle-popover__list">
                {assessmentCycles.map((cycle) => {
                  const isSelected = cycle.dga_assessment_cycleid === selectedCycle

                  return (
                    <button
                      className={`cycle-popover__item ${isSelected ? 'cycle-popover__item--selected' : ''}`}
                      key={cycle.dga_assessment_cycleid}
                      onClick={() => {
                        dispatch(setSelectedCycle(cycle.dga_assessment_cycleid))
                        setIsCycleOpen(false)
                      }}
                      type="button"
                    >
                      <span className="cycle-popover__check">{isSelected ? <Check size={16} /> : null}</span>
                      <span className="cycle-popover__item-copy">
                        <strong>{cycle.dga_name}</strong>
                        <small>
                          <CalendarDays size={13} />
                          {formatDisplayDate(cycle.dga_scheduled_start_date)} - {formatDisplayDate(cycle.dga_scheduled_end_date)}
                        </small>
                      </span>
                      {isSelected ? <span className="cycle-popover__badge">Current</span> : null}
                    </button>
                  )
                })}
              </div>

              <p>Selecting a cycle filters AOP activity data accordingly.</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="header__controls">
        <div aria-label="Language" className="header__language-toggle" role="group">
          {LANGUAGES.map((languageOption) => (
            <button
              aria-pressed={language === languageOption.value}
              className={`header__language-option ${
                language === languageOption.value ? 'header__language-option--active' : ''
              }`}
              key={languageOption.value}
              onClick={() => dispatch(setLanguage(languageOption.value as LanguageCode))}
              type="button"
            >
              {languageOption.value.toUpperCase()}
            </button>
          ))}
        </div>
        <IconButton
          className="header__round-control"
          label={`Switch to ${nextThemeMode()} mode`}
          onClick={() => dispatch(setThemeMode(nextThemeMode()))}
        >
          {themeMode === 'light' ? <Moon size={16} /> : <Sun size={16} />}
        </IconButton>
        <div className="header__notification-control">
          <IconButton
            className="header__round-control"
            isActive={isNotificationPanelOpen}
            label="Open notifications"
            onClick={() => dispatch(toggleNotificationPanel())}
          >
            <Bell size={16} />
          </IconButton>
          {unreadCount > 0 ? <span className="header__notification-count">{unreadCount}</span> : null}
          {isNotificationPanelOpen ? <NotificationPanel /> : null}
        </div>
        <div className="header__role-switcher" ref={roleSwitcherRef}>
          <button
            aria-label={`Current role: ${currentRoleDisplayName}`}
            aria-expanded={isRoleOpen}
            aria-haspopup="dialog"
            className="header__role-trigger"
            disabled={showRoleSkeleton}
            onClick={() => setIsRoleOpen((open) => !open)}
            title={`Current role: ${currentRoleDisplayName}`}
            type="button"
          >
            {showRoleSkeleton ? (
              <>
                <span className="skeleton-shimmer" style={{ borderRadius: '999px', flex: '0 0 auto', height: '1.55rem', width: '1.55rem' }} />
                <span className="skeleton-shimmer" style={{ borderRadius: '4px', height: '0.7rem', width: '7rem' }} />
                <span className="skeleton-shimmer" style={{ borderRadius: '4px', flex: '0 0 auto', height: '0.85rem', width: '0.85rem' }} />
              </>
            ) : (
              <>
                <span className="header__avatar">{getInitials(currentUser?.fullname)}</span>
                <span className="header__user-info">
                  <span className="header__user-name">{currentUser?.fullname ?? 'User'}</span>
                  <span className="header__role-name">{currentRoleDisplayName}</span>
                </span>
                <ChevronDown className={isRoleOpen ? 'header__role-chevron--open' : ''} size={14} />
              </>
            )}
          </button>

          {isRoleOpen ? (
            <div className="role-popover" role="dialog" aria-label="Profile and role">
              <div className="role-popover__account">
                <span className="header__avatar role-popover__avatar">
                  {currentUser?.entityimage_url
                    ? <img alt="Avatar" className="header__avatar-img" src={currentUser.entityimage_url} />
                    : getInitials(currentUser?.fullname)}
                </span>
                <span>
                  <strong>{currentUser?.fullname ?? 'User'}</strong>
                  <small>{currentUser?.internalemailaddress ?? ''}</small>
                </span>
              </div>

              <span className="role-popover__label">Current Role</span>
              <div className="role-popover__list">
                {currentUserRoles.length === 0 ? (
                  <div className="role-popover__empty">No roles assigned</div>
                ) : (
                  currentUserRoles.map((role) => {
                    const isSelected = currentRole?.roleId === role.roleId
                    const displayName = getRoleDisplayName(role, currentRolesDivisionalHierarchies)
                    const hierarchy = currentRolesDivisionalHierarchies.find((h) => h.roleId === role.roleId)

                    return (
                      <button
                        className={`role-popover__item ${isSelected ? 'role-popover__item--selected' : ''}`}
                        key={role.roleId}
                        onClick={() => {
                          setStoredRoleAssignmentId(role.roleId)
                          dispatch(setCurrentRole(role))
                          // Backward compat: set old-style selectedRole for other pages
                          const mapped = REVERSE_ROLE_MAP[role.roleName]
                          if (mapped) {
                            dispatch(setSelectedRole(mapped))
                          }
                          setIsRoleOpen(false)
                        }}
                        type="button"
                      >
                        <span className="role-popover__item-icon">
                          <UserRound size={15} />
                        </span>
                        <span className="role-popover__item-copy">
                          <strong>{displayName}</strong>
                          <small>{hierarchy?.hierarchyName ?? 'Organization role'}</small>
                        </span>
                        {isSelected ? <Check size={16} /> : null}
                      </button>
                    )
                  })
                )}
              </div>

              <button className="role-popover__profile" type="button">
                <BriefcaseBusiness size={15} />
                <span>Manage Profile</span>
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
