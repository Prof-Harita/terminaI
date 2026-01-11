/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { DesktopCommand, CommandContext } from '../types';
import { SessionManager } from '../../services/SessionManager';

export const ClearCommand: DesktopCommand = {
  name: 'clear',
  description: 'Clears the current session and chat history',
  execute: (_args: string[], context: CommandContext) => {
    // 1. Reset Session Logic (Bridge + Execution Store)
    SessionManager.startNewSession();

    // 2. UI Reset
    context.ui.clearMessages();
    context.ui.focusInput();

    // 3. Feedback
    context.ui.appendSystemMessage('Session cleared. Starting fresh context.');
  },
};
