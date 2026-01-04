/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSettingsStore } from './settingsStore';

// Mock dependencies
vi.mock('../utils/agentClient', () => ({
  postToAgent: vi.fn().mockResolvedValue({
    getReader: () => ({
      read: async () => ({ done: true, value: undefined }),
    }),
  }),
}));

vi.mock('../utils/sse', () => ({
  readSseStream: vi.fn(),
}));

// Mock window.matchMedia
Object.defineProperty(global, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock localStorage
const localStorageMock = (function () {
  let store: Record<string, string> = {};
  return {
    getItem(key: string) {
      return store[key] || null;
    },
    setItem(key: string, value: string) {
      store[key] = value.toString();
    },
    clear() {
      store = {};
    },
    removeItem(key: string) {
      delete store[key];
    },
  };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

describe('settingsStore', () => {
  beforeEach(() => {
    localStorageMock.clear();
    useSettingsStore.setState({
      provider: 'gemini',
      openaiConfig: undefined,
      theme: 'dark',
    });
  });

  describe('Provider Settings', () => {
    it('should update provider', () => {
      const { setProvider } = useSettingsStore.getState();
      setProvider('ollama');
      expect(useSettingsStore.getState().provider).toBe('ollama');
    });

    it('should update openaiConfig', () => {
      const { setOpenAIConfig } = useSettingsStore.getState();
      const config = {
        baseUrl: 'http://localhost:1234',
        model: 'local-llama',
        envVarName: 'TEST_KEY',
      };
      setOpenAIConfig(config);
      expect(useSettingsStore.getState().openaiConfig).toEqual(config);
    });
  });

  describe('Feature Flags', () => {
    it('should toggle voice enabled', () => {
      const { setVoiceEnabled } = useSettingsStore.getState();
      setVoiceEnabled(true);
      expect(useSettingsStore.getState().voiceEnabled).toBe(true);
    });
  });
});
