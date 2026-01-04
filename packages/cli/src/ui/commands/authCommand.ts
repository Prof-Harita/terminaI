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
import { clearCachedCredentialFile } from '@terminai/core';
import { SettingScope } from '../../config/settings.js';

const authLoginCommand: SlashCommand = {
  name: 'login',
  description: 'Login or change the auth method',
  kind: CommandKind.BUILT_IN,
  autoExecute: true,
  action: (_context, _args): OpenDialogActionReturn => ({
    type: 'dialog',
    dialog: 'auth',
  }),
};

const authLogoutCommand: SlashCommand = {
  name: 'logout',
  description: 'Log out and clear all cached credentials',
  kind: CommandKind.BUILT_IN,
  action: async (context, _args): Promise<LogoutActionReturn> => {
    await clearCachedCredentialFile();
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

export const authCommand: SlashCommand = {
  name: 'auth',
  description: 'Manage authentication',
  kind: CommandKind.BUILT_IN,
  subCommands: [authLoginCommand, authLogoutCommand, authWizardCommand],
  action: (context, args) =>
    // Default to login if no subcommand is provided
    authLoginCommand.action!(context, args),
};
