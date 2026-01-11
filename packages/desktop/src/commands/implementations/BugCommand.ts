/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { DesktopCommand, CommandContext } from '../types';

export const BugCommand: DesktopCommand = {
  name: 'bug',
  description: 'Report an issue',
  execute: async (_args: string[], context: CommandContext) => {
    // Open GitHub issues page
    // Since we are in a desktop context, we might rely on window.open
    // or electron shell if available. For now, window.open is safe.
    window.open(
      'https://github.com/google-deepmind/terminai/issues/new',
      '_blank',
    );
    context.ui.appendSystemMessage('Opened issue tracker in your browser.');
  },
};
