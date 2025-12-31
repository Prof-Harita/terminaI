/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { homedir } from 'node:os';
import stripJsonComments from 'strip-json-comments';
import {
  isWithinRoot,
  ideContextStore,
  GEMINI_DIR,
  getErrorMessage,
  FatalConfigError,
} from '../../index.js';
import {
  TrustLevel,
  type TrustRule,
  type TrustResult,
  type TrustedFoldersFile,
  type TrustedFoldersError,
  type Settings,
} from './types.js';

export const TRUSTED_FOLDERS_FILENAME = 'trustedFolders.json';

export function getUserSettingsDir(): string {
  return path.join(homedir(), GEMINI_DIR);
}

export function getTrustedFoldersPath(): string {
  if (process.env['GEMINI_CLI_TRUSTED_FOLDERS_PATH']) {
    return process.env['GEMINI_CLI_TRUSTED_FOLDERS_PATH'];
  }
  return path.join(getUserSettingsDir(), TRUSTED_FOLDERS_FILENAME);
}

export function isTrustLevel(value: unknown): value is TrustLevel {
  return (
    typeof value === 'string' &&
    Object.values(TrustLevel).includes(value as TrustLevel)
  );
}

export class LoadedTrustedFolders {
  constructor(
    readonly user: TrustedFoldersFile,
    readonly errors: TrustedFoldersError[],
  ) {}

  get rules(): TrustRule[] {
    return Object.entries(this.user.config).map(([path, trustLevel]) => ({
      path,
      trustLevel,
    }));
  }

  /**
   * Returns true or false if the path should be "trusted".
   */
  isPathTrusted(
    location: string,
    config?: Record<string, TrustLevel>,
  ): boolean | undefined {
    const configToUse = config ?? this.user.config;
    const trustedPaths: string[] = [];
    const untrustedPaths: string[] = [];

    for (const [pathKey, trustLevel] of Object.entries(configToUse)) {
      switch (trustLevel) {
        case TrustLevel.TRUST_FOLDER:
          trustedPaths.push(pathKey);
          break;
        case TrustLevel.TRUST_PARENT:
          trustedPaths.push(path.dirname(pathKey));
          break;
        case TrustLevel.DO_NOT_TRUST:
          untrustedPaths.push(pathKey);
          break;
        default:
          break;
      }
    }

    for (const trustedPath of trustedPaths) {
      if (isWithinRoot(location, trustedPath)) {
        return true;
      }
    }

    for (const untrustedPath of untrustedPaths) {
      if (path.normalize(location) === path.normalize(untrustedPath)) {
        return false;
      }
    }

    return undefined;
  }

  setValue(path: string, trustLevel: TrustLevel): void {
    const originalTrustLevel = this.user.config[path];
    this.user.config[path] = trustLevel;
    try {
      saveTrustedFolders(this.user);
    } catch (e) {
      if (originalTrustLevel === undefined) {
        delete this.user.config[path];
      } else {
        this.user.config[path] = originalTrustLevel;
      }
      throw e;
    }
  }
}

let loadedTrustedFolders: LoadedTrustedFolders | undefined;

export function resetTrustedFoldersForTesting(): void {
  loadedTrustedFolders = undefined;
}

export function loadTrustedFolders(): LoadedTrustedFolders {
  if (loadedTrustedFolders) {
    return loadedTrustedFolders;
  }

  const errors: TrustedFoldersError[] = [];
  const userConfig: Record<string, TrustLevel> = {};
  const userPath = getTrustedFoldersPath();

  try {
    if (fs.existsSync(userPath)) {
      const content = fs.readFileSync(userPath, 'utf-8');
      const parsed: unknown = JSON.parse(stripJsonComments(content));

      if (
        typeof parsed !== 'object' ||
        parsed === null ||
        Array.isArray(parsed)
      ) {
        errors.push({
          message: 'Trusted folders file is not a valid JSON object.',
          path: userPath,
        });
      } else {
        for (const [p, tl] of Object.entries(parsed)) {
          if (isTrustLevel(tl)) {
            userConfig[p] = tl;
          } else {
            const possibleValues = Object.values(TrustLevel).join(', ');
            errors.push({
              message: `Invalid trust level "${tl}" for path "${p}". Possible values are: ${possibleValues}.`,
              path: userPath,
            });
          }
        }
      }
    }
  } catch (error: unknown) {
    errors.push({
      message: getErrorMessage(error),
      path: userPath,
    });
  }

  loadedTrustedFolders = new LoadedTrustedFolders(
    { path: userPath, config: userConfig },
    errors,
  );
  return loadedTrustedFolders;
}

export function saveTrustedFolders(
  trustedFoldersFile: TrustedFoldersFile,
): void {
  const dirPath = path.dirname(trustedFoldersFile.path);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  fs.writeFileSync(
    trustedFoldersFile.path,
    JSON.stringify(trustedFoldersFile.config, null, 2),
    { encoding: 'utf-8', mode: 0o600 },
  );
}

export function isFolderTrustEnabled(settings: Settings): boolean {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const folderTrustSetting =
    (settings as any).security?.folderTrust?.enabled ?? false;
  return folderTrustSetting;
}

function getWorkspaceTrustFromLocalConfig(
  trustConfig?: Record<string, TrustLevel>,
): TrustResult {
  const folders = loadTrustedFolders();
  const configToUse = trustConfig ?? folders.user.config;

  if (folders.errors.length > 0) {
    const errorMessages = folders.errors.map(
      (error) => `Error in ${error.path}: ${error.message}`,
    );
    throw new FatalConfigError(
      `${errorMessages.join('\n')}\nPlease fix the configuration file and try again.`,
    );
  }

  const isTrusted = folders.isPathTrusted(process.cwd(), configToUse);
  return {
    isTrusted,
    source: isTrusted !== undefined ? 'file' : undefined,
  };
}

export function isWorkspaceTrusted(
  settings: Settings,
  trustConfig?: Record<string, TrustLevel>,
): TrustResult {
  if (!isFolderTrustEnabled(settings)) {
    return { isTrusted: true, source: undefined };
  }

  const ideTrust = ideContextStore.get()?.workspaceState?.isTrusted;
  if (ideTrust !== undefined) {
    return { isTrusted: ideTrust, source: 'ide' };
  }

  return getWorkspaceTrustFromLocalConfig(trustConfig);
}
