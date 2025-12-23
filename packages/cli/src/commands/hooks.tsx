/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { CommandModule } from 'yargs';
import { migrateCommand } from './hooks/migrate.js';
import { initializeOutputListenersAndFlush } from '../gemini.js';

export const hooksCommand: CommandModule = {
  command: 'hooks <command>',
  aliases: ['hook'],
  describe: 'Manage terminaI hooks.',
  builder: (yargs) =>
    yargs
      .middleware(() => initializeOutputListenersAndFlush())
      .command(migrateCommand)
      .demandCommand(1, 'You need at least one command before continuing.')
      .version(false),
  handler: () => {
    // This handler is not called when a subcommand is provided.
    // Yargs will show the help menu.
  },
};
