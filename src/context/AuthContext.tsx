import type { User } from '@supabase/supabase-js'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  clearStoredAccountMode,
  displayNameForUser,
  effectiveSessionRole,
  writeStoredAccountMode,
} from '../auth/resolveRole'
import {
  defaultAdminPermissions,
  minimalViewerModulePreset,
  MODULE_KEYS,
  moduleToPath,
  type ModuleKey,
  type UserRole,
  wouldLeaveAllModulesOff,
} from '../auth/modules'
import {
  fetchAdminPermissionsFromSupabase,
  persistAdminPermissionsToSupabase,
} from '../lib/adminPermissionsRemote'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase'

const SESSION_KEY = 'ccf-session'
const PERMISSIONS_KEY = 'ccf-admin-permissions'

export type AuthSession = {
  username: string
  role: UserRole
}

export type LoginResult =
  | { ok: true }
  | { ok: false; error: string }

export type SignUpResult =
  | { ok: true; needsEmailConfirmation: boolean }
  | { ok: false; error: string }

type AuthContextValue = {
  /** True while first `getSession()` runs (Supabase auth only). */
  authInitializing: boolean
  /**
   * With Supabase, false until module access is loaded for the current session.
   * Avoids showing viewers a brief flash of another tab’s localStorage permissions.
   */
  permissionsReady: boolean
  /** Email/password via Supabase (false = demo username/password in session only). */
  usesSupabaseAuth: boolean
  isAuthenticated: boolean
  username: string | null
  /** Signed-in email when using Supabase; null in demo mode or if missing. */
  userEmail: string | null
  role: UserRole | null
  isManager: boolean
  isViewer: boolean
  adminPermissions: Record<ModuleKey, boolean>
  canAccessModule: (key: ModuleKey) => boolean
  defaultLandingPath: string
  login: (emailOrUsername: string, password: string) => Promise<LoginResult>
  signUp: (
    email: string,
    password: string,
    options?: { displayName?: string },
  ) => Promise<SignUpResult>
  logout: () => Promise<void>
  /**
   * Updates viewer module access (managers only). Returns whether the toggle was applied.
   * `onPersist` runs after Supabase save finishes (or immediately in demo mode).
   */
  setAdminModuleAccess: (
    key: ModuleKey,
    allowed: boolean,
    options?: { onPersist?: (error?: string) => void },
  ) => boolean
  resetAdminAccess: (preset: 'all' | 'minimal') => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function readDemoSession(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (raw) {
      const j = JSON.parse(raw) as { username?: string; role?: UserRole }
      if (typeof j.username === 'string' && j.username) {
        if (j.role === 'manager' || j.role === 'viewer') {
          return { username: j.username, role: j.role }
        }
        if (j.role === 'admin') {
          return { username: j.username, role: 'viewer' }
        }
      }
    }
    const legacy = sessionStorage.getItem('ccf-auth')
    if (legacy && typeof legacy === 'string' && legacy.length > 0) {
      return { username: legacy.trim(), role: 'manager' }
    }
  } catch {
    /* ignore */
  }
  return null
}

function writeDemoSession(s: AuthSession | null) {
  try {
    if (!s) sessionStorage.removeItem(SESSION_KEY)
    else sessionStorage.setItem(SESSION_KEY, JSON.stringify(s))
  } catch {
    /* ignore */
  }
}

function readPermissions(): Record<ModuleKey, boolean> {
  const defaults = defaultAdminPermissions()
  try {
    const raw = localStorage.getItem(PERMISSIONS_KEY)
    if (!raw) return defaults
    const p = JSON.parse(raw) as Partial<Record<ModuleKey, boolean>>
    const next = { ...defaults }
    for (const k of Object.keys(next) as ModuleKey[]) {
      if (typeof p[k] === 'boolean') next[k] = p[k]
    }
    const po = p as Record<string, unknown>
    if (
      typeof po.customer === 'boolean' &&
      typeof po.customers !== 'boolean'
    ) {
      next.customers = po.customer
    }
    if (!MODULE_KEYS.some((k) => next[k])) {
      next.settings = true
    }
    return next
  } catch {
    return defaults
  }
}

/** Demo logins when Supabase env is not set. */
function resolveDemoLogin(username: string, password: string): AuthSession | null {
  const u = username.trim().toLowerCase()
  if (password !== 'demo123') return null
  if (u === 'manager') return { username: 'manager', role: 'manager' }
  if (u === 'viewer') return { username: 'viewer', role: 'viewer' }
  if (u === 'admin') {
    return { username: 'admin', role: 'viewer' }
  }
  return null
}

function mapSupabaseUser(user: User | null): AuthSession | null {
  if (!user) return null
  return {
    username: displayNameForUser(user),
    role: effectiveSessionRole(user),
  }
}

