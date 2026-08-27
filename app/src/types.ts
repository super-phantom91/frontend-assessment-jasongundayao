export const STATUSES = ['NEW', 'PICKING', 'SHIPPED', 'CANCELLED'] as const
export type Status = (typeof STATUSES)[number]
export type Order = {
  id: string
  customer: string
  status: Status
  total: number
  date: string
}
export type Filters = { q: string; statuses: Status[] }
