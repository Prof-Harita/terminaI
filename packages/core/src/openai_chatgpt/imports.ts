/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import * as os from 'node:os';
import * as path from 'node:path';
import { promises as fs } from 'node:fs';
import type { ChatGptOAuthCredentialPayload } from './types.js';
import { ChatGptOAuthClient } from './oauthClient.js';

const MAX_FILE_BYTES = 1024 * 1024;
const MAX_TOKEN_LENGTH = 10_000;
const MAX_ACCOUNT_ID_LENGTH = 200;

export async function tryImportFromCodexCli(
  client: ChatGptOAuthClient = new ChatGptOAuthClient(),
): Promise<ChatGptOAuthCredentialPayload | null> {
  const codexHome = resolveCodexHome();
  const authPath = path.join(codexHome, 'auth.json');

  const raw = await readJsonFile(authPath).catch((e: unknown) => {
    if (isEnoent(e)) return null;
    throw e;
  });
  if (!raw) return null;

  const parsed = parseCodexAuthJson(raw);
  if (!parsed) return null;

  const accountId = client.deriveAccountId({
    accountId: parsed.accountId,
    idToken: parsed.idToken,
    accessToken: parsed.accessToken,
  });

  return {
    token: {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      tokenType: 'Bearer',
      idToken: parsed.idToken,
      expiresAt: undefined,
      scope: undefined,
    },
    accountId,
    lastRefresh: parsed.lastRefresh ?? Date.now(), // Trust imported token as fresh
  };
}

export async function tryImportFromOpenCode(
  client: ChatGptOAuthClient = new ChatGptOAuthClient(),
): Promise<ChatGptOAuthCredentialPayload | null> {
  const authPath = path.join(os.homedir(), '.opencode', 'auth', 'openai.json');
  const raw = await readJsonFile(authPath).catch((e: unknown) => {
    if (isEnoent(e)) return null;
    throw e;
  });
  if (!raw) return null;

  const parsed = parseOpenCodeAuthJson(raw);
  if (!parsed) return null;

  const accountId = client.deriveAccountId({
    idToken: parsed.idToken,
    accessToken: parsed.accessToken,
  });

  return {
    token: {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      tokenType: 'Bearer',
      idToken: parsed.idToken,
      expiresAt: parsed.expiresAt,
      scope: undefined,
    },
    accountId,
    lastRefresh: Date.now(),
  };
}

function resolveCodexHome(): string {
  const fromEnv = process.env['CODEX_HOME'];
  if (typeof fromEnv === 'string' && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }
  return path.join(os.homedir(), '.codex');
}

async function readJsonFile(filePath: string): Promise<unknown> {
  const stat = await fs.stat(filePath);
  if (stat.size > MAX_FILE_BYTES) {
    throw new Error(`Refusing to read oversized auth file: ${filePath}`);
  }
  const text = await fs.readFile(filePath, 'utf8');
  return JSON.parse(text) as unknown;
}

function parseCodexAuthJson(value: unknown): {
  accessToken: string;
  refreshToken: string;
  idToken?: string;
  accountId?: string;
  lastRefresh?: number;
} | null {
  if (!isPlainObject(value)) return null;
  const tokens = value['tokens'];
  if (!isPlainObject(tokens)) return null;

  const access_token = tokens['access_token'];
  const refresh_token = tokens['refresh_token'];
  const id_token = tokens['id_token'];
  const account_id = tokens['account_id'];
  const last_refresh = value['last_refresh'];

  if (!isStringWithin(access_token, MAX_TOKEN_LENGTH)) return null;
  if (!isStringWithin(refresh_token, MAX_TOKEN_LENGTH)) return null;

  const result: {
    accessToken: string;
    refreshToken: string;
    idToken?: string;
    accountId?: string;
    lastRefresh?: number;
  } = {
    accessToken: access_token.trim(),
    refreshToken: refresh_token.trim(),
  };

  if (isStringWithin(id_token, MAX_TOKEN_LENGTH)) {
    result.idToken = id_token.trim();
  }
  if (isStringWithin(account_id, MAX_ACCOUNT_ID_LENGTH)) {
    result.accountId = account_id.trim();
  }
  if (typeof last_refresh === 'number' && Number.isFinite(last_refresh)) {
    result.lastRefresh = last_refresh;
  }

  return result;
}

function parseOpenCodeAuthJson(value: unknown): {
  accessToken: string;
  refreshToken: string;
  idToken?: string;
  expiresAt?: number;
} | null {
  if (!isPlainObject(value)) return null;

  // Supported shapes:
  // 1) { type: "oauth", access: "...", refresh: "...", expires?: number }
  // 2) { access_token: "...", refresh_token: "...", id_token?: "...", expires_at?: number }

  const type = value['type'];
  if (type !== undefined && type !== 'oauth') {
    return null;
  }

  const access = value['access'] ?? value['access_token'];
  const refresh = value['refresh'] ?? value['refresh_token'];
  const idToken = value['id_token'];
  const expires = value['expires'] ?? value['expires_at'] ?? value['expiresAt'];

  if (!isStringWithin(access, MAX_TOKEN_LENGTH)) return null;
  if (!isStringWithin(refresh, MAX_TOKEN_LENGTH)) return null;

  const parsed: {
    accessToken: string;
    refreshToken: string;
    idToken?: string;
    expiresAt?: number;
  } = {
    accessToken: access.trim(),
    refreshToken: refresh.trim(),
  };

  if (isStringWithin(idToken, MAX_TOKEN_LENGTH)) {
    parsed.idToken = idToken.trim();
  }
  if (typeof expires === 'number' && Number.isFinite(expires)) {
    // OpenCode may store seconds, ms, or epoch; we accept epoch ms only if it looks plausible.
    parsed.expiresAt = expires > 10_000_000_000 ? expires : expires * 1000;
  }

  return parsed;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringWithin(value: unknown, maxLen: number): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value.length <= maxLen
  );
}

function isEnoent(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}
