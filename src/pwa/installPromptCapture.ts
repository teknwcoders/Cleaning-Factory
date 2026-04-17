/** Capture `beforeinstallprompt` before React mounts so we never miss the event. */

let deferred: BeforeInstallPromptEvent | null = null
type Listener = (ev: BeforeInstallPromptEvent | null) => void
const listeners = new Set<Listener>()

function notify() {
  listeners.forEach((l) => l(deferred))
}

export function captureBeforeInstallPrompt(e: BeforeInstallPromptEvent) {
  deferred = e
  notify()
}

export function clearInstallPrompt() {
  deferred = null
  notify()
}

export function getInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferred
}

export function subscribeInstallPrompt(listener: Listener): () => void {
  listener(deferred)
  listeners.add(listener)
  return () => listeners.delete(listener)
}
