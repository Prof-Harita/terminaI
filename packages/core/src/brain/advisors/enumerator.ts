/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SystemSpec } from '../systemSpec.js';
import type { Advisor, AdvisorProposal } from './types.js';
import type { GenerativeModelAdapter } from '../riskAssessor.js';
import { formatSystemSpecForPrompt } from '../systemSpecPrompt.js';

/**
 * Advisor that lists all possible approaches to a task.
 */
export class EnumeratorAdvisor implements Advisor {
  readonly name = 'Enumerator';

  constructor(private readonly model: GenerativeModelAdapter) {}

  async propose(
    task: string,
    systemSpec: SystemSpec,
  ): Promise<AdvisorProposal> {
    const specStr = formatSystemSpecForPrompt(systemSpec);
    const prompt = `
[SYSTEM_SPEC]
${specStr}
[/SYSTEM_SPEC]

Task: "${task}"

As an "Enumerator" advisor, list ALL possible technical approaches to solve this task. 
Consider multiple tools, libraries, and methods (e.g., shell commands, scripts, GUI automation).

Respond with ONLY a structured JSON proposal for the BEST overall approach you identified.
{
  "approach": "name of approach",
  "reasoning": "why this approach is viable compared to others",
  "estimatedTime": "fast" | "medium" | "slow",
  "requiredDeps": ["dependency1", "dependency2"],
  "confidence": 0-100
}
    `;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await this.model.generateContent(prompt, {
        abortSignal: controller.signal,
        tier: 'flash',
      });
      clearTimeout(timeoutId);

      const text = response.response.text();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      console.warn('EnumeratorAdvisor: No JSON found in response');
    } catch (error) {
      console.error('EnumeratorAdvisor Error:', error);
    }

    return {
      approach: 'Unknown',
      reasoning: 'Failed to parse enumerator proposal.',
      estimatedTime: 'medium',
      requiredDeps: [],
      confidence: 0,
    };
  }
}
