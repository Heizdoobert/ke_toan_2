/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReconciliationSchema, ReconciliationResult, TypeWarning } from "../types";

// Conversions & Normalization Rules
export function excelSerialToDateStr(serial: number): string {
  if (serial < 1 || serial > 1000000) return String(serial);
  try {
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const d = new Date(utc_value * 1000);
    
    // Check if valid date
    if (isNaN(d.getTime())) return String(serial);
    
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return String(serial);
  }
}

// Normalize strings, strip leading zeros, clean white space, detect Date patterns
export function normalizeValue(val: any): string {
  if (val === undefined || val === null) return "";
  
  // If it's a boolean or number
  if (typeof val === "number") {
    // Check if it looks like an Excel serial date (e.g. 35000 to 70000)
    if (val >= 35000 && val <= 70000) {
      return excelSerialToDateStr(val);
    }
    return String(val).trim().replace(/^0+/, "") || "0";
  }
  
  let str = String(val).trim();
  if (!str) return "";

  // Check if string matches Excel serial date or ISO / custom date pattern
  // E.g. YYYY-MM-DD, MM/DD/YYYY or DD/MM/YYYY
  const isoDateRegex = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/;
  const slashesDateRegex = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/;
  
  if (isoDateRegex.test(str)) {
    const match = str.match(isoDateRegex);
    if (match) {
      const y = match[1];
      const m = match[2].padStart(2, "0");
      const d = match[3].padStart(2, "0");
      return `${y}-${m}-${d}`;
    }
  } else if (slashesDateRegex.test(str)) {
    const match = str.match(slashesDateRegex);
    if (match) {
      // Could be DD/MM/YYYY or MM/DD/YYYY. Let's try standard JS parser
      const parsed = new Date(str);
      if (!isNaN(parsed.getTime())) {
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, "0");
        const d = String(parsed.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
      }
    }
  }

  // Strip leading zeros for strings (e.g. "000123" -> "123")
  const stripped = str.replace(/^0+/, "");
  if (stripped === "") return "0"; // edge case for "000" -> "0"
  return stripped;
}

// Scan column content to guess data format (String vs Number)
export function getColumnDataType(rows: Record<string, any>[], column: string): "Numeric" | "String" {
  if (!rows || rows.length === 0 || !column) return "String";
  
  let numericCount = 0;
  let nonNullCount = 0;
  
  // Check up to first 100 rows for performance
  const sampleSize = Math.min(rows.length, 100);
  for (let i = 0; i < sampleSize; i++) {
    const val = rows[i][column];
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      nonNullCount++;
      const num = Number(val);
      if (!isNaN(num)) {
        numericCount++;
      }
    }
  }
  
  if (nonNullCount > 0 && numericCount / nonNullCount > 0.8) {
    return "Numeric";
  }
  return "String";
}

// Generate warnings if matching key formats do not match
export function validateMatchingKeys(
  rowsA: Record<string, any>[],
  rowsB: Record<string, any>[],
  keysA: string[],
  keysB: string[]
): TypeWarning[] {
  const warnings: TypeWarning[] = [];
  const minLen = Math.min(keysA.length, keysB.length);
  
  for (let i = 0; i < minLen; i++) {
    const colA = keysA[i];
    const colB = keysB[i];
    if (!colA || !colB) continue;
    
    const typeA = getColumnDataType(rowsA, colA);
    const typeB = getColumnDataType(rowsB, colB);
    
    if (typeA !== typeB) {
      warnings.push({
        columnA: colA,
        columnB: colB,
        typeA,
        typeB,
        message: `Type mismatch for condition pair #${i + 1}: Column [${colA}] in Source A is predominantly ${typeA}, but Column [${colB}] in Source B is ${typeB}. Matches might fail.`
      });
    }
  }
  return warnings;
}

