/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthType, type Config } from '@terminai/core';
import { AuthConflictError, LlmAuthManager } from './llmAuthManager.js';

const mockCheck = vi.hoisted(() => vi.fn());
const mockBeginFlow = vi.hoisted(() => vi.fn());
const mockSaveApiKey = vi.hoisted(() => vi.fn());

vi.mock('@terminai/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@terminai/core')>();
  return {
    ...actual,
    checkGeminiAuthStatusNonInteractive: mockCheck,
    beginGeminiOAuthLoopbackFlow: mockBeginFlow,
    saveApiKey: mockSaveApiKey,
  };
});

describe('LlmAuthManager', () => {
  let mockConfig: Config;

  beforeEach(() => {
    mockConfig = {
      // Config is heavyweight; we only need refreshAuth for these unit tests.
      refreshAuth: vi.fn().mockResolvedValue(undefined),
      getProxy: vi.fn().mockReturnValue(undefined),
    } as unknown as Config;

    mockCheck.mockResolvedValue({ status: 'required' });
    mockSaveApiKey.mockResolvedValue(undefined);

    delete process.env['GOOGLE_CLOUD_PROJECT'];
    delete process.env['GOOGLE_CLOUD_LOCATION'];
    delete process.env['GOOGLE_API_KEY'];
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('reports in_progress after starting OAuth', async () => {
    const waitForCompletion = new Promise<void>(() => {});
    const cancel = vi.fn();
    mockBeginFlow.mockResolvedValue({
      authUrl: 'https://example.test/auth',
      waitForCompletion,
      cancel,
    });

    const manager = new LlmAuthManager({
      config: mockConfig,
      getSelectedAuthType: () => AuthType.LOGIN_WITH_GOOGLE,
    });

    const start = await manager.startGeminiOAuth();
    expect(start.authUrl).toBe('https://example.test/auth');

    const status = await manager.getStatus();
    expect(status.status).toBe('in_progress');
    expect(status.authType).toBe(AuthType.LOGIN_WITH_GOOGLE);
  });

  it('prevents starting a second OAuth flow concurrently', async () => {
    const waitForCompletion = new Promise<void>(() => {});
    mockBeginFlow.mockResolvedValue({
      authUrl: 'https://example.test/auth',
      waitForCompletion,
      cancel: vi.fn(),
    });

    const manager = new LlmAuthManager({
      config: mockConfig,
      getSelectedAuthType: () => AuthType.LOGIN_WITH_GOOGLE,
    });

    await manager.startGeminiOAuth();
    await expect(manager.startGeminiOAuth()).rejects.toBeInstanceOf(
      AuthConflictError,
    );
  });

  it('submits Gemini API key via keychain and refreshAuth', async () => {
    mockCheck.mockResolvedValue({ status: 'ok' });

    const manager = new LlmAuthManager({
      config: mockConfig,
      getSelectedAuthType: () => AuthType.USE_GEMINI,
    });

    const status = await manager.submitGeminiApiKey('  test-key  ');
    expect(mockSaveApiKey).toHaveBeenCalledWith('test-key');
    expect(mockConfig.refreshAuth).toHaveBeenCalledWith(AuthType.USE_GEMINI);
    expect(status.status).toBe('ok');
  });

  it('returns required for Vertex when env is missing', async () => {
    const manager = new LlmAuthManager({
      config: mockConfig,
      getSelectedAuthType: () => AuthType.USE_VERTEX_AI,
    });

    const status = await manager.useGeminiVertex();
    expect(status.status).toBe('required');
    expect(status.authType).toBe(AuthType.USE_VERTEX_AI);
  });
});
