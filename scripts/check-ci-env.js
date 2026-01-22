/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const MIN_NODE_MAJOR = 20;

function getNodeMajor(version) {
  const match = /^v(\d+)\./.exec(version);
  return match ? Number.parseInt(match[1], 10) : null;
}

function readNvmrcMajor() {
  try {
    const raw = readFileSync('.nvmrc', 'utf8').trim();
    const match = /^v?(\d+)/.exec(raw);
    return match ? Number.parseInt(match[1], 10) : null;
  } catch {
    return null;
  }
}

function requireCommand(command, label) {
  try {
    execSync(`command -v ${command}`, { stdio: 'ignore' });
  } catch {
    console.error(`Missing required command: ${label || command}`);
    process.exit(1);
  }
}

function optionalCommand(command, label) {
  try {
    execSync(`command -v ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    console.warn(`Optional command not found: ${label || command}`);
    return false;
  }
}

const nodeMajor = getNodeMajor(process.version);
if (!nodeMajor || nodeMajor < MIN_NODE_MAJOR) {
  console.error(
    `Unsupported Node.js version: ${process.version}. Expected >= v${MIN_NODE_MAJOR}.`,
  );
  process.exit(1);
}

const expectedMajor = readNvmrcMajor();
if (expectedMajor && nodeMajor < expectedMajor) {
  console.error(
    `Node.js version mismatch. .nvmrc expects v${expectedMajor}, current is ${process.version}.`,
  );
  process.exit(1);
}
if (expectedMajor && nodeMajor > expectedMajor) {
  console.warn(
    `Note: Node.js version ${process.version} is newer than .nvmrc (v${expectedMajor}). allowing locally.`,
  );
}

requireCommand('git', 'git');
requireCommand('npm', 'npm');

optionalCommand('python3', 'python3');
optionalCommand('docker', 'docker');
optionalCommand('podman', 'podman');

console.log('CI environment contract checks passed.');
