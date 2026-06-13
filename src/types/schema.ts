export interface ComparisonPair {
  colA: string;
  colB: string;
}

export type AggregationFunction = 'sum' | 'count' | 'average' | 'min' | 'max';

export interface ReconciliationSchema {
  keysA: string[];
  keysB: string[];
  comparePairs: ComparisonPair[];
  groupByEnabled: boolean;
  groupByFunction: AggregationFunction;
}
