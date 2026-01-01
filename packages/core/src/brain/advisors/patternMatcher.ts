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
 * Advisor that identifies industry best practices for a task.
 */
export class PatternMatcherAdvisor implements Advisor {
  readonly name = 'PatternMatcher';

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

As a "PatternMatcher" advisor, identify the industry best practice or standard approach for this task.
Consider robustness, maintainability, and security.

Respond with ONLY a structured JSON proposal:
{
  "approach": "name of approach",
  "reasoning": "why this is considered best practice",
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
      console.warn('PatternMatcherAdvisor: No JSON found in response');
    } catch (error) {
      console.error('PatternMatcherAdvisor Error:', error);
    }

    return {
      approach: 'Standard Practice',
      reasoning: 'Failed to parse pattern matcher proposal.',
      estimatedTime: 'medium',
      requiredDeps: [],
      confidence: 0,
    };
  }
}
