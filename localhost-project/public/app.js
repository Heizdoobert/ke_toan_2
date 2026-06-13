/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * UNIVERSAL ACCOUNTING DATA RECONCILER - MVC LOCAL ENGINE
 * Designed for ultra-fast, local in-RAM financial reconciliation with composite keys.
 */

// ========================================================
// 1. JSON DATABASE LAYER (Local Storage Configuration Cache)
// ========================================================
class Database {
  static getCacheKey() {
    return "reconciler_pro_rules_cache";
  }

  static saveConfig(schema, headersA = [], headersB = []) {
    try {
      const cacheObj = { schema, headersA, headersB };
      localStorage.setItem(this.getCacheKey(), JSON.stringify(cacheObj));
    } catch (e) {
      console.warn("Local storage cache write failed:", e);
    }
  }

  static restoreConfig() {
    try {
      const savedObj = localStorage.getItem(this.getCacheKey());
      return savedObj ? JSON.parse(savedObj) : null;
    } catch {
      return null;
    }
  }

  static clear() {
    localStorage.removeItem(this.getCacheKey());
  }
}

// ========================================================
// 2. MODEL ENGINE (In-RAM Data Store & Parsing Mechanics)
// ========================================================
class Model {
  constructor() {
    this.sourceA = { headers: [], rows: [], fileName: "" };
    this.sourceB = { headers: [], rows: [], fileName: "" };
    
    // Default schema
    this.schema = {
      keysA: [""],
      keysB: [""],
      comparePairs: [{ colA: "", colB: "" }],
      groupByEnabled: false
    };

    this.reconciledResults = [];
    this.elapsedTimeMs = 0;
  }

  // Parse direct paste text (Ctrl+V) from textarea
  parsePasteInput(text, side) {
    if (!text.trim()) return;
    const delimiter = text.includes("\t") ? "\t" : ",";
    const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
    if (lines.length < 1) return;

    const headers = lines[0].split(delimiter).map(h => h.trim());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(delimiter).map(c => c.trim());
      const rowObj = {};
      headers.forEach((h, idx) => {
        rowObj[h] = cells[idx] !== undefined ? cells[idx] : "";
      });
      rowObj["Origin_File_Name"] = `Manual_Paste_${side}.csv`;
      rows.push(rowObj);
    }

