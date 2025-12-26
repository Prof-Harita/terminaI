/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi } from 'vitest';
import { PACLoop } from '../index.js';
import type { GenerativeModelAdapter } from '../riskAssessor.js';

describe('PACLoop', () => {
  const createMockModel = (satisfied: boolean, reasoning: string) =>
    ({
      generateContent: vi.fn().mockResolvedValue({
        response: {
          text: () => JSON.stringify({ satisfied, reasoning }),
        },
      }),
    }) as unknown as GenerativeModelAdapter;

  it('should return success when tool output is satisfied', async () => {
    const mockModel = createMockModel(true, 'Criteria met');
    const pac = new PACLoop(mockModel);
    const executor = vi
      .fn()
      .mockResolvedValue({ success: true, output: 'Done' });

    const result = await pac.execute('goal', 'criteria', executor);
    expect(result.success).toBe(true);
    expect(result.failureCount).toBe(0);
  });

  it('should return failure when tool output is not satisfied', async () => {
    const mockModel = createMockModel(false, 'Missing data');
    const pac = new PACLoop(mockModel);
    const executor = vi
      .fn()
      .mockResolvedValue({ success: true, output: 'Partial' });

    const result = await pac.execute('goal', 'criteria', executor);
    expect(result.success).toBe(false);
    expect(result.failureCount).toBe(1);
    expect(result.verificationReasoning).toBe('Missing data');
  });

  it('should return failure when executor fails', async () => {
    const pac = new PACLoop({} as GenerativeModelAdapter);
    const executor = vi
      .fn()
      .mockResolvedValue({ success: false, output: '', error: 'Crash' });

    const result = await pac.execute('goal', 'criteria', executor);
    expect(result.success).toBe(false);
    expect(result.failureCount).toBe(1);
    expect(result.error).toBe('Crash');
  });
});
