/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Command categories for grouping in /help display.
 * Order matters - this is the display order in the help output.
 */
export const CommandCategory = {
  ESSENTIALS: 'Essentials',
  LLM_MODEL: 'LLM + Model',
  SESSIONS: 'Sessions + Workspace',
  CAPABILITIES: 'Capabilities',
  SYSTEM_OPERATOR: 'System Operator',
} as const;

export type CommandCategoryType =
  (typeof CommandCategory)[keyof typeof CommandCategory];

/**
 * Order for displaying categories in /help.
 * Categories are displayed in two columns.
 */
export const CATEGORY_ORDER: CommandCategoryType[] = [
  CommandCategory.ESSENTIALS,
  CommandCategory.LLM_MODEL,
  CommandCategory.SESSIONS,
  CommandCategory.CAPABILITIES,
  CommandCategory.SYSTEM_OPERATOR,
];

/**
 * Left column categories in /help two-column layout.
 */
export const LEFT_COLUMN_CATEGORIES: CommandCategoryType[] = [
  CommandCategory.ESSENTIALS,
  CommandCategory.LLM_MODEL,
  CommandCategory.SESSIONS,
];

/**
 * Right column categories in /help two-column layout.
 */
export const RIGHT_COLUMN_CATEGORIES: CommandCategoryType[] = [
  CommandCategory.CAPABILITIES,
  CommandCategory.SYSTEM_OPERATOR,
];
