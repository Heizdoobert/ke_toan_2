/**
 * Transactional data parser — strips admin headers/footers from raw spreadsheet data.
 */

// Locate transactions block and strip metadata admin headers/footers
export function extractCleanTransactionalData(
  rawData: any[][],
  fileName: string
): { headers: string[]; rows: Record<string, any>[] } {
  if (!rawData || rawData.length === 0) {
    return { headers: [], rows: [] };
  }

  // Find which row has the actual headers
  // Criteria: the header row is usually the first row that contains multiple non-empty values
  // and looks like columns of financial data (e.g. contains words like 'amount', 'date', 'id', 'name', 'total', etc.)
  let headerIndex = 0;
  let maxColsFilled = 0;

  for (let i = 0; i < Math.min(rawData.length, 15); i++) {
    const row = rawData[i];
    if (!row) continue;
    const filledCount = row.filter(cell => cell !== undefined && cell !== null && String(cell).trim() !== "").length;
    if (filledCount > maxColsFilled) {
      maxColsFilled = filledCount;
      headerIndex = i;
    }
  }

  const rawHeaders = rawData[headerIndex] || [];
  const headers = rawHeaders.map((h, i) => {
    const s = h !== undefined && h !== null ? String(h).trim() : "";
    return s || `Column_${i + 1}`;
  });

  const rows: Record<string, any>[] = [];

  // Process values starting after the header
  for (let i = headerIndex + 1; i < rawData.length; i++) {
    const rawRow = rawData[i];
    if (!rawRow) continue;

    // Admin footprints / totals / metadata checks:
    // If the entire row is blank or has fewer than 10% filled cells, skip it.
    // If it starts with common meta labels like 'Prepared By', 'Authorized Sig', 'End of Report', 'Page 1', skip.
    const isBlank = rawRow.every(c => c === undefined || c === null || String(c).trim() === "");
    if (isBlank) continue;

    const firstCellStr = String(rawRow[0] || "").trim().toLowerCase();
    if (
      firstCellStr.includes("prepared by") ||
      firstCellStr.includes("authorized signal") ||
      firstCellStr.includes("total signature") ||
      firstCellStr.includes("end of report") ||
      firstCellStr.includes("page ") ||
      firstCellStr.startsWith("---") ||
      firstCellStr === "totals" ||
      firstCellStr.includes("confidential")
    ) {
      continue; // Ignore admin footnote rows
    }

    const rowObj: Record<string, any> = {};
    let hasData = false;

    headers.forEach((h, colIdx) => {
      let val = rawRow[colIdx];
      rowObj[h] = val !== undefined ? val : "";
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        hasData = true;
      }
    });

    if (hasData) {
      rowObj["Origin_File_Name"] = fileName;
      rows.push(rowObj);
    }
  }

  return { headers, rows };
}

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
