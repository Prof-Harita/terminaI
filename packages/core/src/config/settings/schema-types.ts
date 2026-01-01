/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

export type SettingsType =
  | 'boolean'
  | 'string'
  | 'number'
  | 'array'
  | 'object'
  | 'enum';

export type SettingsValue =
  | boolean
  | string
  | number
  | string[]
  | object
  | undefined;

export enum MergeStrategy {
  REPLACE = 'replace',
  CONCAT = 'concat',
  UNION = 'union',
  SHALLOW_MERGE = 'shallow_merge',
}

export interface SettingEnumOption {
  value: string | number;
  label: string;
}

export interface SettingCollectionDefinition {
  type: SettingsType;
  description?: string;
  properties?: SettingsSchema;
  options?: readonly SettingEnumOption[];
  ref?: string;
  mergeStrategy?: MergeStrategy;
}

export interface SettingDefinition {
  type: SettingsType;
  label: string;
  category: string;
  requiresRestart: boolean;
  default: SettingsValue;
  description?: string;
  parentKey?: string;
  childKey?: string;
  key?: string;
  properties?: SettingsSchema;
  showInDialog?: boolean;
  mergeStrategy?: MergeStrategy;
  options?: readonly SettingEnumOption[];
  items?: SettingCollectionDefinition;
  additionalProperties?: SettingCollectionDefinition;
  ref?: string;
}

export interface SettingsSchema {
  [key: string]: SettingDefinition;
}
