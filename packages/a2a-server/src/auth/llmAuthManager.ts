/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  checkGeminiAuthStatusNonInteractive,
  beginGeminiOAuthLoopbackFlow,
  AuthType,
  saveApiKey,
  clearCachedCredentialFile,
} from '@terminai/core';
import type { Config } from '@terminai/core';
import { logger } from '../utils/logger.js';

export type LlmAuthStatus = 'ok' | 'required' | 'in_progress' | 'error';

export type OAuthErrorCode =
  | 'timeout'
  | 'denied'
  | 'state_mismatch'
  | 'server_bind_failed'
  | 'token_exchange_failed'
  | 'network_error';

export interface LlmAuthStatusResult {
  readonly status: LlmAuthStatus;
  readonly authType: AuthType | undefined;
  readonly message?: string;
  readonly errorCode?: OAuthErrorCode;
}

export class AuthConflictError extends Error {
  readonly statusCode = 409;
}

export class LlmAuthManager {
  private readonly config: Config;
  private readonly getSelectedAuthType: () => AuthType | undefined;

  private effectiveAuthType: AuthType | undefined;

  private oauthFlow: {
    cancel: () => void;
    waitForCompletion: Promise<void>;
  } | null = null;

  private lastErrorMessage: string | null = null;
  private lastErrorCode: OAuthErrorCode | undefined;

  constructor(input: {
    config: Config;
    getSelectedAuthType: () => AuthType | undefined;
  }) {
    this.config = input.config;
    this.getSelectedAuthType = input.getSelectedAuthType;
    this.effectiveAuthType = this.getSelectedAuthType();
  }

  async getStatus(): Promise<LlmAuthStatusResult> {
    const authType = this.effectiveAuthType ?? this.getSelectedAuthType();

    if (this.oauthFlow) {
      return {
        status: 'in_progress',
        authType,
        message: 'OAuth sign-in in progress',
      };
    }

    const check = await checkGeminiAuthStatusNonInteractive(
      authType,
      process.env,
    );

    if (check.status === 'ok') {
      return { status: 'ok', authType };
    }

    if (check.status === 'required') {
      return {
        status: 'required',
        authType,
        message: check.message ?? this.lastErrorMessage ?? undefined,
        errorCode: this.lastErrorCode,
      };
    }

    return {
      status: 'error',
      authType,
      message: check.message ?? this.lastErrorMessage ?? undefined,
      errorCode: this.lastErrorCode,
    };
  }

  async submitGeminiApiKey(apiKey: string): Promise<LlmAuthStatusResult> {
    const trimmed = apiKey.trim();
    if (trimmed.length === 0) {
      return {
        status: 'required',
        authType: AuthType.USE_GEMINI,
        message: 'API key must be a non-empty string',
      };
    }

    this.effectiveAuthType = AuthType.USE_GEMINI;
    this.lastErrorMessage = null;
    await saveApiKey(trimmed);
    await this.config.refreshAuth(AuthType.USE_GEMINI);
    return this.getStatus();
  }

  async startGeminiOAuth(): Promise<{ authUrl: string }> {
    if (this.oauthFlow) {
      throw new AuthConflictError('OAuth already in progress');
    }

    this.effectiveAuthType = AuthType.LOGIN_WITH_GOOGLE;
    this.lastErrorMessage = null;

    const { authUrl, waitForCompletion, cancel } =
      await beginGeminiOAuthLoopbackFlow(this.config);

    this.oauthFlow = { waitForCompletion, cancel };

    // Do not block the request; update auth in the background.
    void waitForCompletion
      .then(async () => {
        await this.config.refreshAuth(AuthType.LOGIN_WITH_GOOGLE);
        this.lastErrorMessage = null;
        this.lastErrorCode = undefined;
      })
      .catch((err: unknown) => {
        const error = err instanceof Error ? err : new Error('OAuth failed');
        const { message, code } = this.mapOAuthError(error);
        this.lastErrorMessage = message;
        this.lastErrorCode = code;
        logger.warn('[LlmAuthManager] OAuth did not complete:', {
          message,
          code,
        });
      })
      .finally(() => {
        this.oauthFlow = null;
      });

    return { authUrl };
  }

  async cancelGeminiOAuth(): Promise<LlmAuthStatusResult> {
    if (this.oauthFlow) {
      const cancel = this.oauthFlow.cancel;
      this.oauthFlow = null;
      try {
        cancel();
      } catch (err) {
        logger.warn('[LlmAuthManager] OAuth cancel threw:', err);
      }
    }
    this.lastErrorMessage = null;
    this.lastErrorCode = undefined;
    return this.getStatus();
  }

  async useGeminiVertex(): Promise<LlmAuthStatusResult> {
    this.effectiveAuthType = AuthType.USE_VERTEX_AI;

    const hasVertexEnv =
      (process.env['GOOGLE_CLOUD_PROJECT'] &&
        process.env['GOOGLE_CLOUD_LOCATION']) ||
      process.env['GOOGLE_API_KEY'];

    if (!hasVertexEnv) {
      return {
        status: 'required',
        authType: AuthType.USE_VERTEX_AI,
        message:
          'Vertex AI requires either GOOGLE_CLOUD_PROJECT + GOOGLE_CLOUD_LOCATION, or GOOGLE_API_KEY (express mode).',
      };
    }

    await this.config.refreshAuth(AuthType.USE_VERTEX_AI);
    return this.getStatus();
  }

  async clearGeminiAuth(): Promise<LlmAuthStatusResult> {
    // Cancel any in-progress OAuth flow
    if (this.oauthFlow) {
      const cancel = this.oauthFlow.cancel;
      this.oauthFlow = null;
      try {
        cancel();
      } catch (err) {
        logger.warn('[LlmAuthManager] OAuth cancel during clear threw:', err);
      }
    }

    // Clear OAuth credentials
    try {
      await clearCachedCredentialFile();
    } catch (err) {
      logger.warn('[LlmAuthManager] Failed to clear cached credentials:', err);
    }

    // Reset effective auth type to undefined to force re-selection
    this.effectiveAuthType = undefined;
    this.lastErrorMessage = null;
    this.lastErrorCode = undefined;

    return this.getStatus();
  }

  private mapOAuthError(error: Error): {
    message: string;
    code: OAuthErrorCode;
  } {
    const message = error.message.toLowerCase();

    if (message.includes('timeout') || message.includes('timed out')) {
      return {
        message: 'The sign-in request timed out. Please try again.',
        code: 'timeout',
      };
    }

    if (message.includes('denied') || message.includes('access_denied')) {
      return {
        message:
          'Sign-in was denied. Please try again and grant the requested permissions.',
        code: 'denied',
      };
    }

    if (message.includes('state') && message.includes('mismatch')) {
      return {
        message: 'Security error occurred during sign-in. Please try again.',
        code: 'state_mismatch',
      };
    }

    if (
      message.includes('bind') ||
      message.includes('port') ||
      message.includes('address')
    ) {
      return {
        message:
          'Could not start local server for sign-in. Please check if another application is using the required port.',
        code: 'server_bind_failed',
      };
    }

    if (
      message.includes('token') ||
      message.includes('exchange') ||
      message.includes('authorization code')
    ) {
      return {
        message:
          'Failed to exchange authorization code for access token. Please try again.',
        code: 'token_exchange_failed',
      };
    }

    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection')
    ) {
      return {
        message:
          'Network error occurred. Please check your internet connection and try again.',
        code: 'network_error',
      };
    }

    return {
      message: 'An unexpected error occurred during sign-in. Please try again.',
      code: 'network_error',
    };
  }
}
