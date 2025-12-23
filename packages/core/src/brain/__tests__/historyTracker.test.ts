/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import mockFs from 'mock-fs';

vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as object),
    default: {
      ...(actual as object),
      homedir: () => '/home/test',
    },
    homedir: () => '/home/test',
  };
});

import * as fs from 'node:fs';
import {
  getHistoricalContext,
  getRecentOutcomes,
  logOutcome,
} from '../historyTracker.js';

describe('historyTracker', () => {
  beforeEach(() => {
    mockFs({
      '/home/test': {},
    });
  });

  afterEach(() => {
    mockFs.restore();
  });

  it('logs outcomes and reads them back', () => {
    const outcome = {
      timestamp: '2025-01-01T00:00:00Z',
      request: 'list files',
      command: 'ls -la',
      assessedRisk: 'trivial',
      actualOutcome: 'success' as const,
      userApproved: true,
    };

    logOutcome(outcome);

    const contents = fs.readFileSync(
      '/home/test/.termai/history.jsonl',
      'utf-8',
    );
    expect(contents.trim()).toBe(JSON.stringify(outcome));
    expect(getRecentOutcomes(1)[0]).toMatchObject(outcome);
  });

  it('returns empty history when file is missing', () => {
    const outcomes = getRecentOutcomes();
    expect(outcomes).toEqual([]);
  });

  it('applies confidence adjustments for similar commands', () => {
    for (let i = 0; i < 3; i++) {
      logOutcome({
        timestamp: `2025-01-01T00:00:0${i}Z`,
        request: 'prune docker',
        command: 'docker prune -f',
        assessedRisk: 'normal',
        actualOutcome: 'failure',
        userApproved: true,
      });
    }

    const context = getHistoricalContext('docker prune -f --all');
    expect(context.confidenceAdjustment).toBe(-15);
    expect(context.reasoning).toContain('failed 3/3 times');
  });
});
