/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs';
import path from 'node:path';
import { glob } from 'glob';

/**
 * CI Risk Checker
 *
 * This script scans for patterns that are known to cause CI failures, specifically:
 * 1. Importing 'ink' or 'yoga-layout' (WASM binaries) in integration tests which can crash CI.
 * 2. Spawning child processes in tests without the 'GEMINI_CLI_NO_RELAUNCH' guard.
 */

const RISKY_PATTERNS = [
  {
    name: 'WASM/UI Import',
    pattern: /from ['"]ink['"]|from ['"]yoga-layout['"]/,
    filePattern: 'packages/cli/src/**/*.test.ts',
    exclude: ['packages/cli/src/ui/**/*', 'packages/cli/src/gemini.test.tsx'], // Allowed in UI tests
    message:
      'Found import of "ink" or "yoga-layout" in a non-UI test. This causes WASM crashes in CI. Mock the module instead.',
  },
  {
    name: 'Unsafe Child Process Spawn',
    pattern: /relaunchAppInChildProcess/,
    filePattern: 'packages/cli/src/**/*.test.tsx?',
    exclude: [],
    requiredContent: /GEMINI_CLI_NO_RELAUNCH/,
    message:
      'Found usage of "relaunchAppInChildProcess" without setting "process.env.GEMINI_CLI_NO_RELAUNCH". This causes CI timeouts.',
  },
];

async function checkRisks() {
  let hasErrors = false;

  for (const risk of RISKY_PATTERNS) {
    const files = await glob(risk.filePattern, {
      ignore: risk.exclude,
      absolute: true,
    });

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf-8');

      if (risk.pattern.test(content)) {
        // If a required content check exists (e.g. must contain "GEMINI_CLI_NO_RELAUNCH" if it has "relaunchApp")
        if (risk.requiredContent && risk.requiredContent.test(content)) {
          continue;
        }

        console.error(`\n[RISK DETECTED] ${risk.name}`);
        console.error(`File: ${path.relative(process.cwd(), file)}`);
        console.error(`Reason: ${risk.message}`);
        hasErrors = true;
      }
    }
  }

  if (hasErrors) {
    process.exit(1);
  }
}

checkRisks().catch((err) => {
  console.error(err);
  process.exit(1);
});
