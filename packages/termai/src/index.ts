#!/usr/bin/env node

/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const systemPath = join(__dirname, 'system.md');

if (!process.env['GEMINI_SYSTEM_MD']) {
  process.env['GEMINI_SYSTEM_MD'] = systemPath;
}

// Disable CLI auto-relaunch to fix startup hang in wrapper mode
process.env['GEMINI_CLI_NO_RELAUNCH'] = 'true';

const require = createRequire(import.meta.url);
const cliEntry = require.resolve('@google/gemini-cli/dist/index.js');

await import(cliEntry);
