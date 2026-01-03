/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { AuthType } from '../core/contentGenerator.js';

/**
 * Provider identifiers supported by the wizard
 */
export type ProviderId = 'gemini' | 'openai_compatible' | 'anthropic';

/**
 * Auth methods for Gemini provider
 */
export type GeminiAuthMethod = 'oauth' | 'api_key' | 'vertex_ai';

/**
 * Auth methods for OpenAI-compatible provider
 */
export type OpenAIAuthMethod = 'api_key';

/**
 * Auth methods for Anthropic provider
 */
export type AnthropicAuthMethod = 'oauth' | 'api_key';

/**
 * Union of all auth methods
 */
export type AuthMethod =
  | GeminiAuthMethod
  | OpenAIAuthMethod
  | AnthropicAuthMethod;

/**
 * Wizard step progression
 */
export type WizardStep = 'provider' | 'auth_method' | 'setup' | 'complete';

/**
 * Wizard state interface
 */
export interface WizardState {
  readonly step: WizardStep;
  readonly provider: ProviderId | null;
  readonly authMethod: AuthMethod | null;
  readonly error: string | null;
}

/**
 * Create initial wizard state
 */
export function createInitialState(): WizardState {
  return {
    step: 'provider',
    provider: null,
    authMethod: null,
    error: null,
  };
}

/**
 * Select a provider and transition to appropriate step
 */
export function selectProvider(
  state: WizardState,
  provider: ProviderId,
): WizardState {
  const needsAuthMethodStep = provider === 'gemini' || provider === 'anthropic';
  return {
    ...state,
    provider,
    step: needsAuthMethodStep ? 'auth_method' : 'setup',
    error: null,
  };
}

/**
 * Select an auth method and transition to setup step
 */
export function selectAuthMethod(
  state: WizardState,
  method: AuthMethod,
): WizardState {
  if (!state.provider) {
    throw new Error('Cannot select auth method without provider');
  }
  return {
    ...state,
    authMethod: method,
    step: 'setup',
    error: null,
  };
}

/**
 * Complete the wizard setup
 */
export function completeSetup(state: WizardState): WizardState {
  return {
    ...state,
    step: 'complete',
    error: null,
  };
}

/**
 * Navigate back one step deterministically.
 */
export function back(state: WizardState): WizardState {
  if (state.step === 'auth_method') {
    return {
      ...state,
      step: 'provider',
      authMethod: null,
      error: null,
    };
  }

  if (state.step === 'setup') {
    if (!state.provider) {
      return createInitialState();
    }
    const previousStep = needsAuthMethodStep(state.provider)
      ? 'auth_method'
      : 'provider';
    return {
      ...state,
      step: previousStep,
      authMethod: null,
      error: null,
    };
  }

  return state;
}

/**
 * Set an error in the wizard state
 */
export function setError(state: WizardState, error: string): WizardState {
  return {
    ...state,
    error,
  };
}

/**
 * Get the next step based on current state
 */
export function getNextStep(state: WizardState): WizardStep {
  if (state.step === 'provider' && state.provider) {
    const needsAuthMethodStep =
      state.provider === 'gemini' || state.provider === 'anthropic';
    return needsAuthMethodStep ? 'auth_method' : 'setup';
  }
  if (state.step === 'auth_method' && state.authMethod) {
    return 'setup';
  }
  if (state.step === 'setup') {
    return 'complete';
  }
  return state.step;
}

/**
 * Check if a provider needs an auth method selection step
 */
export function needsAuthMethodStep(provider: ProviderId): boolean {
  return provider === 'gemini' || provider === 'anthropic';
}

/**
 * Get available auth methods for a provider
 */
export function getAuthMethodOptions(provider: ProviderId): AuthMethod[] {
  switch (provider) {
    case 'gemini':
      return ['oauth', 'api_key', 'vertex_ai'];
    case 'openai_compatible':
      return ['api_key'];
    case 'anthropic':
      return ['oauth', 'api_key'];
    default:
      return [];
  }
}

/**
 * Map wizard auth method to core AuthType (for Gemini provider)
 */
export function mapGeminiAuthMethodToAuthType(
  method: GeminiAuthMethod,
): AuthType {
  switch (method) {
    case 'oauth':
      return AuthType.LOGIN_WITH_GOOGLE;
    case 'api_key':
      return AuthType.USE_GEMINI;
    case 'vertex_ai':
      return AuthType.USE_VERTEX_AI;
    default: {
      const exhaustiveCheck: never = method;
      throw new Error(`Unhandled Gemini auth method: ${exhaustiveCheck}`);
    }
  }
}
