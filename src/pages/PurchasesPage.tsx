import { Pencil, Plus, Trash2, Truck } from 'lucide-react'
import { useState } from 'react'
import { Modal } from '../components/Modal'
import { ProductSelectWithSearch } from '../components/ProductSelectWithSearch'
import { READ_ONLY_CONTROL_TITLE, useData } from '../context/DataContext'
import { useUiFeedback } from '../context/UiFeedbackContext'
import type { Purchase } from '../types'
import { formatDateShort, formatMoney, todayISO } from '../utils/format'

export function PurchasesPage() {
  const {
    products,
    purchases,
    addPurchase,
    updatePurchase,
    deletePurchase,
    readOnly,
    readOnlyButtonProps,
  } = useData()
  const { showToast } = useUiFeedback()

  const [supplier, setSupplier] = useState('')
  const [productId, setProductId] = useState(products[0]?.id ?? '')
  const [quantity, setQuantity] = useState(1)
  const [cost, setCost] = useState(0)
  const [date, setDate] = useState(todayISO())

  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<Purchase | null>(null)
  const [editSupplier, setEditSupplier] = useState('')
  const [editProductId, setEditProductId] = useState('')
  const [editQuantity, setEditQuantity] = useState(1)
  const [editCost, setEditCost] = useState(0)
  const [editDate, setEditDate] = useState(todayISO())
  const [editError, setEditError] = useState('')
  const [pageError, setPageError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPageError('')
    if (!supplier.trim() || !productId || quantity <= 0) {
      setPageError('Supplier, product, and a positive quantity are required.')
      return
    }
    addPurchase({
      supplier: supplier.trim(),
      productId,
      quantity,
      cost,
      date: new Date(date).toISOString(),
    })
    showToast({ message: 'Purchase recorded. Stock updated.', variant: 'success' })
    setSupplier('')
    setQuantity(1)
    setCost(0)
  }

  function openEdit(p: Purchase) {
    setEditing(p)
    setEditSupplier(p.supplier)
    setEditProductId(p.productId)
    setEditQuantity(p.quantity)
    setEditCost(p.cost)
    const d = new Date(p.date)
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    setEditDate(d.toISOString().slice(0, 16))
    setEditError('')
    setEditOpen(true)
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setEditError('')
    const res = updatePurchase(editing.id, {
      supplier: editSupplier.trim(),
      productId: editProductId,
      quantity: editQuantity,
      cost: editCost,
      date: new Date(editDate).toISOString(),
    })
    if (!res.ok) {
      setEditError(res.error)
      return
    }
    showToast({ message: 'Purchase updated.', variant: 'success' })
    setEditOpen(false)
    setEditing(null)
  }

  function handleDelete(p: Purchase) {
    setPageError('')
    if (
      !confirm(
        `Remove this purchase for “${p.supplier}”? Stock for the product will be reduced by ${p.quantity}.`,
      )
    ) {
      return
    }
    const res = deletePurchase(p.id)
    if (!res.ok) {
      setPageError(res.error)
    }
  }

  if (!products.length) {
    return (
      <p className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 text-sm text-[var(--app-muted)]">
        Add products before recording purchases.
      </p>
    )
  }

  return (
    <div className="space-y-6">
      {pageError && (
        <p
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {pageError}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm lg:col-span-1"
        >
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-xl bg-coral-100 p-2 text-coral-600 dark:bg-coral-950/50 dark:text-coral-300">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--app-text)]">
                Incoming purchase
              </h2>
              <p className="text-xs text-[var(--app-muted)]">
                Adds quantity to the selected product’s stock.
              </p>
            </div>
          </div>
          <fieldset className="min-w-0 space-y-3 border-0 p-0">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--app-muted)]">
                Supplier
              </label>
              <input
                required
                readOnly={readOnly}
                title={readOnly ? READ_ONLY_CONTROL_TITLE : undefined}
                className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm outline-none ring-coral-500/30 focus:ring-2 read-only:cursor-default read-only:opacity-90"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Vendor name"
              />
            </div>
            <ProductSelectWithSearch
              products={products}
              value={productId}
              onChange={setProductId}
              disabled={readOnly}
              allowSearchWhileLocked={readOnly}
              id="purchase-product"
              label="Product"
              required
              selectClassName="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--app-text)] outline-none ring-coral-500/30 focus:ring-2"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--app-muted)]">
                  Quantity
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  readOnly={readOnly}
                  title={readOnly ? READ_ONLY_CONTROL_TITLE : undefined}
                  className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm outline-none ring-coral-500/30 focus:ring-2 read-only:cursor-default read-only:opacity-90"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--app-muted)]">
                  Cost (total)
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  readOnly={readOnly}
                  title={readOnly ? READ_ONLY_CONTROL_TITLE : undefined}
                  className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm outline-none ring-coral-500/30 focus:ring-2 read-only:cursor-default read-only:opacity-90"
                  value={cost}
                  onChange={(e) => setCost(Number(e.target.value))}
                />
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
          </fieldset>
          <button
            type="submit"
            {...readOnlyButtonProps}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-coral-500 py-2.5 text-sm font-semibold text-white hover:bg-coral-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-coral-500"
          >
            <Plus className="h-4 w-4" />
            Save purchase
          </button>
        </form>

        <div className="overflow-x-auto rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm lg:col-span-2">
          <div className="border-b border-[var(--app-border)] px-4 py-3">
            <h2 className="text-base font-semibold text-[var(--app-text)]">
              Purchase history
            </h2>
          </div>
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--app-border)] text-xs uppercase text-[var(--app-muted)]">
                <th className="px-4 py-3 font-medium">Supplier</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Qty</th>
                <th className="px-4 py-3 font-medium">Cost</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--app-border)]">
              {purchases.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-[var(--app-muted)]"
                  >
                    No purchases yet.
                  </td>
                </tr>
              )}
              {purchases.map((x) => {
                const p = products.find((z) => z.id === x.productId)
                return (
                  <tr key={x.id}>
                    <td className="px-4 py-3 font-medium text-[var(--app-text)]">
                      {x.supplier}
                    </td>
                    <td className="px-4 py-3 text-[var(--app-muted)]">
                      {p?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3">{x.quantity}</td>
                    <td className="px-4 py-3">{formatMoney(x.cost)}</td>
                    <td className="px-4 py-3 text-[var(--app-muted)]">
                      {formatDateShort(x.date)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(x)}
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
                          onClick={() => handleDelete(x)}
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

      <Modal
        open={editOpen}
        onClose={() => {
          setEditOpen(false)
          setEditing(null)
        }}
        title={readOnly ? 'Purchase details' : 'Edit purchase'}
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
                Supplier
              </label>
              <input
                required
                readOnly={readOnly}
                title={readOnly ? READ_ONLY_CONTROL_TITLE : undefined}
                className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm outline-none ring-coral-500/30 focus:ring-2 read-only:cursor-default read-only:opacity-90"
                value={editSupplier}
                onChange={(e) => setEditSupplier(e.target.value)}
              />
            </div>
            <ProductSelectWithSearch
              products={products}
              value={editProductId}
              onChange={setEditProductId}
              disabled={readOnly}
              allowSearchWhileLocked={readOnly}
              id="purchase-edit-product"
              label="Product"
              required
              selectClassName="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--app-text)] outline-none ring-coral-500/30 focus:ring-2"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--app-muted)]">
                  Quantity
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  readOnly={readOnly}
                  title={readOnly ? READ_ONLY_CONTROL_TITLE : undefined}
                  className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm outline-none ring-coral-500/30 focus:ring-2 read-only:cursor-default read-only:opacity-90"
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(Number(e.target.value))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--app-muted)]">
                  Cost
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  readOnly={readOnly}
                  title={readOnly ? READ_ONLY_CONTROL_TITLE : undefined}
                  className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm outline-none ring-coral-500/30 focus:ring-2 read-only:cursor-default read-only:opacity-90"
                  value={editCost}
                  onChange={(e) => setEditCost(Number(e.target.value))}
                />
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
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>
          </fieldset>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setEditOpen(false)
                setEditing(null)
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
