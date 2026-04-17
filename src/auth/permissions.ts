export const PERMISSION_KEYS = [
  'view_customers',
  'add_customers',
  'create_orders',
  'edit_orders',
  'view_products',
  'manage_products',
  'view_dashboard',
  'view_purchases',
] as const

export type PermissionKey = (typeof PERMISSION_KEYS)[number]

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  view_customers: 'View customers',
  add_customers: 'Add/update customers',
  create_orders: 'Create orders',
  edit_orders: 'Edit/delete orders',
  view_products: 'View products',
  manage_products: 'Manage products',
  view_dashboard: 'View dashboard',
  view_purchases: 'View purchases',
}

export const PERMISSION_DESCRIPTIONS: Record<PermissionKey, string> = {
  view_customers: 'See customer list and details.',
  add_customers: 'Create and edit customer records.',
  create_orders: 'Create new sales/orders and submit transactions.',
  edit_orders: 'Modify or remove existing sales/orders.',
  view_products: 'Open product catalog and stock list.',
  manage_products: 'Create, edit, and delete products.',
  view_dashboard: 'Open dashboard summaries and widgets.',
  view_purchases: 'Open purchases page and history.',
}

export type PermissionMap = Record<PermissionKey, boolean>

export function allPermissionsOn(): PermissionMap {
  return PERMISSION_KEYS.reduce(
    (acc, key) => {
      acc[key] = true
      return acc
    },
    {} as PermissionMap,
  )
}

export function viewerDefaultPermissions(): PermissionMap {
  return {
    view_customers: true,
    add_customers: false,
    create_orders: false,
    edit_orders: false,
    view_products: true,
    manage_products: false,
    view_dashboard: true,
    view_purchases: true,
  }
}

export function salesDefaultPermissions(): PermissionMap {
  return {
    view_customers: true,
    add_customers: true,
    create_orders: true,
    edit_orders: true,
    view_products: true,
    manage_products: false,
    view_dashboard: true,
    view_purchases: true,
  }
}

export function normalizePermissionMap(
  partial: Partial<PermissionMap> | Record<string, unknown> | null | undefined,
  fallback: PermissionMap = salesDefaultPermissions(),
): PermissionMap {
  const next = { ...fallback }
  if (!partial || typeof partial !== 'object') return next
  for (const key of PERMISSION_KEYS) {
    if (typeof partial[key] === 'boolean') next[key] = partial[key] as boolean
  }
  return next
}
