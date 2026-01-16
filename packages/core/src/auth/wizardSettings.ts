/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ProviderId } from './wizardState.js';
import { AuthType } from '../core/contentGenerator.js';
import { DEFAULT_CHATGPT_CODEX_BASE_URL } from '../openai_chatgpt/constants.js';

export interface WizardSettingsInput {
  provider: ProviderId;
  geminiAuthType?: AuthType;
  openaiCompatible?: {
    baseUrl: string;
    model: string;
    envVarName?: string;
  };
  openaiChatgptOauth?: {
    model: string;
    baseUrl?: string;
    internalModel?: string;
  };
}

export interface SettingsPatch {
  path: string;
  value: unknown;
}

/**
 * Builds a list of settings patches to apply based on wizard input.
 */
export function buildWizardSettingsPatch(
  input: WizardSettingsInput,
): SettingsPatch[] {
  const patches: SettingsPatch[] = [];

  // 1. Set Provider
  patches.push({ path: 'llm.provider', value: input.provider });

  // 2. Provider specific settings
  if (input.provider === 'gemini') {
    if (input.geminiAuthType) {
      patches.push({
        path: 'security.auth.selectedType',
        value: input.geminiAuthType,
      });
    }
    // Clear OpenAI configs to prevent zombie state during hot-swap
    patches.push({ path: 'llm.openaiCompatible', value: undefined });
    patches.push({ path: 'llm.openaiChatgptOauth', value: undefined });
  } else if (input.provider === 'openai_compatible') {
    if (!input.openaiCompatible) {
      throw new Error(
        'OpenAI-compatible provider selected but openaiCompatible config is missing',
      );
    }

    const baseUrl = normalizeBaseUrl(input.openaiCompatible.baseUrl);
    const model = input.openaiCompatible.model.trim();
    if (model.length === 0) {
      throw new Error(
        'OpenAI-compatible provider selected but model is missing/empty',
      );
    }

    const envVarName = (input.openaiCompatible.envVarName ?? 'OPENAI_API_KEY')
      .trim()
      .replace(/\s+/g, '');
    if (envVarName.length === 0) {
      throw new Error(
        'OpenAI-compatible provider selected but envVarName is missing/empty',
      );
    }

    patches.push({
      path: 'security.auth.selectedType',
      value: AuthType.USE_OPENAI_COMPATIBLE,
    });
    patches.push({
      path: 'llm.openaiCompatible.baseUrl',
      value: baseUrl,
    });
    patches.push({
      path: 'llm.openaiCompatible.model',
      value: model,
    });
    // Matches settings schema enum: ["none", "api-key", "bearer"]
    patches.push({
      path: 'llm.openaiCompatible.auth.type',
      value: 'bearer',
    });
    patches.push({
      path: 'llm.openaiCompatible.auth.envVarName',
      value: envVarName,
    });
  } else if (input.provider === 'openai_chatgpt_oauth') {
    if (!input.openaiChatgptOauth) {
      throw new Error(
        'ChatGPT OAuth provider selected but openaiChatgptOauth config is missing',
      );
    }

    const model = input.openaiChatgptOauth.model.trim();
    if (model.length === 0) {
      throw new Error(
        'ChatGPT OAuth provider selected but model is missing/empty',
      );
    }

    const baseUrl = normalizeChatGptBaseUrl(input.openaiChatgptOauth.baseUrl);
    const internalModel = (input.openaiChatgptOauth.internalModel ?? '').trim();

    patches.push({
      path: 'security.auth.selectedType',
      value: AuthType.USE_OPENAI_CHATGPT_OAUTH,
    });
    patches.push({
      path: 'llm.openaiChatgptOauth.baseUrl',
      value: baseUrl,
    });
    patches.push({
      path: 'llm.openaiChatgptOauth.model',
      value: model,
    });
    if (internalModel.length > 0) {
      patches.push({
        path: 'llm.openaiChatgptOauth.internalModel',
        value: internalModel,
      });
    }
  }

  return patches;
}

function normalizeBaseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    throw new Error('OpenAI-compatible baseUrl is missing/empty');
  }

  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  // Remove trailing slashes to align with existing core expectations
  return withScheme.replace(/\/+$/, '');
}

function normalizeChatGptBaseUrl(raw: string | undefined): string {
  if (raw === undefined) {
    return DEFAULT_CHATGPT_CODEX_BASE_URL;
  }
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return DEFAULT_CHATGPT_CODEX_BASE_URL;
  }
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  return withScheme.replace(/\/+$/, '');
}
