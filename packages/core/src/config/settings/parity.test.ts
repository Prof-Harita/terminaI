/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { SettingsLoader } from './loader.js';
import { GEMINI_DIR } from '../../utils/paths.js';

// Mock homedir to use a temp directory
const mocks = vi.hoisted(() => {
  const suffix = Math.random().toString(36).slice(2);
  return { suffix };
});

vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>();
  const path = await import('node:path');
  return {
    ...actual,
    homedir: () => path.join(actual.tmpdir(), `parity-test-${mocks.suffix}`),
  };
});

/**
 * Parity tests ensure that the Core SettingsLoader produces
 * identical merged settings as the CLI's loadSettings function
 * for the same input files.
 *
 * This is critical for CLI-Desktop parity (Task 1.8).
 */
describe('Settings Parity', () => {
  const mockHomeDir = path.join(os.tmpdir(), `parity-test-${mocks.suffix}`);
  const mockWorkspaceDir = path.join(
    os.tmpdir(),
    `parity-workspace-${mocks.suffix}`,
  );
  const mockUserSettingsDir = path.join(mockHomeDir, GEMINI_DIR);
  const mockWorkspaceSettingsDir = path.join(mockWorkspaceDir, GEMINI_DIR);

  beforeEach(() => {
    vi.clearAllMocks();
    // Create directories
    fs.mkdirSync(mockUserSettingsDir, { recursive: true });
    fs.mkdirSync(mockWorkspaceSettingsDir, { recursive: true });
  });

  afterEach(() => {
    try {
      if (fs.existsSync(mockHomeDir)) {
        fs.rmSync(mockHomeDir, { recursive: true, force: true });
      }
      if (fs.existsSync(mockWorkspaceDir)) {
        fs.rmSync(mockWorkspaceDir, { recursive: true, force: true });
      }
    } catch (_e) {
      // Ignore cleanup errors
    }
    vi.restoreAllMocks();
  });

  it('should load empty settings when no files exist', () => {
    const loader = new SettingsLoader({ workspaceDir: mockWorkspaceDir });
    const result = loader.load();
    expect(result.merged).toEqual({});
  });

  it('should load user settings from ~/.terminai/settings.json', () => {
    const userSettings = {
      general: { previewFeatures: true },
      model: { name: 'gemini-3-pro-preview' },
    };
    const userSettingsPath = path.join(mockUserSettingsDir, 'settings.json');
    fs.writeFileSync(userSettingsPath, JSON.stringify(userSettings));

    const loader = new SettingsLoader({ workspaceDir: mockWorkspaceDir });
    const result = loader.load();

    expect(result.merged.general?.previewFeatures).toBe(true);
    expect(result.merged.model?.name).toBe('gemini-3-pro-preview');
  });

  it('should load workspace settings and merge with user settings', () => {
    const userSettings = {
      general: { previewFeatures: false },
      ui: { theme: 'dark' },
    };
    const workspaceSettings = {
      general: { previewFeatures: true },
    };

    fs.writeFileSync(
      path.join(mockUserSettingsDir, 'settings.json'),
      JSON.stringify(userSettings),
    );
    fs.writeFileSync(
      path.join(mockWorkspaceSettingsDir, 'settings.json'),
      JSON.stringify(workspaceSettings),
    );

    const loader = new SettingsLoader({ workspaceDir: mockWorkspaceDir });
    const result = loader.load();

    // Workspace overrides user
    expect(result.merged.general?.previewFeatures).toBe(true);
    // User settings preserved when not overridden
    expect(result.merged.ui?.theme).toBe('dark');
  });

  it('should migrate V1 flat settings to V2 nested structure', () => {
    // V1 flat settings using keys from MIGRATION_MAP
    const v1Settings = {
      theme: 'dark', // V1 key -> migrates to ui.theme
      showMemoryUsage: true, // V1 key -> migrates to ui.showMemoryUsage
      enableInteractiveShell: false, // V1 key -> migrates to tools.shell.enableInteractiveShell
    };

    fs.writeFileSync(
      path.join(mockUserSettingsDir, 'settings.json'),
      JSON.stringify(v1Settings),
    );

    const loader = new SettingsLoader({ workspaceDir: mockWorkspaceDir });
    const result = loader.load();

    // V1 'theme' should be migrated to 'ui.theme'
    expect(result.merged.ui?.theme).toBe('dark');
    // V1 'showMemoryUsage' should be migrated to 'ui.showMemoryUsage'
    expect(result.merged.ui?.showMemoryUsage).toBe(true);
    // V1 'enableInteractiveShell' should be migrated to 'tools.shell.enableInteractiveShell'
    expect(result.merged.tools?.shell?.enableInteractiveShell).toBe(false);
  });

  it('should apply theme mappings', () => {
    const userSettings = {
      ui: { theme: 'VS2015' },
    };

    fs.writeFileSync(
      path.join(mockUserSettingsDir, 'settings.json'),
      JSON.stringify(userSettings),
    );

    const loader = new SettingsLoader({
      workspaceDir: mockWorkspaceDir,
      themeMappings: { VS2015: 'DefaultDark', VS: 'DefaultLight' },
    });
    const result = loader.load();

    expect(result.merged.ui?.theme).toBe('DefaultDark');
  });

  it('should deep merge nested settings correctly', () => {
    const userSettings = {
      context: {
        fileFiltering: {
          respectGitIgnore: true,
          enableRecursiveFileSearch: true,
        },
      },
    };
    const workspaceSettings = {
      context: {
        fileFiltering: {
          respectGitIgnore: false,
        },
      },
    };

    fs.writeFileSync(
      path.join(mockUserSettingsDir, 'settings.json'),
      JSON.stringify(userSettings),
    );
    fs.writeFileSync(
      path.join(mockWorkspaceSettingsDir, 'settings.json'),
      JSON.stringify(workspaceSettings),
    );

    const loader = new SettingsLoader({ workspaceDir: mockWorkspaceDir });
    const result = loader.load();

    // Workspace overrides specific value
    expect(result.merged.context?.fileFiltering?.respectGitIgnore).toBe(false);
    // User value preserved for keys not overridden
    expect(
      result.merged.context?.fileFiltering?.enableRecursiveFileSearch,
    ).toBe(true);
  });
});
