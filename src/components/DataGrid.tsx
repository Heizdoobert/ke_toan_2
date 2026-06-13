/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Plus, Trash2, Edit2, Check, FileSpreadsheet, X } from "lucide-react";

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

  // Row Manipulation
  const handleAddRow = () => {
    const newRow: Record<string, any> = {};
    headers.forEach(h => {
      newRow[h] = "";
    });
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
    if (updated.has(idx)) {
      updated.delete(idx);
    } else {
      updated.add(idx);
    }
    setSelectedRows(updated);
  };

  const toggleAllRows = () => {
    if (selectedRows.size === rows.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(rows.map((_, i) => i)));
    }
  };

  // Column Manipulation
  const handleAddColumn = () => {
    const cleanedName = newColName.trim();
    if (!cleanedName) return;
    if (headers.includes(cleanedName)) {
      alert("Column already exists.");
      return;
    }
    
    const updatedHeaders = [...headers, cleanedName];
    const updatedRows = rows.map(r => ({
      ...r,
      [cleanedName]: ""
    }));
    onUpdateData(updatedHeaders, updatedRows);
    setNewColName("");
    setShowAddColModal(false);
  };

  const handleDeleteCheckedCols = () => {
    if (selectedCols.size === 0) return;
    const updatedHeaders = headers.filter(h => !selectedCols.has(h));
    const updatedRows = rows.map(r => {
      const copy = { ...r };
      selectedCols.forEach(col => {
        delete copy[col];
      });
      return copy;
    });
    onUpdateData(updatedHeaders, updatedRows);
    setSelectedCols(new Set());
  };

  const toggleColSelect = (h: string) => {
    const updated = new Set(selectedCols);
    if (updated.has(h)) {
      updated.delete(h);
    } else {
      updated.add(h);
    }
    setSelectedCols(updated);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full" id={`datacontainer-${sourceLabel}`}>
      {/* Header Panel */}
      <div className="bg-slate-900 px-4 py-3 text-white flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-indigo-400" />
          <div>
            <h3 className="font-semibold text-sm tracking-tight">{title}</h3>
            <p className="text-[11px] text-slate-400 font-mono truncate max-w-[200px] sm:max-w-[350px]">
              {fileName ? `${fileName} (${rows.length} rows)` : "No data uploaded"}
            </p>
          </div>
        </div>
        
        {headers.length > 0 && (
          <button
            onClick={onClear}
            className="text-[11px] bg-slate-800 text-slate-300 hover:text-white px-2 py-1 rounded border border-slate-700 transition"
            id={`clear-${sourceLabel}`}
          >
            Reset
          </button>
        )}
      </div>

      {headers.length === 0 ? (
        <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center flex-1 h-64 font-sans">
          <FileSpreadsheet className="h-10 w-10 text-slate-300 mb-2 stroke-1" />
          <p className="text-sm">Upload Excel, CSV, paste data, or drop folders to begin</p>
        </div>
      ) : (
        <div className="flex flex-col flex-grow min-h-0">
          {/* Action Toolbar */}
          <div className="bg-slate-50 border-b border-slate-200 px-3 py-2 flex flex-wrap gap-2 items-center justify-between text-xs font-sans">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleAddRow}
                className="flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 px-2.5 py-1.5 rounded border border-slate-200 shadow-xs font-medium cursor-pointer"
                id={`addrow-${sourceLabel}`}
              >
                <Plus className="h-3.5 w-3.5 text-slate-500" /> Add Row
              </button>
              
              <button
                type="button"
                onClick={handleDeleteCheckedRows}
                disabled={selectedRows.size === 0}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded border shadow-xs font-medium transition ${
                  selectedRows.size > 0
                    ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 cursor-pointer"
                    : "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                }`}
                id={`delrow-${sourceLabel}`}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete Row ({selectedRows.size})
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddColModal(true)}
                className="flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-700 px-2.5 py-1.5 rounded border border-slate-200 shadow-xs font-medium cursor-pointer"
                id={`addcol-${sourceLabel}`}
              >
                <Plus className="h-3.5 w-3.5 text-slate-500" /> Add Column
              </button>
              
              <button
                type="button"
                onClick={handleDeleteCheckedCols}
                disabled={selectedCols.size === 0}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded border shadow-xs font-medium transition ${
                  selectedCols.size > 0
                    ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 cursor-pointer"
                    : "bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed"
                }`}
                id={`delcol-${sourceLabel}`}
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete Col ({selectedCols.size})
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-auto flex-grow max-h-[350px]">
            <table className="w-full text-[11px] border-collapse bg-white font-sans text-left">
              <thead className="bg-slate-100 sticky top-0 z-10 border-b border-slate-200 text-slate-600 font-medium">
                <tr>
                  {/* Select Row Column Header */}
                  <th className="w-10 px-2 text-center select-none border-r border-slate-200">
                    <input
                      type="checkbox"
                      checked={rows.length > 0 && selectedRows.size === rows.length}
                      onChange={toggleAllRows}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-500 h-3.5 w-3.5 cursor-pointer"
                    />
                  </th>
                  
                  {/* Data Column Headers */}
                  {headers.map((h) => (
                    <th
                      key={h}
                      className={`px-3 py-2 border-r border-slate-200 font-medium whitespace-nowrap min-w-[120px] select-none transition ${
                        selectedCols.has(h) ? "bg-indigo-50 text-indigo-700" : ""
                      }`}
                    >
                      <div className="flex items-center gap-1.5 justify-between">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedCols.has(h)}
                            onChange={() => toggleColSelect(h)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                          />
                          <span className="truncate max-w-[110px]">{h}</span>
                        </label>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className={`hover:bg-slate-55 transition-colors ${
                      selectedRows.has(rIdx) ? "bg-slate-50" : ""
                    }`}
                  >
                    {/* Row checkbox */}
                    <td className="px-2 py-1.5 text-center border-r border-slate-200 select-none">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(rIdx)}
                        onChange={() => toggleRowSelect(rIdx)}
                        className="rounded border-slate-300 text-slate-700 focus:ring-slate-500 h-3.5 w-3.5 cursor-pointer"
                      />
                    </td>
                    
                    {/* Row value cells */}
                    {headers.map((h) => {
                      const value = row[h];
                      const isEditing =
                        editingCell &&
                        editingCell.rowIndex === rIdx &&
                        editingCell.colName === h;

                      return (
                        <td
                          key={h}
                          onClick={() => handleCellClick(rIdx, h, value)}
                          className={`px-3 py-1.5 border-r border-slate-200 truncate max-w-[150px] relative group cursor-text transition ${
                            isEditing ? "p-0.5 bg-sky-50" : "hover:bg-slate-50"
                          }`}
                        >
                          {isEditing ? (
                            <div className="flex items-center gap-1 w-full">
                              <input
                                type="text"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => handleCellSave(rIdx, h)}
                                onKeyDown={(e) => handleKeyPress(e, rIdx, h)}
                                autoFocus
                                className="w-full px-1.5 py-1 text-xs border border-sky-400 bg-white rounded outline-none focus:ring-1 focus:ring-sky-500"
                              />
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-1">
                              <span className="truncate">{value !== undefined ? String(value) : ""}</span>
                              <Edit2 className="h-2.5 w-2.5 text-slate-400 opacity-0 group-hover:opacity-100 transition absolute right-2" />
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Column overlay Modal */}
      {showAddColModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-lg border border-slate-300 shadow-xl max-w-sm w-full p-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-semibold text-sm text-slate-800">Add New Column</h4>
              <button
                onClick={() => setShowAddColModal(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="my-4">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Column Name
              </label>
              <input
                type="text"
                placeholder="E.g., Transaction_ID, Amount_USD"
                value={newColName}
                onChange={(e) => setNewColName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddColumn()}
                className="w-full px-3 py-2 border border-slate-300 rounded text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setShowAddColModal(false)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded text-slate-700 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddColumn}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
