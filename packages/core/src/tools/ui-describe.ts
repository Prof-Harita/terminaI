/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { UiToolBase } from './ui-tool-base.js';
import { UiDescribeSchema } from '../gui/protocol/schemas.js';
import type { UiDescribeArgs } from '../gui/protocol/schemas.js';
import type { ToolResult, ToolInvocation } from './tools.js';
import { BaseToolInvocation, Kind } from './tools.js';
import type { MessageBus } from '../confirmation-bus/message-bus.js';
import { UI_DESCRIBE_TOOL_NAME } from './tool-names.js';
import { formatUiResult } from './ui-tool-utils.js';
import { DesktopAutomationService } from '../gui/service/DesktopAutomationService.js';
import type { ElementNode } from '../gui/protocol/types.js';
import type { Config } from '../config/config.js';

class UiDescribeToolInvocation extends BaseToolInvocation<
  UiDescribeArgs,
  ToolResult
> {
  constructor(
    params: UiDescribeArgs,
    messageBus?: MessageBus,
    toolName?: string,
    toolDisplayName?: string,
  ) {
    super(params, messageBus, toolName, toolDisplayName);
  }

  getDescription(): string {
    return `Describe element: ${this.params.target}`;
  }

  async execute(_signal: AbortSignal): Promise<ToolResult> {
    const svc = DesktopAutomationService.getInstance();

    // Get snapshot and resolve selector
    const queryResult = await svc.query({
      selector: this.params.target,
      limit: 1,
    });

    if (queryResult.status === 'error' || !queryResult.data) {
      return formatUiResult(queryResult, 'UiDescribe');
    }

    const matches = queryResult.data as Array<{
      element: ElementNode;
      confidence: number;
    }>;

    if (matches.length === 0) {
      return formatUiResult(
        {
          ...queryResult,
          status: 'error',
          message: `No element found matching: ${this.params.target}`,
        },
        'UiDescribe',
      );
    }

    const element = matches[0].element;

    // Build richer describe output with ancestry, all states, and platform IDs
    const describeData = {
      // Core identification
      id: element.id,
      role: element.role,
      name: element.name ?? null,
      value: element.value ?? null,

      // Position and size
      bounds: element.bounds ?? null,

      // States (expanded view)
      states: {
        enabled: element.states?.enabled ?? null,
        focused: element.states?.focused ?? null,
        checked: element.states?.checked ?? null,
        selected: element.states?.selected ?? null,
        expanded: element.states?.expanded ?? null,
      },

      // Platform-specific identifiers for robust automation
      platformIds: {
        automationId: element.platformIds?.automationId ?? null,
        runtimeId: element.platformIds?.runtimeId ?? null,
        legacyId: element.platformIds?.legacyId ?? null,
        atspiPath: element.platformIds?.atspiPath ?? null,
        axId: element.platformIds?.axId ?? null,
        sapId: element.platformIds?.sapId ?? null,
      },

      // UIA patterns (if available)
      patterns: element.patterns ?? null,

      // Child count for understanding element complexity
      childCount: element.children?.length ?? 0,

      // Confidence from selector match
      confidence: matches[0].confidence,

      // Suggested selectors for automation
      suggestedSelectors: buildSuggestedSelectors(element),
    };

    return formatUiResult(
      {
        status: 'success',
        driver: queryResult.driver,
        data: describeData,
      },
      'UiDescribe',
    );
  }
}

/**
 * Build suggested selectors based on available platform IDs and attributes.
 * Ordered by stability/reliability.
 */
function buildSuggestedSelectors(element: ElementNode): string[] {
  const selectors: string[] = [];

  // Most stable: platform-specific IDs
  if (element.platformIds?.automationId) {
    selectors.push(`uia:automationId="${element.platformIds.automationId}"`);
  }
  if (element.platformIds?.atspiPath) {
    selectors.push(`atspi:atspiPath="${element.platformIds.atspiPath}"`);
  }
  if (element.platformIds?.legacyId) {
    selectors.push(`win32:legacyId=${element.platformIds.legacyId}`);
  }

  // Role + name combination
  if (element.name) {
    selectors.push(`role=${element.role} && name="${element.name}"`);
  } else {
    selectors.push(`role=${element.role}`);
  }

  return selectors;
}

export class UiDescribeTool extends UiToolBase<UiDescribeArgs> {
  constructor(config: Config, messageBus?: MessageBus) {
    super(
      UI_DESCRIBE_TOOL_NAME,
      'UI Describe',
      'Get detailed information about a UI element found by selector or ID.',
      Kind.Read,
      {
        type: 'object',
        properties: {
          target: {
            type: 'string',
            description: 'Selector or Element Reference',
          },
        },
        required: ['target'],
      },
      true,
      false,
      config,
      messageBus,
    );
  }

  override validateToolParams(params: UiDescribeArgs): string | null {
    const res = UiDescribeSchema.safeParse(params);
    if (!res.success) return res.error.message;
    return null;
  }

  protected createInvocation(
    params: UiDescribeArgs,
    messageBus?: MessageBus,
    toolName?: string,
    toolDisplayName?: string,
  ): ToolInvocation<UiDescribeArgs, ToolResult> {
    return new UiDescribeToolInvocation(
      params,
      messageBus,
      toolName,
      toolDisplayName,
    );
  }
}
