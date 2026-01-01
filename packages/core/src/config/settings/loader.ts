/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  customDeepMerge,
  type MergeableObject,
} from '../../utils/deepMerge.js';
import { coreEvents } from '../../index.js';
import {
  SettingScope,
  type LoadableSettingScope,
  type Settings,
  type SettingsFile,
  type ILoadedSettings,
} from './types.js';
import { getMergeStrategyForPath, setNestedProperty } from './utils.js';
import {
  migrateSettingsToV1,
  migrateSettingsToV2,
  needsMigration,
} from './migrate.js';
import { updateSettingsFilePreservingFormat } from './comment-json.js';
import { resolveEnvVars } from './env-vars.js';
import { isWorkspaceTrusted } from './trust.js';
import { Storage } from '../storage.js';
import stripJsonComments from 'strip-json-comments';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Merges settings from different scopes based on precedence.
 */
export function mergeSettings(
  system: Settings,
  systemDefaults: Settings,
  user: Settings,
  workspace: Settings,
  isTrusted: boolean,
  isSession: boolean = false,
  session: Settings = {},
): Settings {
  const safeWorkspace = isTrusted ? workspace : ({} as Settings);

  // Precedence:
  // 1. System Defaults
  // 2. User Settings
  // 3. Workspace Settings
  // 4. System Settings (overrides)
  // 5. Session Settings (if any)
  return customDeepMerge(
    getMergeStrategyForPath,
    {},
    systemDefaults as MergeableObject,
    user as MergeableObject,
    safeWorkspace as MergeableObject,
    system as MergeableObject,
    isSession ? (session as MergeableObject) : {},
  ) as Settings;
}

/**
 * Core implementation of loaded settings management.
 */
export class LoadedSettings implements ILoadedSettings {
  private _merged: Settings;

  constructor(
    readonly system: SettingsFile,
    readonly systemDefaults: SettingsFile,
    readonly user: SettingsFile,
    readonly workspace: SettingsFile,
    readonly isTrusted: boolean,
    readonly migratedInMemoryScopes: Set<SettingScope> = new Set(),
  ) {
    this._merged = this.computeMergedSettings();
  }

  get merged(): Settings {
    return this._merged;
  }

  private computeMergedSettings(): Settings {
    return mergeSettings(
      this.system.settings,
      this.systemDefaults.settings,
      this.user.settings,
      this.workspace.settings,
      this.isTrusted,
    );
  }

  forScope(scope: LoadableSettingScope): SettingsFile {
    switch (scope) {
      case SettingScope.User:
        return this.user;
      case SettingScope.Workspace:
        return this.workspace;
      case SettingScope.System:
        return this.system;
      case SettingScope.SystemDefaults:
        return this.systemDefaults;
      default:
        throw new Error(`Invalid scope: ${scope}`);
    }
  }

  setValue(scope: LoadableSettingScope, key: string, value: unknown): void {
    const settingsFile = this.forScope(scope);
    setNestedProperty(settingsFile.settings, key, value);
    setNestedProperty(settingsFile.originalSettings, key, value);
    this._merged = this.computeMergedSettings();
    saveSettings(settingsFile);
  }
}

export interface SettingsLoaderOptions {
  workspaceDir?: string;
  themeMappings?: Record<string, string>;
}

/**
 * Reads and parses a settings JSON file with comment support.
 * Returns empty settings if file doesn't exist or has errors.
 */
