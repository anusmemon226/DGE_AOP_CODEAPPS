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
  AOP_CYCLES,
  AOP_ROLE_DISPLAY,
  AOP_ROLES,
  LANGUAGES,
  type LanguageCode,
  type ThemeMode,
} from '../../constants/app'
import {
  setLanguage,
  setSelectedCycle,
  setSelectedRole,
  setThemeMode,
  toggleMobileSidebar,
  toggleNotificationPanel,
} from '../../store/appSlice'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { IconButton } from '../ui/IconButton'
import { NotificationPanel } from './NotificationPanel'

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

export function Header() {
  const dispatch = useAppDispatch()
  const { isNotificationPanelOpen, language, notifications, selectedCycle, selectedRole, themeMode } = useAppSelector(
    (state) => state.app,
  )
  const [isCycleOpen, setIsCycleOpen] = useState(false)
  const [isRoleOpen, setIsRoleOpen] = useState(false)
  const cycleSwitcherRef = useRef<HTMLDivElement>(null)
  const roleSwitcherRef = useRef<HTMLDivElement>(null)
  const unreadCount = notifications.filter((notification) => notification.unread).length
  const activeCycle = AOP_CYCLES.find((cycle) => cycle.id === selectedCycle) ?? AOP_CYCLES[0]
  const activeRole = AOP_ROLE_DISPLAY[selectedRole]

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
            onClick={() => setIsCycleOpen((open) => !open)}
            type="button"
          >
            <span className="header__cycle-trigger-icon">
              <ShieldCheck size={15} />
            </span>
            <strong>{activeCycle.name}</strong>
            <span className="header__cycle-trigger-divider" />
            <CalendarDays size={15} />
            <span>{formatCompactMonthRange(activeCycle.startDate, activeCycle.endDate)}</span>
            <ChevronDown className={isCycleOpen ? 'header__cycle-trigger-chevron--open' : ''} size={15} />
          </button>

          {isCycleOpen ? (
            <div className="cycle-popover" role="dialog" aria-label="Switch cycle">
              <div className="cycle-popover__header">
                <span className="cycle-popover__header-icon">
                  <CalendarDays size={18} />
                </span>
                <div>
                  <strong>Switch Cycle</strong>
                  <span>{AOP_CYCLES.length} cycles available</span>
                </div>
                <button aria-label="Refresh cycles" type="button">
                  <RefreshCw size={15} />
                </button>
              </div>

              <div className="cycle-popover__list">
                {AOP_CYCLES.map((cycle) => {
                  const isSelected = cycle.id === selectedCycle

                  return (
                    <button
                      className={`cycle-popover__item ${isSelected ? 'cycle-popover__item--selected' : ''}`}
                      key={cycle.id}
                      onClick={() => {
                        dispatch(setSelectedCycle(cycle.id))
                        setIsCycleOpen(false)
                      }}
                      type="button"
                    >
                      <span className="cycle-popover__check">{isSelected ? <Check size={16} /> : null}</span>
                      <span className="cycle-popover__item-copy">
                        <strong>{cycle.name}</strong>
                        <small>
                          <CalendarDays size={13} />
                          {formatDisplayDate(cycle.startDate)} - {formatDisplayDate(cycle.endDate)}
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
            aria-label={`Current role: ${activeRole.label}`}
            aria-expanded={isRoleOpen}
            aria-haspopup="dialog"
            className="header__role-trigger"
            onClick={() => setIsRoleOpen((open) => !open)}
            title={`Current role: ${activeRole.label}`}
            type="button"
          >
            <span className="header__avatar">DC</span>
            <span>Digital Connect - UAT01</span>
            <ChevronDown className={isRoleOpen ? 'header__role-chevron--open' : ''} size={14} />
          </button>

          {isRoleOpen ? (
            <div className="role-popover" role="dialog" aria-label="Profile and role">
              <div className="role-popover__account">
                <span className="header__avatar role-popover__avatar">DC</span>
                <span>
                  <strong>Digital Connect - UAT01</strong>
                  <small>Digital Governance Unit</small>
                </span>
              </div>

              <span className="role-popover__label">Current Role</span>
              <div className="role-popover__list">
                {AOP_ROLES.map((role) => {
                  const isSelected = role === selectedRole
                  const roleCopy = AOP_ROLE_DISPLAY[role]

                  return (
                    <button
                      className={`role-popover__item ${isSelected ? 'role-popover__item--selected' : ''}`}
                      key={role}
                      onClick={() => {
                        dispatch(setSelectedRole(role))
                        setIsRoleOpen(false)
                      }}
                      type="button"
                    >
                      <span className="role-popover__item-icon">
                        <UserRound size={15} />
                      </span>
                      <span className="role-popover__item-copy">
                        <strong>{roleCopy.label}</strong>
                        <small>{roleCopy.description}</small>
                      </span>
                      {isSelected ? <Check size={16} /> : null}
                    </button>
                  )
                })}
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
