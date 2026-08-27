import type { Order } from '../types'

const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })
const day = new Intl.DateTimeFormat('en-GB', { dateStyle: 'long' })

export function OrderDrawer({ order, onClose }: { order: Order; onClose: () => void }) {
  return (
    <aside className="drawer" role="dialog" aria-modal="true" aria-labelledby="d-title">
      <header>
        <h2 id="d-title">{order.id}</h2>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">×</button>
      </header>
      <dl>
        <div><dt>Customer</dt><dd>{order.customer}</dd></div>
        <div><dt>Status</dt><dd><span className={`st st-${order.status}`}>{order.status}</span></dd></div>
        <div><dt>Total</dt><dd className="num">{gbp.format(order.total / 100)}</dd></div>
        <div><dt>Date</dt><dd>{day.format(new Date(order.date + 'T00:00:00'))}</dd></div>
      </dl>
    </aside>
  )
}
