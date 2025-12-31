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
import { migrateSettingsToV1 } from './migrate.js';
import { updateSettingsFilePreservingFormat } from './comment-json.js';
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
): Settings {
  const safeWorkspace = isTrusted ? workspace : ({} as Settings);

  // Precedence:
  // 1. System Defaults
  // 2. User Settings
  // 3. Workspace Settings
  // 4. System Settings (overrides)
  return customDeepMerge(
    getMergeStrategyForPath,
    {},
    systemDefaults as MergeableObject,
    user as MergeableObject,
    safeWorkspace as MergeableObject,
    system as MergeableObject,
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
