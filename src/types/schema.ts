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
