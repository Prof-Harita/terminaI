/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Config } from '../config/config.js';
import type { BrainAuthority } from '../config/brainAuthority.js';
import { debugLogger } from '../utils/debugLogger.js';
import { getErrorMessage } from '../utils/errors.js';
import { getResponseText } from '../utils/partUtils.js';
import { coreEvents, CoreEvent } from '../utils/events.js';
import {
  assessRisk,
  handleConfidence,
  logOutcome,
  routeExecution,
  type ConfidenceAction,
  type ExecutionDecision,
  type RiskAssessment,
  type GenerativeModelAdapter,
} from './index.js';
import type {
  DeterministicReviewResult,
  ReviewLevel,
} from '../safety/approval-ladder/types.js';

export interface BrainContext {
  assessment: RiskAssessment;
  decision: ExecutionDecision;
  confidenceAction: ConfidenceAction;
  request: string;
}

export class BrainRiskManager {
  private brainContext: BrainContext | null = null;

  constructor(private readonly config: Config) {}

  /**
   * Builds a generative model adapter from the config.
   */
  buildGenerativeModelAdapter(): GenerativeModelAdapter | null {
    try {
      if (
        typeof (this.config as unknown as { getBaseLlmClient?: unknown })
          .getBaseLlmClient !== 'function'
      ) {
        return null;
      }

      const baseLlm = this.config.getBaseLlmClient();
      const defaultAbortController = new AbortController();

      return {
        generateContent: async (
          prompt: string,
          options?: { abortSignal?: AbortSignal; tier?: 'flash' | 'pro' },
        ) => {
          // Always use the configured active model for provider-agnostic operation.
          // The tier hint is currently ignored; a future enhancement could add
          // a provider-specific tier resolution strategy (e.g., config.getModelForTier).
          const modelName = this.config.getActiveModel();

          const modelConfigKey = { model: modelName };
          const response = await baseLlm.generateContent({
            modelConfigKey,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            abortSignal: options?.abortSignal ?? defaultAbortController.signal,
            promptId: this.config.getSessionId(),
          });

          const text = getResponseText(response) ?? '';
          return {
            response: {
              text: () => text,
            },
          } as unknown as { response: { text: () => string } };
        },
      };
    } catch (error) {
      debugLogger.error(
        `Failed to build LLM adapter for risk assessment: ${getErrorMessage(error)}`,
      );
      return null;
    }
  }

  /**
   * Evaluates the risk of a command or action using the brain.
   */
  async evaluateBrain(
    request: string,
    commandOrAction: string,
    systemContext: string,
    abortSignal?: AbortSignal,
  ): Promise<BrainContext | null> {
    if (this.brainContext) {
      return this.brainContext;
    }

    const model = this.buildGenerativeModelAdapter();

    try {
      const assessment = await assessRisk(
        request,
        commandOrAction,
        systemContext,
        model ?? undefined,
        { abortSignal },
      );
      const decision = routeExecution(assessment);
      const confidenceAction = handleConfidence(
        assessment.dimensions.confidence,
        request,
      );

      coreEvents.emit(CoreEvent.Thought, {
        frameworkId: 'risk-assessment',
        reasoning: assessment.reasoning,
        task: request,
        approach: assessment.suggestedStrategy,
        confidence: assessment.dimensions.confidence,
        explanation: `Risk: ${assessment.overallRisk}. Environment: ${assessment.dimensions.environment}`,
        suggestedAction: decision.requiresConfirmation ? 'confirm' : 'execute',
      });

      this.brainContext = { assessment, decision, confidenceAction, request };
      return this.brainContext;
    } catch (error) {
      debugLogger.error(
        `Failed to run risk assessment: ${getErrorMessage(error)}`,
      );
      return null;
    }
  }

