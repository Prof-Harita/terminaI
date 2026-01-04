/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BrainRiskManager } from '../toolIntegration.js';
import type { Config } from '../../config/config.js';

// Mock the index.js module which re-exports logOutcome from historyTracker
vi.mock('../index.js', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../index.js')>();
  return {
    ...orig,
    logOutcome: vi.fn(),
    assessRisk: vi.fn().mockResolvedValue({
      overallRisk: 'low',
      dimensions: { confidence: 80, environment: 'development' },
      suggestedStrategy: 'direct-execution',
      reasoning: 'Low risk action',
      isHeuristic: false,
    }),
    routeExecution: vi.fn().mockReturnValue({
      requiresConfirmation: false,
      shouldWarn: false,
    }),
    handleConfidence: vi.fn().mockReturnValue({ type: 'proceed' }),
  };
});

describe('BrainRiskManager', () => {
  let config: Config;
  let manager: BrainRiskManager;

  beforeEach(() => {
    vi.clearAllMocks();

    config = {
      getBrainAuthority: vi.fn().mockReturnValue('advisory'),
      getActiveModel: vi.fn().mockReturnValue('mock-model-pro'),
      getProviderConfig: vi.fn().mockReturnValue({ provider: 'gemini' }),
      getTargetDir: vi.fn().mockReturnValue('/app'),
      getBaseLlmClient: vi.fn().mockReturnValue({
        generateContent: vi.fn().mockResolvedValue({
          candidates: [{ content: { parts: [{ text: 'response' }] } }],
        }),
      }),
      getSessionId: vi.fn().mockReturnValue('session-123'),
    } as unknown as Config;

    manager = new BrainRiskManager(config);
  });

  describe('buildGenerativeModelAdapter (P0.3 Tier Resolution)', () => {
    it('always uses active model regardless of tier preference', async () => {
      // Build the adapter (no arguments expected)
      const model = manager.buildGenerativeModelAdapter();
      expect(model).not.toBeNull();

      if (model) {
        // Now call generateContent with the tier hint
        await model.generateContent('prompt', { tier: 'flash' });

        // Verify active model was fetched from config, confirming we ignored 'flash' tier
        // unless config strategy supports it (which we are verifying it relies on config)
        expect(config.getActiveModel).toHaveBeenCalled();
        expect(config.getBaseLlmClient).toHaveBeenCalled();
      }
    });
  });

  describe('recordOutcome (P2.1)', () => {
    it('logs userApproved correctly', async () => {
      // Get the mocked logOutcome from the module
      const indexModule = await import('../index.js');
      const logOutcomeMock = vi.mocked(indexModule.logOutcome);

      // recordOutcome only works when brainContext is set, so we need to evaluate first
      // We'll manually set the brainContext to simulate a prior evaluation
      (manager as unknown as Record<string, unknown>)['brainContext'] = {
        request: 'test op',
        assessment: { overallRisk: 'low' },
        decision: { requiresConfirmation: false },
        confidenceAction: { type: 'proceed' },
      };

      // Test 1: Failure outcome with userApproved = true
      manager.recordOutcome('cmd', 'failure', true, 'error msg');

      expect(logOutcomeMock).toHaveBeenCalledWith(
        expect.objectContaining({
          actualOutcome: 'failure',
          userApproved: true,
          errorMessage: 'error msg',
        }),
      );

      // Test 2: Cancelled outcome with userApproved = false
      manager.recordOutcome('cmd', 'cancelled', false, 'user denied');
      expect(logOutcomeMock).toHaveBeenCalledWith(
        expect.objectContaining({
          actualOutcome: 'cancelled',
          userApproved: false,
          errorMessage: 'user denied',
        }),
      );
    });

    it('does not log when brainContext is null', async () => {
      const indexModule = await import('../index.js');
      const logOutcomeMock = vi.mocked(indexModule.logOutcome);
      logOutcomeMock.mockClear();

      // brainContext is null by default
      manager.recordOutcome('cmd', 'success');

      expect(logOutcomeMock).not.toHaveBeenCalled();
    });
  });

  describe('applyBrainAuthority (P0.5)', () => {
    it('escalates risk when authority is governing', () => {
      // Set up governing authority
      vi.mocked(config.getBrainAuthority).mockReturnValue('governing');

      // Manually set brainContext with critical risk assessment
      (manager as unknown as Record<string, unknown>)['brainContext'] = {
        request: 'dangerous operation',
        assessment: {
          overallRisk: 'critical',
          suggestedStrategy: 'plan-snapshot',
          confidence: 10,
          consequences: 100,
          uniqueness: 100,
          irreversibility: 100,
          complexity: 100,
          reasoning: 'Bad',
          dimensions: { confidence: 10, environment: 'production' },
          isHeuristic: false,
        },
        decision: { requiresConfirmation: true, shouldWarn: true },
        confidenceAction: { type: 'proceed' },
      };

      const result = manager.applyBrainAuthority(
        { level: 'A', reasons: [], requiresClick: false, requiresPin: false },
        'governing',
      );

      // Should escalate to C (PIN) because of critical risk + governing authority
      expect(result.level).toBe('C');
      // Verify reason was added explaining the escalation
      expect(result.reasons.length).toBeGreaterThan(0);
      expect(
        result.reasons.some((r: string) => r.includes('Brain risk assessment')),
      ).toBe(true);
    });

    it('does not escalate when authority is advisory', () => {
      vi.mocked(config.getBrainAuthority).mockReturnValue('advisory');

      // Set brainContext with critical risk
      (manager as unknown as Record<string, unknown>)['brainContext'] = {
        request: 'dangerous operation',
        assessment: {
          overallRisk: 'critical',
          suggestedStrategy: 'plan-snapshot',
          reasoning: 'Bad',
          dimensions: { confidence: 10, environment: 'production' },
          isHeuristic: false,
        },
        decision: { requiresConfirmation: true },
        confidenceAction: { type: 'proceed' },
      };

      const result = manager.applyBrainAuthority(
        { level: 'A', reasons: [], requiresClick: false, requiresPin: false },
        'advisory',
      );

      expect(result.level).toBe('A'); // No change
    });

    it('returns original review when brainContext is null', () => {
      // brainContext is null by default
      const result = manager.applyBrainAuthority(
        { level: 'A', reasons: [], requiresClick: false, requiresPin: false },
        'governing',
      );

      expect(result.level).toBe('A'); // No change because no context
    });
  });
});
