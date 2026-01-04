/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { UiToolBase } from './ui-tool-base.js';
import { UiClickSchema } from '../gui/protocol/schemas.js';
import type { UiClickArgs } from '../gui/protocol/schemas.js';
import type {
  ToolCallConfirmationDetails,
  ToolInvocation,
  ToolResult,
} from './tools.js';
import { BaseToolInvocation, Kind } from './tools.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
import { UI_CLICK_TOOL_NAME } from './tool-names.js';
import { buildUiConfirmationDetails, formatUiResult } from './ui-tool-utils.js';
import { DesktopAutomationService } from '../gui/service/DesktopAutomationService.js';
import type { Config } from '../config/config.js';

import { BrainRiskManager } from '../brain/toolIntegration.js';

class UiClickToolInvocation extends BaseToolInvocation<
  UiClickArgs,
  ToolResult
> {
  private brainManager: BrainRiskManager;

  constructor(
    params: UiClickArgs,
    private readonly config: Config,
    messageBus?: MessageBus,
    toolName?: string,
    toolDisplayName?: string,
  ) {
    super(params, messageBus, toolName, toolDisplayName);
    this.brainManager = new BrainRiskManager(this.config);
  }

  getDescription(): string {
    return `Click on target: ${this.params.target}`;
  }

  protected override async getConfirmationDetails(
    abortSignal: AbortSignal,
  ): Promise<ToolCallConfirmationDetails | false> {
    // Brain integration - always evaluate risk for UI tools as they interact with the system
    const brainAuthority = this.config.getBrainAuthority();
    const request = `UI Click on ${this.params.target}`;

    // Evaluate brain risk for UI automation (consider potentially dangerous actions like "Delete" buttons)
    await this.brainManager.evaluateBrain(
      request,
      this.getDescription(),
      'Desktop UI',
      abortSignal,
    );

    // Get base confirmation details
    const baseDetails = buildUiConfirmationDetails({
      toolName: this._toolName ?? UI_CLICK_TOOL_NAME,
      description: this.getDescription(),
      provenance: this.getProvenance(),
      title: 'Confirm UI Click',
      onConfirm: async (outcome) => {
        await this.publishPolicyUpdate(outcome);
      },
      config: this.config,
    });

    // If no confirmation needed from deterministic rules, we still might escalate via brain
    if (baseDetails === false) {
      // Check if brain authority requires escalation
      if (brainAuthority !== 'advisory') {
        const dummyReview = {
          level: 'A' as const,
          reasons: [],
          requiresClick: false,
          requiresPin: false,
        };
        const escalatedReview = this.brainManager.applyBrainAuthority(
          dummyReview,
          brainAuthority,
        );
        if (escalatedReview.level !== 'A') {
          // Brain escalated - construct confirmation details manually
          return {
            type: 'exec',
            title: 'Confirm UI Click',
            command: this.getDescription(),
            rootCommand: this._toolName ?? UI_CLICK_TOOL_NAME,
            provenance: this.getProvenance(),
            reviewLevel: escalatedReview.level,
            requiresPin: escalatedReview.requiresPin,
            pinLength: escalatedReview.requiresPin ? 6 : undefined,
            explanation: escalatedReview.reasons.join('; '),
            onConfirm: async (outcome) => {
              await this.publishPolicyUpdate(outcome);
            },
          };
        }
      }
      return false;
    }

    // Apply brain authority escalation to existing confirmation details
    if (brainAuthority !== 'advisory') {
      const currentReview = {
        level: baseDetails.reviewLevel ?? ('B' as const),
        reasons: baseDetails.explanation ? [baseDetails.explanation] : [],
        requiresClick: true,
        requiresPin: baseDetails.requiresPin ?? false,
      };
      const escalatedReview = this.brainManager.applyBrainAuthority(
        currentReview,
        brainAuthority,
      );
      baseDetails.reviewLevel = escalatedReview.level;
      baseDetails.requiresPin = escalatedReview.requiresPin;
      baseDetails.pinLength = escalatedReview.requiresPin ? 6 : undefined;
      baseDetails.explanation = escalatedReview.reasons.join('; ');
    }

    return baseDetails;
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const svc = DesktopAutomationService.getInstance();
    const result = await svc.click(this.params);

    // Record outcome
    const outcome = result.status === 'success' ? 'success' : 'failure';
    this.brainManager.recordOutcome(
      this.getDescription(),
      outcome,
      true, // userApproved - if we got here, user approved the action
      outcome === 'failure' ? result.message : undefined,
    );

    const baseResult = formatUiResult(result, 'UiClick');

    const brainPreamble = this.brainManager.formatRiskPreamble();
    if (brainPreamble.text) {
      if (typeof baseResult.llmContent === 'string') {
        baseResult.llmContent = `${brainPreamble.text}\n\n${baseResult.llmContent}`;
      }
    }
    return baseResult;
  }
}

export class UiClickTool extends UiToolBase<UiClickArgs> {
  constructor(config: Config, messageBus?: MessageBus) {
    super(
      UI_CLICK_TOOL_NAME,
      'UI Click',
      'Click an element identified by a selector.',
      Kind.Execute,
      {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            description:
              'Selector string. Examples: name:"Submit", role=button && name="OK", ocr:"Label Text"',
          },
          button: { type: 'string', enum: ['left', 'right', 'middle'] },
          clickCount: { type: 'number' },
          modifiers: { type: 'array', items: { type: 'string' } },
          verify: { type: 'boolean' },
        },
        required: ['target'],
      },
      true,
      false,
      config,
      messageBus,
    );
  }

  override validateToolParams(params: UiClickArgs): string | null {
    const res = UiClickSchema.safeParse(params);
    if (!res.success) return res.error.message;
    return null;
  }

  protected createInvocation(
    params: UiClickArgs,
    messageBus?: MessageBus,
    toolName?: string,
    toolDisplayName?: string,
  ): ToolInvocation<UiClickArgs, ToolResult> {
    return new UiClickToolInvocation(
      params,
      this.config,
      messageBus,
      toolName,
      toolDisplayName,
    );
  }
}
