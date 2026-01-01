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
import { debugLogger } from '../../index.js';
import {
  getMergeStrategyForPath,
  getNestedProperty,
  setNestedProperty,
} from './utils.js';
import {
  SettingScope,
  type IExtensionManager,
  type ILoadedSettings,
  type LoadableSettingScope,
} from './types.js';

/**
 * Map of V1 setting keys to their V2 nested paths.
 * Constant mirrored from CLI to ensure parity during core graduation.
 */
export const MIGRATION_MAP: Record<string, string> = {
  accessibility: 'ui.accessibility',
  allowedTools: 'tools.allowed',
  allowMCPServers: 'mcp.allowed',
  autoAccept: 'tools.autoAccept',
  autoConfigureMaxOldSpaceSize: 'advanced.autoConfigureMemory',
  bugCommand: 'advanced.bugCommand',
  chatCompression: 'model.compressionThreshold',
  checkpointing: 'general.checkpointing',
  coreTools: 'tools.core',
  contextFileName: 'context.fileName',
  customThemes: 'ui.customThemes',
  customWittyPhrases: 'ui.customWittyPhrases',
  debugKeystrokeLogging: 'general.debugKeystrokeLogging',
  disableAutoUpdate: 'general.disableAutoUpdate',
  disableUpdateNag: 'general.disableUpdateNag',
  dnsResolutionOrder: 'advanced.dnsResolutionOrder',
  enableMessageBusIntegration: 'tools.enableMessageBusIntegration',
  enableHooks: 'tools.enableHooks',
  enablePromptCompletion: 'general.enablePromptCompletion',
  enforcedAuthType: 'security.auth.enforcedType',
  excludeTools: 'tools.exclude',
  excludeMCPServers: 'mcp.excluded',
  excludedProjectEnvVars: 'advanced.excludedEnvVars',
  extensionManagement: 'experimental.extensionManagement',
  extensions: 'extensions',
  fileFiltering: 'context.fileFiltering',
  folderTrustFeature: 'security.folderTrust.featureEnabled',
  folderTrust: 'security.folderTrust.enabled',
  hasSeenIdeIntegrationNudge: 'ide.hasSeenNudge',
  hideWindowTitle: 'ui.hideWindowTitle',
  showStatusInTitle: 'ui.showStatusInTitle',
  hideTips: 'ui.hideTips',
  hideBanner: 'ui.hideBanner',
  hideFooter: 'ui.hideFooter',
  hideCWD: 'ui.footer.hideCWD',
  hideSandboxStatus: 'ui.footer.hideSandboxStatus',
  hideModelInfo: 'ui.footer.hideModelInfo',
  hideContextSummary: 'ui.hideContextSummary',
  showMemoryUsage: 'ui.showMemoryUsage',
  showLineNumbers: 'ui.showLineNumbers',
  showCitations: 'ui.showCitations',
  ideMode: 'ide.enabled',
  includeDirectories: 'context.includeDirectories',
  loadMemoryFromIncludeDirectories: 'context.loadFromIncludeDirectories',
  maxSessionTurns: 'model.maxSessionTurns',
  mcpServers: 'mcpServers',
  mcpServerCommand: 'mcp.serverCommand',
  memoryImportFormat: 'context.importFormat',
  memoryDiscoveryMaxDirs: 'context.discoveryMaxDirs',
  model: 'model.name',
  preferredEditor: 'general.preferredEditor',
  retryFetchErrors: 'general.retryFetchErrors',
  sandbox: 'tools.sandbox',
  selectedAuthType: 'security.auth.selectedType',
  enableInteractiveShell: 'tools.shell.enableInteractiveShell',
  shellPager: 'tools.shell.pager',
  shellShowColor: 'tools.shell.showColor',
  shellInactivityTimeout: 'tools.shell.inactivityTimeout',
  skipNextSpeakerCheck: 'model.skipNextSpeakerCheck',
  summarizeToolOutput: 'model.summarizeToolOutput',
  telemetry: 'telemetry',
  theme: 'ui.theme',
  toolDiscoveryCommand: 'tools.discoveryCommand',
  toolCallCommand: 'tools.callCommand',
  usageStatisticsEnabled: 'privacy.usageStatisticsEnabled',
  useExternalAuth: 'security.auth.useExternal',
  useRipgrep: 'tools.useRipgrep',
  vimMode: 'general.vimMode',
};

