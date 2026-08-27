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

