/**
 * @license
 * Copyright 2025 Google LLC
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

const HISTORY_FILE = path.join(os.homedir(), '.termai', 'history.jsonl');

export function logOutcome(outcome: ActionOutcome): void {
  const dir = path.dirname(HISTORY_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.appendFileSync(HISTORY_FILE, `${JSON.stringify(outcome)}\n`);
  pruneHistory(1000);
}

function pruneHistory(maxEntries: number): void {
  if (!fs.existsSync(HISTORY_FILE)) {
    return;
  }

  const lines = fs
    .readFileSync(HISTORY_FILE, 'utf-8')
    .split('\n')
    .filter(Boolean);

  if (lines.length <= maxEntries) {
    return;
  }

  const trimmed = lines.slice(-maxEntries);
  fs.writeFileSync(HISTORY_FILE, `${trimmed.join('\n')}\n`);
}

export function getRecentOutcomes(count: number = 50): ActionOutcome[] {
  if (!fs.existsSync(HISTORY_FILE)) {
    return [];
  }

  try {
    const lines = fs
      .readFileSync(HISTORY_FILE, 'utf-8')
      .split('\n')
      .filter(Boolean);
    return lines
      .slice(-count)
      .map((line) => JSON.parse(line) as ActionOutcome);
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
