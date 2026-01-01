/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GenerativeModelAdapter } from './riskAssessor.js';

/**
 * Result of a PAC loop execution.
 */
export interface PACResult {
  success: boolean;
  output: string;
  error?: string;
  failureCount: number;
  verificationReasoning?: string;
}

/**
 * Interface for tool execution in the PAC loop.
 */
export type ToolExecutor = () => Promise<{
  success: boolean;
  output: string;
  error?: string;
}>;

/**
 * Implements the Plan-Act-Check loop.
 */
export class PACLoop {
  private failureCount = 0;

  constructor(private readonly model: GenerativeModelAdapter) {}

  /**
   * Executes a task using the PAC pattern.
   * @param goal The current goal
   * @param successCriteria How to identify success
   * @param executor The function that performs the action
   * @param options Execution options (timeout, abort signal)
   * @returns PAC execution result
   */
  async execute(
    goal: string,
    successCriteria: string,
    executor: ToolExecutor,
    options?: { abortSignal?: AbortSignal; timeout?: number },
  ): Promise<PACResult> {
    const timeout = options?.timeout ?? 30000;
    const signal = options?.abortSignal;

    if (signal?.aborted) {
      return {
        success: false,
        output: '',
        error: 'Execution cancelled',
        failureCount: this.failureCount,
      };
    }

    // Act
    const result = await executor();

    if (!result.success) {
      this.failureCount++;
      return {
        ...result,
        failureCount: this.failureCount,
      };
    }

    // Check: Verify against criteria using LLM
    const verificationPrompt = `
Goal: "${goal}"
Success Criteria: "${successCriteria}"
Action Output:
"${result.output}"

Analyze the output. Does it satisfy the success criteria for the given goal?
Respond in JSON:
{
  "satisfied": true | false,
  "reasoning": "brief explanation"
}
    `;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      if (signal) {
        signal.addEventListener('abort', () => controller.abort(), {
          once: true,
        });
      }

      const response = await this.model.generateContent(verificationPrompt, {
        abortSignal: controller.signal,
        tier: 'pro',
      });
      clearTimeout(timeoutId);

      const text = response.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const verification = JSON.parse(jsonMatch[0]);
        if (verification.satisfied) {
          this.failureCount = 0;
          return {
            ...result,
            success: true,
            verificationReasoning: verification.reasoning,
            failureCount: this.failureCount,
          };
        } else {
          this.failureCount++;
          return {
            ...result,
            success: false,
            error: `Verification failed: ${verification.reasoning}`,
            verificationReasoning: verification.reasoning,
            failureCount: this.failureCount,
          };
        }
      }
    } catch (error) {
      console.error('PACLoop Verification Error:', error);
    }

    // Fallback: if verification fails or errors out, trust the tool result but log it
    this.failureCount = 0;
    return {
      ...result,
      failureCount: this.failureCount,
    };
  }

  getFailureCount(): number {
    return this.failureCount;
  }
}
