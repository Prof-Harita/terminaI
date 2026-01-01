import { create } from 'zustand';

type BootStatus = 'idle' | 'booting' | 'ready' | 'error';

interface SidecarState {
  bootStatus: BootStatus;
  bootLogs: string[];
  error: string | null;
  sidecarPid: number | null; // For future usage

  setBootStatus: (status: BootStatus) => void;
  addLog: (log: string) => void;
  setError: (error: string) => void;
  reset: () => void;
}

export const useSidecarStore = create<SidecarState>((set) => ({
  bootStatus: 'idle',
  bootLogs: [],
  error: null,
  sidecarPid: null,

  setBootStatus: (status) => set({ bootStatus: status }),
  addLog: (log) =>
    set((state) => ({ bootLogs: [...state.bootLogs, log].slice(-100) })), // Keep last 100 lines
  setError: (error) => set({ error, bootStatus: 'error' }),
  reset: () => set({ bootStatus: 'idle', bootLogs: [], error: null }),
}));
