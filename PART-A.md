# Frontend Developer — Pre-Screening Assessment (Part A)

**Position applied for:** Frontend Developer

---

## Section 1 — Code

### Q1

The explanation is wrong on three facts. React.memo does a shallow compare (Object.is per prop), not a deep one. Nested objects are not walked, so “the deep compare fails on nested objects” is invented. Memo is not broken: a new columns array fails the shallow check, so the skip is correctly declined.

Wrapping columns in useMemo will stop these row renders only if every other prop is also referentially stable and the memoised columns keep stable inner identities. It will not work if onClick / onSort / style are created inline, if useMemo dependencies change on every keystroke, or if the parent creates new row objects each render.

Two other props that independently defeat memo are an inline onSelect function and an inline style object.

The actual cause of the re-render is search state updating the parent. Unstable props only make that update expensive.

### Q2

**Defects, ranked**

1. **Failed mutation leaves a lie in the cache.** `patch.undo()` is never called. The catch swallows the error. Static `invalidatesTags: ['Product']` runs on success only, not on error, so nothing refetches. If the `{}` cache entry exists, the user sees the new status after a failure; a reload puts the old value back. Operations will act on a status the server rejected. That is first because it is silent corruption, not a delay.

2. **Optimistic write targets the wrong cache key.** `updateQueryData('getProducts', {} as ProductFilters, …)` patches only the query whose argument is `{}`. Any filtered list the user is actually looking at is untouched. They click, the row does not move, then a successful mutation’s invalidation refetches and it jumps. Happens whenever `getProducts` was last fetched with non-empty filters.

3. **Successful mutation refetches every `Product` list.** `providesTags: ['Product']` plus list-level invalidation reloads every cached products query. The row already changed (if defect 2 did not apply); then the table flashes, scroll is lost, in-progress typing in the search box can fight the refetch. Data ends up right. Severity is UX, not wrongness.

**False comment.** `// ignore - the invalidation will refetch anyway` is false. Invalidation does not run on a rejected mutation, and even on success it refetches tag subscribers — it does not repair a cache entry that was never patched, nor does it replace `undo()`.

**Looks wrong, is fine.** Mutating `row.status` on `draft` looks like an illegal store mutation. RTK Query runs that callback through Immer; the mutation is the supported way to write the patch.

### Q3

```tsx
export const SupplierBadge = memo(function SupplierBadge({
  supplierId,
}: {
  supplierId: string
}) {
  const { data, isLoading, isError } = useGetSupplierQuery(supplierId)
  if (isLoading) return <Skeleton className="h-5 w-24" />
  if (isError) return null
  return (
    <span className="rounded bg-muted px-2 py-0.5 text-xs">
      {data?.name?.toUpperCase() ?? ''}
    </span>
  )
})
```

Removed:

- **`useState` + `useEffect` copying `data.name`.** That is the cross-row bug. Sequence: the instance at a table position has loaded supplier A, so `name` is `"ACME"`. The parent reuses the instance for supplier B (index keys, or the same cell receiving a new id). B is already in the RTK cache, so `isLoading` is false and `data` is B on the first render, but `name` is still `"ACME"`. The badge paints A’s name on B’s row until the effect runs. Reading `data` during render removes that frame. The `if (data?.name)` guard also refuses to clear `name`, so an empty name would keep showing the previous supplier.
- **`useMemo` on `toUpperCase`.** It hides a cheap derivation behind a hook and does not help `memo` skip; it only adds a dependency to get wrong.
- **The `useSupplierName` wrapper.** It existed to hold the copied state. Once that state is gone, the wrapper only conceals a query subscriber.

`memo` stays: it is not the bug, and it still skips parent-driven re-renders when `supplierId` is unchanged.

**Unsolved at 200 rows:** one `useGetSupplierQuery` per row, so up to 200 HTTP calls (cache only dedupes identical ids). The real fix is the data layer: put `supplierName` on the list DTO, or a batched `getSuppliersByIds`. Not this component.

### Q4

1. Painted: `idle` → `saving` → `idle`.
2. `'saved'` is assigned after `unwrap()` and never painted. React 18 batches the two `setLabel` calls in the promise continuation into one render; the later call wins. `'done'` is never assigned: `label` in the closure is still `'idle'`, so the ternary takes the else branch and writes `'idle'`.
3. Final painted value: `idle`. The user has lost success feedback. The control looks as if the click did nothing; they will click again.
4. Smallest fix: delete the last `setLabel(...)` line.

---

## Section 2 — Design and judgement

### Q5

The HTTP layer parses the envelope once and returns a discriminant that does not contain `null` data on the success branch. Components never see `{ data, meta, error }`.

