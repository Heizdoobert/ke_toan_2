/**
 * Model — in-RAM data store + file parsing.
 * Extracted from app.js class Model.
 */
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
