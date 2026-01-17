/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as path from 'node:path';
import { promises as fs } from 'node:fs';
import { tryImportFromCodexCli, tryImportFromOpenCode } from './imports.js';
import { ChatGptOAuthClient } from './oauthClient.js';
import { CHATGPT_ACCOUNT_ID_CLAIM, OPENAI_AUTH_CLAIM } from './constants.js';

// Hoist the mock function so it can be reassigned per test
const mockHomedir = vi.hoisted(() => vi.fn(() => '/tmp'));

vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>();
  return {
    ...actual,
    homedir: mockHomedir,
    default: {
      ...actual,
      homedir: mockHomedir,
      tmpdir: actual.tmpdir,
    },
  };
});

import * as os from 'node:os';

function jwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString(
    'base64url',
  );
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.`;
}

describe('imports', () => {
  const tmpRoot = path.join(
    os.tmpdir(),
    `terminai-chatgpt-oauth-${Date.now()}`,
  );

  beforeEach(async () => {
    await fs.mkdir(tmpRoot, { recursive: true });
    vi.unstubAllEnvs();
  });

  afterEach(async () => {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  it('imports from CODEX_HOME/auth.json', async () => {
    const codexHome = path.join(tmpRoot, 'codex');
    await fs.mkdir(codexHome, { recursive: true });
    await fs.writeFile(
      path.join(codexHome, 'auth.json'),
      JSON.stringify({
        tokens: {
          access_token: jwt({
            [OPENAI_AUTH_CLAIM]: { chatgpt_account_id: 'acct_from_access' },
          }),
          refresh_token: 'refresh123',
          id_token: jwt({
            [OPENAI_AUTH_CLAIM]: { chatgpt_account_id: 'acct_from_id' },
          }),
          account_id: 'acct_stored',
        },
        last_refresh: 123456,
      }),
      'utf8',
    );

    vi.stubEnv('CODEX_HOME', codexHome);

    const payload = await tryImportFromCodexCli(new ChatGptOAuthClient());
    expect(payload?.token.accessToken).toBeTruthy();
    expect(payload?.token.refreshToken).toBe('refresh123');
    // Stored account_id wins
    expect(payload?.accountId).toBe('acct_stored');
    expect(payload?.lastRefresh).toBe(123456);
  });

  it('imports from ~/.opencode/auth/openai.json under HOME', async () => {
    const home = path.join(tmpRoot, 'home');
    await fs.mkdir(path.join(home, '.opencode', 'auth'), { recursive: true });
    await fs.writeFile(
      path.join(home, '.opencode', 'auth', 'openai.json'),
      JSON.stringify({
        type: 'oauth',
        access: jwt({
          [OPENAI_AUTH_CLAIM]: { chatgpt_account_id: 'acct_1' },
        }),
        refresh: 'refresh_1',
        expires: 123,
      }),
      'utf8',
    );

    vi.stubEnv('HOME', home);
    mockHomedir.mockReturnValue(home);

    const payload = await tryImportFromOpenCode(new ChatGptOAuthClient());
    expect(payload?.token.refreshToken).toBe('refresh_1');
    expect(payload?.accountId).toBe('acct_1');
  });

  it('imports legacy flat claim for backwards compatibility', async () => {
    const home = path.join(tmpRoot, 'home-legacy');
    await fs.mkdir(path.join(home, '.opencode', 'auth'), { recursive: true });
    await fs.writeFile(
      path.join(home, '.opencode', 'auth', 'openai.json'),
      JSON.stringify({
        type: 'oauth',
        access: jwt({ [CHATGPT_ACCOUNT_ID_CLAIM]: 'acct_legacy' }),
        refresh: 'refresh_legacy',
      }),
      'utf8',
    );

    vi.stubEnv('HOME', home);
    mockHomedir.mockReturnValue(home);

    const payload = await tryImportFromOpenCode(new ChatGptOAuthClient());
    expect(payload?.token.refreshToken).toBe('refresh_legacy');
    expect(payload?.accountId).toBe('acct_legacy');
  });
});
