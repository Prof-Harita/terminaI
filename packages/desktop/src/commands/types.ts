/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { type BridgeState, type BridgeAction } from '../bridge/types';

// Helper type for dispatch since we don't import the store hook directly here
type BridgeDispatch = (action: BridgeAction) => void;

export interface CommandContext {
  dispatch: BridgeDispatch;
  store: BridgeState;
  ui: {
    clearMessages: () => void;
    focusInput: () => void;
    /**
     * Appends a local system message to the chat view.
     * Essential for command feedback (e.g., "Session cleared", "Help text").
     */
    appendSystemMessage: (text: string) => void;
  };
}

export interface DesktopCommand {
  name: string; // e.g., 'clear'
  description: string;
  execute: (args: string[], context: CommandContext) => Promise<void> | void;
}
