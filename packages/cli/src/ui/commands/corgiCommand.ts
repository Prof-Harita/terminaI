/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { CommandKind, type SlashCommand } from './types.js';

export const corgiCommand: SlashCommand = {
  name: 'corgi',
  description: 'Toggles corgi mode',
  hidden: true,
  kind: CommandKind.BUILT_IN,
  autoExecute: true,
  action: (context, _args) => {
    context.ui.toggleCorgiMode();
  },
};
