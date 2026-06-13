/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { Plus, Trash2, Sliders, AlertTriangle, HelpCircle } from "lucide-react";
import { ComparisonPair, ReconciliationSchema, AggregationFunction } from "../types";
import { validateMatchingKeys } from "../utils/validator";

interface SetupPanelProps {
  headersA: string[];
  headersB: string[];
  rowsA: Record<string, any>[];
  rowsB: Record<string, any>[];
  schema: ReconciliationSchema;
  onChangeSchema: (newSchema: ReconciliationSchema) => void;
  onRunReconciliation: () => void;
  disabled: boolean;
}

export default function SetupPanel({
  headersA,
  headersB,
  rowsA,
  rowsB,
  schema,
  onChangeSchema,
  onRunReconciliation,
  disabled
}: SetupPanelProps) {
  const [warnings, setWarnings] = useState<any[]>([]);

  // Periodically validate matching keys on change
  useEffect(() => {
    if (rowsA.length > 0 && rowsB.length > 0) {
      const computed = validateMatchingKeys(rowsA, rowsB, schema.keysA, schema.keysB);
      setWarnings(computed);
    } else {
      setWarnings([]);
    }
  }, [schema.keysA, schema.keysB, rowsA, rowsB]);

  // Adjust Keys size
  const handleAddKeyRow = () => {
    if (schema.keysA.length >= 4) return;
    onChangeSchema({
      ...schema,
      keysA: [...schema.keysA, ""],
      keysB: [...schema.keysB, ""]
    });
  };

  const handleRemoveKeyRow = (index: number) => {
    const keysA = [...schema.keysA];
    const keysB = [...schema.keysB];
    keysA.splice(index, 1);
    keysB.splice(index, 1);
    onChangeSchema({
      ...schema,
      keysA,
      keysB
    });
  };

  const handleKeyChange = (index: number, side: "A" | "B", val: string) => {
    const keysA = [...schema.keysA];
    const keysB = [...schema.keysB];
    if (side === "A") {
      keysA[index] = val;
    } else {
      keysB[index] = val;
    }
    onChangeSchema({
      ...schema,
      keysA,
      keysB
    });
  };

  // Adjust Comparison Pairs size
  const handleAddCompareRow = () => {
    onChangeSchema({
      ...schema,
      comparePairs: [...schema.comparePairs, { colA: "", colB: "" }]
    });
  };

  const handleRemoveCompareRow = (index: number) => {
    const comparePairs = [...schema.comparePairs];
    comparePairs.splice(index, 1);
    onChangeSchema({
      ...schema,
      comparePairs
    });
  };

  const handleCompareChange = (index: number, side: "A" | "B", val: string) => {
    const comparePairs = [...schema.comparePairs];
    if (side === "A") {
      comparePairs[index] = { ...comparePairs[index], colA: val };
    } else {
      comparePairs[index] = { ...comparePairs[index], colB: val };
    }
    onChangeSchema({
      ...schema,
      comparePairs
    });
  };

  const handleToggleGroupBy = () => {
    onChangeSchema({
      ...schema,
      groupByEnabled: !schema.groupByEnabled
    });
  };

  const handleGroupByFunctionChange = (fn: AggregationFunction) => {
    onChangeSchema({
      ...schema,
      groupByFunction: fn
    });
  };

  const canExecute = schema.keysA.some(k => k !== "") && schema.keysB.some(k => k !== "") && !disabled;

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 font-sans flex flex-col gap-4">
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <Sliders className="h-5 w-5 text-indigo-700" />
        <h3 className="font-semibold text-sm text-slate-800 tracking-tight">Thiết lập quy tắc đối soát</h3>
      </div>

      {/* Warnings Panel */}
      {warnings.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-xs text-amber-850 flex flex-col gap-1.5 animate-fade-in animate-duration-300">
          <div className="flex items-center gap-1.5 font-semibold text-amber-900">
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
            <span>Phát hiện không tương thích kiểu dữ liệu</span>
          </div>
          <ul className="list-disc pl-4 space-y-1 text-[11px]">
            {warnings.map((warn, i) => (
              <li key={i}>{warn.message}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Matching Prerequisite keys (Composite Key) */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-700">
            Khoá khớp dòng (Composite Key) <span className="text-slate-400 font-normal">(1 - 4 cặp)</span>
          </label>
          {schema.keysA.length < 4 && (
            <button
              onClick={handleAddKeyRow}
              type="button"
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-0.5"
            >
              <Plus className="h-3 w-3" /> Thêm cặp khoá
            </button>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {schema.keysA.map((_, index) => (
            <div key={index} className="flex items-center gap-2 bg-slate-50 p-2 rounded border border-slate-100 transition-all">
              <div className="grid grid-cols-2 gap-2 flex-grow">
                {/* Source A Keys */}
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Cột A</label>
                    <select
                      value={schema.keysA[index] || ""}
                      onChange={(e) => handleKeyChange(index, "A", e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-slate-300 bg-white rounded outline-none shadow-xs focus:border-indigo-500"
                    >
                      <option value="">-- Chọn cột khoá --</option>
                    {headersA.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
                
                {/* Source B Keys */}
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Cột B</label>
                    <select
                      value={schema.keysB[index] || ""}
                      onChange={(e) => handleKeyChange(index, "B", e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-slate-300 bg-white rounded outline-none shadow-xs focus:border-indigo-500"
                    >
                      <option value="">-- Chọn cột khoá --</option>
                    {headersB.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>

              {schema.keysA.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveKeyRow(index)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded mt-4 transition cursor-pointer"
                  title="Xoá cặp"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Comparison values target pairs */}
      <div className="flex flex-col gap-2 mt-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-slate-700">
            Cột so sánh (Giá trị / Số tiền)
          </label>
          <button
            onClick={handleAddCompareRow}
            type="button"
            className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-0.5"
          >
            <Plus className="h-3 w-3" /> Thêm cặp giá trị
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {schema.comparePairs.map((pair, index) => (
            <div key={index} className="flex items-center gap-2 bg-slate-50 p-2 rounded border border-slate-100">
              <div className="grid grid-cols-2 gap-2 flex-grow">
                {/* Comparison value A */}
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Cột A so sánh</label>
                    <select
                      value={pair.colA || ""}
                      onChange={(e) => handleCompareChange(index, "A", e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-slate-300 bg-white rounded outline-none shadow-xs"
                    >
                      <option value="">-- Chọn mục tiêu --</option>
                    {headersA.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
                
                {/* Comparison value B */}
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Với cột B</label>
                    <select
                      value={pair.colB || ""}
                      onChange={(e) => handleCompareChange(index, "B", e.target.value)}
                      className="w-full px-2 py-1 text-xs border border-slate-300 bg-white rounded outline-none shadow-xs"
                    >
                      <option value="">-- Chọn mục tiêu --</option>
                    {headersB.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>

              {schema.comparePairs.length > 1 && (
                <button
                  type="button"
                  onClick={() => handleRemoveCompareRow(index)}
                  className="p-1 text-slate-400 hover:text-rose-600 rounded mt-4 transition cursor-pointer"
                  title="Xoá cặp so sánh"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Group By Toggle Switch */}
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-150 flex flex-col gap-3 mt-2 font-sans">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-slate-700">Tính toán & Gộp theo bản ghi trùng</span>
            <p className="text-[10px] text-slate-400">
              Gộp các bản ghi trùng và tính toán ({schema.groupByEnabled
                ? { sum: 'Tổng (SUM)', count: 'Đếm (COUNT)', average: 'Trung bình (AVERAGE)', min: 'Tối thiểu (MIN)', max: 'Tối đa (MAX)' }[schema.groupByFunction]
                : 'SUM'
              }) trên các cột số đã chọn.
            </p>
          </div>
          
          <button
            onClick={handleToggleGroupBy}
            type="button"
            className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              schema.groupByEnabled ? "bg-indigo-600" : "bg-slate-300"
            }`}
            role="switch"
            id="groupby-toggle"
            aria-checked={schema.groupByEnabled}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                schema.groupByEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {schema.groupByEnabled && (
          <div className="flex items-center gap-2">
            <label className="text-[10px] font-medium text-slate-500">Hàm gộp:</label>
            <select
              value={schema.groupByFunction}
              onChange={(e) => handleGroupByFunctionChange(e.target.value as AggregationFunction)}
              className="flex-1 px-2 py-1.5 text-xs border border-slate-300 bg-white rounded outline-none shadow-xs focus:border-indigo-500"
            >
              <option value="sum">SUM — Tổng</option>
              <option value="count">COUNT — Đếm</option>
              <option value="average">AVERAGE — Trung bình</option>
              <option value="min">MIN — Tối thiểu</option>
              <option value="max">MAX — Tối đa</option>
            </select>
          </div>
        )}
      </div>

      {/* Trigger Button */}
      <button
        onClick={onRunReconciliation}
        disabled={!canExecute}
        className={`w-full py-2.5 px-4 rounded-md text-xs font-semibold text-center tracking-wide shadow-sm transition-all focus:outline-none ${
          canExecute
            ? "bg-indigo-700 hover:bg-indigo-800 text-white cursor-pointer active:scale-[0.99]"
            : "bg-slate-100 text-slate-400 border border-slate-205 cursor-not-allowed"
        }`}
        id="run-reconcile-btn"
      >
        Chạy đối soát (dưới 2 giây)
      </button>
    </div>
  );
}
