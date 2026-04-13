import type { User } from '@supabase/supabase-js'
import type { UserRole } from './modules'

const LOGIN_MODE_KEY = 'ccf-account-mode'

/** Persisted after sign-in: viewer vs manager session intent (manager only applies if the user is actually a manager). */
export type StoredAccountMode = 'manager' | 'viewer'

export function readStoredAccountMode(
  userId: string | null,
): StoredAccountMode | null {
  if (!userId) return null
  try {
    const raw = sessionStorage.getItem(LOGIN_MODE_KEY)
    if (!raw) return null
    const j = JSON.parse(raw) as { sub?: string; mode?: string }
    if (j.sub !== userId) return null
    if (j.mode === 'viewer') return 'viewer'
    // Legacy: stored "admin" meant full (non-viewer) session → same as manager intent
    if (j.mode === 'manager' || j.mode === 'admin') return 'manager'
  } catch {
    /* ignore */
  }
  return null
}

export function writeStoredAccountMode(
  userId: string,
  mode: StoredAccountMode,
): void {
  try {
    sessionStorage.setItem(
      LOGIN_MODE_KEY,
      JSON.stringify({ sub: userId, mode }),
    )
  } catch {
    /* ignore */
  }
}

export function clearStoredAccountMode(): void {
  try {
    sessionStorage.removeItem(LOGIN_MODE_KEY)
  } catch {
    /* ignore */
  }
}

/** Comma-separated emails in .env that always sign in as manager. */
export function parseManagerEmails(): Set<string> {
  const raw = import.meta.env.VITE_MANAGER_EMAILS as string | undefined
  if (!raw?.trim()) return new Set()
  return new Set(
    raw
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  )
}

/**
 * Final dashboard role: only manager or viewer.
 * Trusted `app_metadata.role` and env manager list grant manager; legacy `admin` → viewer.
 */
export function effectiveSessionRole(user: User): UserRole {
  const app = user.app_metadata as Record<string, unknown> | undefined
  const ar = app?.role

  if (ar === 'manager') return 'manager'
  if (ar === 'viewer' || ar === 'admin') return 'viewer'

  const email = (user.email ?? '').trim().toLowerCase()
  if (email && parseManagerEmails().has(email)) return 'manager'

  const meta = user.user_metadata as Record<string, unknown> | undefined
  if (meta?.account_type === 'viewer') return 'viewer'

  const stored = readStoredAccountMode(user.id)
  if (stored === 'viewer') return 'viewer'
  // Chose "manager" on login but user is not a real manager → viewer
  if (stored === 'manager') return 'viewer'

  return 'viewer'
}

export function displayNameForUser(user: User): string {
  const meta = user.user_metadata as Record<string, unknown> | undefined
  const dn = meta?.display_name
  if (typeof dn === 'string' && dn.trim()) return dn.trim()
  const em = user.email?.trim()
  if (em) return em.split('@')[0] ?? em
  return 'User'
}
