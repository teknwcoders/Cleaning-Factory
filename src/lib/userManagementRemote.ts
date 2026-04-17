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
  const sbClient = getSupabase()
  if (!sbClient) {
    return { error: 'Supabase is not configured.' }
  }
  const sb = sbClient
  const baseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
  const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string | undefined
  if (!baseUrl || !anonKey) return { error: 'Supabase env vars are missing.' }

  async function getAccessToken(): Promise<string | null> {
    const { data: auth } = await sb.auth.getSession()
    if (auth.session?.access_token) return auth.session.access_token
    const { data: refreshed } = await sb.auth.refreshSession()
    return refreshed.session?.access_token ?? null
  }

  async function callManageUsers(token: string): Promise<Response> {
    return fetch(`${baseUrl}/functions/v1/manage-users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey!,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    })
  }

  let token = await getAccessToken()
  if (!token) return { error: 'Not authenticated. Please sign in again.' }

  let res = await callManageUsers(token)
  if (res.status === 401) {
    const { data: refreshed } = await sb.auth.refreshSession()
    token = refreshed.session?.access_token ?? null
    if (token) {
      res = await callManageUsers(token)
    }
  }

  const rawText = await res.text()
  let parsed: { error?: string; data?: T } | null = null
  try {
    parsed = rawText ? (JSON.parse(rawText) as { error?: string; data?: T }) : null
  } catch {
    parsed = null
  }

  if (!res.ok) {
    if (res.status === 401) {
      return {
        error:
          'Unauthorized. Please sign out and sign in again as a manager, then retry.',
      }
    }
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

export type InviteSalesResult = {
  userId: string
  alreadyRegistered?: boolean
}

export async function inviteSalesUser(
  email: string,
): Promise<{ data?: InviteSalesResult; error?: string }> {
  return invokeManageUsers<InviteSalesResult>({
    action: 'invite_sales',
    email,
    redirectTo: `${window.location.origin}/set-password`,
  })
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
