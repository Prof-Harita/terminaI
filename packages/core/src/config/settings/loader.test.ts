/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoadedSettings, mergeSettings } from './loader.js';
import { SettingScope, type Settings, type SettingsFile } from './types.js';

// Mock dependencies
vi.mock('node:fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
}));

vi.mock('./comment-json.js', () => ({
  updateSettingsFilePreservingFormat: vi.fn(),
}));

describe('mergeSettings', () => {
  it('should merge settings with correct precedence', () => {
    const systemDefaults: Settings = {
      llm: { provider: 'gemini' },
      model: { name: 'gemini-1.5-pro' },
      ui: { theme: 'light' },
    };
    const user: Settings = {
      ui: { theme: 'dark' },
    };
    const workspace: Settings = {
      model: { name: 'gemini-1.5-flash' },
    };
    const system: Settings = {
      general: { previewFeatures: true },
    };

    const merged = mergeSettings(system, systemDefaults, user, workspace, true);

    expect(merged).toEqual({
      llm: { provider: 'gemini' },
      model: { name: 'gemini-1.5-flash' },
      ui: { theme: 'dark' },
      general: { previewFeatures: true },
    });
  });

  it('should ignore workspace settings if not trusted', () => {
    const user: Settings = { ui: { theme: 'dark' } };
    const workspace: Settings = { ui: { theme: 'light' } };

    const merged = mergeSettings({}, {}, user, workspace, false);

    expect(merged.ui?.theme).toBe('dark');
  });
});

describe('LoadedSettings', () => {
  let system: SettingsFile;
  let systemDefaults: SettingsFile;
  let user: SettingsFile;
  let workspace: SettingsFile;

  beforeEach(() => {
    system = { path: 'system.json', settings: {}, originalSettings: {} };
    systemDefaults = {
      path: 'defaults.json',
      settings: { ui: { theme: 'light' } },
      originalSettings: { ui: { theme: 'light' } },
    };
    user = { path: 'user.json', settings: {}, originalSettings: {} };
    workspace = { path: 'workspace.json', settings: {}, originalSettings: {} };
  });

  it('should compute merged settings on construction', () => {
    const loaded = new LoadedSettings(
      system,
      systemDefaults,
      user,
      workspace,
      true,
    );
    expect(loaded.merged.ui?.theme).toBe('light');
  });

  it('should update merged settings when setValue is called', () => {
    const loaded = new LoadedSettings(
      system,
      systemDefaults,
      user,
      workspace,
      true,
    );
    loaded.setValue(SettingScope.User, 'ui.theme', 'dark');
    expect(loaded.merged.ui?.theme).toBe('dark');
    expect(user.settings.ui?.theme).toBe('dark');
  });

  it('should throw error for invalid scope in forScope', () => {
    const loaded = new LoadedSettings(
      system,
      systemDefaults,
      user,
      workspace,
      true,
    );
    expect(() => loaded.forScope('invalid' as any)).toThrow(
      'Invalid scope: invalid',
    );
  });
});
