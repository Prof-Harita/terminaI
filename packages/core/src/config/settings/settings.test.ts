/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import { migrateSettingsToV2, needsMigration } from './migrate.js';
import { validateSettings } from './validate.js';

describe('Settings Migration', () => {
  it('should detect when migration is needed', () => {
    const v1Settings = {
      model: 'gemini-1.5-pro',
      theme: 'dark',
    };
    expect(needsMigration(v1Settings)).toBe(true);

    const v2Settings = {
      model: { name: 'gemini-1.5-pro' },
      ui: { theme: 'dark' },
    };
    expect(needsMigration(v2Settings)).toBe(false);
  });

  it('should migrate v1 settings to v2', () => {
    const v1Settings = {
      model: 'gemini-1.5-pro',
      theme: 'dark',
      folderTrust: true,
    };
    const v2Settings = migrateSettingsToV2(v1Settings);
    expect(v2Settings).toEqual({
      model: { name: 'gemini-1.5-pro' },
      ui: { theme: 'dark' },
      security: {
        folderTrust: {
          enabled: true,
        },
      },
    });
  });

  it('should preserve unrecognized keys during migration', () => {
    const v1Settings = {
      model: 'gemini-1.5-pro',
      unknownKey: 'value',
    };
    const v2Settings = migrateSettingsToV2(v1Settings);
    expect(v2Settings).toEqual({
      model: { name: 'gemini-1.5-pro' },
      unknownKey: 'value',
    });
  });
});

describe('Settings Validation', () => {
  it('should validate correct settings', () => {
    const validSettings = {
      llm: {
        provider: 'gemini',
      },
      model: {
        name: 'gemini-1.5-pro',
      },
      ui: {
        theme: 'dark',
      },
      general: {
        previewFeatures: true,
      },
    };
    const result = validateSettings(validSettings);
    expect(result.success).toBe(true);
  });

  it('should fail on invalid enum values', () => {
    const invalidSettings = {
      llm: {
        provider: 'non-existent-provider',
      },
    };
    const result = validateSettings(invalidSettings);
    expect(result.success).toBe(false);
  });

  it('should fail on invalid types', () => {
    const invalidSettings = {
      general: {
        previewFeatures: 'yes', // Should be boolean
      },
    };
    const result = validateSettings(invalidSettings);
    expect(result.success).toBe(false);
  });
});
