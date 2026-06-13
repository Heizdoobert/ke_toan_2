/**
 * Controller — orchestrates Model ↔ View, runs reconciliation.
 * Extracted from app.js class Controller.
 */
class Controller {
  constructor(model, view) {
    this.model = model;
    this.view = view;
  }

  // Value Normalizations
  normalizeValue(val) {
    if (val === undefined || val === null) return "";

    if (typeof val === "number" && val >= 35000 && val <= 70000) {
      return this.excelSerialDateToISOString(val);
    }

    const str = String(val).trim();
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
          msg: `Lỗi kiểu dữ liệu ở cặp #${i+1}: "${colA}" bên A là dạng ${typeA}, nhưng "${colB}" bên B là dạng ${typeB}. Việc tra cứu sẽ thất bại.`
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
      alert("Vui lòng chọn ít nhất một cặp khoá đối soát.");
      this.view.updateProgressSlider(0);
      return;
    }

    this.view.updateProgressSlider(50);

    const targetNumericA = comparePairs.map(p => p.colA).filter(Boolean);
    const targetNumericB = comparePairs.map(p => p.colB).filter(Boolean);

    let processedRowsA = this.model.sourceA.rows;
    let processedRowsB = this.model.sourceB.rows;

    if (groupByEnabled) {
      processedRowsA = this.aggregateDataGroup(processedRowsA, keysA, targetNumericA);
      processedRowsB = this.aggregateDataGroup(processedRowsB, keysB, targetNumericB);
    }

    this.view.updateProgressSlider(75);

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

      const originFileA = rowA ? (rowA["Origin_File_Name"] || "") : "";
      const originFileB = rowB ? (rowB["Origin_File_Name"] || "") : "";
      valuesA["Origin_File_Name"] = originFileA;
      valuesB["Origin_File_Name"] = originFileB;

      let status = "Matched";
      let discrepancy = "";

      if (rowA && !rowB) {
        status = "Not Found in Source B";
        discrepancy = `Khoá chỉ tồn tại ở nguồn A (Tệp: ${originFileA})`;
      } else if (!rowA && rowB) {
        status = "Not Found in Source A";
        discrepancy = `Khoá chỉ tồn tại ở nguồn B (Tệp: ${originFileB})`;
      } else {
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
              variations.push(`Chênh lệch [${diff.toFixed(2)}] tại [${pair.colA}]`);
            }
          } else {
            const normA = this.normalizeValue(valA);
            const normB = this.normalizeValue(valB);
            if (normA !== normB) {
              isMatched = false;
              variations.push(`Không khớp: [${pair.colA}] "${valA}" vs "${valB}"`);
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