  /**
   * Applies brain authority to escalate the review level if necessary.
   */
  applyBrainAuthority(
    review: DeterministicReviewResult,
    authority: BrainAuthority,
  ): DeterministicReviewResult {
    if (!this.brainContext) {
      return review;
    }

    const requiredLevel = this.getBrainReviewLevel(
      authority,
      this.brainContext,
    );
    if (!requiredLevel) {
      return review;
    }

    if (this.isReviewLevelAtLeast(review.level, requiredLevel)) {
      return review;
    }

    const nextReasons = [
      ...review.reasons,
      `Brain risk assessment marked this as ${this.brainContext.assessment.overallRisk}; require ${requiredLevel} review.`,
    ];

    return {
      level: requiredLevel,
      reasons: nextReasons,
      requiresClick: requiredLevel !== 'A',
      requiresPin: requiredLevel === 'C',
    };
  }

  private getBrainReviewLevel(
    authority: BrainAuthority,
    brainContext: BrainContext,
  ): ReviewLevel | undefined {
    const risk = brainContext.assessment.overallRisk;

    if (authority === 'advisory') {
      return undefined;
    }

    if (authority === 'escalate-only') {
      if (!brainContext.decision.requiresConfirmation) {
        return undefined;
      }
      return risk === 'critical' ? 'C' : 'B';
    }

    if (risk === 'critical') {
      return 'C';
    }
    if (risk === 'elevated' || risk === 'normal') {
      return 'B';
    }

    return undefined;
  }

  private isReviewLevelAtLeast(
    current: ReviewLevel,
    required: ReviewLevel,
  ): boolean {
    const rank: Record<ReviewLevel, number> = { A: 0, B: 1, C: 2 };
    return rank[current] >= rank[required];
  }

  /**
   * Formats a risk preamble to be displayed to the user or LLM.
   */
  formatRiskPreamble(): {
    text: string;
    surfaceToUser: boolean;
  } {
    if (!this.brainContext) {
      return { text: '', surfaceToUser: false };
    }

    const { assessment, decision, confidenceAction } = this.brainContext;
    const lines = [
      `Risk: ${assessment.overallRisk} (${assessment.reasoning})`,
      `Environment: ${assessment.dimensions.environment}`,
      `Suggested strategy: ${assessment.suggestedStrategy}`,
    ];

    if (decision.shouldWarn && decision.warningMessage) {
      lines.push(decision.warningMessage);
    }

    if (confidenceAction.type === 'narrate-uncertainty') {
      if (confidenceAction.message) {
        lines.push(confidenceAction.message);
      }
    }

    if (confidenceAction.type === 'diagnostic-first') {
      if (confidenceAction.message) {
        lines.push(confidenceAction.message);
      }
      if (confidenceAction.diagnosticCommand) {
        lines.push(`Diagnostic: ${confidenceAction.diagnosticCommand}`);
      }
    }

    if (confidenceAction.type === 'ask-clarification') {
      if (confidenceAction.clarificationQuestion) {
        lines.push(confidenceAction.clarificationQuestion);
      }
    }

    const surfaceToUser =
      decision.shouldWarn ||
      assessment.overallRisk !== 'trivial' ||
      confidenceAction.type !== 'proceed';
    return { text: lines.filter(Boolean).join('\n'), surfaceToUser };
  }

  /**
   * Records the outcome of the action for future learning.
   * @param commandOrAction - The command or action that was executed
   * @param outcome - The outcome of the execution
   * @param userApproved - Whether the user approved the action (false if cancelled/rejected)
   * @param errorMessage - Optional error message if outcome is failure
   */
  recordOutcome(
    commandOrAction: string,
    outcome: 'success' | 'failure' | 'cancelled',
    userApproved = outcome !== 'cancelled',
    errorMessage?: string,
  ): void {
    if (!this.brainContext) {
      return;
    }

    try {
      logOutcome({
        timestamp: new Date().toISOString(),
        request: this.brainContext.request,
        command: commandOrAction,
        assessedRisk: this.brainContext.assessment.overallRisk,
        actualOutcome: outcome,
        userApproved,
        errorMessage,
      });
    } catch (error) {
      debugLogger.error(`Failed to log outcome: ${getErrorMessage(error)}`);
    }
  }

  getBrainContext(): BrainContext | null {
    return this.brainContext;
  }
}