    if (side === "A") {
      this.sourceA = { headers, rows, fileName: `Manual paste (${rows.length} rows)` };
    } else {
      this.sourceB = { headers, rows, fileName: `Manual paste (${rows.length} rows)` };
    }
  }

  // Handle Directory Folder files reading in Parallel client-side RAM
  async parseFiles(files, side) {
    const validFiles = Array.from(files).filter(f => {
      const ext = f.name.split(".").pop().toLowerCase();
      return ext === "xlsx" || ext === "xls" || ext === "csv";
    });

    if (validFiles.length === 0) return;

    // Parallel file parsing
    const parsedResults = await Promise.all(
      validFiles.map(file => {
        return new Promise((resolve) => {
          const reader = new FileReader();
          const extName = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();

          if (extName === ".csv") {
            reader.readAsText(file);
            reader.onload = (e) => {
              try {
                const text = e.target.result || "";
                const rowsArr = text.split("\n").map(l => l.split(","));
                const clean = this.extractCleanTransactionalBlock(rowsArr, file.name);
                resolve({ headers: clean.headers, rows: clean.rows, name: file.name });
              } catch {
                resolve({ headers: [], rows: [], name: file.name });
              }
            };
          } else {
            reader.readAsArrayBuffer(file);
            reader.onload = (e) => {
              try {
                const arrayBuffer = e.target.result;
                const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: "array" });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const rowsArr = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                const clean = this.extractCleanTransactionalBlock(rowsArr, file.name);
                resolve({ headers: clean.headers, rows: clean.rows, name: file.name });
              } catch {
                resolve({ headers: [], rows: [], name: file.name });
              }
            };
          }
        });
      })
    );

    let masterHeaders = [];
    let combinedRows = [];

    parsedResults.forEach(pkg => {
      if (pkg.rows.length === 0) return;
      pkg.headers.forEach(h => {
        if (!masterHeaders.includes(h)) masterHeaders.push(h);
      });
      combinedRows = [...combinedRows, ...pkg.rows];
    });

    const label = validFiles.length === 1 
      ? validFiles[0].name 
      : `Consolidated Folder (${validFiles.length} item files)`;

    if (side === "A") {
      this.sourceA = { headers: masterHeaders, rows: combinedRows, fileName: label };
    } else {
      this.sourceB = { headers: masterHeaders, rows: combinedRows, fileName: label };
    }
  }

  // Filter footprint administrative elements, extracting only raw trade block
  extractCleanTransactionalBlock(dataArr, fileName) {
    if (!dataArr || dataArr.length === 0) return { headers: [], rows: [] };
    
    // Deduce proper start rows
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

    const headers = (dataArr[headerIdx] || []).map((h, i) => String(h).trim() || `Column_${i + 1}`);
    const rows = [];

    for (let i = headerIdx + 1; i < dataArr.length; i++) {
      const rawRow = dataArr[i];
      if (!rawRow) continue;
      
      const isBlank = rawRow.every(c => c === undefined || c === null || String(c).trim() === "");
      if (isBlank) continue;

      const flagCell = String(rawRow[0] || "").trim().toLowerCase();
      if (
        flagCell.includes("prepared by") || 
        flagCell.includes("total signature") || 
        flagCell.startsWith("---") || 
        flagCell === "totals"
      ) {
        continue; // skip footnote rows
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

// ========================================================
// 3. CONTROLLER (Reconciliation Rules Alignment Engine)
// ========================================================
class Controller {
  constructor(model, view) {
    this.model = model;
    this.view = view;
  }

  // Value Normalizations
  normalizeValue(val) {
    if (val === undefined || val === null) return "";
    
    // Excel numeric date serialization check
    if (typeof val === "number" && val >= 35000 && val <= 70000) {
      return this.excelSerialDateToISOString(val);
    }
    
    const str = String(val).trim();
    // Strip leading zeroes automatically (e.g. 000185 -> 185)
    return str.replace(/^0+/, "") || "0";
  }

  excelSerialDateToISOString(serial) {
    try {
      const days = Math.floor(serial - 25569);
      const d = new Date(days * 86400 * 1000);
      if (isNaN(d.getTime())) return String(serial);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    } catch {
      return String(serial);
    }
  }

  // Scan row formats under criteria pairs to diagnose differences
  guessDataType(rows, column) {
    if (!rows || rows.length === 0 || !column) return "String";
    let numericCount = 0;
    let nonBlank = 0;
    const sample = rows.slice(0, 100);

    sample.forEach(r => {
      const val = r[column];
      if (val !== undefined && val !== null && String(val).trim() !== "") {
        nonBlank++;
        if (!isNaN(Number(val))) numericCount++;
      }
    });

    if (nonBlank > 0 && (numericCount / nonBlank) > 0.8) return "Numeric";
    return "String";
  }

  validateSchemaCompatibility() {
    const { keysA, keysB } = this.model.schema;
    const limit = Math.min(keysA.length, keysB.length);
    const warnings = [];

    for (let i = 0; i < limit; i++) {
      const colA = keysA[i];
      const colB = keysB[i];
      if (!colA || !colB) continue;

      const typeA = this.guessDataType(this.model.sourceA.rows, colA);
      const typeB = this.guessDataType(this.model.sourceB.rows, colB);

      if (typeA !== typeB) {
        warnings.push({
          msg: `Type Mismatch on matching criteria pair #${i+1}: "${colA}" on A is predominantly ${typeA} format, while "${colB}" on Source B is ${typeB}. Direct lookups will fail.`
        });
      }
    }

    this.view.renderWarnings(warnings);
  }

  // Core Full Outer Join algorithm in RAM sub-2-seconds utilizing Hash Maps
  runReconciliation() {
    const elapsedStart = performance.now();
    this.view.updateProgressSlider(25);

    const { keysA, keysB, comparePairs, groupByEnabled } = this.model.schema;
    const minKeysCount = Math.min(keysA.length, keysB.length);
    if (minKeysCount === 0 || !keysA[0] || !keysB[0]) {
      alert("Please map at least one Row Matching Criteria Key pair.");
      this.view.updateProgressSlider(0);
      return;
    }

    this.view.updateProgressSlider(50);

    const targetNumericA = comparePairs.map(p => p.colA).filter(Boolean);
    const targetNumericB = comparePairs.map(p => p.colB).filter(Boolean);

    // Apply vertical aggregation Group By if toggle is checked
    let processedRowsA = this.model.sourceA.rows;
    let processedRowsB = this.model.sourceB.rows;

    if (groupByEnabled) {
      processedRowsA = this.aggregateDataGroup(processedRowsA, keysA, targetNumericA);
      processedRowsB = this.aggregateDataGroup(processedRowsB, keysB, targetNumericB);
    }

    this.view.updateProgressSlider(75);

    // Double-hashed structures to map sequence duplicates sequentially without row mismatch
    const mapA = {};
    const mapB = {};
    const seqCounterA = {};
    const seqCounterB = {};

    processedRowsA.forEach(row => {
      const baseKey = keysA.map(k => this.normalizeValue(row[k])).join("|");
      seqCounterA[baseKey] = (seqCounterA[baseKey] === undefined) ? 0 : seqCounterA[baseKey] + 1;
      const combinedHash = `${baseKey}#${seqCounterA[baseKey]}`;
      mapA[combinedHash] = row;
    });

    processedRowsB.forEach(row => {
      const baseKey = keysB.map(k => this.normalizeValue(row[k])).join("|");
      seqCounterB[baseKey] = (seqCounterB[baseKey] === undefined) ? 0 : seqCounterB[baseKey] + 1;
      const combinedHash = `${baseKey}#${seqCounterB[baseKey]}`;
      mapB[combinedHash] = row;
    });

    const unionKeys = new Set([...Object.keys(mapA), ...Object.keys(mapB)]);
    const reconciliationSummary = [];

    unionKeys.forEach(hashKey => {
      const rowA = mapA[hashKey];
      const rowB = mapB[hashKey];

      const parts = hashKey.split("#");
      const baseCompositeKey = parts[0];
      const rawCriteriaValues = baseCompositeKey.split("|");

      // Structured report values
      const criteria = {};
      keysA.forEach((k, idx) => {
        criteria[`Key_A_${idx + 1}`] = rowA ? rowA[k] : (rawCriteriaValues[idx] || "");
      });
      keysB.forEach((k, idx) => {
        criteria[`Key_B_${idx + 1}`] = rowB ? rowB[k] : (rawCriteriaValues[idx] || "");
      });

      const valuesA = {};
      const valuesB = {};

      comparePairs.forEach(pair => {
        if (pair.colA) valuesA[pair.colA] = rowA ? rowA[pair.colA] : null;
        if (pair.colB) valuesB[pair.colB] = rowB ? rowB[pair.colB] : null;
      });

      // Track provenance origin 
      const originFileA = rowA ? (rowA["Origin_File_Name"] || "") : "";
      const originFileB = rowB ? (rowB["Origin_File_Name"] || "") : "";
      valuesA["Origin_File_Name"] = originFileA;
      valuesB["Origin_File_Name"] = originFileB;

      let status = "Matched";
      let discrepancy = "";

      if (rowA && !rowB) {
        status = "Not Found in Source B";
        discrepancy = `Row key exists only on Source A (File: ${originFileA})`;
      } else if (!rowA && rowB) {
        status = "Not Found in Source A";
        discrepancy = `Row key exists only on Source B (File: ${originFileB})`;
      } else {
        // Evaluate side-by-side matches
        let isMatched = true;
        const variations = [];

        comparePairs.forEach(pair => {
          if (!pair.colA || !pair.colB) return;
          const valA = rowA[pair.colA];
          const valB = rowB[pair.colB];

          const numA = Number(valA);
          const numB = Number(valB);

          if (!isNaN(numA) && !isNaN(numB)) {
            const diff = numA - numB;
            if (Math.abs(diff) > 0.0001) {
              isMatched = false;
              variations.push(`Variance [${diff.toFixed(2)}] at [${pair.colA}]`);
            }
          } else {
            const normA = this.normalizeValue(valA);
            const normB = this.normalizeValue(valB);
            if (normA !== normB) {
              isMatched = false;
              variations.push(`Mismatch: [${pair.colA}] "${valA}" vs "${valB}"`);
            }
          }
        });

        if (!isMatched) {
          status = "Unmatched";
          discrepancy = variations.join("; ");
        }
      }

      reconciliationSummary.push({ criteria, valuesA, valuesB, status, discrepancy });
    });

    this.model.reconciledResults = reconciliationSummary;
    this.model.elapsedTimeMs = Math.round(performance.now() - elapsedStart);

    this.view.updateProgressSlider(100);
    this.view.renderReconciliationReport(reconciliationSummary, this.model.elapsedTimeMs, this.model.schema);
  }

  aggregateDataGroup(rows, groupKeys, sumCols) {
    const groups = {};

    rows.forEach(row => {
      const compositeId = groupKeys.map(k => this.normalizeValue(row[k])).join("|");
      const origin = row["Origin_File_Name"] || "";

      if (!groups[compositeId]) {
        const keyVals = {};
        groupKeys.forEach(k => keyVals[k] = row[k]);

        const sumsObj = {};
        sumCols.forEach(c => sumsObj[c] = Number(row[c]) || 0);

        groups[compositeId] = {
          keyVals,
          sums: sumsObj,
          originFiles: new Set(origin ? [origin] : [])
        };
      } else {
        sumCols.forEach(c => {
          const v = Number(row[c]);
          if (!isNaN(v)) {
            groups[compositeId].sums[c] += v;
          }
        });
        if (origin) groups[compositeId].originFiles.add(origin);
      }
    });

    return Object.values(groups).map(g => {
      const rowItem = { ...g.keyVals, ...g.sums };
      if (g.originFiles.size > 0) {
        rowItem["Origin_File_Name"] = Array.from(g.originFiles).join(", ");
      }
      return rowItem;
    });
  }
}

// ========================================================
// 4. VIEW RENDER CONTROLS (DOM bindings and UI events)
// ========================================================
class View {
  constructor() {
    // Input binders
    this.uploadA = document.getElementById("upload-input-A");
    this.uploadB = document.getElementById("upload-input-B");
    
    this.pasteAreaA = document.getElementById("paste-textarea-A");
    this.pasteAreaB = document.getElementById("paste-textarea-B");
    this.parseBtnA = document.getElementById("parse-paste-btn-A");
    this.parseBtnB = document.getElementById("parse-paste-btn-B");

    this.progressSlider = document.getElementById("progress-bar-slider");
    this.elapsedTicker = document.getElementById("elapsed-time-ticker");
    
    // Grid containers
    this.gridContainerA = document.getElementById("grid-A-container");
    this.gridContainerB = document.getElementById("grid-B-container");

    this.rulesBoard = document.getElementById("rules-setup-board");
    this.rulesFieldsWrapper = document.getElementById("setup-panel-fields");

    this.resultsCard = document.getElementById("audit-results-card");
    this.resultsStatTicker = document.getElementById("outputs-stat-ticker");
    this.resultsTable = document.getElementById("reconciliation-output-table");

    this.downloadBtn = document.getElementById("download-excel-btn");
    this.clearCacheBtn = document.getElementById("clear-cache-btn");

    this.setupTabEvents();
  }

  setupTabEvents() {
    // Source A tabs
    document.getElementById("tab-file-A").addEventListener("click", (e) => {
      this.toggleInputTab("A", "file", e.target);
    });
    document.getElementById("tab-paste-A").addEventListener("click", (e) => {
      this.toggleInputTab("A", "paste", e.target);
    });

    // Source B tabs
    document.getElementById("tab-file-B").addEventListener("click", (e) => {
      this.toggleInputTab("B", "file", e.target);
    });
    document.getElementById("tab-paste-B").addEventListener("click", (e) => {
      this.toggleInputTab("B", "paste", e.target);
    });
  }

  toggleInputTab(side, tabType, activeBtn) {
    const oppType = tabType === "file" ? "paste" : "file";
    
    document.getElementById(`file-input-wrapper-${side}`).style.display = tabType === "file" ? "block" : "none";
    document.getElementById(`paste-input-wrapper-${side}`).style.display = tabType === "paste" ? "block" : "none";
    
    const siblingBtn = document.getElementById(`tab-${oppType}-${side}`);
    activeBtn.className = "px-2 py-1 rounded bg-white text-slate-800 shadow-2xs font-semibold cursor-pointer";
    siblingBtn.className = "px-2 py-1 rounded text-slate-500 hover:text-slate-800 cursor-pointer";
  }

  updateProgressSlider(pct) {
    this.progressSlider.style.width = `${pct}%`;
  }

  renderElapsedTime(ms) {
    this.elapsedTicker.textContent = `${ms} ms / client RAM calculations`;
  }

  renderWarnings(warnings) {
    const selector = document.getElementById("validation-alerts-container");
    if (selector) selector.remove();

    if (warnings.length === 0) return;

    const alertDiv = document.createElement("div");
    alertDiv.id = "validation-alerts-container";
    alertDiv.className = "bg-amber-50 border border-amber-200 text-amber-900 rounded-md p-3 text-xs flex flex-col gap-1.5 mb-4";
    alertDiv.innerHTML = `
      <div class="flex items-center gap-1.5 font-bold text-amber-900">
        <i data-lucide="alert-triangle" class="h-4 w-4 text-amber-600"></i>
        <span>Data Formats Warnings</span>
      </div>
      <ul class="list-disc pl-4 space-y-1 text-[11px]">
        ${warnings.map(w => `<li>${w.msg}</li>`).join("")}
      </ul>
    `;
    this.rulesFieldsWrapper.prepend(alertDiv);
    lucide.createIcons();
  }

  // Render Grid tables previews with Inline Editing row addition and deletion features
  renderPreviewGrid(side, headers, rows, onUpdate) {
    const container = side === "A" ? this.gridContainerA : this.gridContainerB;
    container.innerHTML = "";

    if (headers.length === 0) {
      container.innerHTML = `
        <div class="p-8 text-center text-slate-400 flex flex-col items-center justify-center flex-grow h-full">
          <i data-lucide="file-spreadsheet" class="h-10 w-10 text-slate-300 stroke-1 mb-2"></i>
          <span class="text-xs">Dynamic grid ${side} values preview is empty</span>
        </div>
      `;
      lucide.createIcons();
      return;
    }

    // Creating Header actions panel
    const actionToolbar = document.createElement("div");
    actionToolbar.className = "bg-slate-50 border-b border-slate-200 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs font-sans shrink-0";
    actionToolbar.innerHTML = `
      <div class="flex items-center gap-2">
        <button id="addrow-btn-${side}" class="flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 px-2 py-1 border border-slate-205 rounded cursor-pointer font-semibold shadow-3xs hover:text-slate-900 transition text-[11px]">
          <i data-lucide="plus" class="h-3 w-3"></i> Add Row
        </button>
        <button id="delrow-btn-${side}" class="flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 px-2 py-1 border border-rose-200 rounded cursor-pointer font-semibold shadow-3xs transition text-[11px]">
          <i data-lucide="trash-2" class="h-3 w-3"></i> Delete Row
        </button>
      </div>
      <div class="flex items-center gap-2">
        <button id="addcol-btn-${side}" class="flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 px-2 py-1 border border-slate-205 rounded cursor-pointer font-semibold shadow-3xs hover:text-slate-900 transition text-[11px]">
          <i data-lucide="plus" class="h-3 w-3"></i> Add Col
        </button>
        <button id="delcol-btn-${side}" class="flex items-center gap-1 bg-rose-50 hover:bg-rose-100 text-rose-700 px-2 py-1 border border-rose-200 rounded cursor-pointer font-semibold shadow-3xs transition text-[11px]">
          <i data-lucide="trash-2" class="h-3 w-3"></i> Delete Col
        </button>
      </div>
    `;

    const tableWrapper = document.createElement("div");
    tableWrapper.className = "overflow-auto flex-grow";

    const table = document.createElement("table");
    table.className = "w-full text-[11px] text-left border-collapse bg-white font-sans whitespace-nowrap";

    // Build the exact Thead
    let tHeadRaw = `
      <thead class="bg-slate-100 sticky top-0 border-b border-slate-200 font-semibold text-slate-600 select-none">
        <tr>
          <th class="w-10 px-2 text-center border-r border-slate-200">
            <input type="checkbox" id="checkall-rows-${side}" class="rounded border-slate-305 text-indigo-600 cursor-pointer h-3.5 w-3.5" />
          </th>
    `;
    headers.forEach(h => {
      tHeadRaw += `
        <th class="px-3 py-2 border-r border-slate-200 min-w-[110px]">
          <label class="flex items-center gap-1.5 cursor-pointer">
            <input type="checkbox" data-col="${h}" class="col-checkbox-${side} rounded border-slate-300 text-indigo-505 h-3.5 w-3.5" />
            <span class="truncate">${h}</span>
          </label>
        </th>
      `;
    });
    tHeadRaw += `</tr></thead>`;
    table.innerHTML = tHeadRaw;

    // Body rows
    const tbody = document.createElement("tbody");
    tbody.className = "divide-y divide-slate-100";

    rows.forEach((row, rIdx) => {
      const tr = document.createElement("tr");
      tr.className = "hover:bg-slate-55 transition-colors";
      
      let cellsRaw = `
        <td class="px-2 py-1 text-center border-r border-slate-200">
          <input type="checkbox" data-row="${rIdx}" class="row-checkbox-${side} rounded border-slate-300 text-slate-700 cursor-pointer h-3.5 w-3.5" />
        </td>
      `;

      headers.forEach(col => {
        const value = row[col] !== undefined ? row[col] : "";
        cellsRaw += `
          <td data-row="${rIdx}" data-col="${col}" class="px-3 py-1.5 border-r border-slate-200 truncate max-w-[140px] relative group cursor-text hover:bg-slate-50 transition">
            <span class="cell-text-node">${value}</span>
          </td>
        `;
      });

      tr.innerHTML = cellsRaw;
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    tableWrapper.appendChild(table);
    container.appendChild(actionToolbar);
    container.appendChild(tableWrapper);
    lucide.createIcons();

    // Event hooks row insertion
    document.getElementById(`addrow-btn-${side}`).addEventListener("click", () => {
      const empty = {};
      headers.forEach(h => empty[h] = "");
      empty["Origin_File_Name"] = "Manual_Row";
      rows.push(empty);
      onUpdate(headers, rows);
    });

    // Row deletions
    document.getElementById(`delrow-btn-${side}`).addEventListener("click", () => {
      const rowBoxes = document.querySelectorAll(`.row-checkbox-${side}:checked`);
      if (rowBoxes.length === 0) return;
      const checkedInds = Array.from(rowBoxes).map(box => parseInt(box.dataset.row));
      const filtered = rows.filter((_, i) => !checkedInds.includes(i));
      onUpdate(headers, filtered);
    });

    // Add columns
    document.getElementById(`addcol-btn-${side}`).addEventListener("click", () => {
      const colName = prompt("Insert new column name:");
      if (!colName) return;
      const clean = colName.trim();
      if (!clean || headers.includes(clean)) return;
      headers.push(clean);
      rows.forEach(r => r[clean] = "");
      onUpdate(headers, rows);
    });

    // Del columns
    document.getElementById(`delcol-btn-${side}`).addEventListener("click", () => {
      const colBoxes = document.querySelectorAll(`.col-checkbox-${side}:checked`);
      if (colBoxes.length === 0) return;
      const colNames = Array.from(colBoxes).map(box => box.dataset.col);
      const filteredHeaders = headers.filter(h => !colNames.includes(h));
      const filteredRows = rows.map(r => {
        const copy = { ...r };
        colNames.forEach(c => delete copy[c]);
        return copy;
      });
      onUpdate(filteredHeaders, filteredRows);
    });

    // All-rows toggle
    document.getElementById(`checkall-rows-${side}`).addEventListener("change", (e) => {
      const checked = e.target.checked;
      document.querySelectorAll(`.row-checkbox-${side}`).forEach(box => box.checked = checked);
    });

    // Inline Editing double clicks cell edits
    tbody.querySelectorAll("td[data-col]").forEach(cell => {
      cell.addEventListener("dblclick", () => {
        const rIdx = parseInt(cell.dataset.row);
        const colName = cell.dataset.col;
        const textNode = cell.querySelector(".cell-textnode");
        const currVal = rows[rIdx][colName] || "";

        cell.innerHTML = `
          <input type="text" class="w-full text-xs px-1.5 py-1 border border-indigo-500 rounded outline-none ring-1 ring-indigo-300 bg-linear-to-b" value="${currVal}"/>
        `;
        const input = cell.querySelector("input");
        input.focus();

        const saveHandler = () => {
          const newVal = input.value;
          rows[rIdx][colName] = newVal;
          cell.innerHTML = `<span class="cell-text-node">${newVal}</span>`;
          onUpdate(headers, rows);
        };

        input.addEventListener("blur", saveHandler);
        input.addEventListener("keydown", (evt) => {
          if (evt.key === "Enter") saveHandler();
          if (evt.key === "Escape") {
            cell.innerHTML = `<span class="cell-text-node">${currVal}</span>`;
            onUpdate(headers, rows);
          }
        });
      });
    });
  }

  // Setup Rules dynamic layouts
  renderSetupParametersBoard(headersA, headersB, schema, onSchemaChange, onRun) {
    this.rulesFieldsWrapper.innerHTML = "";

    const cardFields = document.createElement("div");
    cardFields.className = "flex flex-col gap-4 font-sans text-xs";

    // 1. Matched criteria
    let keysMappingHTML = `
      <div class="flex flex-col gap-2">
        <label class="font-semibold text-slate-700">Row Matching Keys (Composite Multi Key pairing - Max 4)</label>
        <div id="criteria-rows-rack" class="flex flex-col gap-2">
    `;

    schema.keysA.forEach((_, idx) => {
      keysMappingHTML += `
        <div class="flex items-center gap-2 bg-slate-55 p-2 rounded border border-slate-150">
          <div class="grid grid-cols-2 gap-2 flex-grow">
            <div>
              <span class="block text-[9px] text-slate-400 mb-0.5 font-semibold">Source A Column</span>
              <select data-idx="${idx}" data-side="A" class="rules-key-select w-full p-1 border border-slate-300 bg-white rounded outline-none text-xs">
                <option value="">-- Select Column --</option>
                ${headersA.map(h => `<option value="${h}" ${schema.keysA[idx] === h ? "selected" : ""}>${h}</option>`).join("")}
              </select>
            </div>
            <div>
              <span class="block text-[9px] text-slate-400 mb-0.5 font-semibold">Source B Column</span>
              <select data-idx="${idx}" data-side="B" class="rules-key-select w-full p-1 border border-slate-300 bg-white rounded outline-none text-xs">
                <option value="">-- Select Column --</option>
                ${headersB.map(h => `<option value="${h}" ${schema.keysB[idx] === h ? "selected" : ""}>${h}</option>`).join("")}
              </select>
            </div>
          </div>
          ${schema.keysA.length > 1 ? `
            <button data-idx="${idx}" class="remove-key-row-btn p-1 mt-3.5 text-slate-400 hover:text-rose-600 transition cursor-pointer">
              <i data-lucide="trash-2" class="h-4 w-4"></i>
            </button>
          ` : ""}
        </div>
      `;
    });

    keysMappingHTML += `
        </div>
        ${schema.keysA.length < 4 ? `
          <button id="add-key-pair-btn" class="text-indigo-650 hover:text-indigo-850 font-semibold flex items-center gap-1 self-start text-[11px] cursor-pointer">
            <i data-lucide="plus" class="h-3.5 w-3.5"></i> Add Extra Row Match Key Pair
          </button>
        ` : ""}
      </div>
    `;

    // 2. Comparison Target Columns
    let comparisonsHTML = `
      <div class="flex flex-col gap-2 mt-2">
        <label class="font-semibold text-slate-700">Side-by-Side Target Value Column Comparisons</label>
        <div id="compare-rows-rack" class="flex flex-col gap-2">
    `;

    schema.comparePairs.forEach((pair, idx) => {
      comparisonsHTML += `
        <div class="flex items-center gap-2 bg-slate-55 p-2 rounded border border-slate-150">
          <div class="grid grid-cols-2 gap-2 flex-grow">
            <div>
              <span class="block text-[9px] text-slate-400 mb-0.5 font-semibold">Source A Value Target</span>
              <select data-idx="${idx}" data-side="A" class="compare-col-select w-full p-1 border border-slate-300 bg-white rounded outline-none text-xs">
                <option value="">-- Select Column --</option>
                ${headersA.map(h => `<option value="${h}" ${pair.colA === h ? "selected" : ""}>${h}</option>`).join("")}
              </select>
            </div>
            <div>
              <span class="block text-[9px] text-slate-400 mb-0.5 font-semibold">Source B Value Target</span>
              <select data-idx="${idx}" data-side="B" class="compare-col-select w-full p-1 border border-slate-300 bg-white rounded outline-none text-xs">
                <option value="">-- Select Column --</option>
                ${headersB.map(h => `<option value="${h}" ${pair.colB === h ? "selected" : ""}>${h}</option>`).join("")}
              </select>
            </div>
          </div>
          ${schema.comparePairs.length > 1 ? `
            <button data-idx="${idx}" class="remove-compare-pair-btn p-1 mt-3.5 text-slate-400 hover:text-rose-600 transition cursor-pointer">
              <i data-lucide="trash-2" class="h-4 w-4"></i>
            </button>
          ` : ""}
        </div>
      `;
    });

    comparisonsHTML += `
        </div>
        <button id="add-compare-pair-btn" class="text-indigo-650 hover:text-indigo-850 font-semibold flex items-center gap-1 self-start text-[11px] cursor-pointer">
          <i data-lucide="plus" class="h-3.5 w-3.5"></i> Add Value Target Column Pair
        </button>
      </div>
    `;

    // 3. Group by calculations
    const groupByHTML = `
      <div class="bg-slate-50 p-3 rounded-lg border border-slate-200 flex items-center justify-between text-xs mt-2">
        <div>
          <span class="font-bold text-slate-700">Calculate & Group By Duplicates</span>
          <p class="text-[10px] text-slate-400 leading-tight">Aggregate recurring matched items and summarize sums dynamically.</p>
        </div>
        <button id="group-by-toggle-btn" class="relative inline-flex h-5 w-10 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none bg-slate-300">
          <span id="group-by-bullet" class="pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 translate-x-0"></span>
        </button>
      </div>
    `;

    // 4. Executon button Trigger
    const buttonHTML = `
      <button id="execute-recon-btn" class="w-full mt-4 py-2.5 px-4 rounded-md text-xs font-semibold text-center tracking-wide text-white bg-indigo-700 hover:bg-indigo-800 transition active:scale-99 shadow-xs cursor-pointer">
        Run Fast Reconciliation (under 2s)
      </button>
    `;

    cardFields.innerHTML = keysMappingHTML + comparisonsHTML + groupByHTML + buttonHTML;
    this.rulesFieldsWrapper.appendChild(cardFields);
    lucide.createIcons();

    // Toggle GroupBy buttons
    const toggleBtn = document.getElementById("group-by-toggle-btn");
    const bullet = document.getElementById("group-by-bullet");
    if (schema.groupByEnabled) {
      toggleBtn.className = "relative inline-flex h-5 w-10 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none bg-indigo-600";
      bullet.className = "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 translate-x-5";
    }

    // Bind inputs changes
    toggleBtn.addEventListener("click", () => {
      schema.groupByEnabled = !schema.groupByEnabled;
      onSchemaChange(schema);
    });

    // Key selection mapping updates
    cardFields.querySelectorAll(".rules-key-select").forEach(select => {
      select.addEventListener("change", (e) => {
        const idx = parseInt(select.dataset.idx);
        const side = select.dataset.side;
        if (side === "A") schema.keysA[idx] = e.target.value;
        else schema.keysB[idx] = e.target.value;
        onSchemaChange(schema);
      });
    });

    cardFields.querySelectorAll(".compare-col-select").forEach(select => {
      select.addEventListener("change", (e) => {
        const idx = parseInt(select.dataset.idx);
        const side = select.dataset.side;
        if (side === "A") schema.comparePairs[idx].colA = e.target.value;
        else schema.comparePairs[idx].colB = e.target.value;
        onSchemaChange(schema);
      });
    });

    // Insert keys
    const addKeyPairBtn = document.getElementById("add-key-pair-btn");
    if (addKeyPairBtn) {
      addKeyPairBtn.addEventListener("click", () => {
        if (schema.keysA.length >= 4) return;
        schema.keysA.push("");
        schema.keysB.push("");
        onSchemaChange(schema);
      });
    }

    // Delete keys
    cardFields.querySelectorAll(".remove-key-row-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.idx);
        schema.keysA.splice(idx, 1);
        schema.keysB.splice(idx, 1);
        onSchemaChange(schema);
      });
    });

    // Insert compare columns
    document.getElementById("add-compare-pair-btn").addEventListener("click", () => {
      schema.comparePairs.push({ colA: "", colB: "" });
      onSchemaChange(schema);
    });

    // Delete compare columns
    cardFields.querySelectorAll(".remove-compare-pair-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.idx);
        schema.comparePairs.splice(idx, 1);
        onSchemaChange(schema);
      });
    });

    // Bind direct engine compilation triggers
    document.getElementById("execute-recon-btn").addEventListener("click", onRun);
  }

  // Render Horizontal Reconciled Report Sheets table
  renderReconciliationReport(results, elapsedMs, schema) {
    this.resultsCard.classList.remove("hidden");
    
    const matched = results.filter(r => r.status === "Matched").length;
    const unmatched = results.filter(r => r.status === "Unmatched").length;
    this.resultsStatTicker.innerHTML = `
      Matched: <span class="text-emerald-600 font-bold">${matched}</span> 
      | Unmatched: <span class="text-rose-600 font-bold">${unmatched}</span>
    `;

    this.elapsedTicker.textContent = `${elapsedMs} ms / client RAM calculations`;
    this.resultsTable.innerHTML = "";

    // Headings
    let thead = `
      <thead class="bg-slate-100 sticky top-0 border-b border-slate-200 font-semibold text-slate-700 whitespace-nowrap">
        <tr>
    `;
    schema.keysA.forEach((_, i) => {
      thead += `<th class="px-3 py-2 border-r border-slate-200">Key A (${schema.keysA[i] || `Pair ${i+1}`})</th>`;
    });
    schema.keysB.forEach((_, i) => {
      thead += `<th class="px-3 py-2 border-r border-slate-200">Key B (${schema.keysB[i] || `Pair ${i+1}`})</th>`;
    });

    schema.comparePairs.forEach(pair => {
      if (pair.colA) thead += `<th class="px-3 py-2 border-r border-slate-200 bg-slate-50">Source A Value (${pair.colA})</th>`;
      if (pair.colB) thead += `<th class="px-3 py-2 border-r border-slate-200 bg-slate-50">Source B Value (${pair.colB})</th>`;
    });

    thead += `
          <th class="px-3 py-2 border-r border-slate-200">A Origin File</th>
          <th class="px-3 py-2 border-r border-slate-200">B Origin File</th>
          <th class="px-3 py-2 border-r border-slate-200 text-slate-900 font-bold">Status</th>
          <th class="px-3 py-2 text-slate-900 font-bold">Variance / Discrepancy Suggested</th>
        </tr>
      </thead>
    `;

    let tbody = `<tbody class="divide-y divide-slate-100">`;

    results.forEach(row => {
      let statusBg = "bg-emerald-50 text-emerald-800 border-emerald-200";
      if (row.status === "Unmatched") statusBg = "bg-rose-50 text-rose-800 border-rose-250";
      else if (row.status.includes("Source")) statusBg = "bg-amber-50 text-amber-805 border-amber-250";

      tbody += `<tr class="hover:bg-slate-55 transition-colors whitespace-nowrap">`;

      // Keys display
      schema.keysA.forEach((_, i) => {
        tbody += `<td class="px-3 py-2 border-r border-slate-150 font-mono text-slate-700">${row.criteria[`Key_A_${i + 1}`] !== undefined ? row.criteria[`Key_A_${i+1}`] : ""}</td>`;
      });
      schema.keysB.forEach((_, i) => {
        tbody += `<td class="px-3 py-2 border-r border-slate-150 font-mono text-slate-700">${row.criteria[`Key_B_${i + 1}`] !== undefined ? row.criteria[`Key_B_${i+1}`] : ""}</td>`;
      });

      // Target numbers
      schema.comparePairs.forEach(pair => {
        if (pair.colA) tbody += `<td class="px-3 py-2 border-r border-slate-150 text-right font-mono bg-slate-55">${row.valuesA[pair.colA] !== null && row.valuesA[pair.colA] !== undefined ? row.valuesA[pair.colA] : "—"}</td>`;
        if (pair.colB) tbody += `<td class="px-3 py-2 border-r border-slate-150 text-right font-mono bg-slate-55">${row.valuesB[pair.colB] !== null && row.valuesB[pair.colB] !== undefined ? row.valuesB[pair.colB] : "—"}</td>`;
      });

      tbody += `
        <td class="px-3 py-2 border-r border-slate-150 truncate max-w-[140px] text-slate-500 font-mono">${row.valuesA["Origin_File_Name"] || "—"}</td>
        <td class="px-3 py-2 border-r border-slate-150 truncate max-w-[140px] text-slate-500 font-mono">${row.valuesB["Origin_File_Name"] || "—"}</td>
        <td class="px-3 py-2 border-r border-slate-150 text-center">
          <span class="px-2 py-0.5 border ${statusBg} text-[10px] font-bold rounded-full">${row.status}</span>
        </td>
        <td class="px-3 py-2 text-slate-600 font-semibold break-all whitespace-normal min-w-[200px]">${row.discrepancy || `<span class="text-emerald-600">Verification Match Success</span>`}</td>
      </tr>`;
    });

    tbody += `</tbody>`;

    this.resultsTable.innerHTML = thead + tbody;
    this.resultsCard.scrollIntoView({ behavior: "smooth" });
  }
}

