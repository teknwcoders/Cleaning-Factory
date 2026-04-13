import { CheckCircle2, Info, X, XCircle } from 'lucide-react'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type ToastVariant = 'success' | 'error' | 'info'

type Toast = { id: string; message: string; variant: ToastVariant }

type UiFeedbackContextValue = {
  showToast: (opts: { message: string; variant?: ToastVariant }) => void
}

const UiFeedbackContext = createContext<UiFeedbackContextValue | null>(null)

function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: Toast[]
  onDismiss: (id: string) => void
}) {
  if (!toasts.length) return null
  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[200] flex max-w-[min(100vw-2rem,22rem)] flex-col gap-2"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm shadow-lg backdrop-blur-sm ${
            t.variant === 'success'
              ? 'border-emerald-200 bg-emerald-50/95 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/90 dark:text-emerald-100'
              : t.variant === 'error'
                ? 'border-red-200 bg-red-50/95 text-red-900 dark:border-red-900/50 dark:bg-red-950/90 dark:text-red-100'
                : 'border-[var(--app-border)] bg-[var(--app-surface)]/95 text-[var(--app-text)]'
          }`}
        >
          {t.variant === 'success' && (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
          )}
          {t.variant === 'error' && (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" aria-hidden />
          )}
          {t.variant === 'info' && (
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-coral-600" aria-hidden />
          )}
          <p className="min-w-0 flex-1 leading-snug">{t.message}</p>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="shrink-0 rounded p-0.5 opacity-70 hover:opacity-100"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

export function UiFeedbackProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (opts: { message: string; variant?: ToastVariant }) => {
      const id = crypto.randomUUID()
      const variant = opts.variant ?? 'info'
      setToasts((prev) => [...prev, { id, message: opts.message, variant }].slice(-4))
      window.setTimeout(() => dismiss(id), 3400)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <UiFeedbackContext.Provider value={value}>
      <>
        {children}
        <ToastStack toasts={toasts} onDismiss={dismiss} />
      </>
    </UiFeedbackContext.Provider>
  )
}

export function useUiFeedback(): UiFeedbackContextValue {
  const ctx = useContext(UiFeedbackContext)
  if (!ctx) throw new Error('useUiFeedback must be used within UiFeedbackProvider')
  return ctx
}
