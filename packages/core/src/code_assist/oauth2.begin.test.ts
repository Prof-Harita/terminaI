/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { beginGeminiOAuthLoopbackFlow } from './oauth2.js';
import * as http from 'node:http';
import type { Config } from '../config/config.js';

// Mock http server to prevent actual port binding
vi.mock('node:http', async () => {
  const actual = await vi.importActual<typeof import('node:http')>('node:http');
  return {
    ...actual,
    createServer: vi.fn(),
  };
});

type MockFn = ReturnType<typeof vi.fn>;
interface MockHttpServer {
  listen: MockFn;
  close: MockFn;
  on: MockFn;
}

describe('beginGeminiOAuthLoopbackFlow', () => {
  let mockConfig: Config;
  let mockServer: MockHttpServer;

  beforeEach(() => {
    vi.stubEnv('OAUTH_CALLBACK_PORT', '31337');
    mockConfig = {
      getProxy: () => undefined,
    } as unknown as Config;

    mockServer = {
      listen: vi.fn(),
      close: vi.fn(),
      on: vi.fn(),
    };

    // The production function expects an http.Server; we only need a small subset for testing.
    vi.mocked(http.createServer).mockReturnValue(
      mockServer as unknown as http.Server,
    );
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetAllMocks();
  });

  it('should return authUrl and controls', async () => {
    const result = await beginGeminiOAuthLoopbackFlow(mockConfig);

    expect(result.authUrl).toContain(
      'https://accounts.google.com/o/oauth2/v2/auth',
    );
    expect(result.authUrl).toContain('client_id=');
    expect(result.authUrl).toContain('state=');
    expect(result.authUrl).toContain('redirect_uri=http%3A%2F%2Flocalhost');
    expect(result.waitForCompletion).toBeInstanceOf(Promise);
    expect(typeof result.cancel).toBe('function');
  });

  it('should call server.close() when cancelled', async () => {
    const result = await beginGeminiOAuthLoopbackFlow(mockConfig);

    // Trigger cancel
    try {
      result.cancel();
    } catch (_e) {
      // It might reject the promise, but cancel itself is sync-ish or void
    }

    expect(mockServer.close).toHaveBeenCalled();
    await expect(result.waitForCompletion).rejects.toThrow(
      'User cancelled authentication',
    );
  });
});
