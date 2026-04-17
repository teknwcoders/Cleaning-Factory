import { AlertCircle, CloudOff, Loader2, RefreshCw, WifiOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useData } from '../../context/DataContext'

export function ConnectivityBar() {
  const {
    remoteBootstrap,
    remoteBootstrapError,
    retryRemoteBootstrap,
  } = useData()
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  if (!online) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex flex-wrap items-center justify-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/35 dark:text-amber-100"
      >
        <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
        <span className="max-w-3xl text-center">
          <strong>You’re offline.</strong> Cached screens may still open.{' '}
          <strong>Sign in, invites, and cloud sync</strong> need the internet — reconnect to use
          Supabase auth and save data to the server.
        </span>
      </div>
    )
  }

  if (remoteBootstrap === 'loading') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center justify-center gap-2 border-b border-coral-500/20 bg-coral-500/10 px-4 py-2.5 text-sm text-[var(--app-text)]"
      >
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-coral-600 dark:text-coral-400" />
        <span>Loading your data from the cloud…</span>
      </div>
    )
  }

  if (remoteBootstrap === 'error') {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-center gap-3 border-b border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100"
      >
        <div className="flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="text-left">
            <strong>Cloud load failed.</strong>{' '}
            {remoteBootstrapError ?? 'Check your connection and SQL setup.'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => retryRemoteBootstrap()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-[var(--app-surface)] px-3 py-1.5 text-xs font-semibold text-red-900 shadow-sm hover:bg-red-50 dark:border-red-800 dark:bg-red-950 dark:hover:bg-red-900/50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    )
  }

  if (remoteBootstrap === 'skipped') {
    return (
      <div className="flex items-center justify-center gap-2 border-b border-[var(--app-border)] bg-[var(--app-bg)] px-4 py-2 text-xs text-[var(--app-muted)]">
        <CloudOff className="h-3.5 w-3.5 shrink-0" />
        <span>
          Local mode — data is saved in this browser only. Add{' '}
          <code className="rounded bg-[var(--app-surface)] px-1">VITE_SUPABASE_URL</code>{' '}
          and{' '}
          <code className="rounded bg-[var(--app-surface)] px-1">
            VITE_SUPABASE_ANON_KEY
          </code>{' '}
          to <code className="rounded bg-[var(--app-surface)] px-1">.env</code> to
          sync with Supabase.
        </span>
      </div>
    )
  }

  return null
}
