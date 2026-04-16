import { Download, FileText, Printer } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useData } from '../context/DataContext'
import { saleLineTotal, saleOrderTotal, stockStatus } from '../types'
import { downloadCsv } from '../utils/exportCsv'
import { formatDateShort, formatMoney } from '../utils/format'

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly'

function inPeriod(iso: string, period: Period): boolean {
  const t = new Date(iso).getTime()
  const now = Date.now()
  const day = 86400000
  if (period === 'daily') return now - t <= day
  if (period === 'weekly') return now - t <= 7 * day
  if (period === 'monthly') return now - t <= 31 * day
  return now - t <= 365 * day
}

export function ReportsPage() {
  const { products, sales, purchases } = useData()
  const [period, setPeriod] = useState<Period>('weekly')
  const filteredSales = useMemo(
    () => sales.filter((s) => inPeriod(s.date, period)),
    [sales, period],
  )

  const filteredPurchases = useMemo(
    () => purchases.filter((p) => inPeriod(p.date, period)),
    [purchases, period],
  )

  const revenue = useMemo(
    () => filteredSales.reduce((a, s) => a + saleOrderTotal(s), 0),
    [filteredSales],
  )

  const purchaseSpend = useMemo(
    () => filteredPurchases.reduce((a, p) => a + p.cost, 0),
    [filteredPurchases],
  )

  const profit = revenue - purchaseSpend

  const { totalItemsSold, uniqueSoldProducts, uniqueCustomersServed } = useMemo(() => {
    let itemCount = 0
    const productIds = new Set<string>()
    const customerIds = new Set<string>()

    for (const sale of filteredSales) {
      if (sale.customerId) customerIds.add(sale.customerId)
      for (const line of sale.lines) {
        itemCount += line.quantity
        if (line.productId) productIds.add(line.productId)
      }
    }

    return {
      totalItemsSold: itemCount,
      uniqueSoldProducts: productIds.size,
      uniqueCustomersServed: customerIds.size,
    }
  }, [filteredSales])

  const salesByDay = useMemo(() => {
    const map = new Map<string, number>()
    for (const s of filteredSales) {
      const key = new Date(s.date).toISOString().slice(0, 10)
      map.set(key, (map.get(key) ?? 0) + saleOrderTotal(s))
    }
    const keys = [...map.keys()].sort()
    return keys.map((k) => ({
      label: formatDateShort(k + 'T12:00:00.000Z'),
      revenue: Math.round((map.get(k) ?? 0) * 100) / 100,
    }))
  }, [filteredSales])

  function exportSalesCsv() {
    const headers = [
      'SaleId',
      'Date',
      'CustomerId',
      'ProductId',
      'Qty',
      'UnitPrice',
      'LineTotal',
    ]
    const rows: string[][] = []
    for (const s of filteredSales) {
      for (const line of s.lines) {
        rows.push([
          s.id,
          s.date,
          s.customerId,
          line.productId,
          String(line.quantity),
          String(line.unitPrice),
          String(saleLineTotal(line)),
        ])
      }
    }
    downloadCsv(`sales-${period}.csv`, headers, rows)
  }

  function exportStockCsv() {
    const headers = ['Name', 'Category', 'Stock', 'Status']
    const rows = products.map((p) => [
      p.name,
      p.category,
      String(p.stock),
      stockStatus(p.stock),
    ])
    downloadCsv('stock-report.csv', headers, rows)
  }

  function exportPdf() {
    window.print()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] p-0.5 text-xs font-semibold shadow-sm">
          {(
            [
              ['daily', 'Daily'],
              ['weekly', 'Weekly'],
              ['monthly', 'Monthly'],
              ['yearly', 'Yearly'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setPeriod(key)}
              className={
                period === key
                  ? 'rounded-lg bg-coral-500 px-3 py-2 text-white'
                  : 'rounded-lg px-3 py-2 text-[var(--app-muted)]'
              }
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={exportSalesCsv}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm font-medium shadow-sm hover:bg-[var(--app-hover)]"
          >
            <Download className="h-4 w-4" />
            Sales CSV
          </button>
          <button
            type="button"
            onClick={exportStockCsv}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--app-border)] bg-[var(--app-surface)] px-3 py-2 text-sm font-medium shadow-sm hover:bg-[var(--app-hover)]"
          >
            <Download className="h-4 w-4" />
            Stock CSV
          </button>
          <button
            type="button"
            onClick={exportPdf}
            className="inline-flex items-center gap-2 rounded-xl bg-coral-500 px-3 py-2 text-sm font-semibold text-white shadow-md shadow-coral-500/25 hover:bg-coral-600"
          >
            <Printer className="h-4 w-4" />
            Export PDF
          </button>
        </div>
      </div>

      <p className="text-xs text-[var(--app-muted)]">
        <FileText className="mr-1 inline h-3.5 w-3.5" />
        PDF uses your browser’s print dialog — choose &quot;Save as PDF&quot; as the
        destination.
      </p>

      <div
        id="print-root"
        className="space-y-6 rounded-2xl bg-[var(--app-surface)] p-6 text-[var(--app-text)] print:block print:bg-white print:text-black"
      >
        <div className="hidden print:block">
          <h1 className="text-2xl font-bold">Cleaning Factory — Report</h1>
          <p className="text-sm text-[var(--app-muted)] print:text-gray-600">
            Period: {period} · Generated {new Date().toLocaleString()}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
          <ReportCard label="Sales revenue" value={formatMoney(revenue)} />
          <ReportCard label="Purchase spend" value={formatMoney(purchaseSpend)} />
          <ReportCard
            label="Profit overview"
            value={formatMoney(profit)}
            hint="Revenue minus purchase costs (period)"
          />
          <ReportCard
            label="Total items sold"
            value={String(totalItemsSold)}
            hint="Total no. of items sold"
          />
          <ReportCard
            label="Sold products"
            value={String(uniqueSoldProducts)}
            hint="Unique items sold"
          />
          <ReportCard
            label="Shop centers"
            value={String(uniqueCustomersServed)}
            hint="Customers with sales"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm print:border-gray-300 print:bg-white">
            <h2 className="mb-4 text-base font-semibold text-[var(--app-text)] print:text-black">
              Sales report
            </h2>
            <div className="h-64 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip formatter={(v) => formatMoney(Number(v))} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#ff5c4d"
                    strokeWidth={2}
                    name="Revenue"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm print:border-gray-300 print:bg-white">
            <h2 className="mb-4 text-base font-semibold text-[var(--app-text)] print:text-black">
              Stock levels
            </h2>
            <div className="h-64 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={products.map((p) => ({ name: p.name, stock: p.stock }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} angle={-25} textAnchor="end" height={70} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="stock" fill="#ff7a6b" name="Units" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] print:border-gray-300 print:bg-white">
          <h2 className="border-b border-[var(--app-border)] px-4 py-3 text-base font-semibold text-[var(--app-text)] print:text-black">
            Stock table
          </h2>
          <table className="w-full min-w-[480px] text-left text-sm print:text-black">
            <thead>
              <tr className="border-b border-[var(--app-border)] text-xs uppercase text-[var(--app-muted)]">
                <th className="px-4 py-2">Product</th>
                <th className="px-4 py-2">Category</th>
                <th className="px-4 py-2">Stock</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-gray-100">
                  <td className="px-4 py-2">{p.name}</td>
                  <td className="px-4 py-2">{p.category}</td>
                  <td className="px-4 py-2">{p.stock}</td>
                  <td className="px-4 py-2">{stockStatus(p.stock)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function ReportCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm print:border-gray-300 print:bg-white">
      <p className="text-sm text-[var(--app-muted)] print:text-gray-600">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-[var(--app-text)] print:text-black">
        {value}
      </p>
      {hint && (
        <p className="mt-1 text-xs text-[var(--app-muted)] print:text-gray-600">{hint}</p>
      )}
    </div>
  )
}
