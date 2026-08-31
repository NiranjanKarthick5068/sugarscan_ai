import { create } from 'zustand';
import { ScanResult } from '../types';

export type ScanPhase = 'camera' | 'analyzing' | 'results' | 'error';

interface ScanState {
  phase: ScanPhase;
  analyzingStep: 0 | 1 | 2;
  scanResult: ScanResult | null;
  capturedImageUri: string | null;
  error: string | null;
  setPhase: (phase: ScanPhase) => void;
  setAnalyzingStep: (step: 0 | 1 | 2) => void;
  setScanResult: (result: ScanResult | null) => void;
  setCapturedImageUri: (uri: string | null) => void;
  setError: (error: string | null) => void;
  resetScan: () => void;
}

export const useScanStore = create<ScanState>((set) => ({
  phase: 'camera',
  analyzingStep: 0,
  scanResult: null,
  capturedImageUri: null,
  error: null,
  
  setPhase: (phase) => set({ phase }),
  setAnalyzingStep: (step) => set({ analyzingStep: step }),
  setScanResult: (result) => set({ scanResult: result }),
  setCapturedImageUri: (uri) => set({ capturedImageUri: uri }),
  setError: (error) => set({ error }),
  
  resetScan: () => set({
    phase: 'camera',
    analyzingStep: 0,
    scanResult: null,
    capturedImageUri: null,
    error: null,
  }),
}));
