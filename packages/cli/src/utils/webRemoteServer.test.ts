/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const createAppSpy = vi.fn();
const updateCoderAgentCardUrlSpy = vi.fn();
const createRemoteAuthStateSpy = vi.fn();
const loadRemoteAuthStateSpy = vi.fn();
const saveRemoteAuthStateSpy = vi.fn();
const getRemoteAuthPathSpy = vi.fn(() => '/tmp/web-remote-auth.json');

vi.mock('@terminai/a2a-server', () => ({
  createApp: createAppSpy,
  updateCoderAgentCardUrl: updateCoderAgentCardUrlSpy,
  createRemoteAuthState: createRemoteAuthStateSpy,
  loadRemoteAuthState: loadRemoteAuthStateSpy,
  saveRemoteAuthState: saveRemoteAuthStateSpy,
  getRemoteAuthPath: getRemoteAuthPathSpy,
}));

describe('webRemoteServer', () => {
  const originalEnvToken = process.env['TERMINAI_WEB_REMOTE_TOKEN'];
  const originalEnvTokenLegacy = process.env['GEMINI_WEB_REMOTE_TOKEN'];
  const originalEnvOrigins = process.env['TERMINAI_WEB_REMOTE_ALLOWED_ORIGINS'];
  const originalEnvOriginsLegacy =
    process.env['GEMINI_WEB_REMOTE_ALLOWED_ORIGINS'];

  beforeEach(() => {
    createAppSpy.mockReset();
    updateCoderAgentCardUrlSpy.mockReset();
    createRemoteAuthStateSpy.mockReset();
    loadRemoteAuthStateSpy.mockReset();
    saveRemoteAuthStateSpy.mockReset();
    getRemoteAuthPathSpy.mockClear();
    delete process.env['TERMINAI_WEB_REMOTE_TOKEN'];
    delete process.env['GEMINI_WEB_REMOTE_TOKEN'];
    delete process.env['TERMINAI_WEB_REMOTE_ALLOWED_ORIGINS'];
    delete process.env['GEMINI_WEB_REMOTE_ALLOWED_ORIGINS'];
  });

  afterEach(() => {
    if (originalEnvToken !== undefined) {
      process.env['TERMINAI_WEB_REMOTE_TOKEN'] = originalEnvToken;
    } else {
      delete process.env['TERMINAI_WEB_REMOTE_TOKEN'];
    }
    if (originalEnvTokenLegacy !== undefined) {
      process.env['GEMINI_WEB_REMOTE_TOKEN'] = originalEnvTokenLegacy;
    } else {
      delete process.env['GEMINI_WEB_REMOTE_TOKEN'];
    }
    if (originalEnvOrigins !== undefined) {
      process.env['TERMINAI_WEB_REMOTE_ALLOWED_ORIGINS'] = originalEnvOrigins;
    } else {
      delete process.env['TERMINAI_WEB_REMOTE_ALLOWED_ORIGINS'];
    }
    if (originalEnvOriginsLegacy !== undefined) {
      process.env['GEMINI_WEB_REMOTE_ALLOWED_ORIGINS'] =
        originalEnvOriginsLegacy;
    } else {
      delete process.env['GEMINI_WEB_REMOTE_ALLOWED_ORIGINS'];
    }
    vi.restoreAllMocks();
  });

  it('detects loopback hosts', async () => {
    const { isLoopbackHost } = await import('./webRemoteServer.js');
    expect(isLoopbackHost('localhost')).toBe(true);
    expect(isLoopbackHost('127.0.0.1')).toBe(true);
    expect(isLoopbackHost('127.0.1.1')).toBe(true);
    expect(isLoopbackHost('::1')).toBe(true);
    expect(isLoopbackHost('0.0.0.0')).toBe(false);
  }, 15_000);

  it('uses token override without persisting', async () => {
    const { ensureWebRemoteAuth } = await import('./webRemoteServer.js');
    const result = await ensureWebRemoteAuth({
      host: '127.0.0.1',
      port: 0,
      allowedOrigins: [],
      tokenOverride: 'override-token',
    });
    expect(result.tokenSource).toBe('override');
    expect(result.token).toBe('override-token');
    expect(saveRemoteAuthStateSpy).not.toHaveBeenCalled();
  });

  it('starts server and sets allowed origins', async () => {
    const listenSpy = vi.fn(() => ({
      address: () => ({ port: 41242 }),
      close: vi.fn(),
      once: vi.fn((event, cb) => {
        if (event === 'listening') cb();
        return this;
      }),
    }));
    createAppSpy.mockResolvedValue({ listen: listenSpy });

    const { startWebRemoteServer } = await import('./webRemoteServer.js');
    const result = await startWebRemoteServer({
      host: '127.0.0.1',
      port: 0,
      allowedOrigins: ['https://example.com'],
    });

    expect(createAppSpy).toHaveBeenCalled();
    expect(listenSpy).toHaveBeenCalledWith(0, '127.0.0.1');
    expect(updateCoderAgentCardUrlSpy).toHaveBeenCalledWith(41242, '127.0.0.1');
    expect(result.port).toBe(41242);
    expect(result.url).toMatch(
      /^http:\/\/127\.0\.0\.1:41242\/ui\?token=[0-9a-f]{64}$/,
    );
    expect(process.env['TERMINAI_WEB_REMOTE_ALLOWED_ORIGINS']).toBe(
      'https://example.com',
    );
    expect(process.env['GEMINI_WEB_REMOTE_ALLOWED_ORIGINS']).toBe(
      'https://example.com',
    );
  });
});
