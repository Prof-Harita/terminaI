/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { BaseDeclarativeTool } from './tools.js';
import type { ToolResult , Kind } from './tools.js';
import { DesktopAutomationService } from '../gui/service/DesktopAutomationService.js';
import type { UiActionResult } from '../gui/protocol/types.js';
import { formatUiResult } from './ui-tool-utils.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';

import type { Config } from '../config/config.js';

export abstract class UiToolBase<
  TParams extends object,
> extends BaseDeclarativeTool<TParams, ToolResult> {
  protected readonly config: Config;

  constructor(
    name: string,
    displayName: string,
    description: string,
    kind: Kind,
    parameterSchema: Record<string, unknown>,
    isOutputMarkdown: boolean,
    canUpdateOutput: boolean,
    config: Config,
    messageBus?: MessageBus,
  ) {
    super(
      name,
      displayName,
      description,
      kind,
      parameterSchema,
      isOutputMarkdown,
      canUpdateOutput,
      messageBus,
    );
    this.config = config;
  }

  protected get service() {
    return DesktopAutomationService.getInstance();
  }

  /**
   * Standardized result formatting for UI tools.
   * Uses the shared formatUiResult utility for consistency.
   */
  protected formatResult(result: UiActionResult, toolName: string): ToolResult {
    return formatUiResult(result, toolName);
  }
}
