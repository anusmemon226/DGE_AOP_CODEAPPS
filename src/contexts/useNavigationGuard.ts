import { useContext } from 'react'
import { NavigationGuardContext } from './navigationGuard'

export function useNavigationGuard() {
  const context = useContext(NavigationGuardContext)

  if (!context) {
    throw new Error('useNavigationGuard must be used within NavigationGuardProvider')
  }

  return context
}
