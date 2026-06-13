import { useCallback } from 'react';
import { useReconciliationContext } from '../context/ReconciliationContext';
import { reconcileDataSources } from '../utils/reconciler';

export function useReconciliation() {
  const {
    state,
    setReconciledResults,
    setProgress,
    setElapsedTime,
    setIsProcessing,
  } = useReconciliationContext();

  /** Run the core reconciliation loop */
  const runReconciliation = useCallback(() => {
    if (state.sourceA.rows.length === 0 || state.sourceB.rows.length === 0)
      return;

    setIsProcessing(true);
    setProgress(20);

    setTimeout(() => {
      setProgress(50);
      const { results, executionTimeMs } = reconcileDataSources(
        state.sourceA.rows,
        state.sourceB.rows,
        state.schema
      );

      setProgress(90);
      setReconciledResults(results);
      setElapsedTime(executionTimeMs);

      setTimeout(() => {
        setProgress(100);
        setIsProcessing(false);
      }, 150);
    }, 100);
  }, [
    state.sourceA.rows,
    state.sourceB.rows,
    state.schema,
    setReconciledResults,
    setProgress,
    setElapsedTime,
    setIsProcessing,
  ]);

  /** Export 3-sheet Excel workbook */
  const exportToExcel = useCallback(() => {
    const XLSX = (window as any).XLSX;
    if (!XLSX) {
      alert(
        'The underlying SheetJS script is still loading. Please try again in a few seconds.'
      );
      return;
    }

    try {
      const wb = XLSX.utils.book_new();

      // Sheet1 — Clean Source A
      const cleanA = state.sourceA.rows.map(
        ({ _Grouped_Rows_Count, ...rest }: any) => rest
      );
      const wsA = XLSX.utils.json_to_sheet(cleanA);
      XLSX.utils.book_append_sheet(wb, wsA, 'Source A Clean');

      // Sheet2 — Clean Source B
      const cleanB = state.sourceB.rows.map(
        ({ _Grouped_Rows_Count, ...rest }: any) => rest
      );
      const wsB = XLSX.utils.json_to_sheet(cleanB);
      XLSX.utils.book_append_sheet(wb, wsB, 'Source B Clean');

      // Sheet3 — Reconciliation Summary
      const exportResults = state.reconciledResults.map((item) => {
        const rowObj: Record<string, any> = {};

        Object.keys(item.criteria).forEach((k) => {
          rowObj[k] = item.criteria[k];
        });

        state.schema.comparePairs.forEach((pair) => {
          if (pair.colA) {
            rowObj[`Source_A_${pair.colA}`] = item.valuesA[pair.colA] ?? '';
          }
        });
        state.schema.comparePairs.forEach((pair) => {
          if (pair.colB) {
            rowObj[`Source_B_${pair.colB}`] = item.valuesB[pair.colB] ?? '';
          }
        });

        rowObj['Src_A_File'] = item.valuesA['Origin_File_Name'] || '';
        rowObj['Src_B_File'] = item.valuesB['Origin_File_Name'] || '';

        rowObj['Recon_Status'] = item.status;
        rowObj['Discrepancy_Suggestion'] = item.discrepancy;

        return rowObj;
      });

      const wsC = XLSX.utils.json_to_sheet(exportResults);
      XLSX.utils.book_append_sheet(wb, wsC, 'Reconciliation Summary');

      const currDate = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `Reconciliation_Report_${currDate}.xlsx`);
    } catch (err) {
      console.error(err);
      alert(
        'Error building download workbook. Please verify datasets content are correct.'
      );
    }
  }, [
    state.sourceA.rows,
    state.sourceB.rows,
    state.reconciledResults,
    state.schema.comparePairs,
  ]);

  return { runReconciliation, exportToExcel };
}
