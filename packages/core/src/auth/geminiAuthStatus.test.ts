/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkGeminiAuthStatusNonInteractive } from './geminiAuthStatus.js';
import { AuthType } from '../core/contentGenerator.js';
import { Storage } from '../config/storage.js';
import { loadApiKey } from '../core/apiKeyCredentialStorage.js';
import * as fs from 'node:fs';

vi.mock('../config/storage.js', () => ({
  Storage: {
    getOAuthCredsPath: vi.fn(),
  },
}));

vi.mock('../core/apiKeyCredentialStorage.js', () => ({
  loadApiKey: vi.fn(),
}));

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  };
});

describe('checkGeminiAuthStatusNonInteractive', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.mocked(loadApiKey).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('should return required if no auth type selected and no envs', async () => {
    const result = await checkGeminiAuthStatusNonInteractive(undefined, {});
    expect(result.status).toBe('required');
  });

  it('should return ok if no auth type but GEMINI_API_KEY env present', async () => {
    const result = await checkGeminiAuthStatusNonInteractive(undefined, {
      GEMINI_API_KEY: 'test',
    });
    expect(result.status).toBe('ok');
  });

  it('should return ok for USE_GEMINI with key', async () => {
    const result = await checkGeminiAuthStatusNonInteractive(
      AuthType.USE_GEMINI,
      {
        GEMINI_API_KEY: 'test',
      },
    );
    expect(result.status).toBe('ok');
  });

  it('should return required for USE_GEMINI without key', async () => {
    const result = await checkGeminiAuthStatusNonInteractive(
      AuthType.USE_GEMINI,
      {},
    );
    expect(result.status).toBe('required');
  });

  it('should return ok for LOGIN_WITH_GOOGLE if oauth file exists', async () => {
    vi.mocked(Storage.getOAuthCredsPath).mockReturnValue('/fake/path.json');
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue('{}');

    const result = await checkGeminiAuthStatusNonInteractive(
      AuthType.LOGIN_WITH_GOOGLE,
      {},
    );
    expect(result.status).toBe('ok');
  });

  it('should return required for LOGIN_WITH_GOOGLE if oauth file missing', async () => {
    vi.mocked(Storage.getOAuthCredsPath).mockReturnValue('/fake/path.json');
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = await checkGeminiAuthStatusNonInteractive(
      AuthType.LOGIN_WITH_GOOGLE,
      {},
    );
    expect(result.status).toBe('required');
  });

  it('should return ok for USE_VERTEX_AI with envs', async () => {
    const result = await checkGeminiAuthStatusNonInteractive(
      AuthType.USE_VERTEX_AI,
      {
        GOOGLE_CLOUD_PROJECT: 'proj',
        GOOGLE_CLOUD_LOCATION: 'loc',
      },
    );
    expect(result.status).toBe('ok');
  });

  it('should return ok for USE_VERTEX_AI with API Key (express mode)', async () => {
    const result = await checkGeminiAuthStatusNonInteractive(
      AuthType.USE_VERTEX_AI,
      {
        GOOGLE_API_KEY: 'key',
      },
    );
    expect(result.status).toBe('ok');
  });

  it('should return required for USE_VERTEX_AI missing all', async () => {
    const result = await checkGeminiAuthStatusNonInteractive(
      AuthType.USE_VERTEX_AI,
      {},
    );
    expect(result.status).toBe('required');
  });
});