// Perform Group By and SUM calculation for numeric columns
export function handleAggregateGroupBy(
  rows: Record<string, any>[],
  groupKeys: string[],
  numericCols: string[],
  isSourceA: boolean
): Record<string, any>[] {
  if (groupKeys.length === 0) return rows;
  
  const groups: Record<string, { keyValues: Record<string, any>; sums: Record<string, number>; rowsCount: number; originFiles: Set<string> }> = {};
  
  for (const row of rows) {
    // Generate grouping identifier (ignoring leading zeros and standardizing)
    const subKeys = groupKeys.map(k => normalizeValue(row[k]));
    const compositeId = subKeys.join("|");
    
    const originFile = row["Origin_File_Name"] || "";
    
    if (!groups[compositeId]) {
      const keyValues: Record<string, any> = {};
      groupKeys.forEach(k => {
        keyValues[k] = row[k];
      });
      
      const sums: Record<string, number> = {};
      numericCols.forEach(c => {
        const num = Number(row[c]);
        sums[c] = isNaN(num) ? 0 : num;
      });
      
      groups[compositeId] = {
        keyValues,
        sums,
        rowsCount: 1,
        originFiles: new Set(originFile ? [originFile] : [])
      };
    } else {
      const group = groups[compositeId];
      numericCols.forEach(c => {
        const num = Number(row[c]);
        if (!isNaN(num)) {
          group.sums[c] += num;
        }
      });
      group.rowsCount += 1;
      if (originFile) {
        group.originFiles.add(originFile);
      }
    }
  }
  
  return Object.values(groups).map((group) => {
    const combinedRow: Record<string, any> = { ...group.keyValues };
    numericCols.forEach(c => {
      combinedRow[c] = group.sums[c];
    });
    // Append aggregated files
    if (group.originFiles.size > 0) {
      combinedRow["Origin_File_Name"] = Array.from(group.originFiles).join(", ");
    }
    // Track count optionally
    combinedRow["_Grouped_Rows_Count"] = group.rowsCount;
    return combinedRow;
  });
}

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

