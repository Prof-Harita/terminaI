/**
 * @license
 * Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import type { ToolEvent } from '../types/cli';

export interface ContextFile {
  path: string;
  tokens: number;
}

interface ExecutionState {
  toolEvents: ToolEvent[];
  currentToolStatus: string | null;
  isWaitingForInput: boolean;
  contextUsed: number;
  contextLimit: number;
  contextFiles: ContextFile[];
  /**
   * @deprecated Use `useBridgeStore().getCurrentTaskId()` instead.
   * This field is synced from BridgeStore for legacy compatibility.
   * The authoritative source of truth for task IDs is now the BridgeStore.
   * This field will be removed in a future version.
   */
  activeTaskId: string | null;

  addToolEvent: (event: ToolEvent) => void;
  updateToolEvent: (id: string, updates: Partial<ToolEvent>) => void;
  appendTerminalOutput: (id: string, text: string) => void;
  setToolStatus: (status: string | null) => void;
  setWaitingForInput: (waiting: boolean) => void;
  setContextUsage: (used: number, limit: number) => void;
  setContextFiles: (files: ContextFile[]) => void;
  clearEvents: () => void;
  /**
   * @deprecated This is called by useCliProcess to sync from BridgeStore.
   * Do not call directly. Use BridgeStore for task ID management.
   */
  setActiveTaskId: (id: string | null) => void;
}

export const useExecutionStore = create<ExecutionState>((set) => ({
  toolEvents: [],
  currentToolStatus: null,
  isWaitingForInput: false,
  contextUsed: 0,
  contextLimit: 1000000,
  contextFiles: [],
  activeTaskId: null,

  addToolEvent: (event) =>
    set((state) => ({
      toolEvents: [...state.toolEvents, event],
    })),

  updateToolEvent: (id, updates) =>
    set((state) => ({
      toolEvents: state.toolEvents.map((e) =>
        e.id === id ? { ...e, ...updates } : e,
      ),
    })),

  appendTerminalOutput: (id, text) =>
    set((state) => ({
      toolEvents: state.toolEvents.map((e) =>
        e.id === id
          ? { ...e, terminalOutput: (e.terminalOutput + text).slice(-100000) } // 100KB max
          : e,
      ),
    })),

  setToolStatus: (currentToolStatus) => set({ currentToolStatus }),

  setWaitingForInput: (isWaitingForInput) => set({ isWaitingForInput }),

  setContextUsage: (contextUsed, contextLimit) =>
    set({ contextUsed, contextLimit }),

  setContextFiles: (contextFiles) => set({ contextFiles }),

  clearEvents: () =>
    set({
      toolEvents: [],
      currentToolStatus: null,
      isWaitingForInput: false,
      contextFiles: [],
      activeTaskId: null,
    }),

  setActiveTaskId: (activeTaskId) => set({ activeTaskId }),
}));
