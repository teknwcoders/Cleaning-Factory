import { CheckCircle2, LogIn } from 'lucide-react'
import { Link } from 'react-router-dom'

export function EmailConfirmedPage() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--app-bg)] p-4">
      <div className="w-full max-w-md rounded-3xl border border-[var(--app-border)] bg-[var(--app-surface)] p-8 shadow-xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-8 w-8" aria-hidden />
          </div>
          <h1 className="text-2xl font-semibold text-[var(--app-text)]">
            Email confirmed
          </h1>
          <p className="mt-2 text-sm text-[var(--app-muted)]">
            Your email is confirmed. Go back to login.
          </p>
        </div>

        <Link
          to="/login"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-coral-500 py-3 text-sm font-semibold text-white shadow-md shadow-coral-500/30 transition hover:bg-coral-600 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--app-surface)]"
        >
          <LogIn className="h-4 w-4" aria-hidden />
          Back to login
        </Link>
      </div>
    </div>
  )
}

