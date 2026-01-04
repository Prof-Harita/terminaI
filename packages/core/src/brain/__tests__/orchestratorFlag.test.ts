/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ThinkingOrchestrator } from '../thinkingOrchestrator.js';
import type { Config } from '../../config/config.js';
import type { GenerativeModelAdapter } from '../riskAssessor.js';

// Mock loadSystemSpec to avoid error
vi.mock('../systemSpec.js', () => ({
  loadSystemSpec: vi.fn().mockReturnValue({}),
}));

describe('ThinkingOrchestrator Flag Gating', () => {
  let mockConfig: Config;
  let mockModel: GenerativeModelAdapter;

  beforeEach(() => {
    mockConfig = {
      experimentalBrainFrameworks: false,
      getDebugMode: () => false,
    } as unknown as Config;

    mockModel = {
      generateContent: vi.fn(),
    } as unknown as GenerativeModelAdapter;
  });

  it('should return FW_DIRECT when experimentalBrainFrameworks is false', async () => {
    const orchestrator = new ThinkingOrchestrator(mockConfig, mockModel);
    const result = await orchestrator.executeTask(
      'some task',
      new AbortController().signal,
    );

    expect(result.frameworkId).toBe('FW_DIRECT');
    expect(result.suggestedAction).toBe('fallback_to_direct');
  });

  it('should NOT return FW_DIRECT immediately when experimentalBrainFrameworks is true', async () => {
    mockConfig = {
      experimentalBrainFrameworks: true,
      getDebugMode: () => false,
    } as unknown as Config;

    // Mock the heuristic selector or LLM selector if needed, but for now just proving it doesn't take the fast path
    // We can spy on selectFrameworkHeuristic or just check if it throws (since we didn't mock everything down the chain)
    // or we can just mock the model to return something specific.

    // Actually, let's just inspect that it *tries* to go further.
    // The heuristic selection in the real code might return null, leading to LLM call.
    // If we mock the model to throw, we know it reached there.

    vi.mocked(mockModel.generateContent).mockRejectedValue(
      new Error('Reached LLM'),
    );

    const orchestrator = new ThinkingOrchestrator(mockConfig, mockModel);

    await expect(
      orchestrator.executeTask('some task', new AbortController().signal),
    ).rejects.toThrow('Reached LLM');
  });
});
