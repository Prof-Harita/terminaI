/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import process from 'node:process';
import {
  LlmProviderId,
  type ProviderConfig,
  type OpenAICompatibleConfig,
  FatalConfigError,
} from '@terminai/core';
import type { Settings } from './settings.js';

export interface SettingsToProviderConfigOptions {
  modelOverride?: string;
}

/**
 * Converts settings to a ProviderConfig.
 * This logic is extracted from config.ts to be reusable for runtime reconfiguration.
 */
export function settingsToProviderConfig(
  settings: Settings,
  options: SettingsToProviderConfigOptions = {},
): { providerConfig: ProviderConfig; resolvedModel?: string } {
  let providerConfig: ProviderConfig = { provider: LlmProviderId.GEMINI };
  let resolvedModel: string | undefined;

  if (settings.llm?.provider === 'openai_compatible') {
    const s = settings.llm.openaiCompatible;
    const openaiModel = options.modelOverride || s?.model;
    if (s?.baseUrl && openaiModel) {
      let authType: NonNullable<OpenAICompatibleConfig['auth']>['type'] =
        'none';
      // Type the auth object based on the settings schema
      const auth = s.auth as
        | { type?: 'none' | 'api-key' | 'bearer'; envVarName?: string }
        | undefined;
      if (auth?.type === 'api-key') authType = 'api-key';
      else if (auth?.type === 'bearer') authType = 'bearer';

      const headers: Record<string, string> = {};
      if (settings.llm.headers) {
        for (const [k, v] of Object.entries(settings.llm.headers)) {
          if (typeof v === 'string') headers[k] = v;
        }
      }

      providerConfig = {
        provider: LlmProviderId.OPENAI_COMPATIBLE,
        baseUrl: s.baseUrl,
        model: openaiModel,
        auth: {
          type: authType,
          apiKey: undefined,
          envVarName: s.auth?.envVarName,
        },
        headers,
      };

      // Resolve API Key here if env var name is provided
      if (
        providerConfig.provider === LlmProviderId.OPENAI_COMPATIBLE &&
        s.auth?.envVarName &&
        process.env[s.auth.envVarName]
      ) {
        providerConfig.auth!.apiKey = process.env[s.auth.envVarName];
      }

      resolvedModel = openaiModel;
    } else {
      throw new FatalConfigError(
        'llm.provider is set to openai_compatible, but llm.openaiCompatible.baseUrl and a model (llm.openaiCompatible.model or --model) are required.',
      );
    }
  } else if (settings.llm?.provider === 'anthropic') {
    providerConfig = { provider: LlmProviderId.ANTHROPIC };
  }

  return { providerConfig, resolvedModel };
}
