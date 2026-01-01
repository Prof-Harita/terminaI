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
  // BM-1 FIX: Persistent conversation ID that survives STREAM_ENDED
  currentConversationId: string | null;
  dispatch: (action: BridgeAction) => void;
  setCliInstanceId: (id: string | null) => void;
  // BM-1 FIX: Explicit methods for conversation management
  setCurrentConversationId: (id: string | null) => void;
  clearConversation: () => void;

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
      // BM-1 FIX: Persistent conversation ID
      currentConversationId: null,

      dispatch: (action: BridgeAction) => {
        const oldState = get().state;
        const newState = bridgeReducer(oldState, action);

        // BM-1 FIX: Capture taskId when stream starts, preserve across stream end
        if (action.type === 'STREAM_STARTED' && action.taskId) {
          set({
            state: newState,
            currentConversationId: action.taskId,
          });
        } else {
          set({ state: newState });
        }
      },

      setCliInstanceId: (id: string | null) => {
        set({ cliInstanceId: id });
      },

      // BM-1 FIX: Conversation management
      setCurrentConversationId: (id: string | null) => {
        set({ currentConversationId: id });
      },

      clearConversation: () => {
        set({ currentConversationId: null });
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
        const store = get();
        // BM-1 FIX: Prefer persistent conversationId over transient state.taskId
        // This ensures conversation context survives STREAM_ENDED
        if (store.currentConversationId) {
          return store.currentConversationId;
        }
        if ('taskId' in store.state) {
          return store.state.taskId;
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
        // Persist both for reconnection detection
        cliInstanceId: state.cliInstanceId,
        // IMPORTANT FIX: Persist conversation ID so page refresh doesn't lose context
        currentConversationId: state.currentConversationId,
      }),
    },
  ),
);
