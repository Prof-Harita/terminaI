/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  SettingsSchema,
  SettingDefinition,
  MergeStrategy,
} from './schema-types.js';
import { getSettingsSchema } from './schema.js';

/**
 * Returns the merge strategy for a given setting path.
 */
export function getMergeStrategyForPath(
  path: string[],
): MergeStrategy | undefined {
  let current: SettingDefinition | undefined = undefined;
  let currentSchema: SettingsSchema | undefined = getSettingsSchema();
  let parent: SettingDefinition | undefined = undefined;

  for (const key of path) {
    if (!currentSchema || !currentSchema[key]) {
      // Key not found in schema - check if parent has additionalProperties
      if (parent?.additionalProperties?.mergeStrategy) {
        return parent.additionalProperties.mergeStrategy;
      }
      return undefined;
    }
    parent = current;
    current = currentSchema[key];
    currentSchema = current.properties;
  }

  return current?.mergeStrategy;
}

/**
 * Sets a nested property in an object given a dot-separated path.
 */
export function setNestedProperty(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): void {
  const keys = path.split('.');
  const lastKey = keys.pop();
  if (!lastKey) return;

  let current: Record<string, unknown> = obj;
  for (const key of keys) {
    if (current[key] === undefined) {
      current[key] = {};
    }
    const next = current[key];
    if (typeof next === 'object' && next !== null) {
      current = next as Record<string, unknown>;
    } else {
      // This path is invalid, so we stop.
      return;
    }
  }
  current[lastKey] = value;
}

/**
 * Gets a nested property from an object given a dot-separated path.
 */
export function getNestedProperty(
  obj: Record<string, unknown>,
  path: string,
): unknown {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (typeof current !== 'object' || current === null || !(key in current)) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}
