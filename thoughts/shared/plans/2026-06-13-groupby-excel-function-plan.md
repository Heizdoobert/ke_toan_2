# Plan: Group By Excel-like Function

## Overview
Enhance the "Calculate & Group By Duplicate" feature to support multiple aggregation functions (SUM, COUNT, AVERAGE, MIN, MAX) like Excel's GROUPBY, instead of hardcoded SUM only.

## Task List

### Task 1: Type definitions
**Files:** `src/types/schema.ts`, `src/types/index.ts`
- Add `AggregationFunction = 'sum' | 'count' | 'average' | 'min' | 'max'` exported type
- Add `groupByFunction: AggregationFunction` to `ReconciliationSchema`
- Verify: `npx tsc --noEmit`

### Task 2: Schema default in context
**Files:** `src/context/ReconciliationContext.tsx`
- Add `groupByFunction: 'sum'` to initial schema state
- Verify: `npx tsc --noEmit`

### Task 3: Aggregation logic — multi-function support
**Files:** `src/utils/aggregate.ts`
- Add `aggFunction: AggregationFunction` parameter to `handleAggregateGroupBy`
- Implement switch case: sum (current), count, average, min, max
- Keep `_Grouped_Rows_Count` metadata
- Verify: `npx tsc --noEmit`

### Task 4: Tests for aggregation functions
**Files:** `src/__tests__/aggregate.test.ts` (new)
- Test each function (sum, count, average, min, max) with known input/output
- Edge cases: empty arrays, single row, non-numeric values
- Verify: `npx vitest run` (all tests pass)

### Task 5: Wire schema through reconciler
**Files:** `src/utils/reconciler.ts`
- Extract `groupByFunction` from schema alongside `groupByEnabled`
- Pass it to `handleAggregateGroupBy` calls
- Verify: `npx tsc --noEmit`, `npx vitest run`

### Task 6: UI — SetupPanel function selector
**Files:** `src/components/SetupPanel.tsx`
- Add function selector dropdown next to group-by toggle
- Visible only when groupBy is enabled
- Update description text to show selected function
- Wire to schema update
- Verify: `npx tsc --noEmit`, `npx vite build`

### Task 7: Standalone app — view.js function selector
**Files:** `localhost-project/public/js/view.js`
- Add function selector dropdown in group-by section
- Wire change event to schema update
- Verify: no build step needed (vanilla JS)

### Task 8: Standalone app — controller.js multi-function aggregation
**Files:** `localhost-project/public/js/controller.js`
- Add `aggFunction` parameter to `aggregateDataGroup()`
- Implement switch case for each function
- Pass function from schema in `runReconciliation()`
- Verify: no build step needed

### Task 9: Standalone app — app.js save/restore + wire
**Files:** `localhost-project/public/js/app.js`
- Include `groupByFunction` in Database save/restore
- Pass to controller on reconciliation run
- Handle old cached data (no groupByFunction → default 'sum')
- Verify: no build step needed

### Task 10: useSchema hook — backward compat
**Files:** `src/hooks/useSchema.ts`
- Handle old cached schema without `groupByFunction` (default to 'sum')
- Verify: `npx tsc --noEmit`

## Verification
1. `npx tsc --noEmit` — 0 errors
2. `npx vitest run` — all tests pass (existing 6 + new aggregate tests)
3. `npx vite build` — builds successfully
