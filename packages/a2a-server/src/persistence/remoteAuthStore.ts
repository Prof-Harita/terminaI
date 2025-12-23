/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';
import { GEMINI_DIR } from '@google/gemini-cli-core';

export const REMOTE_AUTH_FILENAME = 'web-remote-auth.json';

export type RemoteAuthState = {
  version: 1;
  tokenId: string;
  tokenSaltB64: string;
  tokenHashB64: string;
  createdAt: string;
  lastRotatedAt: string;
  expiresAt: string | null;
};

export function getRemoteAuthPath(): string {
  const override = process.env['GEMINI_WEB_REMOTE_AUTH_PATH'];
  if (override) {
    return override;
  }
  const homeDir = os.homedir() || os.tmpdir();
  return path.join(homeDir, GEMINI_DIR, REMOTE_AUTH_FILENAME);
}

export async function loadRemoteAuthState(): Promise<RemoteAuthState | null> {
  const authPath = getRemoteAuthPath();
  try {
    const content = await fs.readFile(authPath, 'utf8');
    const parsed = JSON.parse(content) as RemoteAuthState;
    if (
      !parsed ||
      parsed.version !== 1 ||
      typeof parsed.tokenSaltB64 !== 'string' ||
      typeof parsed.tokenHashB64 !== 'string'
    ) {
      throw new Error('Invalid remote auth state format.');
    }
    return parsed;
  } catch (error: unknown) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

export async function saveRemoteAuthState(
  state: RemoteAuthState,
): Promise<void> {
  const authPath = getRemoteAuthPath();
  await fs.mkdir(path.dirname(authPath), { recursive: true, mode: 0o700 });
  const content = JSON.stringify(state, null, 2);
  await fs.writeFile(authPath, content, { mode: 0o600 });
}

export function createRemoteAuthState(token: string): RemoteAuthState {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(token, salt, 32);
  const now = new Date().toISOString();
  return {
    version: 1,
    tokenId: crypto.randomUUID(),
    tokenSaltB64: salt.toString('base64'),
    tokenHashB64: hash.toString('base64'),
    createdAt: now,
    lastRotatedAt: now,
    expiresAt: null,
  };
}

export function verifyRemoteAuthToken(
  token: string,
  state: RemoteAuthState,
): boolean {
  if (state.expiresAt && Date.now() > Date.parse(state.expiresAt)) {
    return false;
  }
  const salt = Buffer.from(state.tokenSaltB64, 'base64');
  const expectedHash = Buffer.from(state.tokenHashB64, 'base64');
  const actualHash = crypto.scryptSync(token, salt, expectedHash.length);
  if (actualHash.length !== expectedHash.length) {
    return false;
  }
  return crypto.timingSafeEqual(actualHash, expectedHash);
}
