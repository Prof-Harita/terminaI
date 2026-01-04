/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authCommand } from './authCommand.js';
import { type CommandContext } from './types.js';
import { createMockCommandContext } from '../../test-utils/mockCommandContext.js';
import { SettingScope } from '../../config/settings.js';

vi.mock('@terminai/core', async () => {
  const actual = await vi.importActual('@terminai/core');
  return {
    ...actual,
    clearCachedCredentialFile: vi.fn().mockResolvedValue(undefined),
  };
});

describe('authCommand', () => {
  let mockContext: CommandContext;

  beforeEach(() => {
    mockContext = createMockCommandContext({
      services: {
        config: {
          getGeminiClient: vi.fn(),
        },
      },
    });
    // Add setValue mock to settings
    mockContext.services.settings.setValue = vi.fn();
    vi.clearAllMocks();
  });

  it('should have subcommands: login, logout, and wizard', () => {
    expect(authCommand.subCommands).toBeDefined();
    expect(authCommand.subCommands).toHaveLength(3);
    expect(authCommand.subCommands?.[0]?.name).toBe('login');
    expect(authCommand.subCommands?.[1]?.name).toBe('logout');
    expect(authCommand.subCommands?.[2]?.name).toBe('wizard');
  });

  it('should return a dialog action to open the auth dialog when called with no args', () => {
    if (!authCommand.action) {
      throw new Error('The auth command must have an action.');
    }

    const result = authCommand.action(mockContext, '');

    expect(result).toEqual({
      type: 'dialog',
      dialog: 'auth',
    });
  });

  it('should have the correct name and description', () => {
    expect(authCommand.name).toBe('auth');
    expect(authCommand.description).toBe('Manage authentication');
  });

  describe('auth login subcommand', () => {
    it('should return auth dialog action', () => {
      const loginCommand = authCommand.subCommands?.[0];
      expect(loginCommand?.name).toBe('login');
      const result = loginCommand!.action!(mockContext, '');
      expect(result).toEqual({ type: 'dialog', dialog: 'auth' });
    });
  });

  describe('auth logout subcommand', () => {
    it('should clear cached credentials', async () => {
      const logoutCommand = authCommand.subCommands?.[1];
      expect(logoutCommand?.name).toBe('logout');

      const { clearCachedCredentialFile } = await import('@terminai/core');

      await logoutCommand!.action!(mockContext, '');

      expect(clearCachedCredentialFile).toHaveBeenCalledOnce();
    });

    it('should clear selectedAuthType setting', async () => {
      const logoutCommand = authCommand.subCommands?.[1];

      await logoutCommand!.action!(mockContext, '');

      expect(mockContext.services.settings.setValue).toHaveBeenCalledWith(
        SettingScope.User,
        'security.auth.selectedType',
        undefined,
      );
    });

    it('should strip thoughts from history', async () => {
      const logoutCommand = authCommand.subCommands?.[1];
      const mockStripThoughts = vi.fn();
      const mockClient = {
        stripThoughtsFromHistory: mockStripThoughts,
      } as unknown as ReturnType<
        NonNullable<typeof mockContext.services.config>['getGeminiClient']
      >;

      if (mockContext.services.config) {
        mockContext.services.config.getGeminiClient = vi.fn(() => mockClient);
      }

      await logoutCommand!.action!(mockContext, '');

      expect(mockStripThoughts).toHaveBeenCalled();
    });

    it('should return logout action to signal explicit state change', async () => {
      const logoutCommand = authCommand.subCommands?.[1];
      const result = await logoutCommand!.action!(mockContext, '');

      expect(result).toEqual({ type: 'logout' });
    });

    it('should handle missing config gracefully', async () => {
      const logoutCommand = authCommand.subCommands?.[1];
      mockContext.services.config = null;

      const result = await logoutCommand!.action!(mockContext, '');

      expect(result).toEqual({ type: 'logout' });
    });
  });

  describe('auth wizard subcommand', () => {
    it('should return authWizard dialog action when no enforcedType', () => {
      const wizardCommand = authCommand.subCommands?.[2];
      expect(wizardCommand?.name).toBe('wizard');

      // Ensure no enforced type is set
      (mockContext.services.settings as unknown as { merged: object }).merged =
        {
          ...mockContext.services.settings.merged,
          security: { auth: {} },
        };

      const result = wizardCommand!.action!(mockContext, '');
      expect(result).toEqual({ type: 'dialog', dialog: 'authWizard' });
    });

    it('should return error message when enforcedType is set', () => {
      const wizardCommand = authCommand.subCommands?.[2];

      // Set enforced type
      (mockContext.services.settings as unknown as { merged: object }).merged =
        {
          ...mockContext.services.settings.merged,
          security: { auth: { enforcedType: 'USE_API_KEY' } },
        };

      const result = wizardCommand!.action!(mockContext, '');
      expect(result).toEqual({
        type: 'message',
        messageType: 'error',
        content: expect.stringContaining('enforced'),
      });
    });
  });
});
