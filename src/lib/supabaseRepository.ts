import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  AppNotification,
  Customer,
  Product,
  ProductionEntry,
  Purchase,
  Sale,
  SaleLine,
} from '../types'

export type AppData = {
  products: Product[]
  customers: Customer[]
  sales: Sale[]
  purchases: Purchase[]
  production: ProductionEntry[]
  notifications: AppNotification[]
}

export function hasAnyAppData(data: AppData): boolean {
  return (
    data.products.length > 0 ||
    data.customers.length > 0 ||
    data.sales.length > 0 ||
    data.purchases.length > 0 ||
    data.production.length > 0 ||
    data.notifications.length > 0
  )
}

function num(v: unknown): number {
  return typeof v === 'number' ? v : Number(v)
}

export async function fetchFullState(sb: SupabaseClient): Promise<AppData> {
  const { data: customersRows, error: ce } = await sb
    .from('customers')
    .select('id,name,phone,location')
    .order('name')
  if (ce) throw new Error(ce.message)

  const { data: productsRows, error: pe } = await sb
    .from('products')
    .select('id,name,category,price,stock')
    .order('name')
  if (pe) throw new Error(pe.message)

  const { data: salesRows, error: se } = await sb
    .from('sales')
    .select('id,customer_id,sale_date')
    .order('sale_date', { ascending: false })
  if (se) throw new Error(se.message)

  const { data: lineRows, error: le } = await sb
    .from('sale_lines')
    .select('id,sale_id,product_id,quantity,unit_price')
  if (le) throw new Error(le.message)

  const { data: purchaseRows, error: pre } = await sb
    .from('purchases')
    .select('id,supplier,product_id,quantity,cost,purchase_date')
    .order('purchase_date', { ascending: false })
  if (pre) throw new Error(pre.message)

  const { data: productionRows, error: prde } = await sb
    .from('production')
    .select('id,product_id,quantity,production_date,notes')
    .order('production_date', { ascending: false })
  if (prde) throw new Error(prde.message)

  let notifications: AppNotification[] = []
  const { data: noteRows, error: ne } = await sb
    .from('app_notifications')
    .select('id,message,read,created_at')
    .order('created_at', { ascending: false })
  if (!ne && noteRows) {
    notifications = noteRows.map((r) => ({
      id: String(r.id),
      message: String(r.message),
      read: Boolean(r.read),
      createdAt: String(r.created_at),
    }))
  }

  const customers: Customer[] = (customersRows ?? []).map((r) => ({
    id: String(r.id),
    name: String(r.name),
    phone: String(r.phone ?? ''),
    location: String(r.location ?? ''),
  }))

  const products: Product[] = (productsRows ?? []).map((r) => ({
    id: String(r.id),
    name: String(r.name),
    category: String(r.category ?? ''),
    price: num(r.price),
    stock: Math.round(num(r.stock)),
  }))

  const linesBySale = new Map<string, SaleLine[]>()
  for (const r of lineRows ?? []) {
    const sid = String(r.sale_id)
    const line: SaleLine = {
      productId: String(r.product_id),
      quantity: Math.round(num(r.quantity)),
      unitPrice: num(r.unit_price),
    }
    if (!linesBySale.has(sid)) linesBySale.set(sid, [])
    linesBySale.get(sid)!.push(line)
  }

  const sales: Sale[] = (salesRows ?? []).map((r) => ({
    id: String(r.id),
    customerId: String(r.customer_id),
    date: String(r.sale_date),
    lines: linesBySale.get(String(r.id)) ?? [],
  }))

  const purchases: Purchase[] = (purchaseRows ?? []).map((r) => ({
    id: String(r.id),
    supplier: String(r.supplier),
    productId: String(r.product_id),
    quantity: Math.round(num(r.quantity)),
    cost: num(r.cost),
    date: String(r.purchase_date),
  }))

  const production: ProductionEntry[] = (productionRows ?? []).map((r) => ({
    id: String(r.id),
    productId: String(r.product_id),
    quantity: Math.round(num(r.quantity)),
    date: String(r.production_date),
    notes: String(r.notes ?? ''),
  }))

  return {
    products,
    customers,
    sales,
    purchases,
    production,
    notifications,
  }
}

async function deleteMissingById(
  sb: SupabaseClient,
  table: string,
  desiredIds: string[],
): Promise<{ error?: string }> {
  const { data, error } = await sb.from(table).select('id')
  if (error) return { error: `${table} fetch ids: ${error.message}` }
  const existingIds = (data ?? []).map((r) => String((r as { id: string }).id))
  const toDelete = existingIds.filter((id) => !desiredIds.includes(id))
  if (!toDelete.length) return {}
  const { error: delErr } = await sb.from(table).delete().in('id', toDelete)
  if (delErr) return { error: `${table} delete missing: ${delErr.message}` }
  return {}
}

