/**
 * Group-by aggregation utility.
 * Cohesion: 1.0 — single responsibility: aggregate rows by composite key.
 */

import { normalizeValue } from './normalize';
import type { AggregationFunction } from '../types';

interface GroupAccumulator {
  keyValues: Record<string, any>;
  sums: Record<string, number>;
  counts: Record<string, number>;
  mins: Record<string, number>;
  maxs: Record<string, number>;
  rowsCount: number;
  originFiles: Set<string>;
}

// Perform Group By and aggregate numeric columns per the chosen function
export function handleAggregateGroupBy(
  rows: Record<string, any>[],
  groupKeys: string[],
  numericCols: string[],
  isSourceA: boolean,
  aggFunction: AggregationFunction = 'sum'
): Record<string, any>[] {
  if (groupKeys.length === 0) return rows;

  const groups: Record<string, GroupAccumulator> = {};

  for (const row of rows) {
    const subKeys = groupKeys.map(k => normalizeValue(row[k]));
    const compositeId = subKeys.join("|");
    const originFile = row["Origin_File_Name"] || "";

    if (!groups[compositeId]) {
      const keyValues: Record<string, any> = {};
      groupKeys.forEach(k => { keyValues[k] = row[k]; });

      const sums: Record<string, number> = {};
      const counts: Record<string, number> = {};
      const mins: Record<string, number> = {};
      const maxs: Record<string, number> = {};

      numericCols.forEach(c => {
        const num = Number(row[c]);
        const valid = row[c] !== null && row[c] !== undefined && !isNaN(num);
        sums[c] = valid ? num : 0;
        counts[c] = valid ? 1 : 0;
        mins[c] = valid ? num : Infinity;
        maxs[c] = valid ? num : -Infinity;
      });

      groups[compositeId] = { keyValues, sums, counts, mins, maxs, rowsCount: 1, originFiles: new Set(originFile ? [originFile] : []) };
    } else {
      const group = groups[compositeId];
      numericCols.forEach(c => {
        const num = Number(row[c]);
        const valid = row[c] !== null && row[c] !== undefined && !isNaN(num);
        if (valid) {
          group.sums[c] += num;
          group.counts[c] += 1;
          if (num < group.mins[c]) group.mins[c] = num;
          if (num > group.maxs[c]) group.maxs[c] = num;
        }
      });
      group.rowsCount += 1;
      if (originFile) group.originFiles.add(originFile);
    }
  }

  return Object.values(groups).map((group) => {
    const combinedRow: Record<string, any> = { ...group.keyValues };

    numericCols.forEach(c => {
      switch (aggFunction) {
        case 'sum':
          combinedRow[c] = group.sums[c];
          break;
        case 'count':
          combinedRow[c] = group.counts[c];
          break;
        case 'average':
          combinedRow[c] = group.counts[c] > 0 ? group.sums[c] / group.counts[c] : 0;
          break;
        case 'min':
          combinedRow[c] = group.mins[c] === Infinity ? null : group.mins[c];
          break;
        case 'max':
          combinedRow[c] = group.maxs[c] === -Infinity ? null : group.maxs[c];
          break;
      }
    });

    if (group.originFiles.size > 0) {
      combinedRow["Origin_File_Name"] = Array.from(group.originFiles).join(", ");
    }
    combinedRow["_Grouped_Rows_Count"] = group.rowsCount;
    return combinedRow;
  });
}
