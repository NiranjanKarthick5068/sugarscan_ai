import { create } from 'zustand';

interface LiveState {
  severity: 'normal' | 'warning' | 'critical';
  setSeverity: (severity: 'normal' | 'warning' | 'critical') => void;
}

export const useLiveStore = create<LiveState>((set) => ({
  severity: 'normal',
  setSeverity: (severity) => set({ severity }),
}));
