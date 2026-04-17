import { CheckCircle2, Loader2, Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase'

export function SetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [validSession, setValidSession] = useState(false)

  useEffect(() => {
    const sb = getSupabase()
    if (!sb) return
    let cancelled = false
    void (async () => {
      const { data } = await sb.auth.getSession()
      if (cancelled) return
      setValidSession(Boolean(data.session))
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    const sb = getSupabase()
    if (!sb) {
      setError('Supabase is not configured.')
      return
    }
    setSubmitting(true)
    try {
      const { error: updateErr } = await sb.auth.updateUser({ password })
      if (updateErr) {
        setError(updateErr.message)
        return
      }
      setInfo('Password set successfully. Redirecting to login...')
      window.setTimeout(() => navigate('/login', { replace: true }), 1200)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[var(--app-bg)] p-4">
        <div className="w-full max-w-md rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-8 shadow-xl">
          <p className="text-sm text-[var(--app-muted)]">
            Password setup is available only when Supabase is configured.
          </p>
          <Link to="/login" className="mt-4 inline-block text-sm text-coral-600 hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--app-bg)] p-4">
      <div className="w-full max-w-md rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-coral-500/10 p-2 text-coral-600 dark:text-coral-300">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[var(--app-text)]">Set your password</h1>
            <p className="text-xs text-[var(--app-muted)]">
              Complete your invitation by creating a password.
            </p>
          </div>
        </div>

        {!validSession && (
          <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-100">
            Invite session not found. Open the latest invite link from your email.
          </p>
        )}

        {error && (
          <p className="mb-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}
        {info && (
          <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-100">
            <span className="inline-flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              {info}
            </span>
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--app-muted)]">
              New password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2.5 text-sm text-[var(--app-text)] outline-none ring-coral-500/30 focus:ring-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--app-muted)]">
              Confirm password
            </label>
            <input
              type="password"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2.5 text-sm text-[var(--app-text)] outline-none ring-coral-500/30 focus:ring-2"
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !validSession}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-coral-500 py-3 text-sm font-semibold text-white hover:bg-coral-600 disabled:opacity-60"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Save password
          </button>
        </form>
      </div>
    </div>
  )
}
