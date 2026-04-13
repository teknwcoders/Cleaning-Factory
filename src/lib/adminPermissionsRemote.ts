import {
  defaultAdminPermissions,
  MODULE_KEYS,
  normalizeAdminPermissions,
  type ModuleKey,
} from '../auth/modules'
import { getSupabase } from './supabase'

/** Turn PostgREST errors into steps the user can follow (missing table vs stale cache). */
export function friendlyAppSettingsError(raw: string): string {
  const m = raw.toLowerCase()
  if (
    m.includes('app_settings') ||
    m.includes('schema cache') ||
    m.includes('could not find the table') ||
    (m.includes('relation') && m.includes('does not exist'))
  ) {
    return (
      'Supabase is missing the app_settings table (or the API schema cache is stale). ' +
      'Open the SQL Editor in your Supabase project and run the migration file ' +
      'supabase/migrations/006_app_settings_admin_permissions.sql. ' +
      'If you already ran it, go to Project Settings → Data API → Reload schema (or wait a minute and retry).'
    )
  }
  return raw
}

/**
 * Merge stored JSON with defaults.
 * Returns null when the JSON has no explicit module flags (e.g. `{}` from DB seed) —
 * callers must not treat that as “everything allowed”.
 */
export function mergeAdminPermissionsFromJson(
  raw: unknown,
): Record<ModuleKey, boolean> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null
  const o = raw as Record<string, unknown>
  const hasExplicit =
    MODULE_KEYS.some((k) => typeof o[k] === 'boolean') ||
    typeof o.customer === 'boolean'
  if (!hasExplicit) return null

  const defaults = defaultAdminPermissions()
  const next = { ...defaults }
  for (const k of MODULE_KEYS) {
    if (typeof o[k] === 'boolean') next[k] = o[k]
  }
  // Legacy / mistyped keys from older JSON
  if (typeof o.customer === 'boolean' && typeof o.customers !== 'boolean') {
    next.customers = o.customer
  }
  return normalizeAdminPermissions(next)
}

/** Persist manager-defined module access for all users (singleton row id = 1). */
export async function persistAdminPermissionsToSupabase(
  perms: Record<ModuleKey, boolean>,
): Promise<{ error?: string }> {
  const sb = getSupabase()
  if (!sb) return {}
  const normalized = normalizeAdminPermissions(perms)
  const { error } = await sb.from('app_settings').upsert(
    {
      id: 1,
      admin_permissions: normalized,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  )
  if (error) return { error: friendlyAppSettingsError(error.message) }
  return {}
}

export async function fetchAdminPermissionsFromSupabase(): Promise<
  Record<ModuleKey, boolean> | null
> {
  const sb = getSupabase()
  if (!sb) return null
  const { data, error } = await sb
    .from('app_settings')
    .select('admin_permissions')
    .eq('id', 1)
    .maybeSingle()
  if (error) {
    console.warn('[app_settings] load:', friendlyAppSettingsError(error.message))
    return null
  }
  if (data?.admin_permissions === undefined || data.admin_permissions === null) {
    return null
  }
  const merged = mergeAdminPermissionsFromJson(data.admin_permissions)
  return merged
}
