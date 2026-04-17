import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { ConnectivityBar } from './ConnectivityBar'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'

const titles: Record<string, string> = {
  '/': 'Dashboard',
  '/products': 'Products',
  '/production': 'Production',
  '/sales': 'Sales',
  '/orders': 'Orders',
  '/purchases': 'Purchases',
  '/reports': 'Reports',
  '/customers': 'Customers',
  '/users': 'Users',
  '/settings': 'Settings',
}

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pathname } = useLocation()
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
        <main className="flex-1 overflow-x-auto p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
