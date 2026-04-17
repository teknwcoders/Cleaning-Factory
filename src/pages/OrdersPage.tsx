import {
  CalendarRange,
  ChevronDown,
  Download,
  MapPin,
  PackagePlus,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Modal } from '../components/Modal'
import { useAuth } from '../context/AuthContext'
import { READ_ONLY_CONTROL_TITLE, useData } from '../context/DataContext'
import { useUiFeedback } from '../context/UiFeedbackContext'
import type { Order, OrderItem } from '../types'
import { orderTotalPrice, orderTotalQuantity } from '../types'
import { downloadCsv } from '../utils/exportCsv'
import { formatDateShort, formatMoney, todayISO } from '../utils/format'

type DraftOrderItem = Omit<OrderItem, 'quantity'> & { key: string; quantity: number | '' }

function newKey() {
  return crypto.randomUUID()
}

function blankItem(name = ''): DraftOrderItem {
  return { key: newKey(), name, quantity: '', price: undefined }
}

function itemSummary(order: Order): string {
  if (!order.items.length) return 'No items'
  if (order.items.length <= 2) {
    return order.items.map((item) => `${item.name} x${item.quantity}`).join(', ')
  }
  return `${order.items.length} items`
}

function normalizeDateRangeEnd(isoDate: string): number | null {
  if (!isoDate) return null
  const d = new Date(`${isoDate}T23:59:59.999`)
  const t = d.getTime()
  return Number.isNaN(t) ? null : t
}

