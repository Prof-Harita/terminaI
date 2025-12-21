/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockAssessRisk = vi.hoisted(() => vi.fn());

vi.mock('../riskAssessor.js', () => ({
  assessRisk: mockAssessRisk,
}));

import {
  assessDecomposedTask,
  decomposeTask,
} from '../taskDecomposer.js';

describe('taskDecomposer', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns single step for atomic requests', async () => {
    const model = { generateContent: vi.fn() };
    const result = await decomposeTask('list files', model);
    expect(result.steps).toHaveLength(1);
    expect(result.isMultiStep).toBe(false);
    expect(model.generateContent).not.toHaveBeenCalled();
  });

  it('uses llm for complex requests', async () => {
    const model = {
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () =>
            JSON.stringify({
              steps: [
                { id: 'step-1', description: 'first', dependsOn: [] },
                { id: 'step-2', description: 'second', dependsOn: ['step-1'] },
              ],
            }),
        },
      }),
    };

    const result = await decomposeTask('set up project', model);
    expect(model.generateContent).toHaveBeenCalled();
    expect(result.steps).toHaveLength(2);
    expect(result.isMultiStep).toBe(true);
  });

  it('aggregates risk across steps', async () => {
    const task = {
      originalRequest: 'deploy service',
      steps: [
        { id: 'step-1', description: 'build', dependsOn: [] },
        { id: 'step-2', description: 'deploy', dependsOn: ['step-1'] },
      ],
      isMultiStep: true,
    };

    mockAssessRisk.mockResolvedValueOnce({
      dimensions: {
        uniqueness: 10,
        complexity: 20,
        irreversibility: 10,
        consequences: 10,
        confidence: 90,
        environment: 'dev',
      },
      overallRisk: 'normal',
      reasoning: 'build',
      suggestedStrategy: 'fast-path',
    });

    mockAssessRisk.mockResolvedValueOnce({
      dimensions: {
        uniqueness: 80,
        complexity: 80,
        irreversibility: 90,
        consequences: 90,
        confidence: 60,
        environment: 'dev',
      },
      overallRisk: 'critical',
      reasoning: 'deploy',
      suggestedStrategy: 'plan-snapshot',
    });

    const assessed = await assessDecomposedTask(
      task,
      'system',
      { generateContent: vi.fn() },
    );

    expect(assessed.aggregateRisk).toBe('critical');
    expect(assessed.highestRiskStep).toBe('step-2');
    expect(assessed.assessedSteps).toHaveLength(2);
    expect(mockAssessRisk).toHaveBeenCalledTimes(2);
  });
});
