import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Modal } from '../components/Modal'
import { StockBadge } from '../components/StockBadge'
import { READ_ONLY_CONTROL_TITLE, useData } from '../context/DataContext'
import { useAuth } from '../context/AuthContext'
import { useUiFeedback } from '../context/UiFeedbackContext'
import type { Product } from '../types'
import { stockStatus } from '../types'
import { formatMoney } from '../utils/format'

type ProductFormState = {
  name: string
  category: string
  /** Empty until the user types (add / edit). */
  price: string
  stock: string
}

const emptyForm: ProductFormState = {
  name: '',
  category: '',
  price: '',
  stock: '',
}

export function ProductsPage() {
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    readOnly,
    readOnlyButtonProps,
  } = useData()
  const { showToast } = useUiFeedback()
  const { hasPermission } = useAuth()
  const canManageProducts = hasPermission('manage_products')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<ProductFormState>(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)

  const categories = useMemo(() => {
    const s = new Set(products.map((p) => p.category))
    return [...s].sort()
  }, [products])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return products.filter((p) => {
      const matchQ =
        !s ||
        p.name.toLowerCase().includes(s) ||
        p.category.toLowerCase().includes(s)
      const matchC = !cat || p.category === cat
      return matchQ && matchC
    })
  }, [products, q, cat])

  function openAdd() {
    setEditing(null)
    setForm(emptyForm)
    setFormError(null)
    setModalOpen(true)
  }

  function openEdit(p: Product) {
    setFormError(null)
    setEditing(p)
    setForm({
      name: p.name,
      category: p.category,
      price: String(p.price),
      stock: String(p.stock),
    })
    setModalOpen(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.category.trim()) {
      setFormError('Name and category are required.')
      return
    }
    const price = Number(form.price.trim())
    const stock = Number(form.stock.trim())
    if (form.price.trim() === '' || Number.isNaN(price) || price < 0) {
      setFormError('Enter a valid price (0 or greater).')
      return
    }
    if (
      form.stock.trim() === '' ||
      Number.isNaN(stock) ||
      !Number.isInteger(stock) ||
      stock < 0
    ) {
      setFormError('Enter a valid whole-number stock (0 or greater).')
      return
    }
    setFormError(null)
    if (editing) {
      updateProduct({
        ...editing,
        name: form.name.trim(),
        category: form.category.trim(),
        price,
        stock,
      })
      showToast({ message: 'Product updated.', variant: 'success' })
    } else {
      addProduct({
        name: form.name.trim(),
        category: form.category.trim(),
        price,
        stock,
      })
      showToast({
        message: `Product “${form.name.trim()}” added.`,
        variant: 'success',
      })
    }
    setModalOpen(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap gap-2">
          <div className="flex min-w-[200px] flex-1 gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-muted)]" />
              <input
                ref={searchInputRef}
                className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] py-2 pl-9 pr-3 text-sm text-[var(--app-text)] outline-none ring-coral-500/30 focus:ring-2"
                placeholder="Search products…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                aria-label="Search products"
              />
            </div>
            <button
              type="button"
              onClick={() => searchInputRef.current?.focus()}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm font-semibold text-[var(--app-text)] shadow-sm transition hover:bg-gray-100 dark:hover:bg-white/10"
            >
              <Search className="h-4 w-4" aria-hidden />
              Search
            </button>
          </div>
          <select
            className="rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm outline-none ring-coral-500/30 focus:ring-2"
            value={cat}
            onChange={(e) => setCat(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        {canManageProducts && (
          <button
            type="button"
            onClick={openAdd}
            {...readOnlyButtonProps}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-coral-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-coral-500/25 transition hover:bg-coral-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-coral-500"
          >
            <Plus className="h-4 w-4" />
            Add product
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--app-border)] text-xs uppercase tracking-wide text-[var(--app-muted)]">
              <th className="px-4 py-3 font-medium">Product name</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Stock</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--app-border)]">
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-10 text-center text-[var(--app-muted)]"
                >
                  No products match your filters.
                </td>
              </tr>
            )}
            {filtered.map((p) => (
              <tr key={p.id} className="hover:bg-gray-50/80 dark:hover:bg-white/[0.03]">
                <td className="px-4 py-3 font-medium text-[var(--app-text)]">
                  {p.name}
                </td>
                <td className="px-4 py-3 text-[var(--app-muted)]">{p.category}</td>
                <td className="px-4 py-3">{formatMoney(p.price)}</td>
                <td className="px-4 py-3">{p.stock}</td>
                <td className="px-4 py-3">
                  <StockBadge status={stockStatus(p.stock)} />
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => openEdit(p)}
                    title={readOnly ? 'View product (read-only)' : 'Edit'}
                    className="mr-1 inline-flex rounded-lg p-2 text-[var(--app-muted)] hover:bg-gray-100 dark:hover:bg-white/10"
                    aria-label={readOnly ? 'View product' : 'Edit'}
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  {canManageProducts && (
                    <button
                      type="button"
                      onClick={() => {
                        if (
                          confirm(
                            `Delete “${p.name}”? This cannot be undone from the UI.`,
                          )
                        )
                          deleteProduct(p.id)
                      }}
                      {...readOnlyButtonProps}
                      className="inline-flex rounded-lg p-2 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:bg-red-950/30"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={
          editing
            ? readOnly
              ? 'Product details'
              : 'Edit product'
            : 'Add product'
        }
      >
        <form onSubmit={handleSubmit} className="space-y-3">
          {formError && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100"
            >
              {formError}
            </p>
          )}
          <fieldset className="min-w-0 space-y-3 border-0 p-0">
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--app-muted)]">
                Name
              </label>
              <input
                required
                readOnly={readOnly}
                title={readOnly ? READ_ONLY_CONTROL_TITLE : undefined}
                className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm outline-none ring-coral-500/30 focus:ring-2 read-only:cursor-default read-only:opacity-90"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--app-muted)]">
                Category
              </label>
              <input
                required
                readOnly={readOnly}
                title={readOnly ? READ_ONLY_CONTROL_TITLE : undefined}
                className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm outline-none ring-coral-500/30 focus:ring-2 read-only:cursor-default read-only:opacity-90"
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--app-muted)]">
                  Price
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  required
                  readOnly={readOnly}
                  title={readOnly ? READ_ONLY_CONTROL_TITLE : undefined}
                  className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm outline-none ring-coral-500/30 focus:ring-2 read-only:cursor-default read-only:opacity-90"
                  value={form.price}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, price: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--app-muted)]">
                  Stock quantity
                </label>
                <input
                  type="number"
                  min={0}
                  required
                  readOnly={readOnly}
                  title={readOnly ? READ_ONLY_CONTROL_TITLE : undefined}
                  className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm outline-none ring-coral-500/30 focus:ring-2 read-only:cursor-default read-only:opacity-90"
                  value={form.stock}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, stock: e.target.value }))
                  }
                />
              </div>
            </div>
          </fieldset>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-xl border border-[var(--app-border)] px-4 py-2 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              {...readOnlyButtonProps}
              className="rounded-xl bg-coral-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-coral-600 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-coral-500"
            >
              {editing ? 'Save changes' : 'Create product'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
