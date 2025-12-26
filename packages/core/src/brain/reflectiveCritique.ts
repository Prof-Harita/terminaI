/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GenerativeModelAdapter } from './riskAssessor.js';

/**
 * Implements the Verificative (Reflective Critique) framework.
 * Framework ID: FW_REFLECT
 */
export class ReflectiveCritique {
  constructor(private readonly model: GenerativeModelAdapter) {}

  /**
   * Generates a solution and then critiques it.
   * @param task the task to solve
   * @returns solution and critique
   */
  async generateAndCritique(
    task: string,
  ): Promise<{ solution: string; critique: string }> {
    const genPrompt = `Generate a solution for: "${task}"`;
    const genResponse = await this.model.generateContent(genPrompt, {
      tier: 'flash',
    });
    const solution = genResponse.response.text();

    const critiquePrompt = `Critique this solution for bugs, security risks, and edge cases:
${solution}`;
    const critiqueResponse = await this.model.generateContent(critiquePrompt, {
      tier: 'pro',
    });
    const critique = critiqueResponse.response.text();

    return { solution, critique };
  }

  /**
   * Refines a solution based on a critique.
   */
  async refine(solution: string, critique: string): Promise<string> {
    const prompt = `Refine this solution based on the following critique:
Original Solution:
${solution}

Critique:
${critique}

Provide the refined solution.`;
    const response = await this.model.generateContent(prompt, { tier: 'pro' });
    return response.response.text();
  }
}
