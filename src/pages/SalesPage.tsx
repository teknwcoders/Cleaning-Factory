import { Download, Pencil, Plus, Printer, ShoppingCart, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Modal } from '../components/Modal'
import { ProductSelectWithSearch } from '../components/ProductSelectWithSearch'
import { READ_ONLY_CONTROL_TITLE, useData } from '../context/DataContext'
import { useUiFeedback } from '../context/UiFeedbackContext'
import type { Sale, SaleLine } from '../types'
import { saleLineTotal, saleOrderTotal } from '../types'
import { downloadCsv } from '../utils/exportCsv'
import { formatDateShort, formatMoney, todayISO } from '../utils/format'

type DraftLine = SaleLine & { key: string }
type SalesPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'all'

function newKey() {
  return crypto.randomUUID()
}

function lineFromProduct(productId: string, products: { id: string; price: number }[]): DraftLine {
  const p = products.find((x) => x.id === productId)
  return {
    key: newKey(),
    productId,
    quantity: 1,
    unitPrice: p?.price ?? 0,
  }
}

function saleToDrafts(sale: Sale): DraftLine[] {
  return sale.lines.map((l) => ({
    key: newKey(),
    productId: l.productId,
    quantity: l.quantity,
    unitPrice: l.unitPrice,
  }))
}

function draftsToLines(drafts: DraftLine[]): SaleLine[] {
  return drafts.map(({ productId, quantity, unitPrice }) => ({
    productId,
    quantity,
    unitPrice,
  }))
}

function inPeriod(iso: string, period: SalesPeriod): boolean {
  if (period === 'all') return true
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return false
  const now = Date.now()
  const day = 86400000
  if (period === 'daily') return now - t <= day
  if (period === 'weekly') return now - t <= 7 * day
  if (period === 'monthly') return now - t <= 31 * day
  return now - t <= 365 * day
}

