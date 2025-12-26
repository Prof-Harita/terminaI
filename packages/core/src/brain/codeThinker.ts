/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GenerativeModelAdapter } from './riskAssessor.js';
import type { REPLManager } from './replManager.js';

/**
 * Implements the Code Thinker framework.
 * Framework ID: FW_SCRIPT
 */
export class CodeThinker {
  constructor(
    private readonly model: GenerativeModelAdapter,
    private readonly repl: REPLManager,
  ) {}

  /**
   * Solves a task by generating and executing a script.
   */
  async solve(task: string): Promise<string> {
    const prompt = `
Task: "${task}"

Write a throwaway Python or Node.js script to solve this task.
The script should print the final result.

Respond in JSON:
{
  "language": "python" | "javascript",
  "code": "the script code",
  "explanation": "what the script does"
}
    `;

    const response = await this.model.generateContent(prompt);
    const text = response.response.text();

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const { language, code } = JSON.parse(jsonMatch[0]);
        return await this.repl.execute(language, code);
      }
    } catch {
      // Ignore parsing failures
    }

    return 'Failed to execute Code Thinker script.';
  }
}
