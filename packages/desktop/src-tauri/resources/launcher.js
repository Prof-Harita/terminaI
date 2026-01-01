/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';
const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL } = require('node:url');

(async () => {
  // Strategy: The binary (process.execPath) is the entry point.
  // We look for the ESM bundle relative to the binary.
  // When bundled in Tauri, resources are typically in specific locations.

  const execDir = path.dirname(process.execPath);

  const candidates = [
    // 1. Same directory (simplest, sidecar and mjs sibling)
    path.join(execDir, 'terminai_cli.mjs'),
    // 2. Tauri resources directory (std linux/windows structure often puts resources in ../resources or ./resources)
    path.join(execDir, 'resources', 'terminai_cli.mjs'),
    path.join(execDir, '../resources', 'terminai_cli.mjs'), // macOS typical
    // 3. Current Working Directory (fallback for manual testing)
    path.join(process.cwd(), 'terminai_cli.mjs'),
    // 4. Hardcoded development path fallback (if running from repo root)
    path.join(
      process.cwd(),
      'packages/desktop/src-tauri/resources/terminai_cli.mjs',
    ),
  ];

  let target = null;
  // Debug log to stdout (might interfere with strict json output, so be careful or use stderr)
  // console.error('[SEA Launcher] Searching for bundle...');

  for (const c of candidates) {
    if (fs.existsSync(c)) {
      target = c;
      // console.error(`[SEA Launcher] Found bundle at: ${target}`);
      break;
    }
  }

  if (!target) {
    console.error(
      '[SEA Launcher] CRITICAL: Could not find terminai_cli.mjs. Searched:',
      candidates,
    );
    process.exit(1);
  }

  try {
    // Dynamic import to load the ESM module
    await import(pathToFileURL(target));
  } catch (e) {
    console.error('[SEA Launcher] Failed to load CLI module:', e);
    process.exit(1);
  }
})();
