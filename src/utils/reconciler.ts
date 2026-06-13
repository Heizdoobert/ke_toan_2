/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Core reconciliation loop — kept as orchestration.
 * normalize/aggregate helpers extracted to sibling modules.
 */

import { normalizeValue } from './normalize';
import { handleAggregateGroupBy } from './aggregate';
import { ReconciliationSchema, ReconciliationResult } from '../types';

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
