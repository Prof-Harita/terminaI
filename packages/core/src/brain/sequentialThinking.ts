/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GenerativeModelAdapter } from './riskAssessor.js';

/**
 * Implements the Logic Chain (Sequential Thinking) framework.
 * Framework ID: FW_SEQUENTIAL
 */
export class SequentialThinking {
  constructor(private readonly model: GenerativeModelAdapter) {}

  /**
   * Orchestrates a step in the sequential thinking process.
   * @param task The task being solved
   * @param history Previous steps and observations
   * @returns Next hypothesis and action
   */
  async nextStep(
    task: string,
    history: string[],
  ): Promise<{ hypothesis: string; test: string }> {
    const prompt = `
Task: "${task}"
Progress:
${history.join('\n')}

Based on the progress so far, provide:
1. A hypothesis about the current state or root cause.
2. A diagnostic command or test to verify the hypothesis.

Respond in JSON format:
{
  "hypothesis": "your hypothesis",
  "test": "command to run"
}
    `;

    const response = await this.model.generateContent(prompt);
    const text = response.response.text();

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Ignore parsing failures
    }

    return { hypothesis: 'Checking system state', test: 'ls -R' };
  }
}
