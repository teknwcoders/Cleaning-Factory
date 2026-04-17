/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/** Chromium “Add to Home Screen” install prompt (not available on all browsers). */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  /** Comma-separated emails that sign in as manager (full access). */
  readonly VITE_MANAGER_EMAILS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
