/**
 * @license
 * Copyright 2025 Google LLC
 * Portions Copyright 2025 TerminaI Authors
 * SPDX-License-Identifier: Apache-2.0
 */

import { SettingScope } from '../../config/settings.js';
import { CommandKind, type SlashCommand } from './types.js';

/**
 * A slash command that allows the user to view or update their approval PIN.
 * The approval PIN is used for high-risk actions (Review Level C).
 * Default PIN is 000000.
 */
export const pinSecurityCommand: SlashCommand = {
  name: 'pin-security',
  kind: CommandKind.BUILT_IN,
  description: 'Manage your approval PIN',
  action: async (context, args) => {
    const trimmedArgs = args?.trim();

    // If no arguments provided, show current PIN status
    if (!trimmedArgs) {
      const currentPin = context.services.config?.getApprovalPin() ?? '000000';
      const isDefault = currentPin === '000000';

      return {
        type: 'message',
        messageType: 'info',
        content: isDefault
          ? 'Approval PIN is currently set to the default: 000000.\nTo set a new PIN, use `/pin-security <6-digit-pin>`.'
          : 'Approval PIN is configured to a custom value.\nTo change it, use `/pin-security <6-digit-pin>`.',
      };
    }

    // Validate that the argument is a 6-digit numeric string
    if (!/^\d{6}$/.test(trimmedArgs)) {
      return {
        type: 'message',
        messageType: 'error',
        content: 'Invalid PIN. Please provide a 6-digit numeric PIN.',
      };
    }

    // Update the setting in the User scope
    try {
      context.services.settings.setValue(
        SettingScope.User,
        'security.approvalPin',
        trimmedArgs,
      );

      return {
        type: 'message',
        messageType: 'info',
        content: `Approval PIN successfully updated to ${trimmedArgs}.`,
      };
    } catch (error) {
      return {
        type: 'message',
        messageType: 'error',
        content: `Failed to update PIN: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
};
