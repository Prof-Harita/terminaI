/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';

export type VoiceState = 'IDLE' | 'LISTENING' | 'PROCESSING' | 'SPEAKING';

interface VoiceStoreState {
  state: VoiceState;
  ttsAbortController: AbortController | null;

  startListening: () => void;
  stopListening: () => void;
  handleSttResult: () => void;

  startSpeaking: () => AbortSignal;
  stopSpeaking: () => void;
}

export const useVoiceStore = create<VoiceStoreState>((set, get) => ({
  state: 'IDLE',
  ttsAbortController: null,

  startListening: () => {
    const current = get().ttsAbortController;
    if (current) {
      current.abort();
    }
    set({ state: 'LISTENING', ttsAbortController: null });
  },

  stopListening: () => {
    set((prev) => ({
      ...prev,
      state: prev.state === 'LISTENING' ? 'PROCESSING' : prev.state,
    }));
  },

  handleSttResult: () => {
    set({ state: 'PROCESSING' });
  },

  startSpeaking: () => {
    const controller = new AbortController();
    set({ state: 'SPEAKING', ttsAbortController: controller });
    return controller.signal;
  },

  stopSpeaking: () => {
    const current = get().ttsAbortController;
    if (current) {
      current.abort();
    }
    set({ state: 'IDLE', ttsAbortController: null });
  },
}));
