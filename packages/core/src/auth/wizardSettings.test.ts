/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { buildWizardSettingsPatch } from './wizardSettings.js';
import { AuthType } from '../core/contentGenerator.js';

describe('buildWizardSettingsPatch', () => {
  it('should build patches for Gemini provider with selected auth type', () => {
    const patches = buildWizardSettingsPatch({
      provider: 'gemini',
      geminiAuthType: AuthType.USE_GEMINI,
    });

    expect(patches).toEqual([
      { path: 'llm.provider', value: 'gemini' },
      { path: 'security.auth.selectedType', value: AuthType.USE_GEMINI },
    ]);
  });

  it('should build patches for OpenAI-compatible provider with normalized baseUrl and defaults', () => {
    const patches = buildWizardSettingsPatch({
      provider: 'openai_compatible',
      openaiCompatible: {
        baseUrl: ' example.com/v1/ ',
        model: ' gpt-4o ',
      },
    });

    expect(patches).toEqual([
      { path: 'llm.provider', value: 'openai_compatible' },
      { path: 'llm.openaiCompatible.baseUrl', value: 'https://example.com/v1' },
      { path: 'llm.openaiCompatible.model', value: 'gpt-4o' },
      { path: 'llm.openaiCompatible.auth.type', value: 'api-key' },
      { path: 'llm.openaiCompatible.auth.envVarName', value: 'OPENAI_API_KEY' },
    ]);
  });

  it('should preserve http:// baseUrl and trim env var name', () => {
    const patches = buildWizardSettingsPatch({
      provider: 'openai_compatible',
      openaiCompatible: {
        baseUrl: 'http://localhost:11434/v1/',
        model: 'llama3',
        envVarName: '  MY_OPENAI_KEY  ',
      },
    });

    expect(patches).toEqual([
      { path: 'llm.provider', value: 'openai_compatible' },
      {
        path: 'llm.openaiCompatible.baseUrl',
        value: 'http://localhost:11434/v1',
      },
      { path: 'llm.openaiCompatible.model', value: 'llama3' },
      { path: 'llm.openaiCompatible.auth.type', value: 'api-key' },
      { path: 'llm.openaiCompatible.auth.envVarName', value: 'MY_OPENAI_KEY' },
    ]);
  });

  it('should throw if OpenAI-compatible provider is selected without config', () => {
    expect(() =>
      buildWizardSettingsPatch({
        provider: 'openai_compatible',
      }),
    ).toThrow('openaiCompatible config is missing');
  });
});
