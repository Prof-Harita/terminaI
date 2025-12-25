/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { LlmProviderId, getProviderCapabilities } from './providerTypes.js';

describe('getProviderCapabilities', () => {
  it('should return Gemini capabilities', () => {
    const capabilities = getProviderCapabilities(LlmProviderId.GEMINI);
    expect(capabilities).toEqual({
      supportsTools: true,
      supportsStreaming: true,
      supportsEmbeddings: true,
      supportsJsonSchema: true,
      supportsCitations: true,
      supportsImages: true,
    });
  });

  it('should return OpenAI-compatible capabilities', () => {
    const capabilities = getProviderCapabilities(
      LlmProviderId.OPENAI_COMPATIBLE,
    );
    expect(capabilities).toEqual({
      supportsTools: true,
      supportsStreaming: true,
      supportsEmbeddings: false,
      supportsJsonSchema: false,
      supportsCitations: false,
      supportsImages: false,
    });
  });

  it('should return Anthropic capabilities', () => {
    const capabilities = getProviderCapabilities(LlmProviderId.ANTHROPIC);
    expect(capabilities).toEqual({
      supportsTools: false,
      supportsStreaming: false,
      supportsEmbeddings: false,
      supportsJsonSchema: false,
      supportsCitations: false,
      supportsImages: false,
    });
  });

  it('should return safe defaults for unknown provider', () => {
    const capabilities = getProviderCapabilities('unknown' as LlmProviderId);
    expect(capabilities).toEqual({
      supportsTools: false,
      supportsStreaming: false,
      supportsEmbeddings: false,
      supportsJsonSchema: false,
      supportsCitations: false,
      supportsImages: false,
    });
  });
});
