import { useCallback, useEffect } from 'react';
import { useReconciliationContext } from '../context/ReconciliationContext';

export function useSchema() {
  const { state, updateSchema } = useReconciliationContext();

  /** Derive type warnings from current schema + data */
  const warnings = useCallback(() => {
    // Placeholder — full validation moved to SetupPanel component
    return [];
  }, [state.schema]);

  /** Load cached schema on mount */
  useEffect(() => {
    const cached = localStorage.getItem('reconciler_cached_rules');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.schema) {
          // Backward compat: old cached schema may lack groupByFunction
          if (!parsed.schema.groupByFunction) {
            parsed.schema.groupByFunction = 'sum';
          }
          updateSchema(parsed.schema);
        }
      } catch {
        /* ignore */
      }
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    ...state.schema,
    updateSchema,
    warnings,
  };
}
