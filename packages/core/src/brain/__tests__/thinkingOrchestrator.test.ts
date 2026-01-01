/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeAll } from 'vitest';
import {
  ThinkingOrchestrator,
  scanSystemSync,
  saveSystemSpec,
} from '../index.js';
import type { GenerativeModelAdapter } from '../riskAssessor.js';
import type { Config } from '../../config/config.js';

describe('ThinkingOrchestrator', () => {
  beforeAll(() => {
    const spec = scanSystemSync();
    saveSystemSpec(spec);
  });

  const mockConfig = {
    getDebugMode: () => false,
  } as unknown as Config;

  it('should route to consensus for complex tasks via LLM', async () => {
    // We mock twice: once for selectFrameworkWithLLM, once for ConsensusAdvisor
    const mockModel = {
      generateContent: vi
        .fn()
        .mockResolvedValueOnce({
          response: {
            text: () =>
              JSON.stringify({
                frameworkId: 'FW_CONSENSUS',
                reasoning: 'complex',
                confidence: 90,
              }),
          },
        })
        .mockResolvedValue({
          response: {
            text: () =>
              JSON.stringify({
                approach: 'Consensus Approach',
                reasoning: 'Because...',
                estimatedTime: 'medium',
                requiredDeps: [],
                confidence: 80,
              }),
          },
        }),
    } as unknown as GenerativeModelAdapter;

    const orchestrator = new ThinkingOrchestrator(mockConfig, mockModel);
    const result = await orchestrator.executeTask(
      'setup a REST API',
      new AbortController().signal,
    );

    expect(result.explanation).toContain(
      'Consensus framework selected approach',
    );
    expect(result.approach).toBe('Consensus Approach');
  });

  it('should fallback to direct for trivial tasks', async () => {
    const orchestrator = new ThinkingOrchestrator(
      mockConfig,
      {} as GenerativeModelAdapter,
    );
    const result = await orchestrator.executeTask(
      'what is my ip',
      new AbortController().signal,
    );

    expect(result.suggestedAction).toBe('fallback_to_direct');
  });

  it('should use scripted framework for data processing', async () => {
    const mockModel = {
      generateContent: vi.fn().mockResolvedValue({
        // CodeThinker call
        response: {
          text: () =>
            JSON.stringify({
              language: 'javascript',
              code: 'console.log("hello")',
              explanation: 'test',
            }),
        },
      }),
    } as unknown as GenerativeModelAdapter;

    const orchestrator = new ThinkingOrchestrator(mockConfig, mockModel);
    // "parse this json" triggers FW_SCRIPT heuristic
    const result = await orchestrator.executeTask(
      'parse this json',
      new AbortController().signal,
    );
    expect(result.suggestedAction).toBe('execute_tool');
    expect(result.toolCall?.name).toBe('execute_repl');
    expect(result.toolCall?.args).toMatchObject({
      language: 'node',
      code: 'console.log("hello")',
    });
  });
});
