/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(__dirname, '../dist');
const dest = path.join(__dirname, '../src-tauri/resources/web-ui');

console.log(`Copying Desktop UI from ${src} to ${dest}...`);

if (!fs.existsSync(src)) {
  console.error(
    'Source dist folder does not exist. Run npm run build in packages/desktop first.',
  );
  process.exit(1);
}

if (fs.existsSync(dest)) {
  fs.rmSync(dest, { recursive: true, force: true });
}
fs.mkdirSync(dest, { recursive: true });

fs.cpSync(src, dest, { recursive: true });
console.log('✅ Web UI assets bundled successfully.');
