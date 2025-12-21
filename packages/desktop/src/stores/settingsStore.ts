import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { invoke } from '@tauri-apps/api/core';

interface SettingsState {
  // Account
  email: string;
  setEmail: (email: string) => void;

  // Security
  approvalMode: 'safe' | 'prompt' | 'yolo';
  setApprovalMode: (mode: 'safe' | 'prompt' | 'yolo') => void;
  previewMode: boolean;
  setPreviewMode: (enabled: boolean) => void;

  // Model
  provider: 'gemini' | 'ollama';
  setProvider: (provider: 'gemini' | 'ollama') => void;

  // Voice
  voiceVolume: number;
  setVoiceVolume: (volume: number) => void;

  // Actions
  signOut: () => void;
}

// Helper to sync settings to CLI
const syncToCli = (setting: string, value: string | boolean) => {
  invoke('send_to_cli', { message: `/config set ${setting} ${value}` })
    .catch(err => console.warn('Settings sync failed:', err));
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Account
      email: '',
      setEmail: (email) => set({ email }),

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
      voiceVolume: 80,
      setVoiceVolume: (voiceVolume) => set({ voiceVolume }),

      // Actions
      signOut: () => set({ email: '' }),
    }),
    {
      name: 'termai-settings',
    }
  )
);

