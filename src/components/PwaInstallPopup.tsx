import { Download, Monitor, Share2, Smartphone, X } from 'lucide-react'
import { useEffect } from 'react'
import { usePwaInstall } from '../context/PwaInstallContext'

export function PwaInstallPopup() {
  const { canPromptInstall, showIosInstallHint, promptInstall, dismissPopupPersist } =
    usePwaInstall()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismissPopupPersist()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [dismissPopupPersist])

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        aria-label="Close install dialog"
        onClick={dismissPopupPersist}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pwa-install-title"
        className="relative z-10 w-full max-w-md rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 shadow-2xl dark:shadow-black/40 motion-safe:animate-[pwa-pop_0.2s_ease-out]"
      >
        <button
          type="button"
          onClick={dismissPopupPersist}
          className="absolute right-3 top-3 rounded-lg p-2 text-[var(--app-muted)] hover:bg-[var(--app-hover)]"
          aria-label="Dismiss"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-coral-400 to-coral-600 text-white shadow-lg">
          {canPromptInstall ? (
            <Download className="h-6 w-6" aria-hidden />
          ) : showIosInstallHint ? (
            <Share2 className="h-6 w-6" aria-hidden />
          ) : (
            <Monitor className="h-6 w-6" aria-hidden />
          )}
        </div>

        <h2
          id="pwa-install-title"
          className="pr-8 text-lg font-semibold text-[var(--app-text)]"
        >
          Install Cleaning Factory
        </h2>
        <p className="mt-2 text-sm text-[var(--app-muted)]">
          {canPromptInstall ? (
            <>
              Install this app for quick access from your home screen or taskbar. It opens in
              its own window and loads faster on repeat visits.
            </>
          ) : showIosInstallHint ? (
            <>
              On iPhone or iPad, use{' '}
              <strong className="text-[var(--app-text)]">Share</strong>, then{' '}
              <strong className="text-[var(--app-text)]">Add to Home Screen</strong> to install.
            </>
          ) : (
            <>
              In <strong className="text-[var(--app-text)]">Chrome</strong> or{' '}
              <strong className="text-[var(--app-text)]">Edge</strong>, open the browser menu
              (⋮ or <strong className="text-[var(--app-text)]">Install app</strong> in the address
              bar) to install. On Android you may see{' '}
              <strong className="text-[var(--app-text)]">Add to Home screen</strong>. Other
              browsers may not support install — try Chrome if you do not see an install option.
            </>
          )}
        </p>

        <div className="mt-4 flex items-start gap-2 rounded-xl bg-[var(--app-bg)] px-3 py-2.5 text-xs text-[var(--app-muted)]">
          <Smartphone className="mt-0.5 h-4 w-4 shrink-0 text-coral-600 dark:text-coral-400" />
          <span>
            Works best over <strong className="text-[var(--app-text)]">HTTPS</strong>. Sign-in and
            cloud sync need an internet connection; some screens may be available offline after you
            have opened them once.
          </span>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={dismissPopupPersist}
            className="rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--app-text)] hover:bg-[var(--app-hover)]"
          >
            Not now
          </button>
          {canPromptInstall ? (
            <button
              type="button"
              onClick={() => void promptInstall()}
              className="rounded-xl bg-coral-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-coral-500/25 hover:bg-coral-600"
            >
              Install app
            </button>
          ) : (
            <button
              type="button"
              onClick={dismissPopupPersist}
              className="rounded-xl bg-coral-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-coral-500/25 hover:bg-coral-600"
            >
              Got it
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
