/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMockConfig, TEST_REMOTE_TOKEN } from '../utils/testing_utils.js';
import type { Config } from '@terminai/core';

const loadConfigSpy = vi.hoisted(() => vi.fn());

vi.mock('../config/config.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../config/config.js')>();
  return {
    ...actual,
    loadConfig: loadConfigSpy,
  };
});

describe('deferred auth default (Task 18)', () => {
  beforeEach(() => {
    process.env['NODE_ENV'] = 'test';
    process.env['GEMINI_WEB_REMOTE_TOKEN'] = TEST_REMOTE_TOKEN;

    delete process.env['TERMINAI_A2A_DEFER_AUTH'];
    delete process.env['GEMINI_A2A_DEFER_AUTH'];
    delete process.env['TERMINAI_SIDECAR'];

    loadConfigSpy.mockResolvedValue(
      createMockConfig({
        refreshAuth: vi.fn().mockResolvedValue(undefined),
        getWebRemoteRelayUrl: vi.fn().mockReturnValue(undefined),
      }) as Config,
    );
  });

  afterEach(() => {
    delete process.env['GEMINI_WEB_REMOTE_TOKEN'];
    delete process.env['TERMINAI_SIDECAR'];
    vi.resetAllMocks();
  });

  it(
    'enables deferLlmAuth when TERMINAI_SIDECAR=1',
    { timeout: 15000 },
    async () => {
      process.env['TERMINAI_SIDECAR'] = '1';
      const { createApp } = await import('./app.js');

      await createApp();

      // Signature: loadConfig(loadedSettings, extensionLoader, taskId, targetDir?, { deferLlmAuth })
      const lastCall = loadConfigSpy.mock.calls.at(-1);
      expect(lastCall?.[2]).toBe('a2a-server');
      expect(lastCall?.[4]).toEqual({ deferLlmAuth: true });
    },
  );
});
