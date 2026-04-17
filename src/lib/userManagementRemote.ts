import type { UserRole } from '../auth/modules'
import { getSupabase } from './supabase'

export type ManagedUser = {
  userId: string
  email: string
  role: UserRole
  active: boolean
  createdAt: string
}

async function invokeManageUsers<T>(
  payload: Record<string, unknown>,
): Promise<{ data?: T; error?: string }> {
  const sb = getSupabase()
  if (!sb) {
    return { error: 'Supabase is not configured.' }
  }
  const { data: auth } = await sb.auth.getSession()
  const token = auth.session?.access_token
  if (!token) return { error: 'Not authenticated. Please sign in again.' }

  const baseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string | undefined
  if (!baseUrl || !anonKey) return { error: 'Supabase env vars are missing.' }

  const res = await fetch(`${baseUrl}/functions/v1/manage-users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  })

  const rawText = await res.text()
  let parsed: { error?: string; data?: T } | null = null
  try {
    parsed = rawText ? (JSON.parse(rawText) as { error?: string; data?: T }) : null
  } catch {
    parsed = null
  }

  if (!res.ok) {
    const lower = rawText.toLowerCase()
    if (lower.includes('unsupported_token_algorithm')) {
      return {
        error:
          'Function gateway rejected your JWT algorithm. In Supabase Edge Functions settings for manage-users, disable "Verify JWT with API gateway", then redeploy.',
      }
    }
    if (parsed?.error) return { error: parsed.error }
    if (rawText.trim()) return { error: rawText.trim() }
    return { error: `Edge function failed with status ${res.status}.` }
  }

  if (parsed?.error) return { error: parsed.error }
  if (!parsed || typeof parsed !== 'object') {
    return { error: 'Invalid response from server.' }
  }
  return { data: parsed.data }
}

export async function fetchManagedUsers(): Promise<{
  data?: ManagedUser[]
  error?: string
}> {
  return invokeManageUsers<ManagedUser[]>({ action: 'list' })
}

export async function inviteSalesUser(email: string): Promise<{ error?: string }> {
  return invokeManageUsers({ action: 'invite_sales', email })
}

export async function updateManagedUserRole(
  userId: string,
  role: 'viewer' | 'sales',
): Promise<{ error?: string }> {
  return invokeManageUsers({ action: 'set_role', userId, role })
}

export async function setManagedUserActive(
  userId: string,
  active: boolean,
): Promise<{ error?: string }> {
  return invokeManageUsers({ action: 'set_active', userId, active })
}
