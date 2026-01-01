/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  SettingsLoader,
  Storage,
  type Settings,
  type SettingsError,
  type LoadedSettings,
  type SettingScope,
  isLoadableSettingScope,
} from '@terminai/core';

export type { Settings, SettingsError, SettingScope, LoadedSettings };
export { isLoadableSettingScope };

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
