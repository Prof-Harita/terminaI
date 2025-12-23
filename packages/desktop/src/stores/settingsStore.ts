/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';

interface SettingsState {
  // Account
  email: string;
  setEmail: (email: string) => void;

  // Agent backend (A2A)
  agentUrl: string;
  setAgentUrl: (url: string) => void;
  agentToken: string;
  setAgentToken: (token: string) => void;
  agentWorkspacePath: string;
  setAgentWorkspacePath: (path: string) => void;

  // Security
  approvalMode: 'safe' | 'prompt' | 'yolo';
  setApprovalMode: (mode: 'safe' | 'prompt' | 'yolo') => void;
  previewMode: boolean;
  setPreviewMode: (enabled: boolean) => void;

  // Model
  provider: 'gemini' | 'ollama';
  setProvider: (provider: 'gemini' | 'ollama') => void;

  // Voice
  voiceEnabled: boolean;
  setVoiceEnabled: (enabled: boolean) => void;
  voiceVolume: number;
  setVoiceVolume: (volume: number) => void;

  // Actions
  signOut: () => void;
}

// Helper to sync settings to CLI
const syncToCli = (setting: string, value: string | boolean) => {
  invoke('send_to_cli', { message: `/config set ${setting} ${value}` }).catch(
    (err) => console.warn('Settings sync failed:', err),
  );
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Account
      email: '',
      setEmail: (email) => set({ email }),

      // Agent backend (A2A)
      agentUrl: 'http://127.0.0.1:41242',
      setAgentUrl: (agentUrl) => set({ agentUrl }),
      agentToken: '',
      setAgentToken: (agentToken) => set({ agentToken }),
      agentWorkspacePath: '/tmp',
      setAgentWorkspacePath: (agentWorkspacePath) =>
        set({ agentWorkspacePath }),

      // Security
      approvalMode: 'prompt',
      setApprovalMode: (approvalMode) => {
        set({ approvalMode });
        syncToCli('yolo', approvalMode === 'yolo');
      },
      previewMode: false,
      setPreviewMode: (previewMode) => {
        set({ previewMode });
        syncToCli('preview', previewMode);
      },

      // Model
      provider: 'gemini',
      setProvider: (provider) => {
        set({ provider });
        syncToCli('provider', provider);
      },

      // Voice
      voiceEnabled: false,
      setVoiceEnabled: (voiceEnabled) => set({ voiceEnabled }),
      voiceVolume: 80,
      setVoiceVolume: (voiceVolume) => set({ voiceVolume }),

      // Actions
      signOut: () => set({ email: '' }),
    }),
    {
      name: 'termai-settings',
    },
  ),
);
