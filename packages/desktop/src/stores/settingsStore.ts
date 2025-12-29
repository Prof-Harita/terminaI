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

  // Theme
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  // MCP Servers
  mcpServers: Array<{
    id: string;
    name: string;
    command: string;
    args: string[];
    enabled: boolean;
  }>;
  addMcpServer: (server: {
    name: string;
    command: string;
    args: string[];
  }) => void;
  removeMcpServer: (id: string) => void;
  toggleMcpServer: (id: string) => void;

  // Notifications
  enableNotifications: boolean;
  setEnableNotifications: (enabled: boolean) => void;
  notificationSound: boolean;
  setNotificationSound: (enabled: boolean) => void;
  notificationType: 'toast' | 'none';
  setNotificationType: (type: 'toast' | 'none') => void;

  relayClientCount: number;
  setRelayClientCount: (count: number) => void;

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

      // Theme
      theme: 'dark',
      setTheme: (theme) => {
        set({ theme });
        const resolved =
          theme === 'system'
            ? window.matchMedia('(prefers-color-scheme: dark)').matches
              ? 'dark'
              : 'light'
            : theme;
        document.documentElement.setAttribute('data-theme', resolved);
      },

      // MCP Servers
      mcpServers: [],
      addMcpServer: (server) => {
        const id = crypto.randomUUID();
        set((state) => ({
          mcpServers: [...state.mcpServers, { ...server, id, enabled: true }],
        }));
        syncToCli(`mcp.server.${server.name}`, JSON.stringify(server));
      },
      removeMcpServer: (id) => {
        set((state) => ({
          mcpServers: state.mcpServers.filter((s) => s.id !== id),
        }));
      },
      toggleMcpServer: (id) => {
        set((state) => {
          const mcpServers = state.mcpServers.map((s) =>
            s.id === id ? { ...s, enabled: !s.enabled } : s,
          );
          const server = mcpServers.find((s) => s.id === id);
          if (server) {
            syncToCli(`mcp.server.${server.name}.enabled`, server.enabled);
          }
          return { mcpServers };
        });
      },

      // Notifications
      enableNotifications: true,
      setEnableNotifications: (enableNotifications) =>
        set({ enableNotifications }),
      notificationSound: true,
      setNotificationSound: (notificationSound) => set({ notificationSound }),
      notificationType: 'toast',
      setNotificationType: (notificationType) => set({ notificationType }),

      relayClientCount: 0,
      setRelayClientCount: (relayClientCount) => set({ relayClientCount }),

      // Actions
      signOut: () => set({ email: '' }),
    }),
    {
      name: 'termai-settings',
    },
  ),
);
