/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { CommandKind, type SlashCommand } from './types.js';
import { CommandCategory } from './categories.js';

export const thinkCommand: SlashCommand = {
  name: 'think',
  description: 'Toggles Brain Mode (Deep Think vs Fast Act)',
  kind: CommandKind.BUILT_IN,
  visibility: 'core',
  category: CommandCategory.SYSTEM_OPERATOR,
  autoExecute: true,
  action: (context, _args) => {
    const config = context.services.config;
    if (!config) {
      context.ui.addItem(
        {
          type: 'error',
          text: 'Configuration service not available.',
        },
        Date.now(),
      );
      return;
    }
    const enabled = config.toggleBrainFrameworks();
    context.ui.addItem(
      {
        type: 'info',
        text: `Brain Mode: ${enabled ? 'ON (Deep Think)' : 'OFF (Fast Act)'}`,
      },
      Date.now(),
    );
  },
};
