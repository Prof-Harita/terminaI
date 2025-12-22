/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { ActionProfile, OperationClass, Provenance } from './types.js';
import {
  stripShellWrapper,
  parseCommandDetails,
  getCommandRoots,
} from '../../utils/shell-utils.js';

/**
 * Explicit mapping of command roots to operation classifications.
 *
 * This mapping is deterministic and based on commonly understood
 * command semantics. Add entries as needed but keep focused on
 * high-impact safety-relevant commands.
 */
const COMMAND_OPERATION_MAP: Record<string, OperationClass[]> = {
  // Read operations
  ls: ['read'],
  cat: ['read'],
  less: ['read'],
  more: ['read'],
  head: ['read'],
  tail: ['read'],
  grep: ['read'],
  find: ['read'],
  du: ['read'],
  df: ['read'],
  free: ['read'],
  ps: ['read'],
  top: ['read'],
  htop: ['read'],
  who: ['read'],
  w: ['read'],
  uptime: ['read'],
  echo: ['read'],

  // Write operations
  tee: ['write'],
  touch: ['write'],
  mv: ['write'],
  cp: ['write'],
  rsync: ['write'],
  tar: ['write'],
  zip: ['write'],
  unzip: ['write'],
  gzip: ['write'],
  gunzip: ['write'],

  // Delete operations
  rm: ['delete'],
  rmdir: ['delete'],
  unlink: ['delete'],

  // Privileged operations
  sudo: ['privileged'],
  doas: ['privileged'],
  su: ['privileged'],

  // Network operations
  curl: ['network'],
  wget: ['network'],
  scp: ['network'],
  sftp: ['network'],
  ssh: ['network'],
  nc: ['network'],
  netcat: ['network'],
  telnet: ['network'],
  ftp: ['network'],
  ping: ['network', 'read'],

  // Process operations
  kill: ['process'],
  pkill: ['process'],
  killall: ['process'],
  systemctl: ['process'],
  service: ['process'],
  launchctl: ['process'],

  // Device operations
  dd: ['device'],
  mkfs: ['device'],
  fdisk: ['device'],
  parted: ['device'],
  mount: ['device'],
  umount: ['device'],

  // Package managers (write + network)
  npm: ['write', 'network'],
  yarn: ['write', 'network'],
  pnpm: ['write', 'network'],
  pip: ['write', 'network'],
  apt: ['write', 'network'],
  'apt-get': ['write', 'network'],
  dnf: ['write', 'network'],
  yum: ['write', 'network'],
  brew: ['write', 'network'],

  // Git (mostly write, some network)
  git: ['read'], // Subcommand-aware classification is applied below.
};

/**
 * Builds an ActionProfile for a shell command by analyzing its structure and content.
 *
 * @param args Command, cwd, workspaces, and optional provenance
 * @returns Deterministic ActionProfile
 */
