import { useCallback, useMemo, useRef, type ReactNode } from 'react'
import { NavigationGuardContext, type NavigationAction, type NavigationGuard } from './navigationGuard'

export function NavigationGuardProvider({ children }: { children: ReactNode }) {
  const guardRef = useRef<NavigationGuard | null>(null)

  const registerNavigationGuard = useCallback((guard: NavigationGuard) => {
    guardRef.current = guard

    return () => {
      if (guardRef.current === guard) {
        guardRef.current = null
      }
    }
  }, [])

  const confirmNavigation = useCallback((action: NavigationAction) => {
    if (guardRef.current) {
      return guardRef.current(action)
    }

    action()
    return true
  }, [])

  const value = useMemo(
    () => ({
      confirmNavigation,
      registerNavigationGuard,
    }),
    [confirmNavigation, registerNavigationGuard],
  )

  return (
    <NavigationGuardContext.Provider value={value}>
      {children}
    </NavigationGuardContext.Provider>
  )
}
