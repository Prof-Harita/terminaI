/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GenerativeModelAdapter } from './riskAssessor.js';
/**
 * Implements the Code Thinker framework.
 * Framework ID: FW_SCRIPT
 */
export interface CodeThinkerResult {
  language: 'python' | 'node';
  code: string;
  explanation: string;
}

export class CodeThinker {
  constructor(private readonly model: GenerativeModelAdapter) {}

  /**
   * Solves a task by generating a script proposal.
   */
  async solve(task: string): Promise<CodeThinkerResult | null> {
    const prompt = `
Task: "${task}"

Write a throwaway Python or Node.js script to solve this task.
The script should print the final result.

Respond in JSON:
{
  "language": "python" | "node",
  "code": "the script code",
  "explanation": "what the script does"
}
    `;

    const response = await this.model.generateContent(prompt);
    const text = response.response.text();

    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as {
          language?: string;
          code?: string;
          explanation?: string;
        };
        const rawLanguage = parsed.language?.toLowerCase();
        const normalizedLanguage =
          rawLanguage === 'javascript' ? 'node' : rawLanguage;

        if (normalizedLanguage !== 'python' && normalizedLanguage !== 'node') {
          return null;
        }
        if (!parsed.code) {
          return null;
        }

        return {
          language: normalizedLanguage,
          code: parsed.code,
          explanation: parsed.explanation ?? '',
        };
      }
    } catch {
      // Ignore parsing failures
    }

    return null;
  }
}
