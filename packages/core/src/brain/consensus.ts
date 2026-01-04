/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { debugLogger } from '../utils/debugLogger.js';
import type { SystemSpec } from './systemSpec.js';
import type { Advisor, AdvisorProposal } from './advisors/types.js';
import { EnumeratorAdvisor } from './advisors/enumerator.js';
import { PatternMatcherAdvisor } from './advisors/patternMatcher.js';
import { DepScannerAdvisor } from './advisors/depScanner.js';
import { FallbackChainAdvisor } from './advisors/fallbackChain.js';
import { CodeGeneratorAdvisor } from './advisors/codeGenerator.js';
import type { GenerativeModelAdapter } from './riskAssessor.js';

const ADVISOR_TIMEOUT_MS = 15000; // 15s timeout per advisor
const EARLY_RETURN_CONFIDENCE = 80; // Return immediately if any advisor hits this

/**
 * Orchestrates the consensus-based approach selection with parallel execution.
 */
export class ConsensusOrchestrator {
  private readonly advisors: Advisor[];

  constructor(model: GenerativeModelAdapter) {
    this.advisors = [
      new EnumeratorAdvisor(model),
      new PatternMatcherAdvisor(model),
      new DepScannerAdvisor(model),
      new FallbackChainAdvisor(model),
      new CodeGeneratorAdvisor(model),
    ];
  }

  /**
   * Runs all advisors in parallel with timeout,
   * returns early if high-confidence result found.
   */
  async selectApproach(
    task: string,
    systemSpec: SystemSpec,
  ): Promise<AdvisorProposal> {
    // Create timeout-wrapped promises for each advisor
    const advisorPromises = this.advisors.map((advisor) =>
      this.withTimeout(
        advisor.propose(task, systemSpec),
        ADVISOR_TIMEOUT_MS,
        advisor.name,
      ),
    );

    // Race for early high-confidence result vs waiting for all
    const earlyResult = await this.raceForHighConfidence(advisorPromises);
    if (earlyResult) {
      debugLogger.debug(
        `[Consensus] Early return from ${earlyResult.approach}`,
      );
      return earlyResult;
    }

    // Wait for all to settle if no early winner
    const results = await Promise.allSettled(advisorPromises);
    const proposals: AdvisorProposal[] = [];

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.confidence > 0) {
        proposals.push(result.value);
      }
    }

    if (proposals.length === 0) {
      return {
        approach: 'Direct execution',
        reasoning: 'No viable advisor proposals received',
        estimatedTime: 'medium',
        requiredDeps: [],
        confidence: 30,
      };
    }

    // Sort by confidence descending, then by speed
    proposals.sort((a, b) => {
      if (b.confidence !== a.confidence) {
        return b.confidence - a.confidence;
      }
      const timeScore = { fast: 3, medium: 2, slow: 1 };
      return timeScore[b.estimatedTime] - timeScore[a.estimatedTime];
    });

    return proposals[0];
  }

  /**
   * Wraps a promise with a timeout.
   */
  private async withTimeout(
    promise: Promise<AdvisorProposal>,
    timeoutMs: number,
    advisorName: string,
  ): Promise<AdvisorProposal> {
    return Promise.race([
      promise,
      new Promise<AdvisorProposal>((_, reject) =>
        setTimeout(
          () =>
            reject(new Error(`${advisorName} timed out after ${timeoutMs}ms`)),
          timeoutMs,
        ),
      ),
    ]);
  }

  /**
   * Races all promises and returns early if any hits high confidence.
   */
  private async raceForHighConfidence(
    promises: Array<Promise<AdvisorProposal>>,
  ): Promise<AdvisorProposal | null> {
    return new Promise((resolve) => {
      let resolved = false;
      let completed = 0;

      for (const promise of promises) {
        promise
          .then((result) => {
            if (!resolved && result.confidence >= EARLY_RETURN_CONFIDENCE) {
              resolved = true;
              resolve(result);
            }
          })
          .catch(() => {})
          .finally(() => {
            completed++;
            if (completed === promises.length && !resolved) {
              resolve(null);
            }
          });
      }
    });
  }
}
