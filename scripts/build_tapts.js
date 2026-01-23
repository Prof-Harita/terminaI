/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

const argv = yargs(hideBin(process.argv))
  .option('skip-tapts', {
    type: 'boolean',
    default: false,
    description: 'Skip building the T-APTS wheel',
  })
  .option('require-tapts', {
    type: 'boolean',
    default: false,
    description: 'Fail if the T-APTS wheel cannot be built',
  })
  .parse();

const skipTapts =
  argv['skip-tapts'] ||
  process.env.TERMINAI_SKIP_TAPTS === '1' ||
  process.env.TERMINAI_SKIP_TAPTS === 'true';
const requireTapts =
  argv['require-tapts'] ||
  process.env.TERMINAI_REQUIRE_TAPTS === '1' ||
  process.env.TERMINAI_REQUIRE_TAPTS === 'true';

if (skipTapts) {
  console.log('Skipping T-APTS wheel build (skip-tapts enabled).');
  process.exit(0);
}

const repoRoot = join(process.cwd(), '..', '..');
const taptsDir = join(repoRoot, 'packages', 'sandbox-image', 'python');
const outDir = join(repoRoot, 'packages', 'cli', 'dist');

if (!existsSync(taptsDir)) {
  const message = `T-APTS source directory not found at ${taptsDir}`;
  if (requireTapts) {
    console.error(message);
    process.exit(1);
  }
  console.warn(`Skipping T-APTS wheel build: ${message}`);
  process.exit(0);
}

if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

const venvDir = join(taptsDir, '.venv');
const venvPython = join(venvDir, 'bin', 'python3');

// 1. Ensure venv exists
if (!existsSync(venvDir)) {
  console.log(`Creating venv at ${venvDir}...`);
  try {
    execSync(`python3 -m venv "${venvDir}"`, { stdio: 'inherit' });
  } catch {
    if (requireTapts) {
      console.error('Failed to create venv');
      process.exit(1);
    }
    console.warn('Skipping T-APTS build: Failed to create venv');
    process.exit(0);
  }
}

// 2. Ensure build tool is installed
try {
  execSync(`"${venvPython}" -m pip install build`, { stdio: 'ignore' });
} catch {
  if (requireTapts) {
    console.error('Failed to install build tool in venv');
    process.exit(1);
  }
  console.warn('Skipping T-APTS build: Failed to install build tool');
  process.exit(0);
}

// 3. Build the wheel
try {
  console.log('Building T-APTS wheel...');
  // Ensure output dir exists
  if (!existsSync(outDir)) {
    mkdirSync(outDir, { recursive: true });
  }

  execSync(`"${venvPython}" -m build --wheel --outdir "${outDir}"`, {
    stdio: 'inherit',
    cwd: taptsDir,
  });
  console.log(`T-APTS wheel built successfully in ${outDir}`);
} catch (error) {
  const message = 'Failed to build T-APTS wheel.';
  if (requireTapts) {
    console.error(message);
    console.error(error);
    process.exit(1);
  }
  console.warn(`Skipping T-APTS wheel build: ${message}`);
  process.exit(0);
}
