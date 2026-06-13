/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SourceData {
  headers: string[];
  rows: Record<string, any>[];
  fileName: string;
}

export interface ComparisonPair {
  colA: string;
  colB: string;
}

export interface ReconciliationSchema {
  keysA: string[];
  keysB: string[];
  comparePairs: ComparisonPair[];
  groupByEnabled: boolean;
}

export interface ReconciliationResult {
  criteria: Record<string, any>;
  valuesA: Record<string, any>;
  valuesB: Record<string, any>;
  status: string;
  discrepancy: string;
}

export interface TypeWarning {
  columnA: string;
  columnB: string;
  typeA: string;
  typeB: string;
  message: string;
}
