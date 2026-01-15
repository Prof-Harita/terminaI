/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  OpenDialogActionReturn,
  SlashCommand,
  LogoutActionReturn,
} from './types.js';
import { CommandKind } from './types.js';
import {
  ChatGptOAuthCredentialStorage,
  clearCachedCredentialFile,
} from '@terminai/core';
import { SettingScope } from '../../config/settings.js';

const authLoginCommand: SlashCommand = {
  name: 'login',
  description: 'Configure provider and authentication',
  kind: CommandKind.BUILT_IN,
  autoExecute: true,
  action: (_context, _args): OpenDialogActionReturn => ({
    type: 'dialog',
    dialog: 'authWizard',
  }),
};

const authLogoutCommand: SlashCommand = {
  name: 'logout',
  description: 'Log out and clear all cached credentials',
  kind: CommandKind.BUILT_IN,
  action: async (context, _args): Promise<LogoutActionReturn> => {
    await clearCachedCredentialFile();
    await ChatGptOAuthCredentialStorage.clear().catch(() => {});
    // Clear the selected auth type so user sees the auth selection menu
    context.services.settings.setValue(
      SettingScope.User,
      'security.auth.selectedType',
      undefined,
    );
    // Strip thoughts from history instead of clearing completely
    context.services.config?.getGeminiClient()?.stripThoughtsFromHistory();
    // Return logout action to signal explicit state change
    return {
      type: 'logout',
    };
  },
};

const authWizardCommand: SlashCommand = {
  name: 'wizard',
  description: 'Open the provider selection wizard to switch LLM providers',
  kind: CommandKind.BUILT_IN,
  autoExecute: true,
  action: (context, _args) => {
    // Check for enforced auth type guardrail
    const enforcedType =
      context.services.settings.merged.security?.auth?.enforcedType;
    if (enforcedType) {
      return {
        type: 'message',
        messageType: 'error',
        content: `Provider switching is blocked: authentication type is enforced to "${enforcedType}" by policy. Contact your administrator to change this setting.`,
      };
    }

    // Interactive-only check is handled by the CLI context
    // If we reach here, open the auth wizard dialog
    return {
      type: 'dialog',
      dialog: 'authWizard',
    } as OpenDialogActionReturn;
  },
};

const authResetCommand: SlashCommand = {
  name: 'reset',
  description: 'Nuclear reset: clear ALL credentials and auth settings',
  kind: CommandKind.BUILT_IN,
  action: async (context, _args): Promise<OpenDialogActionReturn> => {
    // Clear Google/Gemini cached credentials
    await clearCachedCredentialFile().catch(() => {});

    // Clear ChatGPT OAuth credentials (infallible)
    await ChatGptOAuthCredentialStorage.clear();

    // Reset all auth-related settings in User scope
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

    // Also clear Workspace scope to prevent overrides
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

    // Strip thoughts from history
    context.services.config?.getGeminiClient()?.stripThoughtsFromHistory();

    // Open wizard directly - no confirmation needed for reset
    return {
      type: 'dialog',
      dialog: 'authWizard',
    };
  },
};

const authStatusCommand: SlashCommand = {
  name: 'status',
  description: 'Show current authentication status and provider',
  kind: CommandKind.BUILT_IN,
  action: async (context, _args) => {
    const settings = context.services.settings.merged;
    const provider = settings.llm?.provider ?? 'gemini';
    const selectedType = settings.security?.auth?.selectedType ?? 'not set';

    const lines: string[] = [
      `**Current Auth Status**`,
      `Provider: ${provider}`,
      `Auth Type: ${selectedType}`,
    ];

    // Check ChatGPT OAuth credentials if applicable
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

    // Check for workspace overrides
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

export const authCommand: SlashCommand = {
  name: 'auth',
  description: 'Manage authentication',
  kind: CommandKind.BUILT_IN,
  subCommands: [
    authLoginCommand,
    authLogoutCommand,
    authWizardCommand,
    authResetCommand,
    authStatusCommand,
  ],
  action: (context, args) =>
    // Default to login if no subcommand is provided
    authLoginCommand.action!(context, args),
};
