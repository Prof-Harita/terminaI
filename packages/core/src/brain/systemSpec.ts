/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import * as os from 'node:os';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

/**
 * Information about a software runtime (e.g., Node.js, Python).
 */
export interface RuntimeInfo {
  version: string;
  npm?: string;
  pip?: boolean;
  venv?: boolean;
}

/**
 * Information about a system binary.
 */
export interface BinaryInfo {
  path: string;
  version?: string;
}

/**
 * Complete system specification representing machine capabilities.
 */
export interface SystemSpec {
  os: {
    name: string; // 'Ubuntu', 'macOS', 'Windows', etc.
    version: string;
    arch: string;
  };
  shell: {
    type: 'bash' | 'zsh' | 'powershell' | 'fish' | 'unknown';
    version: string;
  };
  runtimes: {
    node?: RuntimeInfo;
    python?: RuntimeInfo;
    ruby?: RuntimeInfo;
    go?: RuntimeInfo;
    rust?: RuntimeInfo;
  };
  binaries: {
    [name: string]: BinaryInfo;
  };
  packageManagers: Array<
    | 'apt'
    | 'brew'
    | 'dnf'
    | 'pacman'
    | 'choco'
    | 'npm'
    | 'pip'
    | 'cargo'
    | 'go'
    | 'gem'
  >;
  sudoAvailable: boolean;
  network: {
    hasInternet: boolean;
    proxy?: string;
  };
  timestamp: number;
}

/**
 * Default location for the system spec cache.
 */
function getSpecCachePath(): string {
  return path.join(os.homedir(), '.terminai', 'system-spec.json');
}

/**
 * Scans the system for available capabilities (asynchronous).
 * @returns Complete system specification
 */
export async function scanSystem(): Promise<SystemSpec> {
  return scanSystemSync();
}

/**
 * Scans the system for available capabilities (synchronous).
 * @returns Complete system specification
 */
export function scanSystemSync(): SystemSpec {
  const spec: SystemSpec = {
    os: {
      name: os.platform(),
      version: os.release(),
      arch: os.arch(),
    },
    shell: {
      type: detectShellType(),
      version: getShellVersion(),
    },
    runtimes: {},
    binaries: {},
    packageManagers: [],
    sudoAvailable: false,
    network: {
      hasInternet: false,
    },
    timestamp: Date.now(),
  };

  // Detect Runtimes & Binaries
  detectRuntimesSync(spec);
  detectBinariesSync(spec);

  // Detect Sudo
  spec.sudoAvailable = checkSudo();

  // Detect Network
  spec.network.hasInternet = checkInternet();

  return spec;
}

function detectShellType(): SystemSpec['shell']['type'] {
  const shellPath = process.env['SHELL'] || '';
  if (shellPath.includes('bash')) return 'bash';
  if (shellPath.includes('zsh')) return 'zsh';
  if (shellPath.includes('fish')) return 'fish';
  if (process.env['PSModulePath']) return 'powershell';
  return 'unknown';
}

function getShellVersion(): string {
  try {
    const shellType = detectShellType();
    if (shellType === 'bash') {
      return execSync('bash --version').toString().split('\n')[0].split(' ')[3];
    }
    if (shellType === 'zsh') {
      return execSync('zsh --version').toString().split(' ')[1].trim();
    }
  } catch {
    // Ignore version detection failures
  }
  return 'unknown';
}

function detectRuntimesSync(spec: SystemSpec) {
  try {
    const nodeVersion = execSync('node --version').toString().trim();
    spec.runtimes.node = { version: nodeVersion };
    try {
      spec.runtimes.node.npm = execSync('npm --version').toString().trim();
      spec.packageManagers.push('npm');
    } catch {
      // Ignore npm detection failures
    }
  } catch {
    // Ignore node detection failures
  }

  try {
    const pythonVersion = execSync('python3 --version').toString().trim();
    spec.runtimes.python = { version: pythonVersion };
    try {
      execSync('pip3 --version');
      spec.runtimes.python.pip = true;
      spec.packageManagers.push('pip');
    } catch {
      // Ignore pip detection failures
    }
  } catch {
    // Ignore python detection failures
  }
}

function detectBinariesSync(spec: SystemSpec) {
  const commonBinaries = [
    'git',
    'curl',
    'wget',
    'docker',
    'google-chrome',
    'libreoffice',
    'pandoc',
  ];
  for (const bin of commonBinaries) {
    try {
      const binPath = execSync(`which ${bin}`).toString().trim();
      spec.binaries[bin] = { path: binPath };
      try {
        const version = execSync(`${bin} --version`)
          .toString()
          .split('\n')[0]
          .trim();
        spec.binaries[bin].version = version;
      } catch {
        // Ignore version detection failures
      }
    } catch {
      // Ignore binary existence failures
    }
  }
}

function checkSudo(): boolean {
  try {
    execSync('sudo -n true', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function checkInternet(): boolean {
  try {
    execSync('ping -c 1 8.8.8.8', { stdio: 'ignore', timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Saves the system spec to the cache file.
 */
export function saveSystemSpec(spec: SystemSpec): void {
  const dir = path.dirname(getSpecCachePath());
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(getSpecCachePath(), JSON.stringify(spec, null, 2));
}

/**
 * Loads the system spec from the cache file.
 */
export function loadSystemSpec(): SystemSpec | null {
  if (!fs.existsSync(getSpecCachePath())) {
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(getSpecCachePath(), 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Checks if the system spec is older than 24 hours.
 */
export function isSpecStale(spec: SystemSpec): boolean {
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  return Date.now() - spec.timestamp > ONE_DAY_MS;
}
