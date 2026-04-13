import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import type { ModuleKey } from '../auth/modules'
import { useAuth } from '../context/AuthContext'

export function RequireModule({
  module: mod,
  children,
}: {
  module: ModuleKey
  children: ReactNode
}) {
  const { isAuthenticated, canAccessModule, defaultLandingPath } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (!canAccessModule(mod)) {
    return <Navigate to={defaultLandingPath} replace />
  }

  return <>{children}</>
}
