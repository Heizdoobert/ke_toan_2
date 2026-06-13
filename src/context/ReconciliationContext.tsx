import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { SourceData, ReconciliationSchema, ReconciliationResult } from '../types';

/* ─── State Interface ─── */

interface ReconciliationState {
  sourceA: SourceData;
  sourceB: SourceData;
  loadedHeadersA: string[];
  loadedHeadersB: string[];
  schema: ReconciliationSchema;
  reconciledResults: ReconciliationResult[];
  progress: number;
  elapsedTime: number;
  isProcessing: boolean;
  pasteA: string;
  pasteB: string;
  activeInputTabA: 'file' | 'paste';
  activeInputTabB: 'file' | 'paste';
}

/* ─── Context Value Interface ─── */

interface ReconciliationContextValue {
  state: ReconciliationState;
  setSourceA: (data: SourceData) => void;
  setSourceB: (data: SourceData) => void;
  setLoadedHeadersA: (headers: string[]) => void;
  setLoadedHeadersB: (headers: string[]) => void;
  updateSchema: (schema: ReconciliationSchema) => void;
  setReconciledResults: (results: ReconciliationResult[]) => void;
  setProgress: (p: number) => void;
  setElapsedTime: (t: number) => void;
  setIsProcessing: (v: boolean) => void;
  setPasteA: (v: string) => void;
  setPasteB: (v: string) => void;
  setActiveInputTabA: (tab: 'file' | 'paste') => void;
  setActiveInputTabB: (tab: 'file' | 'paste') => void;
  clearAll: () => void;
}

/* ─── Initial State ─── */

const initialState: ReconciliationState = {
  sourceA: { headers: [], rows: [], fileName: '' },
  sourceB: { headers: [], rows: [], fileName: '' },
  loadedHeadersA: [],
  loadedHeadersB: [],
  schema: {
    keysA: [''],
    keysB: [''],
    comparePairs: [{ colA: '', colB: '' }],
    groupByEnabled: false,
  },
  reconciledResults: [],
  progress: 0,
  elapsedTime: 0,
  isProcessing: false,
  pasteA: '',
  pasteB: '',
  activeInputTabA: 'file',
  activeInputTabB: 'file',
};

/* ─── Context ─── */

const ReconciliationContext = createContext<ReconciliationContextValue | null>(null);

/* ─── Provider ─── */

export function ReconciliationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ReconciliationState>(initialState);

  // Helper setters
  const setSourceA = useCallback((data: SourceData) => {
    setState(prev => ({ ...prev, sourceA: data }));
  }, []);

  const setSourceB = useCallback((data: SourceData) => {
    setState(prev => ({ ...prev, sourceB: data }));
  }, []);

  const setLoadedHeadersA = useCallback((headers: string[]) => {
    setState(prev => ({ ...prev, loadedHeadersA: headers }));
  }, []);

  const setLoadedHeadersB = useCallback((headers: string[]) => {
    setState(prev => ({ ...prev, loadedHeadersB: headers }));
  }, []);

  const setReconciledResults = useCallback((results: ReconciliationResult[]) => {
    setState(prev => ({ ...prev, reconciledResults: results }));
  }, []);

  const setProgress = useCallback((p: number) => {
    setState(prev => ({ ...prev, progress: p }));
  }, []);

  const setElapsedTime = useCallback((t: number) => {
    setState(prev => ({ ...prev, elapsedTime: t }));
  }, []);

  const setIsProcessing = useCallback((v: boolean) => {
    setState(prev => ({ ...prev, isProcessing: v }));
  }, []);

  const setPasteA = useCallback((v: string) => {
    setState(prev => ({ ...prev, pasteA: v }));
  }, []);

  const setPasteB = useCallback((v: string) => {
    setState(prev => ({ ...prev, pasteB: v }));
  }, []);

  const setActiveInputTabA = useCallback((tab: 'file' | 'paste') => {
    setState(prev => ({ ...prev, activeInputTabA: tab }));
  }, []);

  const setActiveInputTabB = useCallback((tab: 'file' | 'paste') => {
    setState(prev => ({ ...prev, activeInputTabB: tab }));
  }, []);

  // updateSchema — persists to localStorage
  const updateSchema = useCallback((newSchema: ReconciliationSchema) => {
    setState(prev => {
      const cacheObj = {
        schema: newSchema,
        headersA: prev.sourceA.headers.length > 0 ? prev.sourceA.headers : prev.loadedHeadersA,
        headersB: prev.sourceB.headers.length > 0 ? prev.sourceB.headers : prev.loadedHeadersB,
      };
      localStorage.setItem('reconciler_cached_rules', JSON.stringify(cacheObj));
      return { ...prev, schema: newSchema };
    });
  }, []);

  // clearAll — resets everything and clears cache
  const clearAll = useCallback(() => {
    localStorage.removeItem('reconciler_cached_rules');
    setState(initialState);
  }, []);

  const value: ReconciliationContextValue = {
    state,
    setSourceA,
    setSourceB,
    setLoadedHeadersA,
    setLoadedHeadersB,
    updateSchema,
    setReconciledResults,
    setProgress,
    setElapsedTime,
    setIsProcessing,
    setPasteA,
    setPasteB,
    setActiveInputTabA,
    setActiveInputTabB,
    clearAll,
  };

  return (
    <ReconciliationContext.Provider value={value}>
      {children}
    </ReconciliationContext.Provider>
  );
}

/* ─── Consumer Hook ─── */

export function useReconciliationContext() {
  const ctx = useContext(ReconciliationContext);
  if (!ctx) throw new Error('useReconciliationContext must be used within ReconciliationProvider');
  return ctx;
}
