/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

export interface ActionOutcome {
  timestamp: string;
  request: string;
  command?: string;
  assessedRisk: string;
  actualOutcome: 'success' | 'failure' | 'cancelled';
  userApproved: boolean;
  errorMessage?: string;
}

function getHistoryFilePath(): string {
  const homeRaw =
    typeof (os as unknown as { homedir?: unknown }).homedir === 'function'
      ? os.homedir()
      : (process.env['HOME'] ?? '');
  const home = typeof homeRaw === 'string' ? homeRaw : '';

  const tmpRaw =
    typeof (os as unknown as { tmpdir?: unknown }).tmpdir === 'function'
      ? os.tmpdir()
      : '';
  const tmp = typeof tmpRaw === 'string' && tmpRaw ? tmpRaw : '/tmp';

  const root = home || tmp;
  try {
    return path.join(root, '.termai', 'history.jsonl');
  } catch {
    return '/tmp/.termai/history.jsonl';
  }
}
const MAX_HISTORY_BYTES = 2 * 1024 * 1024;

export function logOutcome(outcome: ActionOutcome): void {
  const historyFile = getHistoryFilePath();
  const dir = path.dirname(historyFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.appendFileSync(historyFile, `${JSON.stringify(outcome)}\n`);
  pruneHistory(1000);
}

function pruneHistory(maxEntries: number): void {
  const historyFile = getHistoryFilePath();
  if (!fs.existsSync(historyFile)) {
    return;
  }

  const lines = fs
    .readFileSync(historyFile, 'utf-8')
    .split('\n')
    .filter(Boolean);

  if (lines.length <= maxEntries) {
    return;
  }

  const trimmed = lines.slice(-maxEntries);
  fs.writeFileSync(historyFile, `${trimmed.join('\n')}\n`);
}

export function getRecentOutcomes(count: number = 50): ActionOutcome[] {
  const historyFile = getHistoryFilePath();
  if (!fs.existsSync(historyFile)) {
    return [];
  }

  try {
    const stat = fs.statSync(historyFile);
    const start = Math.max(0, stat.size - MAX_HISTORY_BYTES);
    const fd = fs.openSync(historyFile, 'r');
    try {
      const buf = Buffer.alloc(stat.size - start);
      fs.readSync(fd, buf, 0, buf.length, start);
      const text = buf.toString('utf-8');
      const rawLines = text.split('\n');
      const lines =
        start > 0
          ? rawLines.slice(1).filter(Boolean)
          : rawLines.filter(Boolean);
      return lines
        .slice(-count)
        .map((line) => JSON.parse(line) as ActionOutcome);
    } finally {
      fs.closeSync(fd);
    }
  } catch (_error) {
    return [];
  }
}

export interface HistoricalContext {
  similarSuccesses: number;
  similarFailures: number;
  confidenceAdjustment: number;
  reasoning: string;
}

export function getHistoricalContext(command: string): HistoricalContext {
  const outcomes = getRecentOutcomes(100);
  const commandPrefix = command.split(' ').slice(0, 2).join(' ');

  const similar = outcomes.filter((outcome) =>
    outcome.command?.startsWith(commandPrefix),
  );

  const successes = similar.filter(
    (outcome) => outcome.actualOutcome === 'success',
  ).length;
  const failures = similar.filter(
    (outcome) => outcome.actualOutcome === 'failure',
  ).length;

  let confidenceAdjustment = 0;
  let reasoning = '';

  if (similar.length >= 3) {
    const successRate = successes / similar.length;
    if (successRate > 0.8) {
      confidenceAdjustment = 15;
      reasoning = `Similar command succeeded ${successes}/${similar.length} times recently`;
    } else if (successRate < 0.5) {
      confidenceAdjustment = -15;
      reasoning = `Similar command failed ${failures}/${similar.length} times recently`;
    }
  }

  return {
    similarSuccesses: successes,
    similarFailures: failures,
    confidenceAdjustment,
    reasoning,
  };
}

/**
 * Outcome of a cognitive architecture approach attempt.
 */
export interface ApproachOutcome {
  timestamp: string;
  task: string;
  approachUsed: string;
  frameworkId: string;
  outcome: 'success' | 'failure';
  durationMs?: number;
}

/**
 * Logs an approach outcome for learning.
 */
export function logApproachOutcome(outcome: ApproachOutcome): void {
  const historyFile = getHistoryFilePath().replace(
    'history.jsonl',
    'approaches.jsonl',
  );
  const dir = path.dirname(historyFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.appendFileSync(historyFile, `${JSON.stringify(outcome)}\n`);
}

/**
 * Gets historical context for a specific approach on similar tasks.
 */
export function getApproachContext(
  task: string,
  approach: string,
): {
  successRate: number;
  sampleSize: number;
  confidenceBoost: number;
} {
  const historyFile = getHistoryFilePath().replace(
    'history.jsonl',
    'approaches.jsonl',
  );
  if (!fs.existsSync(historyFile)) {
    return { successRate: 0.5, sampleSize: 0, confidenceBoost: 0 };
  }

  try {
    const lines = fs
      .readFileSync(historyFile, 'utf-8')
      .split('\n')
      .filter(Boolean);
    const outcomes: ApproachOutcome[] = lines.map((l) => JSON.parse(l));

    // Find similar tasks (simple keyword matching)
    const taskKeywords = task.toLowerCase().split(' ').slice(0, 3);
    const similar = outcomes.filter((o) => {
      const outcomeKeywords = o.task.toLowerCase().split(' ').slice(0, 3);
      return (
        taskKeywords.some((kw) => outcomeKeywords.includes(kw)) &&
        o.approachUsed.toLowerCase() === approach.toLowerCase()
      );
    });

    if (similar.length === 0) {
      return { successRate: 0.5, sampleSize: 0, confidenceBoost: 0 };
    }

    const successes = similar.filter((o) => o.outcome === 'success').length;
    const successRate = successes / similar.length;

    // Boost confidence if approach has good track record
    let confidenceBoost = 0;
    if (similar.length >= 3) {
      if (successRate > 0.8) confidenceBoost = 15;
      else if (successRate < 0.3) confidenceBoost = -20;
    }

    return { successRate, sampleSize: similar.length, confidenceBoost };
  } catch {
    return { successRate: 0.5, sampleSize: 0, confidenceBoost: 0 };
  }
}