export function SalesPage() {
  const {
    products,
    customers,
    sales,
    addSale,
    updateSale,
    deleteSale,
    readOnly,
    readOnlyButtonProps,
  } = useData()
  const { showToast } = useUiFeedback()

  const defaultProductId = products[0]?.id ?? ''

  const [lines, setLines] = useState<DraftLine[]>(() =>
    defaultProductId ? [lineFromProduct(defaultProductId, products)] : [],
  )
  const [customerId, setCustomerId] = useState(customers[0]?.id ?? '')
  const [customerSearch, setCustomerSearch] = useState('')
  const [date, setDate] = useState(todayISO())
  const [error, setError] = useState('')
  const [historyPeriod, setHistoryPeriod] = useState<SalesPeriod>('all')
  const [historyCustomerId, setHistoryCustomerId] = useState('all')
  const [historySelectedDate, setHistorySelectedDate] = useState('')
  /** Product chosen in quick-add dropdown (record sale) */
  const [quickAddProductId, setQuickAddProductId] = useState('')
  const [editQuickAddProductId, setEditQuickAddProductId] = useState('')

  const [editOpen, setEditOpen] = useState(false)
  const [editingSale, setEditingSale] = useState<Sale | null>(null)
  const [editLines, setEditLines] = useState<DraftLine[]>([])
  const [editCustomerId, setEditCustomerId] = useState('')
  const [editDate, setEditDate] = useState(todayISO())
  const [editError, setEditError] = useState('')

  /* eslint-disable react-hooks/set-state-in-effect -- line drafts must track product catalog */
  useEffect(() => {
    if (!products.length) {
      setLines([])
      return
    }
    setLines((prev) => {
      if (prev.length === 0) return [lineFromProduct(products[0].id, products)]
      return prev.map((row) => {
        const p = products.find((x) => x.id === row.productId)
        return p
          ? row
          : {
              ...row,
              productId: products[0].id,
              unitPrice: products[0].price,
            }
      })
    })
  }, [products])
  /* eslint-enable react-hooks/set-state-in-effect */

  const orderTotalPreview = useMemo(
    () => lines.reduce((a, l) => a + saleLineTotal(l), 0),
    [lines],
  )
  const customerSelectRef = useRef<HTMLSelectElement>(null)

  const filteredCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase()
    if (!q) return customers
    const next = customers.filter((c) => c.name.toLowerCase().includes(q))
    const current = customers.find((c) => c.id === customerId)
    if (current && !next.some((c) => c.id === current.id)) {
      return [current, ...next]
    }
    return next.length ? next : customers
  }, [customerSearch, customers, customerId])

  const historySales = useMemo(() => {
    const filtered = sales.filter((s) => {
      const byPeriod = inPeriod(s.date, historyPeriod)
      const byCustomer =
        historyCustomerId === 'all' || s.customerId === historyCustomerId
      const bySelectedDate = historySelectedDate
        ? s.date.slice(0, 10) === historySelectedDate
        : true
      return byPeriod && byCustomer && bySelectedDate
    })
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [sales, historyPeriod, historyCustomerId, historySelectedDate])

  const quickPickId =
    quickAddProductId && products.some((p) => p.id === quickAddProductId)
      ? quickAddProductId
      : (products[0]?.id ?? '')

  const editQuickPickId =
    editQuickAddProductId &&
    products.some((p) => p.id === editQuickAddProductId)
      ? editQuickAddProductId
      : (products[0]?.id ?? '')

  function addEmptyLine() {
    const pid = products[0]?.id
    if (!pid) return
    setLines((prev) => [...prev, lineFromProduct(pid, products)])
  }

  function addQuickProductLine() {
    const pid = quickPickId
    if (!pid) return
    setLines((prev) => [...prev, lineFromProduct(pid, products)])
  }

  function addEditQuickProductLine() {
    const pid = editQuickPickId
    if (!pid) return
    setEditLines((prev) => [...prev, lineFromProduct(pid, products)])
  }

  function updateLine(key: string, patch: Partial<SaleLine>) {
    setLines((prev) =>
      prev.map((row) => {
        if (row.key !== key) return row
        const next = { ...row, ...patch }
        if (patch.productId !== undefined) {
          const p = products.find((x) => x.id === patch.productId)
          if (p) next.unitPrice = p.price
        }
        return next
      }),
    )
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((r) => r.key !== key)))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const payload = draftsToLines(lines)
    const res = addSale({
      customerId,
      date: new Date(date).toISOString(),
      lines: payload,
    })
    if (!res.ok) {
      setError('error' in res ? res.error : 'An error occurred')
      return
    }
    showToast({ message: 'Sale recorded.', variant: 'success' })
    setLines(defaultProductId ? [lineFromProduct(defaultProductId, products)] : [])
    setQuickAddProductId(defaultProductId)
  }

  function openEdit(sale: Sale) {
    setEditingSale(sale)
    setEditLines(saleToDrafts(sale))
    setEditCustomerId(sale.customerId)
    const d = new Date(sale.date)
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    setEditDate(d.toISOString().slice(0, 16))
    setEditError('')
    setEditQuickAddProductId(products[0]?.id ?? '')
    setEditOpen(true)
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editingSale) return
    setEditError('')
    const res = updateSale(editingSale.id, {
      customerId: editCustomerId,
      date: new Date(editDate).toISOString(),
      lines: draftsToLines(editLines),
    })
    if (!res.ok) {
      setEditError('error' in res ? res.error : 'An error occurred')
      return
    }
    showToast({ message: 'Sale updated.', variant: 'success' })
    setEditOpen(false)
    setEditingSale(null)
    setEditQuickAddProductId('')
  }

  function updateEditLine(key: string, patch: Partial<SaleLine>) {
    setEditLines((prev) =>
      prev.map((row) => {
        if (row.key !== key) return row
        const next = { ...row, ...patch }
        if (patch.productId !== undefined) {
          const p = products.find((x) => x.id === patch.productId)
          if (p) next.unitPrice = p.price
        }
        return next
      }),
    )
  }

  function removeEditLine(key: string) {
    setEditLines((prev) =>
      prev.length <= 1 ? prev : prev.filter((r) => r.key !== key),
    )
  }

  function addEditLine() {
    const pid = products[0]?.id
    if (!pid) return
    setEditLines((prev) => [...prev, lineFromProduct(pid, products)])
  }

  function exportSalesCsv() {
    if (!historySales.length) return
    const headers = [
      'SaleId',
      'Date',
      'Customer',
      'Product',
      'Qty',
      'UnitPrice',
      'LineTotal',
      'OrderTotal',
    ]
    const rows: string[][] = []
    for (const s of historySales) {
      const customerName =
        customers.find((c) => c.id === s.customerId)?.name ?? 'Unknown'
      const orderTotal = saleOrderTotal(s)
      for (const line of s.lines) {
        const productName =
          products.find((p) => p.id === line.productId)?.name ?? 'Unknown'
        rows.push([
          s.id,
          s.date,
          customerName,
          productName,
          String(line.quantity),
          String(line.unitPrice),
          String(saleLineTotal(line)),
          String(orderTotal),
        ])
      }
    }
    downloadCsv(`sales-${historyPeriod}.csv`, headers, rows)
  }

  function exportSalesPdf() {
    if (!historySales.length) return
    window.print()
  }

  if (!products.length || !customers.length) {
    return (
      <p className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 text-sm text-[var(--app-muted)]">
        Add at least one product and one customer before recording sales.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm lg:col-span-1"
        >
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-xl bg-coral-100 p-2 text-coral-600 dark:bg-coral-950/50 dark:text-coral-300">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--app-text)]">
                Record sale
              </h2>
              <p className="text-xs text-[var(--app-muted)]">
                Multiple products per order. Stock updates automatically.
              </p>
            </div>
          </div>
          {error && (
            <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {error}
            </p>
          )}

          <fieldset className="min-w-0 space-y-4 border-0 p-0">
          <div className="mb-4 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] p-3">
            <ProductSelectWithSearch
              products={products}
              value={quickPickId}
              onChange={setQuickAddProductId}
              disabled={readOnly}
              allowSearchWhileLocked={readOnly}
              id="sale-quick-product"
              label="Add products (dropdown)"
              showStock
              selectClassName="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2.5 text-sm text-[var(--app-text)] outline-none ring-coral-500/30 focus:ring-2"
              afterSelect={
                <button
                  type="button"
                  onClick={addQuickProductLine}
                  {...readOnlyButtonProps}
                  className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-coral-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-coral-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-coral-500"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Add to sale
                </button>
              }
            />
            <p className="mt-2 text-[10px] leading-snug text-[var(--app-muted)]">
              Pick a product, tap <strong className="font-medium text-[var(--app-text)]">Add to sale</strong>, then repeat for more items. You can change quantity and price below.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--app-muted)]">
                Customer
              </label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="search"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Search customer name..."
                      className="min-w-0 flex-1 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm outline-none ring-coral-500/30 focus:ring-2"
                    />
                    <button
                      type="button"
                      onClick={() => customerSelectRef.current?.focus()}
                      className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm font-semibold text-[var(--app-text)] shadow-sm transition hover:bg-gray-100 dark:hover:bg-white/10"
                    >
                      Search
                    </button>
                  </div>
                  <select
                    ref={customerSelectRef}
                    required
                    title={readOnly ? READ_ONLY_CONTROL_TITLE : undefined}
                    disabled={readOnly}
                    className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm outline-none ring-coral-500/30 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                  >
                    {filteredCustomers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--app-muted)]">
                Date
              </label>
              <input
                type="datetime-local"
                required
                readOnly={readOnly}
                title={readOnly ? READ_ONLY_CONTROL_TITLE : undefined}
                className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm outline-none ring-coral-500/30 focus:ring-2 read-only:cursor-default read-only:opacity-90"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[var(--app-muted)]">
                  Products in this sale
                </span>
                <button
                  type="button"
                  onClick={addEmptyLine}
                  {...readOnlyButtonProps}
                  className="text-xs font-semibold text-coral-600 hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50 dark:text-coral-400"
                >
                  + Add line
                </button>
              </div>
              {lines.map((row) => {
                const p = products.find((x) => x.id === row.productId)
                return (
                  <div
                    key={row.key}
                    className="rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] p-3"
                  >
                    <div className="mb-2 flex gap-2 items-end">
                      <ProductSelectWithSearch
                        variant="compact"
                        hideLabel
                        label="Product"
                        products={products}
                        value={row.productId}
                        onChange={(id) =>
                          updateLine(row.key, { productId: id })
                        }
                        disabled={readOnly}
                        allowSearchWhileLocked={readOnly}
                        showStock
                        stockLabelFormat="paren"
                        selectClassName="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-2 py-1.5 text-xs text-[var(--app-text)] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeLine(row.key)}
                        disabled={lines.length <= 1}
                        {...readOnlyButtonProps}
                        className="shrink-0 rounded-lg p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-30 dark:hover:bg-red-950/30"
                        aria-label="Remove line"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-0.5 block text-[10px] text-[var(--app-muted)]">
                          Qty
                        </label>
                        <input
                          type="number"
                          min={1}
                          readOnly={readOnly}
                          title={readOnly ? READ_ONLY_CONTROL_TITLE : undefined}
                          className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-2 py-1 text-xs read-only:cursor-default read-only:opacity-90"
                          value={row.quantity}
                          onChange={(e) =>
                            updateLine(row.key, {
                              quantity: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                      <div>
                        <label className="mb-0.5 block text-[10px] text-[var(--app-muted)]">
                          Unit price
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          readOnly={readOnly}
                          title={readOnly ? READ_ONLY_CONTROL_TITLE : undefined}
                          className="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-2 py-1 text-xs read-only:cursor-default read-only:opacity-90"
                          value={row.unitPrice}
                          onChange={(e) =>
                            updateLine(row.key, {
                              unitPrice: Number(e.target.value),
                            })
                          }
                        />
                      </div>
                    </div>
                    {p && (
                      <p className="mt-2 text-[10px] text-[var(--app-muted)]">
                        Line: {formatMoney(saleLineTotal(row))} · After sale
                        stock: {Math.max(0, p.stock - row.quantity)}
                      </p>
                    )}
                  </div>
                )
              })}
            </div>

            <p className="rounded-xl bg-gray-50 px-3 py-2 text-sm font-medium text-[var(--app-text)] dark:bg-white/5">
              Order total: {formatMoney(orderTotalPreview)}
            </p>

            <button
              type="submit"
              {...readOnlyButtonProps}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-coral-500 py-2.5 text-sm font-semibold text-white hover:bg-coral-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-coral-500"
            >
              <Plus className="h-4 w-4" />
              Save sale
            </button>
          </div>
          </fieldset>
        </form>

        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm lg:col-span-2">
          <div className="border-b border-[var(--app-border)] px-4 py-3">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between lg:items-center">
              <h2 className="text-base font-semibold text-[var(--app-text)]">
                Sales history
              </h2>
              <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
                <select
                  value={historyPeriod}
                  onChange={(e) =>
                    setHistoryPeriod(e.target.value as SalesPeriod)
                  }
                  className="col-span-2 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--app-text)] outline-none sm:col-span-1 sm:w-auto"
                >
                  <option value="all">All time</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
                <select
                  value={historyCustomerId}
                  onChange={(e) => setHistoryCustomerId(e.target.value)}
                  className="col-span-2 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--app-text)] outline-none sm:col-span-1 sm:w-auto"
                >
                  <option value="all">All customers</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  value={historySelectedDate}
                  onChange={(e) => setHistorySelectedDate(e.target.value)}
                  className="col-span-2 w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--app-text)] outline-none sm:col-span-1 sm:w-auto"
                  aria-label="Select date (optional)"
                />
                <button
                  type="button"
                  onClick={exportSalesCsv}
                  disabled={!historySales.length}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm font-semibold text-[var(--app-text)] hover:bg-[var(--app-hover)] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  <Download className="h-4 w-4" />
                  CSV
                </button>
                <button
                  type="button"
                  onClick={exportSalesPdf}
                  disabled={!historySales.length}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-coral-500 px-3 py-2 text-sm font-semibold text-white hover:bg-coral-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-coral-500 sm:w-auto"
                >
                  <Printer className="h-4 w-4" />
                  PDF
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs text-[var(--app-muted)]">
              Export includes full line details (qty, unit price, line total, and order total) for the selected period, customer, and optional date.
            </p>
          </div>

          {/* Mobile Card View */}
          <div className="block divide-y divide-[var(--app-border)] md:hidden">
            {historySales.length === 0 && (
              <div className="px-4 py-10 text-center text-sm text-[var(--app-muted)]">
                No sales match the selected filters.
              </div>
            )}
            {historySales.map((s) => {
              const c = customers.find((x) => x.id === s.customerId)
              const productText = s.lines
                .map((line) => {
                  const p = products.find((x) => x.id === line.productId)
                  return `${p?.name ?? '—'} ×${line.quantity}`
                })
                .join(', ')

              return (
                <div key={s.id} className="flex flex-col gap-3 p-4 hover:bg-[var(--app-bg)]/70">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-[var(--app-text)]">
                        {c?.name ?? '—'}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--app-muted)]">
                        {formatDateShort(s.date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-coral-600 dark:text-coral-400">
                        {formatMoney(saleOrderTotal(s))}
                      </p>
                      <p className="mt-0.5 text-xs text-[var(--app-muted)]">
                        {s.lines.length} item{s.lines.length === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="rounded-xl bg-[var(--app-bg)] px-3 py-2">
                    <p className="line-clamp-2 text-xs text-[var(--app-muted)]" title={productText}>
                      {productText}
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => openEdit(s)}
                      title={readOnly ? 'View details (read-only)' : undefined}
                      className="inline-flex items-center justify-center rounded-lg border border-transparent bg-[var(--app-bg)] p-2 text-[var(--app-muted)] hover:border-[var(--app-border)] hover:bg-gray-100 dark:hover:bg-white/10"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          confirm(
                            'Delete this sale? Stock will be restored for all lines.',
                          )
                        )
                          deleteSale(s.id)
                      }}
                      {...readOnlyButtonProps}
                      className="inline-flex items-center justify-center rounded-lg border border-transparent bg-red-50 p-2 text-red-600 hover:border-red-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-red-950/20 dark:hover:bg-red-950/40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--app-border)] text-xs uppercase text-[var(--app-muted)]">
                  <th className="px-4 py-3 font-medium">Products</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--app-border)]">
                {historySales.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-10 text-center text-[var(--app-muted)]"
                    >
                      No sales match the selected filters.
                    </td>
                  </tr>
                )}
                {historySales.map((s) => {
                  const c = customers.find((x) => x.id === s.customerId)
                  const productText = s.lines
                    .map((line) => {
                      const p = products.find((x) => x.id === line.productId)
                      return `${p?.name ?? '—'} ×${line.quantity}`
                    })
                    .join(', ')
                  return (
                    <tr key={s.id}>
                      <td className="max-w-[280px] px-4 py-3">
                        <p
                          className="font-medium text-[var(--app-text)] line-clamp-2"
                          title={productText}
                        >
                          {productText}
                        </p>
                        <p className="text-xs text-[var(--app-muted)]">
                          {s.lines.length} line{s.lines.length === 1 ? '' : 's'}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-[var(--app-muted)]">
                        {c?.name ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-[var(--app-muted)]">
                        {formatDateShort(s.date)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-coral-600 dark:text-coral-400">
                        {formatMoney(saleOrderTotal(s))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(s)}
                            title={readOnly ? 'View details (read-only)' : undefined}
                            className="inline-flex items-center gap-1 rounded-lg border border-transparent px-2 py-1.5 text-xs font-medium text-[var(--app-muted)] hover:border-[var(--app-border)] hover:bg-gray-100 dark:hover:bg-white/10"
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="hidden sm:inline">
                              {readOnly ? 'View' : 'Edit'}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                confirm(
                                  'Delete this sale? Stock will be restored for all lines.',
                                )
                              )
                                deleteSale(s.id)
                            }}
                            {...readOnlyButtonProps}
                            className="inline-flex items-center gap-1 rounded-lg border border-transparent px-2 py-1.5 text-xs font-medium text-red-600 hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:border-red-900 dark:hover:bg-red-950/30"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="hidden sm:inline">Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
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
        <h1 className="text-2xl font-bold">Cleaning Factory — Sales Export</h1>
        <p className="mt-1 text-sm text-gray-600">
          Period: {historyPeriod} · Customer:{' '}
          {historyCustomerId === 'all'
            ? 'All customers'
            : customers.find((c) => c.id === historyCustomerId)?.name ?? 'Unknown'}{' '}
          · Date: {historySelectedDate || 'Any'}{' '}
          · Generated {new Date().toLocaleString()}
        </p>
        <table
          className="mt-6 w-full border-collapse text-sm"
          style={{ border: '1px solid #ccc' }}
        >
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              {[
                'Date',
                'Customer',
                'Product',
                'Qty',
                'Unit price',
                'Line total',
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
            {historySales.flatMap((sale) => {
              const customerName =
                customers.find((c) => c.id === sale.customerId)?.name ?? 'Unknown'
              const orderTotal = saleOrderTotal(sale)
              return sale.lines.map((line, idx) => {
                const productName =
                  products.find((p) => p.id === line.productId)?.name ?? 'Unknown'
                return (
                  <tr key={`${sale.id}-${idx}`}>
                    <td style={{ border: '1px solid #ccc', padding: '8px 12px' }}>
                      {formatDateShort(sale.date)}
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: '8px 12px' }}>
                      {customerName}
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: '8px 12px' }}>
                      {productName}
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: '8px 12px' }}>
                      {line.quantity}
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: '8px 12px' }}>
                      {formatMoney(line.unitPrice)}
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: '8px 12px' }}>
                      {formatMoney(saleLineTotal(line))}
                    </td>
                    <td style={{ border: '1px solid #ccc', padding: '8px 12px' }}>
                      {formatMoney(orderTotal)}
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
          setEditingSale(null)
          setEditQuickAddProductId('')
        }}
        title={readOnly ? 'Sale details' : 'Edit sale'}
      >
        <form onSubmit={handleEditSubmit} className="space-y-3">
          {editError && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {editError}
            </p>
          )}
          <fieldset className="min-w-0 space-y-3 border-0 p-0">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--app-muted)]">
              Customer
            </label>
            <select
              required
              title={readOnly ? READ_ONLY_CONTROL_TITLE : undefined}
              disabled={readOnly}
              className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm outline-none ring-coral-500/30 focus:ring-2 disabled:cursor-not-allowed disabled:opacity-70"
              value={editCustomerId}
              onChange={(e) => setEditCustomerId(e.target.value)}
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--app-muted)]">
              Date
            </label>
            <input
              type="datetime-local"
              required
              readOnly={readOnly}
              title={readOnly ? READ_ONLY_CONTROL_TITLE : undefined}
              className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm outline-none ring-coral-500/30 focus:ring-2 read-only:cursor-default read-only:opacity-90"
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
            />
          </div>
          <div className="rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] p-3">
            <ProductSelectWithSearch
              products={products}
              value={editQuickPickId}
              onChange={setEditQuickAddProductId}
              disabled={readOnly}
              allowSearchWhileLocked={readOnly}
              id="edit-quick-product"
              label="Add product from dropdown"
              showStock
              selectClassName="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm text-[var(--app-text)] outline-none ring-coral-500/30 focus:ring-2"
              afterSelect={
                <button
                  type="button"
                  onClick={addEditQuickProductLine}
                  {...readOnlyButtonProps}
                  className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-coral-500 px-3 py-2 text-xs font-semibold text-white hover:bg-coral-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-coral-500"
                >
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  Add line
                </button>
              }
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--app-muted)]">
                Lines
              </span>
              <button
                type="button"
                onClick={addEditLine}
                {...readOnlyButtonProps}
                className="text-xs font-semibold text-coral-600 hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50 dark:text-coral-400"
              >
                + Add line
              </button>
            </div>
            {editLines.map((row) => {
              const p = products.find((x) => x.id === row.productId)
              return (
                <div
                  key={row.key}
                  className="rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] p-3"
                >
                  <div className="mb-2 flex gap-2 items-end">
                    <ProductSelectWithSearch
                      variant="compact"
                      hideLabel
                      label="Product"
                      products={products}
                      value={row.productId}
                      onChange={(id) =>
                        updateEditLine(row.key, { productId: id })
                      }
                      disabled={readOnly}
                      allowSearchWhileLocked={readOnly}
                      showStock
                      stockLabelFormat="paren"
                      selectClassName="w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-2 py-1.5 text-xs text-[var(--app-text)] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => removeEditLine(row.key)}
                      disabled={editLines.length <= 1}
                      {...readOnlyButtonProps}
                      className="shrink-0 rounded-lg p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-30 dark:hover:bg-red-950/30"
                      aria-label="Remove line"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      min={1}
                      readOnly={readOnly}
                      title={readOnly ? READ_ONLY_CONTROL_TITLE : undefined}
                      className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-2 py-1 text-xs read-only:cursor-default read-only:opacity-90"
                      value={row.quantity}
                      onChange={(e) =>
                        updateEditLine(row.key, {
                          quantity: Number(e.target.value),
                        })
                      }
                    />
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      readOnly={readOnly}
                      title={readOnly ? READ_ONLY_CONTROL_TITLE : undefined}
                      className="rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-2 py-1 text-xs read-only:cursor-default read-only:opacity-90"
                      value={row.unitPrice}
                      onChange={(e) =>
                        updateEditLine(row.key, {
                          unitPrice: Number(e.target.value),
                        })
                      }
                    />
                  </div>
                  {p && (
                    <p className="mt-1 text-[10px] text-[var(--app-muted)]">
                      Line: {formatMoney(saleLineTotal(row))}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
          <p className="text-sm font-medium text-[var(--app-text)]">
            Total:{' '}
            {formatMoney(
              editLines.reduce((a, l) => a + saleLineTotal(l), 0),
            )}
          </p>
          </fieldset>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setEditOpen(false)
                setEditingSale(null)
                setEditQuickAddProductId('')
              }}
              className="rounded-xl border border-[var(--app-border)] px-4 py-2 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              {...readOnlyButtonProps}
              className="rounded-xl bg-coral-500 px-4 py-2 text-sm font-semibold text-white hover:bg-coral-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-coral-500"
            >
              Save changes
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
