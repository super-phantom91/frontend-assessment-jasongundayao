import { useSyncExternalStore } from 'react'
import { STATUSES, type Filters, type Status } from '../types'

const isStatus = (s: string): s is Status => (STATUSES as readonly string[]).includes(s)

export function parseSearch(search: string): Filters {
  const p = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  return { q: p.get('q') ?? '', statuses: (p.get('s') ?? '').split(',').filter(isStatus) }
}

function serialize({ q, statuses }: Filters) {
  const p = new URLSearchParams()
  if (q) p.set('q', q)
  if (statuses.length) p.set('s', statuses.join(','))
  const qs = p.toString()
  return qs ? `?${qs}` : window.location.pathname
}

let snapshot = window.location.search
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

window.addEventListener('popstate', () => {
  snapshot = window.location.search
  emit()
})

function write(next: Filters, push: boolean) {
  const url = serialize(next) || window.location.pathname
  if (push) history.pushState(null, '', url)
  else history.replaceState(null, '', url)
  snapshot = window.location.search
  emit()
}

export const setQuery = (q: string) => write({ ...parseSearch(snapshot), q }, false)
export function toggleStatus(status: Status) {
  const { q, statuses } = parseSearch(snapshot)
  const next = statuses.includes(status) ? statuses.filter((s) => s !== status) : [...statuses, status]
  write({ q, statuses: next }, true)
}

export function useFilters(): Filters {
  const search = useSyncExternalStore(
    (cb) => (listeners.add(cb), () => listeners.delete(cb)),
    () => snapshot,
    () => '',
  )
  return parseSearch(search)
}
