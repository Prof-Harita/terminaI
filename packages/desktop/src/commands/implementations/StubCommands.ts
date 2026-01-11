/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { DesktopCommand, CommandContext } from '../types';

const createStubCommand = (
  name: string,
  description: string,
): DesktopCommand => ({
  name,
  description,
  execute: async (_args: string[], context: CommandContext) => {
    context.ui.appendSystemMessage(
      `Command '/${name}' is not yet implemented locally.`,
    );
  },
});

export const CheckpointCommand = createStubCommand(
  'checkpoint',
  'Save conversation state',
);
export const TrustCommand = createStubCommand('trust', 'Trust current folder');
export const UntrustCommand = createStubCommand(
  'untrust',
  'Revoke folder trust',
);
export const SessionsCommand = createStubCommand('sessions', 'Manage sessions');
