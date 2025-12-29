/**
 * @license
 * Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import type { ToolEvent } from '../types/cli';

interface ExecutionState {
  toolEvents: ToolEvent[];
  currentToolStatus: string | null;
  isWaitingForInput: boolean;

  addToolEvent: (event: ToolEvent) => void;
  updateToolEvent: (id: string, updates: Partial<ToolEvent>) => void;
  appendTerminalOutput: (id: string, text: string) => void;
  setToolStatus: (status: string | null) => void;
  setWaitingForInput: (waiting: boolean) => void;
  clearEvents: () => void;
}

export const useExecutionStore = create<ExecutionState>((set) => ({
  toolEvents: [],
  currentToolStatus: null,
  isWaitingForInput: false,

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

  clearEvents: () =>
    set({ toolEvents: [], currentToolStatus: null, isWaitingForInput: false }),
}));
