/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import type { GenerativeModelAdapter } from '../riskAssessor.js';
import {
  selectFrameworkHeuristic,
  selectFrameworkWithLLM,
} from '../frameworkSelector.js';

describe('FrameworkSelector', () => {
  it('selects FW_DIRECT for trivial prompts', () => {
    const selection = selectFrameworkHeuristic('what is my ip');
    expect(selection?.frameworkId).toBe('FW_DIRECT');
  });

  it('selects FW_SCRIPT for data-heavy prompts', () => {
    const selection = selectFrameworkHeuristic(
      'parse this large csv and summarize key trends',
    );
    expect(selection?.frameworkId).toBe('FW_SCRIPT');
  });

  it('parses LLM JSON response into a framework selection', async () => {
    const mockModel = {
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () =>
            JSON.stringify({
              frameworkId: 'FW_SEQUENTIAL',
              reasoning: 'Debugging a failure.',
              confidence: 82,
            }),
        },
      }),
    } satisfies Partial<GenerativeModelAdapter>;

    const selection = await selectFrameworkWithLLM(
      'why is my build failing',
      mockModel as GenerativeModelAdapter,
    );

    expect(selection.frameworkId).toBe('FW_SEQUENTIAL');
    expect(selection.confidence).toBe(82);
  });

  it('falls back to FW_CONSENSUS when LLM output is invalid', async () => {
    const mockModel = {
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => 'not json',
        },
      }),
    } satisfies Partial<GenerativeModelAdapter>;

    const selection = await selectFrameworkWithLLM(
      'convert this document',
      mockModel as GenerativeModelAdapter,
    );

    expect(selection.frameworkId).toBe('FW_CONSENSUS');
    expect(selection.confidence).toBe(50);
  });
});