export const REVERSE_MIGRATION_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(MIGRATION_MAP).map(([key, value]) => [value, key]),
);

export const KNOWN_V2_CONTAINERS = new Set(
  Object.values(MIGRATION_MAP).map((path) => path.split('.')[0]),
);

/**
 * Checks if a flat settings object needs migration to V2 structure.
 */
export function needsMigration(settings: Record<string, unknown>): boolean {
  return Object.entries(MIGRATION_MAP).some(([v1Key, v2Path]) => {
    if (v1Key === v2Path || !(v1Key in settings)) {
      return false;
    }
    if (
      KNOWN_V2_CONTAINERS.has(v1Key) &&
      typeof settings[v1Key] === 'object' &&
      settings[v1Key] !== null
    ) {
      return false;
    }
    return true;
  });
}

/**
 * Migrates flat settings to V2 nested structure.
 */
export function migrateSettingsToV2(
  flatSettings: Record<string, unknown>,
): Record<string, unknown> | null {
  if (!needsMigration(flatSettings)) {
    return null;
  }

  const v2Settings: Record<string, unknown> = {};
  const flatKeys = new Set(Object.keys(flatSettings));

  for (const [oldKey, newPath] of Object.entries(MIGRATION_MAP)) {
    if (flatKeys.has(oldKey)) {
      if (
        KNOWN_V2_CONTAINERS.has(oldKey) &&
        typeof flatSettings[oldKey] === 'object' &&
        flatSettings[oldKey] !== null &&
        !Array.isArray(flatSettings[oldKey])
      ) {
        continue;
      }

      setNestedProperty(v2Settings, newPath, flatSettings[oldKey]);
      flatKeys.delete(oldKey);
    }
  }

  // Preserve mcpServers at the top level
  if (flatSettings['mcpServers']) {
    v2Settings['mcpServers'] = flatSettings['mcpServers'];
    flatKeys.delete('mcpServers');
  }

  // Carry over any unrecognized keys
  for (const remainingKey of flatKeys) {
    const existingValue = v2Settings[remainingKey];
    const newValue = flatSettings[remainingKey];

    if (
      typeof existingValue === 'object' &&
      existingValue !== null &&
      !Array.isArray(existingValue) &&
      typeof newValue === 'object' &&
      newValue !== null &&
      !Array.isArray(newValue)
    ) {
      const pathAwareGetStrategy = (p: string[]) =>
        getMergeStrategyForPath([remainingKey, ...p]);
      v2Settings[remainingKey] = customDeepMerge(
        pathAwareGetStrategy,
        {},
        existingValue as MergeableObject,
        newValue as MergeableObject,
      );
    } else {
      v2Settings[remainingKey] = newValue;
    }
  }

  return v2Settings;
}

/**
 * Migrates V2 nested settings back to V1 flat structure.
 */
export function migrateSettingsToV1(
  v2Settings: Record<string, unknown>,
): Record<string, unknown> {
  const v1Settings: Record<string, unknown> = {};
  const v2Keys = new Set(Object.keys(v2Settings));

  for (const [newPath, oldKey] of Object.entries(REVERSE_MIGRATION_MAP)) {
    const value = getNestedProperty(v2Settings, newPath);
    if (value !== undefined) {
      v1Settings[oldKey] = value;
      v2Keys.delete(newPath.split('.')[0]);
    }
  }

  // Preserve mcpServers at the top level
  if (v2Settings['mcpServers']) {
    v1Settings['mcpServers'] = v2Settings['mcpServers'];
    v2Keys.delete('mcpServers');
  }

  for (const remainingKey of v2Keys) {
    const value = v2Settings[remainingKey];
    if (value === undefined) {
      continue;
    }

    if (
      KNOWN_V2_CONTAINERS.has(remainingKey) &&
      typeof value === 'object' &&
      value !== null &&
      !Array.isArray(value) &&
      Object.keys(value).length === 0
    ) {
      continue;
    }

    v1Settings[remainingKey] = value;
  }

  return v1Settings;
}

/**
 * Migrates deprecated extension settings.
 */
export function migrateDeprecatedSettings(
  loadedSettings: ILoadedSettings,
  extensionManager: IExtensionManager,
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
