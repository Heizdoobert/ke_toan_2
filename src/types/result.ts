export interface ReconciliationResult {
  criteria: Record<string, any>;
  valuesA: Record<string, any>;
  valuesB: Record<string, any>;
  status: string;
  discrepancy: string;
}

export interface ReconciliationOutput {
  results: ReconciliationResult[];
  executionTimeMs: number;
}
