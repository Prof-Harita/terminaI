/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GenerativeModelAdapter } from './riskAssessor.js';

/**
 * Unique identifiers for different thinking frameworks.
 */
export type FrameworkId =
  | 'FW_DIRECT'
  | 'FW_CONSENSUS'
  | 'FW_SEQUENTIAL'
  | 'FW_REFLECT'
  | 'FW_SCRIPT';

/**
 * Result of framework selection.
 */
export interface FrameworkSelection {
  frameworkId: FrameworkId;
  reasoning: string;
  confidence: number;
}

/**
 * Heuristically selects a framework based on the user request.
 * @param request The user request
 * @returns Framework selection if a high-confidence match is found, null otherwise
 */
export function selectFrameworkHeuristic(
  request: string,
): FrameworkSelection | null {
  const req = request.toLowerCase();

  if (isTrivialTask(req)) {
    return {
      frameworkId: 'FW_DIRECT',
      reasoning: 'Task appears simple and maps to a single tool call.',
      confidence: 90,
    };
  }

  if (isDebuggingTask(req)) {
    return {
      frameworkId: 'FW_SEQUENTIAL',
      reasoning: 'Task involves debugging or diagnosing a failure.',
      confidence: 85,
    };
  }

  if (isLargeFeature(req)) {
    return {
      frameworkId: 'FW_CONSENSUS',
      reasoning:
        'Task involves building or implementing a complex feature with multiple viable paths.',
      confidence: 80,
    };
  }

  if (isSafetyCritical(req)) {
    return {
      frameworkId: 'FW_REFLECT',
      reasoning:
        'Task involves safety-critical operations like migrations or refactoring.',
      confidence: 85,
    };
  }

  if (isDataProcessing(req)) {
    return {
      frameworkId: 'FW_SCRIPT',
      reasoning:
        'Task involves complex data processing better handled by code.',
      confidence: 80,
    };
  }

  return null;
}

/**
 * Uses an LLM to select a thinking framework.
 * @param request The user request
 * @param model The generative model to use
 * @returns Framework selection
 */
export async function selectFrameworkWithLLM(
  request: string,
  model: GenerativeModelAdapter,
  options?: { tier?: 'flash' | 'pro' },
): Promise<FrameworkSelection> {
  const prompt = `
Given this user request: "${request}"
Which thinking framework is most appropriate?

- FW_DIRECT: Simple, one-shot, single-tool tasks (e.g., "what's my IP", "turn on night light").
- FW_CONSENSUS: Open-ended tasks with multiple valid paths (e.g., "convert docx to pdf", "setup a REST API").
- FW_SEQUENTIAL: Debugging, diagnosis, or tasks with unknown root causes (e.g., "why is my build failing", "fix this error").
- FW_REFLECT: Safety-critical or high-precision tasks needing verification (e.g., "database migration", "refactor auth module").
- FW_SCRIPT: Complex logic better handled by a throwaway script (e.g., "parse this complex JSON", "calculate memory usage").

Respond with ONLY a JSON object:
{
  "frameworkId": "FW_ID",
  "reasoning": "brief explanation",
  "confidence": 0-100
}
  `;

  const response = await model.generateContent(prompt, { tier: options?.tier });
  const text = response.response.text();

  try {
    // Basic JSON extraction from markdown if necessary
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch {
    // Fallback if parsing fails
  }

  return {
    frameworkId: 'FW_CONSENSUS',
    reasoning: 'Fallback to consensus due to selection failure.',
    confidence: 50,
  };
}

function isTrivialTask(request: string): boolean {
  const trivialKeywords = [
    'what is',
    'tell me',
    'show me',
    'where is',
    'how many',
    'current time',
    'my ip',
  ];
  return trivialKeywords.some((kw) => request.includes(kw));
}

function isDebuggingTask(request: string): boolean {
  const debuggingKeywords = [
    'why',
    'failing',
    'broken',
    'error',
    'debug',
    'fix',
    'crash',
    'issue',
    'not working',
  ];
  return debuggingKeywords.some((kw) => request.includes(kw));
}

function isLargeFeature(request: string): boolean {
  const featureKeywords = [
    'implement',
    'build',
    'create',
    'add support',
    'integrate',
    'setup',
  ];
  return (
    featureKeywords.some((kw) => request.includes(kw)) && request.length > 50
  );
}

function isSafetyCritical(request: string): boolean {
  const safetyKeywords = [
    'migration',
    'refactor',
    'delete',
    'remove',
    'overwrite',
    'database',
    'schema',
  ];
  return safetyKeywords.some((kw) => request.includes(kw));
}

function isDataProcessing(request: string): boolean {
  const dataKeywords = [
    'parse',
    'extract',
    'calculate',
    'summarize',
    'json',
    'csv',
    'regex',
    'convert',
  ];
  return dataKeywords.some((kw) => request.includes(kw));
}
