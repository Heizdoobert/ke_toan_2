/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DataGrid — editable spreadsheet component styled like Microsoft Excel.
 * Features: row numbers, grid borders, auto number alignment, inline editing.
 */

import React, { useState, useMemo } from "react";
import { Plus, Trash2, FileSpreadsheet, X } from "lucide-react";

interface DataGridProps {
  title: string;
  sourceLabel: "Source A" | "Source B";
  headers: string[];
  rows: Record<string, any>[];
  fileName: string;
  onUpdateData: (newHeaders: string[], newRows: Record<string, any>[]) => void;
  onClear: () => void;
}

export default function DataGrid({
  title,
  sourceLabel,
  headers,
  rows,
  fileName,
  onUpdateData,
  onClear
}: DataGridProps) {
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; colName: string } | null>(null);
  const [editValue, setEditValue] = useState("");
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [selectedCols, setSelectedCols] = useState<Set<string>>(new Set());
  
  const [showAddColModal, setShowAddColModal] = useState(false);
  const [newColName, setNewColName] = useState("");

  // Detect if a column primarily contains numeric data (for right-alignment)
  const numericCols = useMemo(() => {
    const numSet = new Set<string>();
    headers.forEach(h => {
      const nonEmpty = rows.filter(r => r[h] !== undefined && r[h] !== null && r[h] !== "");
      if (nonEmpty.length === 0) return;
      const numericCount = nonEmpty.filter(r => !isNaN(Number(r[h]))).length;
      if (numericCount / nonEmpty.length > 0.7) {
        numSet.add(h);
      }
    });
    return numSet;
  }, [headers, rows]);

  // Detect debit/credit columns by header name — display as plain numbers without commas
  const debitCreditCols = useMemo(() => {
    const cols = new Set<string>();
    headers.forEach(h => {
      if (/nợ|có|debit|credit/i.test(h)) cols.add(h);
    });
    return cols;
  }, [headers]);

  /** Strip commas from a value if the result is a valid number (for debit/credit columns) */
  const formatPlainNumber = (value: any, colName: string): string => {
    if (value === undefined || value === null) return "";
    let str = String(value);
    if (debitCreditCols.has(colName)) {
      const noCommas = str.replace(/,/g, "");
      if (noCommas && !isNaN(Number(noCommas))) {
        return noCommas;
      }
    }
    return str;
  };

  // ─── Cell Editing ───

  const handleCellClick = (rowIndex: number, colName: string, value: any) => {
    setEditingCell({ rowIndex, colName });
    setEditValue(value !== undefined ? String(value) : "");
  };

  const handleCellSave = (rowIndex: number, colName: string) => {
    const updatedRows = [...rows];
    updatedRows[rowIndex] = {
      ...updatedRows[rowIndex],
      [colName]: editValue
    };
    onUpdateData([...headers], updatedRows);
    setEditingCell(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent, rowIndex: number, colName: string) => {
    if (e.key === "Enter") {
      handleCellSave(rowIndex, colName);
    } else if (e.key === "Escape") {
      setEditingCell(null);
    }
  };

  // ─── Row Manipulation ───

  const handleAddRow = () => {
    const newRow: Record<string, any> = {};
    headers.forEach(h => { newRow[h] = ""; });
    newRow["Origin_File_Name"] = fileName || `${sourceLabel}_Manual`;
    const updatedRows = [...rows, newRow];
    onUpdateData([...headers], updatedRows);
  };

  const handleDeleteCheckedRows = () => {
    if (selectedRows.size === 0) return;
    const updatedRows = rows.filter((_, idx) => !selectedRows.has(idx));
    onUpdateData([...headers], updatedRows);
    setSelectedRows(new Set());
  };

  const toggleRowSelect = (idx: number) => {
    const updated = new Set(selectedRows);
    if (updated.has(idx)) updated.delete(idx);
    else updated.add(idx);
    setSelectedRows(updated);
  };

  const toggleAllRows = () => {
    if (selectedRows.size === rows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(rows.map((_, i) => i)));
    }
  };

  // ─── Column Manipulation ───

  const handleAddColumn = () => {
    const cleanedName = newColName.trim();
    if (!cleanedName) return;
    if (headers.includes(cleanedName)) {
      alert("Column already exists.");
      return;
    }
    const updatedHeaders = [...headers, cleanedName];
    const updatedRows = rows.map(r => ({ ...r, [cleanedName]: "" }));
    onUpdateData(updatedHeaders, updatedRows);
    setNewColName("");
    setShowAddColModal(false);
  };

  const handleDeleteCheckedCols = () => {
    if (selectedCols.size === 0) return;
    const updatedHeaders = headers.filter(h => !selectedCols.has(h));
    const updatedRows = rows.map(r => {
      const copy = { ...r };
      selectedCols.forEach(col => { delete copy[col]; });
      return copy;
    });
    onUpdateData(updatedHeaders, updatedRows);
    setSelectedCols(new Set());
  };

  const toggleColSelect = (h: string) => {
    const updated = new Set(selectedCols);
    if (updated.has(h)) updated.delete(h);
    else updated.add(h);
    setSelectedCols(updated);
  };

  // ─── Excel-style Formatting Helpers ───

  const isNumericCell = (colName: string): boolean => numericCols.has(colName);
  const isRowSelected = (idx: number): boolean => selectedRows.has(idx);
  const isColSelected = (col: string): boolean => selectedCols.has(col);

  const excelBorder = "border-r border-b border-[#d4d4d4]";

  return (
    <div className="bg-white rounded-lg border border-[#d4d4d4] shadow-sm overflow-hidden flex flex-col h-full font-sans" id={`datacontainer-${sourceLabel}`}>
      {/* ─── Excel-style Ribbon Header ─── */}
      <div className="bg-[#217346] px-4 py-2.5 text-white flex items-center justify-between select-none">
        <div className="flex items-center gap-2.5">
          <FileSpreadsheet className="h-5 w-5 text-white/90" />
          <div>
            <h3 className="font-semibold text-sm tracking-tight">{title}</h3>
            <p className="text-[11px] text-white/70 font-mono truncate max-w-[200px] sm:max-w-[350px]">
              {fileName ? `${fileName} (${rows.length} rows)` : "No data loaded"}
            </p>
          </div>
        </div>
        {headers.length > 0 && (
          <button
            onClick={onClear}
            className="text-[11px] bg-white/15 hover:bg-white/25 text-white px-2.5 py-1 rounded border border-white/20 transition"
            id={`clear-${sourceLabel}`}
          >
            Reset
          </button>
        )}
      </div>

      {/* ─── Empty State ─── */}
      {headers.length === 0 ? (
        <div className="p-8 text-center text-[#999] flex flex-col items-center justify-center flex-1 h-64">
          <FileSpreadsheet className="h-10 w-10 text-[#ccc] mb-2 stroke-1" />
          <p className="text-sm">Upload Excel, CSV, paste data or drop folder</p>
        </div>
      ) : (
        <div className="flex flex-col flex-grow min-h-0">
          {/* ─── Excel-style Formula Bar / Toolbar ─── */}
          <div className="bg-[#f8f8f8] border-b border-[#d4d4d4] px-3 py-1.5 flex flex-wrap gap-1.5 items-center text-xs">
            <button
              type="button"
              onClick={handleAddRow}
              className="flex items-center gap-1 bg-white hover:bg-[#e8e8e8] text-[#333] px-2 py-1 rounded-sm border border-[#d4d4d4] cursor-pointer"
              id={`addrow-${sourceLabel}`}
            >
              <Plus className="h-3 w-3" /> Row
            </button>
            <button
              type="button"
              onClick={handleDeleteCheckedRows}
              disabled={selectedRows.size === 0}
              className={`flex items-center gap-1 px-2 py-1 rounded-sm border transition ${
                selectedRows.size > 0
                  ? "bg-white hover:bg-[#fce8e8] text-[#c44] border-[#d4d4d4] cursor-pointer"
                  : "bg-[#f8f8f8] text-[#bbb] border-[#eee] cursor-not-allowed"
              }`}
              id={`delrow-${sourceLabel}`}
            >
              <Trash2 className="h-3 w-3" /> Delete ({selectedRows.size})
            </button>
            <span className="w-px h-4 bg-[#d4d4d4] mx-0.5" />
            <button
              type="button"
              onClick={() => setShowAddColModal(true)}
              className="flex items-center gap-1 bg-white hover:bg-[#e8e8e8] text-[#333] px-2 py-1 rounded-sm border border-[#d4d4d4] cursor-pointer"
              id={`addcol-${sourceLabel}`}
            >
              <Plus className="h-3 w-3" /> Column
            </button>
            <button
              type="button"
              onClick={handleDeleteCheckedCols}
              disabled={selectedCols.size === 0}
              className={`flex items-center gap-1 px-2 py-1 rounded-sm border transition ${
                selectedCols.size > 0
                  ? "bg-white hover:bg-[#fce8e8] text-[#c44] border-[#d4d4d4] cursor-pointer"
                  : "bg-[#f8f8f8] text-[#bbb] border-[#eee] cursor-not-allowed"
              }`}
              id={`delcol-${sourceLabel}`}
            >
              <Trash2 className="h-3 w-3" /> Delete ({selectedCols.size})
            </button>
          </div>

          {/* ─── Excel-style Grid ─── */}
          <div className="overflow-auto flex-grow max-h-[350px]" style={{ fontFamily: "'Segoe UI', 'Calibri', 'Arial', sans-serif" }}>
            <table className="w-full text-[11px] border-collapse bg-white">
              {/* ─── Excel-style Column Header Row ─── */}
              <thead>
                <tr>
                  {/* Corner cell (Excel-style top-left corner) */}
                  <th className={`w-9 min-w-[36px] bg-[#f0f0f0] sticky top-0 z-20 ${excelBorder} p-0`}>
                    <div className="flex items-center justify-center h-full">
                      <input
                        type="checkbox"
                        checked={rows.length > 0 && selectedRows.size === rows.length}
                        onChange={toggleAllRows}
                        className="rounded border-[#999] text-[#217346] focus:ring-[#217346] h-3 w-3 cursor-pointer"
                      />
                    </div>
                  </th>
                  {/* Row number column header (Excel gray area) */}
                  <th className={`w-10 min-w-[40px] bg-[#f0f0f0] sticky top-0 z-20 ${excelBorder} text-center text-[10px] text-[#666] font-medium select-none`}>
                    #
                  </th>
                  {/* Data column headers */}
                  {headers.map((h) => (
                    <th
                      key={h}
                      className={`bg-[#f0f0f0] sticky top-0 z-20 px-2 py-1.5 ${excelBorder} font-semibold text-[#333] whitespace-nowrap select-none transition min-w-[90px] ${
                        isColSelected(h) ? "bg-[#e4ecf7]" : ""
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={selectedCols.has(h)}
                          onChange={() => toggleColSelect(h)}
                          className="rounded border-[#999] text-[#217346] focus:ring-[#217346] h-3 w-3 shrink-0"
                        />
                        <span className="truncate">{h}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rIdx) => {
                  const rowSelected = isRowSelected(rIdx);
                  const rowBg = rowSelected
                    ? "bg-[#e4ecf7]"
                    : rIdx % 2 === 0
                      ? "bg-white"
                      : "bg-[#f8f9fa]";

                  return (
                    <tr
                      key={rIdx}
                      className={`${rowBg} transition-colors`}
                    >
                      {/* Checkbox cell */}
                      <td className={`w-9 min-w-[36px] bg-[#f5f5f5] text-center ${excelBorder} p-0 ${rowSelected ? 'bg-[#dce6f1]' : ''}`}>
                        <div className="flex items-center justify-center h-full">
                          <input
                            type="checkbox"
                            checked={rowSelected}
                            onChange={() => toggleRowSelect(rIdx)}
                            className="rounded border-[#999] text-[#217346] focus:ring-[#217346] h-3 w-3 cursor-pointer"
                          />
                        </div>
                      </td>
                      {/* Excel-style row number */}
                      <td
                        className={`w-10 min-w-[40px] bg-[#f5f5f5] text-center ${excelBorder} text-[10px] text-[#666] select-none cursor-pointer ${
                          rowSelected ? 'bg-[#dce6f1] font-semibold text-[#333]' : ''
                        }`}
                        onClick={() => toggleRowSelect(rIdx)}
                        title={rowSelected ? "Deselect row" : "Select row"}
                      >
                        {rIdx + 1}
                      </td>
                      {/* Data cells */}
                      {headers.map((h) => {
                        const value = row[h];
                        const isEditing =
                          editingCell &&
                          editingCell.rowIndex === rIdx &&
                          editingCell.colName === h;
                        const numeric = isNumericCell(h);

                        return (
                          <td
                            key={h}
                            onClick={() => !isEditing && handleCellClick(rIdx, h, value)}
                            className={`px-2 py-1 ${excelBorder} max-w-[180px] relative group cursor-text ${
                              numeric ? "text-right" : "text-left"
                            } ${isEditing ? "p-0" : ""}
                              ${rowSelected ? "bg-[#e4ecf7]" : ""}`}
                            style={isEditing ? { overflow: 'visible' } : {}}
                          >
                            {isEditing ? (
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleCellSave(rIdx, h)}
                                onKeyDown={(e) => handleKeyPress(e, rIdx, h)}
                                autoFocus
                                className={`w-full px-1.5 py-1 text-[11px] border-2 border-[#217346] bg-white outline-none ${
                                  numeric ? "text-right" : "text-left"
                                }`}
                                style={{ fontFamily: "'Segoe UI', 'Calibri', 'Arial', sans-serif" }}
                              />
                            ) : (
                              <div className="flex items-center justify-between gap-1 min-h-[18px]">
                                <span className={`truncate ${numeric ? "w-full text-right tabular-nums" : ""}`}>
                                  {formatPlainNumber(value, h)}
                                </span>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Add Column Modal ─── */}
      {showAddColModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-lg border border-[#d4d4d4] shadow-xl max-w-sm w-full p-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#e8e8e8]">
              <h4 className="font-semibold text-sm text-[#333]">Add Column</h4>
              <button
                onClick={() => setShowAddColModal(false)}
                className="text-[#999] hover:text-[#333] transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="my-4">
              <label className="block text-xs font-medium text-[#666] mb-1">Column name</label>
              <input
                type="text"
                placeholder="e.g. Transaction_ID, Amount_USD"
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddColumn()}
                className="w-full px-3 py-2 border border-[#d4d4d4] rounded text-xs focus:ring-2 focus:ring-[#217346] outline-none"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setShowAddColModal(false)}
                className="px-3 py-1.5 bg-[#f0f0f0] hover:bg-[#e0e0e0] rounded text-[#333] font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddColumn}
                className="px-3 py-1.5 bg-[#217346] hover:bg-[#1a5c38] text-white rounded font-medium"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
