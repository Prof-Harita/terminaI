/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import { AuthType } from '../core/contentGenerator.js';
import { Storage } from '../config/storage.js';
import { loadApiKey } from '../core/apiKeyCredentialStorage.js';

export type GeminiAuthStatus = 'ok' | 'required' | 'error';

export interface GeminiAuthCheckResult {
  status: GeminiAuthStatus;
  message?: string;
}

/**
 * Checks the auth status for Gemini/Google providers without triggering interactive prompts.
 * Used by sidecars/servers to know if they should block or prompt via client.
 */
export async function checkGeminiAuthStatusNonInteractive(
  selectedType: AuthType | undefined,
  env: NodeJS.ProcessEnv = process.env,
): Promise<GeminiAuthCheckResult> {
  // If no auth type selected, we treat it as "required" if we want to force a wizard,
  // or maybe "error" if strict. But usually it means "we need to setup".
  if (!selectedType) {
    const envKey = env['GEMINI_API_KEY'];
    if (envKey) {
      return { status: 'ok' };
    }

    const storedKey = await loadApiKey();
    if (storedKey) {
      return { status: 'ok' };
    }

    // Implicit Vertex check
    if (
      (env['GOOGLE_CLOUD_PROJECT'] && env['GOOGLE_CLOUD_LOCATION']) ||
      env['GOOGLE_API_KEY']
    ) {
      return { status: 'ok' };
    }

    // Implicit OAuth creds check
    try {
      const credsPath = Storage.getOAuthCredsPath();
      if (fs.existsSync(credsPath)) {
        const content = fs.readFileSync(credsPath, 'utf8');
        JSON.parse(content);
        return { status: 'ok' };
      }
    } catch (_e) {
      return { status: 'error', message: 'OAuth credentials invalid' };
    }

    return { status: 'required', message: 'No authentication configured' };
  }

  switch (selectedType) {
    case AuthType.USE_GEMINI:
      if (env['GEMINI_API_KEY']) {
        return { status: 'ok' };
      }
      if (await loadApiKey()) {
        return { status: 'ok' };
      }
      return {
        status: 'required',
        message: 'Gemini API key not found (env or keychain)',
      };

    case AuthType.LOGIN_WITH_GOOGLE:
      try {
        const credsPath = Storage.getOAuthCredsPath();
        if (fs.existsSync(credsPath)) {
          // Verify parseability and basic structure
          const content = fs.readFileSync(credsPath, 'utf8');
          const creds = JSON.parse(content);
          if (!creds || typeof creds !== 'object' || !creds.refresh_token) {
            return {
              status: 'error',
              message: 'OAuth credentials corrupted or incomplete',
            };
          }
          return { status: 'ok' };
        }
      } catch (_e) {
        return { status: 'error', message: 'OAuth credentials corrupted' };
      }
      return { status: 'required', message: 'OAuth credentials missing' };

    case AuthType.USE_VERTEX_AI:
      if (
        (env['GOOGLE_CLOUD_PROJECT'] && env['GOOGLE_CLOUD_LOCATION']) ||
        env['GOOGLE_API_KEY']
      ) {
        return { status: 'ok' };
      }
      return {
        status: 'required',
        message: 'Vertex AI environment variables missing',
      };

    case AuthType.LEGACY_CLOUD_SHELL:
    case AuthType.COMPUTE_ADC:
      // Assume these are environment based and if selected, we trust the env is there or will fail later?
      // Let's assume OK for now as they are implicit/system based.
      return { status: 'ok' };

    default:
      return { status: 'error', message: `Unknown auth type: ${selectedType}` };
  }
}
