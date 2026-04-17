import clsx from 'clsx'
import {
  BarChart3,
  Factory,
  LayoutDashboard,
  Loader2,
  LogOut,
  Menu,
  Package,
  PackagePlus,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Truck,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { pathToModule } from '../../auth/modules'
import { useAuth } from '../../context/AuthContext'

type SidebarItem = {
  to: string
  label: string
  icon: LucideIcon
  managerOnly?: boolean
}

const items: SidebarItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/products', label: 'Products', icon: Package },
  { to: '/production', label: 'Production', icon: Factory },
  { to: '/sales', label: 'Sales', icon: ShoppingCart },
  { to: '/orders', label: 'Orders', icon: PackagePlus },
  { to: '/purchases', label: 'Purchases', icon: Truck },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/customers', label: 'Customers', icon: Users },
  { to: '/users', label: 'Users', icon: Users, managerOnly: true },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const

type Props = {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: Props) {
  const {
    logout,
    canAccessModule,
    username,
    role,
    userEmail,
    usesSupabaseAuth,
  } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  const visibleItems = items.filter(({ to, managerOnly }) => {
    if (managerOnly && role !== 'manager') return false
    const mod = pathToModule(to)
    if (!mod) return true
    return canAccessModule(mod)
  })

  return (
    <>
      <div
        className={clsx(
          'fixed inset-0 z-40 bg-black/40 transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        aria-hidden={!open}
        onClick={onClose}
      />
      <aside
        className={clsx(
          'fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r border-[var(--app-border)] bg-[var(--app-sidebar)] shadow-lg transition-transform duration-200 lg:static lg:z-0 lg:translate-x-0 lg:shadow-none',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between gap-2 border-b border-[var(--app-border)] px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-coral-400 to-coral-600 text-white shadow-md">
              <ShoppingBag className="h-5 w-5" aria-hidden />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-[var(--app-text)]">
                Cleaning Factory
              </p>
              <p className="text-xs text-[var(--app-muted)]">Operations</p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-[var(--app-muted)] hover:bg-[var(--app-hover)] lg:hidden"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
          {visibleItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => onClose()}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors active:scale-[0.99]',
                  isActive
                    ? 'bg-coral-500 text-white shadow-md shadow-coral-500/25'
                    : 'text-[var(--app-muted)] hover:bg-[var(--app-hover)]',
                )
              }
            >
              <Icon className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-2 border-t border-[var(--app-border)] p-3">
          <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2">
            <p
              className="truncate text-xs font-medium text-[var(--app-text)]"
              title={username ?? undefined}
            >
              {username ?? '—'}
            </p>
            {userEmail ? (
              <p
                className="mt-0.5 truncate text-[10px] text-[var(--app-muted)]"
                title={userEmail}
              >
                {userEmail}
              </p>
            ) : (
              !usesSupabaseAuth && (
                <p className="mt-0.5 text-[10px] text-[var(--app-muted)]">
                  Demo sign-in
                </p>
              )
            )}
            <span
              className={
                role === 'manager'
                  ? 'mt-1 inline-block rounded-full bg-coral-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-coral-800 dark:text-coral-200'
                  : role === 'sales'
                    ? 'mt-1 inline-block rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200'
                  : role === 'viewer'
                    ? 'mt-1 inline-block rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800 dark:text-sky-200'
                    : 'mt-1 inline-block rounded-full bg-[var(--app-border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--app-muted)]'
              }
            >
              {role === 'manager' ? 'Manager' : role === 'sales' ? 'Sales' : role === 'viewer' ? 'Viewer' : '—'}
            </span>
          </div>
          <button
            type="button"
            disabled={signingOut}
            onClick={() => {
              void (async () => {
                setSigningOut(true)
                try {
                  await logout()
                } finally {
                  setSigningOut(false)
                }
              })()
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 transition hover:bg-red-50 active:scale-[0.99] disabled:opacity-50 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            {signingOut ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            ) : (
              <LogOut className="h-5 w-5" aria-hidden />
            )}
            Sign out
          </button>
        </div>
      </aside>
    </>
  )
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-2 text-[var(--app-text)] shadow-sm lg:hidden"
      aria-label="Open menu"
    >
      <Menu className="h-5 w-5" />
    </button>
  )
}