export function buildShellActionProfile(args: {
  command: string;
  cwd: string;
  workspaces: string[];
  provenance?: Provenance[];
}): ActionProfile {
  const { command, workspaces, provenance = ['model_suggestion'] } = args;

  // Step 1: Normalize command
  const normalized = stripShellWrapper(command);

  // Step 2: Parse shell structure
  const parseResult = parseCommandDetails(normalized);
  const parseConfidence: 'high' | 'medium' | 'low' =
    !parseResult || parseResult.hasError ? 'low' : 'high';

  // Step 3: Extract roots
  const roots = parseConfidence !== 'low' ? getCommandRoots(normalized) : [];

  // Step 4: Classify operations
  const operationsSet = new Set<OperationClass>();

  if (roots.length === 0) {
    operationsSet.add('unknown');
  } else {
    // Classify based on command roots
    roots.forEach((root) => {
      const ops = COMMAND_OPERATION_MAP[root];
      if (ops) {
        ops.forEach((op) => operationsSet.add(op));
      }
    });

    // Secondary check: scan normalized command text for operation keywords
    // This catches operations within sudo/other wrappers
    Object.entries(COMMAND_OPERATION_MAP).forEach(([cmd, ops]) => {
      // Use word boundaries to avoid false positives
      const regex = new RegExp(`\\b${cmd}\\b`);
      if (regex.test(normalized)) {
        ops.forEach((op) => operationsSet.add(op));
      }
    });

    // Check for redirections and other write indicators
    if (normalized.includes('>') || normalized.includes('>>')) {
      operationsSet.add('write');
    }

    // Check for device paths
    if (normalized.includes('/dev/')) {
      operationsSet.add('device');
    }

    // Subcommand-aware classification for git
    if (roots.includes('git')) {
      const match = normalized.match(/\bgit\s+([^\s]+)/);
      const sub = match?.[1]?.toLowerCase();
      const readOnly = new Set([
        'status',
        'log',
        'diff',
        'show',
        'grep',
        'blame',
        'rev-parse',
        'ls-files',
        'remote',
        'config',
      ]);

      if (!sub || !readOnly.has(sub)) {
        operationsSet.add('write');
      }

      const networkSubs = new Set([
        'push',
        'pull',
        'fetch',
        'clone',
        'submodule',
      ]);
      if (sub && networkSubs.has(sub)) {
        operationsSet.add('network');
      }

      const deleteSubs = new Set(['clean', 'reset', 'rm']);
      if (sub && deleteSubs.has(sub)) {
        operationsSet.add('delete');
      }
    }

    // If no operations classified, default to unknown
    if (operationsSet.size === 0) {
      operationsSet.add('unknown');
    }
  }

  const operations = Array.from(operationsSet);

  // Step 5: Determine outsideWorkspace
  let outsideWorkspace = false;

  // Simple heuristic: check for obvious outside-workspace paths
  const dangerousPaths = [
    '/',
    '/etc',
    '/var',
    '/usr',
    '/bin',
    '/sbin',
    '/home',
  ];
  for (const path of dangerousPaths) {
    // Check for exact match or path followed by space/slash
    if (
      normalized.includes(` ${path} `) ||
      normalized.includes(` ${path}/`) ||
      normalized.endsWith(` ${path}`) ||
      normalized === path ||
      normalized.startsWith(`${path}/`)
    ) {
      // Verify it's not within a workspace
      const isInWorkspace = workspaces.some((ws) => path.startsWith(ws));
      if (!isInWorkspace) {
        outsideWorkspace = true;
        break;
      }
    }
  }

  // Check for home directory (~)
  if (normalized.includes('~')) {
    const isHomeInWorkspace = workspaces.some((ws) =>
      ws.startsWith(process.env['HOME'] || ''),
    );
    if (!isHomeInWorkspace) {
      outsideWorkspace = true;
    }
  }

  // Step 6: Determine hasUnboundedScopeSignals
  let hasUnboundedScopeSignals = false;

  if (operations.includes('delete')) {
    // Check for dangerous patterns
    const unboundedPatterns = [
      ' / ',
      'rm -rf /',
      'rm -rf ~',
      'rm -r /',
      'rm -r ~',
    ];

    for (const pattern of unboundedPatterns) {
      if (normalized.includes(pattern)) {
        hasUnboundedScopeSignals = true;
        break;
      }
    }

    // Check for wildcard deletes (but not relative paths like ./)
    if (normalized.includes('rm -rf *') || normalized.includes('rm -r *')) {
      hasUnboundedScopeSignals = true;
    }

    // Check if ending with / or ~ (targeting root/home)
    if (normalized.endsWith(' /') || normalized.endsWith(' ~')) {
      hasUnboundedScopeSignals = true;
    }
  }

  // Determine usesPrivilege
  const usesPrivilege = operations.includes('privileged');

  return {
    toolName: 'ShellTool',
    operations,
    roots,
    touchedPaths: [], // TODO: Extract from parsed command if needed
    outsideWorkspace,
    usesPrivilege,
    hasUnboundedScopeSignals,
    parseConfidence,
    provenance,
    rawSummary: command,
  };
}
