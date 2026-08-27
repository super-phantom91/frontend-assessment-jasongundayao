import { useCallback, useMemo, useState, type KeyboardEvent } from 'react'
import { OrderDrawer } from './components/OrderDrawer'
import { OrderRow } from './components/OrderRow'
import { ORDERS } from './data'
import { setQuery, toggleStatus, useFilters } from './lib/url'
import { STATUSES } from './types'

export default function App() {
  const { q, statuses } = useFilters()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const rows = useMemo(() => {
    const needle = q.trim().toUpperCase()
    return ORDERS.filter((o) => {
      if (needle && !o.id.includes(needle)) return false
      if (statuses.length && !statuses.includes(o.status)) return false
      return true
    })
  }, [q, statuses])

  const selected = selectedId ? ORDERS.find((o) => o.id === selectedId) : undefined
  const onSelect = useCallback((id: string) => {
    setSelectedId(id)
    setOpen(true)
  }, [])
  const close = useCallback(() => {
    setOpen(false)
    if (selectedId) document.getElementById(selectedId)?.focus()
  }, [selectedId])

  function move(delta: number) {
    if (!rows.length) return
    const i = selectedId ? rows.findIndex((o) => o.id === selectedId) : -1
    const from = i < 0 ? (delta > 0 ? -1 : rows.length) : i
    const next = rows[Math.min(Math.max(from + delta, 0), rows.length - 1)]
    setSelectedId(next.id)
    const el = document.getElementById(next.id)
    el?.scrollIntoView({ block: 'nearest' })
    el?.focus()
  }

  function onKeyDown(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement).tagName
    const inField = tag === 'INPUT' || tag === 'BUTTON'
    if (e.key === 'Escape' && open) {
      e.preventDefault()
      close()
      return
    }
    if (inField) return
    if (e.key === 'ArrowDown') { e.preventDefault(); move(1) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); move(-1) }
    else if (e.key === 'Enter' && selectedId) { e.preventDefault(); setOpen(true) }
  }

  const printLabel = [q && `order ${q}`, statuses.length ? statuses.join(', ') : 'all statuses']
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="shell" onKeyDown={onKeyDown}>
      <header className="toolbar">
        <div className="brand">
          <h1>Orders</h1>
          <p>{rows.length.toLocaleString('en-GB')} of {ORDERS.length.toLocaleString('en-GB')}</p>
        </div>
        <label className="search">
          <span className="sr-only">Search by order number</span>
          <input value={q} onChange={(e) => setQuery(e.target.value)} placeholder="Search order number" autoComplete="off" spellCheck={false} />
        </label>
        <fieldset className="statuses">
          <legend className="sr-only">Status</legend>
          {STATUSES.map((s) => (
            <label key={s} className={statuses.includes(s) ? 'on' : undefined}>
              <input type="checkbox" checked={statuses.includes(s)} onChange={() => toggleStatus(s)} />
              {s}
            </label>
          ))}
        </fieldset>
      </header>
      <p className="print-banner">Orders · {printLabel} · {rows.length} rows</p>
      <div className="table-wrap" tabIndex={0} aria-label="Order list">
        <table>
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Status</th>
              <th className="num">Total</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((order) => (
              <OrderRow key={order.id} order={order} selected={order.id === selectedId} onSelect={onSelect} />
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="empty">No orders match this filter.</p>}
      </div>
      {open && selected && (
        <>
          <button type="button" className="backdrop" aria-label="Close panel" onClick={close} />
          <OrderDrawer order={selected} onClose={close} />
        </>
      )}
      <p className="hint">↑↓ Select · Enter Open · Esc Close</p>
    </div>
  )
}
