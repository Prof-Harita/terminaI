/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import type { GenerativeModelAdapter } from '../riskAssessor.js';
import type { Config } from '../../config/config.js';
import type { SystemSpec } from '../systemSpec.js';

// Static fixture to avoid slow execSync calls on Windows CI
const mockSystemSpec: SystemSpec = {
  os: { name: 'linux', version: '5.15.0', arch: 'x64' },
  shell: { type: 'bash', version: '5.0.0' },
  runtimes: { node: { version: 'v20.0.0', npm: '10.0.0' } },
  binaries: { git: { path: '/usr/bin/git', version: '2.40.0' } },
  packageManagers: ['npm'],
  sudoAvailable: false,
  network: { hasInternet: true },
  timestamp: Date.now(),
};

// Mock scanSystemSync on Windows to avoid slow execSync calls
vi.mock('../systemSpec.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../systemSpec.js')>();

  // Only mock on Windows - Linux CI uses real system scan
  if (process.platform === 'win32') {
    return {
      ...actual,
      scanSystemSync: vi.fn(() => mockSystemSpec),
      saveSystemSpec: vi.fn(),
    };
  }
  return actual;
});

import {
  ThinkingOrchestrator,
  scanSystemSync,
  saveSystemSpec,
} from '../index.js';

describe('ThinkingOrchestrator', () => {
  // Initialize system spec (mocked on Windows, real on Linux)
  const spec = scanSystemSync();
  saveSystemSpec(spec);

  const mockConfig = {
    getDebugMode: () => false,
    experimentalBrainFrameworks: true,
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