/** Safely sync domain rows with current app state (debounced from UI). */
export async function syncAppDataToTables(
  sb: SupabaseClient,
  data: AppData,
): Promise<{ error?: string }> {
  {
    const r = await deleteMissingById(
      sb,
      'customers',
      data.customers.map((x) => x.id),
    )
    if (r.error) return { error: r.error }
  }
  if (data.customers.length) {
    const { error } = await sb.from('customers').upsert(
      data.customers.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        location: c.location,
      })),
      { onConflict: 'id' },
    )
    if (error) return { error: `customers: ${error.message}` }
  }

  {
    const r = await deleteMissingById(
      sb,
      'products',
      data.products.map((x) => x.id),
    )
    if (r.error) return { error: r.error }
  }
  if (data.products.length) {
    const { error } = await sb.from('products').upsert(
      data.products.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        stock: p.stock,
      })),
      { onConflict: 'id' },
    )
    if (error) return { error: `products: ${error.message}` }
  }

  {
    const r = await deleteMissingById(
      sb,
      'purchases',
      data.purchases.map((x) => x.id),
    )
    if (r.error) return { error: r.error }
  }
  if (data.purchases.length) {
    const { error } = await sb.from('purchases').upsert(
      data.purchases.map((p) => ({
        id: p.id,
        supplier: p.supplier,
        product_id: p.productId,
        quantity: p.quantity,
        cost: p.cost,
        purchase_date: p.date,
      })),
      { onConflict: 'id' },
    )
    if (error) return { error: `purchases: ${error.message}` }
  }

  {
    const r = await deleteMissingById(
      sb,
      'production',
      data.production.map((x) => x.id),
    )
    if (r.error) return { error: r.error }
  }
  if (data.production.length) {
    const { error } = await sb.from('production').upsert(
      data.production.map((e) => ({
        id: e.id,
        product_id: e.productId,
        quantity: e.quantity,
        production_date: e.date,
        notes: e.notes,
      })),
      { onConflict: 'id' },
    )
    if (error) return { error: `production: ${error.message}` }
  }

  {
    const desiredSaleIds = data.sales.map((s) => s.id)
    const { data: existingSales, error: salesFetchErr } = await sb
      .from('sales')
      .select('id')
    if (salesFetchErr) return { error: `sales fetch ids: ${salesFetchErr.message}` }
    const existingSaleIds = (existingSales ?? []).map((r) =>
      String((r as { id: string }).id),
    )
    const toDeleteSales = existingSaleIds.filter((id) => !desiredSaleIds.includes(id))
    if (toDeleteSales.length) {
      const { error: dl1 } = await sb.from('sale_lines').delete().in('sale_id', toDeleteSales)
      if (dl1) return { error: `sale_lines delete missing: ${dl1.message}` }
      const { error: dl2 } = await sb.from('sales').delete().in('id', toDeleteSales)
      if (dl2) return { error: `sales delete missing: ${dl2.message}` }
    }
  }

  for (const s of data.sales) {
    const { error: se } = await sb.from('sales').upsert(
      {
        id: s.id,
        customer_id: s.customerId,
        sale_date: s.date,
      },
      { onConflict: 'id' },
    )
    if (se) return { error: `sales: ${se.message}` }
    const { error: clearLinesErr } = await sb.from('sale_lines').delete().eq('sale_id', s.id)
    if (clearLinesErr) return { error: `sale_lines clear: ${clearLinesErr.message}` }
    if (s.lines.length) {
      const { error: le } = await sb.from('sale_lines').insert(
        s.lines.map((l) => ({
          sale_id: s.id,
          product_id: l.productId,
          quantity: l.quantity,
          unit_price: l.unitPrice,
        })),
      )
      if (le) return { error: `sale_lines: ${le.message}` }
    }
  }

  {
    const r = await deleteMissingById(
      sb,
      'app_notifications',
      data.notifications.map((x) => x.id),
    )
    if (r.error) return { error: r.error }
  }
  if (data.notifications.length) {
    const { error } = await sb.from('app_notifications').upsert(
      data.notifications.map((n) => ({
        id: n.id,
        message: n.message,
        read: n.read,
        created_at: n.createdAt,
      })),
      { onConflict: 'id' },
    )
    if (error) {
      return {
        error: `app_notifications: ${error.message}. Run 003_app_notifications.sql`,
      }
    }
  }

  return {}
}
