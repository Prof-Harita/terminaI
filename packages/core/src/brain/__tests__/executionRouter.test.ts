/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { routeExecution } from '../executionRouter.js';

const baseDimensions = {
  uniqueness: 10,
  complexity: 10,
  irreversibility: 10,
  consequences: 10,
  confidence: 90,
  environment: 'dev' as const,
};

describe('executionRouter', () => {
  it('routes trivial risk to fast-path', () => {
    const decision = routeExecution({
      dimensions: baseDimensions,
      overallRisk: 'trivial',
      reasoning: 'safe',
      suggestedStrategy: 'fast-path',
    });
    expect(decision.strategy).toEqual({ type: 'fast-path' });
    expect(decision.requiresConfirmation).toBe(false);
  });

  it('requires confirmation for normal risk in prod', () => {
    const decision = routeExecution({
      dimensions: { ...baseDimensions, environment: 'prod' },
      overallRisk: 'normal',
      reasoning: 'standard change',
      suggestedStrategy: 'preview',
    });
    expect(decision.strategy.type).toBe('preview');
    expect(decision.requiresConfirmation).toBe(true);
  });

  it('returns iterate strategy for elevated risk', () => {
    const decision = routeExecution({
      dimensions: baseDimensions,
      overallRisk: 'elevated',
      reasoning: 'needs caution',
      suggestedStrategy: 'iterate',
    });
    expect(decision.strategy).toEqual({ type: 'iterate', maxRetries: 3 });
    expect(decision.shouldWarn).toBe(true);
    expect(decision.warningMessage).toContain('Elevated risk');
  });

  it('uses plan snapshot for critical risk', () => {
    const decision = routeExecution({
      dimensions: {
        ...baseDimensions,
        irreversibility: 90,
        consequences: 95,
        confidence: 55,
      },
      overallRisk: 'critical',
      reasoning: 'danger',
      suggestedStrategy: 'plan-snapshot',
    });
    expect(decision.strategy.type).toBe('plan-snapshot');
    expect(decision.requiresConfirmation).toBe(true);
    expect(decision.confirmationMessage).toContain('CRITICAL OPERATION');
    expect(decision.warningMessage).toContain('CRITICAL');
  });
});
