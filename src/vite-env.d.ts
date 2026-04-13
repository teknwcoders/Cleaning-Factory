/// <reference types="vite/client" />

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
