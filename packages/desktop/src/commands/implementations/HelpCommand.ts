/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { DesktopCommand, CommandContext } from '../types';

export const HelpCommand: DesktopCommand = {
  name: 'help',
  description: 'Show available commands',
  execute: async (_args: string[], context: CommandContext) => {
    const helpText = `
**Available Commands:**

- **/clear**: Clear chat history and start a new session.
- **/reset**: Factory reset the application (Use if stuck).
- **/restore <id>**: Restore a previous session.
- **/checkpoint**: Save conversation state (Not implemented).
- **/trust**: Trust current folder (Not implemented).
- **/untrust**: Revoke folder trust (Not implemented).
- **/sessions**: Manage sessions (Not implemented).
- **/bug**: Report an issue.
- **/help**: Show this help message.
    `.trim();

    context.ui.appendSystemMessage(helpText);
  },
};
