# Date Format Auto-Conversion Implementation Plan

> **For agentic workers:** Use subagent-driven development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Auto-format date columns to `dd/mm/yyyy` on data upload when column header contains "ngày" or "Date".

**Architecture:** Post-parse transformation step — a pure function in `parser.ts` (React) and a method in `model.js` (standalone) that runs after `extractCleanTransactionalData` / `extractCleanTransactionalBlock` and before data is stored in state/model. No new dependencies.

**Tech Stack:** TypeScript (React), vanilla JS (standalone), Vitest (tests)

---

### Task 1: Write tests for `formatDateColumnsDDMMYYYY`

**Files:**
- Create: `src/__tests__/parser.test.ts`

- [ ] **Step 1: Write the test file**

```typescript
import { describe, it, expect } from 'vitest';
import { formatDateColumnsDDMMYYYY } from '../utils/parser';

describe('formatDateColumnsDDMMYYYY', () => {
  it('converts Excel serial number to dd/mm/yyyy when header contains "ngày"', () => {
    const headers = ['Ngày CT', 'Amount'];
    const rows = [
      { 'Ngày CT': 45000, Amount: '1000' },
      { 'Ngày CT': 45001, Amount: '2000' },
    ];
    const result = formatDateColumnsDDMMYYYY(headers, rows);
    expect(result[0]['Ngày CT']).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(result[1]['Ngày CT']).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    // Amount column untouched
    expect(result[0]['Amount']).toBe('1000');
  });

  it('converts YYYYMMDD string to dd/mm/yyyy when header contains "Date"', () => {
    const headers = ['Date', 'Value'];
    const rows = [
      { Date: '20260315', Value: '100' },
      { Date: '20260601', Value: '200' },
    ];
    const result = formatDateColumnsDDMMYYYY(headers, rows);
    expect(result[0]['Date']).toBe('15/03/2026');
    expect(result[1]['Date']).toBe('01/06/2026');
  });

  it('converts DDMMYYYY string to dd/mm/yyyy', () => {
    const headers = ['Ngày ghi sổ', 'Amount'];
    const rows = [
      { 'Ngày ghi sổ': '15032026', Amount: '500' },
    ];
    const result = formatDateColumnsDDMMYYYY(headers, rows);
    expect(result[0]['Ngày ghi sổ']).toBe('15/03/2026');
  });

  it('leaves already-formatted dates unchanged', () => {
    const headers = ['Ngày', 'Amount'];
    const rows = [
      { Ngày: '15/06/2026', Amount: '100' },
      { Ngày: '2026-06-15', Amount: '200' },
    ];
    const result = formatDateColumnsDDMMYYYY(headers, rows);
    expect(result[0]['Ngày']).toBe('15/06/2026');
    expect(result[1]['Ngày']).toBe('2026-06-15');
  });

  it('leaves non-date columns untouched', () => {
    const headers = ['Name', 'Amount'];
    const rows = [{ Name: 'Foo', Amount: '100' }];
    const result = formatDateColumnsDDMMYYYY(headers, rows);
    expect(result[0]['Name']).toBe('Foo');
    expect(result[0]['Amount']).toBe('100');
  });

  it('handles empty rows array', () => {
    const headers = ['Ngày'];
    const result = formatDateColumnsDDMMYYYY(headers, []);
    expect(result).toEqual([]);
  });

  it('handles undefined and null values gracefully', () => {
    const headers = ['Ngày'];
    const rows = [{ Ngày: undefined }, { Ngày: null }];
    const result = formatDateColumnsDDMMYYYY(headers, rows);
    expect(result[0]['Ngày']).toBe('');
    expect(result[1]['Ngày']).toBe('');
  });

  it('only converts columns where header matches ngày|date', () => {
    const headers = ['Số ngày', 'Date', 'Name', 'Ngày hóa đơn'];
    const rows = [{
      'Số ngày': '15032026',
      'Date': 45000,
      'Name': 'Test',
      'Ngày hóa đơn': '20260315',
    }];
    const result = formatDateColumnsDDMMYYYY(headers, rows);
    // "Số ngày" contains "ngày" so it should be converted
    expect(result[0]['Số ngày']).toBe('15/03/2026');
    expect(result[0]['Date']).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(result[0]['Name']).toBe('Test');
    expect(result[0]['Ngày hóa đơn']).toBe('15/03/2026');
  });

  it('does not convert non-date values in date columns', () => {
    const headers = ['Ngày'];
    const rows = [{ Ngày: 'N/A' }, { Ngày: '123' }];
    const result = formatDateColumnsDDMMYYYY(headers, rows);
    expect(result[0]['Ngày']).toBe('N/A');
    expect(result[1]['Ngày']).toBe('123');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/__tests__/parser.test.ts 2>&1
```
Expected: Fails because `formatDateColumnsDDMMYYYY` is not exported from `parser.ts`

