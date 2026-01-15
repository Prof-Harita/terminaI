/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { HybridTokenStorage } from '../mcp/token-storage/hybrid-token-storage.js';
import type { OAuthCredentials } from '../mcp/token-storage/types.js';
import { coreEvents } from '../utils/events.js';
import {
  OPENAI_CHATGPT_CREDENTIAL_TYPE,
  OPENAI_CHATGPT_TOKEN_STORAGE_SERVER_NAME,
  OPENAI_CHATGPT_TOKEN_STORAGE_SERVICE,
} from './constants.js';
import type {
  ChatGptOAuthCredentialPayload,
  ChatGptOAuthStoredCredentials,
} from './types.js';

const MAX_TOKEN_LENGTH = 10_000;
const MAX_ACCOUNT_ID_LENGTH = 200;

export class ChatGptOAuthCredentialStorage {
  private static storage = new HybridTokenStorage(
    OPENAI_CHATGPT_TOKEN_STORAGE_SERVICE,
  );

  static async load(): Promise<ChatGptOAuthStoredCredentials | null> {
    try {
      const credentials = await this.storage.getCredentials(
        OPENAI_CHATGPT_TOKEN_STORAGE_SERVER_NAME,
      );
      if (!credentials) return null;

      const parsed = parseStored(credentials);
      return parsed;
    } catch (error: unknown) {
      coreEvents.emitFeedback(
        'error',
        'Failed to load ChatGPT OAuth credentials',
        error,
      );
      throw new Error('Failed to load ChatGPT OAuth credentials', {
        cause: error,
      });
    }
  }

  static async save(payload: ChatGptOAuthCredentialPayload): Promise<void> {
    validateToken(payload.token.accessToken, 'accessToken');
    validateToken(payload.token.refreshToken, 'refreshToken');
    if (payload.token.idToken) validateToken(payload.token.idToken, 'idToken');
    if (payload.accountId) validateAccountId(payload.accountId);

    const creds: ChatGptOAuthStoredCredentials = {
      serverName: OPENAI_CHATGPT_TOKEN_STORAGE_SERVER_NAME,
      token: {
        accessToken: payload.token.accessToken,
        refreshToken: payload.token.refreshToken,
        tokenType: payload.token.tokenType,
        expiresAt: payload.token.expiresAt,
        scope: payload.token.scope,
      },
      updatedAt: Date.now(),
      credentialType: OPENAI_CHATGPT_CREDENTIAL_TYPE,
      idToken: payload.token.idToken,
      accountId: payload.accountId,
      lastRefresh: payload.lastRefresh,
    };

    await this.storage.setCredentials(creds as unknown as OAuthCredentials);
  }

  /**
   * Clear stored ChatGPT OAuth credentials.
   * This method is intentionally infallible - it will never throw.
   * This ensures /auth logout always succeeds, even if storage is corrupted.
   */
  static async clear(): Promise<void> {
    // Try primary storage first
    try {
      await this.storage.deleteCredentials(
        OPENAI_CHATGPT_TOKEN_STORAGE_SERVER_NAME,
      );
    } catch (error: unknown) {
      // Log but don't throw - user recovery path must not be blocked
      coreEvents.emitFeedback(
        'warning',
        'Could not clear ChatGPT OAuth credentials from primary storage',
        error,
      );
    }

    // Also try clearing via clearAll on the storage as a fallback
    try {
      await this.storage.clearAll();
    } catch {
      // Ignore - best effort
    }
  }
}

function parseStored(value: OAuthCredentials): ChatGptOAuthStoredCredentials {
  const raw = value as unknown as Partial<ChatGptOAuthStoredCredentials>;
  if (raw.credentialType !== OPENAI_CHATGPT_CREDENTIAL_TYPE) {
    throw new Error(
      'Stored ChatGPT OAuth credentials have wrong credentialType',
    );
  }
  if (!raw.token?.accessToken || typeof raw.token.accessToken !== 'string') {
    throw new Error('Stored ChatGPT OAuth credentials missing accessToken');
  }
  if (!raw.token.refreshToken || typeof raw.token.refreshToken !== 'string') {
    throw new Error('Stored ChatGPT OAuth credentials missing refreshToken');
  }
  if (raw.idToken !== undefined && typeof raw.idToken !== 'string') {
    throw new Error('Stored ChatGPT OAuth credentials have invalid idToken');
  }
  if (raw.accountId !== undefined && typeof raw.accountId !== 'string') {
    throw new Error('Stored ChatGPT OAuth credentials have invalid accountId');
  }
  if (raw.lastRefresh !== undefined && typeof raw.lastRefresh !== 'number') {
    throw new Error(
      'Stored ChatGPT OAuth credentials have invalid lastRefresh',
    );
  }

  return raw as ChatGptOAuthStoredCredentials;
}

function validateToken(value: string, field: string): void {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`ChatGPT OAuth ${field} is missing/empty`);
  }
  if (trimmed.length > MAX_TOKEN_LENGTH) {
    throw new Error(`ChatGPT OAuth ${field} is too long`);
  }
}

function validateAccountId(value: string): void {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error('ChatGPT OAuth accountId is missing/empty');
  }
  if (trimmed.length > MAX_ACCOUNT_ID_LENGTH) {
    throw new Error('ChatGPT OAuth accountId is too long');
  }
}
