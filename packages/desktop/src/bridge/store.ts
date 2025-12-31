/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BridgeState, BridgeAction, ConfirmationIdentity } from './types';
import { bridgeReducer } from './reducer';

interface BridgeStore {
  state: BridgeState;
  cliInstanceId: string | null;
  dispatch: (action: BridgeAction) => void;
  setCliInstanceId: (id: string | null) => void;

  // Selectors
  isConnected: () => boolean;
  isProcessing: () => boolean;
  getCurrentTaskId: () => string | null;
  getConfirmationIdentity: () => ConfirmationIdentity | null;
}

export const useBridgeStore = create<BridgeStore>()(
  persist(
    (set, get) => ({
      state: { status: 'disconnected' },
      cliInstanceId: null,

      dispatch: (action: BridgeAction) => {
        set((store) => ({
          state: bridgeReducer(store.state, action),
        }));
      },

      setCliInstanceId: (id: string | null) => {
        set({ cliInstanceId: id });
      },

      // Selectors
      isConnected: () => {
        const { status } = get().state;
        return (
          status === 'connected' ||
          status === 'sending' ||
          status === 'streaming' ||
          status === 'awaiting_confirmation' ||
          status === 'executing_tool'
        );
      },

      isProcessing: () => {
        const { status } = get().state;
        return (
          status === 'sending' ||
          status === 'streaming' ||
          status === 'awaiting_confirmation' ||
          status === 'executing_tool'
        );
      },

      getCurrentTaskId: () => {
        const { state } = get();
        if ('taskId' in state) {
          return state.taskId;
        }
        return null;
      },

      getConfirmationIdentity: () => {
        const { state } = get();
        if (state.status === 'awaiting_confirmation') {
          return {
            taskId: state.taskId,
            callId: state.callId,
            confirmationToken: state.confirmationToken,
          };
        }
        return null;
      },
    }),
    {
      name: 'bridge-store',
      partialize: (state) => ({
        // Only persist cliInstanceId for reconnection detection
        cliInstanceId: state.cliInstanceId,
      }),
    },
  ),
);
