import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import type {
  AppNotification,
  Customer,
  Order,
  OrderItem,
  Product,
  ProductionEntry,
  Purchase,
  Sale,
  SaleLine,
} from '../types'
import { saleOrderTotal, stockStatus } from '../types'
import { useAuth } from './AuthContext'
import { useUiFeedback } from './UiFeedbackContext'
import { getSupabase, isSupabaseConfigured } from '../lib/supabase'
import {
  fetchFullState,
  syncAppDataToTables,
  type AppData,
} from '../lib/supabaseRepository'

const STORAGE_KEY = 'ccf-data-v1'

/** Use as `title` / spread onto write actions when `readOnly` is true. */
export const READ_ONLY_CONTROL_TITLE =
  'View only — sign out and sign in with manager access to edit.'

export type ReadOnlyButtonProps = Pick<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'disabled' | 'title'
>

function id(): string {
  return crypto.randomUUID()
}

function cloneProducts(products: Product[]): Product[] {
  return products.map((p) => ({ ...p }))
}

function restoreLines(products: Product[], lines: SaleLine[]): Product[] {
  const next = cloneProducts(products)
  for (const line of lines) {
    const i = next.findIndex((p) => p.id === line.productId)
    if (i >= 0)
      next[i] = { ...next[i], stock: next[i].stock + line.quantity }
  }
  return next
}

/** Add/subtract stock for purchase & production corrections (delta may be negative). */
function applyStockDelta(
  products: Product[],
  productId: string,
  delta: number,
): { ok: true; products: Product[] } | { ok: false; error: string } {
  const next = cloneProducts(products)
  const i = next.findIndex((p) => p.id === productId)
  if (i < 0) return { ok: false, error: 'Product not found.' }
  const s = next[i].stock + delta
  if (s < 0) {
    return {
      ok: false,
      error:
        'Current stock is too low to undo this entry. Adjust sales or inventory first.',
    }
  }
  next[i] = { ...next[i], stock: s }
  return { ok: true, products: next }
}

function trySubtractLines(
  products: Product[],
  lines: SaleLine[],
): { ok: true; products: Product[] } | { ok: false; error: string } {
  const next = cloneProducts(products)
  for (const line of lines) {
    if (line.quantity <= 0) {
      return {
        ok: false,
        error: 'Each line needs a quantity greater than zero.',
      }
    }
    const i = next.findIndex((p) => p.id === line.productId)
    if (i < 0) return { ok: false, error: 'One or more products were not found.' }
    const p = next[i]
    if (p.stock < line.quantity) {
      return {
        ok: false,
        error: `Not enough stock for "${p.name}". Available: ${p.stock}.`,
      }
    }
    next[i] = { ...p, stock: p.stock - line.quantity }
  }
  return { ok: true, products: next }
}

function lineProductIds(lines: SaleLine[]): string[] {
  return [...new Set(lines.map((l) => l.productId))]
}

function mergeStockNotifications(
  base: AppNotification[],
  nextProducts: Product[],
  productIds: string[],
): AppNotification[] {
  let notes = [...base]
  const seen = new Set<string>()
  for (const pid of productIds) {
    if (seen.has(pid)) continue
    seen.add(pid)
    const next = nextProducts.find((p) => p.id === pid)
    if (!next) continue
    const st = stockStatus(next.stock)
    if (st === 'low_stock') {
      notes = [
        {
          id: id(),
          message: `${next.name} is now low on stock (${next.stock} left).`,
          createdAt: new Date().toISOString(),
          read: false,
        },
        ...notes,
      ].slice(0, 50)
    }
    if (st === 'out_of_stock') {
      notes = [
        {
          id: id(),
          message: `${next.name} is out of stock.`,
          createdAt: new Date().toISOString(),
          read: false,
        },
        ...notes,
      ].slice(0, 50)
    }
  }
  return notes
}

