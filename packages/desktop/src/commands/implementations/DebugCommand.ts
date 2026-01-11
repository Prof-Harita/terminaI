/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useBridgeStore } from '../../bridge/store';
import type { DesktopCommand, CommandContext } from '../types';

export const DebugCommand: DesktopCommand = {
  name: 'debug',
  description: 'Toggle debug info',
  execute: async (_args: string[], context: CommandContext) => {
    const bridgeState = useBridgeStore.getState().state;
    const info = JSON.stringify(bridgeState, null, 2);
    context.ui.appendSystemMessage(
      `**Bridge State:**\n\`\`\`json\n${info}\n\`\`\``,
    );
  },
};
