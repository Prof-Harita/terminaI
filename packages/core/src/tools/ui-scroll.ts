/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { UiToolBase } from './ui-tool-base.js';
import { UiScrollSchema } from '../gui/protocol/schemas.js';
import type { UiScrollArgs } from '../gui/protocol/schemas.js';
import type {
  ToolCallConfirmationDetails,
  ToolInvocation,
  ToolResult,
} from './tools.js';
import { BaseToolInvocation, Kind } from './tools.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
import { UI_SCROLL_TOOL_NAME } from './tool-names.js';
import { buildUiConfirmationDetails, formatUiResult } from './ui-tool-utils.js';
import { DesktopAutomationService } from '../gui/service/DesktopAutomationService.js';
import type { Config } from '../config/config.js';

class UiScrollToolInvocation extends BaseToolInvocation<
  UiScrollArgs,
  ToolResult
> {
  constructor(
    params: UiScrollArgs,
    private readonly config: Config,
    messageBus?: MessageBus,
    toolName?: string,
    toolDisplayName?: string,
  ) {
    super(params, messageBus, toolName, toolDisplayName);
  }

  getDescription(): string {
    return `Scroll ${this.params.target || 'active element'} by (${this.params.deltaX}, ${this.params.deltaY})`;
  }

  protected override async getConfirmationDetails(
    _abortSignal: AbortSignal,
  ): Promise<ToolCallConfirmationDetails | false> {
    return buildUiConfirmationDetails({
      toolName: this._toolName ?? UI_SCROLL_TOOL_NAME,
      description: this.getDescription(),
      provenance: this.getProvenance(),
      title: 'Confirm UI Scroll',
      onConfirm: async (outcome) => {
        await this.publishPolicyUpdate(outcome);
      },
      config: this.config,
    });
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const svc = DesktopAutomationService.getInstance();
    const result = await svc.scroll(this.params);
    return formatUiResult(result, 'UiScroll');
  }
}

export class UiScrollTool extends UiToolBase<UiScrollArgs> {
  constructor(config: Config, messageBus?: MessageBus) {
    super(
      UI_SCROLL_TOOL_NAME,
      'UI Scroll',
      'Scroll an element or window.',
      Kind.Execute,
      {
        type: 'object',
        properties: {
          target: { type: 'string' },
          deltaX: { type: 'number' },
          deltaY: { type: 'number' },
          verify: { type: 'boolean' },
        },
      },
      true,
      false,
      config,
      messageBus,
    );
  }

  override validateToolParams(params: UiScrollArgs): string | null {
    const res = UiScrollSchema.safeParse(params);
    if (!res.success) return res.error.message;
    return null;
  }

  protected createInvocation(
    params: UiScrollArgs,
    messageBus?: MessageBus,
    toolName?: string,
    toolDisplayName?: string,
  ): ToolInvocation<UiScrollArgs, ToolResult> {
    return new UiScrollToolInvocation(
      params,
      this.config,
      messageBus,
      toolName,
      toolDisplayName,
    );
  }
}
