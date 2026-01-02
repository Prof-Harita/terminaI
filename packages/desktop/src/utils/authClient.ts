/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { buildSignedHeaders } from './agentClient';
import type { AuthType } from '@terminai/core';

export type LlmAuthStatus = 'ok' | 'required' | 'in_progress' | 'error';

export interface AuthStatusResponse {
  status: LlmAuthStatus;
  authType: AuthType | null;
  message?: string;
  errorCode?: string;
}

export interface OAuthStartResponse {
  authUrl: string;
}

export class AuthClient {
  constructor(
    private baseUrl: string,
    private token: string,
  ) {}

  private async fetch<T>(
    path: string,
    method: 'GET' | 'POST' = 'GET',
    body?: unknown,
  ): Promise<T> {
    const bodyString = body !== undefined ? JSON.stringify(body) : '';
    const headers = await buildSignedHeaders({
      token: this.token,
      method,
      pathWithQuery: path,
      bodyString,
    });

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: body ? bodyString : undefined,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Auth request failed (${res.status}): ${errText}`);
    }

    return res.json();
  }

  async getStatus(): Promise<AuthStatusResponse> {
    return this.fetch<AuthStatusResponse>('/auth/status');
  }

  async setApiKey(apiKey: string): Promise<AuthStatusResponse> {
    return this.fetch<AuthStatusResponse>('/auth/gemini/api-key', 'POST', {
      apiKey,
    });
  }

  async startOAuth(): Promise<OAuthStartResponse> {
    return this.fetch<OAuthStartResponse>(
      '/auth/gemini/oauth/start',
      'POST',
      {},
    );
  }

  async cancelOAuth(): Promise<AuthStatusResponse> {
    return this.fetch<AuthStatusResponse>(
      '/auth/gemini/oauth/cancel',
      'POST',
      {},
    );
  }

  async useGeminiVertex(): Promise<AuthStatusResponse> {
    return this.fetch<AuthStatusResponse>('/auth/gemini/vertex', 'POST', {});
  }

  async clearGeminiAuth(): Promise<AuthStatusResponse> {
    return this.fetch<AuthStatusResponse>('/auth/gemini/clear', 'POST', {});
  }
}
