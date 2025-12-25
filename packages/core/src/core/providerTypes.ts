/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

export enum LlmProviderId {
  GEMINI = 'gemini',
  OPENAI_COMPATIBLE = 'openai_compatible',
  ANTHROPIC = 'anthropic',
}

export interface OpenAICompatibleConfig {
  baseUrl: string;
  model: string;
  auth?: {
    type: 'api-key' | 'bearer' | 'none'; // 'api-key' for x-api-key style, 'bearer' for Authorization: Bearer
    apiKey?: string;
    envVarName?: string;
  };
  headers?: Record<string, string>;
}

export type ProviderConfig =
  | { provider: LlmProviderId.GEMINI }
  | ({ provider: LlmProviderId.OPENAI_COMPATIBLE } & OpenAICompatibleConfig)
  | { provider: LlmProviderId.ANTHROPIC };

export interface ProviderCapabilities {
  supportsTools: boolean;
  supportsStreaming: boolean;
  supportsEmbeddings: boolean;
  supportsJsonSchema: boolean;
  supportsCitations: boolean;
  supportsImages: boolean;
}

export function getProviderCapabilities(
  providerId: LlmProviderId,
): ProviderCapabilities {
  switch (providerId) {
    case LlmProviderId.GEMINI:
      return {
        supportsTools: true,
        supportsStreaming: true,
        supportsEmbeddings: true,
        supportsJsonSchema: true,
        supportsCitations: true, // Only Gemini has native citations for now
        supportsImages: true,
      };
    case LlmProviderId.OPENAI_COMPATIBLE:
      return {
        supportsTools: true, // We will implement this
        supportsStreaming: true, // We will implement this
        supportsEmbeddings: false, // Phase 1 doesn't include embeddings
        supportsJsonSchema: false,
        supportsCitations: false,
        supportsImages: false, // Phase 1 text only
      };
    case LlmProviderId.ANTHROPIC:
      return {
        supportsTools: false,
        supportsStreaming: false,
        supportsEmbeddings: false,
        supportsJsonSchema: false,
        supportsCitations: false,
        supportsImages: false,
      };
    default:
      // Fallback safe defaults (everything false)
      return {
        supportsTools: false,
        supportsStreaming: false,
        supportsEmbeddings: false,
        supportsJsonSchema: false,
        supportsCitations: false,
        supportsImages: false,
      };
  }
}
