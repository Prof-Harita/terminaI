/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * The /llm command is the canonical user-facing command for managing LLM providers.
 * It wraps the internal /auth command with a more intuitive name.
 *
 * Default action (no subcommand): Opens the provider selection wizard.
 */

import type {
  OpenDialogActionReturn,
  SlashCommand,
  LogoutActionReturn,
} from './types.js';
import { CommandKind } from './types.js';
import { CommandCategory } from './categories.js';
import {
  ChatGptOAuthCredentialStorage,
  clearCachedCredentialFile,
} from '@terminai/core';
import { SettingScope } from '../../config/settings.js';

const loginSubcommand: SlashCommand = {
  name: 'login',
  description: 'Configure provider and authentication',
  kind: CommandKind.BUILT_IN,
  autoExecute: true,
  action: (_context, _args): OpenDialogActionReturn => ({
    type: 'dialog',
    dialog: 'authWizard',
  }),
};

const logoutSubcommand: SlashCommand = {
  name: 'logout',
  description: 'Log out and clear all cached credentials',
  kind: CommandKind.BUILT_IN,
  action: async (context, _args): Promise<LogoutActionReturn> => {
    await clearCachedCredentialFile();
    await ChatGptOAuthCredentialStorage.clear().catch(() => {});
    context.services.settings.setValue(
      SettingScope.User,
      'security.auth.selectedType',
      undefined,
    );
    context.services.config?.getGeminiClient()?.stripThoughtsFromHistory();
    return { type: 'logout' };
  },
};

const wizardSubcommand: SlashCommand = {
  name: 'wizard',
  description: 'Open the provider selection wizard to switch LLM providers',
  kind: CommandKind.BUILT_IN,
  autoExecute: true,
  action: (context, _args) => {
    const enforcedType =
      context.services.settings.merged.security?.auth?.enforcedType;
    if (enforcedType) {
      return {
        type: 'message',
        messageType: 'error',
        content: `Provider switching is blocked: authentication type is enforced to "${enforcedType}" by policy. Contact your administrator to change this setting.`,
      };
    }
    return {
      type: 'dialog',
      dialog: 'authWizard',
    } as OpenDialogActionReturn;
  },
};

const resetSubcommand: SlashCommand = {
  name: 'reset',
  description: 'Nuclear reset: clear ALL credentials and auth settings',
  kind: CommandKind.BUILT_IN,
  action: async (context, _args): Promise<OpenDialogActionReturn> => {
    await clearCachedCredentialFile().catch(() => {});
    await ChatGptOAuthCredentialStorage.clear();

    context.services.settings.setValue(
      SettingScope.User,
      'security.auth.selectedType',
      undefined,
    );
    context.services.settings.setValue(
      SettingScope.User,
      'llm.provider',
      undefined,
    );
    context.services.settings.setValue(
      SettingScope.Workspace,
      'security.auth.selectedType',
      undefined,
    );
    context.services.settings.setValue(
      SettingScope.Workspace,
      'llm.provider',
      undefined,
    );

    context.services.config?.getGeminiClient()?.stripThoughtsFromHistory();

    return {
      type: 'dialog',
      dialog: 'authWizard',
    };
  },
};

const statusSubcommand: SlashCommand = {
  name: 'status',
  description: 'Show current authentication status and provider',
  kind: CommandKind.BUILT_IN,
  action: async (context, _args) => {
    const settings = context.services.settings.merged;
    const provider = settings.llm?.provider ?? 'gemini';
    const selectedType = settings.security?.auth?.selectedType ?? 'not set';

    const lines: string[] = [
      `**Current LLM Status**`,
      `Provider: ${provider}`,
      `Auth Type: ${selectedType}`,
    ];

    if (provider === 'openai_chatgpt_oauth') {
      try {
        const creds = await ChatGptOAuthCredentialStorage.load();
        if (creds) {
          const hasAccountId = creds.accountId ? '✓' : '✗';
          const hasRefreshToken = creds.token.refreshToken ? '✓' : '✗';
          const lastRefresh = creds.lastRefresh
            ? new Date(creds.lastRefresh).toLocaleString()
            : 'never';
          lines.push(
            `Account ID: ${hasAccountId}`,
            `Refresh Token: ${hasRefreshToken}`,
            `Last Refresh: ${lastRefresh}`,
          );
        } else {
          lines.push(`ChatGPT OAuth: Not authenticated`);
        }
      } catch {
        lines.push(`ChatGPT OAuth: Error loading credentials`);
      }
    }

    const workspaceProvider = context.services.settings.forScope(
      SettingScope.Workspace,
    ).settings.llm?.provider;
    if (workspaceProvider) {
      lines.push(`⚠️ Workspace overrides provider to: ${workspaceProvider}`);
    }

    return {
      type: 'message',
      messageType: 'info',
      content: lines.join('\n'),
    };
  },
};

export const llmCommand: SlashCommand = {
  name: 'llm',
  description: 'Manage LLM provider and authentication',
  kind: CommandKind.BUILT_IN,
  visibility: 'core',
  category: CommandCategory.LLM_MODEL,
  altNames: ['auth'], // Backwards compatibility alias
  subCommands: [
    loginSubcommand,
    logoutSubcommand,
    wizardSubcommand,
    resetSubcommand,
    statusSubcommand,
  ],
  // Default action: open the wizard (most common use case)
  action: (context, args) => wizardSubcommand.action!(context, args),
};
