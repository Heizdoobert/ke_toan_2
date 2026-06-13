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
