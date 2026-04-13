import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
/** Legacy JWT anon or newer `sb_publishable_…` key (both work with createClient). */
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string | undefined

let client: SupabaseClient | null = null

/** True when Vite env vars are set (build-time for production). */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    url &&
      anonKey &&
      url.startsWith('http') &&
      url.includes('supabase'),
  )
}

/** Shared Supabase browser client; null if not configured. */
export function getSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null
  if (!client) {
    client = createClient(url!, anonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  }
  return client
}
