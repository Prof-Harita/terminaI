/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CommandModule } from 'yargs';
import { installCommand } from './voice/install.js';

export const voiceCommand: CommandModule = {
  command: 'voice <command>',
  describe: 'Manage voice capabilities (install, configure)',
  builder: (yargs) =>
    yargs
      .command(installCommand)
      .demandCommand(1, 'You need at least one command before continuing.')
      .version(false),
  handler: () => {
    // Parent command - subcommands handle execution
  },
};
