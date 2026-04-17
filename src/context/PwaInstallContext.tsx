import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { PwaInstallPopup } from '../components/PwaInstallPopup'
import {
  clearInstallPrompt,
  getInstallPrompt,
  subscribeInstallPrompt,
} from '../pwa/installPromptCapture'

const POPUP_DISMISSED_KEY = 'ccf-pwa-install-popup-dismissed'

/** Extra wait before “manual install” copy (Android/desktop may get `beforeinstallprompt` late). */
const INSTALL_FALLBACK_MS = 6000

function isIos(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  if (/iPad|iPhone|iPod/.test(ua)) return true
  // iPadOS 13+ often reports as Mac with touch
  return (
    navigator.platform === 'MacIntel' && typeof navigator.maxTouchPoints === 'number'
      ? navigator.maxTouchPoints > 1
      : false
  )
}

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return false
  const mq = window.matchMedia?.('(display-mode: standalone)')
  if (mq?.matches) return true
  return Boolean(
    (navigator as Navigator & { standalone?: boolean }).standalone === true,
  )
}

function readPopupDismissed(): boolean {
  try {
    return localStorage.getItem(POPUP_DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

export type PwaInstallContextValue = {
  isInstalled: boolean
  canPromptInstall: boolean
  showIosInstallHint: boolean
  promptInstall: () => Promise<void>
  /** User chose “Not now” on the install popup (saved in localStorage). */
  popupDismissedPersist: boolean
  dismissPopupPersist: () => void
  /** Session-only dismiss for the small iOS hint in the top bar. */
  inlineIosDismissed: boolean
  dismissInlineIos: () => void
}

const PwaInstallContext = createContext<PwaInstallContextValue | null>(null)

export function PwaInstallProvider({ children }: { children: ReactNode }) {
  const [isInstalled, setIsInstalled] = useState(isStandaloneDisplay)
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(() =>
    typeof window !== 'undefined' ? getInstallPrompt() : null,
  )
  const [popupDismissedPersist, setPopupDismissedPersist] = useState(readPopupDismissed)
  const [inlineIosDismissed, setInlineIosDismissed] = useState(false)
  const [popupDelayReady, setPopupDelayReady] = useState(false)
  const [fallbackDelayReady, setFallbackDelayReady] = useState(false)

  useEffect(() => {
    const t = window.setTimeout(() => setPopupDelayReady(true), 1400)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => {
    const t = window.setTimeout(() => setFallbackDelayReady(true), INSTALL_FALLBACK_MS)
    return () => window.clearTimeout(t)
  }, [])

  useEffect(() => subscribeInstallPrompt(setDeferred), [])

  useEffect(() => {
    const onInstalled = () => {
      clearInstallPrompt()
      setIsInstalled(true)
    }
    window.addEventListener('appinstalled', onInstalled)

    const mq = window.matchMedia('(display-mode: standalone)')
    const onMq = () => setIsInstalled(mq.matches || isStandaloneDisplay())
    mq.addEventListener?.('change', onMq)

    return () => {
      window.removeEventListener('appinstalled', onInstalled)
      mq.removeEventListener?.('change', onMq)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    const d = getInstallPrompt()
    if (!d) return
    await d.prompt()
    await d.userChoice
    clearInstallPrompt()
  }, [])

  const dismissPopupPersist = useCallback(() => {
    try {
      localStorage.setItem(POPUP_DISMISSED_KEY, '1')
    } catch {
      /* ignore */
    }
    setPopupDismissedPersist(true)
  }, [])

  const dismissInlineIos = useCallback(() => setInlineIosDismissed(true), [])

  const ios = isIos()
  const canPromptInstall = Boolean(deferred) && !isInstalled
  const showIosInstallHint = ios && !isInstalled && !deferred
  const showManualInstallFallback =
    fallbackDelayReady && !ios && !isInstalled && !deferred

  const value = useMemo<PwaInstallContextValue>(
    () => ({
      isInstalled,
      canPromptInstall,
      showIosInstallHint,
      promptInstall,
      popupDismissedPersist,
      dismissPopupPersist,
      inlineIosDismissed,
      dismissInlineIos,
    }),
    [
      isInstalled,
      canPromptInstall,
      showIosInstallHint,
      promptInstall,
      popupDismissedPersist,
      dismissPopupPersist,
      inlineIosDismissed,
      dismissInlineIos,
    ],
  )

  const showPopup =
    !isInstalled &&
    !popupDismissedPersist &&
    ((popupDelayReady && (canPromptInstall || showIosInstallHint)) ||
      showManualInstallFallback)

  return (
    <PwaInstallContext.Provider value={value}>
      {children}
      {showPopup && <PwaInstallPopup />}
    </PwaInstallContext.Provider>
  )
}

export function usePwaInstall(): PwaInstallContextValue {
  const ctx = useContext(PwaInstallContext)
  if (!ctx) {
    throw new Error('usePwaInstall must be used within PwaInstallProvider')
  }
  return ctx
}
