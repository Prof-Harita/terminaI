/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SlashCommand } from './types.js';
import { CommandKind } from './types.js';
import { CommandCategory } from './categories.js';
import { MessageType, type HistoryItemHelp } from '../types.js';

export const helpCommand: SlashCommand = {
  name: 'help',
  altNames: ['?'],
  kind: CommandKind.BUILT_IN,
  description: 'TerminaI command reference',
  visibility: 'core',
  category: CommandCategory.ESSENTIALS,
  autoExecute: true,
  action: async (context, args) => {
    const showAll = args?.trim().toLowerCase() === 'all';
    const helpItem: Omit<HistoryItemHelp, 'id'> = {
      type: MessageType.HELP,
      timestamp: new Date(),
      showAll,
    };

    context.ui.addItem(helpItem, Date.now());
  },
};
