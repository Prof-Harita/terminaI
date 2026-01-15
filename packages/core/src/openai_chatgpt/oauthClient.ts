/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import * as crypto from 'node:crypto';
import { URL } from 'node:url';
import {
  CHATGPT_ACCOUNT_ID_CLAIM,
  OPENAI_AUTH_CLAIM,
  OPENAI_AUTH_CHATGPT_ACCOUNT_ID_FIELD,
  CODEX_ORIGINATOR,
  DEFAULT_OPENAI_OAUTH_AUTHORIZE_URL,
  DEFAULT_OPENAI_OAUTH_CLIENT_ID,
  DEFAULT_OPENAI_OAUTH_TOKEN_URL,
  DEFAULT_REFRESH_STALE_MS,
} from './constants.js';
import type {
  ChatGptOAuthCredentialPayload,
  ChatGptOAuthTokens,
  OpenAIOAuthTokenResponse,
} from './types.js';
import { decodeJwtPayload } from './jwt.js';

export interface ChatGptOAuthClientOptions {
  readonly clientId?: string;
  readonly authorizeUrl?: string;
  readonly tokenUrl?: string;
  readonly refreshStaleMs?: number;
}

export interface ChatGptOAuthStart {
  readonly authUrl: string;
  readonly state: string;
  readonly codeVerifier: string;
}

/**
 * Error thrown when OpenAI returns refresh_token_reused.
 * This indicates the stored credentials are permanently invalid.
 */
export class RefreshTokenReusedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RefreshTokenReusedError';
  }
}

export class ChatGptOAuthClient {
  private readonly clientId: string;
  private readonly authorizeUrl: string;
  private readonly tokenUrl: string;
  private readonly refreshStaleMs: number;

  constructor(options: ChatGptOAuthClientOptions = {}) {
    this.clientId =
      options.clientId ??
      process.env['TERMINAI_OPENAI_OAUTH_CLIENT_ID'] ??
      DEFAULT_OPENAI_OAUTH_CLIENT_ID;
    this.authorizeUrl =
      options.authorizeUrl ?? DEFAULT_OPENAI_OAUTH_AUTHORIZE_URL;
    this.tokenUrl = options.tokenUrl ?? DEFAULT_OPENAI_OAUTH_TOKEN_URL;
    this.refreshStaleMs = options.refreshStaleMs ?? DEFAULT_REFRESH_STALE_MS;
  }

  startAuthorization(input: {
    redirectUri: string;
    scope?: string;
  }): ChatGptOAuthStart {
    const { codeVerifier, codeChallenge } = generatePkceS256();
    const state = crypto.randomBytes(16).toString('base64url');

    const scope = input.scope ?? 'openid profile email offline_access';
    const url = new URL(this.authorizeUrl);
    url.searchParams.set('client_id', this.clientId);
    url.searchParams.set('redirect_uri', input.redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', scope);
    url.searchParams.set('code_challenge', codeChallenge);
    url.searchParams.set('code_challenge_method', 'S256');
    url.searchParams.set('state', state);

    // Codex CLI parity flags (stability-first)
    url.searchParams.set('id_token_add_organizations', 'true');
    url.searchParams.set('codex_cli_simplified_flow', 'true');
    url.searchParams.set('originator', CODEX_ORIGINATOR);

    return { authUrl: url.toString(), state, codeVerifier };
  }

  async exchangeAuthorizationCode(input: {
    code: string;
    redirectUri: string;
    codeVerifier: string;
  }): Promise<ChatGptOAuthCredentialPayload> {
    const body = new URLSearchParams();
    body.set('grant_type', 'authorization_code');
    body.set('code', input.code);
    body.set('redirect_uri', input.redirectUri);
    body.set('client_id', this.clientId);
    body.set('code_verifier', input.codeVerifier);

    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(
        `OpenAI OAuth token exchange failed (${response.status}): ${text}`,
      );
    }

    const json = (await response.json()) as OpenAIOAuthTokenResponse;
    return this.toCredentialPayloadFromTokenResponse(json);
  }

