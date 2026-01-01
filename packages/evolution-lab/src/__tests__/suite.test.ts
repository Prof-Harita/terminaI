/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it } from 'vitest';
import { evaluateSuiteTask, loadSuiteDefinitions } from '../suite.js';

describe('suite harness', () => {
  it('loads default suite definitions', async () => {
    const defs = await loadSuiteDefinitions();
    expect(defs.length).toBeGreaterThan(0);
    expect(defs[0]).toHaveProperty('id');
  });

  it('evaluates failures when expectations are not met', () => {
    const result = evaluateSuiteTask(
      {
        id: 't1',
        description: 'test',
        command: 'echo',
        args: [],
        expect: 'nonzero',
        maxStdout: 5,
        expectTruncated: true,
      },
      {
        stdout: 'abcdef',
        stderr: '',
        exitCode: 0,
        truncated: false,
      },
    );

    expect(result.passed).toBe(false);
    expect(result.notes.length).toBeGreaterThan(0);
  });
});
