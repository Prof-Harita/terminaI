/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { UiToolBase } from './ui-tool-base.js';
import { UiClickXySchema } from '../gui/protocol/schemas.js';
import type { UiClickXyArgs } from '../gui/protocol/schemas.js';
import type { ToolResult, ToolInvocation } from './tools.js';
import { BaseToolInvocation, Kind } from './tools.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
import { UI_CLICK_XY_TOOL_NAME } from './tool-names.js';
import { formatUiResult } from './ui-tool-utils.js';
import { DesktopAutomationService } from '../gui/service/DesktopAutomationService.js';

class UiClickXyToolInvocation extends BaseToolInvocation<
  UiClickXyArgs,
  ToolResult
> {
  constructor(
    params: UiClickXyArgs,
    messageBus?: MessageBus,
    toolName?: string,
    toolDisplayName?: string,
  ) {
    super(params, messageBus, toolName, toolDisplayName);
  }

  getDescription(): string {
    return `Clicking at (${this.params.x}, ${this.params.y})`;
  }

  async execute(): Promise<ToolResult> {
    const svc = DesktopAutomationService.getInstance();
    const result = await svc.clickXy(this.params);
    return formatUiResult(result, 'UiClickXy');
  }
}

export class UiClickXyTool extends UiToolBase<UiClickXyArgs> {
  constructor(messageBus?: MessageBus) {
    super(
      UI_CLICK_XY_TOOL_NAME,
      'UI Click XY',
      'Click at specific coordinates.',
      Kind.Execute,
      {
        type: 'object',
        properties: {
          x: { type: 'number' },
          y: { type: 'number' },
          coordinateSpace: { type: 'string', enum: ['screen', 'window'] },
          button: { type: 'string', enum: ['left', 'right', 'middle'] },
          clickCount: { type: 'number' },
          verify: { type: 'boolean' },
        },
        required: ['x', 'y'],
      },
      true,
      false,
      messageBus,
    );
  }

  override validateToolParams(params: UiClickXyArgs): string | null {
    const res = UiClickXySchema.safeParse(params);
    if (!res.success) return res.error.message;
    return null;
  }

  protected createInvocation(
    params: UiClickXyArgs,
    messageBus?: MessageBus,
    toolName?: string,
    toolDisplayName?: string,
  ): ToolInvocation<UiClickXyArgs, ToolResult> {
    return new UiClickXyToolInvocation(
      params,
      messageBus,
      toolName,
      toolDisplayName,
    );
  }
}
