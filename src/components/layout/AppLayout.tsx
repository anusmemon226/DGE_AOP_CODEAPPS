import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { AiAssistantWidget } from './AiAssistantWidget'
import { Header } from './Header'
import { Sidebar } from './Sidebar'
import { useAppSelector } from '../../store/hooks'
import './layout.css'

type AppLayoutProps = {
  children?: ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const { isSidebarCollapsed, themeMode } = useAppSelector((state) => state.app)

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode
  }, [themeMode])

  return (
    <div className={`app-shell ${isSidebarCollapsed ? 'app-shell--sidebar-collapsed' : ''}`}>
      <Sidebar />
      <div className="app-shell__workspace">
        <Header />
        <main className="app-shell__main">{children}</main>
      </div>
      <AiAssistantWidget />
    </div>
  )
}
