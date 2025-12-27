/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ReviewLevel } from '../safety/approval-ladder/types.js';

export interface GuiAutomationConfig {
  minReviewLevel?: ReviewLevel;
  clickMinReviewLevel: ReviewLevel;
  typeMinReviewLevel: ReviewLevel;
  redactTypedTextByDefault: boolean;
  snapshotMaxDepth: number;
  snapshotMaxNodes: number;
  maxActionsPerMinute: number;
}

const DEFAULT_GUI_AUTOMATION_CONFIG: GuiAutomationConfig = {
  minReviewLevel: 'B',
  clickMinReviewLevel: 'B',
  typeMinReviewLevel: 'B',
  redactTypedTextByDefault: true,
  snapshotMaxDepth: 10,
  snapshotMaxNodes: 100,
  maxActionsPerMinute: 60,
};

let runtimeConfig: GuiAutomationConfig = { ...DEFAULT_GUI_AUTOMATION_CONFIG };

function normalizeLevel(level: ReviewLevel | undefined): ReviewLevel | undefined {
  if (!level) return undefined;
  const upper = level.toUpperCase() as ReviewLevel;
  if (upper === 'A' || upper === 'B' || upper === 'C') {
    return upper;
  }
  return undefined;
}

export function configureGuiAutomation(
  overrides?: Partial<GuiAutomationConfig>,
): void {
  runtimeConfig = { ...DEFAULT_GUI_AUTOMATION_CONFIG };

  if (!overrides) {
    return;
  }

  runtimeConfig = {
    ...runtimeConfig,
    ...overrides,
  };

  runtimeConfig.minReviewLevel =
    normalizeLevel(overrides?.minReviewLevel) ?? runtimeConfig.minReviewLevel;
  runtimeConfig.clickMinReviewLevel =
    normalizeLevel(overrides?.clickMinReviewLevel) ??
    runtimeConfig.clickMinReviewLevel;
  runtimeConfig.typeMinReviewLevel =
    normalizeLevel(overrides?.typeMinReviewLevel) ??
    runtimeConfig.typeMinReviewLevel;

  runtimeConfig.snapshotMaxDepth = Math.max(
    1,
    overrides?.snapshotMaxDepth ?? runtimeConfig.snapshotMaxDepth,
  );
  runtimeConfig.snapshotMaxNodes = Math.max(
    1,
    overrides?.snapshotMaxNodes ?? runtimeConfig.snapshotMaxNodes,
  );
  runtimeConfig.maxActionsPerMinute = Math.max(
    1,
    overrides?.maxActionsPerMinute ?? runtimeConfig.maxActionsPerMinute,
  );
}

export function getGuiAutomationConfig(): GuiAutomationConfig {
  return { ...runtimeConfig };
}

export function resetGuiAutomationConfig(): void {
  runtimeConfig = { ...DEFAULT_GUI_AUTOMATION_CONFIG };
}
