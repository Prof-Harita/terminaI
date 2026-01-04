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
 * Advisor that proposes solving tasks by writing and executing scripts.
 */
export class CodeGeneratorAdvisor implements Advisor {
  readonly name = 'CodeGenerator';

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

As a "CodeGenerator" advisor, evaluate if this task is better solved by writing a 
custom Python or Node.js script rather than chaining multiple shell commands.
This is often true for complex data processing, math, or multi-step logic.

If a script is better, propose "Implement via custom script" as the approach.

Respond with ONLY a structured JSON proposal:
{
  "approach": "name of approach",
  "reasoning": "why a script is (or is not) better for this task",
  "estimatedTime": "fast" | "medium" | "slow",
  "requiredDeps": ["python" | "node"],
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
      debugLogger.warn('CodeGeneratorAdvisor: No JSON found in response');
    } catch (error) {
      debugLogger.error('CodeGeneratorAdvisor Error:', error);
    }

    return {
      approach: 'Direct Tooling',
      reasoning: 'Failed to parse code generator proposal.',
      estimatedTime: 'fast',
      requiredDeps: [],
      confidence: 0,
    };
  }
}
