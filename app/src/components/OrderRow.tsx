import { memo } from 'react'
import type { Order } from '../types'

const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })
const day = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
const renderCounts = new Map<string, number>()

type Props = { order: Order; selected: boolean; onSelect: (id: string) => void }

export const OrderRow = memo(function OrderRow({ order, selected, onSelect }: Props) {
  const n = (renderCounts.get(order.id) ?? 0) + 1
  renderCounts.set(order.id, n)
  return (
    <tr
      id={order.id}
      tabIndex={-1}
      aria-selected={selected}
      data-renders={n}
      className={selected ? 'is-selected' : undefined}
      onClick={(e) => {
        e.currentTarget.focus()
        onSelect(order.id)
      }}
    >
      <td className="mono">{order.id}</td>
      <td>{order.customer}</td>
      <td><span className={`st st-${order.status}`}>{order.status}</span></td>
      <td className="num">{gbp.format(order.total / 100)}</td>
      <td>{day.format(new Date(order.date + 'T00:00:00'))}</td>
    </tr>
  )
})
