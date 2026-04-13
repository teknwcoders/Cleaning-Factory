import { Loader2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const {
    isAuthenticated,
    authInitializing,
    usesSupabaseAuth,
    permissionsReady,
  } = useAuth()
  const location = useLocation()

  if (usesSupabaseAuth && authInitializing) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[var(--app-bg)] text-[var(--app-muted)]">
        <Loader2 className="h-8 w-8 animate-spin text-coral-500" aria-hidden />
        <p className="text-sm">Loading…</p>
      </div>
    )
  }

  if (usesSupabaseAuth && isAuthenticated && !permissionsReady) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[var(--app-bg)] text-[var(--app-muted)]">
        <Loader2 className="h-8 w-8 animate-spin text-coral-500" aria-hidden />
        <p className="text-sm">Loading access…</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}
