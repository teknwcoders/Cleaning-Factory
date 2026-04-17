import { Bell, Check, Loader2, Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useData } from '../../context/DataContext'
import { PwaInstallButton } from '../PwaInstallButton'
import { formatDate } from '../../utils/format'
import { MobileMenuButton } from './Sidebar'

type Props = {
  title: string
  onOpenSidebar: () => void
}

export function TopBar({ title, onOpenSidebar }: Props) {
  const { username, canAccessModule } = useAuth()
  const showProductSearch = canAccessModule('products')
  const {
    products,
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    lowStockProducts,
    remoteBootstrap,
    cloudSync,
    cloudSyncError,
    dismissCloudSyncMessage,
  } = useData()
  const [q, setQ] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)
  const navigate = useNavigate()
  const panelRef = useRef<HTMLDivElement>(null)

  const unread = notifications.filter((n) => !n.read).length

  const searchResults = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return []
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          p.category.toLowerCase().includes(s),
      )
      .slice(0, 6)
  }, [q, products])

  useEffect(() => {
    if (!panelOpen) return
    const onDown = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node)) return
      setPanelOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [panelOpen])

  return (
    <header className="sticky top-0 z-30 flex flex-col gap-3 border-b border-[var(--app-border)] bg-[var(--app-surface)]/90 px-4 py-3 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex items-center gap-3">
        <MobileMenuButton onClick={onOpenSidebar} />
        <div>
          <h1 className="text-lg font-semibold text-[var(--app-text)] sm:text-xl">
            {title}
          </h1>
          <p className="hidden text-sm text-[var(--app-muted)] sm:block">
            Welcome back{username ? `, ${username}` : ''}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:max-w-xl sm:flex-nowrap">
        <PwaInstallButton className="order-first sm:order-none" />
        {remoteBootstrap === 'ready' && cloudSync !== 'idle' && (
          <div
            role="status"
            aria-live="polite"
            className={
              cloudSync === 'error'
                ? 'flex max-w-[14rem] items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-900 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-100 sm:max-w-xs'
                : cloudSync === 'saved'
                  ? 'flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-100'
                  : 'flex items-center gap-1 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-2 py-1 text-xs text-[var(--app-muted)]'
            }
          >
            {cloudSync === 'syncing' && (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-coral-600" />
                <span>Saving…</span>
              </>
            )}
            {cloudSync === 'saved' && (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span>Saved to cloud</span>
              </>
            )}
            {cloudSync === 'error' && (
              <>
                <span className="min-w-0 flex-1 truncate" title={cloudSyncError ?? ''}>
                  Save failed
                </span>
                <button
                  type="button"
                  onClick={() => dismissCloudSyncMessage()}
                  className="shrink-0 rounded p-0.5 hover:bg-red-100 dark:hover:bg-red-900/40"
                  aria-label="Dismiss"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        )}
        {showProductSearch && (
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-muted)]" />
            <input
              type="search"
              placeholder="Search products…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] py-2 pl-9 pr-3 text-sm text-[var(--app-text)] outline-none ring-coral-500/30 placeholder:text-[var(--app-muted)] focus:ring-2"
            />
            {q.trim() && searchResults.length > 0 && (
              <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-auto rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] py-1 shadow-lg">
                {searchResults.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-[var(--app-hover)]"
                      onClick={() => {
                        setQ('')
                        navigate('/products')
                      }}
                    >
                      <span className="font-medium text-[var(--app-text)]">
                        {p.name}
                      </span>
                      <span className="text-xs text-[var(--app-muted)]">
                        {p.category} · Stock {p.stock}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="relative" ref={panelRef}>
          <button
            type="button"
            onClick={() => setPanelOpen((o) => !o)}
            className="relative rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-2.5 text-[var(--app-text)] shadow-sm hover:bg-[var(--app-hover)]"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral-500 px-1 text-[10px] font-bold text-white">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </button>
          {panelOpen && (
            <div className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,22rem)] rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-3 shadow-xl">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-[var(--app-text)]">
                  Notifications
                </p>
                {unread > 0 && (
                  <button
                    type="button"
                    className="text-xs font-medium text-coral-600 hover:underline dark:text-coral-400"
                    onClick={() => markAllNotificationsRead()}
                  >
                    Mark all read
                  </button>
                )}
              </div>
              {lowStockProducts.length > 0 && (
                <div className="mb-3 rounded-xl bg-amber-50 p-2 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                  <strong>Low stock:</strong>{' '}
                  {lowStockProducts.map((p) => p.name).join(', ')}
                </div>
              )}
              <ul className="max-h-64 space-y-2 overflow-y-auto">
                {notifications.length === 0 && (
                  <li className="py-6 text-center text-sm text-[var(--app-muted)]">
                    No notifications yet.
                  </li>
                )}
                {notifications.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      className="w-full rounded-lg px-2 py-2 text-left text-sm hover:bg-[var(--app-hover)]"
                      onClick={() => {
                        markNotificationRead(n.id)
                        setPanelOpen(false)
                      }}
                    >
                      <p
                        className={
                          n.read
                            ? 'text-[var(--app-muted)]'
                            : 'font-medium text-[var(--app-text)]'
                        }
                      >
                        {n.message}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--app-muted)]">
                        {formatDate(n.createdAt)}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
