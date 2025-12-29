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

  addToolEvent: (event: ToolEvent) => void;
  updateToolEvent: (id: string, updates: Partial<ToolEvent>) => void;
  appendTerminalOutput: (id: string, text: string) => void;
  setToolStatus: (status: string | null) => void;
  setWaitingForInput: (waiting: boolean) => void;
  setContextUsage: (used: number, limit: number) => void;
  setContextFiles: (files: ContextFile[]) => void;
  clearEvents: () => void;
}

export const useExecutionStore = create<ExecutionState>((set) => ({
  toolEvents: [],
  currentToolStatus: null,
  isWaitingForInput: false,
  contextUsed: 0,
  contextLimit: 1000000, // Default 1M tokens
  contextFiles: [],

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
        e.id === id ? { ...e, terminalOutput: e.terminalOutput + text } : e,
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
    }),
}));
