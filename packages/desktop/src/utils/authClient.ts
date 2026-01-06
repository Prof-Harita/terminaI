/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { buildSignedHeaders } from './agentClient';

export interface AuthStatus {
  status: 'ok' | 'required' | 'error' | 'in_progress';
  message?: string;
}

export type ProviderConfig =
  | { provider: 'gemini' }
  | { provider: 'ollama' }
  | {
      provider: 'openai_compatible';
      openaiCompatible: {
        baseUrl: string;
        model: string;
        envVarName?: string;
      };
    };

export interface AuthClient {
  setApiKey(key: string): Promise<AuthStatus>;
  switchProvider(config: ProviderConfig): Promise<AuthStatus>;
  getStatus(): Promise<AuthStatus>;
  startOAuth(): Promise<{ authUrl: string }>;
  cancelOAuth(): Promise<void>;
  useGeminiVertex(projectId?: string, location?: string): Promise<AuthStatus>;
}

export function createAuthClient(baseUrl: string, token?: string): AuthClient {
  const getHeaders = async (
    method: string,
    path: string,
    bodyVal?: unknown,
  ) => {
    if (!token) return { 'Content-Type': 'application/json' };
    const bodyString = bodyVal ? JSON.stringify(bodyVal) : '';
    const signed = await buildSignedHeaders({
      token,
      method,
      pathWithQuery: path,
      bodyString,
    });
    return {
      ...signed,
      'Content-Type': 'application/json',
    };
  };

  const request = async <T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> => {
    const headers = await getHeaders(method, path, body);
    const res = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      let msg = res.statusText;
      try {
        const json = await res.json();
        msg = json.error || json.message || msg;
      } catch {
        // ignore
      }
      throw new Error(`Auth request failed (${res.status}): ${msg}`);
    }
    return res.json() as Promise<T>;
  };

  return {
    async getStatus() {
      // GET /auth/status
      // We need to implement GET signature or just use no body
      // buildSignedHeaders handles empty body if passed empty string?
      // Yes, we passed '' above.
      return request<AuthStatus>('GET', '/auth/status');
    },

    async switchProvider(config: ProviderConfig) {
      return request<AuthStatus>('POST', '/auth/provider', config);
    },

    async setApiKey(key: string) {
      return request<AuthStatus>('POST', '/auth/apikey', { key });
    },

    async startOAuth() {
      return request<{ authUrl: string }>('POST', '/auth/oauth/start');
    },

    async cancelOAuth() {
      await request<void>('POST', '/auth/oauth/cancel');
    },

    async useGeminiVertex(projectId?: string, location?: string) {
      return request<AuthStatus>('POST', '/auth/vertex', {
        projectId,
        location,
      });
    },
  };
}
