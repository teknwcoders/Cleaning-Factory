import type { UserRole } from '../auth/modules'
import { getSupabase } from './supabase'

export async function fetchSessionRoleFromSupabase(
  userId: string,
): Promise<UserRole | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data, error } = await sb
    .from('app_user_roles')
    .select('role,active')
    .eq('user_id', userId)
    .maybeSingle()
  if (error || !data) return null
  if (data.active === false) return 'viewer'
  const role = String(data.role)
  if (role === 'manager' || role === 'sales' || role === 'viewer') return role
  return null
}
