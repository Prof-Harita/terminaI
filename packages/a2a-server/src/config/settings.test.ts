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
import { loadSettings, USER_SETTINGS_PATH } from './settings.js';

const mocks = vi.hoisted(() => {
  const suffix = Math.random().toString(36).slice(2);
  return {
    suffix,
  };
});

vi.mock('node:os', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:os')>();
  const path = await import('node:path');
  return {
    ...actual,
    homedir: () => path.join(actual.tmpdir(), `gemini-home-${mocks.suffix}`),
  };
});

describe('loadSettings', () => {
  const mockHomeDir = path.join(os.tmpdir(), `gemini-home-${mocks.suffix}`);
  const mockWorkspaceDir = path.join(
    os.tmpdir(),
    `gemini-workspace-${mocks.suffix}`,
  );
  const mockGeminiHomeDir = path.join(mockHomeDir, '.terminai');
  const mockGeminiWorkspaceDir = path.join(mockWorkspaceDir, '.terminai');

  beforeEach(() => {
    vi.clearAllMocks();
    // Create the directories using the real fs
    if (!fs.existsSync(mockGeminiHomeDir)) {
      fs.mkdirSync(mockGeminiHomeDir, { recursive: true });
    }
    if (!fs.existsSync(mockGeminiWorkspaceDir)) {
      fs.mkdirSync(mockGeminiWorkspaceDir, { recursive: true });
    }

    // Clean up settings files before each test
    if (fs.existsSync(USER_SETTINGS_PATH)) {
      fs.rmSync(USER_SETTINGS_PATH);
    }
    const workspaceSettingsPath = path.join(
      mockGeminiWorkspaceDir,
      'settings.json',
    );
    if (fs.existsSync(workspaceSettingsPath)) {
      fs.rmSync(workspaceSettingsPath);
    }
  });

  afterEach(() => {
    try {
      if (fs.existsSync(mockHomeDir)) {
        fs.rmSync(mockHomeDir, { recursive: true, force: true });
      }
      if (fs.existsSync(mockWorkspaceDir)) {
        fs.rmSync(mockWorkspaceDir, { recursive: true, force: true });
      }
    } catch (e) {
      console.error('Failed to cleanup temp dirs', e);
    }
    vi.restoreAllMocks();
  });

  it('should load nested previewFeatures from user settings', () => {
    const settings = {
      general: {
        previewFeatures: true,
      },
    };
    fs.writeFileSync(USER_SETTINGS_PATH, JSON.stringify(settings));

    const result = loadSettings(mockWorkspaceDir);
    expect(result.merged.general?.previewFeatures).toBe(true);
  });

  it('should load nested previewFeatures from workspace settings', () => {
    const settings = {
      general: {
        previewFeatures: true,
      },
    };
    const workspaceSettingsPath = path.join(
      mockGeminiWorkspaceDir,
      'settings.json',
    );
    fs.writeFileSync(workspaceSettingsPath, JSON.stringify(settings));

    const result = loadSettings(mockWorkspaceDir);
    expect(result.merged.general?.previewFeatures).toBe(true);
  });

  it('should prioritize workspace settings over user settings', () => {
    const userSettings = {
      general: {
        previewFeatures: false,
      },
    };
    fs.writeFileSync(USER_SETTINGS_PATH, JSON.stringify(userSettings));

    const workspaceSettings = {
      general: {
        previewFeatures: true,
      },
    };
    const workspaceSettingsPath = path.join(
      mockGeminiWorkspaceDir,
      'settings.json',
    );
    fs.writeFileSync(workspaceSettingsPath, JSON.stringify(workspaceSettings));

    const result = loadSettings(mockWorkspaceDir);
    expect(result.merged.general?.previewFeatures).toBe(true);
  });

  it('should handle missing previewFeatures', () => {
    const settings = {
      general: {},
    };
    fs.writeFileSync(USER_SETTINGS_PATH, JSON.stringify(settings));

    const result = loadSettings(mockWorkspaceDir);
    expect(result.merged.general?.previewFeatures).toBeUndefined();
  });

  it('should load other top-level settings correctly', () => {
    const settings = {
      ui: {
        showMemoryUsage: true,
      },
      tools: {
        core: ['tool1', 'tool2'],
      },
      mcpServers: {
        server1: {
          command: 'cmd',
          args: ['arg'],
        },
      },
      context: {
        fileFiltering: {
          respectGitIgnore: true,
        },
      },
    };
    fs.writeFileSync(USER_SETTINGS_PATH, JSON.stringify(settings));

    const result = loadSettings(mockWorkspaceDir);
    expect(result.merged.ui?.showMemoryUsage).toBe(true);
    expect(result.merged.tools?.core).toEqual(['tool1', 'tool2']);
    expect(result.merged.mcpServers).toHaveProperty('server1');
    expect(result.merged.context?.fileFiltering?.respectGitIgnore).toBe(true);
  });

  it('should merge workspace settings properly', () => {
    const userSettings = {
      ui: {
        showMemoryUsage: false,
      },
      context: {
        fileFiltering: {
          respectGitIgnore: true,
          enableRecursiveFileSearch: true,
        },
      },
    };
    fs.writeFileSync(USER_SETTINGS_PATH, JSON.stringify(userSettings));

    const workspaceSettings = {
      ui: {
        showMemoryUsage: true,
      },
      context: {
        fileFiltering: {
          respectGitIgnore: false,
        },
      },
    };
    const workspaceSettingsPath = path.join(
      mockGeminiWorkspaceDir,
      'settings.json',
    );
    fs.writeFileSync(workspaceSettingsPath, JSON.stringify(workspaceSettings));

    const result = loadSettings(mockWorkspaceDir);
    // Workspace overrides user
    expect(result.merged.ui?.showMemoryUsage).toBe(true);
    // Deep merge should preserve values not overridden
    expect(result.merged.context?.fileFiltering?.respectGitIgnore).toBe(false);
    // Core's loader uses deep merge, so this should be preserved
    expect(
      result.merged.context?.fileFiltering?.enableRecursiveFileSearch,
    ).toBe(true);
  });
});