// Standard full outer join reconciliation algorithm in RAM (sub-2-seconds utilizing Hash Maps)
export function reconcileDataSources(
  rowsA: Record<string, any>[],
  rowsB: Record<string, any>[],
  schema: ReconciliationSchema
): { results: ReconciliationResult[]; executionTimeMs: number } {
  const startTime = performance.now();
  
  const { keysA, keysB, comparePairs, groupByEnabled } = schema;
  const numPairs = Math.min(keysA.length, keysB.length);
  
  if (numPairs === 0) {
    return { results: [], executionTimeMs: Math.round(performance.now() - startTime) };
  }
  
  // Determine comparison target numeric lists
  const numericA = comparePairs.map(p => p.colA).filter(Boolean);
  const numericB = comparePairs.map(p => p.colB).filter(Boolean);
  
  // Pre-process grouping aggregation if enabled
  let processedA = rowsA;
  let processedB = rowsB;
  
  if (groupByEnabled) {
    processedA = handleAggregateGroupBy(rowsA, keysA, numericA, true);
    processedB = handleAggregateGroupBy(rowsB, keysB, numericB, false);
  }
  
  // Hash map indexes
  // To support non-grouped duplicate reconciliation without Cartesian explosion,
  // we append "_index" to duplicate composite keys (e.g. key_0, key_1)
  const mapA: Record<string, { row: Record<string, any>; sequence: number }> = {};
  const mapB: Record<string, { row: Record<string, any>; sequence: number }> = {};
  
  const keySequenceCounterA: Record<string, number> = {};
  const keySequenceCounterB: Record<string, number> = {};
  
  // Index Source A
  for (const row of processedA) {
    const rawKeys = keysA.map(k => normalizeValue(row[k]));
    const compositeKeyBase = rawKeys.join("|");
    
    if (keySequenceCounterA[compositeKeyBase] === undefined) {
      keySequenceCounterA[compositeKeyBase] = 0;
    } else {
      keySequenceCounterA[compositeKeyBase]++;
    }
    
    const seq = keySequenceCounterA[compositeKeyBase];
    const uniqueHashKey = `${compositeKeyBase}#${seq}`;
    mapA[uniqueHashKey] = { row, sequence: seq };
  }
  
  // Index Source B
  for (const row of processedB) {
    const rawKeys = keysB.map(k => normalizeValue(row[k]));
    const compositeKeyBase = rawKeys.join("|");
    
    if (keySequenceCounterB[compositeKeyBase] === undefined) {
      keySequenceCounterB[compositeKeyBase] = 0;
    } else {
      keySequenceCounterB[compositeKeyBase]++;
    }
    
    const seq = keySequenceCounterB[compositeKeyBase];
    const uniqueHashKey = `${compositeKeyBase}#${seq}`;
    mapB[uniqueHashKey] = { row, sequence: seq };
  }
  
  // Union of all unique composite hash keys
  const allHashKeysSet = new Set<string>([...Object.keys(mapA), ...Object.keys(mapB)]);
  const results: ReconciliationResult[] = [];
  
  for (const hashKey of allHashKeysSet) {
    const entryA = mapA[hashKey];
    const entryB = mapB[hashKey];
    
    const parts = hashKey.split("#");
    const compositeKeyBase = parts[0];
    const keyValues = compositeKeyBase.split("|");
    
    // Build primary alignment display
    const criteria: Record<string, any> = {};
    keysA.forEach((k, idx) => {
      criteria[`Key_A_${idx + 1}`] = entryA ? entryA.row[k] : (keyValues[idx] || "");
    });
    keysB.forEach((k, idx) => {
      criteria[`Key_B_${idx + 1}`] = entryB ? entryB.row[k] : (keyValues[idx] || "");
    });
    
    const valuesA: Record<string, any> = {};
    const valuesB: Record<string, any> = {};
    
    comparePairs.forEach((pair) => {
      if (pair.colA) {
        valuesA[pair.colA] = entryA ? entryA.row[pair.colA] : null;
      }
      if (pair.colB) {
        valuesB[pair.colB] = entryB ? entryB.row[pair.colB] : null;
      }
    });
    
    // Track origin file names
    const fileA = entryA ? (entryA.row["Origin_File_Name"] || "") : "";
    const fileB = entryB ? (entryB.row["Origin_File_Name"] || "") : "";
    if (entryA) valuesA["Origin_File_Name"] = fileA;
    if (entryB) valuesB["Origin_File_Name"] = fileB;
    
    let status = "Matched";
    let discrepancy = "";
    
    if (!entryA && entryB) {
      status = "Not Found in Source A";
      discrepancy = `Record only exists in Source B (File: ${fileB})`;
    } else if (entryA && !entryB) {
      status = "Not Found in Source B";
      discrepancy = `Record only exists in Source A (File: ${fileA})`;
    } else if (entryA && entryB) {
      // Both exist - perform comparison check
      const discrepanciesList: string[] = [];
      
      for (const pair of comparePairs) {
        if (!pair.colA || !pair.colB) continue;
        
        const valA = entryA.row[pair.colA];
        const valB = entryB.row[pair.colB];
        
        const numA = Number(valA);
        const numB = Number(valB);
        
        if (!isNaN(numA) && !isNaN(numB)) {
          const diff = numA - numB;
          if (Math.abs(diff) > 0.0001) {
            discrepanciesList.push(`Variance of ${diff.toFixed(2)} ([${pair.colA}] = ${numA.toFixed(2)}, [${pair.colB}] = ${numB.toFixed(2)})`);
          }
        } else {
          // String equivalent comparison
          const normStrA = normalizeValue(valA);
          const normStrB = normalizeValue(valB);
          if (normStrA !== normStrB) {
            discrepanciesList.push(`Mismatch: [${pair.colA}] "${valA}" vs [${pair.colB}] "${valB}"`);
          }
        }
      }
      
      if (discrepanciesList.length > 0) {
        status = "Unmatched";
        discrepancy = discrepanciesList.join("; ");
      }
    }
    
    results.push({
      criteria,
      valuesA,
      valuesB,
      status,
      discrepancy
    });
  }
  
  const executionTimeMs = Math.round(performance.now() - startTime);
  return { results, executionTimeMs };
}