// ========================================================
// 5. APPLICATION MVC INITIALIZER
// ========================================================
document.addEventListener("DOMContentLoaded", () => {
  const model = new Model();
  const view = new View();
  const controller = new Controller(model, view);

  // Restore rule mappings state from Local JSON database on startup (F5 recall)
  const cachedRules = Database.restoreConfig();
  if (cachedRules) {
    if (cachedRules.schema) model.schema = cachedRules.schema;
    if (cachedRules.headersA) view.renderPreviewGrid("A", cachedRules.headersA, [], (h, r) => {
      model.sourceA.headers = h;
      model.sourceA.rows = r;
      controller.validateSchemaCompatibility();
    });
    if (cachedRules.headersB) view.renderPreviewGrid("B", cachedRules.headersB, [], (h, r) => {
      model.sourceB.headers = h;
      model.sourceB.rows = r;
      controller.validateSchemaCompatibility();
    });

    view.renderSetupParametersBoard(
      cachedRules.headersA || [],
      cachedRules.headersB || [],
      model.schema,
      (newSch) => {
        model.schema = newSch;
        Database.saveConfig(newSch, model.sourceA.headers, model.sourceB.headers);
        controller.validateSchemaCompatibility();
      },
      () => controller.runReconciliation()
    );
  }

  // Upload binds Source A
  view.uploadA.addEventListener("change", async (e) => {
    view.updateProgressSlider(20);
    await model.parseFiles(e.target.files, "A");
    view.updateProgressSlider(100);
    
    // Auto populate
    if (model.sourceA.headers.length > 0 && !model.schema.keysA[0]) {
      model.schema.keysA[0] = model.sourceA.headers[0];
    }

    view.renderPreviewGrid("A", model.sourceA.headers, model.sourceA.rows, (newH, newR) => {
      model.sourceA.headers = newH;
      model.sourceA.rows = newR;
      Database.saveConfig(model.schema, newH, model.sourceB.headers);
      controller.validateSchemaCompatibility();
    });

    refreshUIRulesSetup();
  });

  // Upload binds Source B
  view.uploadB.addEventListener("change", async (e) => {
    view.updateProgressSlider(20);
    await model.parseFiles(e.target.files, "B");
    view.updateProgressSlider(100);

    // Auto populate
    if (model.sourceB.headers.length > 0 && !model.schema.keysB[0]) {
      model.schema.keysB[0] = model.sourceB.headers[0];
    }

    view.renderPreviewGrid("B", model.sourceB.headers, model.sourceB.rows, (newH, newR) => {
      model.sourceB.headers = newH;
      model.sourceB.rows = newR;
      Database.saveConfig(model.schema, model.sourceA.headers, newH);
      controller.validateSchemaCompatibility();
    });

    refreshUIRulesSetup();
  });

  // Paste binders A
  view.parseBtnA.addEventListener("click", () => {
    model.parsePasteInput(view.pasteAreaA.value, "A");
    if (model.sourceA.headers.length > 0 && !model.schema.keysA[0]) {
      model.schema.keysA[0] = model.sourceA.headers[0];
    }
    view.renderPreviewGrid("A", model.sourceA.headers, model.sourceA.rows, (newH, newR) => {
      model.sourceA.headers = newH;
      model.sourceA.rows = newR;
      Database.saveConfig(model.schema, newH, model.sourceB.headers);
      controller.validateSchemaCompatibility();
    });
    refreshUIRulesSetup();
  });

  // Paste binders B
  view.parseBtnB.addEventListener("click", () => {
    model.parsePasteInput(view.pasteAreaB.value, "B");
    if (model.sourceB.headers.length > 0 && !model.schema.keysB[0]) {
      model.schema.keysB[0] = model.sourceB.headers[0];
    }
    view.renderPreviewGrid("B", model.sourceB.headers, model.sourceB.rows, (newH, newR) => {
      model.sourceB.headers = newH;
      model.sourceB.rows = newR;
      Database.saveConfig(model.schema, model.sourceA.headers, newH);
      controller.validateSchemaCompatibility();
    });
    refreshUIRulesSetup();
  });

  function refreshUIRulesSetup() {
    view.renderSetupParametersBoard(
      model.sourceA.headers.length > 0 ? model.sourceA.headers : cachedRules?.headersA || [],
      model.sourceB.headers.length > 0 ? model.sourceB.headers : cachedRules?.headersB || [],
      model.schema,
      (newSch) => {
        model.schema = newSch;
        Database.saveConfig(newSch, model.sourceA.headers, model.sourceB.headers);
        controller.validateSchemaCompatibility();
      },
      () => controller.runReconciliation()
    );
    controller.validateSchemaCompatibility();
  }

  // Download logic binding SheetJS Excel exporter
  view.downloadBtn.addEventListener("click", () => {
    if (model.reconciledResults.length === 0) return;
    
    try {
      const wb = XLSX.utils.book_new();

      // Clean side A
      const wsA = XLSX.utils.json_to_sheet(model.sourceA.rows);
      XLSX.utils.book_append_sheet(wb, wsA, "Source A Clean Table");

      // Clean side B
      const wsB = XLSX.utils.json_to_sheet(model.sourceB.rows);
      XLSX.utils.book_append_sheet(wb, wsB, "Source B Clean Table");

      // Structured Report summary
      const exportedReport = model.reconciledResults.map(item => {
        const obj = {};
        
        // 1. Criteria Keys group
        Object.keys(item.criteria).forEach(k => {
          obj[k] = item.criteria[k];
        });

        // 2. Comparison values group
        model.schema.comparePairs.forEach(pair => {
          if (pair.colA) obj[`Src_A_${pair.colA}`] = item.valuesA[pair.colA] ?? "";
          if (pair.colB) obj[`Src_B_${pair.colB}`] = item.valuesB[pair.colB] ?? "";
        });

        obj["A_Source_File"] = item.valuesA["Origin_File_Name"] || "";
        obj["B_Source_File"] = item.valuesB["Origin_File_Name"] || "";

        // Status report group
        obj["Audit_Status"] = item.status;
        obj["Variance_Resolution_Suggested"] = item.discrepancy || "Matched";

        return obj;
      });

      const wsC = XLSX.utils.json_to_sheet(exportedReport);
      XLSX.utils.book_append_sheet(wb, wsC, "Reconciled Audit Summary");

      const currDate = new Date().toISOString().split("T")[0];
      XLSX.writeFile(wb, `Reconciliation_Report_${currDate}.xlsx`);
    } catch (e) {
      console.error(e);
      alert("Error building spreadsheet output file.");
    }
  });

  // Clear Cache binds
  view.clearCacheBtn.addEventListener("click", () => {
    Database.clear();
    
    model.sourceA = { headers: [], rows: [], fileName: "" };
    model.sourceB = { headers: [], rows: [], fileName: "" };
    model.schema = {
      keysA: [""],
      keysB: [""],
      comparePairs: [{ colA: "", colB: "" }],
      groupByEnabled: false
    };
    model.reconciledResults = [];
    model.elapsedTimeMs = 0;

    view.updateProgressSlider(0);
    view.renderElapsedTime(0);
    view.renderPreviewGrid("A", [], []);
    view.renderPreviewGrid("B", [], []);
    view.resultsCard.classList.add("hidden");
    
    view.rulesFieldsWrapper.innerHTML = `
      <p class="text-xs text-slate-400 text-center py-4">Please upload ledger documents to Source A and Source B to unlock calculations configuration mapping.</p>
    `;

    const selector = document.getElementById("validation-alerts-container");
    if (selector) selector.remove();

    alert("Reconciliation Configuration Rules Cache state cleared successfully.");
  });

});
