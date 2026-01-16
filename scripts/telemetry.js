#!/usr/bin/env node

/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { GEMINI_DIR } from '@terminai/core';

const projectRoot = join(import.meta.dirname, '..');

const USER_SETTINGS_DIR = join(
  process.env.HOME || process.env.USERPROFILE || process.env.HOMEPATH || '',
  GEMINI_DIR,
);
const USER_SETTINGS_PATH = join(USER_SETTINGS_DIR, 'settings.json');
const WORKSPACE_SETTINGS_PATH = join(projectRoot, GEMINI_DIR, 'settings.json');

let telemetrySettings = undefined;

function loadSettings(filePath) {
  try {
    if (existsSync(filePath)) {
      const content = readFileSync(filePath, 'utf-8');
      const jsonContent = content.replace(/\/\/[^\n]*/g, '');
      const settings = JSON.parse(jsonContent);
      return settings.telemetry;
    }
  } catch (e) {
    console.warn(
      `⚠️ Warning: Could not parse settings file at ${filePath}: ${e.message}`,
    );
  }
  return undefined;
}

telemetrySettings = loadSettings(WORKSPACE_SETTINGS_PATH);

if (!telemetrySettings) {
  telemetrySettings = loadSettings(USER_SETTINGS_PATH);
}

let target = telemetrySettings?.target || 'local';

// TerminaI: Only local telemetry is supported for privacy
if (target !== 'local') {
  console.warn(
    `⚠️  Warning: Target '${target}' is not supported in TerminaI. Only 'local' is available.`,
  );
  target = 'local';
}

const targetArg = process.argv.find((arg) => arg.startsWith('--target='));
if (targetArg) {
  const potentialTarget = targetArg.split('=')[1];
  if (potentialTarget === 'local') {
    target = potentialTarget;
    console.log(`⚙️  Using command-line target: ${target}`);
  } else {
    console.warn(
      `⚠️  Warning: Target '${potentialTarget}' is not supported in TerminaI. Using 'local'.`,
    );
    target = 'local';
  }
} else if (telemetrySettings?.target === 'local') {
  console.log(
    `⚙️ Using telemetry target from settings.json: ${telemetrySettings.target}`,
  );
}

const scriptPath = join(projectRoot, 'scripts', 'local_telemetry.js');

try {
  console.log(`🚀 Running local telemetry setup...`);
  const env = { ...process.env };

  execSync(`node ${scriptPath}`, {
    stdio: 'inherit',
    cwd: projectRoot,
    env,
  });
} catch (error) {
  console.error(`🛑 Failed to run local telemetry script`);
  console.error(error);
  process.exit(1);
}
