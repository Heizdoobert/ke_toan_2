import { useCallback, ChangeEvent } from 'react';
import { useReconciliationContext } from '../context/ReconciliationContext';
import { extractCleanTransactionalData } from '../utils/parser';

export function useFileUpload(side: 'A' | 'B') {
  const {
    state,
    setSourceA,
    setSourceB,
    setLoadedHeadersA,
    setLoadedHeadersB,
    setIsProcessing,
    setProgress,
    setElapsedTime,
    updateSchema,
  } = useReconciliationContext();

  /** Process uploaded files (.xlsx, .xls, .csv) */
  const handleFileUpload = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      setIsProcessing(true);
      setProgress(15);
      const start = performance.now();

      const fileArray: File[] = Array.from(files);
      const validFiles = fileArray.filter((file) => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        return ext === 'xlsx' || ext === 'xls' || ext === 'csv';
      });

      if (validFiles.length === 0) {
        alert('No matched tabular files found (.xlsx, .xls, .csv)');
        setIsProcessing(false);
        setProgress(0);
        return;
      }

      setProgress(40);

      try {
        const XLSX = (window as any).XLSX;
        if (!XLSX) {
          alert(
            'The Excel processing toolkit SheetJS CDN is still preparing, please wait and retry.'
          );
          setIsProcessing(false);
          setProgress(0);
          return;
        }

        const parsedResults = await Promise.all(
          validFiles.map(async (file: File) => {
            return new Promise<{
              headers: string[];
              rows: Record<string, any>[];
              name: string;
            }>((resolve) => {
              const reader = new FileReader();
              const extName = file.name
                .substring(file.name.lastIndexOf('.'))
                .toLowerCase();

              if (extName === '.csv') {
                reader.readAsText(file);
                reader.onload = (evt: any) => {
                  try {
                    const text = (evt.target?.result as string) || '';
                    const rowsArr: any[][] = text
                      .split('\n')
                      .map((line) => line.split(','));
                    const clean = extractCleanTransactionalData(
                      rowsArr,
                      file.name
                    );
                    resolve({
                      headers: clean.headers,
                      rows: clean.rows,
                      name: file.name,
                    });
                  } catch {
                    resolve({ headers: [], rows: [], name: file.name });
                  }
                };
              } else {
                reader.readAsArrayBuffer(file);
                reader.onload = (evt: any) => {
                  try {
                    const buffer = evt.target?.result as ArrayBuffer;
                    const workbook = XLSX.read(
                      new Uint8Array(buffer),
                      { type: 'array' }
                    );
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const rowsArr = XLSX.utils.sheet_to_json(worksheet, {
                      header: 1,
                    }) as any[][];
                    const clean = extractCleanTransactionalData(
                      rowsArr,
                      file.name
                    );
                    resolve({
                      headers: clean.headers,
                      rows: clean.rows,
                      name: file.name,
                    });
                  } catch {
                    resolve({ headers: [], rows: [], name: file.name });
                  }
                };
              }
            });
          })
        );

        setProgress(75);

        let masterHeaders: string[] = [];
        let combinedRows: Record<string, any>[] = [];

        parsedResults.forEach((pkg) => {
          if (pkg.rows.length === 0) return;
          pkg.headers.forEach((h) => {
            if (!masterHeaders.includes(h)) masterHeaders.push(h);
          });
          combinedRows = [...combinedRows, ...pkg.rows];
        });

        const fileNameLabel =
          validFiles.length === 1
            ? validFiles[0].name
            : `Combined folder (${validFiles.length} files)`;

        if (side === 'A') {
          setSourceA({
            headers: masterHeaders,
            rows: combinedRows,
            fileName: fileNameLabel,
          });
          setLoadedHeadersA(masterHeaders);

          if (
            masterHeaders.length > 0 &&
            !state.schema.keysA[0]
          ) {
            updateSchema({ ...state.schema, keysA: [masterHeaders[0]] });
          }
        } else {
          setSourceB({
            headers: masterHeaders,
            rows: combinedRows,
            fileName: fileNameLabel,
          });
          setLoadedHeadersB(masterHeaders);

          if (
            masterHeaders.length > 0 &&
            !state.schema.keysB[0]
          ) {
            updateSchema({ ...state.schema, keysB: [masterHeaders[0]] });
          }
        }

        setElapsedTime(Math.round(performance.now() - start));
        setProgress(100);
      } catch (err) {
        console.error(err);
        alert(
          'Encountered parsing error. Please check your data layout structure.'
        );
      } finally {
        setIsProcessing(false);
      }
    },
    [side, state.schema, setSourceA, setSourceB, setLoadedHeadersA, setLoadedHeadersB, setIsProcessing, setProgress, setElapsedTime, updateSchema]
  );

  /** Process text-area paste input (Ctrl+V) */
  const handlePasteImport = useCallback(() => {
    const rawText = side === 'A' ? state.pasteA : state.pasteB;
    if (!rawText.trim()) {
      alert('Target input text structure is empty.');
      return;
    }

    setIsProcessing(true);
    setProgress(20);
    const start = performance.now();

    try {
      const delimiter = rawText.includes('\t') ? '\t' : ',';
      const lines = rawText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      if (lines.length < 1) {
        setIsProcessing(false);
        setProgress(0);
        return;
      }

      setProgress(60);

      const headers = lines[0].split(delimiter).map((h) => h.trim());
      const rows: Record<string, any>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(delimiter).map((c) => c.trim());
        const rowObj: Record<string, any> = {};
        headers.forEach((h, colIdx) => {
          rowObj[h] = cells[colIdx] !== undefined ? cells[colIdx] : '';
        });
        rowObj['Origin_File_Name'] = `Paste_Input_${side}.csv`;
        rows.push(rowObj);
      }

      const descLabel = `Ctrl+V input (${rows.length} rows)`;
      if (side === 'A') {
        setSourceA({ headers, rows, fileName: descLabel });
        setLoadedHeadersA(headers);
        if (headers.length > 0 && !state.schema.keysA[0]) {
          updateSchema({ ...state.schema, keysA: [headers[0]] });
        }
      } else {
        setSourceB({ headers, rows, fileName: descLabel });
        setLoadedHeadersB(headers);
        if (headers.length > 0 && !state.schema.keysB[0]) {
          updateSchema({ ...state.schema, keysB: [headers[0]] });
        }
      }

      setElapsedTime(Math.round(performance.now() - start));
      setProgress(100);
    } catch {
      alert(
        'Failed parsing manually pasted content. Make sure columns are separated by Tab or Comma.'
      );
    } finally {
      setIsProcessing(false);
    }
  }, [
    side,
    state.pasteA,
    state.pasteB,
    state.schema,
    setSourceA,
    setSourceB,
    setLoadedHeadersA,
    setLoadedHeadersB,
    setIsProcessing,
    setProgress,
    setElapsedTime,
    updateSchema,
  ]);

  return { handleFileUpload, handlePasteImport };
}
