/**
 * View — DOM rendering, event binding.
 * Extracted from app.js class View.
 */
class View {
  constructor() {
    this.uploadA = document.getElementById("upload-input-A");
    this.uploadB = document.getElementById("upload-input-B");

    this.pasteAreaA = document.getElementById("paste-textarea-A");
    this.pasteAreaB = document.getElementById("paste-textarea-B");
    this.parseBtnA = document.getElementById("parse-paste-btn-A");
    this.parseBtnB = document.getElementById("parse-paste-btn-B");

    this.progressSlider = document.getElementById("progress-bar-slider");
    this.elapsedTicker = document.getElementById("elapsed-time-ticker");

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
    document.getElementById("tab-file-A").addEventListener("click", (e) => {
      this.toggleInputTab("A", "file", e.target);
    });
    document.getElementById("tab-paste-A").addEventListener("click", (e) => {
      this.toggleInputTab("A", "paste", e.target);
    });

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

    document.getElementById(`addrow-btn-${side}`).addEventListener("click", () => {
      const empty = {};
      headers.forEach(h => empty[h] = "");
      empty["Origin_File_Name"] = "Manual_Row";
      rows.push(empty);
      onUpdate(headers, rows);
    });

    document.getElementById(`delrow-btn-${side}`).addEventListener("click", () => {
      const rowBoxes = document.querySelectorAll(`.row-checkbox-${side}:checked`);
      if (rowBoxes.length === 0) return;
      const checkedInds = Array.from(rowBoxes).map(box => parseInt(box.dataset.row));
      const filtered = rows.filter((_, i) => !checkedInds.includes(i));
      onUpdate(headers, filtered);
    });

    document.getElementById(`addcol-btn-${side}`).addEventListener("click", () => {
      const colName = prompt("Insert new column name:");
      if (!colName) return;
      const clean = colName.trim();
      if (!clean || headers.includes(clean)) return;
      headers.push(clean);
      rows.forEach(r => r[clean] = "");
      onUpdate(headers, rows);
    });

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

    document.getElementById(`checkall-rows-${side}`).addEventListener("change", (e) => {
      const checked = e.target.checked;
      document.querySelectorAll(`.row-checkbox-${side}`).forEach(box => box.checked = checked);
    });

    tbody.querySelectorAll("td[data-col]").forEach(cell => {
      cell.addEventListener("dblclick", () => {
        const rIdx = parseInt(cell.dataset.row);
        const colName = cell.dataset.col;
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

  renderSetupParametersBoard(headersA, headersB, schema, onSchemaChange, onRun) {
    this.rulesFieldsWrapper.innerHTML = "";

    const cardFields = document.createElement("div");
    cardFields.className = "flex flex-col gap-4 font-sans text-xs";

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

    const buttonHTML = `
      <button id="execute-recon-btn" class="w-full mt-4 py-2.5 px-4 rounded-md text-xs font-semibold text-center tracking-wide text-white bg-indigo-700 hover:bg-indigo-800 transition active:scale-99 shadow-xs cursor-pointer">
        Run Fast Reconciliation (under 2s)
      </button>
    `;

    cardFields.innerHTML = keysMappingHTML + comparisonsHTML + groupByHTML + buttonHTML;
    this.rulesFieldsWrapper.appendChild(cardFields);
    lucide.createIcons();

    const toggleBtn = document.getElementById("group-by-toggle-btn");
    const bullet = document.getElementById("group-by-bullet");
    if (schema.groupByEnabled) {
      toggleBtn.className = "relative inline-flex h-5 w-10 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none bg-indigo-600";
      bullet.className = "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 translate-x-5";
    }

    toggleBtn.addEventListener("click", () => {
      schema.groupByEnabled = !schema.groupByEnabled;
      onSchemaChange(schema);
    });

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

    const addKeyPairBtn = document.getElementById("add-key-pair-btn");
    if (addKeyPairBtn) {
      addKeyPairBtn.addEventListener("click", () => {
        if (schema.keysA.length >= 4) return;
        schema.keysA.push("");
        schema.keysB.push("");
        onSchemaChange(schema);
      });
    }

    cardFields.querySelectorAll(".remove-key-row-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.idx);
        schema.keysA.splice(idx, 1);
        schema.keysB.splice(idx, 1);
        onSchemaChange(schema);
      });
    });

    document.getElementById("add-compare-pair-btn").addEventListener("click", () => {
      schema.comparePairs.push({ colA: "", colB: "" });
      onSchemaChange(schema);
    });

    cardFields.querySelectorAll(".remove-compare-pair-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const idx = parseInt(btn.dataset.idx);
        schema.comparePairs.splice(idx, 1);
        onSchemaChange(schema);
      });
    });

    document.getElementById("execute-recon-btn").addEventListener("click", onRun);
  }

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

      schema.keysA.forEach((_, i) => {
        tbody += `<td class="px-3 py-2 border-r border-slate-150 font-mono text-slate-700">${row.criteria[`Key_A_${i + 1}`] !== undefined ? row.criteria[`Key_A_${i+1}`] : ""}</td>`;
      });
      schema.keysB.forEach((_, i) => {
        tbody += `<td class="px-3 py-2 border-r border-slate-150 font-mono text-slate-700">${row.criteria[`Key_B_${i + 1}`] !== undefined ? row.criteria[`Key_B_${i+1}`] : ""}</td>`;
      });

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
