/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ProviderId, AuthMethod } from './wizardState.js';

export interface WizardInputField {
  readonly id: string;
  readonly label: string;
  readonly placeholder?: string;
  readonly secret?: boolean;
}

export interface ProviderAuthMethodMetadata {
  readonly id: AuthMethod;
  readonly displayName: string;
  readonly description?: string;
  readonly requiredFields: readonly WizardInputField[];
}

export interface ProviderMetadata {
  id: ProviderId;
  displayName: string;
  description: string;
  authMethods: readonly ProviderAuthMethodMetadata[];
}

export const PROVIDER_REGISTRY: Record<ProviderId, ProviderMetadata> = {
  gemini: {
    id: 'gemini',
    displayName: 'Google Gemini',
    description: "Use Google's Gemini models (Flash, Pro, etc.)",
    authMethods: [
      {
        id: 'oauth',
        displayName: 'Sign in with Google (OAuth)',
        requiredFields: [],
      },
      {
        id: 'api_key',
        displayName: 'Gemini API key',
        requiredFields: [
          {
            id: 'apiKey',
            label: 'API key',
            placeholder: 'AIzaSy...',
            secret: true,
          },
        ],
      },
      {
        id: 'vertex_ai',
        displayName: 'Vertex AI (ADC / env)',
        requiredFields: [],
      },
    ],
  },
  openai_compatible: {
    id: 'openai_compatible',
    displayName: 'OpenAI Compatible',
    description:
      'Use any OpenAI-API compatible provider (e.g. OpenAI, vLLM, DeepSeek)',
    authMethods: [
      {
        id: 'api_key',
        displayName: 'API key (via env var)',
        description:
          'Configure base URL + model, and provide the API key via an environment variable.',
        requiredFields: [
          { id: 'baseUrl', label: 'Base URL', placeholder: 'https://...' },
          { id: 'model', label: 'Model', placeholder: 'gpt-4o' },
          {
            id: 'envVarName',
            label: 'API key env var name',
            placeholder: 'OPENAI_API_KEY',
          },
        ],
      },
    ],
  },
  anthropic: {
    id: 'anthropic',
    displayName: 'Anthropic',
    description: 'Use Anthropic Claude models',
    authMethods: [
      {
        id: 'oauth',
        displayName: 'OAuth (TBD)',
        requiredFields: [],
      },
      {
        id: 'api_key',
        displayName: 'API key (TBD)',
        requiredFields: [],
      },
    ],
  },
};
