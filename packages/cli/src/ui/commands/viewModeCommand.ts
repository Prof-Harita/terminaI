/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  type SlashCommand,
  CommandKind,
  type CommandContext,
} from './types.js';
import { MessageType } from '../types.js';

export const viewModeCommand: SlashCommand = {
  name: 'view',
  description: 'Switch the view mode (standard, focus, multiplex)',
  kind: CommandKind.BUILT_IN,
  completion: (_context: CommandContext, partialArg: string) => {
    const modes = ['standard', 'focus', 'multiplex'];
    return modes.filter((m) => m.startsWith(partialArg));
  },
  action: ({ ui }: CommandContext, args: string) => {
    const mode = args.trim().toLowerCase();
    if (mode === 'standard' || mode === 'focus' || mode === 'multiplex') {
      ui.setViewMode?.(mode);
      ui.addItem(
        {
          type: MessageType.INFO,
          text: `Switched to ${mode} mode.`,
        },
        Date.now(),
      );
    } else {
      ui.addItem(
        {
          type: MessageType.ERROR,
          text: `Invalid view mode: ${mode}. Available modes: standard, focus, multiplex`,
        },
        Date.now(),
      );
    }
  },
};
