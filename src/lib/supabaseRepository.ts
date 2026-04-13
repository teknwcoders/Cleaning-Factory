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

/** Replace all domain rows with current app state (debounced from UI). */
export async function syncAppDataToTables(
  sb: SupabaseClient,
  data: AppData,
): Promise<{ error?: string }> {
  const { error: rpcErr } = await sb.rpc('truncate_factory_domain')
  if (rpcErr) {
    return {
      error: `truncate_factory_domain: ${rpcErr.message}. Run supabase/migrations/004_truncate_factory_domain.sql`,
    }
  }

  if (data.customers.length) {
    const { error } = await sb.from('customers').insert(
      data.customers.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        location: c.location,
      })),
    )
    if (error) return { error: `customers: ${error.message}` }
  }

  if (data.products.length) {
    const { error } = await sb.from('products').insert(
      data.products.map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: p.price,
        stock: p.stock,
      })),
    )
    if (error) return { error: `products: ${error.message}` }
  }

  for (const s of data.sales) {
    const { error: se } = await sb.from('sales').insert({
      id: s.id,
      customer_id: s.customerId,
      sale_date: s.date,
    })
    if (se) return { error: `sales: ${se.message}` }
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

  if (data.purchases.length) {
    const { error } = await sb.from('purchases').insert(
      data.purchases.map((p) => ({
        id: p.id,
        supplier: p.supplier,
        product_id: p.productId,
        quantity: p.quantity,
        cost: p.cost,
        purchase_date: p.date,
      })),
    )
    if (error) return { error: `purchases: ${error.message}` }
  }

  if (data.production.length) {
    const { error } = await sb.from('production').insert(
      data.production.map((e) => ({
        id: e.id,
        product_id: e.productId,
        quantity: e.quantity,
        production_date: e.date,
        notes: e.notes,
      })),
    )
    if (error) return { error: `production: ${error.message}` }
  }

  if (data.notifications.length) {
    const { error } = await sb.from('app_notifications').insert(
      data.notifications.map((n) => ({
        id: n.id,
        message: n.message,
        read: n.read,
        created_at: n.createdAt,
      })),
    )
    if (error) {
      return {
        error: `app_notifications: ${error.message}. Run 003_app_notifications.sql`,
      }
    }
  }

  return {}
}
