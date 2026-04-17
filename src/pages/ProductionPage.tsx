import { Factory, Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Modal } from '../components/Modal'
import { ProductSelectWithSearch } from '../components/ProductSelectWithSearch'
import { READ_ONLY_CONTROL_TITLE, useData } from '../context/DataContext'
import { useUiFeedback } from '../context/UiFeedbackContext'
import type { ProductionEntry } from '../types'
import { formatDateShort, todayISO } from '../utils/format'

export function ProductionPage() {
  const {
    products,
    production,
    addProduction,
    updateProduction,
    deleteProduction,
    readOnly,
    readOnlyButtonProps,
  } = useData()
  const { showToast } = useUiFeedback()

  const [productId, setProductId] = useState(products[0]?.id ?? '')
  const [quantity, setQuantity] = useState('')
  const [date, setDate] = useState(todayISO())
  const [notes, setNotes] = useState('')

  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<ProductionEntry | null>(null)
  const [editProductId, setEditProductId] = useState('')
  const [editQuantity, setEditQuantity] = useState('')
  const [editDate, setEditDate] = useState(todayISO())
  const [editNotes, setEditNotes] = useState('')
  const [editError, setEditError] = useState('')
  const [pageError, setPageError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPageError('')
    const q = Number(quantity.trim())
    if (!productId || !Number.isFinite(q) || q <= 0) {
      setPageError('Choose a product and enter a quantity greater than zero.')
      return
    }
    addProduction({
      productId,
      quantity: q,
      date: new Date(date).toISOString(),
      notes: notes.trim(),
    })
    showToast({ message: 'Production logged. Stock updated.', variant: 'success' })
    setNotes('')
    setQuantity('')
  }

  function openEdit(e: ProductionEntry) {
    setEditing(e)
    setEditProductId(e.productId)
    setEditQuantity(String(e.quantity))
    const d = new Date(e.date)
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
    setEditDate(d.toISOString().slice(0, 16))
    setEditNotes(e.notes)
    setEditError('')
    setEditOpen(true)
  }

  function handleEditSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    if (!editing) return
    setEditError('')
    const q = Number(editQuantity.trim())
    if (!Number.isFinite(q) || q <= 0) {
      setEditError('Enter a valid quantity greater than zero.')
      return
    }
    const res = updateProduction(editing.id, {
      productId: editProductId,
      quantity: q,
      date: new Date(editDate).toISOString(),
      notes: editNotes,
    })
    if (!res.ok) {
      setEditError(res.error)
      return
    }
    showToast({ message: 'Production entry updated.', variant: 'success' })
    setEditOpen(false)
    setEditing(null)
  }

  function handleDelete(e: ProductionEntry) {
    setPageError('')
    if (
      !confirm(
        `Delete this production entry? Stock for the product will be reduced by ${e.quantity}.`,
      )
    ) {
      return
    }
    const res = deleteProduction(e.id)
    if (!res.ok) {
      setPageError(res.error)
    }
  }

  if (!products.length) {
    return (
      <p className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-6 text-sm text-[var(--app-muted)]">
        Add products before logging production.
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
              <Factory className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--app-text)]">
                Add production entry
              </h2>
            </div>
          </div>
          <fieldset className="min-w-0 space-y-3 border-0 p-0">
            <ProductSelectWithSearch
              products={products}
              value={productId}
              onChange={setProductId}
              disabled={readOnly}
              allowSearchWhileLocked={readOnly}
              id="production-product"
              label="Product"
              required
              selectClassName="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--app-text)] outline-none ring-coral-500/30 focus:ring-2"
            />
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--app-muted)]">
                Quantity produced
              </label>
              <input
                type="number"
                min={1}
                required
                readOnly={readOnly}
                title={readOnly ? READ_ONLY_CONTROL_TITLE : undefined}
                className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm outline-none ring-coral-500/30 focus:ring-2 read-only:cursor-default read-only:opacity-90"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
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
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--app-muted)]">
                Notes
              </label>
              <textarea
                rows={3}
                readOnly={readOnly}
                title={readOnly ? READ_ONLY_CONTROL_TITLE : undefined}
                className="w-full resize-none rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm outline-none ring-coral-500/30 focus:ring-2 read-only:cursor-default read-only:opacity-90"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Batch, line, operator…"
              />
            </div>
          </fieldset>
          <button
            type="submit"
            {...readOnlyButtonProps}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-coral-500 py-2.5 text-sm font-semibold text-white hover:bg-coral-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-coral-500"
          >
            <Plus className="h-4 w-4" />
            Record production
          </button>
        </form>

        <div className="overflow-x-auto rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm lg:col-span-2">
          <div className="border-b border-[var(--app-border)] px-4 py-3">
            <h2 className="text-base font-semibold text-[var(--app-text)]">
              Production log
            </h2>
            <p className="text-xs text-[var(--app-muted)]">
              Finished goods add to product stock automatically.
            </p>
          </div>
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--app-border)] text-xs uppercase text-[var(--app-muted)]">
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Qty</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Notes</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--app-border)]">
              {production.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-[var(--app-muted)]"
                  >
                    No production entries yet.
                  </td>
                </tr>
              )}
              {production.map((e) => {
                const p = products.find((x) => x.id === e.productId)
                return (
                  <tr key={e.id}>
                    <td className="px-4 py-3 font-medium text-[var(--app-text)]">
                      {p?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3">{e.quantity}</td>
                    <td className="px-4 py-3 text-[var(--app-muted)]">
                      {formatDateShort(e.date)}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-[var(--app-muted)]">
                      {e.notes || '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(e)}
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
                          onClick={() => handleDelete(e)}
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
        title={readOnly ? 'Production details' : 'Edit production entry'}
      >
        <form onSubmit={handleEditSubmit} className="space-y-3">
          {editError && (
            <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {editError}
            </p>
          )}
          <fieldset className="min-w-0 space-y-3 border-0 p-0">
            <ProductSelectWithSearch
              products={products}
              value={editProductId}
              onChange={setEditProductId}
              disabled={readOnly}
              allowSearchWhileLocked={readOnly}
              id="production-edit-product"
              label="Product"
              required
              selectClassName="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--app-text)] outline-none ring-coral-500/30 focus:ring-2"
            />
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
                onChange={(e) => setEditQuantity(e.target.value)}
              />
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
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--app-muted)]">
                Notes
              </label>
              <textarea
                rows={3}
                readOnly={readOnly}
                title={readOnly ? READ_ONLY_CONTROL_TITLE : undefined}
                className="w-full resize-none rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm outline-none ring-coral-500/30 focus:ring-2 read-only:cursor-default read-only:opacity-90"
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
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
