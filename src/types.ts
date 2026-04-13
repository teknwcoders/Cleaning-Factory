export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock'

export type Product = {
  id: string
  name: string
  category: string
  price: number
  stock: number
}

export type Customer = {
  id: string
  name: string
  phone: string
  /** City, address, or region */
  location: string
}

export type SaleLine = {
  productId: string
  quantity: number
  unitPrice: number
}

/** One sale order — may include multiple products (lines). */
export type Sale = {
  id: string
  customerId: string
  date: string
  lines: SaleLine[]
}

export function saleLineTotal(line: SaleLine): number {
  return line.quantity * line.unitPrice
}

export function saleOrderTotal(sale: Sale): number {
  return sale.lines.reduce((a, l) => a + saleLineTotal(l), 0)
}

export type Purchase = {
  id: string
  supplier: string
  productId: string
  quantity: number
  cost: number
  date: string
}

export type ProductionEntry = {
  id: string
  productId: string
  quantity: number
  date: string
  notes: string
}

export type AppNotification = {
  id: string
  message: string
  createdAt: string
  read: boolean
}

export const LOW_STOCK_THRESHOLD = 15

export function stockStatus(stock: number): StockStatus {
  if (stock <= 0) return 'out_of_stock'
  if (stock < LOW_STOCK_THRESHOLD) return 'low_stock'
  return 'in_stock'
}
