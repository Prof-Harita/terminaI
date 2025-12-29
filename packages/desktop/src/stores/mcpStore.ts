/**
 * @license
 * Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface MCPServer {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  toolCount: number;
  trusted: boolean;
  timeout: number;
  includedTools: string[];
  excludedTools: string[];
}

interface MCPState {
  servers: MCPServer[];
  addServer: (server: Omit<MCPServer, 'id'>) => void;
  updateServer: (id: string, updates: Partial<MCPServer>) => void;
  removeServer: (id: string) => void;
}

export const useMCPStore = create<MCPState>()(
  persist(
    (set) => ({
      servers: [],

      addServer: (server) =>
        set((state) => ({
          servers: [...state.servers, { ...server, id: crypto.randomUUID() }],
        })),

      updateServer: (id, updates) =>
        set((state) => ({
          servers: state.servers.map((s) =>
            s.id === id ? { ...s, ...updates } : s,
          ),
        })),

      removeServer: (id) =>
        set((state) => ({
          servers: state.servers.filter((s) => s.id !== id),
        })),
    }),
    { name: 'mcp-storage' },
  ),
);
