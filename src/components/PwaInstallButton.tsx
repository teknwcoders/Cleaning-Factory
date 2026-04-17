import { Download, Share, X } from 'lucide-react'
import { usePwaInstall } from '../context/PwaInstallContext'

type Props = {
  className?: string
}

export function PwaInstallButton({ className = '' }: Props) {
  const {
    isInstalled,
    canPromptInstall,
    showIosInstallHint,
    promptInstall,
    popupDismissedPersist,
    inlineIosDismissed,
    dismissInlineIos,
  } = usePwaInstall()

  if (isInstalled) return null

  if (canPromptInstall) {
    return (
      <button
        type="button"
        onClick={() => void promptInstall()}
        className={`inline-flex items-center gap-1.5 rounded-xl border border-coral-500/40 bg-coral-500/10 px-3 py-2 text-xs font-semibold text-coral-700 shadow-sm transition hover:bg-coral-500/20 dark:text-coral-300 dark:hover:bg-coral-500/15 ${className}`}
      >
        <Download className="h-4 w-4 shrink-0" aria-hidden />
        <span className="hidden sm:inline">Install app</span>
        <span className="sm:hidden">Install</span>
      </button>
    )
  }

  if (showIosInstallHint && !popupDismissedPersist && !inlineIosDismissed) {
    return (
      <div
        className={`flex max-w-[min(100vw-2rem,20rem)] items-start gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-2.5 py-2 text-[11px] text-[var(--app-muted)] ${className}`}
      >
        <Share className="mt-0.5 h-3.5 w-3.5 shrink-0 text-coral-600" aria-hidden />
        <p className="min-w-0 flex-1 leading-snug">
          <span className="font-medium text-[var(--app-text)]">Add to Home Screen:</span>{' '}
          tap <strong className="text-[var(--app-text)]">Share</strong>, then{' '}
          <strong className="text-[var(--app-text)]">Add to Home Screen</strong>.
        </p>
        <button
          type="button"
          onClick={dismissInlineIos}
          className="shrink-0 rounded p-1 text-[var(--app-muted)] hover:bg-[var(--app-hover)]"
          aria-label="Dismiss install hint"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return null
}
