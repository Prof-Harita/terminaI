/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { LoadedSettings } from './settings.js';

const refreshAuthSpy = vi.hoisted(() => vi.fn());

vi.mock('@terminai/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@terminai/core')>();

  class MockConfig {
    constructor(private readonly params: Record<string, unknown>) {}

    async initialize(): Promise<void> {}

    getProviderConfig(): unknown {
      return this.params['providerConfig'];
    }

    getGeminiMdFileCount(): number {
      return 0;
    }

    async refreshAuth(authType: unknown): Promise<void> {
      refreshAuthSpy(authType);
    }
  }

  return {
    ...actual,
    Config: MockConfig,
    FileDiscoveryService: class {},
    loadServerHierarchicalMemory: vi
      .fn()
      .mockResolvedValue({ memoryContent: '', fileCount: 0 }),
    startupProfiler: { flush: vi.fn() },
  };
});

describe('loadConfig provider auth selection', () => {
  beforeEach(() => {
    refreshAuthSpy.mockReset();
    delete process.env['GEMINI_API_KEY'];
    delete process.env['USE_CCPA'];
  });

  it(
    'uses USE_OPENAI_CHATGPT_OAUTH when llm.provider is openai_chatgpt_oauth',
    { timeout: 20000 },
    async () => {
      const { AuthType, LlmProviderId } = await import('@terminai/core');
      const { loadConfig } = await import('./config.js');

      const loadedSettings = {
        merged: {
          llm: {
            provider: 'openai_chatgpt_oauth',
            openaiChatgptOauth: { model: 'gpt-5.2-codex' },
          },
          security: { auth: {} },
        },
      } as unknown as LoadedSettings;

      const cfg = await loadConfig(
        loadedSettings,
        {} as unknown as import('@terminai/core').ExtensionLoader,
        'a2a-server',
        process.cwd(),
      );

      expect(
        (
          cfg as unknown as { getProviderConfig: () => { provider: string } }
        ).getProviderConfig().provider,
      ).toBe(LlmProviderId.OPENAI_CHATGPT_OAUTH);
      expect(refreshAuthSpy).toHaveBeenCalledWith(
        AuthType.USE_OPENAI_CHATGPT_OAUTH,
      );
    },
  );
});
