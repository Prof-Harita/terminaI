/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { debugLogger } from '../../utils/debugLogger.js';
import type { SystemSpec } from '../systemSpec.js';
import type { Advisor, AdvisorProposal } from './types.js';
import type { GenerativeModelAdapter } from '../riskAssessor.js';
import { formatSystemSpecForPrompt } from '../systemSpecPrompt.js';

/**
 * Advisor that ranks approaches by robustness and speed.
 */
export class FallbackChainAdvisor implements Advisor {
  readonly name = 'FallbackChain';

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

As a "FallbackChain" advisor, your job is to propose a sequence of approaches, 
starting with the most robust and fastest method. If the primary method fails, 
what is the secondary and tertiary fallback?

Respond with ONLY a structured JSON proposal for the BEST (first) approach in the chain:
{
  "approach": "name of approach",
  "reasoning": "why this is the best starting point and what the fallback is",
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
      debugLogger.warn('FallbackChainAdvisor: No JSON found in response');
    } catch (error) {
      debugLogger.error('FallbackChainAdvisor Error:', error);
    }

    return {
      approach: 'Robust Sequential Attempt',
      reasoning: 'Failed to parse fallback chain proposal.',
      estimatedTime: 'slow',
      requiredDeps: [],
      confidence: 0,
    };
  }
}
