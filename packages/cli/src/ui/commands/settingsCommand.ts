/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { OpenDialogActionReturn, SlashCommand } from './types.js';
import { CommandKind } from './types.js';
import { CommandCategory } from './categories.js';

export const settingsCommand: SlashCommand = {
  name: 'settings',
  description: 'View and edit TerminaI settings',
  kind: CommandKind.BUILT_IN,
  visibility: 'core',
  category: CommandCategory.ESSENTIALS,
  autoExecute: true,
  action: (_context, _args): OpenDialogActionReturn => ({
    type: 'dialog',
    dialog: 'settings',
  }),
};