---

### Task 2: Implement `formatDateColumnsDDMMYYYY` in parser.ts

**Files:**
- Modify: `src/utils/parser.ts` (add function + export)

- [ ] **Step 1: Add the `formatDateColumnsDDMMYYYY` function**

Add at the end of `src/utils/parser.ts`, before the closing line:

```typescript
/**
 * Post-parse transformation: detect date columns by header name
 * (contains "ngày" or "Date", case-insensitive) and convert
 * Excel serial numbers, YYYYMMDD, and DDMMYYYY formats to dd/mm/yyyy.
 */
export function formatDateColumnsDDMMYYYY(
  headers: string[],
  rows: Record<string, any>[]
): Record<string, any>[] {
  if (!rows || rows.length === 0) return [];

  const dateColumnSet = new Set<string>();
  for (const h of headers) {
    if (/ngày|date/i.test(h)) {
      dateColumnSet.add(h);
    }
  }

  if (dateColumnSet.size === 0) return rows;

  return rows.map(row => {
    const newRow = { ...row };
    for (const col of dateColumnSet) {
      const val = newRow[col];
      if (val === undefined || val === null) {
        newRow[col] = '';
        continue;
      }

      // Case 1: Excel serial date number
      if (typeof val === 'number' && val >= 35000 && val <= 70000) {
        newRow[col] = serialToDDMMYYYY(val);
        continue;
      }

      const str = String(val).trim();
      if (!str) {
        newRow[col] = '';
        continue;
      }

      // Already formatted (has slash or hyphen) — leave as-is
      if (str.includes('/') || (str.includes('-') && str.length !== 8)) {
        continue;
      }

      // Case 2: YYYYMMDD (8 digits, starts with 19xx or 20xx)
      if (/^(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])$/.test(str)) {
        const y = str.slice(0, 4);
        const m = str.slice(4, 6);
        const d = str.slice(6, 8);
        newRow[col] = `${d}/${m}/${y}`;
        continue;
      }

      // Case 3: DDMMYYYY (8 digits, day 01-31, month 01-12)
      if (/^(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])(19|20)\d{2}$/.test(str)) {
        const d = str.slice(0, 2);
        const m = str.slice(2, 4);
        const y = str.slice(4, 8);
        newRow[col] = `${d}/${m}/${y}`;
        continue;
      }

      // Not a recognized date format — leave as-is
    }
    return newRow;
  });
}

function serialToDDMMYYYY(serial: number): string {
  if (serial < 1 || serial > 1000000) return String(serial);
  try {
    const utc_days = Math.floor(serial - 25569);
    const d = new Date(utc_days * 86400 * 1000);
    if (isNaN(d.getTime())) return String(serial);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return String(serial);
  }
}
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
npx vitest run src/__tests__/parser.test.ts 2>&1
```
Expected: All 9 tests PASS

- [ ] **Step 3: Run full test suite to ensure no regressions**

```bash
npx vitest run 2>&1
```
Expected: 17 + 9 = 26 tests PASS

---

### Task 3: Integrate into useFileUpload.ts

**Files:**
- Modify: `src/hooks/useFileUpload.ts`

- [ ] **Step 1: Add import for `formatDateColumnsDDMMYYYY`**

Replace the import line at the top:

```typescript
import { extractCleanTransactionalData } from '../utils/parser';
```
→
```typescript
import { extractCleanTransactionalData, formatDateColumnsDDMMYYYY } from '../utils/parser';
```

- [ ] **Step 2: Add call in `handleFileUpload` after each `extractCleanTransactionalData`**

In `handleFileUpload`, after lines 74-77 (CSV path) and lines 101-104 (Excel path), add the date conversion. Both `const clean = extractCleanTransactionalData(...)` calls should be followed by:

```typescript
clean.rows = formatDateColumnsDDMMYYYY(clean.headers, clean.rows);
```

Specifically:
- After line 77 (CSV path): `resolve({ headers: clean.headers, rows: clean.rows, name: file.name })`
- Before it, add: `clean.rows = formatDateColumnsDDMMYYYY(clean.headers, clean.rows);`

The modified CSV section should look like:
```typescript
const clean = extractCleanTransactionalData(rowsArr, file.name);
clean.rows = formatDateColumnsDDMMYYYY(clean.headers, clean.rows);
resolve({
  headers: clean.headers,
  rows: clean.rows,
  name: file.name,
});
```

