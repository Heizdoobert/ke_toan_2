/**
 * Group-by aggregation utility.
 * Cohesion: 1.0 — single responsibility: aggregate rows by composite key.
 */

import { normalizeValue } from './normalize';

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
