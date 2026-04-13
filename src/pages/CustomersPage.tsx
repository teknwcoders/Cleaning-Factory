import { Download, MapPin, Pencil, Plus, Printer, Trash2, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal } from '../components/Modal'
import { useAuth } from '../context/AuthContext'
import { READ_ONLY_CONTROL_TITLE, useData } from '../context/DataContext'
import { useUiFeedback } from '../context/UiFeedbackContext'
import type { Customer } from '../types'
import { saleOrderTotal } from '../types'
import { downloadCsv } from '../utils/exportCsv'
import { formatDateShort, formatMoney } from '../utils/format'

export function CustomersPage() {
  const {
    customers,
    sales,
    products,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    customerOrderCount,
    readOnly,
    readOnlyButtonProps,
  } = useData()
  const { showToast } = useUiFeedback()
  const { canAccessModule } = useAuth()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')

  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [formError, setFormError] = useState('')
  const [editFormError, setEditFormError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')
    if (!name.trim() || !phone.trim()) {
      setFormError('Name and phone are required.')
      return
    }
    const displayName = name.trim()
    addCustomer({
      name: displayName,
      phone: phone.trim(),
      location: location.trim(),
    })
    showToast({
      message: `Customer “${displayName}” added.`,
      variant: 'success',
    })
    setName('')
    setPhone('')
    setLocation('')
  }

  function openEdit(c: Customer) {
    setEditing(c)
    setEditName(c.name)
    setEditPhone(c.phone)
    setEditLocation(c.location)
    setEditFormError('')
    setEditOpen(true)
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setEditFormError('')
    if (!editName.trim() || !editPhone.trim()) {
      setEditFormError('Name and phone are required.')
      return
    }
    updateCustomer({
      ...editing,
      name: editName.trim(),
      phone: editPhone.trim(),
      location: editLocation.trim(),
    })
    showToast({ message: 'Customer updated.', variant: 'success' })
    setEditOpen(false)
    setEditing(null)
  }

  function handleDelete(c: Customer) {
    setFormError('')
    const orders = customerOrderCount(c.id)
    if (orders > 0) {
      setFormError(
        `Cannot delete “${c.name}”: ${orders} sale(s) are linked. Remove or change those sales first.`,
      )
      return
    }
    if (!confirm(`Delete customer “${c.name}”?`)) return
    const res = deleteCustomer(c.id)
    if (!res.ok) {
      setFormError(res.error)
    }
  }

  function lastOrderFor(customerId: string) {
    const list = sales.filter((s) => s.customerId === customerId)
    if (!list.length) return null
    return list.reduce((a, b) =>
      new Date(a.date) > new Date(b.date) ? a : b,
    )
  }

  function exportContactsCsv() {
    if (!customers.length) return
    const headers = ['Name', 'Phone', 'Location']
    const rows = customers.map((c) => [c.name, c.phone, c.location || ''])
    const stamp = new Date().toISOString().slice(0, 10)
    downloadCsv(`customers-contacts-${stamp}.csv`, headers, rows)
  }

  function exportContactsPdf() {
    if (!customers.length) return
    window.print()
  }

  return (
    <div className="space-y-6">
      {formError && (
        <p
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {formError}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm lg:col-span-1"
        >
          <div className="mb-4 flex items-center gap-2">
            <div className="rounded-xl bg-coral-100 p-2 text-coral-600 dark:bg-coral-950/50 dark:text-coral-300">
              <UserPlus className="h-5 w-5" />
            </div>
            <h2 className="text-base font-semibold text-[var(--app-text)]">
              Add customer
            </h2>
          </div>
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
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--app-muted)]">
                Phone
              </label>
              <input
                required
                readOnly={readOnly}
                title={readOnly ? READ_ONLY_CONTROL_TITLE : undefined}
                className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm outline-none ring-coral-500/30 focus:ring-2 read-only:cursor-default read-only:opacity-90"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-[var(--app-muted)]">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                Location
              </label>
              <input
                readOnly={readOnly}
                title={readOnly ? READ_ONLY_CONTROL_TITLE : undefined}
                className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm outline-none ring-coral-500/30 focus:ring-2 read-only:cursor-default read-only:opacity-90"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="City, region, or address"
              />
            </div>
          </fieldset>
          <button
            type="submit"
            {...readOnlyButtonProps}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-coral-500 py-2.5 text-sm font-semibold text-white hover:bg-coral-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-coral-500"
          >
            <Plus className="h-4 w-4" />
            Save customer
          </button>
        </form>

        <div className="overflow-x-auto rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm lg:col-span-2">
          <div className="flex flex-col gap-3 border-b border-[var(--app-border)] px-4 py-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-[var(--app-text)]">
                Customers & history
              </h2>
              <p className="text-xs text-[var(--app-muted)]">
                Orders counts from recorded sales.{' '}
                {canAccessModule('sales') ? (
                  <Link
                    to="/sales"
                    className="font-medium text-coral-600 hover:underline dark:text-coral-400"
                  >
                    Record a sale
                  </Link>
                ) : (
                  <span className="text-[var(--app-muted)]">Sales page not enabled</span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!customers.length}
                onClick={exportContactsCsv}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-xs font-semibold text-[var(--app-text)] shadow-sm hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:hover:bg-white/10"
              >
                <Download className="h-4 w-4 shrink-0" aria-hidden />
                Export CSV
              </button>
              <button
                type="button"
                disabled={!customers.length}
                onClick={exportContactsPdf}
                className="inline-flex items-center gap-2 rounded-xl bg-coral-500 px-3 py-2 text-xs font-semibold text-white shadow-md shadow-coral-500/25 hover:bg-coral-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Printer className="h-4 w-4 shrink-0" aria-hidden />
                Export PDF
              </button>
            </div>
          </div>
          {customers.length > 0 && (
            <p className="border-b border-[var(--app-border)] px-4 py-2 text-[10px] text-[var(--app-muted)]">
              PDF opens the print dialog — choose &quot;Save as PDF&quot; or your printer.
            </p>
          )}
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--app-border)] text-xs uppercase text-[var(--app-muted)]">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Orders</th>
                <th className="px-4 py-3 font-medium">Last order</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--app-border)]">
              {customers.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-[var(--app-muted)]"
                  >
                    No customers yet.
                  </td>
                </tr>
              )}
              {customers.map((c) => {
                const last = lastOrderFor(c.id)
                const lineSummary =
                  last &&
                  last.lines
                    .map((line) => {
                      const p = products.find((x) => x.id === line.productId)
                      return `${p?.name ?? 'Item'} ×${line.quantity}`
                    })
                    .join(', ')
                const orders = customerOrderCount(c.id)
                return (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-medium text-[var(--app-text)]">
                      {c.name}
                    </td>
                    <td className="px-4 py-3 text-[var(--app-muted)]">{c.phone}</td>
                    <td className="max-w-[160px] px-4 py-3 text-[var(--app-muted)]">
                      {c.location ? (
                        <span className="line-clamp-2" title={c.location}>
                          {c.location}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3">{orders}</td>
                    <td className="px-4 py-3 text-[var(--app-muted)]">
                      {last ? (
                        <>
                          {formatDateShort(last.date)}
                          {lineSummary && (
                            <span className="block text-xs">{lineSummary}</span>
                          )}
                          <span className="block text-xs font-medium text-coral-600 dark:text-coral-400">
                            {formatMoney(saleOrderTotal(last))}
                          </span>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(c)}
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
                          onClick={() => handleDelete(c)}
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

      <div
        id="print-root"
        className="print-root-offscreen bg-white text-black"
        aria-hidden="true"
      >
        <h1 className="mb-1 text-xl font-bold">Cleaning Factory — Customer contacts</h1>
        <p className="mb-4 text-sm text-gray-600">
          Exported {new Date().toLocaleString()} · {customers.length} contact
          {customers.length === 1 ? '' : 's'}
        </p>
        <table
          className="w-full border-collapse text-sm"
          style={{ border: '1px solid #ccc' }}
        >
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              <th
                style={{
                  border: '1px solid #ccc',
                  padding: '10px 12px',
                  textAlign: 'left',
                }}
              >
                Name
              </th>
              <th
                style={{
                  border: '1px solid #ccc',
                  padding: '10px 12px',
                  textAlign: 'left',
                }}
              >
                Phone
              </th>
              <th
                style={{
                  border: '1px solid #ccc',
                  padding: '10px 12px',
                  textAlign: 'left',
                }}
              >
                Location
              </th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td style={{ border: '1px solid #ccc', padding: '8px 12px' }}>
                  {c.name}
                </td>
                <td style={{ border: '1px solid #ccc', padding: '8px 12px' }}>
                  {c.phone}
                </td>
                <td style={{ border: '1px solid #ccc', padding: '8px 12px' }}>
                  {c.location || '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal
        open={editOpen}
        onClose={() => {
          setEditOpen(false)
          setEditing(null)
          setEditFormError('')
        }}
        title={readOnly ? 'Customer details' : 'Edit customer'}
      >
        <form onSubmit={handleEditSubmit} className="space-y-3">
          {editFormError && (
            <p
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-100"
            >
              {editFormError}
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
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--app-muted)]">
                Phone
              </label>
              <input
                required
                readOnly={readOnly}
                title={readOnly ? READ_ONLY_CONTROL_TITLE : undefined}
                className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm outline-none ring-coral-500/30 focus:ring-2 read-only:cursor-default read-only:opacity-90"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-[var(--app-muted)]">
                <MapPin className="h-3.5 w-3.5" aria-hidden />
                Location
              </label>
              <input
                readOnly={readOnly}
                title={readOnly ? READ_ONLY_CONTROL_TITLE : undefined}
                className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm outline-none ring-coral-500/30 focus:ring-2 read-only:cursor-default read-only:opacity-90"
                value={editLocation}
                onChange={(e) => setEditLocation(e.target.value)}
                placeholder="City, region, or address"
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
