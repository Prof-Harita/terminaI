/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockDetectEnvironment = vi.hoisted(() => vi.fn());
const mockGetHistoricalContext = vi.hoisted(() => vi.fn());

vi.mock('../environmentDetector.js', () => ({
  detectEnvironment: mockDetectEnvironment,
}));

vi.mock('../historyTracker.js', () => ({
  getHistoricalContext: mockGetHistoricalContext,
}));

import {
  assessRisk,
  assessRiskHeuristic,
  calculateOverallRisk,
} from '../riskAssessor.js';

describe('riskAssessor', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockDetectEnvironment.mockReturnValue('dev');
    mockGetHistoricalContext.mockReturnValue({
      similarSuccesses: 0,
      similarFailures: 0,
      confidenceAdjustment: 0,
      reasoning: '',
    });
  });

  it('matches known heuristic patterns', () => {
    const result = assessRiskHeuristic('ls -la');
    expect(result).toMatchObject({
      confidence: 95,
      irreversibility: 0,
    });
  });

  it('returns trivial risk for low-impact commands', async () => {
    const assessment = await assessRisk(
      'list files',
      'ls -la',
      'dev context',
      undefined,
    );

    expect(assessment.overallRisk).toBe('trivial');
    expect(assessment.suggestedStrategy).toBe('fast-path');
    expect(assessment.reasoning).toContain('Matched known pattern');
    expect(assessment.dimensions.environment).toBe('dev');
  });

  it('uses llm fallback when heuristic misses', async () => {
    mockDetectEnvironment.mockReturnValue('prod');
    const model = {
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () =>
            JSON.stringify({
              uniqueness: 90,
              complexity: 80,
              irreversibility: 100,
              consequences: 100,
              confidence: 20,
              reasoning: 'Highly destructive',
            }),
        },
      }),
    };

    const assessment = await assessRisk(
      'wipe database',
      'custom destroy op',
      'prod',
      model,
    );

    expect(model.generateContent).toHaveBeenCalled();
    expect(assessment.reasoning).toContain('Highly destructive');
    expect(assessment.overallRisk).toBe('critical');
    expect(assessment.suggestedStrategy).toBe('plan-snapshot');
  });

  it('applies history-based confidence adjustments', async () => {
    mockGetHistoricalContext.mockReturnValue({
      similarSuccesses: 0,
      similarFailures: 5,
      confidenceAdjustment: -15,
      reasoning: 'Similar command failed 5/5 times recently',
    });

    const assessment = await assessRisk(
      'remove directory',
      'rm -rf /tmp/test',
      'dev',
      undefined,
    );

    expect(assessment.dimensions.confidence).toBeLessThan(60);
    expect(assessment.reasoning).toContain('failed 5/5 times');
  });

  it('calculates overall risk using weighted formula', () => {
    const risk = calculateOverallRisk({
      uniqueness: 50,
      complexity: 50,
      irreversibility: 80,
      consequences: 80,
      confidence: 50,
      environment: 'dev',
    });
    expect(risk).toBe('elevated');
  });
});
