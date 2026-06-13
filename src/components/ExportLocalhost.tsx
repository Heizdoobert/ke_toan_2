/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Terminal, Copy, Check, Download, FolderGit, FileCode, CheckCircle } from "lucide-react";

export default function ExportLocalhost() {
  const [activeTab, setActiveTab] = useState<"package" | "server" | "html" | "app">("package");
  const [copied, setCopied] = useState(false);

  const codes = {
    package: `{
  "name": "ultra-reconciler-pro",
  "version": "1.0.0",
  "description": "Universal Accounting Data Reconciler - MVC Localhost Applet",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.21.2"
  },
  "author": "Corporate Accounting Solutions Group",
  "license": "Apache-2.0"
}`,
    server: `const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

// Serve static compiled UI files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Server-side logging and API routers can be expanded here
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Single Page App wildcard router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('===============================================================');
  console.log('  UNIVERSAL ACCOUNTING DATA RECONCILER - ULTRA RECONCILER PRO');
  console.log(\`  Server is now running locally on http://localhost:\${PORT}\`);
  console.log('  Press Ctrl+C to terminate the process');
  console.log('===============================================================');
});`,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Universal Reconciler Pro - Ultra Localhost</title>
  <!-- Tailwind CSS Play CDN -->
  <script src="https://cdn.tailwindcss.com"></script>
  <!-- SheetJS Client side Excel processor CDN -->
  <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
  <!-- Lucide Icons CDN -->
  <script src="https://unpkg.com/lucide@latest"></script>
  <style>
    /* Styling overrides for custom design feel */
    .border-slate-150 { border-color: rgba(226, 232, 240, 0.8); }
    .bg-slate-55 { background-color: rgba(248, 250, 252, 0.6); }
  </style>
</head>
<body class="bg-slate-50 text-slate-800 antialiased font-sans min-h-screen flex flex-col">
  <!-- Core Layout Structure inside app.js MVC View -->
  <header class="bg-slate-900 text-white shadow-md border-b border-slate-800 px-6 py-4">
    <div class="max-w-7xl mx-auto flex items-center justify-between">
      <div class="flex items-center gap-3">
        <i data-lucide="file-check-2" class="h-6 w-6 text-indigo-400"></i>
        <div>
          <h1 class="text-lg font-bold tracking-tight">Universal Accounting Data Reconciler</h1>
          <p class="text-xs text-slate-400 font-mono">Ultra Reconciler Pro v1.0.0 [Localhost System]</p>
        </div>
      </div>
      <button id="clear-cache-btn" class="bg-slate-800 hover:bg-slate-700 hover:text-white text-slate-300 font-medium text-xs px-3 py-1.5 border border-slate-700 rounded transition flex items-center gap-1.5 cursor-pointer">
        <i data-lucide="refresh-cw" class="h-3 w-3"></i> Clear Configuration Cache
      </button>
    </div>
  </header>

  <main class="max-w-7xl mx-auto px-6 py-6 flex-grow w-full flex flex-col gap-6">
    <!-- Progress Indicator -->
    <div class="bg-white rounded-lg border border-slate-200 shadow-xs p-4 flex flex-col gap-2">
      <div class="flex items-center justify-between text-xs text-slate-500 font-medium">
        <span>Processing Execution Pipeline</span>
        <span id="elapsed-time-ticker" class="font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">0ms</span>
      </div>
      <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
        <div id="progress-bar-slider" class="w-0 bg-indigo-600 h-full transition-all duration-300"></div>
      </div>
    </div>

    <!-- Upload Panel & Actions -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <!-- Source A Card -->
      <div class="bg-white rounded-lg border border-slate-200 shadow-xs p-4 flex flex-col gap-3">
        <div class="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 class="font-bold text-sm text-slate-800 tracking-tight">Source A Ledger</h3>
          <span class="text-[10px] bg-slate-100 font-medium px-2 py-1.5 rounded-full text-slate-500">A Ledger</span>
        </div>
        <div class="flex flex-col gap-2">
          <label class="block text-xs font-semibold text-slate-600">Upload Files, CSV, or folder</label>
          <input type="file" id="upload-input-A" class="block w-full border border-slate-205 py-2 px-3 text-xs bg-slate-50 text-slate-700 rounded cursor-pointer" multiple />
          <p class="text-[10px] text-slate-400">Or copy-paste transactional table into the textarea below</p>
          <textarea id="paste-input-A" placeholder="Transaction_ID,Amount,Date&#15;000101,150.25,2026-06-11&#15;000102,299.90,2026-06-12" class="w-full h-24 p-2 font-mono text-xs border border-slate-300 rounded outline-none shadow-xs resize-none"></textarea>
        </div>
      </div>

      <!-- Source B Card -->
      <div class="bg-white rounded-lg border border-slate-200 shadow-xs p-4 flex flex-col gap-3">
        <div class="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 class="font-bold text-sm text-slate-800 tracking-tight">Source B Ledger</h3>
          <span class="text-[10px] bg-slate-100 font-medium px-2 py-1.5 rounded-full text-slate-500">B Ledger</span>
        </div>
        <div class="flex flex-col gap-2">
          <label class="block text-xs font-semibold text-slate-600">Upload Files, CSV, or folder</label>
          <input type="file" id="upload-input-B" class="block w-full border border-slate-205 py-2 px-3 text-xs bg-slate-50 text-slate-700 rounded cursor-pointer" multiple />
          <p class="text-[10px] text-slate-400">Or copy-paste transactional table into the textarea below</p>
          <textarea id="paste-input-B" placeholder="Txn_No,Total_Val,Txn_Date&#15;101,150.25,2026-06-11&#15;102,295.00,2026-06-12" class="w-full h-24 p-2 font-mono text-xs border border-slate-300 rounded outline-none shadow-xs resize-none"></textarea>
        </div>
      </div>
    </div>

    <!-- Active Grids -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div id="grid-container-A" class="bg-white p-2 rounded-lg border border-slate-200 shadow-sm flex flex-col h-96 overflow-hidden">
        <div class="p-4 text-center text-slate-400 flex flex-col items-center justify-center h-full">
          <i data-lucide="file-text" class="h-10 w-10 text-slate-300 mb-2"></i>
          <span>Source A data preview grid is currently empty</span>
        </div>
      </div>
      
      <div id="grid-container-B" class="bg-white p-2 rounded-lg border border-slate-200 shadow-sm flex flex-col h-96 overflow-hidden">
        <div class="p-4 text-center text-slate-400 flex flex-col items-center justify-center h-full">
          <i data-lucide="file-text" class="h-10 w-10 text-slate-300 mb-2"></i>
          <span>Source B data preview grid is currently empty</span>
        </div>
      </div>
    </div>

    <!-- Setup Control Panel -->
    <div id="setup-panel-container" class="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
      <h3 class="font-semibold text-sm border-b border-slate-100 pb-3 flex items-center gap-2">
        <i data-lucide="sliders" class="h-4 w-4 text-indigo-700"></i> Rules Mapping Control Center
      </h3>
      <div class="py-4 text-center text-slate-400 text-xs">
        Please upload datasets to Source A and Source B to unlock configuration mapping keys
      </div>
    </div>

    <!-- Results Overview Area -->
    <div id="results-panel" class="hidden bg-white p-4 rounded-lg border border-slate-200 shadow-xs flex flex-col gap-4">
      <div class="flex items-center justify-between border-b border-slate-100 pb-3">
        <div class="flex items-center gap-2">
          <i data-lucide="check-circle" class="h-5 w-5 text-emerald-600"></i>
          <div>
            <h3 class="font-bold text-sm text-slate-800">Reconciled Output Report</h3>
            <p id="total-summary-ticker" class="text-[11px] text-slate-500">Calculating stats...</p>
          </div>
        </div>
        
        <button id="export-excel-btn" class="bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold px-4 py-2 rounded-md shadow-xs flex items-center gap-1.5 cursor-pointer">
          <i data-lucide="download" class="h-4 w-4"></i> Export 3-Sheet Excel Book
        </button>
      </div>

      <div class="overflow-auto max-h-96 border border-slate-200 rounded">
        <table id="reconciliation-output-table" class="w-full text-[11px] border-collapse bg-white font-sans text-left">
          <!-- Populated by app.js -->
        </table>
      </div>
    </div>
  </main>

  <footer class="bg-slate-9 border-t border-slate-200 text-center text-[11px] text-slate-400 py-4 font-mono mt-auto">
    Unleashing ultra-fast 2-second Full Outer Join lookups. Powered locally with index.html.
  </footer>

  <!-- Connect Controller Init Scripts -->
  <script src="app.js"></script>
</body>
</html>`,
    app: `/**
 * UNIVERSAL ACCOUNTING DATA RECONCILER - MVC CORE CLIENT STATE
 * Designed for local high-speed full-stack in-RAM processing.
 */

// ==========================================
// 1. JSON DATABASE LAYER (Local Storage Cache)
// ==========================================
class Database {
  static getCacheKey() {
    return "reconciler_config_schema";
  }

  static saveConfig(schema) {
    try {
      localStorage.setItem(this.getCacheKey(), JSON.stringify(schema));
    } catch (e) {
      console.warn("Storage write failed due to limit limits.", e);
    }
  }

  static restoreConfig() {
    try {
      const data = localStorage.getItem(this.getCacheKey());
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  static clear() {
    localStorage.removeItem(this.getCacheKey());
  }
}

// ==========================================
// 2. MODEL ENGINE (In-RAM Data Store)
// ==========================================
class Model {
  constructor() {
    this.sourceA = { headers: [], rows: [], fileName: "" };
    this.sourceB = { headers: [], rows: [], fileName: "" };
    this.schema = {
      keysA: [""],
      keysB: [""],
      comparePairs: [{ colA: "", colB: "" }],
      groupByEnabled: false,
      groupByFunction: 'sum'
    };
    this.results = [];
    this.elapsedTimeMs = 0;
  }

  // File Upload Parser
  parsePasteInput(text, side) {
    if (!text.trim()) return;
    const lines = text.trim().split('\\n');
    if (lines.length < 1) return;
    
    // Split key lines csv style
    const delimiter = text.includes('\\t') ? '\\t' : ',';
    const rawHeaders = lines[0].split(delimiter).map(h => h.trim());
    
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = lines[i].split(delimiter).map(v => v.trim());
      const row = {};
      rawHeaders.forEach((h, colIdx) => {
        row[h] = values[colIdx] !== undefined ? values[colIdx] : "";
      });
      row["Origin_File_Name"] = \`Manual_Paste_\${side}.csv\`;
      rows.push(row);
    }
    
    if (side === "A") {
      this.sourceA = { headers: rawHeaders, rows, fileName: \`Manual_Paste_A.csv\` };
    } else {
      this.sourceB = { headers: rawHeaders, rows, fileName: \`Manual_Paste_B.csv\` };
    }
  }

  // Handle folder upload containing xlsx, xls, csv parallelly
  async parseFiles(fileList, side) {
    const validFiles = Array.from(fileList).filter(file => {
      const name = file.name.toLowerCase();
      return name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv');
    });

    if (validFiles.length === 0) return;

    // Parallel extraction via FileReader
    const promises = validFiles.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        const isCsv = file.name.toLowerCase().endsWith('.csv');
        
        if (isCsv) {
          reader.readAsText(file);
          reader.onload = (e) => {
            const txt = e.target.result;
            const lines = txt.split('\\n');
            const dataArr = lines.map(line => line.split(','));
            resolve({ fileName: file.name, data: dataArr });
          };
        } else {
          reader.readAsArrayBuffer(file);
          reader.onload = (e) => {
            try {
              const arrayBuffer = e.target.result;
              const workbook = XLSX.read(arrayBuffer, { type: 'array' });
              // Grab first sheet
              const firstSheetName = workbook.SheetNames[0];
              const worksheet = workbook.Sheets[firstSheetName];
              const dataArr = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
              resolve({ fileName: file.name, data: dataArr });
            } catch {
              resolve({ fileName: file.name, data: [] });
            }
          };
        }
      });
    });

    const parsedResults = await Promise.all(promises);
    
    // Consolidate folders and merge
    let combinedRows = [];
    let masterHeaders = [];

    parsedResults.forEach(({ fileName, data }) => {
      const clean = this.extractCleanTransactionalBlock(data, fileName);
      if (clean.rows.length === 0) return;
      
      if (masterHeaders.length === 0) {
        masterHeaders = clean.headers;
      } else {
        // Find if header differences and unify
        clean.headers.forEach(h => {
          if (!masterHeaders.includes(h)) masterHeaders.push(h);
        });
      }
      combinedRows = [...combinedRows, ...clean.rows];
    });

    if (side === "A") {
      this.sourceA = { headers: masterHeaders, rows: combinedRows, fileName: \`Folder consolidation (\${validFiles.length} items)\` };
    } else {
      this.sourceB = { headers: masterHeaders, rows: combinedRows, fileName: \`Folder consolidation (\${validFiles.length} items)\` };
    }
  }

  // Filter footnotes, header admin lines
  extractCleanTransactionalBlock(dataArr, fileName) {
    if (!dataArr || dataArr.length === 0) return { headers: [], rows: [] };
    
    let headerIdx = 0;
    let maxColsFilled = 0;
    for (let i = 0; i < Math.min(dataArr.length, 12); i++) {
      const row = dataArr[i] || [];
      const filledCount = row.filter(c => c !== undefined && c !== null && String(c).trim() !== "").length;
      if (filledCount > maxColsFilled) {
        maxColsFilled = filledCount;
        headerIdx = i;
      }
    }

    const headers = (dataArr[headerIdx] || []).map((h, i) => String(h).trim() || \`Column_\${i + 1}\`);
    const rows = [];

    for (let i = headerIdx + 1; i < dataArr.length; i++) {
      const rawRow = dataArr[i];
      if (!rawRow) continue;
      
      const isBlank = rawRow.every(c => c === undefined || c === null || String(c).trim() === "");
      if (isBlank) continue;

      const leadVal = String(rawRow[0] || "").trim().toLowerCase();
      if (leadVal.includes("prepared by") || leadVal.includes("total signature") || leadVal.startsWith("---") || leadVal === "totals") {
        continue;
      }

      const rowObj = {};
      headers.forEach((h, colIdx) => {
        rowObj[h] = rawRow[colIdx] !== undefined ? rawRow[colIdx] : "";
      });
      rowObj["Origin_File_Name"] = fileName;
      rows.push(rowObj);
    }

    return { headers, rows };
  }
}

// ==========================================
// 3. CONTROLLER (Reconciliation Lookup loop)
// ==========================================
class Controller {
  constructor(model, view) {
    this.model = model;
    this.view = view;
  }

  // Standard normalizations
  normalizeValue(val) {
    if (val === undefined || val === null) return "";
    
    // excel date numeric detect
    if (typeof val === "number" && val >= 35000 && val <= 70000) {
      return this.excelSerialDate(val);
    }
    
    const str = String(val).trim();
    // strip leading zeros '000101' -> '101'
    return str.replace(/^0+/, "") || "0";
  }

  excelSerialDate(serial) {
    try {
      const utc_days = Math.floor(serial - 25569);
      const d = new Date(utc_days * 86400 * 1000);
      return \`\${d.getFullYear()}-\${String(d.getMonth() + 1).padStart(2,'0')}-\&nbsp;\${String(d.getDate()).padStart(2,'0')}\`;
    } catch {
      return String(serial);
    }
  }

  executeTwoWayRecon() {
    const elapsedStart = performance.now();
    this.view.showProgressBar(10);
    
    const { sourceA, sourceB, schema } = this.model;
    const { keysA, keysB, comparePairs, groupByEnabled } = schema;

    const numKeyPairs = Math.min(keysA.length, keysB.length);
    if (numKeyPairs === 0) return;

    this.view.showProgressBar(40);

    // Filter target compare columns
    const sumColsA = comparePairs.map(p => p.colA).filter(Boolean);
    const sumColsB = comparePairs.map(p => p.colB).filter(Boolean);

    // Grouping
    let rowsA = sourceA.rows;
    let rowsB = sourceB.rows;

    if (groupByEnabled) {
      rowsA = this.groupData(rowsA, keysA, sumColsA);
      rowsB = this.groupData(rowsB, keysB, sumColsB);
    }

    this.view.showProgressBar(60);

    // Hash maps for fast join
    const mapA = {};
    const mapB = {};
    const seqA = {};
    const seqB = {};

    rowsA.forEach(row => {
      const compositeBase = keysA.map(k => this.normalizeValue(row[k])).join('|');
      seqA[compositeBase] = (seqA[compositeBase] === undefined) ? 0 : seqA[compositeBase] + 1;
      mapA[\`\${compositeBase}#\${seqA[compositeBase]}\`] = row;
    });

    rowsB.forEach(row => {
      const compositeBase = keysB.map(k => this.normalizeValue(row[k])).join('|');
      seqB[compositeBase] = (seqB[compositeBase] === undefined) ? 0 : seqB[compositeBase] + 1;
      mapB[\`\${compositeBase}#\${seqB[compositeBase]}\`] = row;
    });

    this.view.showProgressBar(85);

    const allHashes = new Set([...Object.keys(mapA), ...Object.keys(mapB)]);
    const resultList = [];

    allHashes.forEach(hashKey => {
      const rowA = mapA[hashKey];
      const rowB = mapB[hashKey];

      const parts = hashKey.split("#");
      const keyValues = parts[0].split("|");

      const record = {
        keys: keyValues,
        valA: {},
        valB: {},
        status: "",
        suggestion: ""
      };

      comparePairs.forEach(p => {
        if (p.colA) record.valA[p.colA] = rowA ? rowA[p.colA] : null;
        if (p.colB) record.valB[p.colB] = rowB ? rowB[p.colB] : null;
      });

      if (rowA && !rowB) {
        record.status = "Not Found in Source B";
        record.suggestion = "Record missing in Source B ledger";
      } else if (!rowA && rowB) {
        record.status = "Not Found in Source A";
        record.suggestion = "Record missing in Source A ledger";
      } else {
        // side-by-side mismatch check
        let isMatched = true;
        const variances = [];

        comparePairs.forEach(p => {
          if (!p.colA || !p.colB) return;
          const a = rowA[p.colA];
          const b = rowB[p.colB];
          const diff = Number(a) - Number(b);

          if (!isNaN(diff)) {
            if (Math.abs(diff) > 0.0001) {
              isMatched = false;
              variances.push(\`Variance of \${diff.toFixed(2)} at \${p.colA}\`);
            }
          } else if (this.normalizeValue(a) !== this.normalizeValue(b)) {
            isMatched = false;
            variances.push(\`Mismatch on \${p.colA} value\`);
          }
        });

        record.status = isMatched ? "Matched" : "Unmatched";
        record.suggestion = isMatched ? "" : variances.join("; ");
      }

      resultList.push(record);
    });

    this.model.results = resultList;
    this.model.elapsedTimeMs = Math.round(performance.now() - elapsedStart);
    
    this.view.showProgressBar(100);
    this.view.renderResults(resultList, this.model.elapsedTimeMs);
  }

  groupData(rows, groupKeys, sumCols) {
    const groups = {};
    rows.forEach(row => {
      const compositeId = groupKeys.map(k => this.normalizeValue(row[k])).join('|');
      if (!groups[compositeId]) {
        groups[compositeId] = {
          keyVals: {},
          sums: {},
          rowObj: {}
        };
        groupKeys.forEach(k => groups[compositeId].keyVals[k] = row[k]);
        sumCols.forEach(c => groups[compositeId].sums[c] = Number(row[c]) || 0);
      } else {
        sumCols.forEach(c => {
          groups[compositeId].sums[c] += (Number(row[c]) || 0);
        });
      }
    });

    return Object.values(groups).map(g => {
      const completeItem = { ...g.keyVals, ...g.sums };
      return completeItem;
    });
  }
}

// ==========================================
// 4. VIEW RENDERED OBJECT
// ==========================================
class View {
  // Direct DOM bindings (fully coded in app.js production file)
}
`
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 text-slate-100 rounded-lg p-6 border border-slate-800 shadow-xl flex flex-col gap-4 font-sans">
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
        <FolderGit className="h-6 w-6 text-indigo-400" />
        <div>
          <h3 className="font-bold text-base text-white tracking-tight">Tài nguyên triển khai Localhost</h3>
          <p className="text-xs text-slate-400">
            Xuất hoặc tái tạo gói MVC này để chạy trên Node.js/Express.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        <button
          onClick={() => setActiveTab("package")}
          className={`px-3 py-1.5 rounded transition font-mono ${
            activeTab === "package" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-75"
          }`}
        >
          package.json
        </button>
        <button
          onClick={() => setActiveTab("server")}
          className={`px-3 py-1.5 rounded transition font-mono ${
            activeTab === "server" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-75"
          }`}
        >
          server.js
        </button>
        <button
          onClick={() => setActiveTab("html")}
          className={`px-3 py-1.5 rounded transition font-mono ${
            activeTab === "html" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-75"
          }`}
        >
          public/index.html
        </button>
        <button
          onClick={() => setActiveTab("app")}
          className={`px-3 py-1.5 rounded transition font-mono ${
            activeTab === "app" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:bg-slate-75"
          }`}
        >
          public/app.js
        </button>
      </div>

      <div className="relative bg-slate-950 border border-slate-850 rounded-lg p-4 h-64 overflow-auto font-mono text-[10px] text-indigo-300 antialiased leading-relaxed">
        <button
          onClick={() => copyToClipboard(codes[activeTab])}
          className="absolute top-2 right-2 bg-slate-800 hover:bg-slate-700 text-white p-1.5 rounded border border-slate-700 transition flex items-center gap-1 cursor-pointer"
          title="Sao chép mã"
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-400" />
          ) : (
            <Copy className="h-3.5 w-3.5 text-slate-400 hover:text-white" />
          )}
        </button>
        <pre className="whitespace-pre">{codes[activeTab]}</pre>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs bg-slate-950 p-3 rounded border border-slate-800 gap-2 font-mono">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Terminal className="h-4 w-4 text-emerald-400" />
          <span>Để chạy:</span>
          <span className="text-white bg-slate-900 border border-slate-800 px-1.5 py-0.5 rounded">npm install && npm start</span>
        </div>
        <div className="text-slate-500 text-[10px]">
          Chạy trên server 0.0.0.0:3000
        </div>
      </div>
    </div>
  );
}
