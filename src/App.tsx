/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  FileSpreadsheet, 
  RefreshCw, 
  ArrowLeftRight, 
  Download, 
  HelpCircle, 
  Upload, 
  AlertCircle, 
  CheckCircle2, 
  FileWarning, 
  ListRestart, 
  Code2,
  Terminal,
  Activity,
  ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { SourceData, ReconciliationSchema, ReconciliationResult } from "./types";
import { reconcileDataSources, extractCleanTransactionalData } from "./utils/reconciler";
import DataGrid from "./components/DataGrid";
import SetupPanel from "./components/SetupPanel";
import ExportLocalhost from "./components/ExportLocalhost";

export default function App() {
  const [sourceA, setSourceA] = useState<SourceData>({ headers: [], rows: [], fileName: "" });
  const [sourceB, setSourceB] = useState<SourceData>({ headers: [], rows: [], fileName: "" });
  
  const [loadedHeadersA, setLoadedHeadersA] = useState<string[]>([]);
  const [loadedHeadersB, setLoadedHeadersB] = useState<string[]>([]);

  const [schema, setSchema] = useState<ReconciliationSchema>({
    keysA: [""],
    keysB: [""],
    comparePairs: [{ colA: "", colB: "" }],
    groupByEnabled: false
  });

  const [reconciledResults, setReconciledResults] = useState<ReconciliationResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Text area paste states
  const [pasteA, setPasteA] = useState("");
  const [pasteB, setPasteB] = useState("");
  
  // Show manual tabs toggle
  const [activeInputTabA, setActiveInputTabA] = useState<"file" | "paste">("file");
  const [activeInputTabB, setActiveInputTabB] = useState<"file" | "paste">("file");

  // Load configuration from Cache on mounted
  useEffect(() => {
    const cached = localStorage.getItem("reconciler_cached_rules");
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.schema) {
          setSchema(parsed.schema);
        }
        if (parsed.headersA) setLoadedHeadersA(parsed.headersA);
        if (parsed.headersB) setLoadedHeadersB(parsed.headersB);
      } catch (err) {
        console.error("Cache deserialization failed.", err);
      }
    }
  }, []);

  // Update rule settings and persist rule schema in the db
  const updateSchema = (newSchema: ReconciliationSchema) => {
    setSchema(newSchema);
    const cacheObj = {
      schema: newSchema,
      headersA: sourceA.headers.length > 0 ? sourceA.headers : loadedHeadersA,
      headersB: sourceB.headers.length > 0 ? sourceB.headers : loadedHeadersB
    };
    localStorage.setItem("reconciler_cached_rules", JSON.stringify(cacheObj));
  };

  // Clear configuration caches
  const handleClearCache = () => {
    localStorage.removeItem("reconciler_cached_rules");
    setSchema({
      keysA: [""],
      keysB: [""],
      comparePairs: [{ colA: "", colB: "" }],
      groupByEnabled: false
    });
    setSourceA({ headers: [], rows: [], fileName: "" });
    setSourceB({ headers: [], rows: [], fileName: "" });
    setReconciledResults([]);
    setLoadedHeadersA([]);
    setLoadedHeadersB([]);
    setPasteA("");
    setPasteB("");
    setElapsedTime(0);
    setProgress(0);
  };

  // Process uploaded files, supports multiple and single .xlsx, .xls, .csv
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, side: "A" | "B") => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessing(true);
    setProgress(15);
    const start = performance.now();

    // Direct filters
    const validFiles = Array.from(files).filter((file) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      return ext === "xlsx" || ext === "xls" || ext === "csv";
    });

    if (validFiles.length === 0) {
      alert("No matched tabular files found (.xlsx, .xls, .csv)");
      setIsProcessing(false);
      setProgress(0);
      return;
    }

    setProgress(40);

    try {
      const XLSX = (window as any).XLSX;
      if (!XLSX) {
        alert("The Excel processing toolkit SheetJS CDN is still preparing, please wait and retry.");
        setIsProcessing(false);
        setProgress(0);
        return;
      }

      // Parallel parsing via FileReader directly to RAM
      const parsedResults = await Promise.all(
        validFiles.map(async (file) => {
          return new Promise<{ headers: string[]; rows: Record<string, any>[]; name: string }>((resolve) => {
            const reader = new FileReader();
            
            // Check if is CSV
            const extName = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
            if (extName === ".csv") {
              reader.readAsText(file);
              reader.onload = (evt) => {
                try {
                  const text = (evt.target?.result as string) || "";
                  const rowsArr: any[][] = text.split("\n").map(line => line.split(","));
                  const clean = extractCleanTransactionalData(rowsArr, file.name);
                  resolve({ headers: clean.headers, rows: clean.rows, name: file.name });
                } catch {
                  resolve({ headers: [], rows: [], name: file.name });
                }
              };
            } else {
              reader.readAsArrayBuffer(file);
              reader.onload = (evt) => {
                try {
                  const buffer = evt.target?.result as ArrayBuffer;
                  const workbook = XLSX.read(new Uint8Array(buffer), { type: "array" });
                  const sheetName = workbook.SheetNames[0];
                  const worksheet = workbook.Sheets[sheetName];
                  const rowsArr = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
                  const clean = extractCleanTransactionalData(rowsArr, file.name);
                  resolve({ headers: clean.headers, rows: clean.rows, name: file.name });
                } catch {
                  resolve({ headers: [], rows: [], name: file.name });
                }
              };
            }
          });
        })
      );

      setProgress(75);

      // Consolidate data structure row lists and extend horizontal master headers
      let masterHeaders: string[] = [];
      let combinedRows: Record<string, any>[] = [];

      parsedResults.forEach((pkg) => {
        if (pkg.rows.length === 0) return;
        pkg.headers.forEach((h) => {
          if (!masterHeaders.includes(h)) masterHeaders.push(h);
        });
        combinedRows = [...combinedRows, ...pkg.rows];
      });

      const fileNameLabel = validFiles.length === 1 
        ? validFiles[0].name 
        : `Combined folder (${validFiles.length} files)`;

      if (side === "A") {
        setSourceA({ headers: masterHeaders, rows: combinedRows, fileName: fileNameLabel });
        setLoadedHeadersA(masterHeaders);
        
        // Pick top available column as matching key
        if (masterHeaders.length > 0 && (!schema.keysA[0])) {
          updateSchema({ ...schema, keysA: [masterHeaders[0]] });
        }
      } else {
        setSourceB({ headers: masterHeaders, rows: combinedRows, fileName: fileNameLabel });
        setLoadedHeadersB(masterHeaders);

        // Pick top available column as matching key
        if (masterHeaders.length > 0 && (!schema.keysB[0])) {
          updateSchema({ ...schema, keysB: [masterHeaders[0]] });
        }
      }

      setElapsedTime(Math.round(performance.now() - start));
      setProgress(100);
    } catch (err) {
      console.error(err);
      alert("Encountered parsing error. Please check your data layout structure.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Process text-area copy pasted table data (Ctrl+V)
  const handlePasteImport = (side: "A" | "B") => {
    const rawText = side === "A" ? pasteA : pasteB;
    if (!rawText.trim()) {
      alert("Target input text structure is empty.");
      return;
    }

    setIsProcessing(true);
    setProgress(20);
    const start = performance.now();

    try {
      const delimiter = rawText.includes("\t") ? "\t" : ",";
      const lines = rawText.split("\n").map(l => l.trim()).filter(Boolean);
      
      if (lines.length < 1) {
        setIsProcessing(false);
        setProgress(0);
        return;
      }

      setProgress(60);

      const headers = lines[0].split(delimiter).map(h => h.trim());
      const rows: Record<string, any>[] = [];

      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(delimiter).map(c => c.trim());
        const rowObj: Record<string, any> = {};
        headers.forEach((h, colIdx) => {
          rowObj[h] = cells[colIdx] !== undefined ? cells[colIdx] : "";
        });
        rowObj["Origin_File_Name"] = `Paste_Input_${side}.csv`;
        rows.push(rowObj);
      }

      const descLabel = `Ctrl+V input (${rows.length} rows)`;
      if (side === "A") {
        setSourceA({ headers, rows, fileName: descLabel });
        setLoadedHeadersA(headers);
        if (headers.length > 0 && (!schema.keysA[0])) {
          updateSchema({ ...schema, keysA: [headers[0]] });
        }
      } else {
        setSourceB({ headers, rows, fileName: descLabel });
        setLoadedHeadersB(headers);
        if (headers.length > 0 && (!schema.keysB[0])) {
          updateSchema({ ...schema, keysB: [headers[0]] });
        }
      }

      setElapsedTime(Math.round(performance.now() - start));
      setProgress(100);
    } catch {
      alert("Failed parsing manually pasted content. Make sure columns are separated by Tab or Comma.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Run the core dual-hash map lookup reconciliation loop
  const handleExecutionRecon = () => {
    if (sourceA.rows.length === 0 || sourceB.rows.length === 0) return;
    
    setIsProcessing(true);
    setProgress(20);

    setTimeout(() => {
      setProgress(50);
      const { results, executionTimeMs } = reconcileDataSources(sourceA.rows, sourceB.rows, schema);
      
      setProgress(90);
      setReconciledResults(results);
      setElapsedTime(executionTimeMs);
      
      setTimeout(() => {
        setProgress(100);
        setIsProcessing(false);
      }, 150);
    }, 100);
  };

  // 3-Sheet Excel Writer via SheetJS
  const handleExportSpreadsheet = () => {
    const XLSX = (window as any).XLSX;
    if (!XLSX) {
      alert("The underlying SheetJS script is still loading. Please try again in a few seconds.");
      return;
    }

    try {
      const wb = XLSX.utils.book_new();

      // Sheet1 - Clean Source A (after edits/modifications if any)
      const cleanA = sourceA.rows.map(({ _Grouped_Rows_Count, ...rest }) => rest);
      const wsA = XLSX.utils.json_to_sheet(cleanA);
      XLSX.utils.book_append_sheet(wb, wsA, "Source A Clean");

      // Sheet2 - Clean Source B (after edits/modifications if any)
      const cleanB = sourceB.rows.map(({ _Grouped_Rows_Count, ...rest }) => rest);
      const wsB = XLSX.utils.json_to_sheet(cleanB);
      XLSX.utils.book_append_sheet(wb, wsB, "Source B Clean");

      // Sheet3 - Master Joined Alignment Table ordered explicitly matching groups
      const exportResults = reconciledResults.map((item) => {
        const rowObj: Record<string, any> = {};

        // [RECONCILIATION CRITERIA GROUP]
        Object.keys(item.criteria).forEach((k) => {
          rowObj[k] = item.criteria[k];
        });

        // [ORIGINAL COMPARISON VALUES GROUP]
        schema.comparePairs.forEach((pair) => {
          if (pair.colA) {
            rowObj[`Source_A_${pair.colA}`] = item.valuesA[pair.colA] ?? "";
          }
        });
        schema.comparePairs.forEach((pair) => {
          if (pair.colB) {
            rowObj[`Source_B_${pair.colB}`] = item.valuesB[pair.colB] ?? "";
          }
        });

        // Appending source provenance
        rowObj["Src_A_File"] = item.valuesA["Origin_File_Name"] || "";
        rowObj["Src_B_File"] = item.valuesB["Origin_File_Name"] || "";

        // [AUDIT RESULTS GROUP]
        rowObj["Recon_Status"] = item.status;
        rowObj["Discrepancy_Suggestion"] = item.discrepancy;

        return rowObj;
      });

      const wsC = XLSX.utils.json_to_sheet(exportResults);
      XLSX.utils.book_append_sheet(wb, wsC, "Reconciliation Summary");

      const currDate = new Date().toISOString().split("T")[0];
      XLSX.writeFile(wb, `Reconciliation_Report_${currDate}.xlsx`);
    } catch (err) {
      console.error(err);
      alert("Error building download workbook. Please verify datasets content are correct.");
    }
  };

  const matchedCount = reconciledResults.filter(r => r.status === "Matched").length;
  const unmatchedCount = reconciledResults.filter(r => r.status === "Unmatched").length;
  const onlyACount = reconciledResults.filter(r => r.status === "Not Found in Source B").length;
  const onlyBCount = reconciledResults.filter(r => r.status === "Not Found in Source A").length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800 antialiased font-sans flex-grow">
      {/* Visual Corporate Branding */}
      <header className="bg-slate-900 border-b border-indigo-950 text-white shadow-md relative overflow-hidden" id="navigation-rail">
        <div className="absolute inset-0 bg-linear-to-r from-slate-950 via-slate-900 to-indigo-950 opacity-90"></div>
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-650 h-9 w-9 rounded flex items-center justify-center text-white font-mono font-bold text-sm shadow-xs border border-indigo-400">
              URP
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                Universal Accounting Data Reconciler
              </h1>
              <p className="text-[10px] text-indigo-300 font-mono flex items-center gap-1">
                <span>Ultra Reconciler Pro v1.0 [Full local RAM Engine]</span>
              </p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleClearCache}
              className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 hover:text-white font-medium text-xs px-3 py-1.5 border border-slate-700 rounded-md transition duration-150 flex items-center gap-1.5 cursor-pointer shadow-xs"
              id="clear-all-cache-btn"
            >
              <RefreshCw className="h-3 w-3 text-indigo-400" /> Clear Cache Database
            </button>
          </div>
        </div>
      </header>

      {/* Main Execution Board Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 flex-grow w-full flex flex-col gap-6" id="dashboard-content">
        
        {/* Elapsed speed Ticker and Progress Bar */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-xs p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <div className="flex items-center gap-1.5 text-slate-700">
              <Activity className="h-4 w-4 text-indigo-600 animate-pulse" />
              <span>Real-time Millisecond Processing Stats</span>
            </div>
            {elapsedTime > 0 && (
              <span className="font-mono text-xs bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded shadow-2xs">
                Speed: {elapsedTime} ms / RAM calculation
              </span>
            )}
          </div>
          
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-150">
            <div 
              className="bg-indigo-650 h-full transition-all duration-300 rounded-full" 
              style={{ width: `${progress}%` }} 
              id="engine-progress-meter"
            />
          </div>
        </div>

        {/* Upload Panels Side-By-Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Source Ledger A */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col" id="import-block-A">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600">Source A Ledger</h4>
              <div className="flex gap-1 bg-slate-200 p-0.5 rounded text-[11px] font-sans">
                <button
                  onClick={() => setActiveInputTabA("file")}
                  className={`px-2.5 py-1 rounded transition ${activeInputTabA === "file" ? "bg-white text-slate-800 shadow-xs border border-slate-150 font-medium" : "text-slate-500 hover:text-slate-700"}`}
                >
                  File / Folders
                </button>
                <button
                  onClick={() => setActiveInputTabA("paste")}
                  className={`px-2.5 py-1 rounded transition ${activeInputTabA === "paste" ? "bg-white text-slate-800 shadow-xs border border-slate-150 font-medium" : "text-slate-500 hover:text-slate-700"}`}
                >
                  Ctrl+V Paste
                </button>
              </div>
            </div>

            <div className="p-4 flex-grow flex flex-col gap-3 min-h-36 justify-center">
              {activeInputTabA === "file" ? (
                <div className="flex flex-col gap-3">
                  <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-lg p-5 text-center transition flex flex-col items-center justify-center relative cursor-text group gap-1 bg-slate-55">
                    <Upload className="h-6 w-6 text-slate-400 group-hover:text-indigo-500 transition mb-1 stroke-1" />
                    <span className="text-xs font-semibold text-slate-700">Choose Files or Entire Folder directory</span>
                    <span className="text-[10px] text-slate-400">Accepts .xlsx, .xls, .csv</span>
                    <input
                      type="file"
                      multiple
                      {...({ webkitdirectory: "", directory: "" } as any)}
                      onChange={(e) => handleFileUpload(e, "A")}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      id="source-A-uploader"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <textarea
                    placeholder="Enter CSV columns separated by tab or commas. E.g.&#10;Transaction_ID,Amount,Post_Date&#10;TXN1001,1525.00,2026-06-11&#10;TXN1002,450.99,2026-06-12"
                    value={pasteA}
                    onChange={(e) => setPasteA(e.target.value)}
                    className="w-full h-24 p-2.5 font-mono text-[10px] bg-slate-55 border border-slate-200 rounded-md shadow-inner outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition resize-none leading-normal"
                    id="source-A-paste-textarea"
                  />
                  <button
                    onClick={() => handlePasteImport("A")}
                    className="w-full py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded shadow-xs transition"
                    id="source-A-paste-btn"
                  >
                    Parse Paste Text
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Source Ledger B */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col" id="import-block-B">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-600">Source B Ledger</h4>
              <div className="flex gap-1 bg-slate-200 p-0.5 rounded text-[11px] font-sans">
                <button
                  onClick={() => setActiveInputTabB("file")}
                  className={`px-2.5 py-1 rounded transition ${activeInputTabB === "file" ? "bg-white text-slate-800 shadow-xs border border-slate-150 font-medium" : "text-slate-500 hover:text-slate-700"}`}
                >
                  File / Folders
                </button>
                <button
                  onClick={() => setActiveInputTabB("paste")}
                  className={`px-2.5 py-1 rounded transition ${activeInputTabB === "paste" ? "bg-white text-slate-800 shadow-xs border border-slate-150 font-medium" : "text-slate-500 hover:text-slate-700"}`}
                >
                  Ctrl+V Paste
                </button>
              </div>
            </div>

            <div className="p-4 flex-grow flex flex-col gap-3 min-h-36 justify-center">
              {activeInputTabB === "file" ? (
                <div className="flex flex-col gap-3">
                  <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-lg p-5 text-center transition flex flex-col items-center justify-center relative cursor-text group gap-1 bg-slate-55">
                    <Upload className="h-6 w-6 text-slate-400 group-hover:text-indigo-500 transition mb-1 stroke-1" />
                    <span className="text-xs font-semibold text-slate-700">Choose Files or Entire Folder directory</span>
                    <span className="text-[10px] text-slate-400">Accepts .xlsx, .xls, .csv</span>
                    <input
                      type="file"
                      multiple
                      {...({ webkitdirectory: "", directory: "" } as any)}
                      onChange={(e) => handleFileUpload(e, "B")}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      id="source-B-uploader"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <textarea
                    placeholder="Enter CSV columns separated by tab or commas. E.g.&#10;Txn_No,Total_Val,Txn_Date&#10;1001,1525.00,2026-06-11&#10;1002,450.00,2026-06-12"
                    value={pasteB}
                    onChange={(e) => setPasteB(e.target.value)}
                    className="w-full h-24 p-2.5 font-mono text-[10px] bg-slate-55 border border-slate-200 rounded-md shadow-inner outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition resize-none leading-normal"
                    id="source-B-paste-textarea"
                  />
                  <button
                    onClick={() => handlePasteImport("B")}
                    className="w-full py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded shadow-xs transition"
                    id="source-B-paste-btn"
                  >
                    Parse Paste Text
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Dynamic Preview Excel Grids Side-by-Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
          <DataGrid
            title="Preview Ledger Source A"
            sourceLabel="Source A"
            headers={sourceA.headers}
            rows={sourceA.rows}
            fileName={sourceA.fileName}
            onUpdateData={(headers, rows) => setSourceA({ ...sourceA, headers, rows })}
            onClear={() => {
              setSourceA({ headers: [], rows: [], fileName: "" });
            }}
          />
          <DataGrid
            title="Preview Ledger Source B"
            sourceLabel="Source B"
            headers={sourceB.headers}
            rows={sourceB.rows}
            fileName={sourceB.fileName}
            onUpdateData={(headers, rows) => setSourceB({ ...sourceB, headers, rows })}
            onClear={() => {
              setSourceB({ headers: [], rows: [], fileName: "" });
            }}
          />
        </div>

        {/* Setup Rules Panel Board */}
        <div className="grid grid-cols-1">
          <SetupPanel
            headersA={sourceA.headers.length > 0 ? sourceA.headers : loadedHeadersA}
            headersB={sourceB.headers.length > 0 ? sourceB.headers : loadedHeadersB}
            rowsA={sourceA.rows}
            rowsB={sourceB.rows}
            schema={schema}
            onChangeSchema={updateSchema}
            onRunReconciliation={handleExecutionRecon}
            disabled={sourceA.rows.length === 0 || sourceB.rows.length === 0 || isProcessing}
          />
        </div>

        {/* Reconciliation Master Outputs report */}
        <AnimatePresence>
          {reconciledResults.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              transition={{ duration: 0.35 }}
              className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col gap-4 p-4 font-sans"
              id="reconcile-report-card"
            >
              
              {/* Report Header stats */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-slate-100 pb-3 gap-4">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <div>
                    <h3 className="font-bold text-sm text-slate-800 tracking-tight">Audit Output Report Summary</h3>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Matched: <span className="text-emerald-600 font-semibold">{matchedCount}</span> | 
                      Unmatched: <span className="text-rose-600 font-semibold">{unmatchedCount}</span> | 
                      Missing In B: <span className="text-amber-600 font-semibold">{onlyACount}</span> | 
                      Missing In A: <span className="text-amber-605 font-semibold">{onlyBCount}</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleExportSpreadsheet}
                  className="bg-indigo-700 hover:bg-indigo-800 active:scale-98 text-white px-4 py-2 font-semibold text-xs rounded-md shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                  id="final-download-excel-btn"
                >
                  <Download className="h-4 w-4" /> Download 3-Sheet Report Spreadsheet
                </button>
              </div>

              {/* Data Table */}
              <div className="overflow-auto border border-slate-200 rounded max-h-[400px]">
                <table className="w-full text-[11px] font-sans border-collapse bg-white text-left">
                  <thead className="bg-slate-100 sticky top-0 font-semibold text-slate-700 border-b border-slate-200">
                    <tr>
                      {/* Prerequisites Headers */}
                      {schema.keysA.map((_, i) => (
                        <th key={`h_keyA_${i}`} className="px-3 py-2 border-r border-slate-200 min-w-[125px]">
                          Key A ({schema.keysA[i] || `Pair ${i+1}`})
                        </th>
                      ))}
                      {schema.keysB.map((_, i) => (
                        <th key={`h_keyB_${i}`} className="px-3 py-2 border-r border-slate-200 min-w-[125px]">
                          Key B ({schema.keysB[i] || `Pair ${i+1}`})
                        </th>
                      ))}
                      
                      {/* Custom compare pairs */}
                      {schema.comparePairs.map((pair, idx) => {
                        const thA = pair.colA ? (
                          <th key={`h_colA_${idx}`} className="px-3 py-2 border-r border-slate-200 min-w-[120px] bg-slate-50">
                            A: {pair.colA}
                          </th>
                        ) : null;
                        const thB = pair.colB ? (
                          <th key={`h_colB_${idx}`} className="px-3 py-2 border-r border-slate-200 min-w-[120px] bg-slate-50">
                            B: {pair.colB}
                          </th>
                        ) : null;
                        return (
                          <React.Fragment key={idx}>
                            {thA}
                            {thB}
                          </React.Fragment>
                        );
                      })}

                      {/* Origin Files provenance tracking */}
                      <th className="px-3 py-2 border-r border-slate-200 min-w-[140px] text-slate-500 font-medium">Origin A</th>
                      <th className="px-3 py-2 border-r border-slate-200 min-w-[140px] text-slate-500 font-medium">Origin B</th>

                      {/* Append Audit Results Columns */}
                      <th className="px-3 py-2 border-r border-slate-200 text-slate-900 font-semibold">Status</th>
                      <th className="px-3 py-2 min-w-[180px] text-slate-900 font-semibold">Variance / Discrepancy Recommendation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 divide-x-0">
                    {reconciledResults.map((item, idx) => {
                      // Status colors helper
                      let statusBg = "bg-emerald-50 text-emerald-800 border-emerald-250";
                      if (item.status === "Unmatched") statusBg = "bg-rose-50 text-rose-800 border-rose-250";
                      else if (item.status.includes("Source")) statusBg = "bg-amber-50 text-amber-805 border-amber-250";

                      return (
                        <tr key={idx} className="hover:bg-slate-55 transition">
                          {/* Matching criteria keys */}
                          {schema.keysA.map((_, i) => (
                            <td key={`v_keyA_${i}`} className="px-3 py-2 border-r border-slate-150 truncate max-w-[150px] font-mono">
                              {item.criteria[`Key_A_${i + 1}`] !== undefined ? String(item.criteria[`Key_A_${i  + 1}`]) : ""}
                            </td>
                          ))}
                          {schema.keysB.map((_, i) => (
                            <td key={`v_keyB_${i}`} className="px-3 py-2 border-r border-slate-150 truncate max-w-[150px] font-mono">
                              {item.criteria[`Key_B_${i + 1}`] !== undefined ? String(item.criteria[`Key_B_${i  + 1}`]) : ""}
                            </td>
                          ))}

                          {/* Comparision target numbers */}
                          {schema.comparePairs.map((pair, idx) => {
                            const tdA = pair.colA ? (
                              <td key={`v_valA_${idx}`} className="px-3 py-2 border-r border-slate-150 text-right font-mono bg-slate-55">
                                {item.valuesA[pair.colA] !== null && item.valuesA[pair.colA] !== undefined ? String(item.valuesA[pair.colA]) : "—"}
                              </td>
                            ) : null;
                            const tdB = pair.colB ? (
                              <td key={`v_valB_${idx}`} className="px-3 py-2 border-r border-slate-150 text-right font-mono bg-slate-55">
                                {item.valuesB[pair.colB] !== null && item.valuesB[pair.colB] !== undefined ? String(item.valuesB[pair.colB]) : "—"}
                              </td>
                            ) : null;
                            return (
                              <React.Fragment key={idx}>
                                {tdA}
                                {tdB}
                              </React.Fragment>
                            );
                          })}

                          {/* Original references filenames */}
                          <td className="px-3 py-2 border-r border-slate-150 truncate max-w-[140px] text-slate-500 font-mono">
                            {item.valuesA["Origin_File_Name"] || "—"}
                          </td>
                          <td className="px-3 py-2 border-r border-slate-150 truncate max-w-[140px] text-slate-500 font-mono">
                            {item.valuesB["Origin_File_Name"] || "—"}
                          </td>

                          {/* Audit Outputs */}
                          <td className="px-3 py-2 border-r border-slate-150 select-none">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBg}`}>
                              {item.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-slate-600 font-medium break-all">
                            {item.discrepancy || <span className="text-emerald-600">Equivalence matches verified.</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Code Exporter Accordion Box */}
        <div className="grid grid-cols-1">
          <ExportLocalhost />
        </div>

      </main>

      {/* Humble Footer */}
      <footer className="bg-slate-900 border-t border-indigo-950 text-slate-400 font-mono text-[10px] py-6 text-center mt-auto uppercase tracking-wider relative">
        <div className="max-w-7xl mx-auto px-4">
          All data computations executed serverless in RAM • Designed by Senior Accounting System Architect
        </div>
      </footer>
    </div>
  );
}
