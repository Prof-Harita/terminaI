/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Standalone Browser Launch Tester
 * Usage: node test-browser-launch.js <url OR blank for default>
 */

/* eslint-disable @typescript-eslint/no-require-imports */

const { spawn } = require('node:child_process');
const { platform } = require('node:os');

async function openBrowserSecurely(url) {
  console.log(`[Tester] Attempting to open: ${url}`);

  const platformName = platform();
  console.log(`[Tester] Platform: ${platformName}`);

  let command;
  let args;

  switch (platformName) {
    case 'darwin':
      command = 'open';
      args = [url];
      break;
    case 'win32':
      command = 'powershell.exe';
      args = [
        '-NoProfile',
        '-NonInteractive',
        '-WindowStyle',
        'Hidden',
        '-Command',
        `Start-Process '${url.replace(/'/g, "''")}'`,
      ];
      break;
    case 'linux':
    case 'freebsd':
    case 'openbsd':
      command = 'xdg-open';
      args = [url];
      break;
    default:
      throw new Error(`Unsupported: ${platformName}`);
  }

  console.log(`[Tester] Spawning: ${command} ${args.join(' ')}`);

  const child = spawn(command, args, {
    detached: true,
    stdio: 'ignore',
    env: { ...process.env, SHELL: undefined },
  });

  console.log(`[Tester] Spawned PID: ${child.pid}`);

  child.unref();
  console.log(`[Tester] Called unref(). Exiting function (fire-and-forget).`);
}

const target = process.argv[2] || 'https://google.com';
openBrowserSecurely(target).catch(console.error);

// Keep the process alive briefly to show it doesn't block (optional, but proves unref works)
// If unref works, the script should exit immediately despite the browser staying open.
console.log('[Tester] End of script.');
