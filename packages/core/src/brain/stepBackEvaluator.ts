/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ConsensusOrchestrator } from './consensus.js';
import type { SystemSpec } from './systemSpec.js';
import type { AdvisorProposal } from './advisors/types.js';

/**
 * Evaluates failures and triggers step-back logic.
 */
export class StepBackEvaluator {
  private static readonly MAX_FAILURES = 2;

  /**
   * Determines if a step-back is required based on failure count.
   * @param failureCount Current consecutive failures
   * @returns True if step-back should be triggered
   */
  shouldStepBack(failureCount: number): boolean {
    return failureCount >= StepBackEvaluator.MAX_FAILURES;
  }

  /**
   * Logic to handle the step-back by re-routing to the orchestrator.
   * @param task The user task
   * @param failedApproach The approach that failed
   * @param orchestrator The consensus orchestrator to pick a new approach
   * @param systemSpec Current system spec
   * @returns A new advisor proposal
   */
  async handleStepBack(
    task: string,
    failedApproach: string,
    orchestrator: ConsensusOrchestrator,
    systemSpec: SystemSpec,
  ): Promise<AdvisorProposal> {
    console.log(
      `Approach "${failedApproach}" failed twice. Re-evaluating strategy...`,
    );

    // In a more advanced implementation, we could blacklist the failed approach
    // or pass it as "failed" to the orchestrator to avoid loops.
    return orchestrator.selectApproach(task, systemSpec);
  }
}
