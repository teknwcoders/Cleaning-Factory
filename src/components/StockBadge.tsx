import clsx from 'clsx'
import type { StockStatus } from '../types'

const labels: Record<StockStatus, string> = {
  in_stock: 'In stock',
  low_stock: 'Low stock',
  out_of_stock: 'Out of stock',
}

const styles: Record<StockStatus, string> = {
  in_stock:
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  low_stock:
    'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200',
  out_of_stock:
    'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
}

export function StockBadge({ status }: { status: StockStatus }) {
  return (
    <span
      className={clsx(
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
        styles[status],
      )}
    >
      {labels[status]}
    </span>
  )
}
