---
date: 2026-06-13
topic: "Group By Excel-like Function Enhancement"
status: validated
---

## Problem Statement

The current "Group By Duplicates" feature is a bare boolean toggle that only hardcodes SUM aggregation. It loses detail data permanently, gives zero visibility into what was aggregated, and doesn't let users choose the aggregation function. Users need Excel-like GROUPBY behavior: multiple aggregation functions (SUM, COUNT, AVERAGE, MIN, MAX) with clear subtotal visibility.

## Constraints

- Must work in both React app (src/) and standalone Express app (localhost-project/)
- Core reconciliation hash-map algorithm stays unchanged
- Schema backward compatibility (old schemas without groupByFunction field default to 'sum')
- All existing tests must pass
- Can't introduce new dependencies

## Approach

Treat "like Excel" as Excel's GROUPBY function + Subtotal outline behavior:

| Excel Feature | Our Implementation |
|---|---|
| Choose aggregation function | Dropdown selector (SUM/COUNT/AVERAGE/MIN/MAX) |
| Subtotal rows per group | Group header rows in grid with aggregate value |
| Detail data trackable | `_Grouped_Rows_Count` metadata column |
| Function per grouping | Single function applied to all numeric target columns |

Chosen over alternatives:
- **PivotTable approach** rejected — too complex, overkill for reconciliation
- **Collapsible groups** deferred — nice-to-have but adds significant UI complexity; current aggregated view suffices
- **Per-column function selection** rejected — YAGNI, single function for all numeric cols matches Excel GROUPBY semantics

## Architecture

### Type Changes

Add to `ReconciliationSchema`:
- `groupByFunction: 'sum' | 'count' | 'average' | 'min' | 'max'`

Default: `'sum'` (backward compatible).

### Component Changes

**SetupPanel.tsx** — replace group-by toggle with:
- Toggle switch (enable/disable)
- Function selector dropdown (visible only when enabled)
- Updated description text showing selected function

**aggregate.ts** — refactor `handleAggregateGroupBy`:
- Add `aggFunction` parameter
- Switch on function type for each group's numeric column calculation
- Keep `_Grouped_Rows_Count` metadata

**reconciler.ts** — pass `groupByFunction` from schema through to aggregate

**ReconciliationContext.tsx** — default `groupByFunction: 'sum'`

**view.js (standalone)** — same dropdown + toggle UI

**controller.js (standalone)** — same multi-function aggregation logic

**app.js (standalone)** — save/restore `groupByFunction` in Database

### Aggregation Logic Per Function

| Function | Per-Group Calculation |
|---|---|
| `sum` | Add all values (current behavior) |
| `count` | Count non-null values |
| `average` | Sum / Count |
| `min` | Minimum value |
| `max` | Maximum value |

## Data Flow

1. User enables group-by + selects function in SetupPanel
2. Schema updated via context → persisted to localStorage
3. Before reconciliation, `handleAggregateGroupBy(rows, keys, numericCols, aggFunction)` processes each source
4. Aggregated rows fed into hash-map reconciliation loop
5. Results displayed in audit report with `_Grouped_Rows_Count` showing how many original rows were grouped

## Error Handling

- If no numeric comparison columns selected, group-by toggle is disabled
- Non-numeric values in numeric columns → treated as 0 for sum/average, skipped for count
- Old cached schema without `groupByFunction` → defaults to `'sum'` via optional chaining
- Edge case: empty group → not possible since group keys always come from existing rows

## Testing Strategy

New unit tests for `aggregate.ts`:
- Each function (sum, count, average, min, max) with known input/output
- Edge cases: empty arrays, single row, non-numeric values mixed in
- Compatibility: old schema without groupByFunction field

Existing tests must still pass unchanged (6/6).

## Open Questions

None resolved — design is complete.
