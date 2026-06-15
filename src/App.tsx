import type { ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AppLayout } from './components/layout/AppLayout'
import { NAVIGATION_ITEMS } from './constants/app'
import { DEFAULT_APP_ROUTE, APP_ROUTE_PATHS, UI_SHOWCASE_ROUTE } from './routes/appRoutes'
import { CreateActivity } from './pages/CreateActivity'
import { UiShowcase } from './pages/UiShowcase'
import { useAppSelector } from './store/hooks'
import { canViewNavigationItem } from './utils/permissions'
import './App.css'

type RouteGuardProps = {
  children: ReactNode
}

function RouteGuard({ children }: RouteGuardProps) {
  const location = useLocation()
  const selectedRole = useAppSelector((state) => state.app.selectedRole)
  const navigationItem = NAVIGATION_ITEMS.find((item) => item.path === location.pathname)

  if (location.pathname === UI_SHOWCASE_ROUTE) {
    return children
  }

  if (!navigationItem || !canViewNavigationItem(selectedRole, navigationItem)) {
    return <Navigate replace to={DEFAULT_APP_ROUTE} />
  }

  return children
}

function EmptyScreen() {
  return null
}

function App() {
  return (
    <AppLayout>
      <RouteGuard>
        <Routes>
          <Route element={<EmptyScreen />} path={APP_ROUTE_PATHS.dashboard} />
          <Route element={<CreateActivity />} path={APP_ROUTE_PATHS.createActivity} />
          <Route element={<EmptyScreen />} path={APP_ROUTE_PATHS.overview} />
          <Route element={<EmptyScreen />} path={APP_ROUTE_PATHS.activityLeads} />
          <Route element={<EmptyScreen />} path={APP_ROUTE_PATHS.activitiesList} />
          <Route element={<EmptyScreen />} path={APP_ROUTE_PATHS.approvals} />
          <Route element={<EmptyScreen />} path={APP_ROUTE_PATHS.procurementPlan} />
          <Route element={<EmptyScreen />} path={APP_ROUTE_PATHS.engagementPlan} />
          <Route element={<EmptyScreen />} path={APP_ROUTE_PATHS.financialSpending} />
          <Route element={<UiShowcase />} path={UI_SHOWCASE_ROUTE} />
          <Route element={<Navigate replace to={DEFAULT_APP_ROUTE} />} path="*" />
        </Routes>
      </RouteGuard>
    </AppLayout>
  )
}

export default App
