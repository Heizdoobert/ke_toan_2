/**
 * Column data type detection and key compatibility warnings.
 */

import { TypeWarning } from '../types';

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
