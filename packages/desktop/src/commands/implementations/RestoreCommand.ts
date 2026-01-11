/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { SessionManager } from '../../services/SessionManager';
import type { DesktopCommand, CommandContext } from '../types';

export const RestoreCommand: DesktopCommand = {
  name: 'restore',
  description: 'Restore a previous session context',
  execute: (args: string[], context: CommandContext) => {
    const sessionId = args[0];
    if (!sessionId) {
      context.ui.appendSystemMessage('Error: No session ID provided.');
      return;
    }

    // 1. Resume Session Logic
    SessionManager.resumeSession(sessionId);

    // 2. UI Reset
    context.ui.clearMessages();
    context.ui.focusInput();

    // 3. Feedback
    // Note: Since we can't fully fetch history yet, we warn the user.
    context.ui.appendSystemMessage(`Resumed session: ${sessionId}`);
    context.ui.appendSystemMessage(
      '(Note: Previous message history is not currently loaded from backend)',
    );
  },
};
