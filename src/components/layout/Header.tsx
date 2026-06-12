import { Bell, CalendarDays, Check, Menu, Moon, Sun } from 'lucide-react'
import {
  AOP_CYCLES,
  LANGUAGES,
  type CycleId,
  type LanguageCode,
  type ThemeMode,
} from '../../constants/app'
import {
  setDefaultCycle,
  setLanguage,
  setSelectedCycle,
  setThemeMode,
  toggleMobileSidebar,
  toggleNotificationPanel,
} from '../../store/appSlice'
import { useAppDispatch, useAppSelector } from '../../store/hooks'
import { IconButton } from '../ui/IconButton'
import { Select } from '../ui/Select'
import { NotificationPanel } from './NotificationPanel'

const languageOptions = LANGUAGES.map((language) => ({ value: language.value, label: language.label }))

function formatDisplayDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

export function Header() {
  const dispatch = useAppDispatch()
  const { defaultCycleId, isNotificationPanelOpen, language, notifications, selectedCycle, themeMode } = useAppSelector(
    (state) => state.app,
  )
  const unreadCount = notifications.filter((notification) => notification.unread).length
  const cycleOptions = AOP_CYCLES.map((cycle) => ({
    value: cycle.id,
    label: cycle.name,
    description: `${formatDisplayDate(cycle.startDate)} - ${formatDisplayDate(cycle.endDate)}`,
    meta: cycle.status,
    badge: cycle.id === defaultCycleId ? 'Default' : undefined,
    actionLabel: cycle.id === defaultCycleId ? undefined : 'Make Default',
    onAction: cycle.id === defaultCycleId ? undefined : () => dispatch(setDefaultCycle(cycle.id)),
  }))

  function nextThemeMode(): ThemeMode {
    return themeMode === 'light' ? 'dark' : 'light'
  }

  return (
    <header className="header">
      <div className="header__title-group">
        <IconButton className="header__menu" label="Open navigation" onClick={() => dispatch(toggleMobileSidebar())}>
          <Menu size={20} />
        </IconButton>
        <div className="header__control-group header__cycle-group">
          <Select<CycleId>
            className="header__cycle-select"
            hideLabel
            id="cycle-selector"
            label="Cycle"
            options={cycleOptions}
            value={selectedCycle}
            onChange={(value) => dispatch(setSelectedCycle(value))}
            menuHeader={
              <div className="header__cycle-menu-header">
                <strong>Select Cycle</strong>
                <span>Choose a planning cycle</span>
              </div>
            }
            renderOption={(option, isSelected) => (
              <>
                <span className="header__cycle-option-icon">
                  <CalendarDays aria-hidden="true" size={17} />
                </span>
                <span className="header__cycle-option-copy">
                  <span className="header__cycle-option-title">
                    <strong>{option.label}</strong>
                    {option.badge ? <span>{option.badge}</span> : null}
                  </span>
                  <small>{option.description}</small>
                  {!option.badge && option.onAction ? (
                    <button
                      className="header__cycle-option-action"
                      onClick={(event) => {
                        event.stopPropagation()
                        option.onAction?.()
                      }}
                      type="button"
                    >
                      Make Default
                    </button>
                  ) : null}
                </span>
                {isSelected ? <Check aria-hidden="true" className="header__cycle-option-check" size={17} /> : null}
              </>
            )}
            renderValue={(option) => (
              <span className="header__cycle-value">
                <span className="header__cycle-copy">
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </span>
                {option.badge ? <span className="header__cycle-badge">{option.badge}</span> : null}
              </span>
            )}
          />
        </div>
      </div>

      <div className="header__controls">
        <div className="header__control-group">
        <Select<LanguageCode>
          hideLabel
          id="language-selector"
          label="Language"
          options={languageOptions}
          value={language}
          onChange={(value) => dispatch(setLanguage(value))}
        />
        </div>
        <IconButton label={`Switch to ${nextThemeMode()} mode`} onClick={() => dispatch(setThemeMode(nextThemeMode()))}>
          {themeMode === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </IconButton>
        <div className="header__notification-control">
          <IconButton
            isActive={isNotificationPanelOpen}
            label="Open notifications"
            onClick={() => dispatch(toggleNotificationPanel())}
          >
            <Bell size={18} />
          </IconButton>
          {unreadCount > 0 ? <span className="header__notification-count">{unreadCount}</span> : null}
          {isNotificationPanelOpen ? <NotificationPanel /> : null}
        </div>
      </div>
    </header>
  )
}
