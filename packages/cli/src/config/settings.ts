/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import * as path from 'node:path';
import {
  debugLogger,
  SettingsLoader,
  type Settings,
  type SettingsFile,
  type SettingsError,
  type LoadableSettingScope,
  SettingScope,
  isLoadableSettingScope,
  LoadedSettings,
  saveSettings,
  Storage,
  type SessionRetentionSettings,
  type AccessibilitySettings,
  type DnsResolutionOrder,
} from '@terminai/core';
import { DefaultLight } from '../ui/themes/default-light.js';
import { DefaultDark } from '../ui/themes/default.js';
import type { ExtensionManager } from './extension-manager.js';

export type {
  Settings,
  LoadableSettingScope,
  SettingsError,
  SettingsFile,
  SessionRetentionSettings,
  AccessibilitySettings,
  DnsResolutionOrder,
};

export { LoadedSettings };

export type MemoryImportFormat = NonNullable<
  Settings['context']
>['importFormat'];

export const USER_SETTINGS_PATH = Storage.getGlobalSettingsPath();
export const USER_SETTINGS_DIR = path.dirname(USER_SETTINGS_PATH);
export const DEFAULT_EXCLUDED_ENV_VARS = ['DEBUG', 'DEBUG_MODE'];

export { SettingScope, isLoadableSettingScope, saveSettings };

/**
 * Loads settings from user and workspace directories.
 * Project settings override user settings.
 */
export function loadSettings(
  workspaceDir: string = process.cwd(),
): LoadedSettings {
  const loader = new SettingsLoader({
    workspaceDir,
    themeMappings: {
      VS: DefaultLight.name,
      VS2015: DefaultDark.name,
    },
  });
  return loader.load();
}

export function migrateDeprecatedSettings(
  loadedSettings: LoadedSettings,
  extensionManager: ExtensionManager,
): void {
  const processScope = (scope: LoadableSettingScope) => {
    const settings = loadedSettings.forScope(scope).settings;
    if (settings.extensions?.disabled) {
      debugLogger.log(
        `Migrating deprecated extensions.disabled settings from ${scope} settings...`,
      );
      for (const extension of settings.extensions.disabled ?? []) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        extensionManager.disableExtension(extension, scope);
      }

      const newExtensionsValue = { ...settings.extensions };
      newExtensionsValue.disabled = undefined;

      loadedSettings.setValue(scope, 'extensions', newExtensionsValue);
    }
  };

  processScope(SettingScope.User);
  processScope(SettingScope.Workspace);
}
