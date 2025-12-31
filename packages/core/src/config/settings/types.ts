/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Settings as InferredSettings } from './schema.js';

export enum SettingScope {
  User = 'User',
  Workspace = 'Workspace',
  System = 'System',
  SystemDefaults = 'SystemDefaults',
  Session = 'Session',
}

export type LoadableSettingScope =
  | SettingScope.User
  | SettingScope.Workspace
  | SettingScope.System
  | SettingScope.SystemDefaults;

export interface SettingsError {
  message: string;
  path: string;
}

export interface SettingsFile {
  settings: Settings;
  originalSettings: Settings;
  path: string;
  rawJson?: string;
}

export type MemoryImportFormat = 'tree' | 'flat';
export type DnsResolutionOrder = 'ipv4first' | 'verbatim';

export interface CustomTheme {
  type: 'custom';
  name: string;
  text?: {
    primary?: string;
    secondary?: string;
    link?: string;
    accent?: string;
    response?: string;
  };
  background?: {
    primary?: string;
    diff?: {
      added?: string;
      removed?: string;
    };
  };
  border?: {
    default?: string;
    focused?: string;
  };
  ui?: {
    comment?: string;
    symbol?: string;
    gradient?: string[];
  };
  status?: {
    error?: string;
    success?: string;
    warning?: string;
  };
  // Legacy properties
  Background?: string;
  Foreground?: string;
  LightBlue?: string;
  AccentBlue?: string;
  AccentPurple?: string;
  AccentCyan?: string;
  AccentGreen?: string;
  AccentYellow?: string;
  AccentRed?: string;
  DiffAdded?: string;
  DiffRemoved?: string;
  Comment?: string;
  Gray?: string;
  DarkGray?: string;
  GradientColors?: string[];
}

export interface SessionRetentionSettings {
  enabled?: boolean;
  maxAge?: string;
  maxCount?: number;
  minRetention?: string;
}

export interface AccessibilitySettings {
  disableLoadingPhrases?: boolean;
  screenReader?: boolean;
}

export interface BugCommandSettings {
  urlTemplate: string;
}

export interface SummarizeToolOutputSettings {
  tokenBudget?: number;
}

export interface CodebaseInvestigatorSettings {
  enabled?: boolean;
  maxNumTurns?: number;
  maxTimeMinutes?: number;
  thinkingBudget?: number;
  model?: string;
}

export interface IntrospectionAgentSettings {
  enabled?: boolean;
}

export interface IExtensionManager {
  disableExtension(
    extensionId: string,
    scope: LoadableSettingScope,
  ): Promise<void>;
}

export interface ILoadedSettings {
  forScope(scope: LoadableSettingScope): SettingsFile;
  setValue(scope: LoadableSettingScope, key: string, value: unknown): void;
  merged: Settings;
}

export enum TrustLevel {
  TRUST_FOLDER = 'TRUST_FOLDER',
  TRUST_PARENT = 'TRUST_PARENT',
  DO_NOT_TRUST = 'DO_NOT_TRUST',
}

export interface TrustRule {
  path: string;
  trustLevel: TrustLevel;
}

export interface TrustResult {
  isTrusted: boolean | undefined;
  source: 'ide' | 'file' | undefined;
}

export interface TrustedFoldersFile {
  config: Record<string, TrustLevel>;
  path: string;
}

export interface TrustedFoldersError {
  message: string;
  path: string;
}

// Re-export inferred settings as the canonical Settings type
export type Settings = InferredSettings;
