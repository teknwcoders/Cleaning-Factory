import { Eye, LogIn } from 'lucide-react'
import { useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { ConnectivityBar } from './ConnectivityBar'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

const titles: Record<string, string> = {
  '/': 'Dashboard',
  '/products': 'Products',
  '/production': 'Production',
  '/sales': 'Sales',
  '/purchases': 'Purchases',
  '/reports': 'Reports',
  '/customers': 'Customers',
  '/settings': 'Settings',
}

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()
  const { readOnly } = useData()
  const title = titles[pathname] ?? 'Dashboard'

  return (
    <div className="flex min-h-dvh bg-[var(--app-bg)]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar
          title={title}
          onOpenSidebar={() => setSidebarOpen(true)}
        />
        <ConnectivityBar />
        {readOnly && (
          <div
            role="status"
            className="flex flex-col gap-2 border-b border-sky-200 bg-sky-50 px-4 py-2.5 text-sm text-sky-900 sm:flex-row sm:items-center sm:justify-center sm:gap-4 dark:border-sky-900/40 dark:bg-sky-950/40 dark:text-sky-100"
          >
            <span className="flex items-center justify-center gap-2 text-center sm:text-left">
              <Eye className="h-4 w-4 shrink-0" aria-hidden />
              <span>
                <strong>View only</strong> — browse and open <strong>View</strong> on
                rows to see details; product search still works. Saves, deletes, and
                “Add” actions stay off. Hover disabled controls for a short tip.
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                void (async () => {
                  await logout()
                  navigate('/login', { replace: true })
                })()
              }}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 self-center rounded-lg border border-sky-300 bg-white/90 px-3 py-1.5 text-xs font-semibold text-sky-950 shadow-sm transition hover:bg-white active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 dark:border-sky-700 dark:bg-sky-900/60 dark:text-sky-50 dark:hover:bg-sky-800/80"
            >
              <LogIn className="h-3.5 w-3.5" aria-hidden />
              Sign out to sign in as Manager
            </button>
          </div>
        )}
        <main className="flex-1 overflow-x-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