function readSettingsFile(
  filePath: string,
  themeMappings?: Record<string, string>,
): SettingsFile {
  const emptyFile: SettingsFile = {
    path: filePath,
    settings: {},
    originalSettings: {},
  };

  if (!fs.existsSync(filePath)) {
    return emptyFile;
  }

  try {
    const rawJson = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(stripJsonComments(rawJson)) as Record<
      string,
      unknown
    >;

    // Resolve environment variables
    const resolved = resolveEnvVars(parsed);

    // Apply V1→V2 migration if needed
    let settings = resolved;
    const migrated = migrateSettingsToV2(resolved);
    if (migrated) {
      settings = migrated;
    }

    // Apply theme mappings if provided
    if (themeMappings && settings['ui'] && typeof settings['ui'] === 'object') {
      const ui = settings['ui'] as Record<string, unknown>;
      if (ui['theme'] && typeof ui['theme'] === 'string') {
        const mappedTheme = themeMappings[ui['theme']];
        if (mappedTheme) {
          ui['theme'] = mappedTheme;
        }
      }
    }

    return {
      path: filePath,
      settings: settings as Settings,
      originalSettings: parsed as Settings,
      rawJson,
    };
  } catch (error) {
    coreEvents.emitFeedback(
      'warning',
      `Error reading settings from ${filePath}: ${error instanceof Error ? error.message : String(error)}`,
      error,
    );
    return emptyFile;
  }
}

/**
 * Loads settings from various sources.
 *
 * Settings are loaded from 4 scopes with the following precedence:
 * 1. System Defaults (lowest priority)
 * 2. User Settings (~/.terminai/settings.json)
 * 3. Workspace Settings (<workspace>/.terminai/settings.json)
 * 4. System Settings (/etc/gemini-cli/settings.json, highest priority)
 *
 * Workspace settings are only applied if the workspace is trusted.
 */
export class SettingsLoader {
  constructor(readonly options: SettingsLoaderOptions = {}) {}

  load(): LoadedSettings {
    const workspaceDir = this.options.workspaceDir || process.cwd();
    const themeMappings = this.options.themeMappings;

    // Load settings from all scopes
    const systemSettingsPath = Storage.getSystemSettingsPath();
    const systemDefaultsPath = path.join(
      path.dirname(systemSettingsPath),
      'system-defaults.json',
    );
    const userSettingsPath = Storage.getGlobalSettingsPath();
    const storage = new Storage(workspaceDir);
    const workspaceSettingsPath = storage.getWorkspaceSettingsPath();

    const system = readSettingsFile(systemSettingsPath, themeMappings);
    const systemDefaults = readSettingsFile(systemDefaultsPath, themeMappings);
    const user = readSettingsFile(userSettingsPath, themeMappings);
    const workspace = readSettingsFile(workspaceSettingsPath, themeMappings);

    // Determine trust - for core loader, we default to trusted
    // Full trust evaluation requires the merged system+user settings
    const preliminaryMerged = mergeSettings(
      system.settings,
      systemDefaults.settings,
      user.settings,
      {},
      true, // pretend trusted for preliminary merge
    );

    const trustResult = isWorkspaceTrusted(preliminaryMerged);
    const isTrusted = trustResult.isTrusted ?? true;

    // Track which scopes had V1→V2 migration applied
    const migratedScopes = new Set<SettingScope>();
    if (
      system.rawJson &&
      needsMigration(JSON.parse(stripJsonComments(system.rawJson)))
    ) {
      migratedScopes.add(SettingScope.System);
    }
    if (
      user.rawJson &&
      needsMigration(JSON.parse(stripJsonComments(user.rawJson)))
    ) {
      migratedScopes.add(SettingScope.User);
    }
    if (
      workspace.rawJson &&
      needsMigration(JSON.parse(stripJsonComments(workspace.rawJson)))
    ) {
      migratedScopes.add(SettingScope.Workspace);
    }

    return new LoadedSettings(
      system,
      systemDefaults,
      user,
      workspace,
      isTrusted,
      migratedScopes,
    );
  }
}

/**
 * Saves settings to disk, preserving comments.
 */
export function saveSettings(
  settingsFile: SettingsFile,
  overwriteV2: boolean = true,
): void {
  try {
    const dirPath = path.dirname(settingsFile.path);
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }

    let settingsToSave = settingsFile.originalSettings;
    if (!overwriteV2) {
      settingsToSave = migrateSettingsToV1(
        settingsToSave as Record<string, unknown>,
      ) as Settings;
    }

    updateSettingsFilePreservingFormat(
      settingsFile.path,
      settingsToSave as Record<string, unknown>,
    );
  } catch (error) {
    coreEvents.emitFeedback(
      'error',
      'There was an error saving your latest settings changes.',
      error,
    );
  }
}
