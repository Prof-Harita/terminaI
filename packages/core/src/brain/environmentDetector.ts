/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
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

let cachedEnvironment: Environment | null = null;
let lastCheck = 0;
const CACHE_TTL_MS = 60000; // 1 minute

export function resetEnvironmentCache() {
  cachedEnvironment = null;
  lastCheck = 0;
}

export function detectEnvironment(): Environment {
  const now = Date.now();
  if (cachedEnvironment && now - lastCheck < CACHE_TTL_MS) {
    return cachedEnvironment;
  }

  const signals = gatherSignals();

  let env: Environment = 'unknown';

  if (signals.hostname.includes('prod') || signals.hostname.includes('prd')) {
    env = 'prod';
  } else if (signals.dockerContainers.some((c) => c.includes('prod'))) {
    env = 'prod';
  } else if (signals.nodeEnv === 'production') {
    env = 'prod';
  } else if (signals.user === 'www-data' || signals.user === 'nginx') {
    env = 'prod';
  } else if (
    signals.hostname.includes('dev') ||
    signals.hostname.includes('local')
  ) {
    env = 'dev';
  } else if (
    signals.hostname.includes('laptop') ||
    signals.hostname.includes('macbook')
  ) {
    env = 'dev';
  } else if (signals.nodeEnv === 'development') {
    env = 'dev';
  } else if (process.env['HOME']?.includes('/Users/')) {
    env = 'dev';
  } else if (
    signals.hostname.includes('staging') ||
    signals.hostname.includes('stg')
  ) {
    env = 'staging';
  } else if (
    signals.hasNginx &&
    signals.hasSystemd &&
    !signals.hostname.includes('dev')
  ) {
    env = 'prod';
  }

  cachedEnvironment = env;
  lastCheck = now;
  return env;
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
