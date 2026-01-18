/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import { execSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const nodeModulesPath = join(root, 'node_modules');
const allowInstall =
  process.env.TERMINAI_BUILD_ALLOW_INSTALL === '1' ||
  process.env.TERMINAI_BUILD_ALLOW_INSTALL === 'true';

const failBuild = (message) => {
  if (process.env.TERMINAI_BUILD_TEST === '1') {
    throw new Error(message);
  }
  console.error(message);
  process.exit(1);
};

// npm install only when explicitly allowed for local dev
if (!existsSync(nodeModulesPath)) {
  const message =
    'Missing node_modules. Run `npm ci` first, or set TERMINAI_BUILD_ALLOW_INSTALL=1 for local dev.';
  if (allowInstall) {
    execSync('npm install', { stdio: 'inherit', cwd: root });
  } else {
    failBuild(message);
  }
}

// build all workspaces/packages
execSync('npm run generate', { stdio: 'inherit', cwd: root });
execSync('npm run build:packages', { stdio: 'inherit', cwd: root });

// Force update timestamp for CLI package to satisfy check-build-status.js
// This creates/updates the timestamp file to "now", preventing stale warnings
// when turbo restores from cache (which restores old timestamps).
try {
  const cliDistDir = join(root, 'packages', 'cli', 'dist');
  if (existsSync(cliDistDir)) {
    writeFileSync(join(cliDistDir, '.last_build'), '');
  }
} catch (e) {
  console.warn('Failed to update CLI build timestamp:', e.message);
}

// also build container image if sandboxing is enabled
// skip (-s) npm install + build since we did that above
try {
  execSync('node scripts/sandbox_command.js -q', {
    stdio: 'inherit',
    cwd: root,
  });
  if (
    process.env.BUILD_SANDBOX === '1' ||
    process.env.BUILD_SANDBOX === 'true'
  ) {
    execSync('node scripts/build_sandbox.js -s', {
      stdio: 'inherit',
      cwd: root,
    });
  }
} catch {
  // ignore
}