function emailFromUser(user: User | null | undefined): string | null {
  const e = user?.email?.trim()
  return e || null
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const usesSupabaseAuth = isSupabaseConfigured()
  const [session, setSession] = useState<AuthSession | null>(() =>
    usesSupabaseAuth ? null : readDemoSession(),
  )
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [authInitializing, setAuthInitializing] = useState(usesSupabaseAuth)
  const [permissionsReady, setPermissionsReady] = useState(!usesSupabaseAuth)
  const [adminPermissions, setAdminPermissions] = useState(readPermissions)
  /** After a cross-tab localStorage sync, skip visibility refetch briefly so stale DB does not overwrite. */
  const permSyncFromStorageUntilRef = useRef(0)

  /**
   * Mirror permissions to localStorage for cross-tab sync.
   * With Supabase, skip persisting while a viewer session holds a local fallback
   * so we do not overwrite the manager’s cached copy on a shared browser.
   */
  useEffect(() => {
    if (usesSupabaseAuth && session?.role === 'viewer') return
    try {
      localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(adminPermissions))
    } catch {
      /* ignore */
    }
  }, [adminPermissions, usesSupabaseAuth, session?.role])

  /** Any tab: when another tab updates `ccf-admin-permissions`, apply it here. */
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== PERMISSIONS_KEY || !e.newValue) return
      try {
        permSyncFromStorageUntilRef.current = Date.now() + 4000
        setAdminPermissions(readPermissions())
      } catch {
        /* ignore */
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  /**
   * Keep viewer module access in sync:
   * - Demo: re-read localStorage on every session change so manager toggles apply after sign-in.
   * - Supabase: load singleton row; merge into localStorage when present; otherwise use local file.
   */
  useEffect(() => {
    if (!session) {
      setAdminPermissions(readPermissions())
      setPermissionsReady(true)
      return
    }
    if (!usesSupabaseAuth) {
      setAdminPermissions(readPermissions())
      setPermissionsReady(true)
      return
    }
    setPermissionsReady(false)
    let cancelled = false
    void (async () => {
      try {
        const remote = await fetchAdminPermissionsFromSupabase()
        if (cancelled) return
        if (remote !== null) {
          setAdminPermissions(remote)
          try {
            localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(remote))
          } catch {
            /* ignore */
          }
        } else if (session.role === 'viewer') {
          setAdminPermissions(minimalViewerModulePreset())
        } else {
          setAdminPermissions(readPermissions())
        }
      } catch {
        if (!cancelled) {
          if (session.role === 'viewer') {
            setAdminPermissions(minimalViewerModulePreset())
          } else {
            setAdminPermissions(readPermissions())
          }
        }
      } finally {
        if (!cancelled) setPermissionsReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [session, usesSupabaseAuth])

  /**
   * Supabase: pull latest module toggles when the tab becomes visible (e.g. manager saved elsewhere).
   * Managers skip this: a refetch can return briefly-stale data and revert toggles the manager
   * just changed before persist finished; their session load already seeded from the server.
   */
  useEffect(() => {
    if (!usesSupabaseAuth || !session) return
    if (session.role === 'manager') return
    function pull() {
      if (document.visibilityState !== 'visible') return
      if (Date.now() < permSyncFromStorageUntilRef.current) return
      void (async () => {
        const remote = await fetchAdminPermissionsFromSupabase()
        if (remote !== null) {
          setAdminPermissions(remote)
          try {
            localStorage.setItem(PERMISSIONS_KEY, JSON.stringify(remote))
          } catch {
            /* ignore */
          }
        }
      })()
    }
    document.addEventListener('visibilitychange', pull)
    return () => document.removeEventListener('visibilitychange', pull)
  }, [usesSupabaseAuth, session])

  useEffect(() => {
    if (!usesSupabaseAuth) {
      setAuthInitializing(false)
      return
    }
    const sb = getSupabase()
    if (!sb) {
      setAuthInitializing(false)
      return
    }
    void sb.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null
      setSession(mapSupabaseUser(u))
      setUserEmail(emailFromUser(u))
      setAuthInitializing(false)
    })
    const {
      data: { subscription },
    } = sb.auth.onAuthStateChange((_event, nextSession) => {
      const u = nextSession?.user ?? null
      setSession(mapSupabaseUser(u))
      setUserEmail(emailFromUser(u))
      setAuthInitializing(false)
    })
    return () => subscription.unsubscribe()
  }, [usesSupabaseAuth])

  const login = useCallback(
    async (
      emailOrUsername: string,
      password: string,
    ): Promise<LoginResult> => {
      const sb = getSupabase()
      if (!sb) {
        const s = resolveDemoLogin(emailOrUsername, password)
        if (!s) return { ok: false, error: 'Invalid username or password.' }
        writeDemoSession(s)
        try {
          sessionStorage.removeItem('ccf-auth')
        } catch {
          /* ignore */
        }
        setSession(s)
        setUserEmail(null)
        return { ok: true }
      }
      const email = emailOrUsername.trim()
      const { error } = await sb.auth.signInWithPassword({
        email,
        password,
      })
      if (error) return { ok: false, error: error.message }
      const { data } = await sb.auth.getSession()
      const u = data.session?.user ?? null
      if (u) clearStoredAccountMode()
      setSession(mapSupabaseUser(u))
      setUserEmail(emailFromUser(u))
      return { ok: true }
    },
    [],
  )

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      options?: { displayName?: string },
    ): Promise<SignUpResult> => {
      const sb = getSupabase()
      if (!sb) {
        return {
          ok: false,
          error: 'Supabase is not configured. Add VITE_SUPABASE_URL and key to .env.',
        }
      }
      const em = email.trim()
      const display =
        options?.displayName?.trim() ||
        (em.includes('@') ? em.split('@')[0]! : em)
      const { data, error } = await sb.auth.signUp({
        email: em,
        password,
        options: {
          data: {
            display_name: display,
            account_type: 'viewer' as const,
          },
        },
      })
      if (error) return { ok: false, error: error.message }
      const needsEmailConfirmation = !data.session
      if (data.session?.user) {
        const u = data.session.user
        writeStoredAccountMode(u.id, 'viewer')
        setSession(mapSupabaseUser(u))
        setUserEmail(emailFromUser(u))
      }
      return { ok: true, needsEmailConfirmation }
    },
    [],
  )

  const logout = useCallback(async () => {
    const sb = getSupabase()
    if (sb) await sb.auth.signOut()
    clearStoredAccountMode()
    writeDemoSession(null)
    setSession(null)
    setUserEmail(null)
  }, [])

  const setAdminModuleAccess = useCallback(
    (
      key: ModuleKey,
      allowed: boolean,
      options?: { onPersist?: (error?: string) => void },
    ): boolean => {
      if (session?.role !== 'manager') return false
      let applied = false
      setAdminPermissions((prev) => {
        if (wouldLeaveAllModulesOff(prev, key, allowed)) {
          return prev
        }
        applied = true
        const next = { ...prev, [key]: allowed }
        if (usesSupabaseAuth) {
          void persistAdminPermissionsToSupabase(next).then((r) => {
            if (r.error) console.warn('[app_settings] save:', r.error)
            options?.onPersist?.(r.error)
          })
        } else {
          queueMicrotask(() => options?.onPersist?.(undefined))
        }
        return next
      })
      return applied
    },
    [session, usesSupabaseAuth],
  )

  const resetAdminAccess = useCallback(
    (preset: 'all' | 'minimal') => {
      if (session?.role !== 'manager') return
      if (preset === 'all') {
        const next = defaultAdminPermissions()
        setAdminPermissions(next)
        if (usesSupabaseAuth) {
          void persistAdminPermissionsToSupabase(next).then((r) => {
            if (r.error) console.warn('[app_settings] save:', r.error)
          })
        }
        return
      }
      const next = defaultAdminPermissions()
      for (const k of MODULE_KEYS) {
        next[k] = k === 'settings'
      }
      setAdminPermissions(next)
      if (usesSupabaseAuth) {
        void persistAdminPermissionsToSupabase(next).then((r) => {
          if (r.error) console.warn('[app_settings] save:', r.error)
        })
      }
    },
    [session, usesSupabaseAuth],
  )

  const canAccessModule = useCallback(
    (key: ModuleKey) => {
      if (!session) return false
      if (session.role === 'manager') return true
      return Boolean(adminPermissions[key])
    },
    [session, adminPermissions],
  )

  const defaultLandingPath = useMemo(() => {
    if (!session) return '/login'
    if (session.role === 'manager') return '/'
    const order: ModuleKey[] = [
      'dashboard',
      'products',
      'production',
      'sales',
      'purchases',
      'reports',
      'customers',
      'settings',
    ]
    for (const m of order) {
      if (adminPermissions[m]) return moduleToPath(m)
    }
    return moduleToPath('settings')
  }, [session, adminPermissions])

  const value = useMemo<AuthContextValue>(
    () => ({
      authInitializing,
      permissionsReady,
      usesSupabaseAuth,
      isAuthenticated: Boolean(session),
      username: session?.username ?? null,
      userEmail,
      role: session?.role ?? null,
      isManager: session?.role === 'manager',
      isViewer: session?.role === 'viewer',
      adminPermissions,
      canAccessModule,
      defaultLandingPath,
      login,
      signUp,
      logout,
      setAdminModuleAccess,
      resetAdminAccess,
    }),
    [
      authInitializing,
      permissionsReady,
      usesSupabaseAuth,
      session,
      userEmail,
      adminPermissions,
      canAccessModule,
      defaultLandingPath,
      login,
      signUp,
      logout,
      setAdminModuleAccess,
      resetAdminAccess,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
