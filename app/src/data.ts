import { STATUSES, type Order } from './types'

const CUSTOMERS = [
  'Northline Logistics',
  'Harbour & Oak',
  'Plymstock Retail',
  'Ashford Cold Chain',
  'Meridian Grocery',
  'Kestrel Wholesale',
  'Barrow & Field',
  'Lumen Pharmacy Group',
  'Stourbridge Hardware',
  'Whitecross Foods',
  'Calder Components',
  'Ridgeway Auto Parts',
] as const

/** Deterministic 5,000-row catalogue. Stable object identity for the life of the page. */
export function generateOrders(count: number): Order[] {
  const start = Date.UTC(2024, 0, 1)
  const orders: Order[] = new Array(count)
  for (let i = 0; i < count; i++) {
    orders[i] = {
      id: `ORD-${String(i + 1).padStart(5, '0')}`,
      customer: CUSTOMERS[i % CUSTOMERS.length],
      status: STATUSES[i % STATUSES.length],
      total: 1250 + ((i * 7919) % 248_500),
      date: new Date(start + (i % 700) * 86_400_000).toISOString().slice(0, 10),
    }
  }
  return orders
}

export const ORDERS = generateOrders(5000)
