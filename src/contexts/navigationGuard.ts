import { createContext } from 'react'

export type NavigationAction = () => void
export type NavigationGuard = (action: NavigationAction) => boolean

export type NavigationGuardContextValue = {
  confirmNavigation: (action: NavigationAction) => boolean
  registerNavigationGuard: (guard: NavigationGuard) => () => void
}

export const NavigationGuardContext = createContext<NavigationGuardContextValue | undefined>(undefined)