function migrateSales(raw: unknown): Sale[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item: unknown) => {
    const s = item as Record<string, unknown> | null
    if (!s || typeof s !== 'object') {
      return {
        id: id(),
        customerId: '',
        date: new Date().toISOString(),
        lines: [],
      }
    }
    if (Array.isArray(s.lines)) {
      const lines = (s.lines as Record<string, unknown>[]).map((l) => ({
        productId: String(l.productId),
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
      }))
      return {
        id: String(s.id),
        customerId: String(s.customerId),
        date: String(s.date),
        lines,
      }
    }
    if (typeof s.productId === 'string') {
      return {
        id: String(s.id),
        customerId: String(s.customerId),
        date: String(s.date),
        lines: [
          {
            productId: s.productId,
            quantity: Number(s.quantity),
            unitPrice: Number(s.unitPrice),
          },
        ],
      }
    }
    return {
      id: String(s.id ?? id()),
      customerId: String(s.customerId ?? ''),
      date: String(s.date ?? new Date().toISOString()),
      lines: [],
    }
  })
}

function migrateOrders(raw: unknown): Order[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item: unknown) => {
    const o = item as Record<string, unknown> | null
    if (!o || typeof o !== 'object') {
      return {
        id: id(),
        customerName: '',
        phone: '',
        location: '',
        date: new Date().toISOString(),
        items: [],
      }
    }
    const rawItems = Array.isArray(o.items) ? o.items : []
    const items: OrderItem[] = rawItems.map((entry) => {
      const x = entry as Record<string, unknown>
      const price =
        typeof x.price === 'number' || typeof x.price === 'string'
          ? Number(x.price)
          : undefined
      return {
        name: String(x.name ?? ''),
        quantity: Number(x.quantity ?? 0),
        price: Number.isFinite(price) ? price : undefined,
      }
    })
    return {
      id: String(o.id ?? id()),
      customerName: String(o.customerName ?? ''),
      phone: String(o.phone ?? ''),
      location: String(o.location ?? ''),
      date: String(o.date ?? new Date().toISOString()),
      items,
    }
  })
}

function emptyAppData(): AppData {
  return {
    products: [],
    customers: [],
    sales: [],
    purchases: [],
    production: [],
    notifications: [],
  }
}

function migrateCustomers(raw: unknown): Customer[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item: unknown) => {
    const c = item as Record<string, unknown>
    const cid =
      typeof c.id === 'string' && c.id.length > 0 ? c.id : id()
    return {
      id: cid,
      name: String(c.name ?? ''),
      phone: String(c.phone ?? ''),
      location: typeof c.location === 'string' ? c.location : '',
    }
  })
}

function hydrateAppData(p: Record<string, unknown>): AppData | null {
  if (!p.products || !p.customers) return null
  return {
    products: p.products as Product[],
    customers: migrateCustomers(p.customers),
    sales: migrateSales(p.sales),
    purchases: (p.purchases ?? []) as Purchase[],
    production: (p.production ?? []) as ProductionEntry[],
    notifications: (p.notifications ?? []) as AppNotification[],
  }
}

function load(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const p = JSON.parse(raw) as Record<string, unknown>
      const h = hydrateAppData(p)
      if (h) return h
    }
  } catch {
    /* ignore */
  }
  return emptyAppData()
}

export type RemoteBootstrapState = 'skipped' | 'loading' | 'ready' | 'error'
export type CloudSyncState = 'idle' | 'syncing' | 'saved' | 'error'

