import {
  normalizePermissionMap,
  salesDefaultPermissions,
  type PermissionMap,
} from '../auth/permissions'
import { getSupabase } from './supabase'

export function friendlyRolePermissionsError(raw: string): string {
  const m = raw.toLowerCase()
  if (
    m.includes('role_permissions') ||
    (m.includes('relation') && m.includes('does not exist'))
  ) {
    return (
      'Supabase role permission tables are missing. Run migration ' +
      'supabase/migrations/008_roles_permissions.sql and retry.'
    )
  }
  return raw
}

export async function fetchRolePermissionsFromSupabase(
  roleKey: string,
): Promise<PermissionMap | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data, error } = await sb
    .from('role_permissions')
    .select('allowed, permissions!inner(key), roles!inner(key)')
    .eq('roles.key', roleKey)
  if (error) {
    console.warn('[role_permissions] load:', friendlyRolePermissionsError(error.message))
    return null
  }
  const next = salesDefaultPermissions()
  for (const row of data ?? []) {
    const permission = row.permissions as { key?: string } | null
    const key = permission?.key
    if (typeof key !== 'string') continue
    if (Object.prototype.hasOwnProperty.call(next, key)) {
      next[key as keyof PermissionMap] = Boolean(row.allowed)
    }
  }
  return normalizePermissionMap(next, salesDefaultPermissions())
}

export async function persistRolePermissionsToSupabase(
  roleKey: string,
  permissions: PermissionMap,
): Promise<{ error?: string }> {
  const sb = getSupabase()
  if (!sb) return {}
  const normalized = normalizePermissionMap(permissions, salesDefaultPermissions())
  const { data: roleRow, error: roleErr } = await sb
    .from('roles')
    .select('id')
    .eq('key', roleKey)
    .maybeSingle()
  if (roleErr || !roleRow) {
    return { error: friendlyRolePermissionsError(roleErr?.message ?? 'Role not found.') }
  }
  const roleId = String(roleRow.id)
  const { data: permissionRows, error: pErr } = await sb
    .from('permissions')
    .select('id,key')
  if (pErr) return { error: friendlyRolePermissionsError(pErr.message) }
  const rows = (permissionRows ?? [])
    .filter((p) => typeof p.key === 'string' && p.key in normalized)
    .map((p) => ({
      role_id: roleId,
      permission_id: p.id,
      allowed: normalized[p.key as keyof PermissionMap],
    }))
  const { error } = await sb
    .from('role_permissions')
    .upsert(rows, { onConflict: 'role_id,permission_id' })
  if (error) return { error: friendlyRolePermissionsError(error.message) }
  return {}
}
