# Constraint 2 proof

The first implementation already had no wasted row renders. There is no “before optimisation” recording: `OrderRow` was memoised from the start, with stable `Order` object identity and a stable `onSelect`. This folder is that working version.

## Method

Each `OrderRow` increments a module-level counter and writes it to `data-renders` on the `<tr>`. You can inspect that attribute in DevTools on any row.

The probe query is `ORD`. Every generated order number starts with those three letters, so all 5,000 rows stay mounted. If memo failed, every row’s count would rise on the keystroke.

## Numbers (same keystroke)

| | `#ORD-00001` `data-renders` | rows in DOM |
|---|---|---|
| Before typing | **2** | 5,000 |
| After typing `ORD` | **2** | 5,000 |

Unchanged. Constraint 2 holds.

The count starts at 2 because React `StrictMode` mounts twice in development. That is not a keystroke render.

Screenshots: `01-before-keystroke.png`, `02-after-keystroke.png` (overlay states the same numbers).

## Related checks

- `03-drawer.png` — row click opens the side panel.
- `04-status-filter.png` — multi status in the URL (`?s=PICKING`), 1,250 of 5,000.
- `05-print-css.png` — print media hides chrome and still contains every filtered row (1,250 `<tr>`, not the viewport). That is constraint 1.
