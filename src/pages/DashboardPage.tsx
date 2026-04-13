import { Package, Plus, TrendingUp, Warehouse } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
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
import { MODULE_KEYS } from '../auth/modules'
import { useAuth } from '../context/AuthContext'
import { READ_ONLY_CONTROL_TITLE, useData } from '../context/DataContext'
import { saleOrderTotal } from '../types'
import { formatDateShort, formatMoney } from '../utils/format'

type Range = 'weekly' | 'monthly'

function bucketKey(iso: string, range: Range): string {
  const d = new Date(iso)
  if (range === 'weekly') {
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    const monday = new Date(d)
    monday.setDate(diff)
    return monday.toISOString().slice(0, 10)
  }
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function bucketLabel(key: string, range: Range): string {
  if (range === 'weekly') {
    return formatDateShort(key + 'T12:00:00.000Z')
  }
  const [y, m] = key.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleString(undefined, {
    month: 'short',
    year: 'numeric',
  })
}

export function DashboardPage() {
  const {
    products,
    sales,
    todaySalesTotal,
    todayRevenue,
    lowStockProducts,
    readOnly,
  } = useData()
  const { isViewer, canAccessModule } = useAuth()

  const operationalModules = MODULE_KEYS.filter(
    (k) => k !== 'dashboard' && k !== 'settings',
  )
  const viewerHasOperationalAccess = operationalModules.some((k) =>
    canAccessModule(k),
  )
  const [chartRange, setChartRange] = useState<Range>('weekly')
  const [chartNow] = useState(() => Date.now())

  const totalStock = useMemo(
    () => products.reduce((a, p) => a + p.stock, 0),
    [products],
  )

  const chartData = useMemo(() => {
    const map = new Map<string, number>()
    const past =
      chartRange === 'weekly'
        ? chartNow - 8 * 7 * 86400000
        : chartNow - 400 * 86400000
    for (const s of sales) {
      const t = new Date(s.date).getTime()
      if (t < past) continue
      const k = bucketKey(s.date, chartRange)
      const rev = saleOrderTotal(s)
      map.set(k, (map.get(k) ?? 0) + rev)
    }
    const keys = [...map.keys()].sort()
    return keys.map((k) => ({
      name: bucketLabel(k, chartRange),
      revenue: Math.round((map.get(k) ?? 0) * 100) / 100,
    }))
  }, [sales, chartRange, chartNow])

  const topProducts = useMemo(() => {
    const qty = new Map<string, number>()
    for (const s of sales) {
      for (const line of s.lines) {
        qty.set(
          line.productId,
          (qty.get(line.productId) ?? 0) + line.quantity,
        )
      }
    }
    return [...qty.entries()]
      .map(([productId, q]) => {
        const p = products.find((x) => x.id === productId)
        return {
          name: p?.name ?? 'Unknown',
          sold: q,
        }
      })
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5)
  }, [sales, products])

  const recentSales = sales.slice(0, 6)
  const recentProducts = [...products].slice(-5).reverse()

  return (
    <div className="space-y-6">
      {isViewer && !viewerHasOperationalAccess && canAccessModule('settings') && (
        <div
          role="status"
          className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950 dark:border-sky-900/50 dark:bg-sky-950/35 dark:text-sky-100"
        >
          <p>
            <strong className="font-semibold">Limited sidebar:</strong> A manager
            can grant access to Products, Sales, and other modules. They sign in as
            a manager, open{' '}
            <Link
              to="/settings"
              className="font-semibold text-coral-600 underline decoration-coral-500/40 underline-offset-2 hover:text-coral-700 dark:text-coral-400"
            >
              Settings
            </Link>
            , then use <strong className="font-semibold">Enable all modules</strong>{' '}
            or turn on individual pages under <strong className="font-semibold">Viewer module access</strong>.
          </p>
        </div>
      )}
      {lowStockProducts.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/50 dark:bg-amber-950/30">
          <p className="text-sm text-amber-900 dark:text-amber-100">
            <strong>Low stock alert:</strong>{' '}
            {lowStockProducts.map((p) => p.name).join(', ')}
          </p>
          {canAccessModule('products') ? (
            <Link
              to="/products"
              className="shrink-0 rounded-xl bg-coral-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-coral-600"
            >
              Review inventory
            </Link>
          ) : (
            <span className="shrink-0 text-xs text-amber-800/80 dark:text-amber-200/90">
              Products page not enabled for your role
            </span>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Package}
          label="Total products"
          value={String(products.length)}
          hint="Active SKUs"
        />
        <StatCard
          icon={TrendingUp}
          label="Sales today"
          value={String(todaySalesTotal)}
          hint="Recorded orders"
        />
        <StatCard
          icon={Warehouse}
          label="Stock available"
          value={String(totalStock)}
          hint="Units on hand"
        />
        <StatCard
          icon={TrendingUp}
          label="Revenue today"
          value={formatMoney(todayRevenue)}
          hint="From today’s sales"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-semibold text-[var(--app-text)]">
              Sales overview
            </h2>
            <div className="flex rounded-xl border border-[var(--app-border)] p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setChartRange('weekly')}
                className={
                  chartRange === 'weekly'
                    ? 'rounded-lg bg-coral-500 px-3 py-1.5 text-white'
                    : 'px-3 py-1.5 text-[var(--app-muted)]'
                }
              >
                Weekly
              </button>
              <button
                type="button"
                onClick={() => setChartRange('monthly')}
                className={
                  chartRange === 'monthly'
                    ? 'rounded-lg bg-coral-500 px-3 py-1.5 text-white'
                    : 'px-3 py-1.5 text-[var(--app-muted)]'
                }
              >
                Monthly
              </button>
            </div>
          </div>
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v) => formatMoney(Number(v))}
                  contentStyle={{ borderRadius: 12 }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Revenue"
                  stroke="#ff5c4d"
                  strokeWidth={2}
                  dot={{ fill: '#ff5c4d' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-[var(--app-text)]">
            Top selling products
          </h2>
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProducts} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-40" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip contentStyle={{ borderRadius: 12 }} />
                <Bar dataKey="sold" name="Units sold" fill="#ff7a6b" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--app-text)]">
              Latest sales
            </h2>
            {readOnly ? (
              <span
                title={READ_ONLY_CONTROL_TITLE}
                className="inline-flex cursor-not-allowed items-center gap-1 text-sm font-medium text-[var(--app-muted)]"
              >
                <Plus className="h-4 w-4 opacity-50" aria-hidden />
                Quick add
              </span>
            ) : canAccessModule('sales') ? (
              <Link
                to="/sales"
                className="inline-flex items-center gap-1 text-sm font-medium text-coral-600 transition hover:underline active:scale-[0.99] dark:text-coral-400"
              >
                <Plus className="h-4 w-4" />
                Quick add
              </Link>
            ) : (
              <span className="text-sm text-[var(--app-muted)]">Sales not enabled</span>
            )}
          </div>
          <ul className="divide-y divide-[var(--app-border)]">
            {recentSales.length === 0 && (
              <li className="py-6 text-center text-sm text-[var(--app-muted)]">
                No sales yet.
              </li>
            )}
            {recentSales.map((s) => {
              const summary = s.lines
                .map((line) => {
                  const p = products.find((x) => x.id === line.productId)
                  return `${p?.name ?? 'Item'} ×${line.quantity}`
                })
                .join(', ')
              return (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-[var(--app-text)]">
                      {summary || 'Sale'}
                    </p>
                    <p className="text-xs text-[var(--app-muted)]">
                      {formatDateShort(s.date)} · {s.lines.length} line
                      {s.lines.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <span className="font-semibold text-coral-600 dark:text-coral-400">
                    {formatMoney(saleOrderTotal(s))}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-[var(--app-text)]">
              Latest added products
            </h2>
            {canAccessModule('products') ? (
              <Link
                to="/products"
                className="text-sm font-medium text-coral-600 hover:underline dark:text-coral-400"
              >
                View all
              </Link>
            ) : (
              <span className="text-sm text-[var(--app-muted)]">—</span>
            )}
          </div>
          <ul className="divide-y divide-[var(--app-border)]">
            {recentProducts.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between gap-2 py-3 text-sm"
              >
                <div>
                  <p className="font-medium text-[var(--app-text)]">{p.name}</p>
                  <p className="text-xs text-[var(--app-muted)]">{p.category}</p>
                </div>
                <span className="text-[var(--app-muted)]">Stock {p.stock}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Package
  label: string
  value: string
  hint: string
}) {
  return (
    <div className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm text-[var(--app-muted)]">{label}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight text-[var(--app-text)]">
            {value}
          </p>
          <p className="mt-1 text-xs text-[var(--app-muted)]">{hint}</p>
        </div>
        <div className="rounded-xl bg-coral-100 p-2.5 text-coral-600 dark:bg-coral-950/50 dark:text-coral-300">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      </div>
    </div>
  )
}
