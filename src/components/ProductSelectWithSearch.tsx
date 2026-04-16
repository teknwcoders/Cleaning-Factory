import { Search } from 'lucide-react'
import type { ReactNode } from 'react'
import { useMemo, useRef, useState } from 'react'
import type { Product } from '../types'

function optionLabel(
  p: Product,
  showStock: boolean,
  stockLabelFormat: 'dash' | 'paren',
): string {
  if (!showStock) return p.name
  return stockLabelFormat === 'paren'
    ? `${p.name} (${p.stock})`
    : `${p.name} — stock ${p.stock}`
}

export function filterProductsByQuery(
  products: Product[],
  query: string,
): Product[] {
  const s = query.trim().toLowerCase()
  if (!s) return products
  return products.filter(
    (p) =>
      p.name.toLowerCase().includes(s) ||
      p.category.toLowerCase().includes(s),
  )
}

function pickableProducts(
  products: Product[],
  filtered: Product[],
  value: string,
): Product[] {
  const current = products.find((p) => p.id === value)
  if (current && !filtered.some((p) => p.id === value)) {
    return [current, ...filtered]
  }
  return filtered.length > 0 ? filtered : products
}

type Props = {
  products: Product[]
  value: string
  onChange: (productId: string) => void
  disabled?: boolean
  id?: string
  label: string
  /** When true, option text includes stock (e.g. sales). */
  showStock?: boolean
  /** How stock appears when `showStock` is true. */
  stockLabelFormat?: 'dash' | 'paren'
  variant?: 'default' | 'compact'
  hideLabel?: boolean
  selectClassName?: string
  searchPlaceholder?: string
  required?: boolean
  /** Rendered beside the product select (e.g. “Add to sale”). */
  afterSelect?: ReactNode
  /**
   * When `disabled` is true (e.g. view-only user), still allow typing in the
   * search box and using the Search button so the dropdown list can be filtered.
   * The product `<select>` stays disabled so the current line cannot be changed.
   */
  allowSearchWhileLocked?: boolean
}

export function ProductSelectWithSearch({
  products,
  value,
  onChange,
  disabled,
  id,
  label,
  showStock = false,
  stockLabelFormat = 'dash',
  variant = 'default',
  hideLabel = false,
  selectClassName,
  searchPlaceholder,
  required = false,
  afterSelect,
  allowSearchWhileLocked = false,
}: Props) {
  const [q, setQ] = useState('')
  const selectRef = useRef<HTMLSelectElement>(null)
  const selectDisabled = Boolean(disabled)
  const searchDisabled = Boolean(disabled && !allowSearchWhileLocked)
  const filtered = useMemo(
    () => filterProductsByQuery(products, q),
    [products, q],
  )
  const pickable = useMemo(
    () => pickableProducts(products, filtered, value),
    [products, filtered, value],
  )

  const isCompact = variant === 'compact'
  const inputCls = isCompact
    ? 'w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] py-1 pl-7 pr-2 text-[11px] text-[var(--app-text)] outline-none ring-coral-500/30 focus:ring-1'
    : 'w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] py-2 pl-9 pr-3 text-sm text-[var(--app-text)] outline-none ring-coral-500/30 focus:ring-2'
  const searchIconCls = isCompact
    ? 'pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--app-muted)]'
    : 'pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--app-muted)]'
  const btnCls = isCompact
    ? 'inline-flex shrink-0 items-center justify-center gap-1 rounded-lg border border-[var(--app-border)] bg-[var(--app-bg)] px-2 py-1 text-[10px] font-semibold text-[var(--app-text)] transition hover:bg-[var(--app-hover)] disabled:opacity-50'
    : 'inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm font-semibold text-[var(--app-text)] shadow-sm transition hover:bg-[var(--app-hover)] disabled:opacity-50'

  const defaultSelectCls = isCompact
    ? 'w-full rounded-lg border border-[var(--app-border)] bg-[var(--app-surface)] px-2 py-1.5 text-xs text-[var(--app-text)] outline-none'
    : 'w-full rounded-xl border border-[var(--app-border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--app-text)] outline-none ring-coral-500/30 focus:ring-2'

  return (
    <div className={isCompact ? 'min-w-0 flex-1 space-y-1' : 'space-y-2'}>
      {!hideLabel && (
        <label
          htmlFor={id}
          className="mb-1 block text-xs font-medium text-[var(--app-muted)]"
        >
          {label}
        </label>
      )}
      <div
        className={
          isCompact
            ? 'flex flex-col gap-1'
            : 'flex flex-col gap-2 sm:flex-row sm:items-stretch'
        }
      >
        <div className={`relative min-w-0 ${isCompact ? '' : 'sm:flex-1'}`}>
          <Search className={searchIconCls} aria-hidden />
          <input
            type="search"
            id={id ? `${id}-product-search` : undefined}
            autoComplete="off"
            className={inputCls}
            placeholder={searchPlaceholder ?? 'Search products…'}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            disabled={searchDisabled}
            aria-label="Filter products by name or category"
          />
        </div>
        <button
          type="button"
          disabled={searchDisabled}
          className={btnCls}
          onClick={() => {
            selectRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
            selectRef.current?.focus()
          }}
        >
          <Search className={isCompact ? 'h-3 w-3' : 'h-4 w-4'} aria-hidden />
          Search
        </button>
      </div>
      {afterSelect ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <select
            ref={selectRef}
            id={id}
            required={required}
            disabled={selectDisabled}
            className={`min-h-11 min-w-0 flex-1 sm:min-h-10 ${selectClassName ?? defaultSelectCls}`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          >
            {pickable.map((p) => (
              <option key={p.id} value={p.id}>
                {optionLabel(p, showStock, stockLabelFormat)}
              </option>
            ))}
          </select>
          {afterSelect}
        </div>
      ) : (
        <select
          ref={selectRef}
          id={id}
          required={required}
          disabled={selectDisabled}
          className={selectClassName ?? defaultSelectCls}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {pickable.map((p) => (
            <option key={p.id} value={p.id}>
              {optionLabel(p, showStock, stockLabelFormat)}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
