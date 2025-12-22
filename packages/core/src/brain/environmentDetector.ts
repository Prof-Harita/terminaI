/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { execSync } from 'node:child_process';
import * as os from 'node:os';
import * as fs from 'node:fs';

export type Environment = 'dev' | 'staging' | 'prod' | 'unknown';

interface EnvironmentSignals {
  hostname: string;
  hasDocker: boolean;
  dockerContainers: string[];
  hasNginx: boolean;
  hasSystemd: boolean;
  nodeEnv: string | undefined;
  user: string;
}

function gatherSignals(): EnvironmentSignals {
  const hostname = os.hostname().toLowerCase();
  const hasDocker = fs.existsSync('/var/run/docker.sock');

  let dockerContainers: string[] = [];
  if (hasDocker) {
    try {
      const output = execSync('docker ps --format "{{.Names}}"', {
        timeout: 5000,
      }).toString();
      dockerContainers = output.split('\n').filter(Boolean);
    } catch (_error) {
      // Docker might not be running or accessible; ignore failures.
    }
  }

  return {
    hostname,
    hasDocker,
    dockerContainers,
    hasNginx: fs.existsSync('/etc/nginx/sites-enabled'),
    hasSystemd: fs.existsSync('/run/systemd/system'),
    nodeEnv: process.env['NODE_ENV'],
    user: os.userInfo().username,
  };
}

export function detectEnvironment(): Environment {
  const signals = gatherSignals();

  if (signals.hostname.includes('prod') || signals.hostname.includes('prd')) {
    return 'prod';
  }
  if (signals.dockerContainers.some((c) => c.includes('prod'))) {
    return 'prod';
  }
  if (signals.nodeEnv === 'production') {
    return 'prod';
  }
  if (signals.user === 'www-data' || signals.user === 'nginx') {
    return 'prod';
  }

  if (signals.hostname.includes('dev') || signals.hostname.includes('local')) {
    return 'dev';
  }
  if (
    signals.hostname.includes('laptop') ||
    signals.hostname.includes('macbook')
  ) {
    return 'dev';
  }
  if (signals.nodeEnv === 'development') {
    return 'dev';
  }
  if (process.env['HOME']?.includes('/Users/')) {
    return 'dev';
  }

  if (
    signals.hostname.includes('staging') ||
    signals.hostname.includes('stg')
  ) {
    return 'staging';
  }

  if (
    signals.hasNginx &&
    signals.hasSystemd &&
    !signals.hostname.includes('dev')
  ) {
    return 'prod';
  }

  return 'unknown';
}

export function getCeremonyMultiplier(env: Environment): number {
  switch (env) {
    case 'dev':
      return 1.0;
    case 'staging':
      return 1.3;
    case 'prod':
      return 1.8;
    case 'unknown':
      return 1.5;
    default:
      return 1.5;
  }
}