  async refresh(input: {
    refreshToken: string;
    existingRefreshToken?: string;
  }): Promise<ChatGptOAuthCredentialPayload> {
    const response = await fetch(this.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        grant_type: 'refresh_token',
        refresh_token: input.refreshToken,
        scope: 'openid profile email',
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');

      // Detect refresh_token_reused error - this means stored creds are permanently invalid
      if (response.status === 401 && text.includes('refresh_token_reused')) {
        throw new RefreshTokenReusedError(
          'ChatGPT OAuth session expired. Your refresh token was already used. Run /auth reset then /auth wizard to re-authenticate.',
        );
      }

      throw new Error(
        `OpenAI OAuth refresh failed (${response.status}): ${text}`,
      );
    }

    const json = (await response.json()) as OpenAIOAuthTokenResponse;
    return this.toCredentialPayloadFromTokenResponse(json, {
      existingRefreshToken: input.existingRefreshToken,
    });
  }

  shouldRefreshByStaleness(lastRefresh: number | undefined): boolean {
    if (typeof lastRefresh !== 'number' || !Number.isFinite(lastRefresh)) {
      return true;
    }
    return Date.now() - lastRefresh >= this.refreshStaleMs;
  }

  deriveAccountId(input: {
    accountId?: string;
    idToken?: string;
    accessToken?: string;
  }): string | undefined {
    if (input.accountId && input.accountId.trim().length > 0) {
      return input.accountId.trim();
    }

    const idToken = input.idToken?.trim();
    if (idToken) {
      const claim = tryGetChatGptAccountIdClaim(idToken);
      if (claim) return claim;
    }

    const accessToken = input.accessToken?.trim();
    if (accessToken) {
      const claim = tryGetChatGptAccountIdClaim(accessToken);
      if (claim) return claim;
    }

    return undefined;
  }

  private toCredentialPayloadFromTokenResponse(
    tokenResponse: OpenAIOAuthTokenResponse,
    options?: { existingRefreshToken?: string },
  ): ChatGptOAuthCredentialPayload {
    if (
      !tokenResponse.access_token ||
      tokenResponse.access_token.length === 0
    ) {
      throw new Error('OpenAI OAuth token response missing access_token');
    }
    const refreshToken =
      tokenResponse.refresh_token && tokenResponse.refresh_token.length > 0
        ? tokenResponse.refresh_token
        : options?.existingRefreshToken;
    if (!refreshToken || refreshToken.length === 0) {
      throw new Error('OpenAI OAuth token response missing refresh_token');
    }

    const idToken =
      typeof tokenResponse.id_token === 'string' &&
      tokenResponse.id_token.trim().length > 0
        ? tokenResponse.id_token
        : undefined;

    const expiresAt =
      typeof tokenResponse.expires_in === 'number' &&
      Number.isFinite(tokenResponse.expires_in) &&
      tokenResponse.expires_in > 0
        ? Date.now() + tokenResponse.expires_in * 1000
        : undefined;

    const token: ChatGptOAuthTokens = {
      accessToken: tokenResponse.access_token,
      refreshToken,
      tokenType: 'Bearer',
      idToken,
      expiresAt,
      scope: tokenResponse.scope,
    };

    const accountId = this.deriveAccountId({
      idToken,
      accessToken: token.accessToken,
    });

    if (!accountId) {
      throw new Error(
        'ChatGPT OAuth account id is missing. Re-authenticate to obtain an id_token with chatgpt_account_id.',
      );
    }

    return {
      token,
      accountId,
      lastRefresh: Date.now(),
    };
  }
}

function generatePkceS256(): { codeVerifier: string; codeChallenge: string } {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');
  return { codeVerifier, codeChallenge };
}

function tryGetChatGptAccountIdClaim(token: string): string | undefined {
  try {
    const payload = decodeJwtPayload(token);

    // Preferred: nested object at https://api.openai.com/auth
    const authObj = payload[OPENAI_AUTH_CLAIM];
    if (isPlainObject(authObj)) {
      const accountId = authObj[OPENAI_AUTH_CHATGPT_ACCOUNT_ID_FIELD];
      if (typeof accountId === 'string' && accountId.trim().length > 0) {
        return accountId.trim();
      }
    }

    // Fallback: legacy flat claim
    const legacy = payload[CHATGPT_ACCOUNT_ID_CLAIM];
    if (typeof legacy === 'string' && legacy.trim().length > 0) {
      return legacy.trim();
    }

    return undefined;
  } catch {
    return undefined;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