export function OrdersPage() {
  const { customers, products, orders, addOrder, updateOrder, deleteOrder, readOnly, readOnlyButtonProps } =
    useData()
  const { showToast } = useUiFeedback()
  const { hasPermission } = useAuth()
  const canCreateOrders = hasPermission('create_orders')
  const canEditOrders = hasPermission('edit_orders')

  const [customerId, setCustomerId] = useState(customers[0]?.id ?? '')
  const [customerSearch, setCustomerSearch] = useState('')
  const [customerName, setCustomerName] = useState(customers[0]?.name ?? '')
  const [phone, setPhone] = useState(customers[0]?.phone ?? '')
  const [location, setLocation] = useState(customers[0]?.location ?? '')
  const [orderDate, setOrderDate] = useState(todayISO())
  const [items, setItems] = useState<DraftOrderItem[]>([blankItem()])
  const [formError, setFormError] = useState('')

  const [searchQuery, setSearchQuery] = useState('')
  const [locationFilter, setLocationFilter] = useState('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [exportOpen, setExportOpen] = useState(false)
  const [ordersForPdf, setOrdersForPdf] = useState<Order[]>([])
  const [ordersPdfCaption, setOrdersPdfCaption] = useState('')

  const [editOpen, setEditOpen] = useState(false)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null)
  const [editCustomerName, setEditCustomerName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editDate, setEditDate] = useState(todayISO())
  const [editItems, setEditItems] = useState<DraftOrderItem[]>([])
  const [editError, setEditError] = useState('')

  const locationOptions = useMemo(
    () =>
      [...new Set(orders.map((order) => order.location.trim()).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b),
      ),
    [orders],
  )

  const productSuggestions = useMemo(() => {
    const fromCatalog = products.map((p) => p.name.trim()).filter(Boolean)
    const usage = new Map<string, number>()
    for (const order of orders) {
      for (const item of order.items) {
        const name = item.name.trim()
        if (!name) continue
        usage.set(name, (usage.get(name) ?? 0) + item.quantity)
      }
    }
    const frequent = [...usage.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name]) => name)
    return [...new Set([...frequent, ...fromCatalog])]
  }, [orders, products])

  const frequentProducts = productSuggestions.slice(0, 6)

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase()
    if (!q) return customers
    const next = customers.filter((c) => {
      const haystack = `${c.name} ${c.phone} ${c.location}`.toLowerCase()
      return haystack.includes(q)
    })
    return next.length ? next : customers
  }, [customerSearch, customers])

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    const start = fromDate ? new Date(`${fromDate}T00:00:00.000`).getTime() : null
    const end = normalizeDateRangeEnd(toDate)
    return orders
      .filter((order) => {
        const matchesQuery =
          !q ||
          order.customerName.toLowerCase().includes(q) ||
          order.phone.toLowerCase().includes(q) ||
          order.location.toLowerCase().includes(q)
        const matchesLocation =
          locationFilter === 'all' || order.location.trim() === locationFilter
        const dateMs = new Date(order.date).getTime()
        const matchesStart = start === null || dateMs >= start
        const matchesEnd = end === null || dateMs <= end
        return matchesQuery && matchesLocation && matchesStart && matchesEnd
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [orders, searchQuery, locationFilter, fromDate, toDate])

  const totalQtyPreview = useMemo(
    () => items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    [items],
  )
  const totalPricePreview = useMemo(
    () =>
      items.reduce(
        (sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.price) || 0),
        0,
      ),
    [items],
  )

  function applyCustomer(customerIdValue: string) {
    setCustomerId(customerIdValue)
    const selected = customers.find((c) => c.id === customerIdValue)
    if (!selected) return
    setCustomerName(selected.name)
    setPhone(selected.phone)
    setLocation(selected.location)
  }

  function addItem(prefill = '') {
    setItems((prev) => [...prev, blankItem(prefill)])
  }

  function updateItem(key: string, patch: Partial<DraftOrderItem>) {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)))
  }

  function removeItem(key: string) {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((item) => item.key !== key)))
  }

  function normalizeItems(list: DraftOrderItem[]): OrderItem[] {
    return list
      .map((item) => ({
        name: item.name.trim(),
        quantity: item.quantity === '' ? NaN : Number(item.quantity),
        price:
          item.price === undefined || item.price === null
            ? undefined
            : Number(item.price),
      }))
      .filter((item) => item.name && Number.isFinite(item.quantity) && item.quantity > 0)
  }

  function resetForm() {
    const firstCustomer = customers[0]
    setCustomerId(firstCustomer?.id ?? '')
    setCustomerName(firstCustomer?.name ?? '')
    setPhone(firstCustomer?.phone ?? '')
    setLocation(firstCustomer?.location ?? '')
    setCustomerSearch('')
    setOrderDate(todayISO())
    setItems([blankItem()])
  }

  function handleCreateOrder(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    const payload = normalizeItems(items)
    if (!customerName.trim()) {
      setFormError('Customer name is required.')
      return
    }
    if (!payload.length) {
      setFormError('Add at least one valid product item.')
      return
    }
    const res = addOrder({
      customerName: customerName.trim(),
      phone: phone.trim(),
      location: location.trim(),
      date: new Date(orderDate).toISOString(),
      items: payload,
    })
    if (!res.ok) {
      setFormError(res.error)
      return
    }
    showToast({ message: 'Order created.', variant: 'success' })
    resetForm()
  }

  function openEdit(order: Order) {
    setEditingOrder(order)
    setEditCustomerName(order.customerName)
    setEditPhone(order.phone)
    setEditLocation(order.location)
    const local = new Date(order.date)
    local.setMinutes(local.getMinutes() - local.getTimezoneOffset())
    setEditDate(local.toISOString().slice(0, 16))
    setEditItems(order.items.map((item) => ({ ...item, key: newKey() })))
    setEditError('')
    setEditOpen(true)
  }

  function updateEditItem(key: string, patch: Partial<DraftOrderItem>) {
    setEditItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)))
  }

  function removeEditItem(key: string) {
    setEditItems((prev) => (prev.length <= 1 ? prev : prev.filter((item) => item.key !== key)))
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingOrder) return
    setEditError('')
    const payload = normalizeItems(editItems)
    if (!editCustomerName.trim()) {
      setEditError('Customer name is required.')
      return
    }
    if (!payload.length) {
      setEditError('Add at least one valid product item.')
      return
    }
    const res = updateOrder(editingOrder.id, {
      customerName: editCustomerName.trim(),
      phone: editPhone.trim(),
      location: editLocation.trim(),
      date: new Date(editDate).toISOString(),
      items: payload,
    })
    if (!res.ok) {
      setEditError(res.error)
      return
    }
    showToast({ message: 'Order updated.', variant: 'success' })
    setEditOpen(false)
    setEditingOrder(null)
  }

  function exportOrdersCsv(list: Order[], label: string) {
    if (!list.length) return
    const headers = [
      'OrderId',
      'Date',
      'Customer',
      'Phone',
      'Location',
      'Product',
      'Quantity',
      'Price',
      'LineTotal',
      'TotalItems',
      'OrderTotalPrice',
    ]
    const rows: string[][] = []
    for (const order of list) {
      const totalItems = orderTotalQuantity(order)
      const totalPrice = orderTotalPrice(order)
      for (const item of order.items) {
        rows.push([
          order.id,
          order.date,
          order.customerName,
          order.phone,
          order.location,
          item.name,
          String(item.quantity),
          item.price === undefined ? '' : String(item.price),
          item.price === undefined ? '' : String(item.quantity * item.price),
          String(totalItems),
          totalPrice === 0 ? '' : String(totalPrice),
        ])
      }
    }
    const stamp = new Date().toISOString().slice(0, 10)
    downloadCsv(`orders-${label}-${stamp}.csv`, headers, rows)
    setExportOpen(false)
  }

  function exportOrdersPdf(list: Order[], scopeLabel: string) {
    if (!list.length) return
    const caption = `${scopeLabel} · Search: ${searchQuery.trim() || '—'} · Location: ${locationFilter === 'all' ? 'All' : locationFilter} · From: ${fromDate || 'Any'} · To: ${toDate || 'Any'} · Generated ${new Date().toLocaleString()}`
    setOrdersForPdf(list)
    setOrdersPdfCaption(caption)
    setExportOpen(false)
    requestAnimationFrame(() => {
      window.print()
    })
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <form
          onSubmit={handleCreateOrder}
          className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm lg:col-span-1"
        >
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-xl bg-coral-100 p-2 text-coral-600 dark:bg-coral-950/50 dark:text-coral-300">
              <PackagePlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--app-text)]">Create order</h2>
              <p className="text-xs text-[var(--app-muted)]">Customer details auto-fill when selected.</p>
            </div>
          </div>

          {formError && (
            <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {formError}
            </p>
          )}

          <fieldset className="space-y-3 border-0 p-0">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--app-muted)]">Find customer</label>
              <input
                type="search"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search by name, phone, or location"
                className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm outline-none ring-coral-500/30 focus:ring-2"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--app-muted)]">Select customer</label>
              <select
                value={customerId}
                disabled={readOnly}
                title={readOnly ? READ_ONLY_CONTROL_TITLE : undefined}
                onChange={(e) => applyCustomer(e.target.value)}
                className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm outline-none ring-coral-500/30 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <option value="">Manual entry</option>
                {filteredCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} - {c.phone}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--app-muted)]">Customer name</label>
              <input
                required
                value={customerName}
                readOnly={readOnly}
                title={readOnly ? READ_ONLY_CONTROL_TITLE : undefined}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm outline-none ring-coral-500/30 focus:ring-2 read-only:cursor-default read-only:opacity-90"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--app-muted)]">Phone</label>
                <input
                  value={phone}
                  readOnly={readOnly}
                  title={readOnly ? READ_ONLY_CONTROL_TITLE : undefined}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm outline-none ring-coral-500/30 focus:ring-2 read-only:cursor-default read-only:opacity-90"
                />
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs font-medium text-[var(--app-muted)]">
                  <MapPin className="h-3.5 w-3.5" /> Location
                </label>
                <input
                  value={location}
                  readOnly={readOnly}
                  title={readOnly ? READ_ONLY_CONTROL_TITLE : undefined}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm outline-none ring-coral-500/30 focus:ring-2 read-only:cursor-default read-only:opacity-90"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--app-muted)]">Order date</label>
              <input
                type="datetime-local"
                required
                value={orderDate}
                readOnly={readOnly}
                title={readOnly ? READ_ONLY_CONTROL_TITLE : undefined}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm outline-none ring-coral-500/30 focus:ring-2 read-only:cursor-default read-only:opacity-90"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--app-muted)]">Products</span>
                <button
                  type="button"
                  onClick={() => addItem()}
                  {...readOnlyButtonProps}
                  className="text-xs font-semibold text-coral-600 hover:underline disabled:opacity-50 dark:text-coral-400"
                >
                  + Add product
                </button>
              </div>

              {frequentProducts.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {frequentProducts.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => addItem(name)}
                      {...readOnlyButtonProps}
                      className="rounded-full border border-[var(--app-border)] bg-[var(--app-bg)] px-2.5 py-1 text-[10px] text-[var(--app-muted)] hover:bg-[var(--app-hover)] disabled:opacity-50"
                    >
                      + {name}
                    </button>
                  ))}
                </div>
              )}

              {items.map((item) => (
                <div key={item.key} className="rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] p-3">
                  <div className="mb-2 flex items-end gap-2">
                    <div className="flex-1">
                      <label className="mb-0.5 block text-[10px] text-[var(--app-muted)]">Product name</label>
                      <input
                        list="order-product-suggestions"
                        value={item.name}
                        readOnly={readOnly}
                        title={readOnly ? READ_ONLY_CONTROL_TITLE : undefined}
                        onChange={(e) => updateItem(item.key, { name: e.target.value })}
                        className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-2 py-1.5 text-xs"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(item.key)}
                      disabled={items.length <= 1}
                      {...readOnlyButtonProps}
                      className="shrink-0 rounded-lg p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-30 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-0.5 block text-[10px] text-[var(--app-muted)]">Qty</label>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        readOnly={readOnly}
                        title={readOnly ? READ_ONLY_CONTROL_TITLE : undefined}
                        onChange={(e) => {
                          const v = e.target.value
                          updateItem(item.key, {
                            quantity: v === '' ? '' : Number(v),
                          })
                        }}
                        className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-2 py-1 text-xs"
                      />
                    </div>
                    <div>
                      <label className="mb-0.5 block text-[10px] text-[var(--app-muted)]">Price (optional)</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={item.price ?? ''}
                        readOnly={readOnly}
                        title={readOnly ? READ_ONLY_CONTROL_TITLE : undefined}
                        onChange={(e) =>
                          updateItem(item.key, { price: e.target.value === '' ? undefined : Number(e.target.value) })
                        }
                        className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-2 py-1 text-xs"
                      />
                    </div>
                  </div>
                </div>
              ))}
              <datalist id="order-product-suggestions">
                {productSuggestions.map((name) => (
                  <option key={name} value={name} />
                ))}
              </datalist>
            </div>

            <p className="rounded-xl bg-gray-50 px-3 py-2 text-sm font-medium text-[var(--app-text)] dark:bg-white/5">
              Total quantity: {totalQtyPreview} | Total price: {formatMoney(totalPricePreview)}
            </p>

            {canCreateOrders && (
              <button
                type="submit"
                {...readOnlyButtonProps}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-coral-500 py-2.5 text-sm font-semibold text-white hover:bg-coral-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-coral-500"
              >
                <Plus className="h-4 w-4" />
                Save order
              </button>
            )}
          </fieldset>
        </form>

        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm lg:col-span-2">
          <div className="space-y-4 border-b border-[var(--app-border)] px-4 py-4">
            <h2 className="text-base font-semibold text-[var(--app-text)]">Orders list</h2>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr),180px,150px,150px,auto]">
              <label className="relative block sm:col-span-2 lg:col-span-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-muted)]" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search name, phone, location"
                  className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] py-2.5 pl-10 pr-3 text-sm outline-none ring-coral-500/30 focus:ring-2"
                />
              </label>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2.5 text-sm outline-none"
              >
                <option value="all">All locations</option>
                {locationOptions.map((locationName) => (
                  <option key={locationName} value={locationName}>
                    {locationName}
                  </option>
                ))}
              </select>
              <label className="rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 sm:col-span-1">
                <span className="mb-1 flex items-center gap-1 text-[10px] text-[var(--app-muted)]">
                  <CalendarRange className="h-3.5 w-3.5" /> From
                </span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                />
              </label>
              <label className="rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 sm:col-span-1">
                <span className="mb-1 block text-[10px] text-[var(--app-muted)]">To</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none"
                />
              </label>
              <div className="relative sm:col-span-2 lg:col-span-1">
                <button
                  type="button"
                  disabled={!orders.length}
                  onClick={() => setExportOpen((open) => !open)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-coral-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-coral-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-4 w-4" />
                  Export
                  <ChevronDown className="h-4 w-4" />
                </button>
                {exportOpen && (
                  <div className="absolute right-0 z-10 mt-2 w-72 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-2 shadow-xl">
                    <button
                      type="button"
                      onClick={() => exportOrdersCsv(orders, 'all')}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-[var(--app-bg)]"
                    >
                      <Download className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                      Export all orders (CSV)
                    </button>
                    <button
                      type="button"
                      onClick={() => exportOrdersPdf(orders, 'All orders')}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-[var(--app-bg)]"
                    >
                      <Printer className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                      Export all orders (PDF)
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        exportOrdersCsv(
                          filteredOrders,
                          locationFilter === 'all' ? 'filtered' : locationFilter.toLowerCase(),
                        )
                      }
                      disabled={!filteredOrders.length}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-[var(--app-bg)] disabled:opacity-50"
                    >
                      <Download className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                      {locationFilter === 'all'
                        ? 'Export current filtered (CSV)'
                        : `Export ${locationFilter} orders (CSV)`}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        exportOrdersPdf(
                          filteredOrders,
                          locationFilter === 'all'
                            ? 'Current filtered orders'
                            : `Orders — ${locationFilter}`,
                        )
                      }
                      disabled={!filteredOrders.length}
                      className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm hover:bg-[var(--app-bg)] disabled:opacity-50"
                    >
                      <Printer className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
                      {locationFilter === 'all'
                        ? 'Export current filtered (PDF)'
                        : `Export ${locationFilter} orders (PDF)`}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="block divide-y divide-[var(--app-border)] md:hidden">
            {filteredOrders.length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-[var(--app-muted)]">
                No orders match the selected filters.
              </div>
            )}
            {filteredOrders.map((order) => (
              <div key={order.id} className="space-y-3 p-4 hover:bg-[var(--app-bg)]/70">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[var(--app-text)]">
                      {order.customerName}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--app-muted)]">
                      {order.phone || '-'} | {order.location || '-'}
                    </p>
                  </div>
                  <p className="shrink-0 text-xs text-[var(--app-muted)]">
                    {formatDateShort(order.date)}
                  </p>
                </div>
                <div className="rounded-xl bg-[var(--app-bg)] px-3 py-2">
                  <p className="line-clamp-2 text-xs text-[var(--app-muted)]">
                    {itemSummary(order)}
                  </p>
                  <p className="mt-1 text-xs font-medium text-[var(--app-text)]">
                    {orderTotalQuantity(order)} item{orderTotalQuantity(order) === 1 ? '' : 's'}
                    {orderTotalPrice(order) > 0 ? ` - ${formatMoney(orderTotalPrice(order))}` : ''}
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  {canEditOrders && (
                    <button
                      type="button"
                      onClick={() => openEdit(order)}
                      title={readOnly ? 'View details (read-only)' : undefined}
                      className="inline-flex items-center gap-1 rounded-lg border border-transparent px-2.5 py-1.5 text-xs text-[var(--app-muted)] hover:border-[var(--app-border)] hover:bg-[var(--app-bg)]"
                    >
                      <Pencil className="h-4 w-4" />
                      {readOnly ? 'View' : 'Edit'}
                    </button>
                  )}
                  {canEditOrders && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete order for "${order.customerName}"?`)) {
                          deleteOrder(order.id)
                        }
                      }}
                      {...readOnlyButtonProps}
                      className="inline-flex items-center gap-1 rounded-lg border border-transparent px-2.5 py-1.5 text-xs text-red-600 hover:border-red-200 hover:bg-red-50 disabled:opacity-40 dark:hover:bg-red-950/30"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--app-border)] text-xs uppercase text-[var(--app-muted)]">
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Products</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--app-border)]">
                {filteredOrders.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-[var(--app-muted)]">
                      No orders match the selected filters.
                    </td>
                  </tr>
                )}
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-[var(--app-bg)]/70">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[var(--app-text)]">{order.customerName}</div>
                      <div className="text-xs text-[var(--app-muted)]">
                        {orderTotalQuantity(order)} item{orderTotalQuantity(order) === 1 ? '' : 's'}
                        {orderTotalPrice(order) > 0 ? ` - ${formatMoney(orderTotalPrice(order))}` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[var(--app-muted)]">{order.phone || '-'}</td>
                    <td className="px-4 py-3 text-[var(--app-muted)]">{order.location || '-'}</td>
                    <td className="max-w-[220px] px-4 py-3 text-[var(--app-muted)]" title={itemSummary(order)}>
                      <span className="line-clamp-2">{itemSummary(order)}</span>
                    </td>
                    <td className="px-4 py-3 text-[var(--app-muted)]">{formatDateShort(order.date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(order)}
                          title={readOnly ? 'View details (read-only)' : undefined}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-[var(--app-muted)] hover:bg-[var(--app-bg)]"
                        >
                          <Pencil className="h-4 w-4" />
                          {readOnly ? 'View' : 'Edit'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Delete order for "${order.customerName}"?`)) {
                              deleteOrder(order.id)
                            }
                          }}
                          {...readOnlyButtonProps}
                          className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-40 dark:hover:bg-red-950/30"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div
        id="print-root"
        className="print-root-offscreen bg-white p-6 text-black"
        aria-hidden="true"
      >
        <h1 className="text-2xl font-bold">Cleaning Factory — Orders export</h1>
        <p className="mt-1 text-sm text-gray-600">{ordersPdfCaption}</p>
        <table
          className="mt-6 w-full border-collapse text-sm"
          style={{ border: '1px solid #ccc' }}
        >
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              {[
                'Order ID',
                'Date',
                'Customer',
                'Phone',
                'Location',
                'Product',
                'Qty',
                'Price',
                'Line total',
                'Items (order)',
                'Order total',
              ].map((h) => (
                <th
                  key={h}
                  style={{
                    border: '1px solid #ccc',
                    padding: '10px 12px',
                    textAlign: 'left',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordersForPdf.flatMap((order) => {
              const totalItems = orderTotalQuantity(order)
              const totalPrice = orderTotalPrice(order)
              return order.items.map((item, idx) => {
                const lineTotal =
                  item.price === undefined ? null : item.quantity * item.price
                return (
                  <tr key={`${order.id}-${idx}`}>
                    <td style={{ border: '1px solid #ccc', padding: '8px 12px' }}>{order.id}</td>
                    <td style={{ border: '1px solid #ccc', padding: '8px 12px' }}>
                      {formatDateShort(order.date)}
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: '8px 12px' }}>
                      {order.customerName}
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: '8px 12px' }}>
                      {order.phone || '—'}
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: '8px 12px' }}>
                      {order.location || '—'}
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: '8px 12px' }}>{item.name}</td>
                    <td style={{ border: '1px solid #ccc', padding: '8px 12px' }}>
                      {item.quantity}
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: '8px 12px' }}>
                      {item.price === undefined ? '—' : formatMoney(item.price)}
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: '8px 12px' }}>
                      {lineTotal === null ? '—' : formatMoney(lineTotal)}
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: '8px 12px' }}>{totalItems}</td>
                    <td style={{ border: '1px solid #ccc', padding: '8px 12px' }}>
                      {totalPrice === 0 ? '—' : formatMoney(totalPrice)}
                    </td>
                  </tr>
                )
              })
            })}
          </tbody>
        </table>
      </div>

      <Modal
        open={editOpen}
        onClose={() => {
          setEditOpen(false)
          setEditingOrder(null)
          setEditError('')
        }}
        title={readOnly ? 'Order details' : 'Edit order'}
      >
        <form onSubmit={handleEditSubmit} className="space-y-3">
          {editError && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {editError}
            </p>
          )}
          <fieldset className="space-y-3 border-0 p-0">
            <div className="grid grid-cols-2 gap-2">
              <input
                required
                value={editCustomerName}
                readOnly={readOnly}
                onChange={(e) => setEditCustomerName(e.target.value)}
                className="rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm"
              />
              <input
                value={editPhone}
                readOnly={readOnly}
                onChange={(e) => setEditPhone(e.target.value)}
                className="rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm"
              />
            </div>
            <input
              value={editLocation}
              readOnly={readOnly}
              onChange={(e) => setEditLocation(e.target.value)}
              className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm"
            />
            <input
              type="datetime-local"
              required
              value={editDate}
              readOnly={readOnly}
              onChange={(e) => setEditDate(e.target.value)}
              className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm"
            />
            <div className="space-y-2">
              {editItems.map((item) => (
                <div key={item.key} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr,90px,110px,auto]">
                  <input
                    list="order-product-suggestions"
                    value={item.name}
                    readOnly={readOnly}
                    onChange={(e) => updateEditItem(item.key, { name: e.target.value })}
                    className="rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2 py-1.5 text-xs"
                  />
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    readOnly={readOnly}
                    onChange={(e) => {
                      const v = e.target.value
                      updateEditItem(item.key, {
                        quantity: v === '' ? '' : Number(v),
                      })
                    }}
                    className="rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2 py-1.5 text-xs"
                  />
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.price ?? ''}
                    readOnly={readOnly}
                    onChange={(e) =>
                      updateEditItem(item.key, { price: e.target.value === '' ? undefined : Number(e.target.value) })
                    }
                    className="rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2 py-1.5 text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => removeEditItem(item.key)}
                    disabled={editItems.length <= 1}
                    {...readOnlyButtonProps}
                    className="rounded-lg p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-30 dark:hover:bg-red-950/30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setEditItems((prev) => [...prev, blankItem()])}
                {...readOnlyButtonProps}
                className="text-xs font-semibold text-coral-600 hover:underline disabled:opacity-50 dark:text-coral-400"
              >
                + Add product
              </button>
            </div>
          </fieldset>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setEditOpen(false)
                setEditingOrder(null)
              }}
              className="rounded-xl border border-[var(--app-border)] px-4 py-2 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              {...readOnlyButtonProps}
              className="rounded-xl bg-coral-500 px-4 py-2 text-sm font-semibold text-white hover:bg-coral-600 disabled:opacity-50"
            >
              Save changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
