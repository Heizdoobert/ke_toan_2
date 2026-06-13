---
date: 2025-03-15
topic: "Auto-Format Date Columns to dd/mm/YYYY on Upload"
status: validated
---

## Problem Statement

When users upload Excel or CSV files containing date columns, values can appear as raw Excel serial numbers (e.g., `45000`) or compact digit strings (e.g., `"20260315"`, `"15032026"`) instead of human-readable `dd/mm/yyyy` dates. Users must manually edit each cell to fix the format.

## Constraints

- Must work in both React app (`src/`) and standalone Express app (`localhost-project/`)
- All existing tests (17) must pass
- `npx tsc --noEmit` must pass, `npx vite build` must succeed
- No new dependencies
- Column detection must be case-insensitive
- Only columns with "ngày" or "Date" in header are affected — other columns pass through unchanged
- Already-formatted dates (containing `/` or `-`) must be left as-is

## Approach

Add a post-parse transformation step that runs after `extractCleanTransactionalData` (React) / `extractCleanTransactionalBlock` (standalone) and before data is stored in state/model. This keeps the date formatting concern separate from the parsing logic.

**Chosen approach:** Single utility function in `parser.ts` (React) and `model.js` (standalone) that:
1. Scans headers for columns matching `/ngày|date/i`
2. For matched columns, converts each cell value to `dd/mm/yyyy` string
3. Returns the transformed rows

**Rejected alternatives:**
- **Normalize at display time** — Would need DataGrid changes and wouldn't fix the raw data for reconciliation
- **Modify SheetJS options** — SheetJS `{ raw: false }` can format dates but is unreliable and only works for Excel, not CSV
- **Schema-level format option** — Over-engineered for this use case (YAGNI)

## Architecture

### Data flow

```
Upload/Ctrl+V input
    ↓
parseTransactionalSpreadsheet (React) / FileReader (standalone)
    ↓
extractCleanTransactionalData (React) / extractCleanTransactionalBlock (standalone)
    ↓ ← NEW: formatDateColumnsDDMMYYYY (React) / convertDateColumnsToDDMMYYYY (standalone)
setSourceA/B (React) / this.sourceA/B (standalone)
    ↓
DataGrid renders dd/mm/yyyy values
```

### Column detection

```typescript
headers.filter(h => /ngày|date/i.test(h))
```

### Conversion logic

| Input type | Detection rule | Output example |
|---|---|---|
| Excel serial number | `typeof val === "number" && val >= 35000 && val <= 70000` | `15/03/2026` |
| YYYYMMDD string | `/^(19\|20)\d{2}(0[1-9]\|1[0-2])(0[1-9]\|[12]\d\|3[01])$/` | `15/03/2026` |
| DDMMYYYY string | `/^(0[1-9]\|[12]\d\|3[01])(0[1-9]\|1[0-2])(19\|20)\d{2}$/` | `15/03/2026` |
| Already formatted | Contains `/` or `-` | Leave as-is |
| Other values | No match | Leave as-is |

## Components

### React app

- **`formatDateColumnsDDMMYYYY(headers, rows)`** in `src/utils/parser.ts`
  - New exported function
  - Pure function — no side effects
  - Returns `Record<string, any>[]` (transformed rows)
  - Accepts headers array and rows array
  - Detects date columns by header match, converts values in-place

- **Update `handleFileUpload` in `src/hooks/useFileUpload.ts`**
  - Call new function after `extractCleanTransactionalData` (lines 78, 105)
  - Store result for further processing

- **Update `handlePasteImport` in `src/hooks/useFileUpload.ts`**
  - Call new function after paste parsing (before `setSourceA/B`)

### Standalone app

- **`convertDateColumnsToDDMMYYYY(headers, rows)`** in `model.js`
  - New method on Model class
  - Same logic as React version but as vanilla JS
  - Returns transformed rows array

- **Update `parseFiles` in `model.js`**
  - Call method after `extractCleanTransactionalBlock` (line 88)

- **Update `parsePasteInput` in `model.js`**
  - Call method after paste parsing (before `this.sourceA/B` assignment, line 43)

## Data Flow

1. User uploads Excel file with column headers like `"Ngày CT"`, `"Ngày ghi sổ"`, or `"Date"`
2. SheetJS reads raw cell values — serial numbers for dates, strings for others
3. `extractCleanTransactionalData` cleans rows
4. **NEW step**: `formatDateColumnsDDMMYYYY` detects date columns by header match
5. For detected columns, serial numbers → `"15/06/2026"`, YYYYMMDD → `"15/06/2026"`, etc.
6. Data is stored in context/model with human-readable dates
7. DataGrid and reconciliation report show `dd/mm/yyyy` format

## Error Handling

- Invalid serial numbers (out of 35000-70000 range) — left as-is
- Unparseable compact strings — left as-is
- Columns with no date keywords in header — completely untouched
- Non-date values in date columns — left as-is (e.g., text notes in date column)

## Testing Strategy

### Unit tests (React app)
- `formatDateColumnsDDMMYYYY` with Excel serial number input → expects dd/mm/yyyy string
- `formatDateColumnsDDMMYYYY` with YYYYMMDD string → expects dd/mm/yyyy
- `formatDateColumnsDDMMYYYY` with DDMMYYYY string → expects dd/mm/yyyy
- `formatDateColumnsDDMMYYYY` with already-formatted date → leaves unchanged
- `formatDateColumnsDDMMYYYY` with non-date column → no changes
- `formatDateColumnsDDMMYYYY` with empty array → returns empty
- `formatDateColumnsDDMMYYYY` with column matching "ngày" → converts
- `formatDateColumnsDDMMYYYY` with column matching "Date" → converts
- `formatDateColumnsDDMMYYYY` with mixed date/non-date columns → only date columns affected

### Integration tests
- Full upload pipeline: mock `FileReader` → parse → format → verify dates in output

## Open Questions

- Should we convert dates that are already in `dd-mm-yyyy` format (hyphens) to `dd/mm/yyyy` (slashes)? Decision: Leave as-is — the normalization step handles hyphen dates for comparison matching.
- What about edge case where `ngày` appears in a non-date column value (e.g., "Số ngày" meaning "number of days")? The detection is on HEADER name, not values. If "Số ngày" is a header, it would be treated as a date column and may inappropriately convert numeric values. Mitigation: Only detect headers that specifically contain "ngày" with typical date column context.
