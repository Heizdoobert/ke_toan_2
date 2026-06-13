/**
 * Bootstrap — instantiate MVC, wire events, start app.
 * Original monolithic app.js decomposed into:
 *   js/database.js, js/model.js, js/view.js, js/controller.js
 */

document.addEventListener("DOMContentLoaded", () => {
  const model = new Model();
  const view = new View();
  const controller = new Controller(model, view);

  // Restore rule mappings state from Local JSON database on startup (F5 recall)
  const cachedRules = Database.restoreConfig();
  if (cachedRules) {
    if (cachedRules.schema) {
      model.schema = cachedRules.schema;
      if (!model.schema.groupByFunction) model.schema.groupByFunction = 'sum';
    }
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

      const wsA = XLSX.utils.json_to_sheet(model.sourceA.rows);
      XLSX.utils.book_append_sheet(wb, wsA, "Source A Clean Table");

      const wsB = XLSX.utils.json_to_sheet(model.sourceB.rows);
      XLSX.utils.book_append_sheet(wb, wsB, "Source B Clean Table");

      const exportedReport = model.reconciledResults.map(item => {
        const obj = {};

        Object.keys(item.criteria).forEach(k => {
          obj[k] = item.criteria[k];
        });

        model.schema.comparePairs.forEach(pair => {
          if (pair.colA) obj[`Src_A_${pair.colA}`] = item.valuesA[pair.colA] ?? "";
          if (pair.colB) obj[`Src_B_${pair.colB}`] = item.valuesB[pair.colB] ?? "";
        });

        obj["A_Source_File"] = item.valuesA["Origin_File_Name"] || "";
        obj["B_Source_File"] = item.valuesB["Origin_File_Name"] || "";

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
      alert("Lỗi tạo tệp Excel.");
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
      groupByEnabled: false,
      groupByFunction: 'sum'
    };
    model.reconciledResults = [];
    model.elapsedTimeMs = 0;

    view.updateProgressSlider(0);
    view.renderElapsedTime(0);
    view.renderPreviewGrid("A", [], []);
    view.renderPreviewGrid("B", [], []);
    view.resultsCard.classList.add("hidden");

    view.rulesFieldsWrapper.innerHTML = `
      <p class="text-xs text-slate-400 text-center py-4">Vui lòng tải dữ liệu vào Sổ Cái A và Sổ Cái B để mở bảng cấu hình.</p>
    `;

    const selector = document.getElementById("validation-alerts-container");
    if (selector) selector.remove();

    alert("Đã xoá bộ nhớ đệm cấu hình thành công.");
  });

});
