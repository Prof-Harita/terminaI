/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  type CommandContext,
  CommandKind,
  type SlashCommand,
} from './types.js';
import { CommandCategory } from './categories.js';

export const modelCommand: SlashCommand = {
  name: 'model',
  description: 'Opens a dialog to configure the model',
  kind: CommandKind.BUILT_IN,
  visibility: 'core',
  category: CommandCategory.LLM_MODEL,
  autoExecute: true,
  action: async (context: CommandContext) => {
    if (context.services.config) {
      await context.services.config.refreshUserQuota();
    }
    return {
      type: 'dialog',
      dialog: 'model',
    };
  },
};
