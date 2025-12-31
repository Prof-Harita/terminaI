/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { postToAgent } from '../utils/agentClient';
import { readSseStream } from '../utils/sse';

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

  // General
  previewFeatures: boolean;
  setPreviewFeatures: (enabled: boolean) => void;

  // Editor / Terminal
  preferredEditor: string;
  setPreferredEditor: (editor: string) => void;
  outputFormat: 'text' | 'json';
  setOutputFormat: (format: 'text' | 'json') => void;

  // Actions
  signOut: () => void;
}

// Helper to sync settings to CLI
// Helper to sync settings to CLI via Agent API
const syncToCli = async (setting: string, value: string | boolean | number) => {
  const state = useSettingsStore.getState();
  const { agentUrl, agentToken, agentWorkspacePath } = state;

  if (!agentUrl || !agentToken) return;

  const text = `/config set ${setting} ${value}`;
  const body = {
    jsonrpc: '2.0',
    id: 'sync-' + Date.now(),
    method: 'message/stream',
    params: {
      message: {
        kind: 'message',
        role: 'user',
        parts: [{ kind: 'text', text }],
        messageId: crypto.randomUUID(),
      },
      metadata: {
        coderAgent: {
          kind: 'agent-settings',
          workspacePath: agentWorkspacePath || '/tmp',
        },
      },
    },
  };

  try {
    const stream = await postToAgent(agentUrl, agentToken, body);
    // Consume stream to ensure processing
    await readSseStream(stream, () => {});
  } catch (err) {
    console.warn('Settings sync failed:', err);
  }
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

        // Sync modes for policy engine
        let modes: string[] = [];
        if (approvalMode === 'safe') modes = ['safe'];
        if (approvalMode === 'yolo') modes = ['yolo'];
        syncToCli('security.modes', JSON.stringify(modes));
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

      // General
      previewFeatures: false,
      setPreviewFeatures: (previewFeatures) => {
        set({ previewFeatures });
        syncToCli('general.previewFeatures', previewFeatures);
      },

      // Editor / Terminal
      preferredEditor: '',
      setPreferredEditor: (preferredEditor) => {
        set({ preferredEditor });
        syncToCli('general.preferredEditor', preferredEditor);
      },
      outputFormat: 'text',
      setOutputFormat: (outputFormat) => {
        set({ outputFormat });
        syncToCli('output.format', outputFormat);
      },

      // Actions
      signOut: () => set({ email: '' }),
    }),
    {
      name: 'termai-settings',
    },
  ),
);