```ts
type Meta = { page: number; pageSize: number; total: number }

type ErrorCode =
  | 'SUPPLIER_LOCKED'
  | 'STOCK_NEGATIVE'
  | 'IMPORT_IN_PROGRESS'
  | 'VALIDATION_FAILED'
  | 'RATE_LIMITED'

type KnownError =
  | { code: 'VALIDATION_FAILED'; message: string; field?: string }
  | { code: Exclude<ErrorCode, 'VALIDATION_FAILED'>; message: string }

type UnknownError = { code: 'UNKNOWN'; message: string; rawCode: string }
type AppError = KnownError | UnknownError

type ApiResult<T> =
  | { ok: true; data: T; meta: Meta }
  | { ok: false; error: AppError }

type ErrorSink = {
  field?: (field: string, message: string) => void
  toast?: (message: string) => void
}

declare function request<T>(url: string, init?: RequestInit): Promise<ApiResult<T>>
declare function handleError(error: AppError, sink: ErrorSink): void

type QueryState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T; meta: Meta }
  | { status: 'error'; error: AppError }

declare function useApiQuery<T>(path: string): QueryState<T>
declare function useApiMutation<TIn, TOut>(path: string, sink: ErrorSink): {
  mutate: (body: TIn) => Promise<TOut>
  isPending: boolean
}
```

Form: `useApiMutation(path, { field: form.setError, toast: form.setRootError })`. Table: `{ toast }`. Poll: `{}`.

1. `request` maps `{ data, error: null }` to `{ ok: true, data, meta }`. After `if (!result.ok) return`, `result.data` is `T`. The envelope’s `data: T | null` does not leak.
2. `handleError` switches on `KnownError['code']` and uses `const _x: never = error` in the default. A new `ErrorCode` member makes that assignment fail at compile time.
3. The parser is not that switch. If `code` is not in the union, it returns `{ code: 'UNKNOWN', message, rawCode }` and the sink still runs (`toast` / form root). The message is not dropped. (2) is exhaustiveness for codes we compile against; (3) is a runtime fallback for codes we do not.
4. `error.field` will not match form names. `setError(apiField)` attaches to nothing; the user sees a dead submit. Fix it in the form adapter: a map of API name → form name, and if there is no entry, `setError('root', message)` so the text still appears. Not in `request`.

### Q6

Reject.

Virtualising the table keeps only the viewport in the DOM. Ctrl-P then prints the ~20 on-screen rows, not the filtered 3,000. The sheet on the warehouse clipboard is an incomplete pick list; that is an operational failure, not a cosmetic one. Ctrl-F also searches only the DOM, so finding an order number before print silently misses rows. Both breakages hit the warehouse team who already use those two shortcuts.

I would not add `@tanstack/react-virtual`. The six-second delay is almost certainly per-row JS (unstable props, N queries per row, heavy cells), not 3,000 `<tr>`s. Profile, memoize rows, stop fetching per cell, simplify the row. Cost: a day or two, no new dependency, print and find still work.

If it is still slow after that, paginate the screen and add an explicit print view that renders the full filtered set. Cost: a print route plus telling the floor that Ctrl-P from the paginated screen is no longer the path. Only do that if profiling says the DOM itself is the limit.

### Q7

**(b).**

A supplier demo that eats the form they just typed looks broken in front of them. They will not trust the rest of the walkthrough. A four-second freeze on the products table is ugly; it is survivable if we open that tab before the call and do not remount it.

What stays broken: 12,000 rows still stall the tab on a cold load. We do not virtualise this week.

To the person who wanted (a): the table is still slow; it is next. I will not spend the last two days on a performance win while three forms still throw away the user’s work in a live demo. Pre-load the products tab. We pick it up the morning after.

### Q8

**Pairs that cannot both be true**

1. **(2) and (3).** Select-all includes ids not yet loaded. Listing every SKU requires those SKUs; fetching them contradicts (2). A 10,000-row dialog is also unusable.
2. **(2) and (4).** The matching set can exceed 500 ids. One request cannot take that list.
3. **(4) and (5).** Two 500-id calls are two transactions. If the second fails, the first has committed. Client chunking is not atomic unless the server owns one job.
4. **(5) and (6).** Atomic means all or nothing. “N succeeded, M failed” is a partial update, which (5) forbids.
5. **(1) and (2).** (1) is an id set that survives filter changes. (2) is “whatever matches the current filter.” After a filter change those are not the same selection.

**Keep / ticket / question**

- **(2)+(3):** Keep confirm for known ids. Ticket: drop “not loaded”; show count + first 50 SKUs. Ask: if 8,000 match, every SKU on screen, or count plus CSV?
- **(2)+(4):** Keep the 500 cap. Ticket: refuse, first 500, or a server job. Ask: which?
- **(4)+(5):** Ticket: atomicity is a server job (filter, not ids) or we drop it. Ask: will backend take one atomic job?
- **(5)+(6):** Ticket: atomic job → all/none toast; or batched calls → partial toast. Ask: guarantee, or a count?
- **(1)+(2):** Keep clicked-row persistence. Ticket: select-all means loaded rows. Ask: after a filter change, do old ticks remain?

**Unchanged:** two — **(1)** and **(4)**.

---