The modified Excel section should look like:
```typescript
const clean = extractCleanTransactionalData(rowsArr, file.name);
clean.rows = formatDateColumnsDDMMYYYY(clean.headers, clean.rows);
resolve({
  headers: clean.headers,
  rows: clean.rows,
  name: file.name,
});
```

- [ ] **Step 3: Add call in `handlePasteImport` after paste parsing**

In `handlePasteImport`, after the for-loop that builds rows (around line 219), before `setSourceA/B`:

```typescript
const convertedRows = formatDateColumnsDDMMYYYY(headers, rows);
```

Then replace all uses of `rows` with `convertedRows` in the setSourceA/B calls:

```typescript
if (side === 'A') {
  setSourceA({ headers, rows: convertedRows, fileName: descLabel });
  setLoadedHeadersA(headers);
  // ...
} else {
  setSourceB({ headers, rows: convertedRows, fileName: descLabel });
  setLoadedHeadersB(headers);
  // ...
}
```

- [ ] **Step 4: Run tests to verify**

```bash
npx vitest run 2>&1
npx tsc --noEmit 2>&1
npx vite build 2>&1
```
Expected: All tests pass, no type errors, build succeeds

---

### Task 4: Update standalone app model.js

**Files:**
- Modify: `localhost-project/public/js/model.js`

- [ ] **Step 1: Add `convertDateColumnsToDDMMYYYY` method**

Add this method to the Model class (after `extractCleanTransactionalBlock`):

```javascript
convertDateColumnsToDDMMYYYY(headers, rows) {
  if (!rows || rows.length === 0) return [];

  const dateCols = headers.filter(h => /ngày|date/i.test(h));
  if (dateCols.length === 0) return rows;

  return rows.map(row => {
    const newRow = { ...row };
    dateCols.forEach(col => {
      const val = newRow[col];
      if (val === undefined || val === null) {
        newRow[col] = '';
        return;
      }

      // Excel serial date
      if (typeof val === 'number' && val >= 35000 && val <= 70000) {
        newRow[col] = this.serialToDDMMYYYY(val);
        return;
      }

      const str = String(val).trim();
      if (!str) {
        newRow[col] = '';
        return;
      }

      // Already formatted
      if (str.indexOf('/') !== -1 || (str.indexOf('-') !== -1 && str.length !== 8)) {
        return;
      }

      // YYYYMMDD
      if (/^(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])$/.test(str)) {
        newRow[col] = str.slice(6, 8) + '/' + str.slice(4, 6) + '/' + str.slice(0, 4);
        return;
      }

      // DDMMYYYY
      if (/^(0[1-9]|[12]\d|3[01])(0[1-9]|1[0-2])(19|20)\d{2}$/.test(str)) {
        newRow[col] = str.slice(0, 2) + '/' + str.slice(2, 4) + '/' + str.slice(4, 8);
        return;
      }
    });
    return newRow;
  });
}

serialToDDMMYYYY(serial) {
  if (serial < 1 || serial > 1000000) return String(serial);
  try {
    const days = Math.floor(serial - 25569);
    const d = new Date(days * 86400 * 1000);
    if (isNaN(d.getTime())) return String(serial);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return dd + '/' + mm + '/' + yyyy;
  } catch {
    return String(serial);
  }
}
```

- [ ] **Step 2: Call method in `parsePasteInput`**

In `parsePasteInput`, after the for-loop that builds rows (line 41), before the sourceA/B assignment:

```javascript
rows = this.convertDateColumnsToDDMMYYYY(headers, rows);
```

Insert before the `if (side === "A") {` block (around line 42).

- [ ] **Step 3: Call method in `parseFiles`**

In `parseFiles`, after the Promise.all resolves (around line 107), before the `if (side === "A") {` block:

```javascript
combinedRows = this.convertDateColumnsToDDMMYYYY(masterHeaders, combinedRows);
```

Insert after `combinedRows = [...combinedRows, ...pkg.rows];` completes (around line 107).

- [ ] **Step 4: Verify standalone app**

```bash
cd localhost-project && node server.js 2>&1
```
Expected: Server starts on port 3000 without errors

---

### Task 5: Final verification

- [ ] **Step 1: Run all checks**

```bash
cd D:\ke_toan_2\ke_toan_2
npx vitest run 2>&1
```
Expected: 26 tests pass (17 existing + 9 new)

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit 2>&1
```
Expected: No errors

- [ ] **Step 3: Vite build**

```bash
npx vite build 2>&1
```
Expected: Build succeeds

- [ ] **Step 4: Final commit**

```bash
git add src/utils/parser.ts src/hooks/useFileUpload.ts src/__tests__/parser.test.ts localhost-project/public/js/model.js
git commit -m "feat: auto-format date columns to dd/mm/yyyy on upload"
```