type DataContextValue = AppData & {
  orders: Order[]
  /** First load from Supabase (or skipped if env not set). */
  remoteBootstrap: RemoteBootstrapState
  remoteBootstrapError: string | null
  /** Debounced write to Supabase tables. */
  cloudSync: CloudSyncState
  cloudSyncError: string | null
  retryRemoteBootstrap: () => void
  dismissCloudSyncMessage: () => void
  /** True when signed in as viewer — UI should hide writes; mutations no-op. */
  readOnly: boolean
  /** Spread onto buttons that perform writes (disabled + tooltip when viewer). */
  readOnlyButtonProps: ReadOnlyButtonProps
  addProduct: (p: Omit<Product, 'id'>) => void
  updateProduct: (p: Product) => void
  deleteProduct: (productId: string) => void
  addCustomer: (c: Omit<Customer, 'id'>) => void
  updateCustomer: (c: Customer) => void
  deleteCustomer: (customerId: string) => { ok: true } | { ok: false; error: string }
  addSale: (input: {
    customerId: string
    date: string
    lines: SaleLine[]
  }) => { ok: true } | { ok: false; error: string }
  updateSale: (
    saleId: string,
    input: { customerId: string; date: string; lines: SaleLine[] },
  ) => { ok: true } | { ok: false; error: string }
  deleteSale: (saleId: string) => void
  addPurchase: (input: Omit<Purchase, 'id'>) => void
  updatePurchase: (
    purchaseId: string,
    input: Omit<Purchase, 'id'>,
  ) => { ok: true } | { ok: false; error: string }
  deletePurchase: (
    purchaseId: string,
  ) => { ok: true } | { ok: false; error: string }
  addProduction: (input: Omit<ProductionEntry, 'id'>) => void
  updateProduction: (
    entryId: string,
    input: Omit<ProductionEntry, 'id'>,
  ) => { ok: true } | { ok: false; error: string }
  deleteProduction: (
    entryId: string,
  ) => { ok: true } | { ok: false; error: string }
  markNotificationRead: (nid: string) => void
  markAllNotificationsRead: () => void
  pushNotification: (message: string) => void
  addOrder: (input: Omit<Order, 'id'>) => { ok: true } | { ok: false; error: string }
  updateOrder: (
    orderId: string,
    input: Omit<Order, 'id'>,
  ) => { ok: true } | { ok: false; error: string }
  deleteOrder: (orderId: string) => void
  customerOrderCount: (customerId: string) => number
  lowStockProducts: Product[]
  todaySalesTotal: number
  todayRevenue: number
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const { role: authRole } = useAuth()
  const readOnly = authRole === 'viewer'
  const readOnlyButtonProps = useMemo<ReadOnlyButtonProps>(
    () =>
      readOnly
        ? { disabled: true, title: READ_ONLY_CONTROL_TITLE }
        : {},
    [readOnly],
  )
  const { showToast } = useUiFeedback()
  const readOnlyGuard = useCallback(() => {
    if (!readOnly) return true
    showToast({
      message: 'View only — you cannot change data.',
      variant: 'error',
    })
    return false
  }, [readOnly, showToast])

  const [data, setData] = useState<AppData>(load)
  const [orders, setOrders] = useState<Order[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw) as Record<string, unknown>
      return migrateOrders(parsed.orders)
    } catch {
      return []
    }
  })
  const remoteHydratedRef = useRef(!getSupabase())
  const [remoteBootstrap, setRemoteBootstrap] = useState<RemoteBootstrapState>(
    () => (isSupabaseConfigured() ? 'loading' : 'skipped'),
  )
  const [remoteBootstrapError, setRemoteBootstrapError] = useState<
    string | null
  >(null)
  const [bootstrapNonce, setBootstrapNonce] = useState(0)
  const [cloudSync, setCloudSync] = useState<CloudSyncState>('idle')
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null)

  const retryRemoteBootstrap = useCallback(() => {
    if (!getSupabase()) return
    setRemoteBootstrapError(null)
    setRemoteBootstrap('loading')
    remoteHydratedRef.current = false
    setBootstrapNonce((n) => n + 1)
  }, [])

  const dismissCloudSyncMessage = useCallback(() => {
    setCloudSync('idle')
    setCloudSyncError(null)
  }, [])

  useEffect(() => {
    const sb = getSupabase()
    if (!sb) {
      remoteHydratedRef.current = true
      setRemoteBootstrap('skipped')
      setRemoteBootstrapError(null)
      return
    }
    remoteHydratedRef.current = false
    let cancelled = false
    ;(async () => {
      try {
        const remote = await fetchFullState(sb)
        if (cancelled) return
        setData(remote)
        setRemoteBootstrapError(null)
        setRemoteBootstrap('ready')
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        console.warn('[Supabase] Could not load from database:', e)
        setRemoteBootstrapError(msg)
        setRemoteBootstrap('error')
      } finally {
        if (!cancelled) remoteHydratedRef.current = true
      }
    })()
    return () => {
      cancelled = true
    }
  }, [bootstrapNonce])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, orders }))
    } catch {
      /* ignore */
    }
    const sb = getSupabase()
    if (!sb) {
      setCloudSync('idle')
      setCloudSyncError(null)
      return
    }
    if (!remoteHydratedRef.current) return
    if (readOnly) {
      setCloudSync('idle')
      setCloudSyncError(null)
      return
    }
    const t = window.setTimeout(() => {
      void (async () => {
        setCloudSync('syncing')
        setCloudSyncError(null)
        const r = await syncAppDataToTables(sb, data)
        if (r.error) {
          console.warn('[Supabase sync]', r.error)
          setCloudSync('error')
          setCloudSyncError(r.error)
        } else {
          setCloudSync('saved')
          setCloudSyncError(null)
          window.setTimeout(() => {
            setCloudSync((s) => (s === 'saved' ? 'idle' : s))
          }, 2200)
        }
      })()
    }, 650)
    return () => window.clearTimeout(t)
  }, [data, orders, readOnly])

  const pushNotification = useCallback((message: string) => {
    if (!readOnlyGuard()) return
    setData((d) => ({
      ...d,
      notifications: [
        {
          id: id(),
          message,
          createdAt: new Date().toISOString(),
          read: false,
        },
        ...d.notifications,
      ].slice(0, 50),
    }))
  }, [readOnlyGuard])

  const addOrder = useCallback(
    (input: Omit<Order, 'id'>): { ok: true } | { ok: false; error: string } => {
      if (!readOnlyGuard()) return { ok: false, error: 'View only.' }
      const cleanName = input.customerName.trim()
      if (!cleanName) return { ok: false, error: 'Customer name is required.' }
      const normalizedItems = input.items
        .map((item) => ({
          name: item.name.trim(),
          quantity: Number(item.quantity),
          price:
            item.price === undefined || item.price === null
              ? undefined
              : Number(item.price),
        }))
        .filter((item) => item.name && Number.isFinite(item.quantity) && item.quantity > 0)
      if (!normalizedItems.length) {
        return { ok: false, error: 'Add at least one product with quantity.' }
      }
      setOrders((prev) => [
        {
          id: id(),
          customerName: cleanName,
          phone: input.phone.trim(),
          location: input.location.trim(),
          date: new Date(input.date).toISOString(),
          items: normalizedItems,
        },
        ...prev,
      ])
      return { ok: true }
    },
    [readOnlyGuard],
  )

  const updateOrder = useCallback(
    (
      orderId: string,
      input: Omit<Order, 'id'>,
    ): { ok: true } | { ok: false; error: string } => {
      if (!readOnlyGuard()) return { ok: false, error: 'View only.' }
      const cleanName = input.customerName.trim()
      if (!cleanName) return { ok: false, error: 'Customer name is required.' }
      const normalizedItems = input.items
        .map((item) => ({
          name: item.name.trim(),
          quantity: Number(item.quantity),
          price:
            item.price === undefined || item.price === null
              ? undefined
              : Number(item.price),
        }))
        .filter((item) => item.name && Number.isFinite(item.quantity) && item.quantity > 0)
      if (!normalizedItems.length) {
        return { ok: false, error: 'Add at least one product with quantity.' }
      }
      let found = false
      setOrders((prev) =>
        prev.map((order) => {
          if (order.id !== orderId) return order
          found = true
          return {
            ...order,
            customerName: cleanName,
            phone: input.phone.trim(),
            location: input.location.trim(),
            date: new Date(input.date).toISOString(),
            items: normalizedItems,
          }
        }),
      )
      if (!found) return { ok: false, error: 'Order not found.' }
      return { ok: true }
    },
    [readOnlyGuard],
  )

  const deleteOrder = useCallback(
    (orderId: string) => {
      if (!readOnlyGuard()) return
      setOrders((prev) => prev.filter((order) => order.id !== orderId))
    },
    [readOnlyGuard],
  )

  const addProduct = useCallback((p: Omit<Product, 'id'>) => {
    if (!readOnlyGuard()) return
    setData((d) => ({
      ...d,
      products: [...d.products, { ...p, id: id() }],
    }))
  }, [readOnlyGuard])

  const updateProduct = useCallback((p: Product) => {
    if (!readOnlyGuard()) return
    setData((d) => ({
      ...d,
      products: d.products.map((x) => (x.id === p.id ? p : x)),
    }))
  }, [readOnlyGuard])

  const deleteProduct = useCallback((productId: string) => {
    if (!readOnlyGuard()) return
    setData((d) => ({
      ...d,
      products: d.products.filter((x) => x.id !== productId),
    }))
  }, [readOnlyGuard])

  const addCustomer = useCallback((c: Omit<Customer, 'id'>) => {
    if (!readOnlyGuard()) return
    setData((d) => ({
      ...d,
      customers: [...d.customers, { ...c, id: id() }],
    }))
  }, [readOnlyGuard])

  const updateCustomer = useCallback((c: Customer) => {
    if (!readOnlyGuard()) return
    setData((d) => ({
      ...d,
      customers: d.customers.map((x) => (x.id === c.id ? c : x)),
    }))
  }, [readOnlyGuard])

  const deleteCustomer = useCallback(
    (
      customerId: string,
    ): { ok: true } | { ok: false; error: string } => {
      if (!readOnlyGuard()) return { ok: false, error: 'View only.' }
      let err: string | null = null
      setData((d) => {
        const hasSales = d.sales.some((s) => s.customerId === customerId)
        if (hasSales) {
          err =
            'Cannot delete a customer with existing sales. Remove or reassign those orders first.'
          return d
        }
        return {
          ...d,
          customers: d.customers.filter((x) => x.id !== customerId),
        }
      })
      if (err) return { ok: false, error: err }
      return { ok: true }
    },
    [readOnlyGuard],
  )

  const addSale = useCallback(
    (input: {
      customerId: string
      date: string
      lines: SaleLine[]
    }): { ok: true } | { ok: false; error: string } => {
      if (!readOnlyGuard()) return { ok: false, error: 'View only.' }
      let err: string | null = null
      setData((d) => {
        if (!input.lines.length) {
          err = 'Add at least one product line.'
          return d
        }
        const sub = trySubtractLines(d.products, input.lines)
        if (!sub.ok) {
          err = sub.error
          return d
        }
        const notifications = mergeStockNotifications(
          d.notifications,
          sub.products,
          lineProductIds(input.lines),
        )
        const sale: Sale = {
          id: id(),
          customerId: input.customerId,
          date: new Date(input.date).toISOString(),
          lines: input.lines.map((l) => ({ ...l })),
        }
        return {
          ...d,
          products: sub.products,
          sales: [sale, ...d.sales],
          notifications,
        }
      })
      if (err) return { ok: false, error: err }
      return { ok: true }
    },
    [readOnlyGuard],
  )

  const updateSale = useCallback(
    (
      saleId: string,
      input: { customerId: string; date: string; lines: SaleLine[] },
    ): { ok: true } | { ok: false; error: string } => {
      if (!readOnlyGuard()) return { ok: false, error: 'View only.' }
      let err: string | null = null
      setData((d) => {
        const sale = d.sales.find((x) => x.id === saleId)
        if (!sale) {
          err = 'Sale not found.'
          return d
        }
        if (!input.lines.length) {
          err = 'Add at least one product line.'
          return d
        }
        const restored = restoreLines(d.products, sale.lines)
        const sub = trySubtractLines(restored, input.lines)
        if (!sub.ok) {
          err = sub.error
          return d
        }
        const notifications = mergeStockNotifications(
          d.notifications,
          sub.products,
          lineProductIds(input.lines),
        )
        const newSale: Sale = {
          ...sale,
          customerId: input.customerId,
          date: new Date(input.date).toISOString(),
          lines: input.lines.map((l) => ({ ...l })),
        }
        return {
          ...d,
          products: sub.products,
          sales: d.sales.map((s) => (s.id === saleId ? newSale : s)),
          notifications,
        }
      })
      if (err) return { ok: false, error: err }
      return { ok: true }
    },
    [readOnlyGuard],
  )

  const deleteSale = useCallback((saleId: string) => {
    if (!readOnlyGuard()) return
    setData((d) => {
      const sale = d.sales.find((x) => x.id === saleId)
      if (!sale) return d
      return {
        ...d,
        products: restoreLines(d.products, sale.lines),
        sales: d.sales.filter((x) => x.id !== saleId),
      }
    })
  }, [readOnlyGuard])

  const addPurchase = useCallback((input: Omit<Purchase, 'id'>) => {
    if (!readOnlyGuard()) return
    setData((d) => {
      const prod = d.products.find((x) => x.id === input.productId)
      const nextProducts = prod
        ? d.products.map((x) =>
            x.id === prod.id ? { ...x, stock: x.stock + input.quantity } : x,
          )
        : d.products
      const purchase: Purchase = { ...input, id: id() }
      return { ...d, products: nextProducts, purchases: [purchase, ...d.purchases] }
    })
  }, [readOnlyGuard])

  const updatePurchase = useCallback(
    (
      purchaseId: string,
      input: Omit<Purchase, 'id'>,
    ): { ok: true } | { ok: false; error: string } => {
      if (!readOnlyGuard()) return { ok: false, error: 'View only.' }
      let err: string | null = null
      setData((d) => {
        const old = d.purchases.find((x) => x.id === purchaseId)
        if (!old) {
          err = 'Purchase not found.'
          return d
        }
        if (input.quantity <= 0) {
          err = 'Quantity must be greater than zero.'
          return d
        }
        let products = cloneProducts(d.products)
        const r1 = applyStockDelta(products, old.productId, -old.quantity)
        if (!r1.ok) {
          err = r1.error
          return d
        }
        products = r1.products
        const r2 = applyStockDelta(products, input.productId, input.quantity)
        if (!r2.ok) {
          err = r2.error
          return d
        }
        products = r2.products
        const next: Purchase = {
          ...old,
          supplier: input.supplier.trim(),
          productId: input.productId,
          quantity: input.quantity,
          cost: input.cost,
          date: new Date(input.date).toISOString(),
        }
        return {
          ...d,
          products,
          purchases: d.purchases.map((p) => (p.id === purchaseId ? next : p)),
        }
      })
      if (err) return { ok: false, error: err }
      return { ok: true }
    },
    [readOnlyGuard],
  )

  const deletePurchase = useCallback(
    (purchaseId: string): { ok: true } | { ok: false; error: string } => {
      if (!readOnlyGuard()) return { ok: false, error: 'View only.' }
      let err: string | null = null
      setData((d) => {
        const old = d.purchases.find((x) => x.id === purchaseId)
        if (!old) return d
        const r = applyStockDelta(
          cloneProducts(d.products),
          old.productId,
          -old.quantity,
        )
        if (!r.ok) {
          err = r.error
          return d
        }
        return {
          ...d,
          products: r.products,
          purchases: d.purchases.filter((p) => p.id !== purchaseId),
        }
      })
      if (err) return { ok: false, error: err }
      return { ok: true }
    },
    [readOnlyGuard],
  )

  const addProduction = useCallback((input: Omit<ProductionEntry, 'id'>) => {
    if (!readOnlyGuard()) return
    setData((d) => {
      const prod = d.products.find((x) => x.id === input.productId)
      const nextProducts = prod
        ? d.products.map((x) =>
            x.id === prod.id ? { ...x, stock: x.stock + input.quantity } : x,
          )
        : d.products
      const entry: ProductionEntry = { ...input, id: id() }
      return {
        ...d,
        products: nextProducts,
        production: [entry, ...d.production],
      }
    })
  }, [readOnlyGuard])

  const updateProduction = useCallback(
    (
      entryId: string,
      input: Omit<ProductionEntry, 'id'>,
    ): { ok: true } | { ok: false; error: string } => {
      if (!readOnlyGuard()) return { ok: false, error: 'View only.' }
      let err: string | null = null
      setData((d) => {
        const old = d.production.find((x) => x.id === entryId)
        if (!old) {
          err = 'Entry not found.'
          return d
        }
        if (input.quantity <= 0) {
          err = 'Quantity must be greater than zero.'
          return d
        }
        let products = cloneProducts(d.products)
        const r1 = applyStockDelta(products, old.productId, -old.quantity)
        if (!r1.ok) {
          err = r1.error
          return d
        }
        products = r1.products
        const r2 = applyStockDelta(products, input.productId, input.quantity)
        if (!r2.ok) {
          err = r2.error
          return d
        }
        products = r2.products
        const next: ProductionEntry = {
          ...old,
          productId: input.productId,
          quantity: input.quantity,
          date: new Date(input.date).toISOString(),
          notes: input.notes.trim(),
        }
        return {
          ...d,
          products,
          production: d.production.map((e) => (e.id === entryId ? next : e)),
        }
      })
      if (err) return { ok: false, error: err }
      return { ok: true }
    },
    [readOnlyGuard],
  )

  const deleteProduction = useCallback(
    (entryId: string): { ok: true } | { ok: false; error: string } => {
      if (!readOnlyGuard()) return { ok: false, error: 'View only.' }
      let err: string | null = null
      setData((d) => {
        const old = d.production.find((x) => x.id === entryId)
        if (!old) return d
        const r = applyStockDelta(
          cloneProducts(d.products),
          old.productId,
          -old.quantity,
        )
        if (!r.ok) {
          err = r.error
          return d
        }
        return {
          ...d,
          products: r.products,
          production: d.production.filter((e) => e.id !== entryId),
        }
      })
      if (err) return { ok: false, error: err }
      return { ok: true }
    },
    [readOnlyGuard],
  )

  const markNotificationRead = useCallback((nid: string) => {
    setData((d) => ({
      ...d,
      notifications: d.notifications.map((n) =>
        n.id === nid ? { ...n, read: true } : n,
      ),
    }))
  }, [])

  const markAllNotificationsRead = useCallback(() => {
    setData((d) => ({
      ...d,
      notifications: d.notifications.map((n) => ({ ...n, read: true })),
    }))
  }, [])

  const customerOrderCount = useCallback(
    (customerId: string) =>
      data.sales.filter((s) => s.customerId === customerId).length,
    [data.sales],
  )

  const lowStockProducts = useMemo(
    () => data.products.filter((p) => stockStatus(p.stock) !== 'in_stock'),
    [data.products],
  )

  const { todaySalesTotal, todayRevenue } = useMemo(() => {
    const start = new Date()
    start.setHours(0, 0, 0, 0)
    const t = start.getTime()
    let count = 0
    let rev = 0
    for (const s of data.sales) {
      if (new Date(s.date).getTime() >= t) {
        count += 1
        rev += saleOrderTotal(s)
      }
    }
    return { todaySalesTotal: count, todayRevenue: rev }
  }, [data.sales])

  const value = useMemo<DataContextValue>(
    () => ({
      ...data,
      orders,
      remoteBootstrap,
      remoteBootstrapError,
      cloudSync,
      cloudSyncError,
      retryRemoteBootstrap,
      dismissCloudSyncMessage,
      readOnly,
      readOnlyButtonProps,
      addProduct,
      updateProduct,
      deleteProduct,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      addSale,
      updateSale,
      deleteSale,
      addPurchase,
      updatePurchase,
      deletePurchase,
      addProduction,
      updateProduction,
      deleteProduction,
      markNotificationRead,
      markAllNotificationsRead,
      pushNotification,
      addOrder,
      updateOrder,
      deleteOrder,
      customerOrderCount,
      lowStockProducts,
      todaySalesTotal,
      todayRevenue,
    }),
    [
      data,
      orders,
      remoteBootstrap,
      remoteBootstrapError,
      cloudSync,
      cloudSyncError,
      retryRemoteBootstrap,
      dismissCloudSyncMessage,
      readOnly,
      readOnlyButtonProps,
      addProduct,
      updateProduct,
      deleteProduct,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      addSale,
      updateSale,
      deleteSale,
      addPurchase,
      updatePurchase,
      deletePurchase,
      addProduction,
      updateProduction,
      deleteProduction,
      markNotificationRead,
      markAllNotificationsRead,
      pushNotification,
      addOrder,
      updateOrder,
      deleteOrder,
      customerOrderCount,
      lowStockProducts,
      todaySalesTotal,
      todayRevenue,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used within DataProvider')
  return ctx
}
