/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import type { Zone } from './PolicyTypes.js';

export async function canonicalizePath(inputPath: string): Promise<string> {
  const resolved = path.resolve(inputPath);
  let realPath = resolved;
  try {
    realPath = await fs.realpath(resolved);
  } catch {
    realPath = resolved;
  }
  if (process.platform === 'win32') {
    return realPath.replace(/^\\\\\?\\/, '').toLowerCase();
  }
  return realPath;
}

export function classifyZone(
  canonicalPath: string,
  workspacePath: string,
  configPath: string,
): Zone {
  const userHome = os.homedir();
  const systemPaths =
    process.platform === 'win32'
      ? [
          'c:\\windows',
          'c:\\program files',
          'c:\\program files (x86)',
          'c:\\programdata',
        ]
      : ['/etc', '/usr', '/bin', '/sbin', '/var', '/opt', '/system'];

  const secretsPaths =
    process.platform === 'win32'
      ? [
          path.join(userHome, '.ssh'),
          path.join(userHome, '.gnupg'),
          path.join(userHome, '.aws'),
          path.join(userHome, '.azure'),
        ].map((p) => p.toLowerCase())
      : [
          path.join(userHome, '.ssh'),
          path.join(userHome, '.gnupg'),
          path.join(userHome, '.aws'),
          path.join(userHome, '.azure'),
        ];

  const normalizedWorkspace =
    process.platform === 'win32'
      ? workspacePath.toLowerCase()
      : workspacePath;
  const normalizedConfig =
    process.platform === 'win32' ? configPath.toLowerCase() : configPath;
  const normalizedHome =
    process.platform === 'win32' ? userHome.toLowerCase() : userHome;

  const isChild = (base: string) =>
    canonicalPath === base || canonicalPath.startsWith(base + path.sep);

  if (isChild(normalizedWorkspace)) return 'workspace';
  if (isChild(normalizedConfig)) return 'config';
  if (secretsPaths.some((p) => isChild(p))) return 'secrets';
  if (systemPaths.some((p) => isChild(p))) return 'system';
  if (isChild(normalizedHome)) return 'userHome';
  return 'unknown';
}
