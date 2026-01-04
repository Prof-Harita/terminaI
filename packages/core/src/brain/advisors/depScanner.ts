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
 * Advisor that filters approaches based on system capabilities and task context.
 */
export class DepScannerAdvisor implements Advisor {
  readonly name = 'DepScanner';

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

As a "DepScanner" advisor, analyze the task and the system specification. 
Determine the most efficient approach that leverages available system binaries and runtimes.
If a required dependency is missing, identify it.

Respond with ONLY a structured JSON proposal:
{
  "approach": "name of approach leveraging available tools",
  "reasoning": "why this is the best approach given the system state",
  "estimatedTime": "fast" | "medium" | "slow",
  "requiredDeps": ["dependency1", "dependency2"],
  "confidence": 0-100
}
    `;

    try {
      // Task 3.2: Timeout/Abort signal
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await this.model.generateContent(prompt, {
        abortSignal: controller.signal,
        tier: 'flash',
      });
      clearTimeout(timeoutId);

      const text = response.response.text();
      // Task 3.4: Better JSON parsing & error logging
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      debugLogger.warn('DepScannerAdvisor: No JSON found in response');
    } catch (error) {
      debugLogger.error('DepScannerAdvisor Error:', error);
    }

    // Heuristic fallback if LLM or parsing fails
    const binaries = Object.keys(systemSpec.binaries);
    let approach = 'Use available system tools';
    const deps: string[] = [];

    if (binaries.includes('google-chrome')) {
      approach = 'Use Chrome for automation/rendering';
      deps.push('google-chrome');
    }

    return {
      approach,
      reasoning: 'Fallback heuristic used due to scanner failure.',
      estimatedTime: 'fast',
      requiredDeps: deps,
      confidence: 50,
    };
  }
}
