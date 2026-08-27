# NOTES

Line budget excludes `src/data.ts` and Vite scaffolding. Own code is under 300 lines.

## Constraints 1 and 2 together

Every filtered row stays in the document. `@media print` hides the toolbar and drawer; the table is `overflow: visible` and `break-inside: avoid` on rows. Ctrl-P therefore prints the filtered set, not the viewport, and Ctrl-F can find any visible order number.

That forbids windowing. I did not virtualise. Constraint 2 is then a React problem, not a DOM one: `OrderRow` is `memo`, the 5,000 `Order` objects are created once at module load (stable identity), and `onSelect` is `useCallback` with `[]`. Typing a query that still matches a row (every order id starts `ORD-`) re-renders the shell; `data-renders` on an unchanged row does not increment. Evidence is in `evidence/`.

**Gave up:** a virtualised list’s cheap scroll, and any table library. First paint walks 5,000 fibres. That is the print trade.

## Library

None. Constraint 5 allows one table/list library. `@tanstack/react-virtual` would break print and find-in-page. `@tanstack/react-table` would spend the line budget on sorting we were not asked for. A native `<table>` is the tool that satisfies 1 and 2 together.

## Three decisions

1. **URL via `useSyncExternalStore` + `history`, not `useEffect` and not Next.js.** Rejected: `useEffect` on `popstate`. That would work, and would be correct if the brief allowed an effect I could justify; I did not need one. Rejected Next.js `searchParams` because this is one screen and the extra tree is scaffolding, not product.

2. **`replaceState` for the search box, `pushState` for status.** Rejected: `pushState` on every keystroke. That would be correct if Back should undo each letter. Here Back should undo a status tick, not `ORD` → `OR` → `O`.

3. **Civil dates as `YYYY-MM-DD` + `'T00:00:00'`, not `new Date(isoDate)`.** Rejected: `new Date('2024-03-01')`. That would be correct for an instant. For a date-only field it shifts the calendar day west of UTC (see Part A Q12).

## Not finished

I did not attach a React DevTools `.json` export. The first implementation already had no wasted row renders; `evidence/` has screenshots and the `data-renders` counts for the same keystroke, which is what the brief allows. I did not add row virtualisation, pagination, or sort — all would fight constraint 1 or the line budget.
