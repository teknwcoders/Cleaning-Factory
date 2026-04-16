import {
  ChevronDown,
  Download,
  MapPin,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserPlus,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal } from '../components/Modal'
import { useAuth } from '../context/AuthContext'
import { READ_ONLY_CONTROL_TITLE, useData } from '../context/DataContext'
import { useUiFeedback } from '../context/UiFeedbackContext'
import type { Customer } from '../types'
import { downloadCsv } from '../utils/exportCsv'

export function CustomersPage() {
  const {
    customers,
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
  const [searchQuery, setSearchQuery] = useState('')
  const [locationFilter, setLocationFilter] = useState('all')
  const [exportOpen, setExportOpen] = useState(false)
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([])
  const [printExportLabel, setPrintExportLabel] = useState('All customers')

  const locationOptions = useMemo(
    () =>
      [...new Set(customers.map((c) => c.location.trim()).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b),
      ),
    [customers],
  )

  const filteredCustomers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return customers.filter((customer) => {
      const matchesQuery =
        !query ||
        customer.name.toLowerCase().includes(query) ||
        customer.phone.toLowerCase().includes(query) ||
        customer.location.toLowerCase().includes(query)
      const matchesLocation =
        locationFilter === 'all' || customer.location.trim() === locationFilter
      return matchesQuery && matchesLocation
    })
  }, [customers, locationFilter, searchQuery])

  const selectedCustomers = useMemo(
    () => customers.filter((c) => selectedCustomerIds.includes(c.id)),
    [customers, selectedCustomerIds],
  )

  const sortedCustomers = useMemo(
    () => [...customers].sort((a, b) => a.name.localeCompare(b.name)),
    [customers],
  )

  const sortedFilteredCustomers = useMemo(
    () => [...filteredCustomers].sort((a, b) => a.name.localeCompare(b.name)),
    [filteredCustomers],
  )

  const sortedSelectedCustomers = useMemo(
    () => [...selectedCustomers].sort((a, b) => a.name.localeCompare(b.name)),
    [selectedCustomers],
  )

  const allVisibleSelected =
    filteredCustomers.length > 0 &&
    filteredCustomers.every((c) => selectedCustomerIds.includes(c.id))

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
      return
    }
    setSelectedCustomerIds((prev) => prev.filter((id) => id !== c.id))
    showToast({ message: 'Customer deleted.', variant: 'success' })
  }

  function exportCustomersCsv(list: Customer[], label: string) {
    if (!list.length) return
    const headers = ['No.', 'Name', 'Phone', 'Location']
    const rows = [...list]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c, idx) => [String(idx + 1), c.name, c.phone, c.location || ''])
    const stamp = new Date().toISOString().slice(0, 10)
    downloadCsv(`customers-${label}-${stamp}.csv`, headers, rows)
    setExportOpen(false)
  }

  function exportCustomersPdf(list: Customer[], label: string) {
    if (!list.length) return
    setPrintExportLabel(label)
    setExportOpen(false)
    requestAnimationFrame(() => {
      window.print()
    })
  }

  function toggleSelectedCustomer(customerId: string) {
    setSelectedCustomerIds((prev) =>
      prev.includes(customerId)
        ? prev.filter((id) => id !== customerId)
        : [...prev, customerId],
    )
  }

  function toggleSelectVisible(checked: boolean) {
    setSelectedCustomerIds((prev) => {
      const hiddenSelections = prev.filter(
        (id) => !filteredCustomers.some((customer) => customer.id === id),
      )
      if (!checked) return hiddenSelections
      return [...new Set([...hiddenSelections, ...filteredCustomers.map((c) => c.id)])]
    })
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

        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] shadow-sm lg:col-span-2">
          <div className="space-y-4 border-b border-[var(--app-border)] px-4 py-4">
            <div>
              <h2 className="text-base font-semibold text-[var(--app-text)]">
                Customers
              </h2>
              <p className="text-xs text-[var(--app-muted)]">
                Search by name, phone, or location and export the current results.{' '}
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

            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr),180px,auto]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-muted)]" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, phone, or location"
                  className="w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] py-2.5 pl-10 pr-3 text-sm text-[var(--app-text)] outline-none ring-coral-500/30 focus:ring-2"
                />
              </label>

              <label className="flex items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3">
                <MapPin className="h-4 w-4 text-[var(--app-muted)]" aria-hidden />
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full bg-transparent py-2.5 text-sm text-[var(--app-text)] outline-none"
                >
                  <option value="all">All locations</option>
                  {locationOptions.map((locationName) => (
                    <option key={locationName} value={locationName}>
                      {locationName}
                    </option>
                  ))}
                </select>
              </label>

              <div className="relative">
                <button
                  type="button"
                  disabled={!customers.length}
                  onClick={() => setExportOpen((open) => !open)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-coral-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-coral-500/25 hover:bg-coral-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Download className="h-4 w-4 shrink-0" aria-hidden />
                  Export
                  <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
                </button>

                {exportOpen && (
                  <div className="absolute right-0 z-10 mt-2 w-64 rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-2 shadow-xl">
                    <button
                      type="button"
                      onClick={() => exportCustomersCsv(sortedCustomers, 'all')}
                      className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-[var(--app-text)] hover:bg-[var(--app-bg)]"
                    >
                      Export all customers (CSV)
                    </button>
                    <button
                      type="button"
                      onClick={() => exportCustomersPdf(sortedCustomers, 'All customers')}
                      className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-[var(--app-text)] hover:bg-[var(--app-bg)]"
                    >
                      Export all customers (PDF)
                    </button>
                    <button
                      type="button"
                      disabled={!sortedFilteredCustomers.length}
                      onClick={() =>
                        exportCustomersCsv(
                          sortedFilteredCustomers,
                          locationFilter === 'all'
                            ? 'filtered'
                            : locationFilter.toLowerCase().replace(/\s+/g, '-'),
                        )
                      }
                      className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-[var(--app-text)] hover:bg-[var(--app-bg)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {locationFilter === 'all'
                        ? 'Export current filtered results (CSV)'
                        : `Export ${locationFilter} customers (CSV)`}
                    </button>
                    <button
                      type="button"
                      disabled={!sortedFilteredCustomers.length}
                      onClick={() =>
                        exportCustomersPdf(
                          sortedFilteredCustomers,
                          locationFilter === 'all'
                            ? 'Filtered customers'
                            : `${locationFilter} customers`,
                        )
                      }
                      className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-[var(--app-text)] hover:bg-[var(--app-bg)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {locationFilter === 'all'
                        ? 'Export current filtered results (PDF)'
                        : `Export ${locationFilter} customers (PDF)`}
                    </button>
                    <button
                      type="button"
                      disabled={!sortedSelectedCustomers.length}
                      onClick={() => exportCustomersCsv(sortedSelectedCustomers, 'selected')}
                      className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-[var(--app-text)] hover:bg-[var(--app-bg)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Export selected customers (CSV)
                    </button>
                    <button
                      type="button"
                      disabled={!sortedSelectedCustomers.length}
                      onClick={() =>
                        exportCustomersPdf(sortedSelectedCustomers, 'Selected customers')
                      }
                      className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-[var(--app-text)] hover:bg-[var(--app-bg)] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Export selected customers (PDF)
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--app-muted)]">
              <span className="rounded-full bg-[var(--app-bg)] px-2.5 py-1">
                {filteredCustomers.length} result{filteredCustomers.length === 1 ? '' : 's'}
              </span>
              <span className="rounded-full bg-[var(--app-bg)] px-2.5 py-1">
                {selectedCustomers.length} selected
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--app-border)] text-xs uppercase text-[var(--app-muted)]">
                  <th className="px-4 py-3 font-medium">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={(e) => toggleSelectVisible(e.target.checked)}
                      aria-label="Select all visible customers"
                    />
                  </th>
                  <th className="px-4 py-3 font-medium">No.</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Location</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--app-border)]">
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-[var(--app-muted)]"
                    >
                      No customers match your search or location filter.
                    </td>
                  </tr>
                )}
                {filteredCustomers.map((c, idx) => {
                  const orders = customerOrderCount(c.id)
                  return (
                    <tr key={c.id} className="hover:bg-[var(--app-bg)]/70">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedCustomerIds.includes(c.id)}
                          onChange={() => toggleSelectedCustomer(c.id)}
                          aria-label={`Select ${c.name}`}
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-[var(--app-muted)]">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-[var(--app-text)]">{c.name}</div>
                        <div className="text-xs text-[var(--app-muted)]">
                          {orders} order{orders === 1 ? '' : 's'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[var(--app-muted)]">{c.phone}</td>
                      <td className="px-4 py-3 text-[var(--app-muted)]">
                        {c.location || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(c)}
                            title={readOnly ? 'View details (read-only)' : undefined}
                            className="inline-flex items-center gap-1 rounded-lg border border-transparent px-2 py-1.5 text-xs font-medium text-[var(--app-muted)] hover:border-[var(--app-border)] hover:bg-gray-100 dark:hover:bg-white/10"
                          >
                            <Pencil className="h-4 w-4" />
                            <span>{readOnly ? 'View' : 'Edit'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(c)}
                            {...readOnlyButtonProps}
                            className="inline-flex items-center gap-1 rounded-lg border border-transparent px-2 py-1.5 text-xs font-medium text-red-600 hover:border-red-200 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:hover:border-red-900 dark:hover:bg-red-950/30"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Delete</span>
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
        <h1 className="text-2xl font-bold">Cleaning Factory — Customers</h1>
        <p className="mt-1 text-sm text-gray-600">
          {printExportLabel} · Generated {new Date().toLocaleString()}
        </p>
        <table
          className="mt-6 w-full border-collapse text-sm"
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
                No.
              </th>
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
            {(printExportLabel === 'All customers'
              ? sortedCustomers
              : printExportLabel === 'Selected customers'
                ? sortedSelectedCustomers
                : sortedFilteredCustomers
            ).map((c, idx) => (
              <tr key={c.id}>
                <td style={{ border: '1px solid #ccc', padding: '8px 12px' }}>
                  {idx + 1}
                </td>
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
