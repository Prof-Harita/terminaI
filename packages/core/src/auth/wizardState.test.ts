/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import {
  createInitialState,
  selectProvider,
  selectAuthMethod,
  completeSetup,
  back,
  setError,
  getNextStep,
  needsAuthMethodStep,
  getAuthMethodOptions,
  mapGeminiAuthMethodToAuthType,
  type WizardState,
} from './wizardState.js';
import { AuthType } from '../core/contentGenerator.js';

describe('wizardState', () => {
  describe('createInitialState', () => {
    it('should create initial state with provider step', () => {
      const state = createInitialState();
      expect(state.step).toBe('provider');
      expect(state.provider).toBeNull();
      expect(state.authMethod).toBeNull();
      expect(state.error).toBeNull();
    });
  });

  describe('selectProvider', () => {
    it('should transition to auth_method step for gemini provider', () => {
      const state = createInitialState();
      const newState = selectProvider(state, 'gemini');
      expect(newState.provider).toBe('gemini');
      expect(newState.step).toBe('auth_method');
      expect(newState.error).toBeNull();
    });

    it('should transition to auth_method step for anthropic provider', () => {
      const state = createInitialState();
      const newState = selectProvider(state, 'anthropic');
      expect(newState.provider).toBe('anthropic');
      expect(newState.step).toBe('auth_method');
      expect(newState.error).toBeNull();
    });

    it('should transition to setup step for openai_compatible provider', () => {
      const state = createInitialState();
      const newState = selectProvider(state, 'openai_compatible');
      expect(newState.provider).toBe('openai_compatible');
      expect(newState.step).toBe('setup');
      expect(newState.error).toBeNull();
    });

    it('should clear error when selecting provider', () => {
      const state: WizardState = {
        step: 'provider',
        provider: null,
        authMethod: null,
        error: 'Previous error',
      };
      const newState = selectProvider(state, 'gemini');
      expect(newState.error).toBeNull();
    });
  });

  describe('selectAuthMethod', () => {
    it('should transition to setup step when auth method selected', () => {
      const state: WizardState = {
        step: 'auth_method',
        provider: 'gemini',
        authMethod: null,
        error: null,
      };
      const newState = selectAuthMethod(state, 'oauth');
      expect(newState.authMethod).toBe('oauth');
      expect(newState.step).toBe('setup');
      expect(newState.error).toBeNull();
    });

    it('should throw if provider not selected', () => {
      const state: WizardState = {
        step: 'auth_method',
        provider: null,
        authMethod: null,
        error: null,
      };
      expect(() => selectAuthMethod(state, 'oauth')).toThrow(
        'Cannot select auth method without provider',
      );
    });

    it('should clear error when selecting auth method', () => {
      const state: WizardState = {
        step: 'auth_method',
        provider: 'gemini',
        authMethod: null,
        error: 'Previous error',
      };
      const newState = selectAuthMethod(state, 'api_key');
      expect(newState.error).toBeNull();
    });
  });

  describe('completeSetup', () => {
    it('should transition to complete step', () => {
      const state: WizardState = {
        step: 'setup',
        provider: 'gemini',
        authMethod: 'oauth',
        error: null,
      };
      const newState = completeSetup(state);
      expect(newState.step).toBe('complete');
      expect(newState.error).toBeNull();
    });
  });

  describe('back', () => {
    it('should go back from auth_method to provider and clear authMethod', () => {
      const state: WizardState = {
        step: 'auth_method',
        provider: 'gemini',
        authMethod: 'oauth',
        error: 'Previous error',
      };
      const newState = back(state);
      expect(newState.step).toBe('provider');
      expect(newState.provider).toBe('gemini');
      expect(newState.authMethod).toBeNull();
      expect(newState.error).toBeNull();
    });

    it('should go back from setup to auth_method for providers that need it', () => {
      const state: WizardState = {
        step: 'setup',
        provider: 'gemini',
        authMethod: 'oauth',
        error: null,
      };
      const newState = back(state);
      expect(newState.step).toBe('auth_method');
      expect(newState.provider).toBe('gemini');
      expect(newState.authMethod).toBeNull();
    });

    it('should go back from setup to provider for providers that do not need auth_method', () => {
      const state: WizardState = {
        step: 'setup',
        provider: 'openai_compatible',
        authMethod: 'api_key',
        error: null,
      };
      const newState = back(state);
      expect(newState.step).toBe('provider');
      expect(newState.provider).toBe('openai_compatible');
      expect(newState.authMethod).toBeNull();
    });
  });

  describe('setError', () => {
    it('should set error message', () => {
      const state = createInitialState();
      const newState = setError(state, 'Test error');
      expect(newState.error).toBe('Test error');
    });
  });

  describe('getNextStep', () => {
    it('should return auth_method for gemini provider at provider step', () => {
      const state: WizardState = {
        step: 'provider',
        provider: 'gemini',
        authMethod: null,
        error: null,
      };
      expect(getNextStep(state)).toBe('auth_method');
    });

    it('should return setup for openai_compatible provider at provider step', () => {
      const state: WizardState = {
        step: 'provider',
        provider: 'openai_compatible',
        authMethod: null,
        error: null,
      };
      expect(getNextStep(state)).toBe('setup');
    });

    it('should return setup for auth_method step with auth method selected', () => {
      const state: WizardState = {
        step: 'auth_method',
        provider: 'gemini',
        authMethod: 'oauth',
        error: null,
      };
      expect(getNextStep(state)).toBe('setup');
    });

    it('should return complete for setup step', () => {
      const state: WizardState = {
        step: 'setup',
        provider: 'gemini',
        authMethod: 'oauth',
        error: null,
      };
      expect(getNextStep(state)).toBe('complete');
    });
  });

  describe('needsAuthMethodStep', () => {
    it('should return true for gemini', () => {
      expect(needsAuthMethodStep('gemini')).toBe(true);
    });

    it('should return true for anthropic', () => {
      expect(needsAuthMethodStep('anthropic')).toBe(true);
    });

    it('should return false for openai_compatible', () => {
      expect(needsAuthMethodStep('openai_compatible')).toBe(false);
    });
  });

  describe('getAuthMethodOptions', () => {
    it('should return correct options for gemini', () => {
      const options = getAuthMethodOptions('gemini');
      expect(options).toEqual(['oauth', 'api_key', 'vertex_ai']);
    });

    it('should return correct options for openai_compatible', () => {
      const options = getAuthMethodOptions('openai_compatible');
      expect(options).toEqual(['api_key']);
    });

    it('should return correct options for anthropic', () => {
      const options = getAuthMethodOptions('anthropic');
      expect(options).toEqual(['oauth', 'api_key']);
    });
  });

  describe('mapGeminiAuthMethodToAuthType', () => {
    it('should map oauth to LOGIN_WITH_GOOGLE', () => {
      expect(mapGeminiAuthMethodToAuthType('oauth')).toBe(
        AuthType.LOGIN_WITH_GOOGLE,
      );
    });

    it('should map api_key to USE_GEMINI', () => {
      expect(mapGeminiAuthMethodToAuthType('api_key')).toBe(
        AuthType.USE_GEMINI,
      );
    });

    it('should map vertex_ai to USE_VERTEX_AI', () => {
      expect(mapGeminiAuthMethodToAuthType('vertex_ai')).toBe(
        AuthType.USE_VERTEX_AI,
      );
    });
  });
});
