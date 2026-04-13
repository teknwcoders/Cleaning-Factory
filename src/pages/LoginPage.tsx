import { Flame, Loader2, Lock, Mail, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { pathToModule } from '../auth/modules'
import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const {
    isAuthenticated,
    login,
    signUp,
    canAccessModule,
    defaultLandingPath,
    authInitializing,
    usesSupabaseAuth,
    permissionsReady,
  } = useAuth()
  const location = useLocation()
  const raw = (location.state as { from?: string })?.from
  const from =
    raw && raw !== '/login' ? raw : '/'

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (authInitializing) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[var(--app-bg)] p-4 text-[var(--app-muted)]">
        <Loader2 className="h-8 w-8 animate-spin text-coral-500" aria-hidden />
        <p className="text-sm">Checking your session…</p>
      </div>
    )
  }

  if (isAuthenticated) {
    if (usesSupabaseAuth && !permissionsReady) {
      return (
        <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[var(--app-bg)] p-4 text-[var(--app-muted)]">
          <Loader2 className="h-8 w-8 animate-spin text-coral-500" aria-hidden />
          <p className="text-sm">Loading access…</p>
        </div>
      )
    }
    const mod = pathToModule(from)
    const target =
      mod && !canAccessModule(mod) ? defaultLandingPath : from
    return <Navigate to={target} replace />
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    setSubmitting(true)
    try {
      const res = await login(email, password)
      if (!res.ok) setError(res.error)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    try {
      const res = await signUp(email, password, {
        displayName: displayName.trim() || undefined,
      })
      if (!res.ok) {
        setError(res.error)
        return
      }
      if (res.needsEmailConfirmation) {
        setInfo(
          'Check your email for a confirmation link, then sign in here.',
        )
        setMode('signin')
        setPassword('')
        setConfirmPassword('')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--app-bg)] p-4">
      <div className="w-full max-w-md rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-8 shadow-xl">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-coral-400 to-coral-600 text-white shadow-lg">
            <Flame className="h-8 w-8" aria-hidden />
          </div>
          <h1 className="text-2xl font-semibold text-[var(--app-text)]">
            Cleaning Factory
          </h1>
          <p className="mt-1 text-sm text-[var(--app-muted)]">
            {usesSupabaseAuth
              ? 'Sign in or create an account'
              : 'Sign in to your operations dashboard (demo mode)'}
          </p>
        </div>

        {usesSupabaseAuth && (
          <div className="mb-6 flex rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] p-1 text-sm font-medium">
            <button
              type="button"
              onClick={() => {
                setMode('signin')
                setError('')
                setInfo('')
              }}
              className={`flex-1 rounded-lg py-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500/50 active:scale-[0.99] ${
                mode === 'signin'
                  ? 'bg-[var(--app-surface)] text-[var(--app-text)] shadow-sm'
                  : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup')
                setError('')
                setInfo('')
              }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-500/50 active:scale-[0.99] ${
                mode === 'signup'
                  ? 'bg-[var(--app-surface)] text-[var(--app-text)] shadow-sm'
                  : 'text-[var(--app-muted)] hover:text-[var(--app-text)]'
              }`}
            >
              <UserPlus className="h-4 w-4" aria-hidden />
              Sign up
            </button>
          </div>
        )}

        {error && (
          <p
            className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
            role="alert"
          >
            {error}
          </p>
        )}
        {info && (
          <p
            className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100"
            role="status"
          >
            {info}
          </p>
        )}

        {mode === 'signin' || !usesSupabaseAuth ? (
          <form onSubmit={handleSignIn} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--app-muted)]">
                {usesSupabaseAuth ? 'Email' : 'Username'}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-muted)]" />
                <input
                  autoComplete={usesSupabaseAuth ? 'email' : 'username'}
                  type={usesSupabaseAuth ? 'email' : 'text'}
                  required
                  className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] py-2.5 pl-10 pr-3 text-sm text-[var(--app-text)] outline-none ring-coral-500/30 focus:ring-2"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    usesSupabaseAuth ? 'you@company.com' : 'manager'
                  }
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--app-muted)]">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-muted)]" />
                <input
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] py-2.5 pl-10 pr-3 text-sm text-[var(--app-text)] outline-none ring-coral-500/30 focus:ring-2"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-coral-500 py-3 text-sm font-semibold text-white shadow-md shadow-coral-500/30 transition hover:bg-coral-600 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-surface)] disabled:opacity-60"
            >
              {submitting && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              )}
              Sign in
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--app-muted)]">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-muted)]" />
                <input
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] py-2.5 pl-10 pr-3 text-sm text-[var(--app-text)] outline-none ring-coral-500/30 focus:ring-2"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--app-muted)]">
                Display name <span className="font-normal">(optional)</span>
              </label>
              <input
                type="text"
                autoComplete="name"
                className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2.5 text-sm text-[var(--app-text)] outline-none ring-coral-500/30 focus:ring-2"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Jordan"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--app-muted)]">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-muted)]" />
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] py-2.5 pl-10 pr-3 text-sm text-[var(--app-text)] outline-none ring-coral-500/30 focus:ring-2"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--app-muted)]">
                Confirm password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-muted)]" />
                <input
                  type="password"
                  autoComplete="new-password"
                  required
                  className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] py-2.5 pl-10 pr-3 text-sm text-[var(--app-text)] outline-none ring-coral-500/30 focus:ring-2"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-coral-500 py-3 text-sm font-semibold text-white shadow-md shadow-coral-500/30 transition hover:bg-coral-600 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-surface)] disabled:opacity-60"
            >
              {submitting && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              )}
              Create account
            </button>
          </form>
        )}

        {!usesSupabaseAuth && (
          <div className="mt-6 space-y-2 text-center text-xs text-[var(--app-muted)]">
            <p>
              <strong className="text-[var(--app-text)]">Manager</strong> (full access):{' '}
              <code className="rounded bg-gray-100 px-1 dark:bg-white/10">manager</code>{' '}
              · <code className="rounded bg-gray-100 px-1 dark:bg-white/10">demo123</code>
            </p>
            <p>
              <strong className="text-[var(--app-text)]">Viewer</strong> (read-only):{' '}
              <code className="rounded bg-gray-100 px-1 dark:bg-white/10">viewer</code>{' '}
              · <code className="rounded bg-gray-100 px-1 dark:bg-white/10">demo123</code>
            </p>
            <p className="pt-2">
              Add <code className="rounded bg-gray-100 px-1 dark:bg-white/10">VITE_SUPABASE_URL</code>{' '}
              and key to <code className="rounded bg-gray-100 px-1 dark:bg-white/10">.env</code>{' '}
              for real sign up / sign in.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
