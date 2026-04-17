import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

type Role = 'manager' | 'sales' | 'viewer'

function parseManagerEmails(raw: string | undefined): Set<string> {
  if (!raw) return new Set()
  return new Set(
    raw
      .split(',')
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean),
  )
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
    },
  })
}

function appError(message: string) {
  return json({ error: message }, 200)
}

function normalizeRedirectTo(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const value = raw.trim()
  if (!value) return null
  try {
    const parsed = new URL(value)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.toString()
  } catch {
    return null
  }
}

function isDuplicateEmailInviteError(message: string): boolean {
  const m = message.toLowerCase()
  return (
    m.includes('already been registered') ||
    m.includes('already registered') ||
    m.includes('user already registered') ||
    m.includes('email address is already') ||
    m.includes('duplicate')
  )
}

async function findUserIdByEmail(
  adminClient: SupabaseClient,
  email: string,
): Promise<string | null> {
  const lower = email.toLowerCase()
  let page = 1
  const perPage = 1000
  for (;;) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage })
    if (error) return null
    const found = data.users.find((u) => u.email?.toLowerCase() === lower)
    if (found?.id) return found.id
    if (!data.users.length || data.users.length < perPage) break
    page++
  }
  return null
}

Deno.serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') return json({})
    if (req.method !== 'POST') return appError('Method not allowed.')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
    if (!supabaseUrl || !serviceRole || !anonKey) {
      return appError('Missing Supabase env vars in function runtime.')
    }

    const authHeader = req.headers.get('Authorization') ?? ''
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const adminClient = createClient(supabaseUrl, serviceRole)

    const { data: authData, error: authErr } = await userClient.auth.getUser()
    if (authErr || !authData.user) return appError('Unauthorized.')
    const managerUserId = authData.user.id
    const managerEmails = parseManagerEmails(Deno.env.get('MANAGER_EMAILS'))
    const authRole =
      typeof authData.user.app_metadata?.role === 'string'
        ? authData.user.app_metadata.role
        : null
    const isManagerByMetadata =
      authRole === 'manager' ||
      (authData.user.email
        ? managerEmails.has(authData.user.email.toLowerCase())
        : false)

    const { data: managerRoleRow, error: managerRoleErr } = await adminClient
      .from('app_user_roles')
      .select('role,active')
      .eq('user_id', managerUserId)
      .maybeSingle()
    const isManagerByTable =
      !managerRoleErr &&
      !!managerRoleRow &&
      managerRoleRow.active !== false &&
      managerRoleRow.role === 'manager'
    if (!isManagerByTable && !isManagerByMetadata) {
      return appError('Only managers can manage users.')
    }

    const body = await req.json().catch(() => ({}))
    const action = typeof body.action === 'string' ? body.action : ''

    if (action === 'list') {
      const { data: rows, error } = await adminClient
        .from('app_user_roles')
        .select('user_id,role,active,created_at')
        .order('created_at', { ascending: false })
      if (error) return appError(error.message)
      const ids = (rows ?? []).map((r) => String(r.user_id))
      const { data: authUsers } = await adminClient.auth.admin.listUsers()
      const emailById = new Map<string, string>()
      for (const u of authUsers.users ?? []) {
        if (u.id) emailById.set(u.id, u.email ?? '')
      }
      const data = ids.map((id) => {
        const row = rows?.find((x) => String(x.user_id) === id)
        return {
          userId: id,
          email: emailById.get(id) ?? '',
          role: (row?.role ?? 'viewer') as Role,
          active: Boolean(row?.active),
          createdAt: String(row?.created_at ?? new Date().toISOString()),
        }
      })
      return json({ data })
    }

    if (action === 'invite_sales') {
      const email = String(body.email ?? '').trim().toLowerCase()
      if (!email) return appError('Email is required.')
      const redirectTo = normalizeRedirectTo(body.redirectTo)
      if (!redirectTo) {
        return appError('Valid redirectTo URL is required for invite flow.')
      }
      const { data, error } = await adminClient.auth.admin.inviteUserByEmail(email, {
        redirectTo,
        data: { account_type: 'sales' },
      })
      if (error) {
        if (!isDuplicateEmailInviteError(error.message)) {
          return appError(error.message)
        }
        const existingId = await findUserIdByEmail(adminClient, email)
        if (!existingId) {
          return appError(
            'This email is already registered, but the account could not be found. Try again or set role from the user list.',
          )
        }
        const { error: upsertExistingErr } = await adminClient.from('app_user_roles').upsert(
          {
            user_id: existingId,
            role: 'sales',
            active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        )
        if (upsertExistingErr) return appError(upsertExistingErr.message)
        return json({
          data: {
            userId: existingId,
            alreadyRegistered: true as const,
          },
        })
      }
      const userId = data.user?.id
      if (!userId) return appError('Could not create invited user.')
      const { error: upsertErr } = await adminClient.from('app_user_roles').upsert(
        {
          user_id: userId,
          role: 'sales',
          active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
      if (upsertErr) return appError(upsertErr.message)
      return json({ data: { userId } })
    }

    if (action === 'set_role') {
      const userId = String(body.userId ?? '').trim()
      const role = String(body.role ?? '').trim()
      if (!userId || (role !== 'viewer' && role !== 'sales')) {
        return appError('Invalid role update payload.')
      }
      if (userId === managerUserId) {
        return appError('Manager cannot demote self.')
      }
      const { error } = await adminClient.from('app_user_roles').upsert(
        {
          user_id: userId,
          role,
          active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
      if (error) return appError(error.message)
      return json({ data: { userId, role } })
    }

    if (action === 'set_active') {
      const userId = String(body.userId ?? '').trim()
      const active = Boolean(body.active)
      if (!userId) return appError('userId is required.')
      if (userId === managerUserId) {
        return appError('Manager cannot deactivate self.')
      }
      const { error } = await adminClient
        .from('app_user_roles')
        .update({ active, updated_at: new Date().toISOString() })
        .eq('user_id', userId)
      if (error) return appError(error.message)
      return json({ data: { userId, active } })
    }

    return appError('Unknown action.')
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return appError(`manage-users runtime error: ${message}`)
  }
})
