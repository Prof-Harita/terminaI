/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { useBridgeStore } from '../../bridge/store';
import { useExecutionStore } from '../../stores/executionStore';
import { useHistoryStore } from '../../stores/historyStore';

import type { DesktopCommand, CommandContext } from '../types';

export const HardResetCommand: DesktopCommand = {
  name: 'reset',
  description: 'Factory reset the application state',
  execute: async (_args: string[], context: CommandContext) => {
    // 1. Confirm with user? (For now, immediate execution is safer for unblocking)
    context.ui.appendSystemMessage('Initiating Factory Reset...');

    try {
      // 2. Clear all Persisted Stores
      localStorage.clear();

      // 3. Reset In-Memory Stores (if feasible before reload)
      useBridgeStore.getState().dispatch({ type: 'RESET' });
      useExecutionStore.getState().clearEvents();
      useHistoryStore.getState().clearHistory();

      // 4. Force Reload
      context.ui.appendSystemMessage('Reloading application...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (e) {
      context.ui.appendSystemMessage(`Reset failed: ${String(e)}`);
      console.error('Hard Reset failed', e);
    }
  },
};
