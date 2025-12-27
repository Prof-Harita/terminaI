/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Config } from '../config/config.js';
import {
  selectFrameworkHeuristic,
  selectFrameworkWithLLM,
} from './frameworkSelector.js';
import { ConsensusOrchestrator } from './consensus.js';
import { SequentialThinking } from './sequentialThinking.js';
import { ReflectiveCritique } from './reflectiveCritique.js';
import { CodeThinker } from './codeThinker.js';
import { PACLoop } from './pacLoop.js';
import { StepBackEvaluator } from './stepBackEvaluator.js';
import type { GenerativeModelAdapter } from './riskAssessor.js';
import { loadSystemSpec } from './systemSpec.js';
import type { Logger } from '../core/logger.js';
import type { ToolCallRequestInfo } from '../core/turn.js';
import { REPL_TOOL_NAME } from '../tools/tool-names.js';

/**
 * Result of a brain execution attempt.
 */
export interface BrainExecutionPlan {
  frameworkId: string;
  approach: string;
  reasoning: string;
  suggestedAction:
    | 'execute_tool'
    | 'inject_prompt'
    | 'fallback_to_direct'
    | 'done';
  explanation: string;
  // Metadata for the CLI to use
  confidence: number;
  toolCall?: Pick<ToolCallRequestInfo, 'name' | 'args'>;
}

/**
 * Orchestrates the execution of different thinking frameworks.
 */
export class ThinkingOrchestrator {
  private readonly consensus: ConsensusOrchestrator;
  private readonly sequential: SequentialThinking;
  private readonly reflective: ReflectiveCritique;
  private readonly scripted: CodeThinker;
  private readonly pacLoop: PACLoop;
  private readonly stepBack: StepBackEvaluator;

  constructor(
    private readonly config: Config,
    private readonly model: GenerativeModelAdapter,
    private readonly logger?: Logger,
  ) {
    this.consensus = new ConsensusOrchestrator(model);
    this.sequential = new SequentialThinking(model);
    this.reflective = new ReflectiveCritique(model);
    this.scripted = new CodeThinker(model);
    this.pacLoop = new PACLoop(model);
    this.stepBack = new StepBackEvaluator();
  }

  /**
   * Executes a task using the most appropriate thinking framework.
   * @param task Original user task
   * @param _signal Abort signal
   * @returns Structured execution plan
   */
  async executeTask(
    task: string,
    _signal: AbortSignal,
  ): Promise<BrainExecutionPlan> {
    const systemSpec = loadSystemSpec();
    if (!systemSpec) {
      throw new Error('System spec not initialized. Run initialization first.');
    }

    // Phase 3: Use Flash for selection
    let selection = selectFrameworkHeuristic(task);
    if (!selection) {
      selection = await selectFrameworkWithLLM(task, this.model, {
        tier: 'flash',
      });
    }

    const frameworkId = selection?.frameworkId || 'FW_DIRECT';

    if (this.config.getDebugMode()) {
      console.log(
        `[Thinking] Selected framework: ${frameworkId} (${selection?.reasoning || 'Default'})`,
      );
    }

    await this.logger?.logEventFull('thought', {
      frameworkId,
      reasoning: selection?.reasoning || 'Default Selection',
      task,
    });

    switch (frameworkId) {
      case 'FW_CONSENSUS': {
        // Advisors use flash by default in their implementation (needs update)
        const proposal = await this.consensus.selectApproach(task, systemSpec);
        return {
          frameworkId,
          approach: proposal.approach,
          reasoning: proposal.reasoning,
          suggestedAction: 'inject_prompt',
          explanation: `Consensus framework selected approach: ${proposal.approach}`,
          confidence: proposal.confidence,
        };
      }

      case 'FW_SEQUENTIAL': {
        const step = await this.sequential.nextStep(task, []);
        return {
          frameworkId,
          approach: step.test,
          reasoning: step.hypothesis,
          suggestedAction: 'execute_tool',
          explanation: `Sequential thinking hypothesis: ${step.hypothesis}`,
          confidence: 70,
        };
      }

      case 'FW_REFLECT': {
        // Reflect uses Pro for critique (update needed)
        const { solution, critique } =
          await this.reflective.generateAndCritique(task);
        return {
          frameworkId,
          approach: 'Refine solution',
          reasoning: critique,
          suggestedAction: 'inject_prompt',
          explanation: `Reflective critique: ${critique}\nInitial solution: ${solution}`,
          confidence: 85,
        };
      }

      case 'FW_SCRIPT': {
        const result = await this.scripted.solve(task);
        if (!result) {
          return {
            frameworkId,
            approach: 'Direct',
            reasoning: 'Code Thinker failed to produce an executable script.',
            suggestedAction: 'fallback_to_direct',
            explanation: 'Falling back to standard tool execution path.',
            confidence: 50,
          };
        }
        return {
          frameworkId,
          approach: result.explanation || 'Code execution',
          reasoning: 'Task complex enough for scripted solution',
          suggestedAction: 'execute_tool',
          explanation: result.explanation,
          confidence: 90,
          toolCall: {
            name: REPL_TOOL_NAME,
            args: {
              language: result.language,
              code: result.code,
            },
          },
        };
      }

      case 'FW_DIRECT':
      default:
        return {
          frameworkId: 'FW_DIRECT',
          approach: 'Direct',
          reasoning: 'Trivial or directly mappable task',
          suggestedAction: 'fallback_to_direct',
          explanation: 'Standard tool execution path.',
          confidence: 100,
        };
    }
  }

  // Exposed for PAC loop and StepBack usage in the future
  getPACLoop() {
    return this.pacLoop;
  }
  getStepBack() {
    return this.stepBack;
  }
}
