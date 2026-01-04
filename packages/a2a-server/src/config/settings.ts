/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  SettingsLoader,
  Storage,
  type LoadedSettings,
  type Settings,
  type SettingsError,
  SettingScope,
  isLoadableSettingScope,
} from '@terminai/core';

export type { Settings, SettingsError, LoadedSettings };
export { SettingScope, isLoadableSettingScope };

export const USER_SETTINGS_PATH = Storage.getGlobalSettingsPath();

/**
 * Loads settings from user and workspace directories using Core's SettingsLoader.
 * Project settings override user settings.
 */
export function loadSettings(
  workspaceDir: string = process.cwd(),
): LoadedSettings {
  const loader = new SettingsLoader({
    workspaceDir,
  });
  return loader.load();
}
