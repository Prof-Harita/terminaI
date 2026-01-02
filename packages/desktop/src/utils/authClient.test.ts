/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthClient } from './authClient';

const buildSignedHeadersSpy = vi.hoisted(() => vi.fn());

vi.mock('./agentClient', () => ({
  buildSignedHeaders: buildSignedHeadersSpy,
}));

describe('AuthClient', () => {
  beforeEach(() => {
    buildSignedHeadersSpy.mockResolvedValue({
      Authorization: 'Bearer token',
      'X-Gemini-Nonce': 'nonce',
      'X-Gemini-Signature': 'sig',
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ status: 'ok', authType: null }),
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('signs GET /auth/status with empty bodyString', async () => {
    const client = new AuthClient('http://127.0.0.1:41242', 'token');
    await client.getStatus();

    expect(buildSignedHeadersSpy).toHaveBeenCalledWith({
      token: 'token',
      method: 'GET',
      pathWithQuery: '/auth/status',
      bodyString: '',
    });
  });

  it('signs POST /auth/gemini/api-key with matching bodyString', async () => {
    const client = new AuthClient('http://127.0.0.1:41242', 'token');
    await client.setApiKey('abc');

    expect(buildSignedHeadersSpy).toHaveBeenCalledWith({
      token: 'token',
      method: 'POST',
      pathWithQuery: '/auth/gemini/api-key',
      bodyString: JSON.stringify({ apiKey: 'abc' }),
    });
  });
});
