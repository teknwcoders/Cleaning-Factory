import { getSupabase } from './supabase'

const TABLE = 'factory_app_state'
const ROW_ID = 1

export async function pullFactoryPayload(): Promise<unknown | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data, error } = await sb
    .from(TABLE)
    .select('payload')
    .eq('id', ROW_ID)
    .maybeSingle()
  if (error) {
    console.warn('[Supabase] pull factory_app_state:', error.message)
    return null
  }
  return data?.payload ?? null
}

export async function pushFactoryPayload(payload: unknown): Promise<boolean> {
  const sb = getSupabase()
  if (!sb) return false
  const { error } = await sb.from(TABLE).upsert(
    {
      id: ROW_ID,
      payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  )
  if (error) {
    console.warn('[Supabase] push factory_app_state:', error.message)
    return false
  }
  return true
}
