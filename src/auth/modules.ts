export type UserRole = 'manager' | 'sales' | 'viewer'

export const MODULE_KEYS = [
  'dashboard',
  'products',
  'production',
  'sales',
  'orders',
  'purchases',
  'reports',
  'customers',
  'settings',
] as const

export type ModuleKey = (typeof MODULE_KEYS)[number]

/** Appended in Settings for each module so managers know viewers follow these toggles. */
export const VIEWER_MODULE_ACCESS_HINT =
  ' For viewers: the sidebar link and this page only work when this is on.'

export const MODULE_LABELS: Record<ModuleKey, string> = {
  dashboard: 'Dashboard',
  products: 'Products',
  production: 'Production',
  sales: 'Sales',
  orders: 'Orders',
  purchases: 'Purchases',
  reports: 'Reports',
  customers: 'Customers',
  settings: 'Settings',
}

export const MODULE_DESCRIPTIONS: Record<ModuleKey, string> = {
  dashboard: `Home overview, charts, and alerts.${VIEWER_MODULE_ACCESS_HINT}`,
  products: `Catalog, stock, add/edit products.${VIEWER_MODULE_ACCESS_HINT}`,
  production: `Production log and entries.${VIEWER_MODULE_ACCESS_HINT}`,
  sales: `Record sales and history.${VIEWER_MODULE_ACCESS_HINT}`,
  orders: `Create and manage customer orders.${VIEWER_MODULE_ACCESS_HINT}`,
  purchases: `Incoming stock and purchase history.${VIEWER_MODULE_ACCESS_HINT}`,
  reports: `Exports, charts, and summaries.${VIEWER_MODULE_ACCESS_HINT}`,
  customers: `Customer list and contacts.${VIEWER_MODULE_ACCESS_HINT}`,
  settings: `Profile, theme, and preferences.${VIEWER_MODULE_ACCESS_HINT}`,
}

export function moduleToPath(m: ModuleKey): string {
  return m === 'dashboard' ? '/' : `/${m}`
}

export function pathToModule(pathname: string): ModuleKey | null {
  if (pathname === '/' || pathname === '') return 'dashboard'
  const seg = pathname.replace(/^\//, '').split('/')[0]
  const map: Record<string, ModuleKey> = {
    products: 'products',
    production: 'production',
    sales: 'sales',
    orders: 'orders',
    purchases: 'purchases',
    reports: 'reports',
    customers: 'customers',
    settings: 'settings',
  }
  return map[seg] ?? null
}

export function defaultAdminPermissions(): Record<ModuleKey, boolean> {
  return MODULE_KEYS.reduce(
    (acc, k) => {
      acc[k] = true
      return acc
    },
    {} as Record<ModuleKey, boolean>,
  )
}

/** Every key boolean; if all off, force settings on (invalid state guard). */
export function normalizeAdminPermissions(
  partial: Partial<Record<ModuleKey, boolean>> | Record<ModuleKey, boolean>,
): Record<ModuleKey, boolean> {
  const next = defaultAdminPermissions()
  for (const k of MODULE_KEYS) {
    if (typeof partial[k] === 'boolean') next[k] = partial[k]!
  }
  if (!MODULE_KEYS.some((k) => next[k])) {
    next.settings = true
  }
  return next
}

/** When Supabase has no usable permission row, viewers get this until remote loads. */
export function minimalViewerModulePreset(): Record<ModuleKey, boolean> {
  const next = defaultAdminPermissions()
  for (const k of MODULE_KEYS) {
    next[k] = k === 'settings'
  }
  return next
}

/** True if setting `key` to `allowed` would leave every module off (invalid). */
export function wouldLeaveAllModulesOff(
  prev: Record<ModuleKey, boolean>,
  key: ModuleKey,
  allowed: boolean,
): boolean {
  const next = { ...prev, [key]: allowed }
  return !MODULE_KEYS.some((k) => next[k])
}
